import mongoose from "mongoose";
import passport from "passport";
import express from "express";
import jwt from "jsonwebtoken";
import { IUser, IDevice, IRfidChip } from "../models/models.interface";
import { globalRFIDRegister } from "../helpers";
const deviceRoutes = require("./deviceRoutes")
require("../config/passport")(passport);
const router = express.Router();
const User = mongoose.model("User");
const RfidChip = mongoose.model("RfidChip");
const Device = mongoose.model("Device");
const { baseSonosApiRequest } = require("../api/sonos");
const { sonosApiRequest } = require("../api/sonos");
const { createAccessTokenFromAuthCodeGrant } = require("../api/auth_sonos");

/* USER HANDLING */
/* ---------------------- */

router.use("/device", deviceRoutes);

router.post("/signup", function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({ success: false, msg: "Please pass username and password." });
  } else {
    let newUser: any = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err: Error) {
      if (err) {
        console.log("TCL: err", err);
        return res.status(409).send("User already exists");
      }
      res.send("success");
    });
  }
});

router.post("/signin", function(req, res) {
  User.findOne(
    {
      username: req.body.username
    },
    function(err: Error, user: IUser) {
      if (err) throw err;

      if (!user) {
        res.status(401).send({
          success: false,
          msg: "Authentication failed. User not found."
        });
      } else {
        // check if password matches
        user.comparePassword(req.body.password, function(err: Error, isMatch: boolean) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            const jwtContent = { username: user.username, _id: user._id };
            var token: string = jwt.sign(JSON.stringify(jwtContent), process.env.DB_SECRET);
            // return the information including token as JSON
            res.json({
              success: true,
              token: "JWT " + token,
              user: {
                username: user.username,
                devices: user.devices,
                rfidChips: user.rfidChips,
                rfidIsRegistering: user.rfidIsRegistering,
                userSecret: user.userSecret
              }
            });
          } else {
            res.status(401).send({
              success: false,
              msg: "Authentication failed. Wrong password."
            });
          }
        });
      }
    }
  )
    .select("+password")
    .populate("devices", " -__v -userSecret -user")
    .populate("rfidChips", " -__v -userSecret -user");
});

/* GET A USER'S Profile */
router.get("/profile", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    User.findById(req.user._id)
      .select("-password -accessToken -_id -__v -refreshToken")
      .populate("devices", " -__v -userSecret -user")
      .populate("rfidChips", " -__v -userSecret -user")
      .exec((err: Error, user: IUser) => {
        res.json({ user });
      });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});


