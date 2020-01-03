var mongoose = require("mongoose");
var passport = require("passport");
var config = require("../config/database");
require("../config/passport")(passport);
var express = require("express");
var jwt = require("jsonwebtoken");
var router = express.Router();
var User = mongoose.model("User");
const { baseTokenRequest, storeRefreshTokenToDb, baseSonosApiRequest } = require("../api/sonos");

/* USER HANDLING */

router.post("/signup", function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({ success: false, msg: "Please pass username and password." });
  } else {
    var newUser = new User({
      username: req.body.username,
      password: req.body.password
    });
    // save the user
    newUser.save(function(err) {
      if (err) {
        console.log("TCL: err", err);
        return res.json({ success: false, msg: "Username already exists." });
      }
      res.json({ success: true, msg: "Successful created new user." });
    });
  }
});

router.post("/signin", function(req, res) {
  console.log(req.body.username);
  User.findOne(
    {
      username: req.body.username
    },
    function(err, user) {
      if (err) throw err;

      if (!user) {
        res.status(401).send({ success: false, msg: "Authentication failed. User not found." });
      } else {
        // check if password matches
        user.comparePassword(req.body.password, function(err, isMatch) {
          if (isMatch && !err) {
            // if user is found and password is right create a token
            const jwtContent = { username: user.username, _id: user._id };
            var token = jwt.sign(JSON.stringify(jwtContent), config.secret);
            // return the information including token as JSON
            res.json({ success: true, token: "JWT " + token });
          } else {
            res.status(401).send({ success: false, msg: "Authentication failed. Wrong password." });
          }
        });
      }
    }
  );
});

router.post("/book", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body);

    res.json({ success: true, msg: "Successful created new book." });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/book", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log("user:", req.user);
    res.send(req.user);
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* SONOS RELATED */

/* Users have to authenticate with sonos in the client app. When they do that successfully, the client calls this endpoint with
a "code" to retrieve and store access tokens */
router.post("/storeinitialtoken", passport.authenticate("jwt", { session: false }), async function(req, res) {
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

router.get("/households", passport.authenticate("jwt", { session: false }), async function(req, res) {
  console.log("RUNNING");
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
