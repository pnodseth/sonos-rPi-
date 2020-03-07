const express = require("express");
const app = express();
const http = require("http").createServer(app);
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const cors = require("cors");

const mqttHandler = require("./mqttHandler");
const config = require("./config/database");
require("./models/User");
require("./models/RfidChip");
require("./models/Device");
const api = require("./routes/api");
const PORT = "3003";

dotenv.config();

/* DB STUFF */
mongoose
  .connect(config.database, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("mongoose connection succesful"))
  .catch(err => console.error(err));

app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:8081"],
    optionsSuccessStatus: 200,
    credentials: true
  })
);

/* PASSPORT STUFF */
app.use(passport.initialize());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

main().catch(console.err);

async function main() {
  mqttHandler();

  app.use("/api", api);

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
