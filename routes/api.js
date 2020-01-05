const mongoose = require("mongoose");
const passport = require("passport");
const config = require("../config/database");
require("../config/passport")(passport);
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = mongoose.model("User");
const RfidChip = mongoose.model("RfidChip")
const Device = mongoose.model("Device");
const { baseTokenRequest, storeRefreshTokenToDb, baseSonosApiRequest } = require("../api/sonos");

/* USER HANDLING */

router.post("/signup", function (req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({ success: false, msg: "Please pass username and password." });
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function (err) {
      if (err) {
        console.log("TCL: err", err);
        return res.json({ success: false, msg: "Username already exists." });
      }
      res.json({ success: true, msg: "Successful created new user." });
    });
  }
});

router.post("/signin", function (req, res) {
  User.findOne(
    {
      username: req.body.username
    },
    function (err, user) {
      if (err) throw err;

      if (!user) {
        res.status(401).send({ success: false, msg: "Authentication failed. User not found." });
      } else {
        // check if password matches
        user.comparePassword(req.body.password, function (err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            const jwtContent = { username: user.username, _id: user._id };
            var token = jwt.sign(JSON.stringify(jwtContent), config.secret);
            // return the information including token as JSON
            console.log("user object: ", user.userSecret)
            res.json({ success: true, token: "JWT " + token, user: { username: user.username, devices: user.devices, rfidChips: user.rfidChips, rfidIsRegistering: user.rfidIsRegistering, userSecret: user.userSecret } });
          } else {
            res.status(401).send({ success: false, msg: "Authentication failed. Wrong password." });
          }
        });
      }
    }
  ).select("+password")
    .populate('devices', ' -__v -userSecret -user')
    .populate('rfidChips', ' -__v -userSecret -user');
});

router.post("/book", passport.authenticate("jwt", { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);

    res.json({ success: true, msg: "Successful created new book." });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/device", passport.authenticate("jwt", { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log("user:", req.user);
    const devices = Device.find({ user: req.user._id })
      .populate('user')
      .exec((err, devices) => {
        if (err) {
          console.log("error finding devices: ", err)
          res.send(err)
        } else {
          res.send(devices)
        }
      })
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* Associate device with sonos group */
router.get("/device/:deviceId/:sonosGroupId", passport.authenticate("jwt", { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {

    const device = Device.findById(req.params.deviceId)
      .exec((err, device) => {
        if (err) {
          console.log("error finding device: ", err)
          res.send(err)
        } else {
          device.sonosGroupId = req.params.sonosGroupId;
          device.save(function (err) {
            if (err) {
              console.log("TCL: err", err);
              return res.send(err)
            }
            User.findById(req.user._id)
              .populate('devices', ' -__v -userSecret -user')
              .populate('rfidChips', ' -__v -userSecret -user')
              .exec((err, user) => {
                res.json({ success: true, msg: "Successful associated device with sonos group", user: { username: user.username, devices: user.devices, rfidChips: user.rfidChips, userSecret: user.userSecret } });
              })
          })
        }
      })


  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* Associate RFID Chip with sonos playlist */
router.get("/rfid/associate/:rfidId/:sonosPlaylistId", passport.authenticate("jwt", { session: false }), function (req, res) {
  var token = getToken(req.headers);
  console.log("rfid: ", req.params.rfidId)
  if (token) {

    RfidChip.findById(req.params.rfidId)
      .exec(async (err, chip) => {
        if (err) {
          console.error(err)
          res.send(err)
        } else {
          chip.sonosPlaylistId = req.params.sonosPlaylistId;
          chip = await chip.save();
          console.log("saved chip! ", chip)
          User.findById(req.user._id)
            .populate('devices', ' -__v -userSecret -user')
            .populate('rfidChips', ' -__v -userSecret -user')
            .exec((err, user) => {
              res.json({ user: { username: user.username, devices: user.devices, rfidChips: user.rfidChips, userSecret: user.userSecret } });
            })
        }
      })
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* SONOS RELATED */

/* Users have to authenticate with sonos in the client app. When they do that successfully, the client calls this endpoint with
a "code" to retrieve and store access tokens */
router.post("/storeinitialtoken", passport.authenticate("jwt", { session: false }), async function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log("user:", req.user);
    const { code, redirectUri } = req.body;
    const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`;
    const response = await baseTokenRequest(postData);
    if (response.ok) {
      const data = await response.json();
      storeRefreshTokenToDb({ refreshToken: data.refresh_token, user: req.user._id });
      res.send({ success: true, msg: "Successfully stored access token to db" });
    } else {
      throw new Error("Did not succeed to get refresh token");
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/gethouseholds", passport.authenticate("jwt", { session: false }), async function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    const endpoint = "households";
    try {
      const response = await baseSonosApiRequest({
        endpoint,
        method: "get",
        user: req.user._id
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/getgroups", passport.authenticate("jwt", { session: false }), async function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    const endpoint = `households/${req.query.household}/groups`;
    try {
      const response = await baseSonosApiRequest({
        endpoint,
        method: "get",
        user: req.user._id
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/getplaylists", passport.authenticate("jwt", { session: false }), async function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    const endpoint = `households/${req.query.household}/playlists`;
    try {
      const response = await baseSonosApiRequest({
        endpoint,
        method: "get",
        user: req.user._id
      });
      const data = await response.json();
      res.send(data);
    } catch (err) {
      console.log(err);
      res.send(err)
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* User initiates RFID Chip registration. This endpoint is called, which updates user property rfidIsregistering = true. Sets a timeout
where it reverts back to false after 30 sec in case no further action is performed from user. */
router.get("/rfid/associate/start", passport.authenticate("jwt", { session: false }), async function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log("user object: ", req.user)
    req.user.rfidIsRegistering = true
    req.user.save(function (err) {
      if (err) {
        console.log("TCL: err", err);
        res.json({ success: false, err: err });
      }
      setTimeout(() => {
        console.log("reverting registration to previous state")
        req.user.rfidIsRegistering = false
        req.user.save()
      }, 30 * 1000)
      res.json({ success: true, user: req.user });
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

function getToken(headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(" ");
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
}

module.exports = router;
