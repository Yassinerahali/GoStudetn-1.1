const Trip = require('../models/Trip');

// Create a new trip for a driver.
exports.createTrip = async (req, res) => {
  try {
    const { departureCity, destinationCity, departureDate, departureTime, price, totalSeats, description, vehicleId } = req.body;

    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can create trips.' });
    }

    const trip = new Trip({
      driver: req.user._id,
      vehicle: vehicleId,
      departureCity,
      destinationCity,
      departureDate,
      departureTime,
      price,
      totalSeats,
      availableSeats: totalSeats,
      description,
    });

    await trip.save();
    res.status(201).json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to create trip.' });
  }
};

// List trips with optional filters by destination, date, and price.
exports.getTrips = async (req, res) => {
  try {
    const { destination, date, maxPrice } = req.query;
    const filters = { availableSeats: { $gt: 0 } };

    if (destination) {
      filters.destinationCity = { $regex: destination, $options: 'i' };
    }
    if (date) {
      const parsedDate = new Date(date);
      filters.departureDate = {
        $gte: new Date(parsedDate.setHours(0, 0, 0)),
        $lt: new Date(parsedDate.setHours(23, 59, 59)),
      };
    }
    if (maxPrice) {
      filters.price = { $lte: Number(maxPrice) };
    }

    const trips = await Trip.find(filters).populate('driver', 'name email profilePic gender').populate('vehicle');
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch trips.' });
  }
};

// Get details for a single trip by ID.
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).populate('driver', 'name email profilePic gender').populate('vehicle');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    res.json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch trip details.' });
  }
};

// Driver can manage and delete their own trip.
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed to delete this trip.' });
    }

    await trip.remove();
    res.json({ message: 'Trip deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete trip.' });
  }
};

// Get trips for a driver dashboard.
exports.getDriverTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ driver: req.user._id }).populate('vehicle');
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch driver trips.' });
  }
};
