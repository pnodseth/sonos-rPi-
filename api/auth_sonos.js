/* https://developer.sonos.com/reference/authorization-api/create-token/ */
/* When user authorizes with Sonos through client app, we need to obtain accessToken and store it on user in db */
const fetch = require("node-fetch");

async function createAccessTokenFromAuthCodeGrant(code, redirectUri, user) {
  const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`;
  console.log("postdata: ", postData);
  try {
    const response = await baseTokenRequest(postData);

    if (response.ok) {
      let data = await response.json();
      user.accessToken = data.access_token;
      user.refreshToken = data.refresh_token;
      user.accessTokenExpirationTimestamp = data.expires_in;

      try {
        await user.save();
        return;
      } catch (err) {
        console.log("error saving user: ", err);
      }
    } else {
      console.log("error : ", response);
    }
  } catch (err) {
    console.log("error in createAccessTokenFromAuthCodeGrant: ", err);
  }
}

/* Function that first checks expiry timestamp on access token stored in Db. If not expired, use access token from DB. If expired, use refresh token in db
 to get a new access token */
async function getAccessTokenFromDBorRefreshToken(user) {
  let now = new Date().getTime();
  let { accessTokenExpirationTimestamp } = user;

  /* Access Token expired, get new with refresh token  */
  if (now > accessTokenExpirationTimestamp) {
    /* User has a refresh token stored, get new access token */
    if (user.refreshToken !== "") {
      const postData = `grant_type=refresh_token&refresh_token=${user.refreshToken}`;

      try {
        const response = await baseTokenRequest(postData);

        if (response.ok) {
          let data = await response.json();
          user.accessToken = data.access_token;
          user.refreshToken = data.refresh_token;
          user.accessTokenExpirationTimestamp = data.expires_in;

          try {
            await user.save();
            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token
            };
          } catch (err) {
            console.log("error saving access token on user: ", err);
          }
        }
      } catch (err) {
        console.log("Error getting ");
      }
      /* User doesn't have a refresh token stored, somehow inform user */
    } else {
      console.log("!! User doesn't have a refresh token stored. User needs to re-authorize Sonos through client app");
    }

    /* Access token still valid, use it. */
  } else {
    return { accessToken: user.accessToken, refreshToken: user.refreshToken };
  }
}

async function baseTokenRequest(postData = {}) {
  const url = "https://api.sonos.com/login/v3/oauth/access";
  const headers = {
    "Content-type": "application/x-www-form-urlencoded",
    Authorization: "Basic M2EwNmRhMjEtNjg5Zi00Mjg2LWFmOWItNTMwNDc0OTI2ZjI3OmIxZDc5ZGMyLTU5NTEtNDIyMy1hNzQ3LWNlNzdiMDE0ZTBmNQ=="
  };
  return fetch(url, {
    headers,
    method: "POST",
    body: postData
  });
}

module.exports = {
  baseTokenRequest,
  createAccessTokenFromAuthCodeGrant,
  getAccessTokenFromDBorRefreshToken
};
