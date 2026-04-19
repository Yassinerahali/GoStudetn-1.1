const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedAccount = require('../middleware/approved');
const { createVehicle, getDriverVehicles } = require('../controllers/vehicleController');

router.post('/', auth, requireApprovedAccount, createVehicle);
router.get('/driver', auth, requireApprovedAccount, getDriverVehicles);

module.exports = router;
