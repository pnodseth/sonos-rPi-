import express from "express";
import passport from "passport";
import { devicePing } from "../mqttHandler";
import { getToken } from "./api";
import { IDevice, IUser } from "../models/models.interface";
import { Device } from "../models/Device";
import { data, updateUuidList } from "../helpers/deviceUuids";

const router = express.Router();

/* GET Devices*/
router.get("/", passport.authenticate("jwt", { session: false }), function (req, res) {
  const token: string = getToken(req.headers);
  if (token) {
    Device.find({ user: req.user._id })
      .populate("user")
      .exec((err: Error, devices: IDevice[]) => {
        if (err) {
          console.log("error finding devices: ", err);
          res.status(404).send();
        } else {
          res.send(devices);
        }
      });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* GET single Device*/
router.get("/:deviceId", passport.authenticate("jwt", { session: false }), function (req, res) {
  const token: string = getToken(req.headers);
  if (token) {
    Device.findOne({ user: req.user._id, deviceId: req.params.deviceId }).exec((err, device: IDevice | null) => {
      if (err) {
        console.log("error finding device: ", err);
        res.status(404).send(err);
      } else {
        res.json(device);
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* Create new Device*/
router.post("/", passport.authenticate("jwt", { session: false }), (req, res) => {
  const token: string = getToken(req.headers);

  if (token) {
    const { deviceId } = req.body;

    Device.findOne({ deviceId }).exec(async (err, device) => {
      if (err) {
        res.status(500).send();
      } else {
        // Device with that ID already exists
        if (device) {
          res.status(409).send();

          // Create new device
        } else {
          try {
            const device = await createDevice(deviceId, req.user);
            res.status(201).json(device);
          } catch (err) {
            res.status(500).send();
          }
        }
      }
    });

    // Create new device
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* UPDATE Device*/
router.put("/:deviceId", passport.authenticate("jwt", { session: false }), function (req, res) {
  const token: string = getToken(req.headers);
  if (token) {
    const updatedDevice = req.body;
    console.log(typeof updatedDevice);

    // @ts-ignore
    Device.replaceOne({ user: req.user._id, deviceId: req.params.deviceId }, updatedDevice, (err) => {
      if (err) {
        console.log("error finding device: ", err);
        res.status(404).send(err);
      } else {
        res.json(updatedDevice);
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

// Verify Device ID (check that it exists in uuid file
router.get("/:id/verify/", passport.authenticate("jwt", { session: false }), async function (req, res) {
  const token: string = getToken(req.headers);
  const { id } = req.params;
  console.log("ID:  ", id);

  if (token) {
    let foundDeviceId = data.find((e) => e.deviceId === id);
    console.log("found device!");
    if (foundDeviceId) {
      res.send();
    } else {
      return res.status(404).send();
    }
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

router.get("/:id/setuser/", passport.authenticate("jwt", { session: false }), async function (req, res) {
  const token: string = getToken(req.headers);
  const { id } = req.params;
  if (token) {
    const uuidList = data;
    let foundDeviceId = uuidList.find((e) => e.deviceId === id);
    console.log("data:", uuidList);

    if (foundDeviceId) {
      foundDeviceId.assignedUserId = req.user._id;
      console.log("Updated list: ", uuidList);
      await updateUuidList(uuidList);
    } else {
      return res.status(404).send();
    }
    res.send();
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* Assign device with sonos group */
router.post("/:id/assign", passport.authenticate("jwt", { session: false }), function (req, res) {
  const token: string = getToken(req.headers);

  console.log("correct route");

  if (token) {
    const {
      sonosGroupId,
      sonosGroupIdParsed,
      sonosHouseholdId,
    }: { sonosGroupId: string; sonosHouseholdId: string; sonosGroupIdParsed: string } = req.body;

    Device.findById(req.params.id).exec(async (err, device) => {
      if (err) {
        console.log("error finding device: ", err);
        res.send(err);
      } else if (device) {
        device.sonosGroupId = sonosGroupId;
        device.sonosHouseholdId = sonosHouseholdId;
        device.sonosGroupIdParsed = sonosGroupIdParsed;
        await device.save(function (err) {
          if (err) {
            console.log("TCL: err", err);
            res.status(500).send();
          }
          res.json(device);
        });
      }
    });
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

/* PING device*/
router.get("/:deviceId/ping", passport.authenticate("jwt", { session: false }), function (req, res) {
  const token: string = getToken(req.headers);
  if (token) {
    devicePing(req.params.deviceId);
    res.send();
  } else {
    return res.status(403).send({ success: false, msg: "Unauthorized." });
  }
});

function createDevice(deviceId: string, user: IUser) {
  return new Promise((res, rej) => {
    if (process.env.NODE_ENV === "PROD") {
      //todo: Add deviceId and userId to redis, for faster lookup
      //redis.set(deviceId,userId)
    }

    const device = new Device({
      deviceId,
      user: user._id,
    });

    device.save((err) => {
      if (err) {
        //res.status(500).send();
        rej();
      } else {
        user.devices.push(device._id);
        user.save((err) => {
          if (err) {
            rej();
          } else {
            res(device);
          }
        });
      }
    });
  });
}

module.exports = router;
