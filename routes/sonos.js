var express = require("express"),
  router = express.Router();
const client = require("../db");
const {
  baseSonosApiRequest,
  getSonosAccessRefreshTokens,
  storeRefreshTokenToDb
} = require("../api/sonos");

router.get("/", (req, res) => {
  res.send("sonos routes");
});

router.get("/authcomplete", async (req, res) => {
  console.log("sonos code is: ", req.query.code);
  console.log("user is: ", req.cookies.user.user);

  try {
    await getSonosAccessRefreshTokens({
      type: "accessToken",
      code: req.query.code,
      user: req.cookies.user.user
    });
    res.send(req.query.code);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

/* Start Sonos Authentication to get code required for access token */
router.get("/startauth", (req, res) => {
  if (req.cookies.user.user) {
    const clientId = "3a06da21-689f-4286-af9b-530474926f27";
    const redirect_url = "http%3A%2F%2Flocalhost%3A3000%2Fsonos%2Fauthcomplete";
    const url = `https://api.sonos.com/login/v3/oauth?client_id=${clientId}&response_type=code&state=state_test&scope=playback-control-all&redirect_uri=${redirect_url}`;
    res.redirect(url);
  } else {
    res.send("not logged in");
  }
});

/* GET SONOS HOUSEHOLDS */
router.get("/households/:user", async (req, res) => {
  const endpoint = "households";
  try {
    const response = await baseSonosApiRequest({
      endpoint,
      method: "get",
      user: req.params.user
    });
    console.log("TCL: response", response);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

/* GET HOUSEHOLD GROUPS */
router.get("/households/:user/:householdId/groups", async (req, res) => {
  const endpoint = `households/${req.params.householdId}/groups`;
  try {
    const response = await baseSonosApiRequest({
      endpoint,
      method: "get",
      user: req.params.user
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* Get playlists  */
router.get("/households/:user/:householdId/playlists", async (req, res) => {
  const endpoint = `households/${req.params.householdId}/playlists`;
  try {
    const response = await baseSonosApiRequest({
      endpoint,
      method: "get",
      user: req.params.user
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* START PLAYING ON GROUP */
router.get("/groups/:householdId/:user/playback/:command", async (req, res) => {
  const endpoint = `groups/${req.params.householdId}/playback/${req.params.command}`;
  try {
    const response = await baseSonosApiRequest({
      endpoint,
      method: "POST",
      user
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* Load playlost */
//stue: RINCON_B8E93720D3D601400:3835498777
router.get(
  "/groups/:user/:householdId/loadplaylist/:playlistId",
  async (req, res) => {
    const endpoint = `groups/${req.params.householdId}/playlists`;
    const body = {
      playlistId: req.params.playlistId,
      playOnCompletion: true
    };
    try {
      const response = await baseSonosApiRequest({
        endpoint,
        method: "POST",
        body: JSON.stringify(body),
        user: req.params.user
      });
      const data = await response.json();
      console.log("TCL: main -> data", data);
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  }
);

module.exports = router;
