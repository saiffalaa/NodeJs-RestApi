const express = require("express");
const bodyParser = require("body-parser");
const feedroutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const mongoose = require("mongoose");
const multer = require("multer");

const path = require("path");
const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()) form forms
app.use(bodyParser.json()); //application/json
app.use(multer({ storage: fileStorage, fileFilter }).single("image"));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(feedroutes);
app.use(authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const { message, data } = error;
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(
    "mongodb+srv://saifalaa:861215Sa@cluster0.quanh.mongodb.net/messages?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("connected");
    const server = app.listen(8080);
    const io = require("./socket").init(server);
    io.on("connection", (socket) => {
      console.log("Connected client");
    });
  })
  .catch((err) => console.log(err));
