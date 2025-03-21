const fs = require('fs');
const path = require('path');

// 读取 package.json
const packageJson = require('./package.json');

// 读取 README.md
const readmePath = path.join(__dirname, 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

// 更新版本号（确保只替换一次）
const updatedReadme = readme.replace(/version-\d+\.\d+\.\d+-blue/, `version-${packageJson.version}-blue`);

// 写回 README.md
fs.writeFileSync(readmePath, updatedReadme);

console.log(`Updated README.md with version ${packageJson.version}`);