require("dotenv").config();
const cors = require('cors');
const express = require("express");
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const PORT = process.env.PORT || 3001;
const autoPaymentUpdate = require("./AutoPaymentUpdate");
var fs = require('fs');
var server  = express();
var options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('fullchain.pem')
};
const app = require('https').createServer(options, server);
server.use(cors());
server.use(bodyParser.json());
server.use(fileUpload());
// parse requests of content-type - application/x-www-form-urlencoded
server.use(bodyParser.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */

// simple route
server.get("/", (req, res) => {
  res.json({ message: "Welcome to Simplerigs." });
});
require("./routes.js")(server);
autoPaymentUpdate.startChecker();
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});