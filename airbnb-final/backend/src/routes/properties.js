// backend/src/routes/properties.js
const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const propertyModel = require('../models/property.model'); // single import
const multer = require('multer');
const path = require('path');
const { pool } = require('../db');

const router = Router();

// One-time debug: confirm we see the functions
// eslint-disable-next-line no-console
console.log('[router sees model keys]', Object.keys(propertyModel));

/** Public: list/search */
router.get('/', async (req, res) => {
  try {
    const { q, city, country, min_price, max_price, type, sort, page, page_size, guests } = req.query;
    const viewer_id = req.user?.id || null;
    const rows = await propertyModel.listProperties({ city: city || q, country, min_price, max_price, type, guests, sort, page, page_size, viewer_id });
    const total = await propertyModel.countProperties({ city: city || q, country, min_price, max_price, type, guests });
    res.json({ properties: rows, total });
  } catch (err) {
    console.error('GET /properties error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

/** Owner-only: list my properties (place before :id) */
router.get('/me/mine', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const rows = await propertyModel.listMyProperties(req.user.id);
    res.json({ properties: rows });
  } catch (err) {
    console.error('GET /properties/me/mine error:', err);
    res.status(500).json({ error: 'Failed to fetch your properties' });
  }
});

/** Public: get by id */
router.get('/:id', async (req, res) => {
  try {
    const prop = await propertyModel.getProperty(req.params.id);
    if (!prop) return res.status(404).json({ error: 'Not found' });
    res.json({ property: prop });
  } catch (err) {
    console.error('GET /properties/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

/** Owner-only: create */
router.post('/', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const { name, type, location_city, country, price_per_night } = req.body || {};
    if (!name || !type || !location_city || !country || !price_per_night) {
      return res.status(400).json({ error: 'name, type, location_city, country, price_per_night required' });
    }
    const data = { ...req.body, owner_id: req.user.id };
    const prop = await propertyModel.createProperty(data);
    res.status(201).json({ property: prop });
  } catch (err) {
    console.error('POST /properties error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

/** Owner-only: update property */
router.patch('/:id', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid property id' });
    const prop = await propertyModel.updateProperty({ id, owner_id: req.user.id, data: req.body || {} });
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    res.json({ property: prop });
  } catch (err) {
    console.error('PATCH /properties/:id error:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

module.exports = router;

// --- Owner photo upload (store under backend/public/images/properties)
const uploadDir = path.join(__dirname, '..', '..', 'public', 'images', 'properties');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

router.post('/owner/:id/photos', requireAuth, requireRole('owner'), upload.single('photo'), async (req, res) => {
  try {
    const propId = Number(req.params.id);
    if (!Number.isFinite(propId) || propId <= 0) return res.status(400).json({ error: 'Invalid property id' });
    const rel = `/images/properties/${req.file.filename}`;
    await pool.query(`INSERT INTO property_photos (property_id, url, sort_order) VALUES (?,?,?)`, [propId, rel, 0]);
    res.json({ url: rel });
  } catch (e) {
    console.error('photo upload error', e);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Owner-only: toggle availability of a property they own
router.patch('/:id/availability', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { is_available } = req.body || {};
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid property id' });
    const val = Number(Boolean(is_available));
    const [result] = await pool.query(`UPDATE properties SET is_available = ? WHERE id = ? AND owner_id = ?`, [val, id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ ok: true, is_available: val });
  } catch (err) {
    console.error('PATCH /properties/:id/availability error:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

/** Owner-only: delete property */
router.delete('/:id', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid property id' });
    const ok = await propertyModel.deleteProperty({ id, owner_id: req.user.id });
    if (!ok) return res.status(404).json({ error: 'Property not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /properties/:id error:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});
