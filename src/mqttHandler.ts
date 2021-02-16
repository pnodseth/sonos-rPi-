import mqtt from "mqtt";
import { User } from "./models/User";
import { createChip, handleSonosCommands, handleSetDevice } from "./helpers";
import { Device } from "./models/Device";

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

    mqttClient.subscribe("device/pong", function () {
      /*ERROR HANDLING*/
    });
  });

  mqttClient.on("error", function (err) {
    console.log("mqtt error: ", err);
  });

  mqttClient.on("message", function (topic: string, message: string) {
    const { deviceId, rfid, isDev, command } = JSON.parse(message);

    // If we are in dev mode, we can add isDev to mqtt messages to prevent triggering production server
    if (process.env.NODE_ENV === "PROD" && isDev) {
      return;
    } else {
      Device.findOne({ deviceId }, (err, device) => {
        if (err || !device) {
          console.log(`mqttHandler -> ${topic} -> no device with deviceId ${deviceId} found`);
        } else {
          console.log(`device found for id ${deviceId}:`);

          switch (topic) {
            //
            case "device/rfid/playback":
              //
              User.findById(device?.user._id)
                .populate("rfidChips", " -__v -user")
                .populate("devices")
                .exec(async (err: Error, user) => {
                  //
                  if (err) {
                    console.log("mqttHandler -> error finding user : ", device?.user._id);
                    return;
                  }
                  //
                  if (!user) {
                    console.log("mqttHandler -> couldn't find user with userId: ", device?.user._id);
                    return;
                    //TODO: Send mqtt response back to blink LEDS or something
                  }
                  //
                  if (command === "play" && user.rfidIsRegistering) {
                    await createChip(user, rfid);
                    //
                    // start playing
                  } else {
                    if (!device?.sonosGroupId) {
                      console.log(`No sonos speaker assigned to device ${device?.deviceId}`);
                    } else {
                      handleSonosCommands(device, command, rfid, user);
                    }
                  }
                });
              break;

            case "device/setdevice":
              handleSetDevice(device?.user._id, deviceId);
              break;

            case "device/pong":

            //handleSaveDevicePong(message.toString())

            default:
              break;
          }
        }
      });

      // message is Buffer
    }
  });
  return mqttClient;
}

export function devicePing(deviceId: string): any {
  console.log(`Sending ping to device: ${deviceId}`);
  mqttClient.publish(`todevice/${deviceId}`, "ping");
}
