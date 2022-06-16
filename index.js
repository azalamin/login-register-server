const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

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
    app.post("/registerUser", async (req, res) => {
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

    app.get("/login", async (req, res) => {
      const user = req.body;
      const username = user.username;
      const password = user.password;
      const result = await registerUserCollection.findOne();
      res.send(result);
    });
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
