import { IDevice, IUser } from "../models/models.interface";


const fetch = require("node-fetch");
const { getNewAccessTokenFromRefreshToken } = require("./auth_sonos");

export async function handlePlaybackCommand(sonosGroupId: string, command: string, user: IUser) {
  const endpoint = `groups/${sonosGroupId}/playback/${command}`;
  console.log("endpoint: ", endpoint);
  const body = {};
  try {
    await sonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });
  } catch (err) {
    console.log(err);
  }
}

export async function handleVolumeChange(sonosGroupId: string, command: string, user: IUser) {
  const endpoint = `groups/${sonosGroupId}/groupVolume/relative`;
  console.log("endpoint: ", endpoint);
  const body = {
    volumeDelta: command === "volumeUp" ? 5 : -5
  };
  try {
    await sonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });
  } catch (err) {
    console.log(err);
  }
}



export async function startPlayback(device: IDevice, playlist: string, user: IUser) {
  const endpoint: string = `groups/${device.sonosGroupId}/playlists`;
  const body = {
    playlistId: playlist.toString(),
    playOnCompletion: true
  };
  try {
    const response = await sonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });

    if (response && response.status === 410) {
      // Sometimes when sonos speakers are unplugged, they receive a new partlyid when coming back online.
      // The first part of the id is the same, and the second, after a ':' is new. If the device is not to be found
      // when receiving a play request, check if it has got a new id, and if so, update stored device with new id.

      try {
        const endpoint: string = `households/${device.sonosHouseholdId}/groups`;
        const response: Response = await sonosApiRequest({
          endpoint,
          method: "get",
          user
        });

        const { groups } = await response.json();

        if (groups) {
          let correctGroup = groups.find(e => getParsedGroupId(e.id) === device.sonosGroupIdParsed);

          // If group id has changed, reassign device
          if (correctGroup.id !== device.sonosGroupId) {

            await reassignGroup(correctGroup, device);
            console.log("device updated with correct sonos group info. Trying new play request...");
            await startPlayback(device, playlist, user);
            return;
          } else {
            // do nothing
            console.log("Sonos group is still the same, no need to reassign.");
            return;
          }
        } else {
          console.log("No sonos groups.. All sonos devices offline?");
          return;
        }


      } catch (err) {
        console.log(err);
        return;
      }

      // If any sonos groups, try to reassign to group with same parsedId


    }

  } catch (err) {
    console.log("error", err);
  }
}

export async function baseSonosApiRequest({ endpoint, method, body, user }: { endpoint: string, method: string, body?: string, user: IUser }) {
  let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
  try {
    const { accessToken }: { accessToken: string } = user;

    const headers = {
      "Content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Host: "api.ws.sonos.com"
    };

    return fetch(url, {
      headers,
      method,
      body
    });
  } catch (err) {
    throw new Error(err);
  }
}

/*
 * New test functions
 * */

export async function sonosApiRequest({ endpoint, method, body, user }: { endpoint: string, method: string, body?: string, user: IUser }) {
  let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
  const headers = {
    "Content-type": "application/json",
    Authorization: "",
    Host: "api.ws.sonos.com"
  };

  const options: any = {
    headers,
    method
  };

  if (body) {
    options.body = body;
  }

  const { accessToken, refreshToken } = user;

  // User has tokens in redis, try api request
  if (accessToken && refreshToken) {
    headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(url, options);

    console.log("sonosApiRequest response: ", response.status);

    //Response ok, playback started
    if (response.ok) {
      console.log(`Sonos API request to endpoint ${endpoint} success`);
      return response;

      // Response not ok
    } else {
      console.log("sonosApiRequest response not ok");
      // Token expired, get new token
      if (response.status === 401) {
        const { accessToken } = await getNewAccessTokenFromRefreshToken(user);
        headers.Authorization = `Bearer ${accessToken}`;

        console.log("sonosApiRequest -> trying new request with new token: ", accessToken);
        const response = await fetch(url, options);

        console.log("sonosApiRequest response: ", response.status);

        // Request successful
        if (response.ok) {
          console.log(`Sonos API request to endpoint ${endpoint} success`);
          return response;

          // Request not successful
        } else {
          console.log(
            `Sonos API request to endpoint ${endpoint} failed with status ${response.status}: ${response.statusText}`
          );
        }
      } else if (response.status === 410) {
        console.log(
          `sonosApiRequest -> SonosPlayer is probably not connected: Response status ${response.status}, text: ${response.statusText}`
        );
        return response;
      } else {
        console.log(`sonosApiRequest -> Response status: ${response.status}, ${response.statusText} `);
        return response;
      }
    }
  } else {
    console.log("user does not have access and/or refresh token, please re-authorize in web app", user);
  }
}

// HELPER FUNCTIONS


export function getParsedGroupId(groupId) {
  if (groupId.includes(":")) {
    return groupId.split(":")[0];
  } else return groupId;
}

async function reassignGroup(correctGroup, device: IDevice) {
  if (correctGroup) {
    console.log(`Found correct group! Reassigning...`, correctGroup);

    // Save device with updated sonos group info
    device.sonosGroupIdParsed = getParsedGroupId(correctGroup.id);
    device.sonosGroupId = correctGroup.id;
    device.deviceName = correctGroup.name;

    await device.save();
    return;

  } else {
    console.log("Couldn't find a sonos group to reassign to. ");
    return;
  }
}

