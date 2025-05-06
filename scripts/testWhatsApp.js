require('dotenv').config();
const { sendWhatsAppMessage } = require('../utils/twilioService');

// Get phone number from command line argument, or use default
const phoneNumber =  '+923074676797';

// Message to send
const message = `
This is a test message from the Complaint Management System.
If you're seeing this, WhatsApp integration is working correctly!

Time sent: ${new Date().toLocaleString()}
`;

// Send the message
console.log(`Sending test message to ${phoneNumber}...`);
sendWhatsAppMessage(phoneNumber, message)
  .then(result => {
    console.log('Message :', result);
    if (result) {
      console.log('Message sent successfully!');
    } else {
      console.log('Message not sent. Check your Twilio configuration.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });