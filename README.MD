# SonosBox Server

## Development

`npm run dev`

## Prod

Deploys to heroku app on push to master.
Heroku app: https://sonosbox-server.herokuapp.com/

## MQTT

Mqtt broker is `https://api.cloudmqtt.com/console/82657838/details`
MQTT connection variables is stored in .env (and in Heroku Config vars)
Example mqtt:

```
topic: device/rfid/loadPlaylist
message: {"room":"Imre","userSecret":"Heidu","rfid":"131212"}

```
