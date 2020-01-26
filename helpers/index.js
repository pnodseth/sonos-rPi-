var mongoose = require("mongoose");
const User = mongoose.model("User");
const Device = mongoose.model("Device");
const { startPlayback } = require("../api/sonos")
const globalRFIDRegister = { test: "hei" }


async function handleLoadPlaylist(message) {
  const data = JSON.parse(message);
  const { room, rfid, userSecret } = data;
  console.log(`Got a request with room: ${room} and rfid: ${rfid} and user secret: ${userSecret}`);
  User.findOne({ userSecret })
    .populate('rfidChips', ' -__v -userSecret -user')
    .populate('devices')
    .exec(async (err, user) => {
      if (err) {
        console.log(err)
      } else {
        if (user) {
          console.log(user)
          let chip = user.rfidChips.find(el => el.id === rfid)
          let device = user.devices.find(el => el.deviceName === room)
          if (chip && device) {
            const response = await startPlayback(device.sonosGroupId, chip.sonosPlaylistId, user._id);
            console.log("response: ", response)
          } else if (!chip) {
            console.log("no chip found with id : ", rfid)
          } else if (!device) {
            console.log("no device found with name: ", room)
          }
        } else {
          console.log("no user found with user secret: ", userSecret)
        }
      }
    })


  /* if (roomDoc && playlistDoc) {
    const response = await startPlayback(roomDoc.sonos_group_id, playlistDoc.sonos_playlist_id, userSecret);
  } else {
    if (!roomDoc) mqttClient.publish("rfid/roomNotFound", "failed");
    if (!playlistDoc) mqttClient.publish("rfid/playlistNotFound", "no playlist assosiated with RFID chip");
  } */
}

async function handlePlayback(message) {
  const { room, command, userSecret } = JSON.parse(message);
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
    togglePlayPause(roomDoc.sonos_group_id, command, userSecret);
  }

  res.send("hello from server!");
}

/* Every time the Nodemcu restarts, it triggers this function. First time we store device to db,  */
async function handleSetDevice(message) {
  const { userSecret, deviceName } = JSON.parse(message);
  User.findOne({ userSecret }, (err, user) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log("couldn't find user with user secret: ", userSecret);
      //TODO: Send mqtt response back to blink LEDS or something
    } else {
      // save new device
      let device = Device.findOne({ userSecret, deviceName }, (err, device) => {
        if (err) {
          console.log("error finding device: ", err)
        } else {

          if (!device) {
            device = new Device({
              userSecret,
              deviceName,
              user: user._id,
              sonosGroupId: ""
            });

            device.save(err => {
              if (err) {
                console.log("couldn't save device", err);
              }
            });
          }

          if (!user.devices.includes(device._id)) {
            user.devices.push(device._id)
            user.save(function (err) {
              if (err) {
                console.log("TCL: err", err);
              }
              console.log("saved user with new device")
            });
          }

        }



      })

    }
  });
}

module.exports = {
  handleLoadPlaylist,
  handlePlayback,
  handleSetDevice,
  globalRFIDRegister
};
