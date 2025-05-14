const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/', (req, res) => {
  const filePath = path.join(__dirname, '../../PFE-frontend/src/pages/filecontent.js');
  const componentsFolder = path.join(__dirname, '../../PFE-frontend/src/importedcomponents');
  const emptyContent = `// Auto-cleared preview file`;

  // 1. Clear filecontent.js
  fs.writeFile(filePath, emptyContent, 'utf8', (err) => {
    if (err) {
      console.error('Error clearing filecontent.js:', err);
      return res.status(500).json({ message: 'Failed to reset file' });
    }
    console.log('filecontent.js cleared.');

    // 2. Delete all files and folders inside importedcomponents
    fs.readdir(componentsFolder, (err, items) => {
      if (err) {
        console.error('Error reading importedcomponents folder:', err);
        return res.status(500).json({ message: 'Failed to read folder' });
      }

      const deletePromises = items.map((item) => {
        const fullPath = path.join(componentsFolder, item);

        return fs.promises
          .stat(fullPath)
          .then((stats) => {
            if (stats.isDirectory()) {
              return fs.promises.rm(fullPath, { recursive: true, force: true });
            } else {
              return fs.promises.unlink(fullPath);
            }
          })
          .then(() => {
            console.log(`Deleted: ${item}`);
          })
          .catch((err) => {
            console.error(`Failed to delete ${item}:`, err);
          });
      });

      Promise.all(deletePromises)
        .then(() => {
          return res.status(200).json({ message: 'File cleared and importedcomponents folder emptied!' });
        })
        .catch((err) => {
          console.error('Error deleting items:', err);
          return res.status(500).json({ message: 'Some items could not be deleted' });
        });
    });
  });
});

module.exports = router;
