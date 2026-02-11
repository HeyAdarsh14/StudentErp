const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * WhatsApp Service - WhatsApp Business API Integration
 * Note: In development mode, this service simulates WhatsApp messages
 * In production, configure WhatsApp Business API credentials in .env file
 */

// Lazy load WhatsApp client only if configured
let whatsappClient = null;

const initWhatsApp = () => {
  if (whatsappClient) return whatsappClient;

  if (config.WHATSAPP_API_KEY && config.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      // Using Meta WhatsApp Business API or third-party like Twilio, GupShup
      // This is a placeholder - actual implementation depends on provider
      whatsappClient = {
        baseURL: config.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
        apiKey: config.WHATSAPP_API_KEY,
        phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID,
      };
      logger.info('WhatsApp client initialized');
    } catch (error) {
      logger.error('Failed to initialize WhatsApp:', error);
    }
  }

  return whatsappClient;
};

/**
 * Send WhatsApp text message
 * @param {string} to - Phone number with country code (e.g., 919876543210)
 * @param {string} message - Message text
 * @returns {Promise<object>} WhatsApp result
 */
const sendWhatsAppMessage = async (to, message) => {
  try {
    // Remove '+' from phone number for WhatsApp API
    const phone = to.replace('+', '');

    const client = initWhatsApp();

    // If WhatsApp not configured, simulate in development
    if (!client || config.NODE_ENV === 'development') {
      logger.info('💬 [WHATSAPP SIMULATION]', {
        to: phone,
        message: message.substring(0, 50) + '...',
        length: message.length,
      });

      return {
        success: true,
        messageId: `WA_SIM_${Date.now()}`,
        status: 'simulated',
        to: phone,
      };
    }

    // Send actual WhatsApp message via Meta API
    const axios = require('axios');
    const response = await axios.post(
      `${client.baseURL}/${client.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp message sent successfully', {
      messageId: response.data.messages[0].id,
      to: phone,
    });

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: 'sent',
      to: phone,
    };
  } catch (error) {
    logger.error('WhatsApp message sending failed:', error);

    return {
      success: false,
      error: error.message,
      to,
    };
  }
};

/**
 * Send WhatsApp template message
 * @param {string} to - Phone number
 * @param {string} templateName - Template name registered with WhatsApp
 * @param {object} variables - Template variables
 * @returns {Promise<object>} WhatsApp result
 */
const sendWhatsAppTemplate = async (to, templateName, variables = {}) => {
  try {
    const phone = to.replace('+', '');
    const client = initWhatsApp();

    if (!client || config.NODE_ENV === 'development') {
      logger.info('💬 [WHATSAPP TEMPLATE SIMULATION]', {
        to: phone,
        template: templateName,
        variables,
      });

      return {
        success: true,
        messageId: `WA_TPL_SIM_${Date.now()}`,
        status: 'simulated',
        to: phone,
        template: templateName,
      };
    }

    // Convert variables object to WhatsApp components format
    const components = [];
    if (Object.keys(variables).length > 0) {
      components.push({
        type: 'body',
        parameters: Object.values(variables).map((value) => ({
          type: 'text',
          text: String(value),
        })),
      });
    }

    const axios = require('axios');
    const response = await axios.post(
      `${client.baseURL}/${client.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en',
          },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp template sent successfully', {
      messageId: response.data.messages[0].id,
      to: phone,
      template: templateName,
    });

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: 'sent',
      to: phone,
      template: templateName,
    };
  } catch (error) {
    logger.error('WhatsApp template sending failed:', error);

    return {
      success: false,
      error: error.message,
      to,
    };
  }
};

/**
 * Send WhatsApp media message
 * @param {string} to - Phone number
 * @param {string} mediaType - 'image', 'video', 'document', 'audio'
 * @param {string} mediaUrl - URL of the media file
 * @param {string} caption - Optional caption
 * @returns {Promise<object>} WhatsApp result
 */
const sendWhatsAppMedia = async (to, mediaType, mediaUrl, caption = '') => {
  try {
    const phone = to.replace('+', '');
    const client = initWhatsApp();

    if (!client || config.NODE_ENV === 'development') {
      logger.info('💬 [WHATSAPP MEDIA SIMULATION]', {
        to: phone,
        mediaType,
        mediaUrl,
        caption,
      });

      return {
        success: true,
        messageId: `WA_MEDIA_SIM_${Date.now()}`,
        status: 'simulated',
        to: phone,
        mediaType,
      };
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to: phone,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
      },
    };

    if (caption && ['image', 'video', 'document'].includes(mediaType)) {
      messageData[mediaType].caption = caption;
    }

    const axios = require('axios');
    const response = await axios.post(
      `${client.baseURL}/${client.phoneNumberId}/messages`,
      messageData,
      {
        headers: {
          Authorization: `Bearer ${client.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('WhatsApp media sent successfully', {
      messageId: response.data.messages[0].id,
      to: phone,
      mediaType,
    });

    return {
      success: true,
      messageId: response.data.messages[0].id,
      status: 'sent',
      to: phone,
      mediaType,
    };
  } catch (error) {
    logger.error('WhatsApp media sending failed:', error);

    return {
      success: false,
      error: error.message,
      to,
    };
  }
};

/**
 * Send bulk WhatsApp messages
 * @param {Array} recipients - Array of {phone, message} objects
 * @returns {Promise<object>} Bulk WhatsApp results
 */
const sendBulkWhatsApp = async (recipients) => {
  const results = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    results: [],
  };

  // Send with rate limiting (20 messages per second for WhatsApp)
  const batchSize = 20;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(async (recipient) => {
      const result = await sendWhatsAppMessage(
        recipient.phone,
        recipient.message
      );
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

    // Wait 1 second between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info('Bulk WhatsApp completed', {
    total: results.total,
    sent: results.sent,
    failed: results.failed,
  });

  return results;
};

/**
 * Check WhatsApp opt-in status
 * @param {string} phone - Phone number
 * @returns {Promise<boolean>} Opt-in status
 */
const checkOptInStatus = async (phone) => {
  // In real implementation, check against opt-in database
  // For now, return true in simulation
  if (config.NODE_ENV === 'development') {
    return true;
  }

  // Implement actual opt-in check logic
  return true;
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  sendWhatsAppMedia,
  sendBulkWhatsApp,
  checkOptInStatus,
};
