const fs = require('fs');
const path = require('path');
const express = require('express');

// Serves the built web app (web/dist) from the same origin as the API, so the
// frontend needs no server address, no CORS and no mixed content.
//
// Caching: Vite's hashed files under /assets never change, so they are cached
// for a year; everything else (index.html, the service worker, the manifest)
// must be revalidated on every load or a new release would never reach an
// installed PWA.
function mountWebApp(app, distDir) {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    console.warn(`[web] No hay build de la web en ${distDir}; solo se sirve la API.`);
    return;
  }

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders(res, filePath) {
        const rel = path.relative(distDir, filePath).split(path.sep).join('/');
        if (rel.startsWith('assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // SPA fallback: any other GET that wants HTML gets index.html and the
  // client router takes it from there. API and upload paths keep their own
  // JSON 404 instead of silently returning the app shell.
  app.get(/^(?!\/(api|uploads)(\/|$)|\/health$).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}

module.exports = { mountWebApp };
