const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    licensePlate: { type: String, required: true, trim: true },
    seats: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
