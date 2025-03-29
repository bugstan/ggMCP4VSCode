const fs = require('fs');
const pkg = require('../package.json');

// Update versions
['README.md', 'README-zh.md', 'docs/INTERFACE.md'].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-\d+\.\d+\.\d+-blue\.svg\)\]/g, `[![Version](https://img.shields.io/badge/version-${pkg.version}-blue.svg)]`);
    fs.writeFileSync(file, content);
});
