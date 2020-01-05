var mongoose = require("mongoose");
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

module.exports = mongoose.model("RfidChip", RfidChipSchema);
