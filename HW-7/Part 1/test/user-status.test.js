// test/user-status.test.js
require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const app = require('../../server');

// Helper to mint tokens without hitting DB/login
function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY || '1h'
  });
}

describe('GET /api/auth/protected/user-status', () => {
  it('should deny access with 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/protected/user-status');
    expect(res.status).to.equal(401);
    expect(res.body.message).to.match(/Bearer token required/i);
  });

  it('should deny access with 403 when role is not user/admin (e.g., guest)', async () => {
    const guestToken = sign({ username: 'gary', role: 'guest' });
    const res = await request(app)
      .get('/api/auth/protected/user-status')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(res.status).to.equal(403);
    expect(res.body.message).to.match(/user or admin required/i);
  });

  it('should allow access with a valid standard user token (200 OK)', async () => {
    const userToken = sign({ username: 'alice', role: 'user' });
    const res = await request(app)
      .get('/api/auth/protected/user-status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('user-status ok');
    expect(res.body.claims.role).to.equal('user');
  });

  it('should allow access with a valid admin token (200 OK)', async () => {
    const adminToken = sign({ username: 'bob', role: 'admin' });
    const res = await request(app)
      .get('/api/auth/protected/user-status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body.message).to.equal('user-status ok');
    expect(res.body.claims.role).to.equal('admin');
  });

  it('should 401 for malformed Authorization header', async () => {
  const res = await request(app)
    .get('/api/auth/protected/user-status')
    .set('Authorization', 'Bearer'); // missing token
  expect(res.status).to.equal(401);
});

it('should 403 for invalid/tampered token', async () => {
  const res = await request(app)
    .get('/api/auth/protected/user-status')
    .set('Authorization', 'Bearer not.a.real.jwt');
  expect(res.status).to.equal(403);
});

it('should 403 for expired token', async () => {
  const expired = jwt.sign({ username: 'x', role: 'user' }, process.env.JWT_SECRET, { expiresIn: -1 });
  const res = await request(app)
    .get('/api/auth/protected/user-status')
    .set('Authorization', `Bearer ${expired}`);
  expect(res.status).to.equal(403);
});

});
