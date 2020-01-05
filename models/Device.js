var mongoose = require("mongoose");
var DeviceSchema = new mongoose.Schema({
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

module.exports = mongoose.model("Device", DeviceSchema);
