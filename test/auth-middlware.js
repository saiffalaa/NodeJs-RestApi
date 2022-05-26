const expect = require("chai").expect;
const authMiddlware = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const sinon = require("sinon");
describe("Testing auth middlware", function () {
  it("should throw an error if no authorization header", function () {
    const req = {
      get: function () {
        return null;
      },
    };
    expect(authMiddlware.bind(this, req, {}, () => {})).to.throw(
      "Not Authenticated"
    );
  });
  it("should throw an error if the authorization header is only one string", function () {
    const req = {
      get: function () {
        return "asdasdasdasd";
      },
    };
    expect(authMiddlware.bind(this, req, {}, () => {})).to.throw();
  });
  it("should yield a userId after decoding token", function () {
    const req = {
      get: function () {
        return "Bearer asdasdasdasd";
      },
    };
    sinon.stub(jwt, "verify");
    jwt.verify.returns({ userId: "abc" });
    authMiddlware(req, {}, () => {});
    expect(req).to.have.property("userId");
    expect(req).to.have.property("userId", "abc");
    expect(jwt.verify.called).to.be.true;
    jwt.verify.restore();
  });
});
