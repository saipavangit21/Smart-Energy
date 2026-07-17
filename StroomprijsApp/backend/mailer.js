const axios = require("axios");

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendMail({ from, to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  const { data } = await axios.post(
    "https://api.resend.com/emails",
    { from, to, subject, html, reply_to: replyTo },
    {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );
  return data;
}

module.exports = { sendMail };
