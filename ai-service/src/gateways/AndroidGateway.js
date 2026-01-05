const { exec } = require('child_process');
const path = require('path');

// Helper to run shell commands
const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.warn(`ADB Warning: ${error.message}`);
                resolve(null); // Resolve null to not crash app, just fail logic
            } else {
                resolve(stdout.trim());
            }
        });
    });
};

class AndroidGateway {

    constructor() {
        // User specified custom path: D:/platform-tools/adb.exe
        // We use double backslashes for Windows path safety or forward slashes
        this.adbPath = 'D:/platform-tools/adb.exe';
    }

    async checkDevice() {
        const output = await runCommand(`${this.adbPath} devices`);
        if (output === null) {
            console.error("ADB command not found. Please install Android Platform Tools.");
            return false;
        }
        if (!output.includes('\tdevice')) {
            console.error("ADB found, but no device connected/authorized.");
            console.log("Output was:", output);
            return false;
        }
        return true;
    }

    async dial(phoneNumber) {
        if (!phoneNumber) throw new Error("Phone number required");

        // Sanitize
        const number = phoneNumber.replace(/[^\d+]/g, '');

        console.log(`[AndroidGateway] Dialing ${number}...`);

        // 1. Wake up screen
        await runCommand(`${this.adbPath} shell input keyevent KEYCODE_WAKEUP`);

        // 2. Send Call Intent
        // "tel:" URI triggers the dialer. 
        // Note: This opens the dialer and hits call. 
        // Some phones might require a second tap if 'CALL_PRIVILEGED' permission isn't granted to adb shell (usually is).
        await runCommand(`${this.adbPath} shell am start -a android.intent.action.CALL -d "tel:${number}"`);

        return true;
    }

    async hangup() {
        console.log(`[AndroidGateway] Hanging up...`);
        // KEYCODE_ENDCALL (6)
        await runCommand(`${this.adbPath} shell input keyevent 6`);
        return true;
    }
}

module.exports = new AndroidGateway();
