// backend/src/models/booking.model.js
const { pool } = require('../db');

/** Helper: read minimal property info for validations */
async function getPropertyBasics(property_id) {
  const [rows] = await pool.query(
    `SELECT id, owner_id, capacity FROM properties WHERE id = ? LIMIT 1`,
    [property_id]
  );
  return rows[0] || null;
}

/**
 * Returns true if any overlapping booking exists for a given property & date range.
 * Overlap logic: NOT (end_date <= new.start OR start_date >= new.end)
 */
async function hasOverlap({ property_id, start_date, end_date }) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM bookings
     WHERE property_id = ?
       AND status IN ('PENDING','ACCEPTED')
       AND NOT (end_date <= ? OR start_date >= ?)
     LIMIT 1`,
    [property_id, start_date, end_date]
  );
  return rows.length > 0;
}

async function createBooking({ traveler_id, property_id, start_date, end_date, guests }) {
  const [result] = await pool.query(
    `INSERT INTO bookings
     (traveler_id, property_id, start_date, end_date, guests, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [traveler_id, property_id, start_date, end_date, guests]
  );
  const [rows] = await pool.query(`SELECT * FROM bookings WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function listMyBookings(traveler_id) {
  const [rows] = await pool.query(
    `SELECT 
      b.*,
      p.name AS property_name,
      p.location_city AS city,
      p.country,
      p.price_per_night,
      (
        SELECT url
        FROM property_photos ph
        WHERE ph.property_id = p.id
        ORDER BY ph.sort_order ASC, ph.id ASC
        LIMIT 1
      ) AS thumbnailUrl
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.traveler_id = ?
    ORDER BY b.start_date DESC`,
    [traveler_id]
  );
  return rows;
}

/** For owners: see bookings across their properties */
async function listBookingsForOwner(owner_id) {
  const [rows] = await pool.query(
    `SELECT 
      b.*,
      p.name AS property_name,
      p.location_city AS city,
      p.country,
      u.name  AS traveler_name,
      u.email AS traveler_email,
      (
        SELECT url
        FROM property_photos ph
        WHERE ph.property_id = p.id
        ORDER BY ph.sort_order ASC, ph.id ASC
        LIMIT 1
      ) AS thumbnailUrl
    FROM bookings b
    JOIN properties p ON p.id = b.property_id
    JOIN users u ON u.id = b.traveler_id
    WHERE p.owner_id = ?
    ORDER BY b.start_date DESC`,
    [owner_id]
  );
  return rows;
}

/** Owner can update status (PENDING → ACCEPTED/CANCELLED) */
async function updateBookingStatus({ booking_id, owner_id, status }) {
  if (!['ACCEPTED', 'CANCELLED'].includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT b.id, b.status, b.property_id, b.start_date, b.end_date, p.owner_id
       FROM bookings b
       JOIN properties p ON p.id = b.property_id
       WHERE b.id = ?
       FOR UPDATE`,
      [booking_id]
    );
    if (!rows.length) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }
    const b = rows[0];
    if (b.owner_id !== owner_id) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    if (b.status === status) {
      await conn.commit();
      return b;
    }
    if (status === 'ACCEPTED') {
      if (b.status !== 'PENDING') {
        const err = new Error('Only PENDING bookings can be ACCEPTED');
        err.status = 409;
        throw err;
      }
      const [conflicts] = await conn.query(
        `SELECT 1
         FROM bookings
         WHERE property_id = ?
           AND id <> ?
           AND status = 'ACCEPTED'
           AND NOT (end_date <= ? OR start_date >= ?)
         LIMIT 1`,
        [b.property_id, booking_id, b.start_date, b.end_date]
      );
      if (conflicts.length) {
        const err = new Error('Cannot ACCEPT: dates conflict with another ACCEPTED booking');
        err.status = 409;
        throw err;
      }
    } else if (status === 'CANCELLED') {
      if (!['PENDING', 'ACCEPTED'].includes(b.status)) {
        const err = new Error('Only PENDING or ACCEPTED bookings can be CANCELLED');
        err.status = 409;
        throw err;
      }
    }
    await conn.query(`UPDATE bookings SET status = ? WHERE id = ?`, [status, booking_id]);
    const [after] = await conn.query(`SELECT * FROM bookings WHERE id = ?`, [booking_id]);
    await conn.commit();
    return after[0];
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  getPropertyBasics,
  hasOverlap,
  createBooking,
  listMyBookings,
  listBookingsForOwner,
  updateBookingStatus,
};
