require("dotenv").config();
const cors = require('cors')
const express = require("express");
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());
app.use(bodyParser.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Simplerigs." });
});
require("./routes.js")(app);

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});