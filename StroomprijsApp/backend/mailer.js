const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || "avas.cloudemail.be",
  port:   parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 15000,
  greetingTimeout:   10000,
  socketTimeout:     20000,
});

async function sendMail({ from, to, subject, html, replyTo }) {
  return transporter.sendMail({ from, to, subject, html, replyTo });
}

module.exports = { sendMail, transporter };
