const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const downloadImageFromGitHub = async (repoOwner, repoName, filePath, token) => {
  const url = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${filePath}`;
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `token ${token}` },
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    throw new Error(`Failed to download image: ${filePath}`);
  }
};

router.post('/api/download-images', async (req, res) => {
  const { repo, path } = req.body;
  const { owner, name } = repo;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!owner || !name || !path) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const imageBuffer = await downloadImageFromGitHub(owner, name, path, token);
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir);
    }

    const filePath = path.join(downloadsDir, path.split('/').pop());
    fs.writeFileSync(filePath, imageBuffer);

    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
