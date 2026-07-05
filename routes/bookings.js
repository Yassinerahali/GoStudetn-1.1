const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedAccount = require('../middleware/approved');
const {
  createBooking,
  getStudentBookings,
  getDriverBookings,
  markDriverNotificationsSeen,
  deleteDriverNotification,
  getReceiptByBookingId,
  getStudentReceipts,
  submitBookingRating,
} = require('../controllers/bookingController');

router.post('/', auth, requireApprovedAccount, createBooking);
router.get('/student', auth, requireApprovedAccount, getStudentBookings);
router.get('/student/receipts', auth, requireApprovedAccount, getStudentReceipts);
router.get('/driver', auth, requireApprovedAccount, getDriverBookings);
router.patch('/driver/notifications/seen', auth, requireApprovedAccount, markDriverNotificationsSeen);
router.delete('/driver/notifications/:id', auth, requireApprovedAccount, deleteDriverNotification);
router.get('/:id/receipt', auth, requireApprovedAccount, getReceiptByBookingId);
router.post('/:id/rating', auth, requireApprovedAccount, submitBookingRating);

module.exports = router;
