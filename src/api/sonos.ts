import { IUser } from "../models/models.interface";

const fetch = require("node-fetch");
const {  getNewAccessTokenFromRefreshToken } = require("./auth_sonos");

export async function togglePlayPause(room: string, command: string, user: IUser) {
  const endpoint = `groups/${room}/playback/${command}`;
  const body = {};
  try {
    await sonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user,
    });
  } catch (err) {
    console.log(err);
  }
}

export async function startPlayback(room: string, playlist: string, user: IUser) {
  const endpoint: string = `groups/${room}/playlists`;
  const body = {
    playlistId: playlist.toString(),
    playOnCompletion: true,
  };
  try {
    sonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user,
    });
  } catch (err) {
    console.log("error", err);
  }
}

export async function baseSonosApiRequest({ endpoint, method, body, user }: {endpoint: string, method: string, body?: string, user: IUser}) {
  let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
  try {
    const { accessToken }: { accessToken: string } = user;

    const headers = {
      "Content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Host: "api.ws.sonos.com",
    };

    return fetch(url, {
      headers,
      method,
      body,
    });
  } catch (err) {
    throw new Error(err);
  }
}

/*
 * New test functions
 * */

export async function sonosApiRequest({ endpoint, method, body, user }: {endpoint: string, method: string, body?: string, user: IUser}) {
  let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
  const headers = {
    "Content-type": "application/json",
    Authorization: "",
    Host: "api.ws.sonos.com",
  };

  const options: any = {
    headers,
    method,
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

        console.log("sonosApiRequst response: ", response.status);

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
      } else {
        console.log(`sonosApiRequest -> Response status: ${response.status}, ${response.statusText} `);
      }
    }
  } else {
    console.log("user does not have access and/or refresh token, please re-authorize in web app", user);
  }
}

module.exports = {
  startPlayback,
  togglePlayPause,
  baseSonosApiRequest,
  sonosApiRequest,
};
