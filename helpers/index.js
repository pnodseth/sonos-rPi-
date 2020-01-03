async function handleLoadPlaylist(message) {
  const data = JSON.parse(message);
  const { room, rfid, sonosUser } = data;
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
    const response = await startPlayback(roomDoc.sonos_group_id, playlistDoc.sonos_playlist_id, sonosUser);
  } else {
    if (!roomDoc) mqttClient.publish("rfid/roomNotFound", "failed");
    if (!playlistDoc) mqttClient.publish("rfid/playlistNotFound", "no playlist assosiated with RFID chip");
  }
}

async function handlePlayback(message) {
  const { room, command, sonosUser } = JSON.parse(message);
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
    togglePlayPause(roomDoc.sonos_group_id, command, sonosUser);
  }

  res.send("hello from server!");
}

module.exports = {
  handleLoadPlaylist,
  handlePlayback
};
