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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* https://developer.sonos.com/reference/authorization-api/create-token/ */
/* When user authorizes with Sonos through client app, we need to obtain accessToken and store it on user in db */
var node_fetch_1 = __importDefault(require("node-fetch"));
function createAccessTokenFromAuthCodeGrant(code, redirectUri, user) {
    return __awaiter(this, void 0, void 0, function () {
        var postData, response, data, err_1, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    postData = "grant_type=authorization_code&code=" + code + "&redirect_uri=" + redirectUri;
                    console.log("postdata: ", postData);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, baseTokenRequest(postData)];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 8];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    user.accessToken = data.access_token;
                    user.refreshToken = data.refresh_token;
                    user.accessTokenExpirationTimestamp = new Date().getTime() + data.expires_in;
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, user.save()];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
                case 6:
                    err_1 = _a.sent();
                    console.log("error saving user: ", err_1);
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    console.log("error : ", response);
                    _a.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    err_2 = _a.sent();
                    console.log("error in createAccessTokenFromAuthCodeGrant: ", err_2);
                    return [3 /*break*/, 11];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/* Function that first checks expiry timestamp on access token stored in Db. If not expired, use access token from DB. If expired, use refresh token in db
 to get a new access token */
function getAccessTokenFromDBorRefreshToken(user) {
    return __awaiter(this, void 0, void 0, function () {
        var now, accessTokenExpirationTimestamp, postData, response, data, err_3, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = new Date().getTime();
                    accessTokenExpirationTimestamp = user.accessTokenExpirationTimestamp;
                    if (!(now > accessTokenExpirationTimestamp)) return [3 /*break*/, 12];
                    console.log("getting new access token from refresh token...");
                    if (!(user.refreshToken !== "")) return [3 /*break*/, 10];
                    postData = "grant_type=refresh_token&refresh_token=" + user.refreshToken;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, baseTokenRequest(postData)];
                case 2:
                    response = _a.sent();
                    if (!response.ok) return [3 /*break*/, 7];
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    user.accessToken = data.access_token;
                    user.refreshToken = data.refresh_token;
                    user.accessTokenExpirationTimestamp = new Date().getTime() + data.expires_in;
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, user.save()];
                case 5:
                    _a.sent();
                    return [2 /*return*/, {
                            accessToken: data.access_token,
                            refreshToken: data.refresh_token
                        }];
                case 6:
                    err_3 = _a.sent();
                    console.log("error saving access token on user: ", err_3);
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    err_4 = _a.sent();
                    console.log("Error getting ");
                    return [3 /*break*/, 9];
                case 9: return [3 /*break*/, 11];
                case 10:
                    console.log("!! User doesn't have a refresh token stored. User needs to re-authorize Sonos through client app");
                    _a.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    console.log("getting access token stored in DB");
                    return [2 /*return*/, { accessToken: user.accessToken, refreshToken: user.refreshToken }];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function baseTokenRequest(postData) {
    return __awaiter(this, void 0, void 0, function () {
        var url, headers;
        return __generator(this, function (_a) {
            url = "https://api.sonos.com/login/v3/oauth/access";
            headers = {
                "Content-type": "application/x-www-form-urlencoded",
                Authorization: "Basic M2EwNmRhMjEtNjg5Zi00Mjg2LWFmOWItNTMwNDc0OTI2ZjI3OmIxZDc5ZGMyLTU5NTEtNDIyMy1hNzQ3LWNlNzdiMDE0ZTBmNQ=="
            };
            return [2 /*return*/, node_fetch_1.default(url, {
                    headers: headers,
                    method: "POST",
                    body: postData
                })];
        });
    });
}
module.exports = {
    baseTokenRequest: baseTokenRequest,
    createAccessTokenFromAuthCodeGrant: createAccessTokenFromAuthCodeGrant,
    getAccessTokenFromDBorRefreshToken: getAccessTokenFromDBorRefreshToken
};
