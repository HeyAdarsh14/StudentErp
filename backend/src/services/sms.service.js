const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * SMS Service - Twilio Integration
 * Note: In development mode, this service simulates SMS sending
 * In production, configure Twilio credentials in .env file
 */

// Lazy load Twilio only if configured
let twilioClient = null;

const initTwilio = () => {
  if (twilioClient) return twilioClient;

  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(
        config.TWILIO_ACCOUNT_SID,
        config.TWILIO_AUTH_TOKEN
      );
      logger.info('Twilio client initialized');
    } catch (error) {
      logger.error('Failed to initialize Twilio:', error);
    }
  }

  return twilioClient;
};

/**
 * Send SMS
 * @param {string} to - Phone number with country code (e.g., +919876543210)
 * @param {string} message - SMS text (max 160 chars recommended)
 * @param {object} options - Additional options
 * @returns {Promise<object>} SMS result
 */
const sendSMS = async (to, message, options = {}) => {
  try {
    // Validate phone number format
    if (!to.startsWith('+')) {
      throw new Error('Phone number must include country code (e.g., +91...)');
    }

    // Validate message length
    if (message.length > 1600) {
      logger.warn(`SMS message truncated to 1600 characters`);
      message = message.substring(0, 1600);
    }

    const client = initTwilio();

    // If Twilio not configured, simulate in development
    if (!client || config.NODE_ENV === 'development') {
      logger.info('📱 [SMS SIMULATION]', {
        to,
        message: message.substring(0, 50) + '...',
        length: message.length,
      });

      return {
        success: true,
        sid: `SMS_SIM_${Date.now()}`,
        status: 'simulated',
        to,
        segments: Math.ceil(message.length / 160),
      };
    }

    // Send actual SMS via Twilio
    const result = await client.messages.create({
      body: message,
      from: config.TWILIO_PHONE_NUMBER,
      to,
      ...options,
    });

    logger.info('SMS sent successfully', {
      sid: result.sid,
      to: result.to,
      status: result.status,
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      dateCreated: result.dateCreated,
      price: result.price,
      priceUnit: result.priceUnit,
      segments: result.numSegments,
    };
  } catch (error) {
    logger.error('SMS sending failed:', error);

    return {
      success: false,
      error: error.message,
      to,
    };
  }
};

/**
 * Send bulk SMS
 * @param {Array} recipients - Array of {phone, message} objects
 * @returns {Promise<object>} Bulk SMS results
 */
const sendBulkSMS = async (recipients) => {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    results: [],
  };

  // Send in parallel with limit
  const promises = recipients.map(async (recipient) => {
    const result = await sendSMS(recipient.phone, recipient.message);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }
    results.results.push({
      phone: recipient.phone,
      ...result,
    });
    return result;
  });

  await Promise.all(promises);

  logger.info('Bulk SMS completed', {
    total: results.total,
    sent: results.sent,
    failed: results.failed,
  });

  return results;
};

/**
 * Get SMS balance (Twilio account balance)
 * @returns {Promise<object>} Account balance
 */
const getSMSBalance = async () => {
  try {
    const client = initTwilio();

    if (!client || config.NODE_ENV === 'development') {
      return {
        success: true,
        balance: 1000,
        currency: 'USD',
        simulated: true,
      };
    }

    const account = await client.api.v2010.accounts(config.TWILIO_ACCOUNT_SID).fetch();

    return {
      success: true,
      balance: parseFloat(account.balance),
      currency: account.currency,
      status: account.status,
    };
  } catch (error) {
    logger.error('Failed to fetch SMS balance:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get SMS usage statistics
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object>} Usage statistics
 */
const getSMSUsage = async (startDate, endDate) => {
  try {
    const client = initTwilio();

    if (!client || config.NODE_ENV === 'development') {
      return {
        success: true,
        messages: 42,
        cost: 21.0,
        simulated: true,
      };
    }

    const messages = await client.messages.list({
      dateSentAfter: startDate,
      dateSentBefore: endDate,
    });

    const totalCost = messages.reduce((sum, msg) => {
      return sum + (parseFloat(msg.price) || 0);
    }, 0);

    return {
      success: true,
      messages: messages.length,
      cost: Math.abs(totalCost),
      currency: messages[0]?.priceUnit || 'USD',
    };
  } catch (error) {
    logger.error('Failed to fetch SMS usage:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} Is valid
 */
const validatePhoneNumber = (phone) => {
  // Basic validation: must start with + and have 10-15 digits
  const phoneRegex = /^\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  getSMSBalance,
  getSMSUsage,
  validatePhoneNumber,
};
