const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1ba8g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const registerUserCollection = client
      .db("register")
      .collection("registerUser");

    // User Register API
    app.post("/register", async (req, res) => {
      const user = req.body;
      const existEmail = await registerUserCollection.findOne({
        email: user.email,
      });
      const existUsername = await registerUserCollection.findOne({
        username: user?.username,
      });

      if (
        user?.email === existEmail?.email &&
        user?.username === existUsername?.username
      ) {
        res.send({
          status: 409,
          message: "Already in used email and username",
        });
        return;
      }

      if (user.email === existEmail?.email) {
        res.send({ status: 409, message: "Already in used this email" });
        return;
      }

      if (user?.username === existUsername?.username) {
        res.send({ status: 409, message: "Already in used this username" });
        return;
      }
      const result = await registerUserCollection.insertOne(user);
      res.send({ status: 200, result });
    });

    // User Register API
    app.get("/login", async (req, res) => {
      const username = req.query?.username;
      const password = req.query?.password;
      const existUsername = await registerUserCollection.findOne({
        username: username,
      });
      const isMatched = await registerUserCollection.findOne({
        password: password,
      });

      if (existUsername == null) {
        res.send({ status: 404, message: "No user found" });
        return;
      }
      if (isMatched == null) {
        res.send({ status: 404, message: "Incorrect password" });
        return;
      }
      if (existUsername && isMatched) {
        res.send({ status: 200, message: existUsername });
      }
    });

    // Forget Password API
    app.get("/forgot-password", (req, res, next) => {
      res.render("forgot-password");
    });

    app.post("/forgot-password", async (req, res, next) => {
      const { email } = req.body;
      const existEmail = await registerUserCollection.findOne({
        email: email,
      });

      if (existEmail == null) {
        res.send("User not register");
        return;
      }

      // User exist and now create a one time link valid for 15minutes
      const secret = process.env.JWT_SECRET + existEmail?.password;
      const payload = {
        email: existEmail?.email,
        id: existEmail?._id,
      };
      const token = jwt.sign(payload, secret, { expiresIn: "15m" });
      const link = `http://localhost:5000/reset-password/${existEmail?._id}/${token}`;
      console.log(link);
      res.send({
        status: 200,
        message: "Password reset link has been sent to your email",
      });
    });

    app.get("/forgot-password", (req, res, next) => {});
    app.post("/forgot-password", (req, res, next) => {});
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
