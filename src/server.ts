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
//const io = require("socket.io")(http);
const api = require("./routes/api");
const PORT = process.env.PORT || 3003;

/* DB STUFF */
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);

console.log("connecting to db...");
mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("db connection succesful"))
  .catch(err => console.error("couldnt connect to db", err));

app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:8081", "http://192.168.2.180:8080", "https://zoonooz.pnodseth.dev"],
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
  app.get("/", (req,res) => {
    res.send("helluuuu")
  })

  http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}
