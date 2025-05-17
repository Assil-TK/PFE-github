const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/api/save-imported-components', async (req, res) => {
  const { files } = req.body;

  console.log('Received files:', files);

  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'Expected an array of files.' });
  }

  const baseFolder = path.join(__dirname, '../../PFE-frontend/src/importedcomponents');

  try {
    for (const file of files) {
      const { filename, content } = file;

      if (!filename || typeof content !== 'string') {
        console.warn(`Skipping invalid file: ${filename}`);
        continue;
      }

      const relativePath = path.basename(filename);
      const fullPath = path.join(baseFolder, relativePath);

      fs.mkdirSync(baseFolder, { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf-8');

      console.log(`Saved: ${fullPath}`);
    }

    res.status(200).json({ message: 'All components saved!' });
  } catch (err) {
    console.error('Error writing files:', err);
    res.status(500).json({ error: 'Failed to write files' });
  }
});

module.exports = router;
