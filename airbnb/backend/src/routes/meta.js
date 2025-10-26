const { Router } = require('express');
const r = Router();

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'NL', name: 'Netherlands' },
];
const states = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  { code: 'WA', name: 'Washington' },
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


