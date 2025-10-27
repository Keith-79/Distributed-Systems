// src/routes/bookings.js
const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const bookingModel = require('../models/booking.model');
const { hasOverlap, createBooking, listMyBookings, listBookingsForOwner, updateBookingStatus } = bookingModel;
const { pool } = require('../db');

const router = Router();

/**
 * POST /bookings
 * Traveler creates a booking request
 * body: { property_id, start_date: 'YYYY-MM-DD', end_date: 'YYYY-MM-DD', guests }
 */
router.post('/', requireAuth, requireRole('traveler'), async (req, res) => {
  try {
    let { property_id, start_date, end_date, guests = 1 } = req.body || {};
    property_id = Number(property_id);
    guests = Number(guests);
    if (!property_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'property_id, start_date, end_date are required' });
    }
    if (!Number.isInteger(guests) || guests < 1) {
      return res.status(400).json({ error: 'guests must be a positive integer' });
    }
    const sd = new Date(start_date);
    const ed = new Date(end_date);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime())) {
      return res.status(400).json({ error: 'Invalid date format (use YYYY-MM-DD)' });
    }
    if (sd >= ed) {
      return res.status(400).json({ error: 'start_date must be before end_date' });
    }

    // Validate property exists and not self-booking; capacity check
    const [props] = await pool.query(
      `SELECT id, owner_id, capacity, bedrooms FROM properties WHERE id = ? LIMIT 1`,
      [property_id]
    );
    const prop = props[0];
    if (!prop) return res.status(404).json({ error: 'Property not found' });
    if (prop.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Owners cannot book their own property' });
    }
    const bedrooms = Number(prop.bedrooms || 0);
    const hardMax = bedrooms > 0 ? bedrooms * 3 : 2;
    const logical = bedrooms <= 1 ? 2 : bedrooms * 2;
    const declared = Number(prop.capacity || 0);
    const effectiveCap = Math.min(Math.max(declared || logical, logical), hardMax);
    if (Number(guests) > effectiveCap) {
      return res.status(400).json({ error: 'Guest count exceeds property capacity' });
    }

    const overlap = await hasOverlap({ property_id, start_date, end_date });
    if (overlap) {
      return res.status(409).json({ error: 'Dates overlap with an existing booking' });
    }

    const booking = await createBooking({
      traveler_id: req.user.id,
      property_id,
      start_date,
      end_date,
      guests,
    });
    res.status(201).json({ booking });
  } catch (e) {
    console.error('create booking error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Availability check + accepted bookings for calendar
router.get('/check', async (req, res) => {
  try {
    let { property_id, start_date, end_date } = req.query || {};
    property_id = Number(property_id);
    if (!property_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'property_id, start_date, end_date are required' });
    }
    const sd = new Date(start_date);
    const ed = new Date(end_date);
    if (Number.isNaN(sd.getTime()) || Number.isNaN(ed.getTime()) || sd >= ed) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    const overlap = await hasOverlap({ property_id, start_date, end_date });
    res.json({ available: !overlap });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/property/:id', async (req, res) => {
  try {
    const propId = Number(req.params.id);
    if (!Number.isFinite(propId) || propId <= 0) return res.status(400).json({ error: 'Invalid property id' });
    const [rows] = await pool.query(
      `SELECT start_date, end_date FROM bookings WHERE property_id = ? AND status = 'ACCEPTED' ORDER BY start_date ASC`,
      [propId]
    );
    res.json({ bookings: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch property bookings' });
  }
});

/** GET /bookings/my — traveler’s own bookings */
router.get('/my', requireAuth, requireRole('traveler'), async (req, res) => {
  const rows = await listMyBookings(req.user.id);
  res.json({ bookings: rows });
});

/** GET /bookings/owner — owner sees bookings across their properties */
router.get('/owner', requireAuth, requireRole('owner'), async (req, res) => {
  const rows = await listBookingsForOwner(req.user.id);
  res.json({ bookings: rows });
});

/**
 * PATCH /bookings/:id/status
 * Owner sets status to ACCEPTED or CANCELLED
 * body: { status: 'ACCEPTED' | 'CANCELLED' }
 */
router.patch('/:id/status', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    if (!['ACCEPTED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'status must be ACCEPTED or CANCELLED' });
    }
    const updated = await updateBookingStatus({ booking_id: id, owner_id: req.user.id, status });
    if (!updated) return res.status(404).json({ error: 'Booking not found for this owner' });
    res.json({ booking: updated });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Internal server error' });
  }
});

module.exports = router;
