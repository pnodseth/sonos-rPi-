var express = require("express"),
  router = express.Router();
const client = require("../db");
const { startPlayback, togglePlayPause } = require("../api/sonos");

router.get("/", (req, res) => {
  res.send("rfid routes");
});

/* Start playback when user holds RFID chip near reader */
router.get("/:room/:rfid", async (req, res) => {
  const { room, rfid } = req.params;
  console.log(`Got a request with room: ${room} and rfid: ${rfid}`);
  let roomDoc = await client
    .get()
    .db("sonos")
    .collection("rooms")
    .findOne({ rfid_room_name: room });

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
    const data = await response.json();
  }

  res.json(JSON.stringify(data));
});

router.get("/:room/playback/:command", async (req, res) => {
  const { room, command } = req.params;
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
