const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedAccount = require('../middleware/approved');
const { createBooking, getStudentBookings, getDriverBookings } = require('../controllers/bookingController');

router.post('/', auth, requireApprovedAccount, createBooking);
router.get('/student', auth, requireApprovedAccount, getStudentBookings);
router.get('/driver', auth, requireApprovedAccount, getDriverBookings);

module.exports = router;
