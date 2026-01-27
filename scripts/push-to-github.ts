import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  const repoName = 'D7-Team-Dashboard';
  
  console.log('Getting GitHub access token...');
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });
  
  console.log('Getting user info...');
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  let repoExists = false;
  try {
    await octokit.repos.get({ owner: user.login, repo: repoName });
    repoExists = true;
    console.log(`Repository ${repoName} already exists`);
  } catch (e: any) {
    if (e.status === 404) {
      console.log(`Creating repository ${repoName}...`);
      await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'D7 Team Financial Dashboard - Revenue, expenses, and payroll tracking',
        private: true,
        auto_init: false
      });
      console.log('Repository created!');
    } else {
      throw e;
    }
  }
  
  console.log('Configuring git...');
  execSync('git config user.email "dashboard@d7team.com"', { stdio: 'inherit' });
  execSync('git config user.name "D7 Dashboard"', { stdio: 'inherit' });
  
  const remoteUrl = `https://${accessToken}@github.com/${user.login}/${repoName}.git`;
  try {
    execSync('git remote remove github 2>/dev/null || true', { stdio: 'pipe' });
  } catch {}
  execSync(`git remote add github "${remoteUrl}"`, { stdio: 'inherit' });
  
  console.log('Pushing to GitHub...');
  execSync('git push -u github main --force', { stdio: 'inherit' });
  
  console.log(`\n✅ Success! Your project is now on GitHub:`);
  console.log(`https://github.com/${user.login}/${repoName}`);
}

main().catch(console.error);
