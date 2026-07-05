const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    bookingDate: { type: Date, required: true },
    studentName: { type: String, required: true, trim: true },
    studentPhoneNumber: { type: String, trim: true, default: '' },
    driverName: { type: String, required: true, trim: true },
    driverPhoneNumber: { type: String, trim: true, default: '' },
    departureCity: { type: String, required: true, trim: true },
    destinationCity: { type: String, required: true, trim: true },
    tripDate: { type: Date, required: true },
    tripTime: { type: String, required: true, trim: true },
    vehicleType: { type: String, trim: true, default: 'Vehicle not specified' },
    reservedSeats: { type: Number, required: true, min: 1 },
    pricePaid: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    loyaltyPointsEarned: { type: Number, default: 0, min: 0 },
    bookingStatus: { type: String, default: 'Confirmed' },
    supportContact: { type: String, default: 'support@gostudent.ma' },
    termsText: { type: String, default: 'Presentez ce recu avant votre trajet' },
    qrPayload: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Receipt', receiptSchema);
