import mongoose from "mongoose";
import { Device } from "../models/Device";
import { startPlayback, togglePlayPause } from "../api/sonos";
import { IUser, IDevice } from "../models/models.interface";

const User = mongoose.model("User");

export const globalRFIDRegister = { test: "hei" };

type loadPlaylistMessage = {
  room: string;
  rfid: string;
  userSecret: string;
};
export async function handleLoadPlaylist(message: string, user: IUser) {
  const data: loadPlaylistMessage = JSON.parse(message);
  const { room, rfid, userSecret } = data;
  console.log(`Got a request with room: ${room} and rfid: ${rfid} and user secret: ${userSecret}`);
  let chip = user.rfidChips.find(el => el.id === rfid);
  let device = user.devices.find(el => el.deviceName === room);
  if (chip && device) {
    await startPlayback(device.sonosGroupId, chip.sonosPlaylistId, user);
  } else if (!chip) {
    console.log("no chip found with id : ", rfid);
  } else if (!device) {
    console.log("no device found with name: ", room);
  }
}

type handlePlaybackMessage = {
  room: string;
  command: string;
  userSecret: string;
};
export async function handlePlayback(message: string) {
  const data: handlePlaybackMessage = JSON.parse(message);
  const { room, command, userSecret }: handlePlaybackMessage = data;
  console.log(`Got a request with room: ${room} and command: ${command} and user secret: ${userSecret}`);
  User.findOne({ userSecret })
    .populate("devices")
    .exec(async (err, user: IUser) => {
      if (err) {
        console.log(err);
      } else {
        if (user) {
          let device = user.devices.find(el => el.deviceName === room);
          if (device) {
            const response: any = await togglePlayPause(device.sonosGroupId, command, user._id);
            console.log("response: ", response);
            const data = await response.json();
            console.log("result: ", data);
          } else if (!device) {
            console.log("no device found with name: ", room);
          }
        } else {
          console.log("no user found with user secret: ", userSecret);
        }
      }
    });
}

/* Every time the Nodemcu restarts, it triggers this function. First time we store device to db,  */
type setDeviceMessage = {
  userSecret: string;
  deviceName: string;
};
export async function handleSetDevice(message: string) {
  const { userSecret, deviceName }: setDeviceMessage = JSON.parse(message);
  User.findOne({ userSecret }, (err, user: IUser) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log("couldn't find user with user secret: ", userSecret);
      //TODO: Send mqtt response back to blink LEDS or something
    } else {
      // save new device
      Device.findOne({ userSecret, deviceName }, (err: Error, device: IDevice) => {
        if (err) {
          console.log("error finding device: ", err);
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
            user.devices.push(device._id);
            user.save(function(err) {
              if (err) {
                console.log("TCL: err", err);
              }
              console.log("saved user with new device");
            });
          }
        }
      });
    }
  });
}
