import express from "express";
import passport from "passport";
import { getToken } from "./api";


const router = express.Router();


/* GET Devices*/
router.get("/", passport.authenticate("jwt", { session: false }), function(req, res) {
  var token: string = getToken(req.headers);
  if (token) {

  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});



module.exports = router;