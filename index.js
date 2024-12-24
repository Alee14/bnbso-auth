import express from "express";
import session from "express-session";
import multer from "multer";
import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from "dotenv";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
dotenv.config();

// Load error messages from JSON file

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statusMessages = JSON.parse(fs.readFileSync(path.join(__dirname, 'status.json'), 'utf8'));

const upload = multer();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));


// Passport session setup
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Configure Passport Discord strategy
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.REDIRECT_URI,
      scope: ["identify", "email", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    const { id, username, email, guilds } = req.user;
    const isInGuild = guilds.some((guild) => guild.id === process.env.GUILD_ID);

    if (isInGuild) {
      let userExists = true;
        if (userExists) {
            return res.render('login');
        } else {
          return res.render('register', req.user);
        }
    } else {
        return res.render('error', { error: 'You must be a member of the bits & Bytes server to access this page.' });
    }
  } else {
    res.render('index');
  }
});

app.post("/register", upload.none(), async (req, res) => {
  if (req.isAuthenticated()) {
    const { id } = req.user;
    const { username, email, password, password2 } = req.body;

    if (password !== password2) {
      return res.render('register', { ...req.user, error: "Passwords do not match" });
    }

    try {
      const form = new FormData();
      form.append('username', username);
      form.append('email', email);
      form.append('password', password);

      const response = await axios.post(`${process.env.API_URL}/userapi/registration`, form, {
        headers: form.getHeaders()
      });

      if (response.data.error) {
        const errorKey = response.data.error_description || "default";
        const errorMessage = statusMessages.registration_errors[errorKey] || "Something went wrong";
        return res.render('register', { ...req.user, error: errorMessage });
      } else {
        console.log(`Discord ID: ${id}`)
        return res.render('success');
      }
    } catch (error) {
      console.error("Error during registration:", error);
      return res.render('register', { ...req.user, error: "An error occurred during registration" });
    }
  } else {
    res.redirect("/");
  }
});

app.get(
  "/auth/discord",
  passport.authenticate("discord", { scope: ["identify", "email", "guilds"] })
);

app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

const port = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${port}`));
