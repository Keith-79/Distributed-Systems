// src/middleware/attachUser.js
const { findUserById } = require('../models/user.model');

module.exports = async function attachUser(req, res, next) {
  try {
    if (req.session?.userId) {
      req.user = await findUserById(req.session.userId);
    }
    next();
  } catch (e) {
    next(e);
  }
};
