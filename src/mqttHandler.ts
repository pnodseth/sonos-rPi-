import mqtt from "mqtt";
import { RfidChip } from "./models/RfidChip";
import { User } from "./models/User";
import { Device } from "./models/Device";
import { handleLoadPlaylist, handlePlayback, handleSetDevice, globalRFIDRegister } from "./helpers";

export default function mqttHandler() {
  console.log("trying to connect to mqtt broker...");
  let mqttClient = mqtt.connect(process.env.MQTT_URL, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS
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

  mqttClient.on("error", function(err) {
    console.log("mqtt error: ", err);
  });

  mqttClient.on("message", function(topic: string, message: string) {
    const { userSecret, rfid, isDev = false }: { userSecret: string; rfid: string; isDev: boolean } = JSON.parse(message);
    
    // If we are in dev mode, we can add isDev to mqtt messages to prevent triggering production server
    if (process.env.NODE_ENV === "PROD" && isDev) {
      return 
    } else {
      
      // message is Buffer
      switch (topic) {
        case "device/rfid/loadPlaylist":
  
          /* Check if user is currently registering RFID chip. If not, load playlist */
          
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

    }
  });
}
