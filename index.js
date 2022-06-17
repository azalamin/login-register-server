const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");

const port = process.env.PORT || 5000;
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

const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

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
    app.post("/forgot-password", async (req, res, next) => {
      const user = req.body;
      const existEmail = await registerUserCollection.findOne({
        email: user?.email,
      });

      if (existEmail == null) {
        res.send({ status: false, message: "User not register" });
        return;
      }

      // User exist and now create a one time link valid for 15minutes
      const secret = process.env.JWT_SECRET + existEmail?.password;
      const payload = {
        email: existEmail?.email,
        id: existEmail?._id,
      };
      const token = jwt.sign(payload, secret, { expiresIn: "15m" });
      const link = `http://localhost:5000/forgot-password/${existEmail?.email}/${token}`;
      console.log(link);

      res.send({
        status: true,
        message: "Password reset link has been sent to your email...",
      });

      nodemailerMailgun.sendMail(
        {
          from: "Programminghero@email.com",
          to: existEmail?.email,
          subject: "Reset Password",
          html: `<div>
            <p>Please reset your password by the below link</p>
            <p>
                <a href=${link} target='_blank'>Click here</a>
            </p>
          </div>`,
        },
        (err, info) => {
          if (err) {
            console.log(err);
          } else {
            console.log(info);
          }
        }
      );
    });

    app.get("/forgot-password/:email/:token", async (req, res, next) => {
      const { email, token } = req.params;
      const existEmail = await registerUserCollection.findOne({
        email: email,
      });
      // check this id exist in database
      console.log(existEmail?.email);
      if (email !== existEmail?.email) {
        res.send("Invalid Email ...");
        return;
      }
      // we have a valid id and valid user with this id
      const secret = process.env.JWT_SECRET + existEmail?.password;
      try {
        const payload = jwt.verify(token, secret);
        res.render("reset-password", { email: existEmail?.email });
      } catch (error) {
        console.log(error);
        res.send(error?.message);
      }
    });

    app.post("/forgot-password/:email/:token", async (req, res, next) => {
      const { email, token } = req.params;
      const { password, password2 } = req.body;
      const existEmail = await registerUserCollection.findOne({
        email: email,
      });

      // check this email exist in database
      if (email !== existEmail?.email) {
        res.send("Invalid Email...");
        return;
      }

      const secret = process.env.JWT_SECRET + existEmail?.password;

      try {
        const payload = jwt.verify(token, secret);
        existEmail.password = password2;
        res.send(existEmail);
      } catch (error) {
        console.log(error);
        res.send(error?.message);
      }
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
