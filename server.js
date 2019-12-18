const express = require("express");
var app = express();
var http = require("http").createServer(app);
const rfidRoutes = require("./routes/rfid");
const sonosRoutes = require("./routes/sonos");
const client = require("./db");
const PORT = "3000";
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { isAuthorized, cookieSecret } = require("./middleware");

const { storeRefreshTokenToDb, getRefreshToken } = require("./api/sonos");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
main().catch(console.err);

async function main() {
  client.connect(
    "mongodb://sonosAdm:CsaBv-!tT.Z.kgs6FnW6@ds018839.mlab.com:18839/sonos",
    function(err) {
      if (err) {
        console.log("Unable to connect to Mongo: ", err);
        process.exit(1);
      }
    }
  );

  const { refresh_token } = await getRefreshToken();
  storeRefreshTokenToDb(refresh_token);

  // Get new refresh token every 4 hours
  setInterval(async () => {
    const { refresh_token } = await getRefreshToken();
    storeRefreshTokenToDb(refresh_token);
  }, 1000 * 60 * 60 * 4);

  app.use("/rfid", rfidRoutes);
  app.use("/sonos", sonosRoutes);

  app.get("/sonosauth", isAuthorized, (req, res) => {
    res.send("you did it");
  });

  app.post("/login", (req, res) => {
    if (req.body.email && req.body.password) {
    }
    // setting cookies
    res.cookie(
      "user",
      { user: req.body.email, cookieSecret },
      {
        maxAge: 900000,
        httpOnly: true
      }
    );
    return res.send("Cookie has been set");
  });

  app.get("/login", (req, res) => {
    if (!req.cookies.user) {
      res.sendFile(path.join(__dirname + "/views/login.html"));
    } else {
      res.redirect("/");
    }
  });

  app.use("/", (req, res) => {
    res.sendFile(path.join(__dirname + "/views/index.html"));
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
