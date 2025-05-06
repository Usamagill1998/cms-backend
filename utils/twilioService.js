const twilio = require('twilio');

// Load Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Create Twilio client instance
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Format a Pakistani phone number to international format
 * @param {string} phoneNumber - Phone number (e.g., 03074676797)
 * @returns {string} - Formatted number with international code (e.g., +923074676797)
 */
const formatPakistanNumber = (phoneNumber) => {
  // Remove any non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // If number starts with 0, remove it and add +92
  if (cleanNumber.startsWith('0')) {
    return `+92${cleanNumber.substring(1)}`;
  }
  
  // If it starts with 92, add +
  if (cleanNumber.startsWith('92')) {
    return `+${cleanNumber}`;
  }
  
  // Otherwise, assume it's a local number and add +92
  return `+92${cleanNumber}`;
};

/**
 * Send WhatsApp message using Twilio
 * @param {string} phoneNumber - Recipient's phone number in any format
 * @param {string} message - Message to send (used as fallback)
 * @param {object} contentVars - Dynamic content variables for template
 * @returns {Promise} - Promise with the sent message or null
 */
const sendWhatsAppMessage = async (phoneNumber, message, contentVars = {}) => {
  // Return early if Twilio is not configured
  if (!client || !twilioWhatsAppNumber) {
    console.log('Twilio not configured. Would have sent:');
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`Content variables:`, contentVars);
    return null;
  }
  
  try {
    // Format the phone number to international format
    const formattedNumber = formatPakistanNumber(phoneNumber);
    
    // Send the WhatsApp message
    const result = await client.messages.create({
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${formattedNumber}`,
      contentSid: 'HXa64c72c81ab66aa478e37f41b3a1e688',
      contentVariables: JSON.stringify(contentVars)
    });
    
    console.log('WhatsApp message sent successfully', result);
    console.log(`WhatsApp message sent to ${formattedNumber}, SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return null;
  }
};


/**
 * Send WhatsApp message to new user with credentials
 * @param {string} phoneNumber - Recipient's phone number in any format
 * @param {string} name - User's name
 * @param {string} departmentName - Department name
 * @param {string} email - User's email
 * @param {string} password - Temporary password
 * @param {string} role - User role (staff or hod)
 * @returns {Promise} - Promise with the sent message or null
 */
const sendUserCredentialsMessage = async (phoneNumber, name, departmentName, email, password, role) => {
  // Return early if Twilio is not configured
  if (!client || !twilioWhatsAppNumber) {
    console.log('Twilio not configured. Would have sent user credentials:');
    console.log(`To: ${phoneNumber}, Name: ${name}, Email: ${email}, Role: ${role}`);
    return null;
  }
  
  try {
    // Format the phone number to international format
    const formattedNumber = formatPakistanNumber(phoneNumber);
    
    // Get URLs from environment variables for flexibility
    const webAppUrl = process.env.WEBAPP_URL || 'https://complaints.jiswl.com';
    const mobileAppUrl = process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.jiswl.complaints';
    const supportPhone = process.env.SUPPORT_PHONE || '+92300XXXXXXX';
    
    const supportInfo = `${supportPhone}. For  assistance, please call this number . To access our system: 1) Web portal: ${webAppUrl} (works best in Chrome/Firefox) 2) Mobile app: Download from ${mobileAppUrl} (Android users).`;

    // Create content variables for the approved template
    const contentVars = {
      '1': name,                  // User name
      '2': departmentName,        // Department name
      '3': email,                 // Account ID (email)
      '4': password,              // Access Code (password)
      '5': supportInfo           // Support phone number
    };
    
    // Message text (as fallback or for debugging)
    const message = `
Assalam O Alikum ${name},
Welcome to the Public Aid Committee of Jamaat e Islami Lahore. You have been added as a team member to the ${departmentName} department.
Your access information is as follows:
Account ID: ${email}
Access Code: ${password}
For assistance with login, please contact our support team at ${supportPhone}.

Web app: ${webAppUrl}
Mobile app: ${mobileAppUrl}
`;
    
    // Use the approved template SID
    const contentSid = process.env.TWILIO_APPROVED_TEMPLATE_SID || 'HX1fa7b8c04185259ce7b1e004506e6ed3'; // Replace with your actual approved template SID
    
    // Send the WhatsApp message using the approved template
    const result = await client.messages.create({
      from: `whatsapp:${twilioWhatsAppNumber}`,
      to: `whatsapp:${formattedNumber}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVars)
    });
    
    console.log('User credentials WhatsApp message sent successfully', result);
    console.log(`WhatsApp message sent to ${formattedNumber}, SID: ${result.sid}`);
    
    // Optional: Send a second message with the URLs (if needed)
    // if (process.env.SEND_URL_MESSAGE === 'true') {
      try {
        // This can be a regular message (not a template) with just the URLs
        const urlMessage = `Here are our application links:\n\nWeb: ${webAppUrl}\nMobile app: ${mobileAppUrl}`;
        
        const urlResult = await client.messages.create({
          from: `whatsapp:${twilioWhatsAppNumber}`,
          to: `whatsapp:${formattedNumber}`,
          body: urlMessage
        });
        
        console.log('URL WhatsApp message sent successfully', urlResult.sid);
      } catch (urlError) {
        console.error('Error sending URL message:', urlError);
      }
    // }
    
    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Optional: Try SMS fallback if WhatsApp fails
    if (process.env.USE_SMS_FALLBACK === 'true') {
      try {
        const formattedNumber = formatPakistanNumber(phoneNumber);
        const webAppUrl = process.env.WEBAPP_URL || 'https://complaints.jiswl.com';
        const mobileAppUrl = process.env.MOBILE_APP_URL || 'https://play.google.com/store/apps/details?id=com.jiswl.complaints';
        const supportPhone = process.env.SUPPORT_PHONE || '+92300XXXXXXX';
        
        const smsMessage = `
Assalam O Alikum ${name},
Welcome to the Public Aid Committee of Jamaat e Islami Lahore. You have been added as a team member to the ${departmentName} department.
Your access information is as follows:
Account ID: ${email}
Access Code: ${password}
For assistance with login, please contact our support team at ${supportPhone}.

Web app: ${webAppUrl}
Mobile app: ${mobileAppUrl}
`;

        const smsResult = await client.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER || twilioWhatsAppNumber.replace('whatsapp:', ''),
          to: formattedNumber,
          body: smsMessage
        });
        
        console.log('Fallback SMS sent successfully', smsResult.sid);
        return smsResult;
      } catch (smsError) {
        console.error('Error sending fallback SMS:', smsError);
        return null;
      }
    }
    
    return null;
  }
};






module.exports = {
  sendWhatsAppMessage,
  formatPakistanNumber,
  sendUserCredentialsMessage
};