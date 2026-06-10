/**
 * SMS Service Utility
 * Supports: Twilio, AWS SNS, Fast2SMS
 */

// Check which SMS service is configured
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_SERVICE = process.env.SMS_SERVICE || 'twilio'; // twilio, aws, fast2sms

/**
 * Send SMS using configured service
 * @param {string} phone - Phone number with country code (e.g., +919876543210)
 * @param {string} message - SMS message to send
 * @returns {Promise<Object>} - Result object with success status
 */
async function sendSMS(phone, message) {
  if (!SMS_ENABLED) {
    console.log('📱 SMS disabled - logging to console only');
    console.log(`Phone: ${phone}`);
    console.log(`Message: ${message}`);
    return {
      success: true,
      method: 'console',
      message: 'SMS logged to console (SMS service not enabled)'
    };
  }

  try {
    switch (SMS_SERVICE.toLowerCase()) {
      case 'twilio':
        return await sendViaTwilio(phone, message);
      
      case 'aws':
      case 'sns':
        return await sendViaAWS(phone, message);
      
      case 'fast2sms':
        return await sendViaFast2SMS(phone, message);
      
      default:
        throw new Error(`Unknown SMS service: ${SMS_SERVICE}`);
    }
  } catch (error) {
    console.error('❌ SMS sending failed:', error.message);
    
    // Fallback to console logging
    console.log('📱 Fallback - logging to console:');
    console.log(`Phone: ${phone}`);
    console.log(`Message: ${message}`);
    
    return {
      success: false,
      method: 'console-fallback',
      error: error.message,
      message: 'SMS failed - logged to console'
    };
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(phone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured in .env file');
  }

  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  console.log(`📱 Sending SMS via Twilio to ${phone}...`);

  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to: phone
  });

  console.log(`✅ SMS sent via Twilio - SID: ${result.sid}`);

  return {
    success: true,
    method: 'twilio',
    messageId: result.sid,
    status: result.status,
    message: 'SMS sent successfully via Twilio'
  };
}

/**
 * Send SMS via AWS SNS
 */
async function sendViaAWS(phone, message) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-1';

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured in .env file');
  }

  const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
  
  const client = new SNSClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  console.log(`📱 Sending SMS via AWS SNS to ${phone}...`);

  const params = {
    Message: message,
    PhoneNumber: phone,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  };

  const command = new PublishCommand(params);
  const result = await client.send(command);

  console.log(`✅ SMS sent via AWS SNS - MessageId: ${result.MessageId}`);

  return {
    success: true,
    method: 'aws-sns',
    messageId: result.MessageId,
    message: 'SMS sent successfully via AWS SNS'
  };
}

/**
 * Send SMS via Fast2SMS (India only)
 */
async function sendViaFast2SMS(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error('Fast2SMS API key not configured in .env file');
  }

  const axios = require('axios');

  // Remove country code for Fast2SMS (India only)
  const phoneNumber = phone.replace(/^\+91/, '');

  console.log(`📱 Sending SMS via Fast2SMS to ${phoneNumber}...`);

  const response = await axios.post(
    'https://www.fast2sms.com/dev/bulkV2',
    {
      route: 'v3',
      sender_id: 'TXTIND',
      message: message,
      language: 'english',
      flash: 0,
      numbers: phoneNumber
    },
    {
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (response.data.return === false) {
    throw new Error(response.data.message || 'Fast2SMS API error');
  }

  console.log(`✅ SMS sent via Fast2SMS - Request ID: ${response.data.request_id}`);

  return {
    success: true,
    method: 'fast2sms',
    messageId: response.data.request_id,
    message: 'SMS sent successfully via Fast2SMS'
  };
}

/**
 * Send OTP SMS
 * @param {string} phone - Phone number with country code
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Result object
 */
async function sendOTP(phone, otp) {
  const message = `Your OTP for SVAD Restaurant is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
  return await sendSMS(phone, message);
}

/**
 * Check if SMS service is configured
 * @returns {Object} - Configuration status
 */
function getSMSStatus() {
  return {
    enabled: SMS_ENABLED,
    service: SMS_SERVICE,
    configured: checkConfiguration()
  };
}

/**
 * Check if SMS service credentials are configured
 * @returns {boolean}
 */
function checkConfiguration() {
  if (!SMS_ENABLED) return false;

  switch (SMS_SERVICE.toLowerCase()) {
    case 'twilio':
      return !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );
    
    case 'aws':
    case 'sns':
      return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
      );
    
    case 'fast2sms':
      return !!process.env.FAST2SMS_API_KEY;
    
    default:
      return false;
  }
}

module.exports = {
  sendSMS,
  sendOTP,
  getSMSStatus,
  checkConfiguration
};
