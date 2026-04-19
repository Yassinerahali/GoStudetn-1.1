const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedAccount = require('../middleware/approved');
const { createTrip, getTrips, getTripById, deleteTrip, getDriverTrips } = require('../controllers/tripController');

// Public trip listing and details
router.get('/', getTrips);

// Driver-only trip management
router.post('/', auth, requireApprovedAccount, createTrip);
router.get('/driver/list', auth, requireApprovedAccount, getDriverTrips);
router.delete('/:id', auth, requireApprovedAccount, deleteTrip);

// Public detail route must be last to avoid shadowing fixed routes.
router.get('/:id', getTripById);

module.exports = router;
