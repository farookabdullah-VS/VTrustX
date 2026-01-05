
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

const clientDir = path.join(__dirname, '../../client/src');
const files = walk(clientDir);
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Regex for both http and https, just in case
    const regex = /https?:\/\/localhost:3000\/api/g;

    if (content.match(regex)) {
        console.log(`Patching ${path.basename(file)}...`);
        content = content.replace(regex, '/api');
        fs.writeFileSync(file, content, 'utf8');
        count++;
    }
});

console.log(`Updated ${count} files.`);
