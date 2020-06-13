

export default function socketHandler(io, mqttClient) {
io.on('connection', (socket) => {
  console.log('a user connected');

  mqttClient.subscribe("device/pong", function(err) {
    console.log(err);
    /*ERROR HANDLING*/
  })

  mqttClient.on("message", function(topic: string, message: string) {
    const {deviceId, userId} = JSON.parse(message)
    if (topic === "device/pong") {
      console.log("emitting onlineStatus!");
      socket.emit(`${userId}/onlineStatus`, {deviceId, onlineStatus: {status: "online", date: new Date()}})
    }

  })

  socket.on("ping", deviceId => {
    // send mqtt ping to device
    mqttClient.publish(`todevice/${deviceId}`, "ping")
  })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });


});

}

