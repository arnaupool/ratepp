// Express 4 does not forward rejected promises from async handlers to the
// error middleware; without this wrapper any thrown DB error (e.g. a
// malformed UUID in a route param) becomes an unhandled rejection that
// hangs the request and, on Node 15+, kills the process.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
