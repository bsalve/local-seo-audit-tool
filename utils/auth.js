'use strict';

const passport = require('passport');
const db       = require('./db');

// Only wire up Google strategy when credentials and DB are available
if (db && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email  = profile.emails?.[0]?.value  || null;
        const avatar = profile.photos?.[0]?.value  || null;

        const [user] = await db('users')
          .insert({ google_id: profile.id, email, name: profile.displayName, avatar_url: avatar })
          .onConflict('google_id')
          .merge(['email', 'name', 'avatar_url'])
          .returning('*');

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db('users').where({ id }).first();
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });
}

// Middleware: requires authenticated session; redirects to / if not logged in
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.redirect('/');
}

module.exports = { passport, requireAuth };
