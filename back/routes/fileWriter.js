const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');  // Import chokidar
const router = express.Router();

// Core function to transform content
const replaceImageUsages = (content, username, repoUrl, branch, selectedFile) => {
  const repoPath = repoUrl.replace('https://github.com', '');
  const selectedDir = path.dirname(selectedFile).replace(/^\/+/, ''); // Remove leading slashes

  const adjustPath = (originalPath) => {
    let cleanPath = originalPath.replace(/^(\.\/|\/)/, '');
    if (originalPath.startsWith('/') && !originalPath.startsWith('./')) {
      cleanPath = `../${cleanPath}`;
    }
    return cleanPath;
  };

  // Step 1: Replace imports like import logo from '../assets/logo.png';
  content = content.replace(
    /import\s+(\w+)\s+from\s+['"](.+\.(png|jpg|jpeg|gif|svg))['"]/g,
    (match, varName, relPath) => {
      const cleanPath = adjustPath(relPath);
      const rawUrl = `https://raw.githubusercontent.com/${username}${repoPath}/${branch}/${selectedDir}/${cleanPath}`;
      return `const ${varName} = "${rawUrl}"`;
    }
  );

  // Step 2: Replace direct JSX image src attributes like: <img src="/assets/img.png" />
  content = content.replace(
    /src\s*=\s*["'](\/?[a-zA-Z0-9\-_/\.]+)["']/g,
    (match, imgPath) => {
      const cleanPath = adjustPath(imgPath);
      const rawUrl = `https://raw.githubusercontent.com/${username}${repoPath}/${branch}/${selectedDir}/${cleanPath}`;
      return `src="${rawUrl}"`;
    }
  );

  // Step 3: Replace 'components' or 'component' in import paths
  content = content.replace(
    /import\s+([^\s]+)\s+from\s+['"](?:\.\/|\.\.\/)*(.*?)(components|component)\/([^'"]+)['"]/g,
    (match, varName, basePath, compWord, remainingPath) => {
      const newPath = `../importedcomponents/${remainingPath}`;
      return `import ${varName} from "${newPath}"`;
    }
  );

  // Step 4: Replace object-style image paths like: image: "/assets/img.png"
  content = content.replace(
    /image\s*:\s*["'](\/?[a-zA-Z0-9\-_/\.]+)["']/g,
    (match, relPath) => {
      const cleanPath = adjustPath(relPath);
      const rawUrl = `https://raw.githubusercontent.com/${username}${repoPath}/${branch}/${selectedDir}/${cleanPath}`;
      return `image: "${rawUrl}"`;
    }
  );

  return content;
};

// Watch 'importedcomponents' folder for changes dynamically using chokidar
const watchImportedComponents = (username, repoUrl, branch, selectedFile) => {
  const importedComponentsPath = path.join(__dirname, '../../PFE-frontend/src/importedcomponents');

  // Initialize chokidar to watch the directory
  const watcher = chokidar.watch(importedComponentsPath, {
    persistent: true,
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    ignoreInitial: true, // Ignore initial add event
  });

  // Handle file changes
  watcher.on('change', (filePath) => {
    processFileChange(filePath, username, repoUrl, branch, selectedFile);
  });

  // Handle file additions
  watcher.on('add', (filePath) => {
    processFileChange(filePath, username, repoUrl, branch, selectedFile);
  });

  // Handle other events (add, unlink, etc.)
  watcher.on('unlink', (filePath) => {
    console.log(`File removed: ${path.basename(filePath)}`);
  });
};

// Function to process the file (read, transform, write)
const processFileChange = (filePath, username, repoUrl, branch, selectedFile) => {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    // Apply transformation with dynamic info
    const updatedContent = replaceImageUsages(content, username, repoUrl, branch, selectedFile);

    // Save the updated content back to the file
    fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log(`File ${path.basename(filePath)} updated successfully!`);
      }
    });
  });
};

// Route: POST /api/write-file-content
router.post('/write-file-content', (req, res) => {
  const { content, username, repoUrl, branch, selectedFile } = req.body;

  if (!content || !username || !repoUrl || !branch || !selectedFile) {
    return res.status(400).json({ message: 'Missing required fields: content, username, repoUrl, branch, or selectedFile.' });
  }

  const filePath = path.join(__dirname, '../../PFE-frontend/src/pages/filecontent.js');

  const transformedContent = replaceImageUsages(content, username, repoUrl, branch, selectedFile);
  const contentToSave = `// Auto-generated preview file\nimport '../components/blockNavigation';\n${transformedContent}`;

  fs.writeFile(filePath, contentToSave, 'utf8', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
      return res.status(500).json({ message: 'Failed to write file' });
    }
    res.status(200).json({ message: 'File updated successfully!' });
  });

  // Start watching the folder with the dynamic values from the request
  watchImportedComponents(username, repoUrl, branch, selectedFile);
});

module.exports = router;
