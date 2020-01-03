const client = require("../db");
const fetch = require("node-fetch");

async function togglePlayPause(room, command, user) {
  const endpoint = `groups/${room}/playback/${command}`;
  const body = {};
  try {
    const response = await baseSonosApiRequest({
      endpoint,
      method: "POST",
      body: JSON.stringify(body),
      user
    });
    const data = await response.json();
  } catch (err) {
    console.log(err);
  }
}

async function startPlayback(room, playlist, user) {
  const endpoint = `groups/${room}/playlists`;
  const body = {
    playlistId: playlist.toString(),
    playOnCompletion: true
  };
  try {
    const response = await baseSonosApiRequest({
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

async function baseSonosApiRequest({ endpoint, method, body, user }) {
  try {
    let url = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
    const { accessToken } = await getSonosAccessRefreshTokens({
      type: "refreshToken",
      user
    });
    console.log("TCL: baseSonosApiRequest -> access_token", accessToken);
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

async function getRefreshTokensForAllUsers() {
  const collection = await getCollection("refresh_tokens");
  const allDocuments = await collection.find();
  allDocuments.forEach(async item => {
    const { refreshToken } = await getSonosAccessRefreshTokens({ type: "refreshToken", user: item.user });
    storeRefreshTokenToDb({
      refreshToken: refreshToken,
      user: item.user
    });
  });
}

async function getSonosAccessRefreshTokens({ type, code, user }) {
  console.log("TCL: getSonosAccessRefreshTokens -> user", user);
  if (type !== "refreshToken" && type !== "accessToken") {
    throw new Error("You need to provide a type of either 'accessToken' or 'refreshToken'");
  } else {
    const redirect_uri = "http://localhost:3000/sonos/authcomplete";
    const collection = await getCollection("refresh_tokens");
    const result = await collection.findOne({ user });
    const postData =
      type === "refreshToken"
        ? `grant_type=refresh_token&refresh_token=${result.refreshToken}`
        : `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}`;

    const response = await baseTokenRequest(postData);
    const data = await response.json();

    if (response.ok) {
      storeRefreshTokenToDb({ refreshToken: data.refresh_token, user: user });
    } else {
      throw new Error("Did not succeed to get refresh token");
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
}

async function baseTokenRequest(postData = {}) {
  const url = "https://api.sonos.com/login/v3/oauth/access";
  const headers = {
    "Content-type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic M2EwNmRhMjEtNjg5Zi00Mjg2LWFmOWItNTMwNDc0OTI2ZjI3OmIxZDc5ZGMyLTU5NTEtNDIyMy1hNzQ3LWNlNzdiMDE0ZTBmNQ=="
  };
  return fetch(url, {
    headers,
    method: "POST",
    body: postData
  });
}

async function getCollection(name) {
  return client
    .get()
    .db("sonos")
    .collection(name);
}

async function storeRefreshTokenToDb({ refreshToken, user }) {
  const collection = await getCollection("refresh_tokens");
  await collection.updateOne({ user }, { $set: { refreshToken } }, { upsert: true });
}

module.exports = {
  startPlayback,
  storeRefreshTokenToDb,
  getSonosAccessRefreshTokens,
  togglePlayPause,
  baseSonosApiRequest,
  baseTokenRequest
};
