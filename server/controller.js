const Simplerigs = require("./models/simplerigs.model.js");
exports.userRegister = (req, res) => {
	if (!req.body) {
		res.status(400).send({
		  message: "Content can not be empty!"
		});
	} 
	Simplerigs.userRegister(req.body, (err, data) => {
		if (err) {
			if(err.type=='exist') {
				res.status(406).send({
					message:
					err.message || "Email already exist."
				});
			}else {
				res.status(500).send({
					message:
					err.message || "An error occurred during user registration."
				});
			}
		}
		else res.send(data);
	});
};
exports.userVerify = (req, res) => {
	Simplerigs.userVerify(req.params.user_id, req.params.token, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during verify user."
		  });
		else {
			if(data) res.redirect('https://simplerigs.com?verify=true');
			else {
				res.status(500).send({
					message:
					  err.message || "token is wrong."
				});
			}	
		}
	});
};
exports.userLogin = (req, res) => {
	if (!req.body) {
		res.status(400).send({
		  message: "Content can not be empty!"
		});
	} 
	Simplerigs.userLogin(req.body, (err, data) => {
		if (err) {
			if(err.type == "not verified") {
				res.status(500).send({
					message:
						err.message || "Not verifed"
				});
			}else if (err.type == "authorization error"){
				res.status(500).send({
					message: err.message || "Email or Password isn't correct. Try again."
				});
			}
			else {
				res.status(500).send({
					message:
					  err.message || "An error occurred during user login."
				  });
			}
		}
		else {
			console.log(data);
			res.send(data);
		}
	});
};
exports.sendEmailVerificationLink = (req, res) => {
	Simplerigs.sendEmailVerificationLink(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during send email verification link."
		  });
		else res.send(data);
	});
};
exports.getWalletAddress = (req, res) => {
	Simplerigs.getWalletAddress(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get wallet address."
		  });
		else res.send(data);
	});
};
exports.sendPhoneVerificationCode = (req, res) => {
	Simplerigs.sendPhoneVerificationCode(req.body.phoneNumber, req.body.countryCode, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during send verification code."
		  });
		else res.send(data);
	});
};
exports.getUserInfo = (req, res) => {
	Simplerigs.getUserInfo(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get user info."
		  });
		else res.send(data);
	});
};
exports.getReferralCode = (req, res) => {
	Simplerigs.getReferralCode(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get referral code."
		  });
		else res.send(data);
	});
};
exports.getReferralInfo = (req, res) => {
	Simplerigs.getReferralInfo(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get referral info."
		  });
		else res.send(data);
	});
};
exports.setReferralClick = (req, res) => {
	Simplerigs.setReferralClick(req.body.referral_code, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during set referral click."
		  });
		else res.send(data);
	});
};
exports.getQrcode = (req, res) => {
	Simplerigs.getQrcode(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get qr code."
		  });
		else res.send(data);
	});
};
exports.qrcodeVerify = (req, res) => {
	Simplerigs.qrcodeVerify(req.body, (err, data) => {
		if (err) {
		  res.status(500).send({
			message:
			  err.message || "An error occurred during verify qr code."
		  });
		}
		else res.send(data);
	});
};
exports.requestForgotPassword = (req, res) => {
	Simplerigs.requestForgotPassword(req.body.email, (err, data) => {
		if (err) {
		  res.status(500).send({
			message:
			  err.message || "An error occurred during request forgotten password"
		  });
		}
		else res.send(data);
	});
};
exports.forgotPasswordChange = (req, res) => {
	if (!req.body) {
		res.status(400).send({
		  message: "Content can not be empty!"
		});
	} 
	Simplerigs.forgotPasswordChange(req.body, (err, data) => {
		if (err) {
		  res.status(500).send({
			message:
			  err.message || "An error occurred during change password"
		  });
		}
		else res.send(data);
	});
};
exports.getBitcoinValue = (req, res) => {
	Simplerigs.getBitcoinValue(req.params.amount, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get bitcoin value."
		  });
		else res.send(data);
	});
};
exports.getPlanList = (req, res) => {
	Simplerigs.getPlanList(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get plan list."
		  });
		else res.send(data);
	});
};
exports.requestWithdraw = (req, res) => {
	Simplerigs.requestWithdraw(req.body, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during withdraw."
		  });
		else res.send(data);
	});
};
exports.getWithdrawBalance = (req, res) => {
	Simplerigs.getWithdrawBalance(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get withdraw balance."
		  });
		else res.send(data);
	});
};
exports.payoutInfo = (req, res) => {
	Simplerigs.payoutInfo(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get payout info."
		  });
		else res.send(data);
	});
};
exports.revenueInfo = (req, res) => {
	Simplerigs.revenueInfo(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get revenue info."
		  });
		else res.send(data);
	});
};
exports.getBtcPrice = (req, res) => {
	Simplerigs.getBtcPrice((err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get Bitcoin Price."
		  });
		else res.send(data);
	});
};
exports.getWithdrawTransaction = (req, res) => {
	Simplerigs.getWithdrawTransaction(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get withdraw transaction."
		  });
		else res.send(data);
	});
};
exports.getTodayInvestors = (req, res) => {
	Simplerigs.getTodayInvestors((err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get joined investors on today."
		  });
		else res.send(data);
	});
};
exports.uploadID = (req, res) => {
	Simplerigs.uploadID(req, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during upload ID."
		  });
		else res.send(data);
	});
};
exports.setTwoFAuth = (req, res) => {
	Simplerigs.setTwoFAuth(req.body, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during set 2fa authorization."
		  });
		else res.send(data);
	});
}