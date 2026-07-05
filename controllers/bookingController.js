const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Receipt = require('../models/Receipt');
const { cleanupExpiredScheduledTrips, buildTripDepartureDateTime } = require('./tripController');
const LOYALTY_DH_PER_POINT = 50;

const generateReceiptNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const serial = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GS-${y}${m}${d}-${serial}`;
};

const resolveAuthUserId = (req) => {
  if (!req || !req.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
};

const parseRatingScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};

const updateUserRating = async (userId, newScore) => {
  const user = await User.findById(userId).select('ratingAverage ratingCount');
  if (!user) return null;

  const currentCount = Number(user.ratingCount || 0);
  const currentAverage = Number(user.ratingAverage || 0);
  const updatedCount = currentCount + 1;
  const updatedAverage = Number((((currentAverage * currentCount) + newScore) / updatedCount).toFixed(2));

  user.ratingCount = updatedCount;
  user.ratingAverage = updatedAverage;
  await user.save();

  return { ratingAverage: updatedAverage, ratingCount: updatedCount };
};

// Reserve a seat on a trip for a student.
exports.createBooking = async (req, res) => {
  try {
    const { tripId, seatsBooked = 1, paymentMethod = 'wallet', studentComment = '' } = req.body;
    const parsedSeatsBooked = Number(seatsBooked);
    const authUserId = resolveAuthUserId(req);
    const normalizedComment = String(studentComment || '').trim();

    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can book rides.' });
    }
    if (!tripId || !parsedSeatsBooked || parsedSeatsBooked <= 0) {
      return res.status(400).json({ message: 'Trip ID and seats are required.' });
    }

    await cleanupExpiredScheduledTrips();

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    if (trip.status !== 'scheduled') {
      return res.status(400).json({ message: 'This trip is no longer open for reservation.' });
    }

    const departureDateTime = buildTripDepartureDateTime(trip);
    if (departureDateTime && departureDateTime.getTime() < Date.now()) {
      return res.status(400).json({ message: 'This trip has already expired.' });
    }

    if (trip.availableSeats < parsedSeatsBooked) {
      return res.status(400).json({ message: 'Not enough seats available.' });
    }

    const student = await User.findById(authUserId).select('walletBalance loyaltyPoints loyaltyDhProgress');
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const totalPrice = trip.price * parsedSeatsBooked;
    let walletBalanceAfterPayment = student.walletBalance || 0;
    const currentLoyaltyDhProgress = Number(student.loyaltyDhProgress || 0);
    const currentLoyaltyPoints = Number(student.loyaltyPoints || 0);

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
      { _id: tripId, availableSeats: { $gte: parsedSeatsBooked }, status: 'scheduled' },
      { $inc: { availableSeats: -parsedSeatsBooked } },
      { new: true }
    );

    if (!updatedTrip) {
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
      studentComment: normalizedComment,
    });
    await booking.save();

    const loyaltyTotalDh = currentLoyaltyDhProgress + totalPrice;
    const loyaltyEarnedPoints = Math.floor(loyaltyTotalDh / LOYALTY_DH_PER_POINT);
    const nextLoyaltyDhProgress = Number((loyaltyTotalDh % LOYALTY_DH_PER_POINT).toFixed(2));
    const nextLoyaltyPoints = currentLoyaltyPoints + loyaltyEarnedPoints;

    await User.findByIdAndUpdate(authUserId, {
      $set: {
        loyaltyDhProgress: nextLoyaltyDhProgress,
        loyaltyPoints: nextLoyaltyPoints,
      },
    });

    // Reservation revenue is held until trip arrival.
    await User.findByIdAndUpdate(updatedTrip.driver, { $inc: { driverHoldingBalance: totalPrice } });

    const [studentProfile, driverProfile, vehicle] = await Promise.all([
      User.findById(authUserId).select('name phoneNumber'),
      User.findById(updatedTrip.driver).select('name phoneNumber'),
      updatedTrip.vehicle ? Vehicle.findById(updatedTrip.vehicle).select('make model') : null,
    ]);

    const vehicleType = vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''}`.trim()
      : 'Vehicle not specified';

    let receipt = null;
    try {
      receipt = await Receipt.create({
        receiptNumber: generateReceiptNumber(),
        booking: booking._id,
        student: authUserId,
        trip: updatedTrip._id,
        bookingDate: booking.createdAt || new Date(),
        studentName: studentProfile?.name || 'Student',
        studentPhoneNumber: studentProfile?.phoneNumber || '-',
        driverName: driverProfile?.name || 'Driver',
        driverPhoneNumber: driverProfile?.phoneNumber || '-',
        departureCity: updatedTrip.departureCity || 'Depart',
        destinationCity: updatedTrip.destinationCity || 'Arrivee',
        tripDate: updatedTrip.departureDate,
        tripTime: updatedTrip.departureTime || '--:--',
        vehicleType: vehicleType || 'Vehicle not specified',
        reservedSeats: parsedSeatsBooked,
        pricePaid: totalPrice,
        paymentMethod,
        loyaltyPointsEarned: loyaltyEarnedPoints,
        bookingStatus: booking.confirmed ? 'Confirmed' : 'Pending',
        qrPayload: String(booking._id),
      });

      booking.receipt = receipt._id;
      await booking.save();
    } catch (receiptError) {
      console.error('Receipt generation failed:', receiptError?.message || receiptError);
    }

    res.status(201).json({
      message: 'Booking confirmed.',
      booking,
      receiptId: receipt?._id,
      receiptNumber: receipt?.receiptNumber,
      receiptGenerated: !!receipt,
      walletBalance: walletBalanceAfterPayment,
      loyaltyPoints: nextLoyaltyPoints,
      loyaltyEarnedPoints,
      loyaltyDhProgress: nextLoyaltyDhProgress,
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

    await cleanupExpiredScheduledTrips();

    const bookings = await Booking.find({ student: authUserId })
      .populate({ path: 'trip', populate: { path: 'driver', select: 'name email profilePic ratingAverage ratingCount' } })
      .populate({ path: 'trip', populate: { path: 'vehicle' } })
      .populate({ path: 'receipt', select: 'receiptNumber createdAt bookingStatus' })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch bookings.' });
  }
};

