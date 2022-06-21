module.exports = app => {
	const controllers = require("./controller.js");

	var router = require("express").Router();

	router.post("/userRegister", controllers.userRegister);
	router.post("/userLogin", controllers.userLogin);
	router.get("/getWalletAddress/:user_id", controllers.getWalletAddress);
	router.get("/userVerify/:user_id/:token", controllers.userVerify);
	router.get("/getQrcode/:user_id", controllers.getQrcode);
	router.get("/getUserInfo/:user_id", controllers.getUserInfo);
	router.get("/getReferralCode/:user_id", controllers.getReferralCode);
	router.get("/getReferralInfo/:user_id", controllers.getReferralInfo);
	router.post("/sendPhoneVerificationCode", controllers.sendPhoneVerificationCode);
	router.post("/setReferralClick", controllers.setReferralClick);
	router.post("/qrcodeVerify", controllers.qrcodeVerify);
	router.post("/requestForgotPassword", controllers.requestForgotPassword);
	router.post("/forgotPasswordChange", controllers.forgotPasswordChange);
	app.use('/api', router);
};