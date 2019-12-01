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

    const result = await client
      .db("sonos")
      .collection("refresh_tokens")
      .findOne({ user: "pnodseth@gmail.com" });
    console.log("TCL: main -> result", result);
  } catch (err) {
    console.log(err);
  } finally {
    await client.close();
  }

  app.use("/", (req, res) => {
    res.send("sonos server");
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}

async function storeRefreshTokenToDb(token) {
  await client
    .db("sonos")
    .collection("refresh_tokens")
    .updateOne({ user: "pnodseth@gmail.com" }, { $set: { token } });
}

function getCollection(name) {
  return client.db("sonos").collection("refresh_tokens");
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

async function getRefreshToken() {
  const postData = `grant_type=refresh_token&refresh_token=${refresh_token}`;
  const response = await baseTokenRequest(postData);
  const data = await response.json();
  if (response.ok) {
    access_token = data.access_token;
    refresh_token = data.refresh_token;
    console.log("TCL: getRefreshToken -> data", data);
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
