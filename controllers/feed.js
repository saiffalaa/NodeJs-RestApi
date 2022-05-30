const { validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
const Post = require("../models/post");
const User = require("../models/user");
const io = require("../socket");
exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = req.query.limit || 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({ posts, totalItems });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed ");
      error.statusCode = 422;
      throw error;
    }
    if (!req.file) {
      const error = new Error("No image provided");
      error.statusCode = 422;
      throw error;
    }
    let imageUrl = req.file.path.replace("\\", "/");
    const { title, content } = req.body;
    let topic;
    let creator;
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    topic = await post.save();
    let user = await User.findById(req.userId);
    creator = user;
    user.posts.push(topic);
    let result = user.save();
    io.getIo().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: result.name } },
    });
    console.log(result);
    res.status(201).json({
      message: "Post Created Succesfully",
      post: topic,
      creator,
    });
    return result;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.getPost = (req, res, next) => {
  const { postId } = req.params;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
exports.editPost = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed ");
    error.statusCode = 422;
    throw error;
  }
  const id = req.params.postId;
  const { title, content } = req.body;
  let imageUrl = req.body.image;
  if (req.file) imageUrl = req.file.path;
  if (!imageUrl) {
    const error = new Error("No file picked");
    error.statusCode = 422;
    throw error;
  }
  Post.findById(id)
    .populate("creator")
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator._id.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized");
        error.statusCode = 403;
        throw error;
      }
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl.replace("\\", "/");
      return post.save();
    })
    .then((result) => {
      io.getIo().emit("posts", { action: "update", post: result });
      res.status(200).json({ message: "updated successfully", post: result });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

exports.deletePost = (req, res, next) => {
  const id = req.params.postId;
  Post.findById(id)
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found");
        error.statusCode = 404;
        throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
        const error = new Error("Not authorized");
        error.statusCode = 403;
        throw error;
      }
      //check if post creator is the current loggen in user
      clearImage(post.imageUrl);
      return Post.findByIdAndRemove(id);
    })
    .then((result) => {
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(id);
      return user.save();
    })
    .then(() => {
      io.getIo().emit("posts", { action: "delete", post: id });
      res.status(200).json({ message: "Post deleted successfully" });
    })
    .catch((err) => {
      if (!err.statusCode) err.statusCode = 500;
      next(err);
    });
};
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
