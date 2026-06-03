// backend/controllers/uploadMedia.js

const multer = require('multer');
const path = require('path');

// configure storage - store in uploads folder with original name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `media_${req.user.id}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Handler expects a multipart/form-data with field 'file'
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No media file provided' });
    }
    const mediaUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    return res.json({ url: mediaUrl });
  } catch (err) {
    console.error('Upload media error:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { upload: upload, uploadMedia };
