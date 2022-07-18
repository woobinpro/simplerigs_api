const jsql = require("./db.js");
const handlebars = require("handlebars");
const dateFormat = require('date-and-time');
var async = require('async');
let referralCodeGenerator = require('referral-code-generator')
var app_config = require('../config/app.config.js');
const sendEmail = require("../utils/email");
const path = require('path');
const fs = require('fs');
const sendSMS = require("../utils/sms");
var bcrypt = require('bcrypt');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const bitcoin = require('../utils/bitcoin');
const QRCode = require('qrcode');
var bitcoin_client = require('../bitcoin_client');
function saveToken(user_id, token) {
	jsql
		.i({user_id: user_id, token: token})
		.t('tokens')
		.run((err, res, fields) => {
			if (err) throw err;
			return token;
		});
};
exports.userRegister = (user, result) => {
	jsql
		.s()
		.t('users')
		.w({email: user.email})
		.run((err, res, fields) => {
			if (err) result(err, null);
			if (res.length > 0){
				result({type: 'exist'}, null);
			}else {
				bcrypt.hash(user.password,10, function(err, hash) {
					let created = new Date();
					let user_info = {
						first_name: user.first_name,
						last_name: user.last_name,
						email: user.email,
						phone: user.phone,
						password: hash,
						created_time: created,
						login_datetime: created,
						wallet_address: '',
						status: 0,
						secret: ''
					};
					jsql
						.i(user_info)
						.t('users')
						.run((err, res, fields) => {
							if (err) {
								console.log("error: ", err);
								result(err, null);
								return;
							}
							console.log("registered new user: ", { id: res.insertId, ...user_info });
							const token = crypto.randomBytes(32).toString("hex");
							saveToken(res.insertId, token);
							const message = `${process.env.BASE_URL}/api/userVerify/${res.insertId}/${token}`;
							const filePath = path.join(__dirname, '../templates/email_verify.html');
							const source = fs.readFileSync(filePath, 'utf-8').toString();
							const template = handlebars.compile(source);
							const replacements = {
								username: user.first_name + " " + user.last_name,
								url: message
							};
							const htmlToSend = template(replacements);
    						sendEmail(user.email, "Verify your email", message, htmlToSend);
							const new_user_id = res.insertId;
							if(user.referral_code!=""){
								jsql.s().t('referral').w({referral_link: user.referral_code}).run((err, res, fields) => {
									if(res.length > 0) {
										var signup = res[0].signup_accounts;
										if(signup!="")signup += "," + new_user_id;
										else signup = new_user_id;
										jsql.u({signup_accounts: signup}).t('referral').w({id: res[0].id}).run((err, res, fields) => {
											if(err) throw err;
											console.log("referral added");
											jsql.u({referral_id: res[0].id}).t('users').w({id: new_user_id}).run();
										});
									}
								});
							}
							result(null, { id: res.insertId, ...user_info });
						});
				});
			}
		});
};
exports.sendEmailVerificationLink = (user_id, result) => {
	jsql.clear();
	jsql.s().t('tokens').w({user_id: user_id}).run((e, res, f) => {
		if(e)result(e, null);
		else {
			var token = "";
			if(res.length==0){
				token = crypto.randomBytes(32).toString("hex");
				saveToken(user_id, token);
			}else {
				token = res[0].token;
			}
			jsql.s().t('users').w({id: user_id}).run((e, res1, f)=>{
				if(e)result(e, null);
				else {
					var user = res1[0];
					const message = `${process.env.BASE_URL}/api/userVerify/${user_id}/${token}`;
					const filePath = path.join(__dirname, '../templates/email_verify.html');
					const source = fs.readFileSync(filePath, 'utf-8').toString();
					const template = handlebars.compile(source);
					const replacements = {
						username: user.first_name + " " + user.last_name,
						url: message
					};
					const htmlToSend = template(replacements);
					sendEmail(user.email, "Verify your email", message, htmlToSend);
					result(null, true);
				}
			})
		}
	});
};
exports.getUserInfo = (user_id, result) => {
	jsql.clear();
	jsql.s().t('users').w({id: user_id}).run((err, res, fields) => {
		if (err) result(err, null);
		else result(null, res[0]);
	});
};
exports.getReferralCode = (user_id, result) => {
	jsql.clear();
	jsql.s().t('referral').w({user_id: user_id}).run((err, res, fields) => {
		if (err) result(err, null);
		if (res.length == 0){
			const code = referralCodeGenerator.alpha('lowercase', 12, 8);
			jsql.clear();
			jsql.i({user_id: user_id, referral_link: code}).t('referral').run((err, res, fields) => {
				if (err) result(err, null);
				result(null, code);
			});
		}else {
			result(null, res[0].referral_link);
		}
	});
};
function getReferralReward(user_id, type, callback) {
	jsql.s().t('referral').w({user_id: user_id}).run((err, res1, fields) => {
		if(err)callback(err, null);
		if(res1.length==0 || res1[0].signup_accounts==null)callback(null, {value: 0});
		else{
			var sql = "select IFNULL(sum(deposit_price),0) as price from plans where user_id in ("+res1[0].signup_accounts+")";
			if(type!="all") sql += " AND deposit_date="+ type;
			jsql.run(sql,(err, res2, fields) => {
				if(err) {
					console.log(err);
					callback(err, null);
				}
				else {
					var income = res2[0].price * 0.1;
					if(type=="all"){
						jsql.run("select IFNULL(sum(amount),0) as price from withdraws where user_id ="+user_id+" AND type=2",(err, res3, fields) => {
							if(err) {
								console.log(err);
								callback(err, null);
							}
							else {
								callback(null, {value: income-res3[0].price});
							}
						});
					}else callback(null, {value: income});
				}
			});
		}
	});
}
exports.getReferralInfo = (user_id, result) => {
	jsql.clear();
	jsql.s().t('referral').w({user_id: user_id}).run((err, res, fields) => {
		if (err) result(err, null);
		if (res.length == 0){
			result(null,{click: 0, signup: 0, income: 0});
		}else {
			var signup_counts = 0;
			if(res[0].signup_accounts == null){
				signup_counts = 0;
				result(null, {click: res[0].click_count, signup: signup_counts, income: 0});
			}
			else {
				if(!res[0].signup_accounts.includes(','))signup_counts=1;
				else signup_counts = res[0].signup_accounts.split(',').length;
				jsql.run("select IFNULL(sum(deposit_price),0) as price from plans where user_id in ("+res[0].signup_accounts+")",(err, res1, fields) => {
					if(err) {
						console.log(err);
						result(err, null);
					}
					else {
						var income = res1[0].price * 0.1;
						result(null, {click: res[0].click_count, signup: signup_counts, income: income});
					}
				});
			}
		}
	});
};

