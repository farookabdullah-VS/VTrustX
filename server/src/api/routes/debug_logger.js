const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../../../../debug_api.log');

const log = (msg) => {
    const time = new Date().toISOString();
    fs.appendFileSync(logPath, `[${time}] ${msg}\n`);
};

module.exports = log;
