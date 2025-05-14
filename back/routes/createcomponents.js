const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// POST route to save imported components
router.post('/api/save-imported-components', async (req, res) => {
  const { files } = req.body;

  // Log the received request body for debugging
  console.log('Received files:', files);

  // Check if the request body contains an array of files
  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'Invalid format. Expected array of files.' });
  }

  // Define the base folder where components will be saved
  const baseFolder = path.join(__dirname, '../../PFE-frontend/src/importedcomponents');

  try {
    // Iterate over the received files
    for (const file of files) {
        const { filename, content } = file;
      
        if (!filename || typeof content !== 'string') {
          console.warn(`Skipping invalid file: ${filename}`);
          continue;
        }
      
        // Only keep the base name of the file (e.g., HeroSection.jsx)
        const relativePath = path.basename(filename);
        const fullPath = path.join(baseFolder, relativePath);
      
        // Make sure the folder exists
        fs.mkdirSync(baseFolder, { recursive: true });
      
        // Save the file
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Saved component: ${fullPath}`);
      }
      

    // Send success response once all files are written
    res.status(200).json({ message: 'All components saved in src/importedcomponents!' });
  } catch (err) {
    // Catch and log any errors during file writing
    console.error('Error writing files:', err);
    res.status(500).json({ error: 'Failed to write files' });
  }
});

module.exports = router;