exports.getReceiptByBookingId = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const booking = await Booking.findById(req.params.id).select('student');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (String(booking.student) !== String(authUserId)) {
      return res.status(403).json({ message: 'Not allowed to view this receipt.' });
    }

    const receipt = await Receipt.findOne({ booking: booking._id }).lean();
    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found for this booking.' });
    }

    res.json(receipt);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch receipt.' });
  }
};

exports.getStudentReceipts = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access receipts.' });
    }

    const receipts = await Receipt.find({ student: authUserId })
      .sort({ createdAt: -1 })
      .lean();

    res.json(receipts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch receipts.' });
  }
};

// Get bookings for a driver and return active notifications.
exports.getDriverBookings = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can access this endpoint.' });
    }

    await cleanupExpiredScheduledTrips();

    const driverTrips = await Trip.find({ driver: req.user._id }).select('_id');
    const tripIds = driverTrips.map((trip) => trip._id);

    const bookings = await Booking.find({ trip: { $in: tripIds } })
      .populate('student', 'name email profilePic ratingAverage ratingCount')
      .populate('trip')
      .sort({ createdAt: -1 });

    const activeNotifications = bookings.filter((booking) => !booking.driverNotificationDeletedAt);
    const unseenBookings = activeNotifications.filter((booking) => !booking.driverNotificationSeenAt);

    res.json({
      bookings,
      unseenCount: unseenBookings.length,
      notifications: activeNotifications.map((booking) => ({
        bookingId: booking._id,
        tripId: booking.trip?._id,
        studentName: booking.student?.name || 'Student',
        route: `${booking.trip?.departureCity || 'Depart'} -> ${booking.trip?.destinationCity || 'Arrivee'}`,
        seatsBooked: booking.seatsBooked,
        studentComment: booking.studentComment || 'No comment.',
        createdAt: booking.createdAt,
        seen: !!booking.driverNotificationSeenAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch driver bookings.' });
  }
};

exports.markDriverNotificationsSeen = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can access this endpoint.' });
    }

    const driverTrips = await Trip.find({ driver: req.user._id }).select('_id');
    const tripIds = driverTrips.map((trip) => trip._id);

    if (!tripIds.length) {
      return res.json({ message: 'No notifications to mark as seen.' });
    }

    await Booking.updateMany(
      { trip: { $in: tripIds }, driverNotificationDeletedAt: { $exists: false }, driverNotificationSeenAt: { $exists: false } },
      { $set: { driverNotificationSeenAt: new Date() } }
    );

    await Booking.updateMany(
      { trip: { $in: tripIds }, driverNotificationDeletedAt: { $exists: false }, driverNotificationSeenAt: null },
      { $set: { driverNotificationSeenAt: new Date() } }
    );

    res.json({ message: 'Notifications marked as seen.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update notification status.' });
  }
};

exports.deleteDriverNotification = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can access this endpoint.' });
    }

    const booking = await Booking.findById(req.params.id).populate({ path: 'trip', select: 'driver' });
    if (!booking || !booking.trip) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    if (String(booking.trip.driver) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not allowed to delete this notification.' });
    }

    booking.driverNotificationDeletedAt = new Date();
    if (!booking.driverNotificationSeenAt) {
      booking.driverNotificationSeenAt = new Date();
    }
    await booking.save();

    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete notification.' });
  }
};

exports.submitBookingRating = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const booking = await Booking.findById(req.params.id).populate('trip');
    if (!booking || !booking.trip) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.trip.status !== 'completed') {
      return res.status(400).json({ message: 'Ratings are available only after arrival.' });
    }

    const score = parseRatingScore(req.body?.score);
    if (!score) {
      return res.status(400).json({ message: 'Rating score must be between 1 and 5.' });
    }

    let targetUserId = null;

    if (req.user.role === 'student') {
      if (String(booking.student) !== String(authUserId)) {
        return res.status(403).json({ message: 'Not allowed to rate this booking.' });
      }
      if (booking.studentRatedDriver?.score) {
        return res.status(400).json({ message: 'You already rated this trip.' });
      }

      booking.studentRatedDriver = { score, ratedAt: new Date() };
      targetUserId = booking.trip.driver;
    } else if (req.user.role === 'driver') {
      if (String(booking.trip.driver) !== String(authUserId)) {
        return res.status(403).json({ message: 'Not allowed to rate this booking.' });
      }
      if (booking.driverRatedStudent?.score) {
        return res.status(400).json({ message: 'You already rated this student for this trip.' });
      }

      booking.driverRatedStudent = { score, ratedAt: new Date() };
      targetUserId = booking.student;
    } else {
      return res.status(403).json({ message: 'Only students or drivers can submit ratings.' });
    }

    await booking.save();
    const ratingSummary = await updateUserRating(targetUserId, score);

    res.json({
      message: 'Rating submitted successfully.',
      booking,
      targetUserRating: ratingSummary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to submit rating.' });
  }
};
