const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");

//routes
const digitizeRouter  = require('./Routers/digitize.router');
const authRouter  = require('./Routers/auth.router');

//cors
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/digitize', digitizeRouter);
app.use('/auth', authRouter);

module.exports = app;