const fetch = require("node-fetch");
const { getAccessTokenFromDBorRefreshToken } = require("./auth_sonos");

export async function togglePlayPause(room: string, command: string, user) {
  const endpoint = `groups/${room}/playback/${command}`;
  const body = {};
  try {
    const response: Response = await baseSonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });
    return response;
  } catch (err) {
    console.log(err);
  }
}

export async function startPlayback(room: string, playlist: string, user) {
  const endpoint: string = `groups/${room}/playlists`;
  const body = {
    playlistId: playlist.toString(),
    playOnCompletion: true
  };
  try {
    const response: Response = await baseSonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });
    return response;
  } catch (err) {
    console.log("error", err);
  }
}

export async function baseSonosApiRequest({ endpoint, method, body, user }) {
  try {
    let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
    const { accessToken }: { accessToken: string } = await getAccessTokenFromDBorRefreshToken(user);

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

module.exports = {
  startPlayback,
  togglePlayPause,
  baseSonosApiRequest
};
