"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose = require("mongoose");
var passport = require("passport");
var config = require("../config/database");
require("../config/passport")(passport);
var express = require("express");
var jwt = require("jsonwebtoken");
var router = express.Router();
var User = mongoose.model("User");
var RfidChip = mongoose.model("RfidChip");
var Device = mongoose.model("Device");
var baseSonosApiRequest = require("../api/sonos").baseSonosApiRequest;
var createAccessTokenFromAuthCodeGrant = require("../api/auth_sonos").createAccessTokenFromAuthCodeGrant;
var helpers_1 = require("../helpers");
/* USER HANDLING */
/* ---------------------- */
router.post("/signup", function (req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({ success: false, msg: "Please pass username and password." });
    }
    else {
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
    User.findOne({
        username: req.body.username
    }, function (err, user) {
        if (err)
            throw err;
        if (!user) {
            res.status(401).send({
                success: false,
                msg: "Authentication failed. User not found."
            });
        }
        else {
            // check if password matches
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (isMatch && !err) {
                    // if user is found and password is right create a token
                    var jwtContent = { username: user.username, _id: user._id };
                    var token = jwt.sign(JSON.stringify(jwtContent), config.secret);
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
                }
                else {
                    res.status(401).send({
                        success: false,
                        msg: "Authentication failed. Wrong password."
                    });
                }
            });
        }
    })
        .select("+password")
        .populate("devices", " -__v -userSecret -user")
        .populate("rfidChips", " -__v -userSecret -user");
});
/* ----- DEVICES ---------*/
/* GET A USER'S SONOSBOX DEVICES */
router.get("/device", passport.authenticate("jwt", { session: false }), function (req, res) {
    var token = getToken(req.headers);
    if (token) {
        Device.find({ user: req.user._id })
            .populate("user")
            .exec(function (err, devices) {
            if (err) {
                console.log("error finding devices: ", err);
                res.send(err);
            }
            else {
                res.send(devices);
            }
        });
    }
    else {
        return res.status(403).send({ success: false, msg: "Unauthorized." });
    }
});
/* Associate device with sonos group */
router.get("/device/:deviceId/:sonosGroupId", passport.authenticate("jwt", { session: false }), function (req, res) {
    var token = getToken(req.headers);
    if (token) {
        Device.findById(req.params.deviceId).exec(function (err, device) {
            if (err) {
                console.log("error finding device: ", err);
                res.send(err);
            }
            else {
                device.sonosGroupId = req.params.sonosGroupId;
                device.save(function (err) {
                    if (err) {
                        console.log("TCL: err", err);
                        return res.send(err);
                    }
                    User.findById(req.user._id)
                        .populate("devices", " -__v -userSecret -user")
                        .populate("rfidChips", " -__v -userSecret -user")
                        .exec(function (err, user) {
                        res.json({
                            success: true,
                            msg: "Successful associated device with sonos group",
                            user: {
                                username: user.username,
                                devices: user.devices,
                                rfidChips: user.rfidChips,
                                userSecret: user.userSecret
                            }
                        });
                    });
                });
            }
        });
    }
    else {
        return res.status(403).send({ success: false, msg: "Unauthorized." });
    }
});
/* Associate RFID Chip with sonos playlist */
router.get("/rfid/associate/:rfidId/:sonosPlaylistId", passport.authenticate("jwt", { session: false }), function (req, res) {
    var _this = this;
    var token = getToken(req.headers);
    console.log("rfid: ", req.params.rfidId);
    if (token) {
        RfidChip.findById(req.params.rfidId).exec(function (err, chip) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!err) return [3 /*break*/, 1];
                        console.error(err);
                        res.send(err);
                        return [3 /*break*/, 3];
                    case 1:
                        chip.sonosPlaylistId = req.params.sonosPlaylistId;
                        return [4 /*yield*/, chip.save()];
                    case 2:
                        chip = _a.sent();
                        console.log("saved chip! ", chip);
                        User.findById(req.user._id)
                            .populate("devices", " -__v -userSecret -user")
                            .populate("rfidChips", " -__v -userSecret -user")
                            .exec(function (err, user) {
                            res.json({
                                user: {
                                    username: user.username,
                                    devices: user.devices,
                                    rfidChips: user.rfidChips,
                                    userSecret: user.userSecret
                                }
                            });
                        });
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    }
    else {
        return res.status(403).send({ success: false, msg: "Unauthorized." });
    }
});
/* User initiates RFID Chip registration. This endpoint is called, which updates user property rfidIsregistering = true. Sets a timeout
where it reverts back to false after 30 sec in case no further action is performed from user. */
router.get("/rfid/associate/start", passport.authenticate("jwt", { session: false }), function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token;
        return __generator(this, function (_a) {
            token = getToken(req.headers);
            if (token) {
                req.user.rfidIsRegistering = true;
                req.user.save(function (err) {
                    var _this = this;
                    if (err) {
                        console.log("TCL: err", err);
                        res.json({ success: false, err: err });
                    }
                    setTimeout(function () {
                        console.log("reverting registration to previous state");
                        if (typeof helpers_1.globalRFIDRegister[req.user.userSecret] === "function") {
                            req.user.rfidIsRegistering = false;
                            req.user.save();
                            helpers_1.globalRFIDRegister[req.user.userSecret] = null;
                            res.json({ success: false, user: req.user, registerTimeout: true });
                        }
                    }, 15 * 1000);
                    /* Create a callback function which is triggered when user triggers RFID Chip */
                    helpers_1.globalRFIDRegister[req.user.userSecret] = function (savedUser) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log("this shit works!");
                                    savedUser.rfidIsRegistering = false;
                                    return [4 /*yield*/, savedUser.save()];
                                case 1:
                                    _a.sent();
                                    res.json({ success: true, user: savedUser, registerTimeout: false });
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    console.log("globalRFIDReg: ", helpers_1.globalRFIDRegister);
                });
            }
            else {
                return [2 /*return*/, res.status(403).send({ success: false, msg: "Unauthorized." })];
            }
            return [2 /*return*/];
        });
    });
});
/* SONOS RELATED */
/* THINGS INVOLVING CALLING SONOS API */
/* Users have to authenticate with sonos in the client app. When they do that successfully, the client calls this endpoint with
a "code" to retrieve and store access tokens */
router.post("/storeinitialtoken", passport.authenticate("jwt", { session: false }), function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token, _a, code_1, redirectUri_1;
        var _this = this;
        return __generator(this, function (_b) {
            token = getToken(req.headers);
            if (token) {
                _a = req.body, code_1 = _a.code, redirectUri_1 = _a.redirectUri;
                User.findById(req.user._id).exec(function (err, user) { return __awaiter(_this, void 0, void 0, function () {
                    var result, err_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!!err) return [3 /*break*/, 5];
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, createAccessTokenFromAuthCodeGrant(code_1, redirectUri_1, user)];
                            case 2:
                                result = _a.sent();
                                console.log("result: ", result);
                                res.send({
                                    success: true,
                                    msg: "Successfully stored access token to db"
                                });
                                return [3 /*break*/, 4];
                            case 3:
                                err_1 = _a.sent();
                                console.log("error: ", err_1);
                                return [3 /*break*/, 4];
                            case 4: return [3 /*break*/, 6];
                            case 5:
                                console.log("error finding user: ", err);
                                _a.label = 6;
                            case 6: return [2 /*return*/];
                        }
                    });
                }); });
            }
            else {
                return [2 /*return*/, res.status(403).send({ success: false, msg: "Unauthorized." })];
            }
            return [2 /*return*/];
        });
    });
});
router.get("/gethouseholds", passport.authenticate("jwt", { session: false }), function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token, endpoint_1;
        var _this = this;
        return __generator(this, function (_a) {
            token = getToken(req.headers);
            if (token) {
                endpoint_1 = "households";
                try {
                    User.findById(req.user._id).exec(function (err, user) { return __awaiter(_this, void 0, void 0, function () {
                        var response, data;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, baseSonosApiRequest({
                                        endpoint: endpoint_1,
                                        method: "get",
                                        user: user
                                    })];
                                case 1:
                                    response = _a.sent();
                                    return [4 /*yield*/, response.json()];
                                case 2:
                                    data = _a.sent();
                                    res.json(data);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
                catch (err) {
                    console.log(err);
                    res.send(err);
                }
            }
            else {
                return [2 /*return*/, res.status(403).send({ success: false, msg: "Unauthorized." })];
            }
            return [2 /*return*/];
        });
    });
});
router.get("/getgroups", passport.authenticate("jwt", { session: false }), function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token, endpoint_2;
        var _this = this;
        return __generator(this, function (_a) {
            token = getToken(req.headers);
            if (token) {
                endpoint_2 = "households/" + req.query.household + "/groups";
                try {
                    User.findById(req.user._id).exec(function (err, user) { return __awaiter(_this, void 0, void 0, function () {
                        var response, data;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, baseSonosApiRequest({
                                        endpoint: endpoint_2,
                                        method: "get",
                                        user: user
                                    })];
                                case 1:
                                    response = _a.sent();
                                    return [4 /*yield*/, response.json()];
                                case 2:
                                    data = _a.sent();
                                    res.json(data);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
                catch (err) {
                    console.log(err);
                }
            }
            else {
                return [2 /*return*/, res.status(403).send({ success: false, msg: "Unauthorized." })];
            }
            return [2 /*return*/];
        });
    });
});
router.get("/getplaylists", passport.authenticate("jwt", { session: false }), function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var token, endpoint_3;
        var _this = this;
        return __generator(this, function (_a) {
            token = getToken(req.headers);
            if (token) {
                endpoint_3 = "households/" + req.query.household + "/playlists";
                try {
                    User.findById(req.user._id).exec(function (err, user) { return __awaiter(_this, void 0, void 0, function () {
                        var response, data;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, baseSonosApiRequest({
                                        endpoint: endpoint_3,
                                        method: "get",
                                        user: user
                                    })];
                                case 1:
                                    response = _a.sent();
                                    return [4 /*yield*/, response.json()];
                                case 2:
                                    data = _a.sent();
                                    res.json(data);
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                }
                catch (err) {
                    console.log(err);
                    res.send(err);
                }
            }
            else {
                return [2 /*return*/, res.status(403).send({ success: false, msg: "Unauthorized." })];
            }
            return [2 /*return*/];
        });
    });
});
function getToken(headers) {
    if (headers && headers.authorization) {
        var parted = headers.authorization.split(" ");
        if (parted.length === 2) {
            return parted[1];
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}
module.exports = router;
