/* https://developer.sonos.com/reference/authorization-api/create-token/ */
/* When user authorizes with Sonos through client app, we need to obtain accessToken and store it on user in db */
import fetch from "node-fetch";
import { IUser } from "../models/models.interface";

async function createAccessTokenFromAuthCodeGrant(code: string, redirectUri: string, user: IUser) {
  const postData = `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`;
  console.log("postdata: ", postData);
  try {
    return baseTokenRequest(postData);
  } catch (err) {
    console.log("error in createAccessTokenFromAuthCodeGrant: ", err);
  }
}

/* Function that first checks expiry timestamp on access token stored in Db. If not expired, use access token from DB. If expired, use refresh token in db
 to get a new access token */
async function getAccessTokenFromDBorRefreshToken(user: IUser) {
  let now = new Date().getTime();
  let { accessTokenExpirationTimestamp } = user;

  /* Access Token expired, get new with refresh token  */
  if (now > accessTokenExpirationTimestamp) {
    console.log("getting new access token from refresh token...");
    /* User has a refresh token stored, get new access token */
    if (user.refreshToken !== "") {
      const postData: string = `grant_type=refresh_token&refresh_token=${user.refreshToken}`;

      try {
        const response = await baseTokenRequest(postData);

        if (response.ok) {
          let data = await response.json();
          user.accessToken = data.access_token;
          user.refreshToken = data.refresh_token;
          user.accessTokenExpirationTimestamp = new Date().getTime() + data.expires_in;

          try {
            await user.save();
            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
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
    console.log("getting access token stored in DB");
    return { accessToken: user.accessToken, refreshToken: user.refreshToken };
  }
}

async function baseTokenRequest(postData: any) {
  const url = "https://api.sonos.com/login/v3/oauth/access";
  const headers = {
    "Content-type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic M2EwNmRhMjEtNjg5Zi00Mjg2LWFmOWItNTMwNDc0OTI2ZjI3OmIxZDc5ZGMyLTU5NTEtNDIyMy1hNzQ3LWNlNzdiMDE0ZTBmNQ==",
  };
  return fetch(url, {
    headers,
    method: "POST",
    body: postData,
  });
}

async function getNewAccessTokenFromRefreshToken(user: IUser) {
  const postData: string = `grant_type=refresh_token&refresh_token=${user.refreshToken}`;

  try {
    const response = await baseTokenRequest(postData);
    console.log("getNewAccessTokenFromRefreshToken -> response: ", response.status);
    if (response.ok) {
      let { access_token, refresh_token } = await response.json();
      console.log("getNewAccessTokenFromRefreshToken -> access token: ", access_token);
      user.accessToken = access_token;
      user.refreshToken = refresh_token;

      try {
        console.log("getNewAccessTokenFromRefreshToken _> saving new token on user...");
        await user.save();
        console.log("getNewAccessTokenFromRefreshToken _> token saved on user");
        return {
          accessToken: access_token,
          refreshToken: refresh_token,
        };
      } catch (err) {
        console.log("error saving access token on user: ", err);
      }
    } else {
      console.log("getNewAccessTokenFromRefreshToken -> response not ok: ", response.statusText);
    }
  } catch (err) {
    console.log("Error getting ");
  }
}

module.exports = {
  baseTokenRequest,
  createAccessTokenFromAuthCodeGrant,
  getAccessTokenFromDBorRefreshToken,
  getNewAccessTokenFromRefreshToken,
};
