import mongoose from "mongoose";
import passport from "passport";
import express from "express";
import jwt from "jsonwebtoken";
import { IUser, IRfidChip } from "../models/models.interface";
import { globalRFIDRegister } from "../helpers";
const deviceRoutes = require("./deviceRoutes")
const sonosRoutes = require("./sonosRoutes")
require("../config/passport")(passport);
const router = express.Router();
const User = mongoose.model("User");
const RfidChip = mongoose.model("RfidChip");


/* USER HANDLING */
/* ---------------------- */

router.use("/device", deviceRoutes);
router.use("/sonos", sonosRoutes);

router.post("/signup", function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({ success: false, msg: "Please pass username and password." });
  } else {

    User.findOne({username: req.body.username}, (err: Error, user: IUser) => {
      if (err) {
        res.status(500).send();
      } else {
        if (!user) {

          let newUser: any = new User({
            username: req.body.username,
            password: req.body.password
          });

          // save the user
          newUser.save(function(err: Error) {
            if (err) {
              console.log("error saving new user: ", err);
              return res.status(409).send("User already exists");
            }
            res.send("success");
          });
        } else {
          res.status(409).send("User already exists");
        }
      }
    })

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
                _id: user._id,
                username: user.username,
                devices: user.devices,
                rfidChips: user.rfidChips,
                rfidIsRegistering: user.rfidIsRegistering,
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
    .populate("devices", " -__v  -user")
    .populate("rfidChips", " -__v  -user");
});

/* GET A USER'S Profile */
router.get("/profile", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    User.findById(req.user._id)
      .select("-password -accessToken  -__v -refreshToken")
      .populate("devices", " -__v  -user")
      .populate("rfidChips", " -__v  -user")
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
        res.status(404).send(err);
      } else {
        console.log("found rfid! ", chip);
        chip.sonosPlaylistId = req.params.sonosPlaylistId;
        chip.sonosHouseholdId = req.params.sonosHouseholdId;
        chip = await chip.save();
        console.log("saved chip! ", chip);
        res.send()
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
        if (typeof globalRFIDRegister[req.user._id] === "function") {
          console.log("RFID registration timeout. Reverting registration to previous state");
          req.user.rfidIsRegistering = false;
          req.user.save();
          globalRFIDRegister[req.user._id] = null;
          res.status(408);
          res.send()
        }
      }, 15 * 1000);

      /* Create a callback function which is triggered when user triggers RFID Chip */
      globalRFIDRegister[req.user._id] = async (savedUser: IUser) => {
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



module.exports = router;
