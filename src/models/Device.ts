import { IDevice } from "./models.interface";
import { Document, Schema, Model, model } from "mongoose";

var DeviceSchema: Schema = new Schema({
  deviceId: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  deviceName: {
    type: String,
    default: "My Device"
  },
  sonosGroupId: {
    type: String,
    default: ""
  },
  sonosHouseholdId: {
    type: String,
    default: ""
  },
  lastPong: {
    type: Date || null,
    default: null
  }
});

export const Device: Model<IDevice> = model<IDevice>("Device", DeviceSchema);
