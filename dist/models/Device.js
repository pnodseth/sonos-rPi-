"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var DeviceSchema = new mongoose_1.Schema({
    userSecret: {
        type: String,
        required: true
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.Device = mongoose_1.model("Device", DeviceSchema);
