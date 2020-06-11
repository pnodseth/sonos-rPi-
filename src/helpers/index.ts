import mongoose from "mongoose";
import { Device } from "../models/Device";
import { startPlayback, togglePlayPause } from "../api/sonos";
import { IUser, IDevice } from "../models/models.interface";

const User = mongoose.model("User");

export const globalRFIDRegister = {};

type loadPlaylistMessage = {
  room: string;
  rfid: string;
  userSecret: string;
};

export async function handleLoadPlaylist(message: string, user: IUser) {
  const data: loadPlaylistMessage = JSON.parse(message);
  const { room, rfid, userSecret } = data;
  console.log(
    `handleLoadPlaylist -> Got a request with room: ${room} and rfid: ${rfid} and user secret: ${userSecret}`
  );
  let chip = user.rfidChips.find((el) => el.id === rfid);
  let device = user.devices.find((el) => el.deviceName === room);
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

export async function handlePlayback(message: string, user: IUser) {
  const data: handlePlaybackMessage = JSON.parse(message);
  const { room, command, userSecret }: handlePlaybackMessage = data;
  console.log(
    `handlePlayback -> Got a request with room: ${room} and command: ${command} and user secret: ${userSecret}`
  );

  let device = user.devices.find((el) => el.deviceName === room);
  if (device) {
    await togglePlayPause(device.sonosGroupId, command, user);
  } else if (!device) {
    console.log("no device found with name: ", room);
  }
}

/* Every time the Nodemcu restarts, it triggers this function. First time we store device to db,  */
type setDeviceMessage = {
  userSecret: string;
  deviceName: string;
};

export async function handleSetDevice(message: string) {
  console.log("setting device...");

  const { userSecret, deviceName }: setDeviceMessage = JSON.parse(message);
  let uS = userSecret.toLowerCase();

  User.findOne({ userSecret: uS }, (err, user: IUser) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log("couldn't find user with user secret: ", userSecret);
      //TODO: Send mqtt response back to blink LEDS or something
    } else {
      console.log("setDevice -> found user: ", user.userSecret);

      // save new device
      Device.findOne({ userSecret: uS, deviceName }, (err: Error, device: IDevice) => {
        if (err) {
          console.log("error finding device: ", err);
        } else {
          if (!device) {
            console.log("handleSetDevice -> Brand new device! saving it.");

            device = new Device({
              userSecret: uS,
              deviceName,
              user: user._id,
              sonosGroupId: ""
            });

            device.save((err) => {
              if (err) {
                console.log("couldn't save device", err);
              }
            });
          } else {
            console.log("handleSetDevice -> Not a new device.");
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

export async function handleDevicePong(message: string) {
  console.log("handling device pong");

  const { userSecret, deviceName }: setDeviceMessage = JSON.parse(message);
  let uS = userSecret.toLowerCase();

  User.findOne({ userSecret: uS }, (err, user: IUser) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log("couldn't find user with user secret: ", userSecret);

    } else {
      console.log("handleDevicePong -> found user: ", user.userSecret);

      // save new device
      Device.findOne({ userSecret: uS, deviceName }, (err: Error, device: IDevice) => {
        if (err) {
          console.log("error finding device: ", err);
        } else {
          if (!device) {
            console.log("handleDevicePong -> Found no device with devicename: ", deviceName);


          } else {
            console.log("handleDevicePong -> Setting device lastPong on device: ", deviceName);

            device.lastPong = new Date();

            device.save((err) => {
              if (err) {
                console.log("couldn't save device", err);
              } else {
                console.log("device lastPong updated");
              }
            });
          }
        }
      });
    }
  });
}
