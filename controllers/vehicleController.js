const Vehicle = require('../models/Vehicle');

// Add a new vehicle by a driver.
exports.createVehicle = async (req, res) => {
  try {
    const { make, model, licensePlate, seats } = req.body;
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can add vehicles.' });
    }
    const vehicle = new Vehicle({
      driver: req.user._id,
      make,
      model,
      licensePlate,
      seats,
    });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to add vehicle.' });
  }
};

// Get vehicles owned by the current driver.
exports.getDriverVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ driver: req.user._id });
    res.json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch vehicles.' });
  }
};
