import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import passport from "passport";
import cors from "cors";
import mqttHandler from "./mqttHandler";

const app = express();
const http = require("http").createServer(app);
const config = require("./config/database");
const api = require("./routes/api");
const PORT = "3003";

/* DB STUFF */
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose
  .connect(process.env.DB_URL, {
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

main();

async function main() {
  mqttHandler();

  app.use("/api", api);

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
