const express = require('express');
const router = express.Router();
const axios = require('axios');

router.delete('/delete-file', async (req, res) => {
  const { repo, path, message } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (!repo || !path || !message)
    return res.status(400).json({ error: 'repo, path and message are required' });

  try {
    const cleanedPath = path.startsWith('/') ? path.slice(1) : path;

    // Get file info to retrieve the SHA
    const fileInfo = await axios.get(
      `https://api.github.com/repos/${user.username}/${repo}/contents/${cleanedPath}`,
      {
        headers: {
          Authorization: `token ${user.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    const fileSha = fileInfo.data.sha;

    // Call DELETE on the GitHub API to delete the file
    const deleteResponse = await axios.delete(
      `https://api.github.com/repos/${user.username}/${repo}/contents/${cleanedPath}`,
      {
        headers: {
          Authorization: `token ${user.accessToken}`,
          Accept: 'application/vnd.github+json',
        },
        data: {
          message,
          sha: fileSha,
        },
      }
    );

    res.json({ success: true, data: deleteResponse.data });
  } catch (err) {
    console.error('Failed to delete file:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to delete file', details: err.response?.data || err.message });
  }
});

module.exports = router;
