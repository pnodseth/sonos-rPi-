import { IDevice } from "./models.interface";
import {  Schema, Model, model } from "mongoose";

const DeviceSchema: Schema<IDevice> = new Schema({
  deviceId: {
    type: String,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  deviceName: {
    type: String,
    default: "My Device"
  },
  sonosGroupId: {
    type: String,
    default: ""
  },
  sonosGroupIdParsed: {
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
