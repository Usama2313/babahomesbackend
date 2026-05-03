
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('Testing SMTP with:', process.env.SMTP_USER);
    console.log('Host:', process.env.SMTP_HOST);
    console.log('Port:', process.env.SMTP_PORT);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.verify();
        console.log('Transporter is ready');

        const info = await transporter.sendMail({
            from: `"Baba Homs Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER,
            subject: "SMTP Test",
            text: "Hello, if you receive this, SMTP is working!",
            html: "<b>Hello, if you receive this, SMTP is working!</b>"
        });

        console.log('Message sent: %s', info.messageId);
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

testEmail();
