import {  Schema, Model, model } from "mongoose";
import { IRfidChip } from "./models.interface";

const RfidChipSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  id: {
    type: String,
    required: true
  },
  sonosPlaylistId: {
    type: String,
    default: ""
  },
  sonosHouseholdId: {
    type: String,
    default: ""
  }
});

export const RfidChip: Model<IRfidChip> = model<IRfidChip>("RfidChip", RfidChipSchema);
