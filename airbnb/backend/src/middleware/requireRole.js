// src/middleware/requireRole.js
module.exports = function requireRole(role) {
  return (req, res, next) => {
    const user =
      req.user ??
      req.session?.user ??
      (req.session?.userId ? { id: req.session.userId, role: req.session.role } : null);

    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role !== role) return res.status(403).json({ error: 'Forbidden' });

    // normalize for downstream
    req.user = user;
    next();
  };
};
