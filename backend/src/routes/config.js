const express = require('express');
const config = require('../config');

const router = express.Router();

// Public (no auth): the login screen needs to know whether to offer sign-up
// before anyone is logged in, and the map needs the tile template.
router.get('/', (req, res) => {
  res.json({
    allowRegistration: config.allowRegistration,
    mapTileUrl: config.mapTileUrl,
  });
});

module.exports = router;
