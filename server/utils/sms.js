const Verification = require('twilio-phone-verification');
const verify = new Verification.Verification(process.env.TWILLO_API_KEY);
const sendSMS = async (phoneNumber, countryCode, result) => {
    console.log(phoneNumber, countryCode);
    verify.sendVerification(phoneNumber, countryCode, 6)
    .then(res => result(null, res.status==200))
    .catch(err => result(err, null))
};
  
module.exports = sendSMS;