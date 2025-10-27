module.exports = function requireRole(allowed = []) {
  const set = new Set(Array.isArray(allowed) ? allowed : [allowed]);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !set.has(role)) {
      return res.status(403).json({ message: 'forbidden' });
    }
    next();
  };
};
