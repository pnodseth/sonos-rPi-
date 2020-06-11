import express from "express";
import passport from "passport";
import { getToken } from "./api";
import { IUser } from "../models/models.interface";
import { User } from "../models/User";
import { baseSonosApiRequest, sonosApiRequest } from "../api/sonos";
const { createAccessTokenFromAuthCodeGrant } = require("../api/auth_sonos");

const router = express.Router();

/* SONOS RELATED */
/* THINGS INVOLVING CALLING SONOS API */

/* GET Devices*/
router.get("/", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {

  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/households", passport.authenticate("jwt", { session: false }), async function(req, res) {
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

/*GET Household Groups */
router.get("/households/:householdId/groups", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const endpoint: string = `households/${req.params.householdId}/groups`;
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


router.get("/households/:householdId/playlists", passport.authenticate("jwt", { session: false }), async function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {
    const endpoint: string = `households/${req.params.householdId}/playlists`;
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



module.exports = router;