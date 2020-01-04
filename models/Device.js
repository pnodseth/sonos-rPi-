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
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("Device", DeviceSchema);
