const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Push Notification Service - Firebase Cloud Messaging (FCM) Integration
 * Note: In development mode, this service simulates push notifications
 * In production, configure Firebase credentials in .env file
 */

// Lazy load Firebase Admin SDK only if configured
let firebaseAdmin = null;

const initFirebase = () => {
  if (firebaseAdmin) return firebaseAdmin;

  if (config.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const admin = require('firebase-admin');

      // Parse service account JSON from environment variable
      const serviceAccount = JSON.parse(config.FIREBASE_SERVICE_ACCOUNT);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      firebaseAdmin = admin;
      logger.info('Firebase Admin SDK initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  return firebaseAdmin;
};

/**
 * Send push notification to a single device
 * @param {string} token - Device FCM token
 * @param {object} payload - Notification payload
 * @returns {Promise<object>} Push notification result
 */
const sendPushNotification = async (token, payload) => {
  try {
    const { title, body, data = {}, icon, clickAction } = payload;

    const admin = initFirebase();

    // If Firebase not configured, simulate in development
    if (!admin || config.NODE_ENV === 'development') {
      logger.info('🔔 [PUSH NOTIFICATION SIMULATION]', {
        token: token.substring(0, 20) + '...',
        title,
        body: body.substring(0, 50) + '...',
      });

      return {
        success: true,
        messageId: `PUSH_SIM_${Date.now()}`,
        status: 'simulated',
      };
    }

    // Build FCM message
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: clickAction || '',
      },
      webpush: icon
        ? {
            notification: {
              icon,
            },
          }
        : undefined,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send via FCM
    const response = await admin.messaging().send(message);

    logger.info('Push notification sent successfully', {
      messageId: response,
      title,
    });

    return {
      success: true,
      messageId: response,
      status: 'sent',
    };
  } catch (error) {
    logger.error('Push notification sending failed:', error);

    // Check if token is invalid
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      return {
        success: false,
        error: 'Invalid or expired token',
        invalidToken: true,
        token,
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} tokens - Array of device FCM tokens
 * @param {object} payload - Notification payload
 * @returns {Promise<object>} Multicast result
 */
const sendMulticastPushNotification = async (tokens, payload) => {
  try {
    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
      };
    }

    const { title, body, data = {}, icon, clickAction } = payload;

    const admin = initFirebase();

    // If Firebase not configured, simulate in development
    if (!admin || config.NODE_ENV === 'development') {
      logger.info('🔔 [MULTICAST PUSH SIMULATION]', {
        tokenCount: tokens.length,
        title,
        body: body.substring(0, 50) + '...',
      });

      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
        status: 'simulated',
      };
    }

    // Build FCM multicast message
    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: clickAction || '',
      },
      webpush: icon
        ? {
            notification: {
              icon,
            },
          }
        : undefined,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send multicast via FCM (max 500 tokens per batch)
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const batchMessage = { ...message, tokens: batch };

      const response = await admin.messaging().sendEachForMulticast(batchMessage);

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // Collect invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (
            !resp.success &&
            (resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered')
          ) {
            invalidTokens.push(batch[idx]);
          }
        });
      }
    }

    logger.info('Multicast push notification sent', {
      total: tokens.length,
      success: totalSuccess,
      failure: totalFailure,
      invalidTokens: invalidTokens.length,
    });

    return {
      success: true,
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokens,
    };
  } catch (error) {
    logger.error('Multicast push notification failed:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send push notification to a topic
 * @param {string} topic - Topic name
 * @param {object} payload - Notification payload
 * @returns {Promise<object>} Topic message result
 */
const sendTopicPushNotification = async (topic, payload) => {
  try {
    const { title, body, data = {}, icon, clickAction } = payload;

    const admin = initFirebase();

    if (!admin || config.NODE_ENV === 'development') {
      logger.info('🔔 [TOPIC PUSH SIMULATION]', {
        topic,
        title,
        body: body.substring(0, 50) + '...',
      });

      return {
        success: true,
        messageId: `TOPIC_PUSH_SIM_${Date.now()}`,
        status: 'simulated',
        topic,
      };
    }

    const message = {
      topic,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: clickAction || '',
      },
      webpush: icon
        ? {
            notification: {
              icon,
            },
          }
        : undefined,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);

    logger.info('Topic push notification sent successfully', {
      messageId: response,
      topic,
      title,
    });

    return {
      success: true,
      messageId: response,
      status: 'sent',
      topic,
    };
  } catch (error) {
    logger.error('Topic push notification sending failed:', error);

    return {
      success: false,
      error: error.message,
      topic,
    };
  }
};

/**
 * Subscribe device tokens to a topic
 * @param {Array<string>} tokens - Device tokens
 * @param {string} topic - Topic name
 * @returns {Promise<object>} Subscription result
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    const admin = initFirebase();

    if (!admin || config.NODE_ENV === 'development') {
      logger.info('🔔 [TOPIC SUBSCRIPTION SIMULATION]', {
        tokenCount: tokens.length,
        topic,
      });

      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
        status: 'simulated',
      };
    }

    const response = await admin.messaging().subscribeToTopic(tokens, topic);

    logger.info('Devices subscribed to topic', {
      topic,
      success: response.successCount,
      failure: response.failureCount,
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Topic subscription failed:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Unsubscribe device tokens from a topic
 * @param {Array<string>} tokens - Device tokens
 * @param {string} topic - Topic name
 * @returns {Promise<object>} Unsubscription result
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    const admin = initFirebase();

    if (!admin || config.NODE_ENV === 'development') {
      logger.info('🔔 [TOPIC UNSUBSCRIPTION SIMULATION]', {
        tokenCount: tokens.length,
        topic,
      });

      return {
        success: true,
        successCount: tokens.length,
        failureCount: 0,
        status: 'simulated',
      };
    }

    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);

    logger.info('Devices unsubscribed from topic', {
      topic,
      success: response.successCount,
      failure: response.failureCount,
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Topic unsubscription failed:', error);

    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  sendPushNotification,
  sendMulticastPushNotification,
  sendTopicPushNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};
