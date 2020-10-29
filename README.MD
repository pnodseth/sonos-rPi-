# SonosBox Server

## Development

`npm run dev`

## Prod

Deploys via [buddy.works ](https://app.buddy.works/pals-workspace/sonosbox-server/pipelines) 
which triggers deploy when pushing to origin/master.

Production server is hosted on [Digital Ocean droplet](https://cloud.digitalocean.com/droplets/194998295/graphs?i=369497&period=hour) and you can ssh to it: `ssh root@142.93.130.171`

Server is running with pm2, which is restarted after each deploy.
To list pm2 servers run `pm2 list`
to stop app, run `pm2 stop sonos-server`
To start app run `pm2 start sonos-server`



## MQTT

Mqtt broker is `https://api.cloudmqtt.com/console/82657838/details`
MQTT connection variables is stored in .env (and in Heroku Config vars)



**Example mqtt:**

```
topic: device/rfid/loadPlaylist
message: {"room":"Imre","userSecret":"Heidu","rfid":"131212"}

```

NB!
If we want to only trigger dev server (which we most likely want to during development), run the following in stead:
```
topic: device/rfid/loadPlaylist
message: {"isDev":true,"room":"Imre","userSecret":"Heidu","rfid":"131212"}

```


##