import mongoose from "mongoose";
import { Device } from "../models/Device";
import { startPlayback, handlePlaybackCommand, handleVolumeChange } from "../api/sonos";
import { IDevice, IUser } from "../models/models.interface";
import { RfidChip } from "../models/RfidChip";

const User = mongoose.model("User");

export const globalRFIDRegister = {};

export async function handleLoadPlaylist(device: IDevice, rfid: string, user: IUser) {

  console.log(
    `handleLoadPlaylist -> Got a request for device: ${device.deviceId} and rfid: ${rfid} and user: ${user.username}`
  );
  let chip = user.rfidChips.find((el) => el.id === rfid);

  if (chip && device) {
    await startPlayback(device, chip.sonosPlaylistId, user);
  } else if (!chip) {
    console.log("no chip found with id : ", rfid);
  }
}


export async function handleSonosCommands(device: IDevice, command: string, rfid: string, user: IUser) {
  console.log(
    `handlePlayback -> Got a request with device: ${device.deviceId} and command: ${command} and user: ${user.username}`
  );

  // Custom handling for "play" command.
  if (command === "play") {
    console.log(`chip id: ${rfid}`);
    handleLoadPlaylist(device, rfid, user);
  } else if (command.includes("volume")) {
    await handleVolumeChange(device.sonosGroupId, command, user);
  } else {
    await handlePlaybackCommand(device.sonosGroupId, command, user);
  }

}

/* Every time the Nodemcu restarts, it triggers this function. First time we store device to db,  */

export async function handleSetDevice(userId: string, deviceId: string) {
  console.log("setting device...");

  User.findById(userId, (err, user: IUser) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log("couldn't find user with userId: ", userId);
      //TODO: Send mqtt response back to blink LEDS or something
    } else {
      console.log("setDevice -> found user: ", user._id);

      // save new device
      Device.findOne({ deviceId }, (err: Error, device: IDevice) => {
        if (err) {
          console.log("error finding device: ", err);
        } else {
          if (!device) {
            console.log("handleSetDevice -> Brand new device! saving it.");

            device = new Device({
              user: user._id,
              deviceId
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

export async function handleSaveDevicePong(userId: string, deviceId: string) {


  User.findOne({ userId }, (err, user: IUser) => {
    if (err) {
      console.log("error finding user with user secret: ", err);
    }
    if (!user) {
      console.log(`couldn't find user with userId: ${userId}`);

    } else {
      console.log("handleDevicePong -> found user: ", user.username);

      // Update device lastPong
      Device.findOne({ deviceId, userId }, (err: Error, device: IDevice) => {
        if (err) {
          console.log("error finding device: ", err);
        } else {
          if (!device) {
            console.log("handleDevicePong -> Found no device with deviceId: ", deviceId);


          } else {
            console.log("handleDevicePong -> Setting device lastPong on device: ", deviceId);

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

export async function createChip(user: IUser, rfid) {
  console.log(`creating new chip with id ${rfid}`);

  let newRFIDChip = new RfidChip({
    userId: user._id,
    id: rfid
  });
  // save the user
  newRFIDChip = await newRFIDChip.save();
  user.rfidChips.push(newRFIDChip._id);

  /* Send response with callback from api request */
  globalRFIDRegister[user._id](user);
  globalRFIDRegister[user._id] = null;
}