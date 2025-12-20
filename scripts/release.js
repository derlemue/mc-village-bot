const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const releaseType = args[0];

if (!['major', 'minor', 'patch'].includes(releaseType)) {
    console.error('Usage: node scripts/release.js <major|minor|patch>');
    process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const readmePath = path.join(rootDir, 'README.md');
const changelogPath = path.join(rootDir, 'changelog.md');

// 1. Update package.json
const packageJson = require(packageJsonPath);
const currentVersion = packageJson.version;
let [major, minor, patch] = currentVersion.split('.').map(Number);

if (releaseType === 'major') {
    major++;
    minor = 0;
    patch = 0;
} else if (releaseType === 'minor') {
    minor++;
    patch = 0;
} else {
    patch++;
}

const newVersion = `${major}.${minor}.${patch}`;
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated package.json to ${newVersion}`);

// 2. Update README.md (Badge)
let readmeContent = fs.readFileSync(readmePath, 'utf8');
// Replace Version Badge: ![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
const badgeRegex = /version-\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?-blue/g;
if (badgeRegex.test(readmeContent)) {
    readmeContent = readmeContent.replace(badgeRegex, `version-${newVersion}-blue`);
    fs.writeFileSync(readmePath, readmeContent);
    console.log('Updated README.md badge');
} else {
    console.warn('⚠️ Could not find version badge in README.md');
}

// Also update text reference if exists (optional, but good)
// "Version 2.0.0 bietet..."
const textRegex = /Version \d+\.\d+\.\d+ bietet/;
if (textRegex.test(readmeContent)) {
    readmeContent = readmeContent.replace(textRegex, `Version ${newVersion} bietet`);
    fs.writeFileSync(readmePath, readmeContent);
    console.log('Updated README.md text reference');
}


// 3. Update Changelog
const date = new Date().toISOString().split('T')[0];
let changelogContent = fs.readFileSync(changelogPath, 'utf8');
const newEntry = `
## [${newVersion}] - ${date}
- Automated release.
`;
// Insert after "All notable changes..." or header
const insertMarker = 'All notable changes to this project will be documented in this file.';
if (changelogContent.includes(insertMarker)) {
    changelogContent = changelogContent.replace(insertMarker, `${insertMarker}\n${newEntry}`);
    fs.writeFileSync(changelogPath, changelogContent);
    console.log('Updated changelog.md');
} else {
    // Fallback: prepend
    fs.writeFileSync(changelogPath, newEntry + changelogContent);
}

// 4. Git commands
try {
    console.log('Exec git add...');
    execSync('git add package.json README.md changelog.md', { cwd: rootDir });

    console.log('Exec git commit...');
    execSync(`git commit -m "chore: release ${newVersion}"`, { cwd: rootDir });

    console.log('Exec git tag...');
    execSync(`git tag v${newVersion}`, { cwd: rootDir });

    console.log('Exec git push...');
    // Push commits and tags
    execSync('git push && git push --tags', { cwd: rootDir });

    console.log(`✅ Successfully released version ${newVersion}`);
} catch (error) {
    console.error('❌ Failed to execute git commands:', error.message);
    process.exit(1);
}
