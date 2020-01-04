const express = require("express");
var app = express();
var http = require("http").createServer(app);
const sonosRoutes = require("./routes/sonos");
const mongoose = require("mongoose");
const config = require("./config/database");
mongoose
  .connect(config.database, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("mongoose connection succesful"))
  .catch(err => console.error(err));
require("./models/User");
require("./models/Device");
const client = require("./db");
const PORT = "3003";
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config();
var api = require("./routes/api");
var passport = require("passport");
const cors = require("cors");

/* MQTT STUFF */
const mqtt = require("mqtt");
const { handleLoadPlaylist, handlePlayback, handleSetDevice } = require("./helpers");
let mqttClient;
const mqttUrl = process.env.NODE_ENV === "production" ? "mqtt://prod-url" : "mqtt://localhost:1883";
const { storeRefreshTokenToDb, getSonosAccessRefreshTokens } = require("./api/sonos");
const { startPlayback, togglePlayPause } = require("./api/sonos");

app.use(
  cors({
    origin: "http://localhost:8080",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
  })
);

/* PASSPORT STUFF */
app.use(passport.initialize());

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

main().catch(console.err);

async function main() {
  await client.connect("mongodb://sonosAdm:CsaBv-!tT.Z.kgs6FnW6@ds018839.mlab.com:18839/sonos", function(err) {
    if (err) {
      console.log("Unable to connect to Mongo: ", err);
      process.exit(1);
    }
  });

  mqttClient = mqtt.connect(mqttUrl);
  mqttClient.on("connect", function() {
    console.log("mqtt connected");
    mqttClient.subscribe("rfid/loadPlaylist", function(err) {
      /* ERROR HANDLING */
    });
    mqttClient.subscribe("rfid/playback", function(err) {
      /* ERROR HANDLING */
    });
  });

  mqttClient.on("message", function(topic, message) {
    // message is Buffer
    switch (topic) {
      case "device/rfid/loadPlaylist":
        handleLoadPlaylist(message.toString());
        break;
      case "device/rfid/playback":
        handlePlayback(message.toString());
        break;
      case "device/setdevice":
        handleSetDevice(message.toString());
        break;
      default:
        break;
    }
    console.log(message.toString());
    //client.end()
  });

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
  app.use("/api", api);
  app.use("/", (req, res) => {
    res.send("welcome!");
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
