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
    phoneNumber: { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
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
      type: String,
      required: function () {
        return this.role !== 'admin';
      },
    },
    speciality: {
      type: String,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },
    idCardNumber: {
      type: String,
      trim: true,
      required: function () {
        return this.role !== 'admin';
      },
    },
    scholarshipCard: { type: String },
    idCardPdf: { type: String },
    bankAccountNumber: { type: String, trim: true },
    drivingLicence: { type: String },
    carDocuments: [{ type: String }],
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
    documentsRejectionReason: { type: String, trim: true, default: '' },
    suspended: { type: Boolean, default: false },
    suspendedAt: { type: Date },
    suspensionReason: { type: String, trim: true, default: '' },
    walletBalance: { type: Number, default: 0, min: 0 },
    driverAvailableBalance: { type: Number, default: 0, min: 0 },
    driverHoldingBalance: { type: Number, default: 0, min: 0 },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyDhProgress: { type: Number, default: 0, min: 0 },
    loyaltyRedemptions: [{
      rewardId: { type: String, trim: true },
      rewardName: { type: String, trim: true },
      pointsCost: { type: Number, min: 0 },
      redeemedAt: { type: Date, default: Date.now },
      used: { type: Boolean, default: false },
      usedAt: { type: Date },
      qrPayload: { type: String, trim: true },
    }],
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    pastRides: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
