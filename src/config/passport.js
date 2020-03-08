import mongoose from "mongoose";
const JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;

// load up the user model
var User = mongoose.model("User");
const secret = process.env.DB_SECRET;
console.log("secret: ", secret);
module.exports = function(passport) {
  var opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme("jwt");
  opts.secretOrKey = process.env.DB_SECRET;
  passport.use(
    new JwtStrategy(opts, function(jwt_payload, done) {
      User.findOne({ _id: jwt_payload._id }, function(err, user) {
        if (err) {
          return done(err, false);
        }
        if (user) {
          done(null, user);
        } else {
          done(null, false);
        }
      });
    })
  );
};
