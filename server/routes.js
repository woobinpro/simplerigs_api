module.exports = app => {
	const controllers = require("./controller.js");

	var router = require("express").Router();

	router.post("/userRegister", controllers.userRegister);
	router.post("/userLogin", controllers.userLogin);
	router.get("/getWalletAddress/:user_id", controllers.getWalletAddress);
	router.get("/userVerify/:user_id/:token", controllers.userVerify);
	router.get("/getQrcode/:user_id", controllers.getQrcode);
	router.post("/sendPhoneVerificationCode", controllers.sendPhoneVerificationCode);
	router.post("/qrcodeVerify", controllers.qrcodeVerify);
	app.use('/api', router);
};