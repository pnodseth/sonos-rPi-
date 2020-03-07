import * as mongoose from "mongoose";
import { IDevice } from "./models.interface";
import { Schema } from "mongoose";

var DeviceSchema: Schema = new mongoose.Schema({
  userSecret: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  deviceName: {
    type: String,
    required: true
  },
  sonosGroupId: {
    type: String
  }
});

export default mongoose.model<IDevice>("RfidChip", DeviceSchema);
