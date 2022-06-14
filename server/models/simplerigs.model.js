const jsql = require("./db.js");
const sendEmail = require("../utils/email");
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
    						sendEmail(user.email, "Verify Email", message);
							result(null, { id: res.insertId, ...user_info });
						});
				});
			}
		});
};
exports.userVerify = (user_id, token, result) => {
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
					if (res[0].status==0) result({type: "not verified"}, null);
					else result(null, res1); 
				})
				return;
			}
	
			result(null, false);
		});
};
exports.getWalletAddress = (user_id, result) => {
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
	console.log(params);
	jsql.s('secret').t('users').w({id: params.user_id}).run((err, res, fields) => {
		if (err || res.length == 0) {
			result(err, false);
			return;
		}
		let secret = res[0].secret;
		if (authenticator.check(params.code, secret)) {
			jsql.u({"2fa_verified": 1}).t('users').w({id: params.user_id}).run((err, res, fields) => {
				if(err) result(err, null);
				result(null, true);
			});
		}else result(null, false);
	});
};