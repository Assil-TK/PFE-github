const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const router = express.Router();

// Core transformation function
const replaceImageUsages = (content, username, repoUrl, branch, selectedFile) => {
  const repoPath = repoUrl.replace('https://github.com', '');
  const selectedDir = path.dirname(selectedFile).replace(/^\/+/, '');

  const adjustPath = (originalPath) => {
    let cleanPath = originalPath.replace(/^(\.\/|\/)/, '');
    if (originalPath.startsWith('/') && !originalPath.startsWith('./')) {
      cleanPath = `../${cleanPath}`;
    }
    return cleanPath;
  };

  // Replace import statements (images)
  content = content.replace(
    /import\s+(\w+)\s+from\s+['"](.+\.(png|jpg|jpeg|gif|svg))['"]/g,
    (match, varName, relPath) => {
      const cleanPath = adjustPath(relPath);
      const rawUrl = `https://raw.githubusercontent.com/${username}${repoPath}/${branch}/${selectedDir}/${cleanPath}`;
      return `const ${varName} = "${rawUrl}"`;
    }
  );

  // Replace JSX image src
  content = content.replace(
    /src\s*=\s*["'](\/?[a-zA-Z0-9\-_/\.]+)["']/g,
    (match, imgPath) => {
      const cleanPath = adjustPath(imgPath);
      const rawUrl = `https://raw.githubusercontent.com/${username}${repoPath}/${branch}/${selectedDir}/${cleanPath}`;
      return `src="${rawUrl}"`;
    }
  );

  // Replace component import paths
  content = content.replace(
    /import\s+((?:[\w*\s{},]+)?)\s+from\s+['"](?:\.\/|\.\.\/)*((?:.*?\/)?)(components|component)\/([^'"]+)['"]/g,
    (match, importVars, beforeComp, compWord, remainingPath) => {
      const newPath = `../importedcomponents/${remainingPath}`;
      return `import ${importVars.trim()} from "${newPath}"`;
    }
  );

  // Replace image property (object style)
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

// Handle file changes in importedcomponents
const processFileChange = (filePath, username, repoUrl, branch, selectedFile) => {
  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) return console.error('Error reading file:', err);

    const updatedContent = replaceImageUsages(content, username, repoUrl, branch, selectedFile);

    fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log(`Updated: ${path.basename(filePath)}`);
      }
    });
  });
};

// Start watching importedcomponents
const watchImportedComponents = (username, repoUrl, branch, selectedFile) => {
  const watchPath = path.join(__dirname, '../../PFE-frontend/src/importedcomponents');

  const watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignored: /(^|[\/\\])\../,
    ignoreInitial: true,
  });

  watcher.on('change', (filePath) => {
    processFileChange(filePath, username, repoUrl, branch, selectedFile);
  });

  watcher.on('add', (filePath) => {
    processFileChange(filePath, username, repoUrl, branch, selectedFile);
  });

  watcher.on('unlink', (filePath) => {
    console.log(`Deleted: ${path.basename(filePath)}`);
  });
};

// Route to handle file write
router.post('/write-file-content', (req, res) => {
  const { content, username, repoUrl, branch, selectedFile } = req.body;

  if (!content || !username || !repoUrl || !branch || !selectedFile) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const filePath = path.join(__dirname, '../../PFE-frontend/src/pages/filecontent.js');
  const transformed = replaceImageUsages(content, username, repoUrl, branch, selectedFile);
  const contentToSave = `// Auto-generated preview\nimport '../components/blockNavigation';\n${transformed}`;

  fs.writeFile(filePath, contentToSave, 'utf8', (err) => {
    if (err) {
      console.error('Write error:', err);
      return res.status(500).json({ message: 'Failed to write file' });
    }
    res.status(200).json({ message: 'File updated!' });
  });

  watchImportedComponents(username, repoUrl, branch, selectedFile);
});

module.exports = router;
