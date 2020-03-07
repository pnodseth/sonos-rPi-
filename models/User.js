var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var UserSchema = new mongoose.Schema({
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
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }]
  },
  rfidChips: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "RfidChip" }]
  },
  rfidIsRegistering: {
    type: Boolean,
    default: false
  }
});

UserSchema.pre("save", function(next) {
  var user = this;

  if (this.isNew) {
    user.userSecret = "SALD-1E12-FASKV912";
  }
  if (this.isModified("password") || this.isNew) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        return next(err);
      }
      bcrypt.hash(user.password, salt, null, function(err, hash) {
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

UserSchema.methods.comparePassword = function(passw, cb) {
  bcrypt.compare(passw, this.password, function(err, isMatch) {
    if (err) {
      return cb(err);
    }
    cb(null, isMatch);
  });
};

module.exports = mongoose.model("User", UserSchema);