/* Associate RFID Chip with sonos playlist */
router.get("/rfid/associate/:rfidId/:sonosPlaylistId/:sonosHouseholdId", passport.authenticate("jwt", { session: false }), function(
  req,
  res
) {
  var token: string = getToken(req.headers);
  console.log("rfid: ", req.params.rfidId);
  if (token) {
    RfidChip.findById(req.params.rfidId).exec(async (err: Error, chip: IRfidChip) => {
      if (err) {
        console.error(err);
        res.send(err);
      } else {
        console.log("found rfid! ", chip);
        chip.sonosPlaylistId = req.params.sonosPlaylistId;
        chip.sonosHouseholdId = req.params.sonosHouseholdId;
        chip = await chip.save();
        console.log("saved chip! ", chip);
        await User.findById(req.user._id)
          .populate("devices", " -__v -userSecret -user")
          .populate("rfidChips", " -__v -userSecret -user")
          .exec((err: Error, user: IUser) => {
            res.json({
              user: {
                username: user.username,
                devices: user.devices,
                rfidChips: user.rfidChips,
                userSecret: user.userSecret
              }
            });
          });
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* User initiates RFID Chip registration. This endpoint is called, which updates user property rfidIsregistering = true. Sets a timeout
where it reverts back to false after 30 sec in case no further action is performed from user. */
router.get("/rfid/associate/start", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    //todo: Move user.rfidIsRegistering to redis
    req.user.rfidIsRegistering = true;
    req.user.save(function(err: Error) {
      if (err) {
        console.log("TCL: err", err);
        res.json({ success: false, err: err });
      }

      /*Cancel registration process after 15 sec. */
      setTimeout(() => {
        if (typeof globalRFIDRegister[req.user.userSecret] === "function") {
          console.log("RFID registration timeout. Reverting registration to previous state");
          req.user.rfidIsRegistering = false;
          req.user.save();
          globalRFIDRegister[req.user.userSecret] = null;
          res.status(408);
          res.send()
        }
      }, 15 * 1000);

      /* Create a callback function which is triggered when user triggers RFID Chip */
      globalRFIDRegister[req.user.userSecret] = async (savedUser: IUser) => {
        console.log("this shit works!");
        savedUser.rfidIsRegistering = false;
        await savedUser.save();
        res.send();
      };

      console.log("globalRFIDReg: ", globalRFIDRegister);
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* SONOS RELATED */
/* THINGS INVOLVING CALLING SONOS API */

/* Users have to authenticate with sonos in the client app. When they do that successfully, the client calls this endpoint with
a "code" to retrieve and store access tokens */
router.post("/storeinitialtoken", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const { code, redirectUri }: { code: string; redirectUri: string } = req.body;

    User.findById(req.user._id).exec(async (err, user: IUser) => {
      if (!err) {
        try {
          let response = await createAccessTokenFromAuthCodeGrant(code, redirectUri, user);
          console.log("response", response);
          if (response.ok) {
            let data = await response.json();

            user.accessToken = data.access_token;
            user.refreshToken = data.refresh_token;
            user.accessTokenExpirationTimestamp = new Date().getTime() + data.expires_in;
            user.lastSonosAuthorizationDateString = new Date().toISOString();

            try {
              await user.save();
              res.send();
            } catch (err) {
              console.log("createAccessTokenFromAuthCodeGrant -> error saving user: ", err);

              res.status(401).send();
            }
          } else {
            console.log("createAccessTokenFromAuthCodeGrant -> error : Handle this error");

            user.lastSonosAuthorizationDateString = "";

            try {
              await user.save();
              console.log(user);
              res.status(401).send();
            } catch (err) {
              console.log("createAccessTokenFromAuthCodeGrant -> error saving user: ", err);
              res.status(401).send();
            }
          }
        } catch (err) {
          console.log(" storeInitialToken -> error: ", err);
          user.lastSonosAuthorizationDateString = "";
          await user.save();
          res.status(401);
          res.send();
        }
      } else {
        console.log("error finding user: ", err);
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/gethouseholds", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const endpoint = "households";
    try {
      User.findById(req.user._id).exec(async (err: Error, user: IUser) => {
        const response: any = await sonosApiRequest({
          endpoint,
          method: "get",
          user
        });
        const data = await response.json();

        res.json(data);
      });
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/getgroups", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const endpoint: string = `households/${req.query.household}/groups`;
    try {
      User.findById(req.user._id).exec(async (err: Error, user: IUser) => {
        const response: Response = await baseSonosApiRequest({
          endpoint,
          method: "get",
          user
        });
        const data = await response.json();

        res.json(data);
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/getplaylists", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const endpoint: string = `households/${req.query.household}/playlists`;
    try {
      User.findById(req.user._id).exec(async (err: Error, user: IUser) => {
        const response: Response = await baseSonosApiRequest({
          endpoint,
          method: "get",
          user
        });
        const data = await response.json();

        res.json(data);
      });
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

export function getToken(headers) {
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

/*function clientSafeUserObject(user) {
  return {
    username: user.username,
    devices: user.devices || [],
    rfidChips: user.rfidChips || [],
    userSecret: user.userSecret,
    lastSonosAuthorizationDateString: user.lastSonosAuthorizationDateString || ""
  };
}*/

module.exports = router;
