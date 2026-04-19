const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    seatsBooked: { type: Number, required: true, min: 1, default: 1 },
    paymentMethod: { type: String, enum: ['wallet', 'mastercard', 'visa', 'paypal', 'cash'], default: 'wallet' },
    amountPaid: { type: Number, default: 0, min: 0 },
    walletBalanceAfter: { type: Number, min: 0 },
    confirmed: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
