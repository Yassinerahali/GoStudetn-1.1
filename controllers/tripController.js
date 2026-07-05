const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const User = require('../models/User');

const buildTripDepartureDateTime = (trip) => {
  if (!trip?.departureDate || !trip?.departureTime) return null;
  const baseDate = new Date(trip.departureDate);
  if (Number.isNaN(baseDate.getTime())) return null;

  const [hours, minutes] = String(trip.departureTime)
    .split(':')
    .map((value) => Number(value));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const combined = new Date(baseDate);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

const cleanupExpiredScheduledTrips = async () => {
  const now = new Date();
  const scheduledTrips = await Trip.find({ status: 'scheduled' }).select('_id departureDate departureTime');

  const expiredTripIds = scheduledTrips
    .filter((trip) => {
      const departureDateTime = buildTripDepartureDateTime(trip);
      return departureDateTime && departureDateTime.getTime() < now.getTime();
    })
    .map((trip) => trip._id);

  if (expiredTripIds.length === 0) return 0;

  await Booking.deleteMany({ trip: { $in: expiredTripIds } });
  const deleteResult = await Trip.deleteMany({ _id: { $in: expiredTripIds } });
  return deleteResult.deletedCount || 0;
};

const tripPopulate = [
  { path: 'driver', select: 'name email profilePic gender ratingAverage ratingCount' },
  { path: 'vehicle' },
];

// Create a new trip for a driver.
exports.createTrip = async (req, res) => {
  try {
    const { departureCity, destinationCity, departureDate, departureTime, price, totalSeats, description, vehicleId } = req.body;

    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can create trips.' });
    }

    await cleanupExpiredScheduledTrips();

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
      status: 'scheduled',
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
    await cleanupExpiredScheduledTrips();

    const { destination, date, maxPrice } = req.query;
    const filters = {
      availableSeats: { $gt: 0 },
      status: { $in: ['scheduled', 'in_progress'] },
    };

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

    const trips = await Trip.find(filters).populate(tripPopulate);
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch trips.' });
  }
};

// Get details for a single trip by ID.
exports.getTripById = async (req, res) => {
  try {
    await cleanupExpiredScheduledTrips();

    const trip = await Trip.findById(req.params.id).populate(tripPopulate);
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

    await Booking.deleteMany({ trip: trip._id });
    await trip.deleteOne();
    res.json({ message: 'Trip deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete trip.' });
  }
};

// Get trips for a driver dashboard.
exports.getDriverTrips = async (req, res) => {
  try {
    await cleanupExpiredScheduledTrips();

    const trips = await Trip.find({ driver: req.user._id }).populate('vehicle').sort({ departureDate: 1, departureTime: 1 });
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch driver trips.' });
  }
};

// Driver starts the trip and gets booking details for popup.
exports.startTrip = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can start trips.' });
    }

    await cleanupExpiredScheduledTrips();

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (String(trip.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to start this trip.' });
    }
    if (trip.status !== 'scheduled') {
      return res.status(400).json({ message: 'Trip is already started or completed.' });
    }

    trip.status = 'in_progress';
    trip.startedAt = new Date();
    await trip.save();

    const [updatedTrip, bookings] = await Promise.all([
      Trip.findById(trip._id).populate(tripPopulate),
      Booking.find({ trip: trip._id }).populate('student', 'name email profilePic ratingAverage ratingCount'),
    ]);

    res.json({
      message: 'Trip started successfully.',
      trip: updatedTrip,
      bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to start trip.' });
  }
};

// Driver marks trip as arrived and returns completed trip bookings for ratings.
exports.arriveTrip = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can complete trips.' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (String(trip.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to complete this trip.' });
    }
    if (trip.status !== 'in_progress') {
      return res.status(400).json({ message: 'Trip must be in progress before arrival.' });
    }

    trip.status = 'completed';
    trip.arrivedAt = new Date();
    await trip.save();

    const [updatedTrip, bookings] = await Promise.all([
      Trip.findById(trip._id).populate(tripPopulate),
      Booking.find({ trip: trip._id }).populate('student', 'name email profilePic ratingAverage ratingCount'),
    ]);

    const totalReleasedAmount = bookings.reduce(
      (sum, booking) => sum + Number(booking.amountPaid || 0),
      0
    );

    let updatedDriverWallet = null;
    let releasedAmount = 0;
    if (totalReleasedAmount > 0) {
      const driver = await User.findById(trip.driver).select('walletBalance driverAvailableBalance driverHoldingBalance');
      if (driver) {
        const currentAvailable = Number(driver.driverAvailableBalance ?? driver.walletBalance ?? 0);
        const currentHolding = Number(driver.driverHoldingBalance || 0);
        releasedAmount = Number(Math.min(currentHolding, totalReleasedAmount).toFixed(2));
        const nextAvailable = Number((currentAvailable + releasedAmount).toFixed(2));
        const nextHolding = Number((currentHolding - releasedAmount).toFixed(2));

        updatedDriverWallet = await User.findByIdAndUpdate(
          trip.driver,
          {
            $set: {
              walletBalance: nextAvailable,
              driverAvailableBalance: nextAvailable,
              driverHoldingBalance: nextHolding,
            },
          },
          { new: true }
        ).select('driverAvailableBalance driverHoldingBalance');
      }
    }

    res.json({
      message: 'Trip marked as arrived.',
      trip: updatedTrip,
      bookings,
      releasedAmount,
      driverAvailableBalance: updatedDriverWallet ? Number(updatedDriverWallet.driverAvailableBalance || 0) : undefined,
      driverHoldingBalance: updatedDriverWallet ? Number(updatedDriverWallet.driverHoldingBalance || 0) : undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to complete trip.' });
  }
};

exports.cleanupExpiredScheduledTrips = cleanupExpiredScheduledTrips;
exports.buildTripDepartureDateTime = buildTripDepartureDateTime;
