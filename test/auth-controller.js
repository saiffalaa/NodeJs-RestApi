const expect = require("chai").expect;
const sinon = require("sinon");
const mongoose = require("mongoose");
const User = require("../models/user");

const authController = require("../controllers/auth");

describe("Auth Controller - Login", function (done) {
  it("Should through an error with code 500 if accessing database fails", function () {
    sinon.stub(User, "findOne");
    User.findOne.throws();
    const req = {
      body: {
        email: "test@test.com",
        password: "test",
      },
    };
    authController
      .login(req, {}, () => {})
      .then((res) => {
        // expect(res).to.be.an("error");
        expect(res.status).to.equal(500);
        done();
      });
    User.findOne.restore();
  });
  it("should send a response with valid user status for an exisiting user", function (done) {
    mongoose
      .connect(
        "mongodb+srv://saifalaa:861215Sa@cluster0.quanh.mongodb.net/test-messages?retryWrites=true&w=majority"
      )
      .then((res) => {
        const user = new User({
          email: "Test@test.com",
          password: "test",
          posts: [],
          name: "test",
          _id: "5c0f66b979af55031b34728a",
        });
        return user.save();
      })
      .then((usr) => {
        const req = {
          userId: "5c0f66b979af55031b34728a",
        };
        const res = {
          statusCode: 500,
          userStatus: null,
          status: function (code) {
            this.statusCode = code;
            return this;
          },
          json: function (data) {
            this.userStatus = data.status;
          },
        };
        authController.getUserStatus((req, res, () => {})).then(() => {
          expect(res.statusCode).to.be.equal(200);
          expect(res.userStatus).to.be.equal("I am new");
          User.deleteMany({})
            .then(() => {
              return mongoose.disconnect();
            })
            .then(() => {
              done();
            });
        });
      })
      .catch((err) => console.log(err));
  });
});
