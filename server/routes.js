module.exports = app => {
	const controllers = require("./controller.js");

	var router = require("express").Router();

	router.post("/userRegister", controllers.userRegister);
	router.post("/userLogin", controllers.userLogin);
	router.get("/getWalletAddress/:user_id", controllers.getWalletAddress);
	router.get("/userVerify/:user_id/:token", controllers.userVerify);
	router.get("/getQrcode/:user_id", controllers.getQrcode);
	router.post("/setTwoFAuth", controllers.setTwoFAuth);
	router.get("/getUserInfo/:user_id", controllers.getUserInfo);
	router.get("/getReferralCode/:user_id", controllers.getReferralCode);
	router.get("/getReferralInfo/:user_id", controllers.getReferralInfo);
	router.post("/sendPhoneVerificationCode", controllers.sendPhoneVerificationCode);
	router.post("/setReferralClick", controllers.setReferralClick);
	router.post("/qrcodeVerify", controllers.qrcodeVerify);
	router.post("/requestForgotPassword", controllers.requestForgotPassword);
	router.post("/forgotPasswordChange", controllers.forgotPasswordChange);
	router.get("/getBitcoinValue/:amount", controllers.getBitcoinValue);
	router.get("/getPlanList/:user_id", controllers.getPlanList);
	router.post("/requestWithdraw", controllers.requestWithdraw);
	router.get("/getWithdrawBalance/:user_id", controllers.getWithdrawBalance);
	router.get("/payoutInfo/:user_id", controllers.payoutInfo);
	router.get("/revenueInfo/:user_id", controllers.revenueInfo);
	router.get("/getBtcPrice", controllers.getBtcPrice);
	router.get("/getWithdrawTransaction/:user_id", controllers.getWithdrawTransaction);
	router.get("/getTodayInvestors", controllers.getTodayInvestors);
	router.post('/uploadID', controllers.uploadID);
	router.get('/sendEmailVerificationLink/:user_id', controllers.sendEmailVerificationLink);
	app.use('/api', router);
};