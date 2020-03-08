"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JwtStrategy = require("passport-jwt").Strategy, ExtractJwt = require("passport-jwt").ExtractJwt;
var User_1 = require("../models/User");
module.exports = function (passport) {
    var opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
        secretOrKey: process.env.DB_SECRET
    };
    passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
        User_1.User.findOne({ _id: jwt_payload._id }, function (err, user) {
            if (err) {
                return done(err, false);
            }
            if (user) {
                done(null, user);
            }
            else {
                done(null, false);
            }
        });
    }));
};
