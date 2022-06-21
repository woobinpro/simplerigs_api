const jsql = require("./db.js");
const handlebars = require("handlebars");
let referralCodeGenerator = require('referral-code-generator')
const sendEmail = require("../utils/email");
const path = require('path');
const fs = require('fs');
const sendSMS = require("../utils/sms");
var bcrypt = require('bcrypt');
var bitcoin = require('bitcoin');
const crypto = require('crypto');
const { authenticator } = require('otplib')
const QRCode = require('qrcode')
var bitcoin_client = new bitcoin.Client({
    host: '127.0.0.1',
    port: '8332',
    user: 'multichainrpc',
    pass: 'domisol123',
    ssl: false,
    sslStrict: false
});
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
exports.getReferralInfo = (user_id, result) => {
	jsql.clear();
	jsql.s().t('referral').w({user_id: user_id}).run((err, res, fields) => {
		if (err) result(err, null);
		if (res.length == 0){
			result(null,{click: 0, signup: 0, income: 0});
		}else {
			var signup_counts = 0;
			if(res[0].signup_accounts == null)signup_counts = 0;
			else signup_counts = res[0].signup_accounts.split[','].length;
			result(null, {click: res[0].click_count, signup: signup_counts, income: 0});
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
					if (res[0].status==0) {
						result({type: "not verified"}, null);
						return;
					}
					if(res1) result(null, res[0]); 
					else result({type: "authorization error"}, null)
				})
				return;
			}
	
			result(null, false);
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
exports.getQrcode = (user_id, result) => {
	jsql.clear();
	jsql.s('email').t('users').w({id: user_id}).run((err, res, fields) => {
		if (err || res.length == 0) {
			result(err, false);
			return;
		}
		let email = res[0].email;
		authenticator.step = 120;
		const secret = authenticator.generateSecret();
		QRCode.toDataURL(authenticator.keyuri(email, 'simplerigs', secret), (err, url) => {
			if (err) result(err, null);
			jsql.u({secret: secret}).t('users').w({id: user_id}).run((err, res, fields) => {
				if(err) result(err, null);
				result(null, url);
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
			jsql.u({"two_factor_verified": 1}).t('users').w({id: params.user_id}).run((err, res, fields) => {
				if(err) result(err, null);
				result(null, true);
			});
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