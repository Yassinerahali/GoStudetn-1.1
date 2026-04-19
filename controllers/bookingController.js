const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const User = require('../models/User');

const resolveAuthUserId = (req) => {
  if (!req || !req.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
};

// Reserve a seat on a trip for a student.
exports.createBooking = async (req, res) => {
  try {
    const { tripId, seatsBooked = 1, paymentMethod = 'wallet' } = req.body;
    const parsedSeatsBooked = Number(seatsBooked);
    const authUserId = resolveAuthUserId(req);

    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can book rides.' });
    }
    if (!tripId || !parsedSeatsBooked || parsedSeatsBooked <= 0) {
      return res.status(400).json({ message: 'Trip ID and seats are required.' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }
    if (trip.availableSeats < parsedSeatsBooked) {
      return res.status(400).json({ message: 'Not enough seats available.' });
    }

    const student = await User.findById(authUserId).select('walletBalance');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const totalPrice = trip.price * parsedSeatsBooked;
    let walletBalanceAfterPayment = student.walletBalance || 0;

    if (paymentMethod === 'wallet') {
      if (student.walletBalance < totalPrice) {
        return res.status(400).json({ message: 'Insufficient wallet balance.' });
      }

      const updatedStudent = await User.findOneAndUpdate(
        { _id: authUserId, walletBalance: { $gte: totalPrice } },
        { $inc: { walletBalance: -totalPrice } },
        { new: true }
      ).select('walletBalance');

      if (!updatedStudent) {
        return res.status(400).json({ message: 'Insufficient wallet balance.' });
      }
      walletBalanceAfterPayment = updatedStudent.walletBalance || 0;
    }

    const updatedTrip = await Trip.findOneAndUpdate(
      { _id: tripId, availableSeats: { $gte: parsedSeatsBooked } },
      { $inc: { availableSeats: -parsedSeatsBooked } },
      { new: true }
    );

    if (!updatedTrip) {
      // Roll back wallet debit if trip update fails unexpectedly.
      if (paymentMethod === 'wallet') {
        await User.findByIdAndUpdate(authUserId, { $inc: { walletBalance: totalPrice } });
      }
      return res.status(400).json({ message: 'Not enough seats available.' });
    }

    const booking = new Booking({
      student: authUserId,
      trip: updatedTrip._id,
      seatsBooked: parsedSeatsBooked,
      paymentMethod,
      amountPaid: totalPrice,
      walletBalanceAfter: paymentMethod === 'wallet' ? walletBalanceAfterPayment : undefined,
    });
    await booking.save();

    // Reservation revenue is credited to the driver's wallet.
    await User.findByIdAndUpdate(updatedTrip.driver, { $inc: { walletBalance: totalPrice } });

    res.status(201).json({
      message: 'Booking confirmed.',
      booking,
      walletBalance: walletBalanceAfterPayment,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Booking failed.' });
  }
};

// Get bookings for the student.
exports.getStudentBookings = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const bookings = await Booking.find({ student: authUserId })
      .populate({ path: 'trip', populate: { path: 'driver', select: 'name' } })
      .populate({ path: 'trip', populate: { path: 'vehicle' } });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch bookings.' });
  }
};

// Get bookings for a driver from their trips.
exports.getDriverBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate({
      path: 'trip',
      populate: [
        { path: 'student', select: 'name email' },
        { path: 'driver', select: 'name' },
      ],
    });

    const driverBookings = bookings.filter(
      (booking) => booking.trip && booking.trip.driver && booking.trip.driver._id.toString() === req.user._id.toString()
    );

    res.json(driverBookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch driver bookings.' });
  }
};
