
const fetch = require("node-fetch");
const {getAccessTokenFromDBorRefreshToken, getNewAccessTokenFromRefreshToken} = require("./auth_sonos");

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

export async function baseSonosApiRequest({endpoint, method, body, user}) {
    let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
    try {
        const {accessToken}: { accessToken: string } = await getAccessTokenFromDBorRefreshToken(user);

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

export async function sonosApiRequest({endpoint, method, body, user}) {
    let url: string = `https://api.ws.sonos.com/control/api/v1/${endpoint}`;
    const headers = {
        "Content-type": "application/json",
        Authorization: "",
        Host: "api.ws.sonos.com"
    };

    const {accessToken, refreshToken} = user

    // User has tokens in redis, try api request
    if (accessToken && refreshToken) {
        headers.Authorization = `Bearer ${accessToken}`

        const response =  fetch(url, {
            headers,
            method,
            body
        });

        //Response ok, playback started
        if (response.ok ) {
            console.log(`Sonos API request to endpoint ${endpoint} success`)
            return;

        // Response not ok
        } else {
            // Token expired, get new token
            if (response.status === 401) {
                const {accessToken } = getNewAccessTokenFromRefreshToken(user)
                headers.Authorization = `Bearer ${accessToken}`

                const response =  fetch(url, {
                    headers,
                    method,
                    body
                });

                // Request successful
                if (response.ok) {
                    console.log(`Sonos API request to endpoint ${endpoint} success`)
                    return

                // Request not successful
                } else {
                    console.log(`Sonos API request to endpoint ${endpoint} failed with status ${response.status}: ${response.statusText}`)
                }
            }
        }
    }
}



module.exports = {
    startPlayback,
    togglePlayPause,
    baseSonosApiRequest
};


