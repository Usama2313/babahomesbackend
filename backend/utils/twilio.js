const twilio = require('twilio');

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.warn('Twilio environment variables are missing. SMS functionality will be disabled.');
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send an SMS message using Twilio.
 * @param {string} to   The destination phone number in E.164 format (e.g., +1234567890).
 * @param {string} body The text content of the message.
 * @returns {Promise<string>} The Twilio message SID.
 */
const sendSMS = async (to, body) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials are not configured');
  }
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('SMS sent, SID:', message.sid);
    return message.sid;
  } catch (err) {
    console.error('Failed to send SMS via Twilio:', err);
    throw err;
  }
};

module.exports = { sendSMS };
