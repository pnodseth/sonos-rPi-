import { Document, Schema, Model, model } from "mongoose";
import { IRfidChip } from "./models.interface";

const RfidChipSchema: Schema = new Schema({
  userSecret: {
    type: String,
    required: true
  },
  user: {
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
  }
});

export const RfidChip: Model<IRfidChip> = model<IRfidChip>("RfidChip", RfidChipSchema);
