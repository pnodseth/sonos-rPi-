var bcrypt = require("bcrypt-nodejs");

import { Document, Schema, Model, model, HookNextFunction } from "mongoose";
import { IUser } from "./models.interface";

var UserSchema: Schema = new Schema({
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
    type: [{ type: Schema.Types.ObjectId, ref: "Device" }]
  },
  rfidChips: {
    type: [{ type: Schema.Types.ObjectId, ref: "RfidChip" }]
  },
  rfidIsRegistering: {
    type: Boolean,
    default: false
  }
});

UserSchema.pre("save", function(next: HookNextFunction) {
  var user: any = this;

  if (this.isNew) {
    user.userSecret = "SALD-1E12-FASKV912";
  }
  if (this.isModified("password") || this.isNew) {
    bcrypt.genSalt(10, function(err, salt: string) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.password, salt, null, function(err, hash: string) {
        if (err) {
          return next(err);
        }
        user.password = hash;
        next();
      });
    });
  } else {
    return next();
  }
});

UserSchema.methods.comparePassword = function(passw: string, cb: Function) {
  bcrypt.compare(passw, this.password, function(err, isMatch) {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

export const User: Model<IUser> = model<IUser>("User", UserSchema);