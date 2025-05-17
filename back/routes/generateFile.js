const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/api/generate-file', async (req, res) => {
  const { repo, path, name } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const fileType = path.includes('components') ? 'component' : 'page';
    const content = generateBoilerplate(name, fileType);
    const fileName = `${name}.js`;

    // Remove leading slash from path if present
    const cleanedPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = `${cleanedPath}/${fileName}`;

    const encodedContent = Buffer.from(content).toString('base64');

    const response = await axios.put(
      `https://api.github.com/repos/${user.username}/${repo}/contents/${fullPath}`,
      {
        message: `Add ${fileType} ${fileName}`,
        content: encodedContent,
      },
      {
        headers: {
          Authorization: `token ${user.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    res.json({ success: true, url: response.data.content?.html_url });
  } catch (err) {
    console.error('Failed to generate file:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate file' });
  }
});

function generateBoilerplate(name, type) {
  if (type === 'component') {
    return `import React from 'react';

const ${name} = () => {
  return (
    <div>
      ${name} Component
    </div>
  );
};

export default ${name};
`;
  } else {
    return `import React from 'react';

const ${name} = () => {
  return (
    <main>
      <h1>${name} Page</h1>
    </main>
  );
};

export default ${name};
`;
  }
}

module.exports = router;
