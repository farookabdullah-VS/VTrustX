const axios = require('axios');
const { query } = require('../infrastructure/database/db');

/**
 * Send SMS via Unifonic
 * @param {string} to - Recipient number (international format)
 * @param {string} body - Message content
 */
async function sendSMS(to, body) {
    try {
        // 1. Get Integration Config
        const res = await query("SELECT * FROM integrations WHERE provider LIKE '%Unifonic%' AND is_active = true LIMIT 1");

        if (res.rows.length === 0) {
            console.warn("Unifonic integration not found or inactive. Skipping SMS.");
            return { skipped: true, reason: "No config" };
        }

        const integration = res.rows[0];
        const appSid = integration.api_key; // Mapped to api_key column
        const senderID = integration.config?.sender_id; // Optional config

        if (!appSid) throw new Error("Unifonic AppSid (API Key) is missing.");

        // 2. Format Recipient (Remove +, 00, spaces)
        // Expected: 9665xxxxxxxx
        let recipient = to.replace(/[^0-9]/g, '');
        if (recipient.startsWith('00')) recipient = recipient.substring(2);

        // 3. Prepare Payload
        // Unifonic REST API: https://el.cloud.unifonic.com/rest/SMS/messages
        // AppSid usually passed as query param or body. We'll try body first for cleanliness, or query if strictly required.
        // User Note: "Required Parameter: AppSid (passed as query parameter)"

        const baseUrl = 'https://el.cloud.unifonic.com/rest/SMS/messages';
        const params = new URLSearchParams();
        params.append('AppSid', appSid); // Passed in body typically works for Unifonic, but let's append to URL if needed.
        params.append('Recipient', recipient);
        params.append('Body', body);
        if (senderID) params.append('SenderID', senderID);

        // Making the request
        // We'll put AppSid in URL to be safe based on docs, and rest in body
        const response = await axios.post(`${baseUrl}?AppSid=${appSid}`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`[SMSService] Sent to ${recipient}. Response:`, response.data);
        return response.data;

    } catch (error) {
        console.error("[SMSService] Failed:", error.response?.data || error.message);
        throw error; // Re-throw to handle in distribution loop
    }
}

module.exports = { sendSMS };
