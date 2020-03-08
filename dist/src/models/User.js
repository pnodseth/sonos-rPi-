"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bcrypt = require("bcrypt-nodejs");
var mongoose_1 = require("mongoose");
var UserSchema = new mongoose_1.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    userSecret: {
        type: String
    },
    accessToken: {
        type: String
    },
    accessTokenExpirationTimestamp: {
        type: Number,
        default: 0
    },
    refreshToken: {
        type: String,
        default: ""
    },
    devices: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Device" }]
    },
    rfidChips: {
        type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "RfidChip" }]
    },
    rfidIsRegistering: {
        type: Boolean,
        default: false
    }
});
UserSchema.pre("save", function (next) {
    var user = this;
    if (this.isNew) {
        user.userSecret = "SALD-1E12-FASKV912";
    }
    if (this.isModified("password") || this.isNew) {
        bcrypt.genSalt(10, function (err, salt) {
            if (err) {
                return next(err);
            }
            bcrypt.hash(user.password, salt, null, function (err, hash) {
                if (err) {
                    return next(err);
                }
                user.password = hash;
                next();
            });
        });
    }
    else {
        return next();
    }
});
UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};
exports.User = mongoose_1.model("User", UserSchema);
