const mongoose = require('mongoose');

const walletWithdrawalSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, enum: ['wafacash', 'westernunion', 'bankaccount'], required: true },
    amountRequested: { type: Number, required: true, min: 0 },
    feeAmount: { type: Number, required: true, min: 0 },
    amountSentToDriver: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed'], default: 'completed' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletWithdrawal', walletWithdrawalSchema);
