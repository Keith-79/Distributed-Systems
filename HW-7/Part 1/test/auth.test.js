require('dotenv').config();
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, userToken, adminToken;

async function loginAs(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).to.equal(200);
  return res.body.token;
}

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  await User.deleteMany({});
  const salt = await bcrypt.genSalt(10);
  const uHash = await bcrypt.hash('alicepass', salt);
  const aHash = await bcrypt.hash('bobpass', salt);

  await User.create([
    { username: 'alice', password: uHash, role: 'user' },
    { username: 'bob',   password: aHash, role: 'admin' }
  ]);

  userToken = await loginAs('alice', 'alicepass');
  adminToken = await loginAs('bob',   'bobpass');
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('PROTECTED: /protected/admin-data', () => {
  it('denies STANDARD user (403)', async () => {
    const r = await request(app)
      .get('/api/auth/protected/admin-data')
      .set('Authorization', `Bearer ${userToken}`);
    expect(r.status).to.equal(403);
  });

  it('allows ADMIN (200)', async () => {
    const r = await request(app)
      .get('/api/auth/protected/admin-data')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).to.equal(200);
  });

  it('401 when no token', async () => {
    const r = await request(app).get('/api/auth/protected/admin-data');
    expect(r.status).to.equal(401);
  });
});

describe('REQUIRED NEW ROUTE: /protected/user-status', () => {
  it('allows STANDARD user (200)', async () => {
    const r = await request(app)
      .get('/api/auth/protected/user-status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(r.status).to.equal(200);
  });

  it('allows ADMIN (200)', async () => {
    const r = await request(app)
      .get('/api/auth/protected/user-status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).to.equal(200);
  });

  it('401 when no token', async () => {
    const r = await request(app).get('/api/auth/protected/user-status');
    expect(r.status).to.equal(401);
  });
});
