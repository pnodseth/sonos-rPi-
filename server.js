var app = require("express")();
var http = require("http").createServer(app);
const { MongoClient } = require("mongodb");
const url =
  "mongodb://sonosAdm:CsaBv-!tT.Z.kgs6FnW6@ds018839.mlab.com:18839/sonos";
const fetch = require("node-fetch");
const PORT = "3000";
let access_token = "";
let refresh_token = "1a8aa9d9-bd05-4c40-838b-5560a897578f";

const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

main().catch(console.err);

async function main() {
  try {
    await client.connect();

    // Get new refresh token every 4 hours
    setInterval(async () => {
      const { refresh_token } = await getRefreshToken();
      storeRefreshTokenToDb(refresh_token);
    }, 1000 * 60 * 60 * 4);
  } catch (err) {
    console.log(err);
  } /* finally {
    await client.close();
  } */

  /* GET SONOS HOUSEHOLDS */
  app.get("/households", async (req, res) => {
    const endpoint = "households";
    try {
      const response = await baseSonosApiRequest(endpoint, "get");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  });

  /* GET HOUSEHOLD GROUPS */
  app.get("/households/:id/groups", async (req, res) => {
    const endpoint = `households/${req.params.id}/groups`;
    try {
      const response = await baseSonosApiRequest(endpoint, "get");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  });

  /* START PLAYING ON GROUP */
  app.get("/groups/:id/playback/:command", async (req, res) => {
    const endpoint = `groups/${req.params.id}/playback/${req.params.command}`;
    try {
      const response = await baseSonosApiRequest(endpoint, "POST");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  });

  /* Get playlists  */
  app.get("/households/:id/playlists", async (req, res) => {
    const endpoint = `households/${req.params.id}/playlists`;
    try {
      const response = await baseSonosApiRequest(endpoint, "get");
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  });

  /* Load playlost */
  //stue: RINCON_B8E93720D3D601400:3835498777
  app.get("/groups/:id/loadplaylist", async (req, res) => {
    const endpoint = `groups/${req.params.id}/playlists`;
    const body = {
      playlistId: "0",
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
      res.json(data);
    } catch (err) {
      console.log(err);
    }
  });

  app.use("/", async (req, res) => {
    const { refresh_token } = await getRefreshToken();
    res.send("sonos server");
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}

async function storeRefreshTokenToDb(token) {
  const collection = await getCollection("refresh_tokens");
  await collection.updateOne(
    { user: "pnodseth@gmail.com" },
    { $set: { token } }
  );
}

async function getCollection(name) {
  return client.db("sonos").collection(name);
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
