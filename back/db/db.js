require('dotenv').config(); // charger les variables d'environnement

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // utilise la variable d'env
});

// DEBUG : afficher la config de connexion (à retirer en prod)
console.log('DB connection config:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : '(empty)',
  database: process.env.DB_NAME,
});

async function getProject(owner, repoName) {
  const [rows] = await pool.execute(
    'SELECT * FROM github_vercel_projects WHERE github_owner = ? AND github_repo_name = ?',
    [owner, repoName]
  );
  return rows.length ? rows[0] : null;
}

async function insertProject(owner, repoName, vercelProjectId, deploymentUrl) {
  await pool.execute(
    `INSERT INTO github_vercel_projects (
      github_owner, github_repo_name, vercel_project_id, deployment_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [owner, repoName, vercelProjectId, deploymentUrl]
  );
}

async function updateDeploymentUrl(owner, repoName, deploymentUrl) {
  await pool.execute(
    `UPDATE github_vercel_projects
     SET deployment_url = ?, updated_at = NOW()
     WHERE github_owner = ? AND github_repo_name = ?`,
    [deploymentUrl, owner, repoName]
  );
}

module.exports = {
  getProject,
  insertProject,
  updateDeploymentUrl,
};
