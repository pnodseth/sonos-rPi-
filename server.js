var app = require("express")();
var http = require("http").createServer(app);
const rfidRoutes = require("./routes/rfid");
const sonosRoutes = require("./routes/sonos");
const client = require("./db");
const PORT = "3000";
const { storeRefreshTokenToDb, getRefreshToken } = require("./api/sonos");

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
  app.use("/", async (req, res) => {
    res.send("sonos server");
  });

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
