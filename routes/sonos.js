var express = require("express"),
  router = express.Router();
const client = require("../db");
const { baseSonosApiRequest } = require("../api/sonos");

router.get("/", (req, res) => {
  res.send("sonos routes");
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

module.exports = router;
