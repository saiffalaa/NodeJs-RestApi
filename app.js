const express = require("express");
const bodyParser = require("body-parser");
const { graphqlHTTP } = require("express-graphql");
const mongoose = require("mongoose");
const multer = require("multer");
const grapgqlSchema = require("./graphql/schema");
const grapgqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");
const path = require("path");
const { clearImage } = require("./util/deleteImage");
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
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(auth);
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not authenticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({
    message: "file stored",
    filePath: req.file.path.replace("\\", "/"),
  });
});

app.use(
  "/graphql",
  graphqlHTTP({
    schema: grapgqlSchema,
    rootValue: grapgqlResolver,
    graphiql: true,
    formatError(err) {
      console.log(err);
      if (!err.originalError) return err;
      const data = err.originalError.data;
      const message = err.message || "An error occured";
      const code = err.originalError.code;
      return { message, data, status: code };
    },
  })
);

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
    app.listen(8080);
  })
  .catch((err) => console.log(err));
