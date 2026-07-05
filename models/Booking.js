const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
    seatsBooked: { type: Number, required: true, min: 1, default: 1 },
    paymentMethod: { type: String, enum: ['wallet', 'mastercard', 'visa', 'paypal', 'cash'], default: 'wallet' },
    amountPaid: { type: Number, default: 0, min: 0 },
    walletBalanceAfter: { type: Number, min: 0 },
    studentComment: { type: String, trim: true, default: '' },
    driverNotificationSeenAt: { type: Date },
    driverNotificationDeletedAt: { type: Date },
    driverRatedStudent: {
      score: { type: Number, min: 1, max: 5 },
      ratedAt: { type: Date },
    },
    studentRatedDriver: {
      score: { type: Number, min: 1, max: 5 },
      ratedAt: { type: Date },
    },
    confirmed: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