exports.setReferralClick = (code, result) => {
	jsql.clear();
	jsql.s().t('referral').w({referral_link: code}).run((err, res, fields) => {
		if(err) result(err, null);
		if(res.length == 0) result(null, false);
		else {
			var click_count = res[0].click_count + 1;
			jsql.clear();
			jsql.u({click_count: click_count}).t('referral').w({id: res[0].id}).run((err, res, fields) => {
				if(err) result(err, null);
				result(null, true);
			});
		}
	});
};
exports.userVerify = (user_id, token, result) => {
	jsql.clear();
	jsql
		.s()
		.t('tokens')
		.w({user_id: user_id, token: token})
		.run((err, res, fields) => {
			if (err) result(err, null);
			if (res.length > 0){
				jsql
					.u({status: 1})
					.t('users')
					.w({id: user_id})
					.run((err, res, fields) => {
						if(err) result(err, null);
						result(null, true);
					});
			}else result(null, false);
		});
};
exports.sendPhoneVerificationCode = (phoneNumber, countryCode, result) => {
	sendSMS(phoneNumber, countryCode, result);
};
exports.userLogin = (user, result) => {
	let email = user.email;
	console.log(email);
	jsql.clear();
	jsql
		.s()
		.t('users')
		.w({email: email})
		.run((err, res, fields) => {
			if (err) {
				console.log("error: ", err);
				result(err, null);
				return;
			}
	
			if (res.length) {
				bcrypt.compare(user.password, res[0].password, (err, res1) => {
					// if (res[0].status==0) {
					// 	result({type: "not verified"}, null);
					// 	return;
					// }
					if(res1) {
						if(res[0].two_factor_verified==1){
							QRCode.toDataURL(authenticator.keyuri(res[0].email, 'simplerigs', res[0].secret), (err, url) => {
								if (err) result(err, null);
								result(null, { url: url, ...res[0] });
								
							});
						}else	result(null, res[0]);
						jsql.clear();
						jsql.u({login_datetime: new Date()}).t('users').w({id: res[0].id}).run((err, res, fields) => {
							if (err) throw err;
						}) 
					}
					else result({type: "authorization error"}, null)
				})
				return;
			}
	
			else result(null, false);
		});
};
exports.getWalletAddress = (user_id, result) => {
	jsql.clear();
	jsql
		.s()
		.t('users')
		.w({id: user_id})
		.run((err, res, fields) => {
			if (err) {
			  console.log("error: ", err);
			  result(err, null);
			  return;
			}
			if (res.length) {
				if(res[0].wallet_address == ""){
					bitcoin_client.getNewAddress(user_id, function (err, wallet) {
						if (!err) {
							jsql
								.u({wallet_address: wallet})
								.t('users')
								.w({id: user_id})
								.run((err, res, fields) => {
									if (err) {
										console.log("error: ", err);
										result(err, null);
										return;
									}
									result(null, wallet);
								});
						}else {
							result(err, null);
						}
					});
				}
				else result(null, res[0].wallet_address);
				return;
			}
			result({ kind: "not_found" }, null);
		});
};
exports.setTwoFAuth = (data, result) => {
	jsql.u({"two_factor_verified": data.status}).t('users').w({id: data.user_id}).run((err, res, fields) => {
		if(err) result(err, null);
		result(null, true);
	});
};
exports.getQrcode = (user_id, result) => {
	jsql.clear();
	jsql.s().t('users').w({id: user_id}).run((err, res, fields) => {
		if (err || res.length == 0) {
			result(err, false);
			return;
		}
		if(res[0].secret=="" || res[0].secret==null)var secret = authenticator.generateSecret();
		else var secret = res[0].secret;
		let email = res[0].email;
		authenticator.step = 120;
		QRCode.toDataURL(authenticator.keyuri(email, 'simplerigs', secret), (err, url) => {
			if (err) result(err, null);
			jsql.u({secret: secret}).t('users').w({id: user_id}).run((err, res, fields) => {
				if(err) result(err, null);
				else result(null, {url: url, key: secret});
			});
		});
		
	});
};
exports.qrcodeVerify = (params, result) => {
	jsql.clear();
	jsql.s('secret').t('users').w({id: params.user_id}).run((err, res, fields) => {
		if (err || res.length == 0) {
			result(err, false);
			return;
		}
		let secret = res[0].secret;
		if (authenticator.check(params.code, secret)) {
			result(null, true);
		}else result(null, false);
	});
};
exports.requestForgotPassword = (email, result) => {
	jsql.clear();
	jsql.s('id').t('users').w({email: email}).run((err, res, fields) => {
		if (err || res.length == 0) result(err, false);
		const token = crypto.randomBytes(32).toString("hex") + "&" + res[0].id;
		var user = res[0];
		jsql.i({user_id: res[0].id, password_token: token}).t('tokens').run((err, res, fields) => {
			if(err) result(err, null);
			const filePath = path.join(__dirname, '../templates/forgot_password.html');
			const source = fs.readFileSync(filePath, 'utf-8').toString();
			const template = handlebars.compile(source);
			const replacements = {
				username: user.first_name + " " + user.last_name,
				token: token
			};
			const htmlToSend = template(replacements);
			sendEmail(email, "Forgot your password?", token, htmlToSend);
			result(null, true);
		});
	});
};
exports.forgotPasswordChange = (params, result) => {
	jsql.clear();
	var token_str = params.token;
	const user_id = token_str.split("&")[1];
	jsql
		.s()
		.t('tokens')
		.w({user_id: user_id, password_token: token_str})
		.run((err, res, fields) => {
			if (err) result(err, null);
			if (res.length > 0){
				bcrypt.hash(params.password,10, function(err, hash) {
					jsql
						.u({password: hash})
						.t('users')
						.w({id: user_id})
						.run((err, res, fields) => {
							if(err) result(err, null);
							result(null, true);
						});
				});
			}else result({message: "token doesn't match"}, false);
		});
};
exports.existPlan = (tx_id, result) => {
	jsql.clear();
	jsql.s().t('plans').w({tx_id: tx_id}).run((err, res, fields) => {
		if(err) throw err;
		if(res.length == 0)result(false);
		else result(true);
	});
};
exports.savePlan = (uid, usd_amount, bitcoin_amount, tx_id) => {
	jsql.clear();
	console.log(usd_amount);
	var sql = "select * from subscriptions where min_price < "+usd_amount+" AND max_price > "+usd_amount;
	if(usd_amount > app_config.MAX_SUBSCRIPTION_AMOUNT)sql = "select * from subscriptions where max_price = 0";
	jsql.run(sql, (err, results, fields) => {
		var subscription_id = 1;
		if(err) {
			console.log(err);
		}
		else if(results.length > 0)subscription_id = results[0].id;
		var nowDate = new Date(); 
		var date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
		jsql.i({user_id: uid, deposit_price: bitcoin_amount, tx_id: tx_id, deposit_date: date, subscription_id: subscription_id}).t('plans').run((err, res, fields) => {
			if(err) throw err;
			//send message
		});
	});
};
exports.getBitcoinValue = (amount, result) => {
	bitcoin.toBitcoin(amount, function(err, value){
		if(err)result(err, null);
		else result(null, {value: value});
	});
};
exports.getPlanList = (user_id, result) => {
	jsql.run("select plans.*, subscriptions.plan_name, subscriptions.daily_pro, subscriptions.monthly_pro, subscriptions.yearly_pro from plans left join subscriptions on plans.subscription_id = subscriptions.id where plans.user_id="+user_id, (err, results, fields) => {
		if(err) result(err, null);
		else result(null, results);
	});
};
exports.requestWithdraw = (user_info, result) => {
	if(user_info.amount<=0)result({message: "amount is wrong"}, null);
	jsql.clear();
	jsql.s().t('users').w({id: user_info.id}).run((err, res1, fields)=>{
		if(err) result(err, null);
		if(res1[0].withdraw_amount >= user_info.amount){
			bitcoin_client.sendToAddress(user_info.wallet, user_info.amount, user_info.id, function (err, res) {
				if(err) result(err, null);
				else if(res.status===true){
					var nowDate = new Date(); 
					var date = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
					getReferralReward(user_info.id, "all", (err, res2) => {
						var withdraw_amount = user_info.amount;
						if(!err)withdraw_amount = user_info.amount - res2.value;
						if(withdraw_amount!=0){
							jsql.i({user_id: user_info.id, amount: withdraw_amount, date: date, type:1}).t('withdraws').run((err1, results, fields)=>{
								if(err1) {
									console.log("withdraw: ", err);
								}
								else {
									if(!err && res2.value>0){
										i({user_id: user_info.id, amount: res2.value, date: date, type:2}).t('withdraws').run();
									}
									jsql.run("UPDATE users SET withdraw_amount = 0 WHERE id = "+user_info.id, (err, res2, fields)=>{
										if(err)console.log("withdraw: ", err);
										else result(null, res);
									});
								}
							});
						}else{
							i({user_id: user_info.id, amount: res2.value, date: date, type:2}).t('withdraws').run();
							jsql.run("UPDATE users SET withdraw_amount = 0 WHERE id = "+user_info.id, (err, res2, fields)=>{
								if(err)console.log("withdraw: ", err);
								else result(null, res);
							});
						}
					});
				}
			});
		}else result({message: "your withdraw amount is wrong. Please contact with support team"}, null);
	})
};
exports.getWithdrawBalance = (user_id, result) => {
	jsql.clear();
	jsql.s().t('plans').w({user_id: user_id}).run(async (err, res1, fields) => {
		if(err)result(err, null);
		if(res1.length==0){
			getReferralReward(user_id,"all",(err, res) => {
				var referral_balance = 0;
				if(!err) {
					referral_balance = res.value;
				}
				if(res.value==0)result(null, {total_balance: 0, referral_balance: 0});
				else{
					jsql.run("UPDATE users SET withdraw_amount = "+referral_balance+" WHERE id = "+user_id, (err, res, fields)=>{
						if(err)result(err, null);
						else result(null, {total_balance: referral_balance, referral_balance: referral_balance});
					})
				}
			})
		}
		else {
			var amount = 0;
			async.each(res1, async (row, callback) => {
				await jsql.s().t('subscriptions').w({id: row.subscription_id}).run(async (err, res2, fields) => {
					var period = 0;
					var nowDate = new Date(); 
					var now_date_str = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
					var date1 = new Date(now_date_str);
					var date2 = new Date(row.deposit_date);
					period = parseInt((date1 - date2) / (1000 * 60 * 60 * 24));
					amount += row.deposit_price * res2[0].daily_pro * period / 100;
					callback(null);
				});
			}, function(err){
				if(err) throw err;
				jsql.s().t('withdraws').w({user_id: user_id, type: 1}).run((err, res, fields) => {
					var withdraw_amount = 0;
					if(!err && res.length > 0){
						for(var i=0;i<res.length;i++){
							withdraw_amount += res[i].amount;
						}
					}
					amount = amount - withdraw_amount;
					getReferralReward(user_id,"all", (err, res) => {
						var referral_balance = 0;
						if(!err) {
							amount += res.value;
							referral_balance = res.value;
						}
						jsql.run("UPDATE users SET withdraw_amount = "+amount+" WHERE id = "+user_id, (err, res, fields)=>{
							if(err)result(err, null);
							else result(null, {total_balance: amount.toFixed(8), referral_balance: referral_balance});
						})
					})
				})
			});
		}
	});
};
exports.payoutInfo = (user_id, result) => {
	// jsql.run("select sum.total_price, IFNULL(starter.deposit_price,0) as starter_price, IFNULL(advance.deposit_price,0) as advance_price, IFNULL(premium.deposit_price,0) as premium_price, IFNULL(professional.deposit_price,0) as professional_price, IFNULL(boss.deposit_price,0) as boss_price from (select sum(plans.deposit_price) as total_price, user_id from plans where user_id = "+user_id+" group by user_id) as sum left join (select deposit_price, user_id from plans where subscription_id = 1 AND user_id = " + user_id + " order by deposit_date desc limit 1) as starter on sum.user_id = starter.user_id left join (select deposit_price, user_id from plans where subscription_id = 2 AND user_id = " + user_id + " order by deposit_date desc limit 1) as advance on sum.user_id = advance.user_id left join (select deposit_price, user_id from plans where subscription_id = 3 AND user_id = " + user_id + " order by deposit_date desc limit 1) as premium on sum.user_id = premium.user_id left join (select deposit_price, user_id from plans where subscription_id = 4 AND user_id = " + user_id + " order by deposit_date desc limit 1) as professional on sum.user_id = professional.user_id left join (select deposit_price, user_id from plans where subscription_id = 5 AND user_id = " + user_id + " order by deposit_date desc limit 1) as boss on sum.user_id = boss.user_id",(err, res, fields) => {
	// 	if(err) result(err, null);
	// 	else {
	// 		// console.log(res);
	// 		if(res.length == 0)result(null, { total_price: 0, starter_price: 0, advance_price: 0, premium_price: 0,	professional_price: 0,	boss_price:0});
	// 		else result(null, res[0]);
	// 	}
	// });
	var nowDate = new Date(); 
	var now_date_str = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
	jsql.clear();
	jsql.s().t('plans').w({user_id: user_id}).run((e,res, f) => {
		if(e)result(e, null);
		if(res.length==0){
			getReferralReward(user_id,now_date_str, (err, res4) => {
				if(err) {
					result(null,{plan_list:[], referral: 0});
				}
				var referral = res4.value;
				result(null,{plan_list:[], referral: referral});
			})
		}else {
			var plan_list = [];
			async.each(res, async (row, callback) => {
				await jsql.s().t('subscriptions').w({id: row.subscription_id}).run(async (err, res2, fields) => {
					var period = 0;
					var date1 = new Date(now_date_str);
					var date2 = new Date(row.deposit_date);
					period = parseInt((date1 - date2) / (1000 * 60 * 60 * 24));
					var amount = 0;
					if(period>0)amount = row.deposit_price * res2[0].daily_pro  / 100;
					plan_list.push({amount: amount.toFixed(8), plan_name: res2[0].plan_name});
					callback(null);
				});
			}, function(err){
				if(err) throw err;
				getReferralReward(user_id,now_date_str, (err, res3) => {
					if(err) {
						result(null,{plan_list:plan_list, referral: 0});
					}
					var referral = res3.value;
					result(null,{plan_list:plan_list, referral: referral});
				})
			});
		}
	});
};
exports.revenueInfo = (user_id, result) => {
	// jsql.run("select IFNULL(starter.total_price,0) as starter_price, IFNULL(advance.total_price,0) as advance_price, IFNULL(premium.total_price,0) as premium_price, IFNULL(professional.total_price,0) as professional_price, IFNULL(boss.total_price,0) as boss_price from (select sum(plans.deposit_price) * subscriptions.daily_pro / 100 as total_price, user_id from plans left join subscriptions on subscriptions.id = plans.subscription_id where user_id = "+user_id+" AND subscription_id = 1 group by subscription_id) as starter left join (select sum(plans.deposit_price) * subscriptions.daily_pro / 100 as total_price, user_id from plans left join subscriptions on subscriptions.id = plans.subscription_id where user_id = "+user_id+" AND subscription_id = 2 group by subscription_id) as advance on starter.user_id = advance.user_id left join (select sum(plans.deposit_price) * subscriptions.daily_pro / 100 as total_price, user_id from plans left join subscriptions on subscriptions.id = plans.subscription_id where user_id = "+user_id+" AND subscription_id = 3 group by subscription_id) as premium on starter.user_id = premium.user_id left join (select sum(plans.deposit_price) * subscriptions.daily_pro / 100 as total_price, user_id from plans left join subscriptions on subscriptions.id = plans.subscription_id where user_id = "+user_id+" AND subscription_id = 4 group by subscription_id) as professional on starter.user_id = professional.user_id left join (select sum(plans.deposit_price) * subscriptions.daily_pro / 100 as total_price, user_id from plans left join subscriptions on subscriptions.id = plans.subscription_id where user_id = "+user_id+" AND subscription_id = 5 group by subscription_id) as boss on starter.user_id = boss.user_id",(err, res, fields) => {
	// 	if(err) result(err, null);
	// 	else {
	// 		if(res.length == 0)result(null, { starter_price: 0, advance_price: 0, premium_price: 0,	professional_price: 0,	boss_price:0});
	// 		else result(null, res[0]);
	// 	}
	// });
	var end = false;
	var result_list = [];
	var nowDate = new Date(); 
	var now_date_str = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
	var index = 0;
	async.whilst(function () {
		return !end;
	  },
	  function (next) {
		var compare_date = new Date(nowDate)
		compare_date.setDate(compare_date.getDate() - index)
		var compare_date_str = compare_date.getFullYear()+'/'+(compare_date.getMonth()+1)+'/'+compare_date.getDate();
		jsql.run("select * from plans where user_id = "+user_id+" AND  DATE(deposit_date) < date '"+compare_date_str+"'",(e,res,f)=>{
			if(e){
				end = true;next();
			}else{
				if(res.length==0){end = true;next();}
				else{
					var subscription_dic = {};
					async.each(res, async (row, callback) => {
						await jsql.s().t('subscriptions').w({id: row.subscription_id}).run(async (err, res2, fields) => {
							if(subscription_dic['sub'+row.subscription_id]==null)subscription_dic['sub'+row.subscription_id] = 1;
							else subscription_dic['sub'+row.subscription_id] = subscription_dic['sub'+row.subscription_id] + 1;
							var period = 0;
							var date1 = new Date(now_date_str);
							var date2 = new Date(row.deposit_date);
							period = parseInt((date1 - date2) / (1000 * 60 * 60 * 24));
							var amount = 0;
							if(period>0)amount = row.deposit_price * res2[0].daily_pro  / 100;
							result_list.push({amount: amount.toFixed(8), plan_name: res2[0].plan_name+subscription_dic['sub'+row.subscription_id], date: compare_date_str});
							callback(null);
						});
					}, function(err){
						if(err) throw err;
						index++;
						next();
					});
				}
			}
		});
	  },
	  function (err) {
		if(err) throw err;
		result(null, result_list);
	  });
};
exports.getBtcPrice = (result) => {
	bitcoin.toUSD(1, function(value){
		if(value==null)result({type:'api error'}, null);
		else result(null, {value: value});
	});
};
exports.getWithdrawTransaction = (user_id, result) => {
	jsql.s().t('withdraws').w({user_id:user_id}).run((err, res, fields) => {
		if(err) result(err, null);
		else result(null, res);
	});
};
function randomIntFromInterval(min, max) { // min and max included 
	return Math.floor(Math.random() * (max - min + 1) + min)
}
exports.getTodayInvestors = (result) => {
	// jsql.clear();
	var nowDate = new Date(); 
	var now_date_str = nowDate.getFullYear()+'/'+(nowDate.getMonth()+1)+'/'+nowDate.getDate();
	// const tomorrow = new Date(nowDate)
	// tomorrow.setDate(tomorrow.getDate() + 1)
	// var tomorrow_date_str = tomorrow.getFullYear()+'/'+(tomorrow.getMonth()+1)+'/'+tomorrow.getDate();
	// jsql.run("SELECT * FROM users WHERE DATE(created_time) BETWEEN '" + now_date_str +"' AND '"+tomorrow_date_str+"'",(err, res, fields) => {
	// 	if(err) result(err, null);
	// 	else if(res.length==0) result(null, {count:0, amount:0});
	// 	else {
	// 		jsql.run("SELECT IFNULL(sum(deposit_price),0) as price FROM plans WHERE DATE(deposit_date) BETWEEN '" + now_date_str +"' AND '"+tomorrow_date_str+"'",(err, res1, fields) => {
	// 			if(err) result(err, null);
	// 			else if(res.length==0) result(null, {count:res.length, amount:0});
	// 			else result(null, {count:res.length, amount: res1[0].price});
	// 		});
	// 	}
	// });
	jsql.clear();
	jsql.s().t('daily_info').w({date: now_date_str}).run((err, res, f)=>{
		if(err || res.length==0){
			var investor =  randomIntFromInterval(40, 99);
			var payout = randomIntFromInterval(300000, 900000);
			jsql.clear();
			jsql.i({investor:investor, payout: payout, date: now_date_str}).t('daily_info').run((err, res1, f)=>{
				if(err)result(err, null);
				else result(null, {count: investor, amount: payout});
			})
		}else{
			result(null, {count: res[0].investor, amount: res[0].payout});
		}
	})
};
exports.uploadID = (req, result) => {
	var avatar_name = '';
	if (req.files && Object.keys(req.files).length > 0) {
		let avatar_file = req.files.avatar;
		var ext = avatar_file.name.split('.');
		avatar_name = dateFormat.format(new Date(), "YYYYMMDDHHmmss")+"."+ext[ext.length - 1];
  		uploadPath = '../avatars/' + avatar_name;
		avatar_file.mv(uploadPath, function(err) {
			if (err)
				result(err, null);
		});
	}
	let user_info = {
		avatar: avatar_name
	};
	jsql
		.u(user_info)
		.t('users')
		.w({id: req.body.id})
		.run((err, results, fields) => {
			if (err) {
				console.log(err);
				result(null, false);
			}
			else result(null, {result: results.changedRows == 1, name:avatar_name});
		});
};