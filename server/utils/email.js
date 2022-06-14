const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const myOAuth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
);
myOAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});
const myAccessToken = myOAuth2Client.getAccessToken()
const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: "OAuth2",
        user: process.env.SENDER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: myAccessToken //access token variable we defined earlier
      },
    });
    transporter.verify((err, success) => {
      if (err) console.error(err);
      console.log('Your config is correct');
    });
    await transporter.sendMail({
      from: process.env.SENDER,
      to: email,
      subject: subject,
      text: text,
    });
    console.log("email sent sucessfully");
  } catch (error) {
    console.log("email not sent");
    console.log(error);
  }
};

module.exports = sendEmail;