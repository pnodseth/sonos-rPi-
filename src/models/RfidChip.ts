import * as mongoose from "mongoose";
import { IRfidChip } from "./models.interface";
import { Schema } from "mongoose";

const RfidChipSchema: Schema = new mongoose.Schema({
  userSecret: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
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

export default mongoose.model<IRfidChip>("RfidChip", RfidChipSchema);
