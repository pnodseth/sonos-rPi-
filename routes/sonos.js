var express = require("express"),
  router = express.Router();
const client = require("../db");
const { baseSonosApiRequest } = require("../api/sonos");

router.get("/", (req, res) => {
  res.send("sonos routes");
});

/* Start Sonos Authentication to get code required for access token */
router.get("/startauth", (req, res) => {
  const clientId = "3a06da21-689f-4286-af9b-530474926f27";
  const redirect_url = "http%3A%2F%2Flocalhost%3A3000%2Fauthcomplete";
  const url = `https://api.sonos.com/login/v3/oauth?client_id=${clientId}&response_type=code&state=state_test&scope=playback-control-all&redirect_uri=${redirect_url}`;
  res.redirect(url);
});

/* GET SONOS HOUSEHOLDS */
router.get("/households", async (req, res) => {
  const endpoint = "households";
  try {
    const response = await baseSonosApiRequest(endpoint, "get");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* GET HOUSEHOLD GROUPS */
router.get("/households/:id/groups", async (req, res) => {
  const endpoint = `households/${req.params.id}/groups`;
  try {
    const response = await baseSonosApiRequest(endpoint, "get");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* Get playlists  */
router.get("/households/:id/playlists", async (req, res) => {
  const endpoint = `households/${req.params.id}/playlists`;
  try {
    const response = await baseSonosApiRequest(endpoint, "get");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* START PLAYING ON GROUP */
router.get("/groups/:id/playback/:command", async (req, res) => {
  const endpoint = `groups/${req.params.id}/playback/${req.params.command}`;
  try {
    const response = await baseSonosApiRequest(endpoint, "POST");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

/* Load playlost */
//stue: RINCON_B8E93720D3D601400:3835498777
router.get("/groups/:id/loadplaylist/:playlistId", async (req, res) => {
  const endpoint = `groups/${req.params.id}/playlists`;
  const body = {
    playlistId: req.params.playlistId,
    playOnCompletion: true
  };
  try {
    const response = await baseSonosApiRequest(
      endpoint,
      "POST",
      JSON.stringify(body)
    );
    const data = await response.json();
    console.log("TCL: main -> data", data);
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
