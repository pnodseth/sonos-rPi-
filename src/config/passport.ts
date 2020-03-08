import mongoose from "mongoose";
import { model, Model } from "mongoose";
const JwtStrategy = require("passport-jwt").Strategy,
  ExtractJwt = require("passport-jwt").ExtractJwt;
import { User } from "../models/User";

type jwtStrategyOptions = {
  jwtFromRequest: string;
  secretOrKey: string;
};
module.exports = function(passport) {
  var opts: jwtStrategyOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
    secretOrKey: process.env.DB_SECRET
  };

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
