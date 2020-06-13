import mqtt from "mqtt";
import { RfidChip } from "./models/RfidChip";
import { User } from "./models/User";
import { handleLoadPlaylist, handlePlayback, handleSetDevice, globalRFIDRegister } from "./helpers";

console.log("trying to connect to mqtt broker...");
const mqttClient = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
});

export default function mqttHandler() {


  mqttClient.on("connect", function () {
    console.log("mqtt connected");


    mqttClient.subscribe("device/rfid/loadPlaylist", function () {
      /* ERROR HANDLING */
    });

    mqttClient.subscribe("device/rfid/playback", function () {
      /* ERROR HANDLING */
    });

    mqttClient.subscribe("device/setdevice", function () {
      /* ERROR HANDLING */
    });

    mqttClient.subscribe("device/pong", function() {
      /*ERROR HANDLING*/
    })
  });

  mqttClient.on("error", function (err) {
    console.log("mqtt error: ", err);
  });

  mqttClient.on("message", function (topic: string, message: string) {
     const {deviceId, userId, rfid, isDev, command} = JSON.parse(message)

    // If we are in dev mode, we can add isDev to mqtt messages to prevent triggering production server
    if (userId) {
      if (process.env.NODE_ENV === "PROD" && isDev) {
        return;
      } else {
        // message is Buffer
        switch (topic) {
          case "device/rfid/loadPlaylist":
            /* Check if user is currently registering RFID chip. If not, load playlist */
              User.findById(userId)
                .populate("rfidChips", " -__v -user")
                .populate("devices")
                .exec(async (err: Error, user) => {
                  if (err) {
                    console.log("error finding user with user secret: ", err);
                  }
                  if (!user) {
                    console.log("couldn't find user with userId: ", userId);
                    //TODO: Send mqtt response back to blink LEDS or something
                  } else {
                    /* If user user is not currently registering an RFID chip, he is loading a playlist */
                    if (!user.rfidIsRegistering) {
                      handleLoadPlaylist(deviceId, rfid, user);

                      /* If user has initiated registering a RFID chip, we create a new RFID chip */
                    } else {
                      var newRFIDChip = new RfidChip({
                        userId: user._id,
                        id: rfid,
                      });
                      // save the user
                      newRFIDChip = await newRFIDChip.save();
                      user.rfidChips.push(newRFIDChip._id);

                      /* Send response with callback from api request */
                      globalRFIDRegister[user._id](user);
                      globalRFIDRegister[user._id] = null;
                    }
                  }
                });

            break;

          case "device/rfid/playback":
            User.findById(userId)
              .populate("rfidChips", " -__v -user")
              .populate("devices")
              .exec(async (err: Error, user) => {
                if (err) {
                  console.log("error finding user with user secret: ", err);
                }
                if (!user) {
                  console.log("couldn't find user with userId: ", userId);
                  //TODO: Send mqtt response back to blink LEDS or something
                } else {
                  /* If user user is not currently registering an RFID chip, he is loading a playlist */

                  //handleLoadPlaylist(message.toString(), user);
                  handlePlayback(deviceId, command, user);

                  /* If user has initiated registering a RFID chip, we create a new RFID chip */
                }
              });
            break;

          case "device/setdevice":
            handleSetDevice(userId, deviceId);
            break;

          case "device/pong":

            //handleSaveDevicePong(message.toString())

          default:
            break;
        }
      }

    } else {
      console.log("rfid -> no userId provided from device");
    }
  });
  return mqttClient
}

export function devicePing(deviceId: string): any {
  console.log(`Sending ping to device: ${deviceId}`);
  mqttClient.publish(`todevice/${deviceId}`, "ping")
}
