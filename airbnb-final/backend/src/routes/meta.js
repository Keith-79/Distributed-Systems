const { Router } = require('express');
const r = Router();

// US-only for this project scope
const countries = [
  { code: 'US', name: 'United States' },
];
// Keep a compact, popular list and expose "name" only
const states = [
  { name: 'California' },
  { name: 'New York' },
  { name: 'Texas' },
  { name: 'Florida' },
  { name: 'Washington' },
  { name: 'Massachusetts' },
  { name: 'Illinois' },
  { name: 'Colorado' },
  { name: 'Georgia' },
  { name: 'Arizona' },
];
const amenities = [
  { key: 'wifi', label: 'Wi‑Fi' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'tv', label: 'TV' },
  { key: 'ac', label: 'Air conditioning' },
  { key: 'pool', label: 'Pool' },
  { key: 'pet_friendly', label: 'Pets allowed' },
];

r.get('/countries', (req, res)=> res.json({ countries }));
r.get('/us-states', (req, res)=> res.json({ states }));
r.get('/amenities', (req, res)=> res.json({ amenities }));

module.exports = r;


