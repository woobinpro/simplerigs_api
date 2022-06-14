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
			if(data) res.redirect('http://5.45.79.175');
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
			}else {
				res.status(500).send({
					message:
					  err.message || "An error occurred during user login."
				  });
			}
		}
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
exports.getQrcode = (req, res) => {
	Simplerigs.getQrcode(req.params.user_id, (err, data) => {
		if (err)
		  res.status(500).send({
			message:
			  err.message || "An error occurred during get qr code."
		  });
		else res.send("<img src='"+ data + "'/>");
	});
};
exports.qrcodeVerify = (req, res) => {
	Simplerigs.qrcodeVerify(req.body, (err, data) => {
		console.log(err);
		if (err) {
		  res.status(500).send({
			message:
			  err.message || "An error occurred during verify qr code."
		  });
		}
		else res.send(data);
	});
};
