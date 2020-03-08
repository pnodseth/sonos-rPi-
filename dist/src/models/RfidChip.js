"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var RfidChipSchema = new mongoose_1.Schema({
    userSecret: {
        type: String,
        required: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.RfidChip = mongoose_1.model("RfidChip", RfidChipSchema);
