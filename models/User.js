const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },
    lastName: {
      type: String,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'driver', 'admin'], required: true },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: function () {
        return this.role !== 'admin';
      },
    },
    description: {
      type: String,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },
    profilePic: {
      type: String, // path to uploaded file
      required: function () {
        return this.role !== 'admin';
      },
    },
    scholarshipCard: { type: String }, // path to uploaded file, optional for drivers?
    drivingLicence: { type: String }, // path to uploaded file, for drivers
    carDocuments: [{ type: String }], // array of paths, for drivers
    documentsValidationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: function () {
        return this.role === 'admin' ? 'approved' : 'pending';
      },
    },
    accountApproved: {
      type: Boolean,
      default: function () {
        return this.role === 'admin';
      },
    },
    documentsReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    documentsReviewedAt: { type: Date },
    walletBalance: { type: Number, default: 0, min: 0 },
    pastRides: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
