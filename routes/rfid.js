var express = require("express"),
  router = express.Router();
const client = require("../db");
const { startPlayback, togglePlayPause } = require("../api/sonos");

router.get("/", (req, res) => {
  res.send("rfid routes");
});


/* Start playback when user holds RFID chip near reader */
router.get("/:sonosUser/:room/:rfid", async (req, res) => {
  const { room, rfid, sonosUser } = req.params;
  console.log(`Got a request with room: ${room} and rfid: ${rfid}`);
  let roomDoc = await client
    .get()
    .db("sonos")
    .collection("rooms")
    .findOne({ rfid_room_name: room, sonos_user: sonosUser });

  let playlistDoc = await client
    .get()
    .db("sonos")
    .collection("playlists")
    .findOne({ rfid: parseInt(rfid) });
  if (roomDoc) {
    console.log("found room: ", roomDoc);
  }
  if (playlistDoc) {
    console.log("found playlist: ", playlistDoc);
  }

  if (roomDoc && playlistDoc) {
    const response = await startPlayback(
      roomDoc.sonos_group_id,
      playlistDoc.sonos_playlist_id
    );

    console.log("response: ", response);
    const data = await response.json();
    res.json(JSON.stringify(data));
  } else {
    res.status(404);
    if (!roomDoc) res.send("could not find room with name: ", room)
    if (!playlistDoc) res.send("could not find playlist assosiated with RFID chip")
  }

});

router.get("/:sonosUser/:room/playback/:command", async (req, res) => {
  const { room, command, sonosUser } = req.params;
  console.log(`Got a request with room: ${room} and command: ${command}`);
  let roomDoc = await client
    .get()
    .db("sonos")
    .collection("rooms")
    .findOne({ rfid_room_name: room });

  if (roomDoc) {
    console.log("found room: ", roomDoc);
  }

  if (roomDoc) {
    togglePlayPause(roomDoc.sonos_group_id, command);
  }

  res.send("hello from server!");
});

module.exports = router;
