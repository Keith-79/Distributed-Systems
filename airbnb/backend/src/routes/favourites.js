// src/routes/favourites.js
const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { toggleFavourite, listMyFavourites, existsFavourite } = require('../models/favourite.model');

const router = Router();

/** POST /favourites/:propertyId/toggle  (traveler) */
router.post('/:propertyId/toggle', requireAuth, requireRole('traveler'), async (req, res, next) => {
  try {
    const propertyId = Number.parseInt(req.params.propertyId, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return res.status(400).json({ error: 'Invalid property id' });
    }
    const result = await toggleFavourite(req.user.id, propertyId);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    next(e);
  }
});

/** GET /favourites/my  (traveler) */
router.get('/my', requireAuth, requireRole('traveler'), async (req, res, next) => {
  try {
    const favs = await listMyFavourites(req.user.id);
    res.json({ favourites: favs });
  } catch (e) {
    next(e);
  }
});

router.get('/exists/:propertyId', requireAuth, requireRole('traveler'), async (req, res, next) => {
  try {
    const propertyId = Number.parseInt(req.params.propertyId, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) {
      return res.status(400).json({ error: 'Invalid property id' });
    }
    const isFav = await existsFavourite(req.user.id, propertyId);
    res.json({ isFavourited: isFav });
  } catch (e) { next(e); }
});

module.exports = router;
