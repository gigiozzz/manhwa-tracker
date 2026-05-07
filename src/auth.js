'use strict';
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || 'gigiozzz@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const BASE_PATH   = (process.env.BASE_PATH || '').replace(/\/$/, '');
const BASE_URL    = (process.env.BASE_URL  || 'http://localhost:3000');
const CALLBACK_URL = `${BASE_URL}${BASE_PATH}/auth/google/callback`;

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  CALLBACK_URL,
  },
  (accessToken, refreshToken, profile, done) => {
    const email = (profile.emails?.[0]?.value || '').toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      return done(null, false, { message: 'Email not allowed' });
    }
    done(null, {
      id:      profile.id,
      email,
      name:    profile.displayName,
      picture: profile.photos?.[0]?.value || '',
    });
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect(`${BASE_PATH}/login.html`);
}

module.exports = { passport, requireAuth };
