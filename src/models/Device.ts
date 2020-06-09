import { IDevice } from "./models.interface";
import { Document, Schema, Model, model } from "mongoose";

var DeviceSchema: Schema = new Schema({
  userSecret: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  deviceName: {
    type: String,
    required: true,
  },
  sonosGroupId: {
    type: String,
  },
  sonosHouseholdId: {
    type: String,
  },
});

export const Device: Model<IDevice> = model<IDevice>("Device", DeviceSchema);
