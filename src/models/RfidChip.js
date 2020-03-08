"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose = __importStar(require("mongoose"));
var RfidChipSchema = new mongoose.Schema({
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
exports.default = mongoose.model("RfidChip", RfidChipSchema);
