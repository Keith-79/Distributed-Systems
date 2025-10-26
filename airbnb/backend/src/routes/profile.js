const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Router } = require('express');
const { getProfileByUserId, updateProfile } = require('../models/profile.model');
const requireAuth = require('../middleware/requireAuth');

const r = Router();

const uploadDir = path.join(__dirname, '..', '..', 'public', 'images', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

r.get('/me', requireAuth, async (req, res) => {
  const profile = await getProfileByUserId(req.user.id);
  res.json({ profile });
});

r.put('/me', requireAuth, async (req, res) => {
  const profile = await updateProfile(req.user.id, req.body || {});
  res.json({ profile });
});

r.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  const rel = `/images/avatars/${req.file.filename}`;
  const profile = await updateProfile(req.user.id, { avatar_url: rel });
  res.json({ profile });
});

r.delete('/avatar', requireAuth, async (req, res) => {
  const profile = await getProfileByUserId(req.user.id);
  if (profile?.avatar_url) {
    try { fs.unlinkSync(path.join(__dirname, '..', '..', 'public', profile.avatar_url.replace(/^\//,''))); } catch {}
  }
  const updated = await updateProfile(req.user.id, { avatar_url: null });
  res.json({ profile: updated });
});

module.exports = r;


