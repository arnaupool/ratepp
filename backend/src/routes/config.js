const express = require('express');
const config = require('../config');

const router = express.Router();

// Public (no auth): the login screen needs to know whether to offer sign-up
// before anyone is logged in, the map needs the tile template, and links
// shared with other people use the external address (PUBLIC_URL, or null).
router.get('/', (req, res) => {
  res.json({
    allowRegistration: config.allowRegistration,
    mapTileUrl: config.mapTileUrl,
    publicUrl: config.publicUrl,
  });
});

module.exports = router;
