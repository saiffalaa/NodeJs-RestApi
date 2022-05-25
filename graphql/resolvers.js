const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Post = require("../models/post");
const { clearImage } = require("../util/deleteImage");
const user = require("../models/user");
module.exports = {
  createUser: async function ({ userInput }, req) {
    const errors = [];
    const { email, name, password } = userInput;
    if (!validator.isEmail(email)) {
      errors.push({ message: "Email is invalid" });
      console.log(email);
    }
    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: "Password is invalid" });
      console.log(password);
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("email already exists");
      // error.statusCode = 401;
      throw error;
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = new User({ email, name, password: hashed });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User not found");
      error.code = 404;
      throw error;
    }
    // console.log(user);
    const isAuth = bcrypt.compare(password, user.password);
    if (!isAuth) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "secrete",
      { expiresIn: "1h" }
    );
    return { token, userId: user._id.toString() };
  },
  addPost: async function ({ post }, req) {
    // console.log("HERE");
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const errors = [];
    // console.log(post);
    const { title, content, imageUrl } = post;
    // console.log(title, content, imageUrl);
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid" });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Title is invalid" });
    }
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid User");
      error.code = 401;
      throw error;
    }
    // console.log("SSSS", title, content, imageUrl, user);
    const psst = new Post({ title, content, imageUrl, creator: user });
    const createdPost = await psst.save();
    console.log(createdPost);
    user.posts.push(createdPost);
    await user.save();
    //add post to user also
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      // updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  getPosts: async function ({ page }, req) {
    // console.log(page, "ASDASDASD");
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    if (!page) page = 1;
    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          // creator: req.userId,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },
  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("no post");
      error.code = 404;
      throw error;
    }
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ id, postInput }, req) {
    const { title, content, imageUrl } = postInput;
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate("creator");
    if (!post) {
      const error = new Error("Not found");
      error.code = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }
    post.title = title;
    post.content = content;
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }
    const updated = await post.save();
    console.log(updated, "SADASD");
    return {
      ...updated._doc,
      _id: updated._id.toString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error("Not found");
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },
  user: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Not found");
      error.code = 404;
      throw error;
    }
    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async function ({ status }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Not found");
      error.code = 404;
      throw error;
    }
    user.status = status;
    const updated = await user.save();
    return {
      ...updated._doc,
      _id: updated._id.toString(),
    };
  },
};
