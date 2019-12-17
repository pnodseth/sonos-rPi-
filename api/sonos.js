const client = require("../db");
const fetch = require("node-fetch");

async function togglePlayPause(room, command) {
  const endpoint = `groups/${room}/playback/${command}`;
  const body = {};
  try {
    const response = await baseSonosApiRequest(
      endpoint,
      "POST",
      JSON.stringify(body)
    );
    const data = await response.json();
    console.log("TCL: main -> data", data);
  } catch (err) {
    console.log(err);
  }
}

async function startPlayback(room, playlist) {
  const endpoint = `groups/${room}/playlists`;
  const body = {
    playlistId: playlist.toString(),
    playOnCompletion: true
  };
  try {
    const response = await baseSonosApiRequest(
      endpoint,
      "POST",
      JSON.stringify(body)
    );
    const data = await response.json();
    console.log("TCL: main -> data", data);
  } catch (err) {
    console.log(err);
  }
}

async function baseSonosApiRequest(endpoint, method, body) {
  console.log("TCL: baseSonosApiRequest -> body", body);
  let url = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
  const { access_token } = await getRefreshToken();
  const headers = {
    "Content-type": "application/json",
    Authorization: `Bearer ${access_token}`,
    Host: "api.ws.sonos.com"
  };

  return fetch(url, {
    headers,
    method,
    body
  });
}

async function getRefreshToken() {
  const collection = await getCollection("refresh_tokens");
  const result = await collection.findOne({ user: "pnodseth@gmail.com" });
  const postData = `grant_type=refresh_token&refresh_token=${result.refresh_token}`;
  const response = await baseTokenRequest(postData);
  const data = await response.json();
  if (response.ok) {
    storeRefreshTokenToDb(data.refresh_token);
  } else {
    console.log("did not succeed to get refresh token: ", data);
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

async function getAccessToken(code) {
  const redirect_uri = "http://localhost:8080";
  const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}`;
  const response = baseTokenRequest(postData);

  const data = await response.json();

  const { access_token, refresh_token } = data;
  return { access_token, refresh_token };
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

async function storeRefreshTokenToDb(token) {
  const collection = await getCollection("refresh_tokens");
  await collection.updateOne(
    { user: "pnodseth@gmail.com" },
    { $set: { token } }
  );
}

module.exports = {
  startPlayback,
  storeRefreshTokenToDb,
  getRefreshToken,
  togglePlayPause,
  baseSonosApiRequest
};
