'use strict';
const express  = require('express');
const passport = require('passport');
const router   = express.Router();

const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${BASE_PATH}/login.html?error=denied` }),
  (req, res) => res.redirect(BASE_PATH || '/')
);

router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect(`${BASE_PATH}/login.html`));
  });
});

router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const { email, name, picture } = req.user;
  res.json({ email, name, picture });
});

module.exports = router;
