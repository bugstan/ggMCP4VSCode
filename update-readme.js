const fs = require('fs');
const path = require('path');

// Read package.json
const packageJson = require('./package.json');

// Read README.md
const readmePath = path.join(__dirname, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

// Update version number (ensure it's replaced only once)
const updatedReadme = readme.replace(/version-\d+\.\d+\.\d+-blue/, `version-${packageJson.version}-blue`);

// Write back to README.md
fs.writeFileSync(readmePath, updatedReadme);

console.log(`Updated README.md with version ${packageJson.version}`);