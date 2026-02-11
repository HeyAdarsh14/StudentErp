const express = require('express');
const router = express.Router();
const {
  getPreferences,
  updatePreferences,
  addDeviceToken,
  removeDeviceToken,
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  createBroadcast,
  getBroadcasts,
  getBroadcast,
  approveBroadcast,
  cancelBroadcast,
  sendSMSDirect,
  sendWhatsAppDirect,
  sendPushDirect,
  getSMSBalanceInfo,
  getCommunicationStatistics,
} = require('../controllers/communication.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const { PERMISSIONS } = require('../constants/permissions');

// Apply authentication to all routes
router.use(authenticate);

/**
 * ============================================
 * PREFERENCES ROUTES
 * ============================================
 */

router
  .route('/preferences')
  .get(getPreferences)
  .put(auditLogger('UPDATE_COMMUNICATION_PREFERENCES'), updatePreferences);

router
  .route('/device-token')
  .post(auditLogger('ADD_DEVICE_TOKEN'), addDeviceToken);

router
  .route('/device-token/:token')
  .delete(auditLogger('REMOVE_DEVICE_TOKEN'), removeDeviceToken);

/**
 * ============================================
 * TEMPLATE ROUTES
 * ============================================
 */

router
  .route('/templates')
  .post(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('CREATE_MESSAGE_TEMPLATE'),
    createTemplate
  )
  .get(getTemplates);

router
  .route('/templates/:id')
  .get(getTemplate)
  .put(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('UPDATE_MESSAGE_TEMPLATE'),
    updateTemplate
  )
  .delete(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('DELETE_MESSAGE_TEMPLATE'),
    deleteTemplate
  );

/**
 * ============================================
 * BROADCAST ROUTES
 * ============================================
 */

router
  .route('/broadcasts')
  .post(
    hasPermission([PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.PLACEMENT.VIEW_STATISTICS]),
    auditLogger('CREATE_BROADCAST'),
    createBroadcast
  )
  .get(
    hasPermission([PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.PLACEMENT.VIEW_STATISTICS]),
    getBroadcasts
  );

router
  .route('/broadcasts/:id')
  .get(
    hasPermission([PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.PLACEMENT.VIEW_STATISTICS]),
    getBroadcast
  );

router
  .route('/broadcasts/:id/approve')
  .post(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('APPROVE_BROADCAST'),
    approveBroadcast
  );

router
  .route('/broadcasts/:id/cancel')
  .post(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('CANCEL_BROADCAST'),
    cancelBroadcast
  );

/**
 * ============================================
 * DIRECT MESSAGING ROUTES
 * ============================================
 */

router
  .route('/send/sms')
  .post(
    hasPermission([PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.PLACEMENT.VIEW_STATISTICS]),
    auditLogger('SEND_SMS'),
    sendSMSDirect
  );

router
  .route('/send/whatsapp')
  .post(
    hasPermission([PERMISSIONS.SETTINGS_UPDATE, PERMISSIONS.PLACEMENT.VIEW_STATISTICS]),
    auditLogger('SEND_WHATSAPP'),
    sendWhatsAppDirect
  );

router
  .route('/send/push')
  .post(
    hasPermission(PERMISSIONS.SETTINGS_UPDATE),
    auditLogger('SEND_PUSH_NOTIFICATION'),
    sendPushDirect
  );

/**
 * ============================================
 * ANALYTICS ROUTES
 * ============================================
 */

router
  .route('/balance/sms')
  .get(hasPermission(PERMISSIONS.SETTINGS_UPDATE), getSMSBalanceInfo);

router
  .route('/statistics')
  .get(hasPermission(PERMISSIONS.SETTINGS_UPDATE), getCommunicationStatistics);

module.exports = router;
