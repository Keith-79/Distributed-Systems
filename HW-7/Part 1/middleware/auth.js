// middleware/auth.js
const jwt = require('jsonwebtoken');

function getBearer(req) {
  const h = req.headers['authorization'];
  if (!h) return null;
  const parts = h.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

module.exports = function verifyToken(req, res, next) {
  const token = getBearer(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Bearer token required.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach claims
    return next();
  } catch {
    return res.status(403).json({ message: 'Forbidden: Invalid or expired token.' });
  }
};
