const express = require('express');
const multer = require('multer');
const router = express.Router();
const auth = require('../middleware/auth');
const requireApprovedAccount = require('../middleware/approved');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateProfile,
  topUpWallet,
  getWallet,
  getWalletHistory,
  getLoyaltyPoints,
  getLoyaltyRewards,
  redeemLoyaltyReward,
  withdrawWallet,
  getAdminSummary,
  getAdminWalletHistory,
  getPendingDocuments,
  validateUserDocuments,
  getUsersTable,
  adminUpdateUser,
  approveExistingUsers,
  resubmitDocuments,
} = require('../controllers/authController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Public authentication routes
router.post('/register', upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'scholarshipCard', maxCount: 1 },
  { name: 'idCardPdf', maxCount: 1 },
  { name: 'drivingLicence', maxCount: 1 },
  { name: 'carDocuments', maxCount: 10 } // allow up to 10 car documents
]), register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile/:id', getUserProfile);
router.put('/profile', upload.single('profilePic'), auth, updateProfile);
router.post('/wallet/topup', auth, requireApprovedAccount, topUpWallet);
router.post('/wallet/withdraw', auth, requireApprovedAccount, withdrawWallet);
router.get('/wallet', auth, requireApprovedAccount, getWallet);
router.get('/wallet/history', auth, requireApprovedAccount, getWalletHistory);
router.get('/loyalty/points', auth, requireApprovedAccount, getLoyaltyPoints);
router.get('/loyalty/rewards', auth, requireApprovedAccount, getLoyaltyRewards);
router.post('/loyalty/redeem', auth, requireApprovedAccount, redeemLoyaltyReward);
router.get('/admin/summary', auth, getAdminSummary);
router.get('/admin/wallet/history', auth, getAdminWalletHistory);
router.get('/admin/documents/pending', auth, getPendingDocuments);
router.post('/admin/users/:id/validate-documents', auth, validateUserDocuments);
router.post('/admin/users/approve-existing', auth, approveExistingUsers);
router.get('/admin/users/table', auth, getUsersTable);
router.put('/admin/users/:id', auth, adminUpdateUser);
router.post('/documents/resubmit', auth, upload.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'scholarshipCard', maxCount: 1 },
  { name: 'idCardPdf', maxCount: 1 },
  { name: 'drivingLicence', maxCount: 1 },
  { name: 'carDocuments', maxCount: 10 },
]), resubmitDocuments);
module.exports = router;
