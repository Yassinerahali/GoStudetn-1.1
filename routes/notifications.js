const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getNotifications,
  getUnseenCount,
  markNotificationSeen,
  markAllNotificationsSeen,
  deleteNotification,
  clearAllNotifications,
} = require('../controllers/notificationController');

router.get('/', auth, getNotifications);
router.get('/unseen-count', auth, getUnseenCount);
router.post('/mark-all-seen', auth, markAllNotificationsSeen);
router.post('/:id/seen', auth, markNotificationSeen);
router.delete('/:id', auth, deleteNotification);
router.delete('/', auth, clearAllNotifications);

module.exports = router;
