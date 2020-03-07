const mqtt = require("mqtt");
const RfidChip = require("./models/RfidChip");
const User = require("./models/User");
const Device = require("./models/Device");

const { handleLoadPlaylist, handlePlayback, handleSetDevice, globalRFIDRegister } = require("./helpers");

function mqttHan() {
  const mqttUrl: string = process.env.NODE_ENV === "production" ? "mqtt://prod-url" : "mqtt://hairdresser.cloudmqtt.com:18179";

  let mqttClient = mqtt.connect(mqttUrl, {
    username: "rnscwaio",
    password: "DXi1Og5mJEej"
  });

  mqttClient.on("connect", function() {
    console.log("mqtt connected");

    mqttClient.subscribe("device/rfid/loadPlaylist", function(err) {
      /* ERROR HANDLING */
    });

    mqttClient.subscribe("device/rfid/playback", function(err) {
      /* ERROR HANDLING */
    });

    mqttClient.subscribe("device/setdevice", function(err) {
      /* ERROR HANDLING */
    });
  });

  mqttClient.on("message", function(topic: string, message: string) {
    // message is Buffer
    switch (topic) {
      case "device/rfid/loadPlaylist":
        console.log("hei!");

        /* Check if user is currently registering RFID chip. If not, load playlist */
        const { userSecret, rfid }: { userSecret: string; rfid: string } = JSON.parse(message);
        User.findOne({ userSecret })
          .populate("rfidChips", " -__v -userSecret -user")
          .populate("devices")
          .exec(async (err: Error, user) => {
            if (err) {
              console.log("error finding user with user secret: ", err);
            }
            if (!user) {
              console.log("couldn't find user with user secret: ", userSecret);
              //TODO: Send mqtt response back to blink LEDS or something
            } else {
              /* If user user is not currently registering an RFID chip, he is loading a playlist */
              if (!user.rfidIsRegistering) {
                handleLoadPlaylist(message.toString(), user);

                /* If user has initiated registering a RFID chip, we create a new RFID chip */
              } else {
                var newRFIDChip = new RfidChip({
                  userSecret,
                  user: user._id,
                  id: rfid,
                  sonosPlaylistId: ""
                });
                // save the user
                newRFIDChip = await newRFIDChip.save();
                user.rfidChips.push(newRFIDChip._id);

                /* Send response with callback from api request */
                globalRFIDRegister[user.userSecret](user);
                globalRFIDRegister[user.userSecret] = null;
              }
            }
          });
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
  });
}

module.exports = mqttHan;
