const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

(async () => {
  const filePath = 'test.txt';
  if (!fs.existsSync(filePath)) {
    console.log('Create test.txt');
    fs.writeFileSync(filePath, 'test file content');
  }
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  try {
    const res = await axios.post('http://localhost:5000/api/upload-media', form, {
      headers: form.getHeaders()
    });
    console.log('Upload response:', res.data);
  } catch (e) {
    console.error('Upload failed', e.response?.status, e.message);
  }
})();
