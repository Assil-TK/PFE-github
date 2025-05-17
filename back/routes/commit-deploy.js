const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db/db');
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

router.post('/commit-deploy', async (req, res) => {
  console.log('Received commit-deploy request with body:', req.body);

  const {
    repo,
    username,
    framework: rawFramework,
    buildCommand,
    outputDirectory,
    rootDirectory = '.',
    branch = 'main',
    repoId
  } = req.body;

  // Normalize framework input
  const framework = rawFramework === 'react' ? 'create-react-app' : rawFramework;

  try {
    const project = await db.getProject(username, repo);
    let deploymentUrl;

    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    };

    if (project) {
      // Redeploy existing project
      const deployResponse = await axios.post(
        'https://api.vercel.com/v13/deployments',
        {
          name: repo,
          project: project.vercel_project_id,
          gitSource: {
            type: 'github',
            ref: branch,
            repoId
          }
        },
        { headers }
      );

      deploymentUrl = deployResponse.data.url;
      await db.updateDeploymentUrl(username, repo, deploymentUrl);
    } else {
      // Create project on Vercel linked to GitHub repo
      const createResponse = await axios.post(
        'https://api.vercel.com/v9/projects',
        {
          name: repo,
          framework,
          buildCommand,
          outputDirectory,
          rootDirectory,
          gitRepository: {
            type: 'github',
            repoId,
            repo,
            org: username
          }
        },
        { headers }
      );

      const newProjectId = createResponse.data.id;
      await db.insertProject(username, repo, newProjectId, null);

      // Deploy it
      const deployResponse = await axios.post(
        'https://api.vercel.com/v13/deployments',
        {
          name: repo,
          project: newProjectId,
          gitSource: {
            type: 'github',
            ref: branch,
            repoId
          }
        },
        { headers }
      );

      deploymentUrl = deployResponse.data.url;
      await db.updateDeploymentUrl(username, repo, deploymentUrl);
    }

    res.json({ url: deploymentUrl });
  } catch (error) {
    console.error('Deploy error:', {
      data: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message,
    });

    res.status(500).json({
      error: 'Deployment failed',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
