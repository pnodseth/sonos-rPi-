const express = require("express");
var app = express();
var http = require("http").createServer(app);
const sonosRoutes = require("./routes/sonos");
const client = require("./db");
const PORT = "3000";
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { isAuthorized, cookieSecret } = require("./middleware");
const { startPlayback, togglePlayPause } = require("./api/sonos");
const dotenv = require("dotenv");
dotenv.config();
console.log(process.env.MONGO);
const mqtt = require('mqtt')
let mqttClient;
const mqttUrl = process.env.NODE_ENV === "production" ? "mqtt://prod-url" : 'mqtt://localhost:1883'

const {
  storeRefreshTokenToDb,
  getSonosAccessRefreshTokens
} = require("./api/sonos");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
main().catch(console.err);


async function main() {
  await client.connect(
    "mongodb://sonosAdm:CsaBv-!tT.Z.kgs6FnW6@ds018839.mlab.com:18839/sonos",
    function(err) {
      if (err) {
        console.log("Unable to connect to Mongo: ", err);
        process.exit(1);
      }
    }
  );

  mqttClient  = mqtt.connect(mqttUrl)
  mqttClient.on('connect', function () {
    console.log("mqtt connected")
    mqttClient.subscribe('rfid/loadPlaylist', function (err) {
      /* ERROR HANDLING */
    })
    mqttClient.subscribe('rfid/playback', function (err) {
      /* ERROR HANDLING */
    })
  })
  
  mqttClient.on('message', function (topic, message) {
    // message is Buffer
    switch (topic) {
      case "rfid/loadPlaylist":
        handleLoadPlaylist(message.toString());
        break;
      case "rfid/playback":
        handlePlayback(message.toString()) 
        break;
      default:
        break;
    }
    console.log(message.toString())
    //client.end()
  })

  // Get new refresh token every 4 hours
  setInterval(async () => {
    const { refreshToken } = await getSonosAccessRefreshTokens({
      type: "refreshToken",
      user: "pnodseth@gmail.com"
    });
    storeRefreshTokenToDb({
      refreshToken: refreshToken,
      user: "pnodseth@gmail.com"
    });
  }, 1000 * 60 * 60 * 4);

  app.use("/sonos", sonosRoutes);

  app.post("/login", (req, res) => {
    if (req.body.email && req.body.password) {
    }
    // setting cookies
    res.cookie(
      "user",
      { user: req.body.email, cookieSecret },
      {
        maxAge: 900000,
        httpOnly: true
      }
    );
    return res.send("Cookie has been set");
  });

  app.get("/login", (req, res) => {
    if (!req.cookies.user) {
      res.sendFile(path.join(__dirname + "/views/login.html"));
    } else {
      res.redirect("/");
    }
  });

  app.use("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/views/index.html"));
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}



async function handleLoadPlaylist(message) {
  const data = JSON.parse(message)
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
      const response = await startPlayback(
        roomDoc.sonos_group_id,
        playlistDoc.sonos_playlist_id,
        sonosUser
      );
  
    } else {
      if (!roomDoc) mqttClient.publish("rfid/roomNotFound", 'failed')
      if (!playlistDoc) mqttClient.publish("rfid/playlistNotFound", "no playlist assosiated with RFID chip")
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
