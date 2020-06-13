import { handleSaveDevicePong } from "./helpers";


export default function socketHandler(io, mqttClient) {
io.on('connection', (socket) => {
  const userId = socket.handshake.query.u;


  if (userId) {
    const subscribeTopic = `${userId}/device/pong`

    mqttClient.subscribe(subscribeTopic, function(err) {
      console.log(`socketHandler subscribing to mqtt topic: ${subscribeTopic}`);
      console.log(err);
      /*ERROR HANDLING*/
    })

    mqttClient.on("message", async function(topic: string, message: string) {
      const {deviceId} = JSON.parse(message)

      if (topic === subscribeTopic) {
        const socketEmitEvent = `${userId}/onlineStatus`
        console.log("emitting onlineStatus for: ", socketEmitEvent);
        socket.emit(socketEmitEvent, {deviceId, onlineStatus: {status: "online", date: new Date()}})
        await handleSaveDevicePong(userId, deviceId)
      }

    })

  socket.on("ping", deviceId => {
    // send mqtt ping to device
    console.log("recieved ping device. Publishing to mqtt: ", `todevice/${deviceId}`  );
    mqttClient.publish(`todevice/${deviceId}`, JSON.stringify({event: "ping", userId: userId}))
  })

  socket.on('disconnect', () => {
    console.log(`user disconnected, unsubscribing to topic ${subscribeTopic}`)
    mqttClient.unsubscribe(subscribeTopic)
  });
  }



});

}

