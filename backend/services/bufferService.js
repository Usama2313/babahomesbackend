const axios = require('axios');

const BUFFER_API_KEY = process.env.BUFFER_API_KEY; // Set in .env

/**
 * Post an update to Buffer.
 * @param {Object} param0
 * @param {string} param0.mediaUrl - URL of media (image/video).
 * @param {string} param0.caption - Text caption.
 * @param {Array<string>} param0.profileIds - Buffer profile IDs for target channels.
 */
async function postToBuffer({ mediaUrl, caption, profileIds }) {
  if (!BUFFER_API_KEY) {
    throw new Error('BUFFER_API_KEY is not configured');
  }
  const payload = {
    text: caption,
    media: { url: mediaUrl },
    profile_ids: profileIds,
  };
  const response = await axios.post('https://api.buffer.com/1/updates/create.json', payload, {
    headers: {
      Authorization: `Bearer ${BUFFER_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

module.exports = { postToBuffer };
