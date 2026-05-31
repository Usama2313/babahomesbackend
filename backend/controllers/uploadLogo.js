// backend/controllers/uploadLogo.js

const multer = require('multer');
const path = require('path');
const User = require('../models/User');

// configure storage - store in uploads folder with original name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    // prepend user id and timestamp to avoid collisions
    const ext = path.extname(file.originalname);
    const filename = `logo_${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Handler expects a multipart/form-data with field 'logo'
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }
    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    await User.update({ logoUrl }, { where: { id: req.user.id } });
    return res.json({ message: 'Logo uploaded successfully', logoUrl });
  } catch (err) {
    console.error('Upload logo error:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { upload, uploadLogo };
