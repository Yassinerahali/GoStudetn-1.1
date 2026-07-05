const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const WalletWithdrawal = require('../models/WalletWithdrawal');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

const ADMIN_EMAIL = 'admin@gostudent.ma';
const ADMIN_PASSWORD = 'ABC123';
const USER_ROLES = ['student', 'driver'];
const LOYALTY_DH_PER_POINT = 50;
const LOYALTY_REWARDS = [
  {
    id: 'free_snack',
    name: 'Free Snack',
    description: 'Bon pour une collation a la buvette universitaire.',
    pointsCost: 10,
  },
  {
    id: 'cafeteria_meal',
    name: 'Free Cafeteria Meal',
    description: 'Repas offert a la cafet universitaire.',
    pointsCost: 20,
  },
  {
    id: 'free_trip',
    name: 'Free Trip',
    description: 'Trajet gratuit sur une prochaine reservation.',
    pointsCost: 50,
  },
];

const resolveAuthUserId = (req) => {
  if (!req || !req.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
};

// Generate a JWT token for authenticated users.
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your_jwt_secret', {
    expiresIn: '7d',
  });
};

const mapUserForClient = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber || '',
  role: user.role,
  gender: user.gender,
  description: user.description,
  speciality: user.speciality || '',
  idCardNumber: user.idCardNumber || '',
  profilePic: user.profilePic,
  bankAccountNumber: user.bankAccountNumber || '',
  walletBalance: user.role === 'driver' ? getDriverAvailableBalance(user) : Number(user.walletBalance || 0),
  driverAvailableBalance: user.role === 'driver' ? getDriverAvailableBalance(user) : 0,
  driverHoldingBalance: user.role === 'driver' ? getDriverHoldingBalance(user) : 0,
  loyaltyPoints: Number(user.loyaltyPoints || 0),
  loyaltyDhProgress: Number(user.loyaltyDhProgress || 0),
  ratingAverage: user.ratingAverage || 0,
  ratingCount: user.ratingCount || 0,
  accountApproved: !!user.accountApproved,
  documentsValidationStatus: user.documentsValidationStatus || 'pending',
  documentsRejectionReason: user.documentsRejectionReason || '',
});

const splitFullName = (fullName = '') => {
  const normalized = String(fullName).trim().replace(/\s+/g, ' ');
  if (!normalized) return { firstName: '', lastName: '' };
  const [firstName, ...rest] = normalized.split(' ');
  return { firstName, lastName: rest.join(' ') || '-' };
};

const ensureAdminRequest = (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required.' });
    return false;
  }
  return true;
};

const getDriverAvailableBalance = (user) => Number(user?.driverAvailableBalance ?? user?.walletBalance ?? 0);
const getDriverHoldingBalance = (user) => Number(user?.driverHoldingBalance || 0);
const findLoyaltyReward = (rewardId) => LOYALTY_REWARDS.find((reward) => reward.id === rewardId);
const normalizePhoneNumber = (phoneNumber = '') => String(phoneNumber).replace(/[\s().-]+/g, '').trim();
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const ensureAdminAccount = async () => {
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) return admin;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

  admin = new User({
    firstName: 'Go',
    lastName: 'Student Admin',
    name: 'Go Student Admin',
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: 'admin',
    accountApproved: true,
    documentsValidationStatus: 'approved',
    walletBalance: 0,
  });
  await admin.save();
  return admin;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, gender, description, bankAccountNumber, phoneNumber, speciality, idCardNumber } = req.body;
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin registration is not allowed.' });
    }
    const profilePic = req.files.profilePic ? req.files.profilePic[0].path : null;
    const scholarshipCard = req.files.scholarshipCard ? req.files.scholarshipCard[0].path : null;
    const idCardPdf = req.files.idCardPdf ? req.files.idCardPdf[0].path : null;
    const normalizedBankAccountNumber = String(bankAccountNumber || '').replace(/\s+/g, '').trim();
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const drivingLicence = req.files.drivingLicence ? req.files.drivingLicence[0].path : null;
    const carDocuments = req.files.carDocuments ? req.files.carDocuments.map(file => file.path) : [];

    if (!name || !email || !normalizedPhoneNumber || !password || !role || !gender || !description || !speciality || !idCardNumber || !profilePic) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const { firstName, lastName } = splitFullName(name);
    if (!firstName || !lastName || lastName === '-') {
      return res.status(400).json({ message: 'Please provide first and last name.' });
    }

    if (role === 'student' && (!scholarshipCard || !idCardPdf)) {
      return res.status(400).json({ message: 'Scholarship card and ID card PDF are required for students.' });
    }

    if (role === 'driver' && (!scholarshipCard || !idCardPdf || !drivingLicence || carDocuments.length === 0)) {
      return res.status(400).json({ message: 'Scholarship card, ID card PDF, driving licence and car documents are required for drivers.' });
    }
    if (role === 'driver' && !normalizedBankAccountNumber) {
      return res.status(400).json({ message: 'Bank account number is required for drivers.' });
    }
    if (normalizedBankAccountNumber && !/^[A-Za-z0-9]{8,34}$/.test(normalizedBankAccountNumber)) {
      return res.status(400).json({ message: 'Bank account number format is invalid.' });
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ message: 'Phone number format is invalid.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      phoneNumber: normalizedPhoneNumber,
      password: hashedPassword,
      role,
      gender,
      description,
      speciality,
      idCardNumber,
      profilePic,
      accountApproved: false,
      documentsValidationStatus: 'pending',
      documentsRejectionReason: '',
    };
    if (scholarshipCard) {
      userData.scholarshipCard = scholarshipCard;
    }
    if (idCardPdf) {
      userData.idCardPdf = idCardPdf;
    }
    if (role === 'driver') {
      userData.bankAccountNumber = normalizedBankAccountNumber;
      userData.drivingLicence = drivingLicence;
      userData.carDocuments = carDocuments;
    }

    const user = new User(userData);
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      token,
      user: mapUserForClient(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser = await ensureAdminAccount();
      const token = generateToken(adminUser._id);
      return res.json({ token, user: mapUserForClient(adminUser) });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: mapUserForClient(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed.' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const genericMessage = 'If an account exists for this email, a reset link has been prepared.';
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashResetToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
    console.log(`Password reset link for ${user.email}: ${resetUrl}`);

    const payload = { message: genericMessage };
    if (process.env.NODE_ENV !== 'production') {
      payload.resetUrl = resetUrl;
    }
    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to prepare password reset.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');
    if (!token || !password) {
      return res.status(400).json({ message: 'Reset token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must contain at least 6 characters.' });
    }

    const user = await User.findOne({
      passwordResetToken: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to reset password.' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch user profile.' });
  }
};

exports.topUpWallet = async (req, res) => {
  try {
    const {
      amount,
      method,
      cardHolderName,
      cardNumber,
      securityCode,
      cardValidUntil,
      paypalEmail,
      paypalPassword,
    } = req.body;
    const parsedAmount = Number(amount);
    const allowedMethods = ['mastercard', 'visa', 'paypal'];

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid amount.' });
    }
    if (!allowedMethods.includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method.' });
    }

    if (method === 'mastercard' || method === 'visa') {
      const normalizedCardNumber = String(cardNumber || '').replace(/\s+/g, '');
      const cvc = String(securityCode || '').trim();
      const holder = String(cardHolderName || '').trim();
      const validUntil = String(cardValidUntil || '').trim();

      if (!holder) {
        return res.status(400).json({ message: 'Card holder name is required.' });
      }
      if (!/^\d{16}$/.test(normalizedCardNumber)) {
        return res.status(400).json({ message: 'Card number must contain 16 digits.' });
      }
      if (!/^\d{3,4}$/.test(cvc)) {
        return res.status(400).json({ message: 'Security code must contain 3 or 4 digits.' });
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validUntil)) {
        return res.status(400).json({ message: 'Card valid until must be in MM/YY format.' });
      }
    }

    if (method === 'paypal') {
      const email = String(paypalEmail || '').trim();
      const password = String(paypalPassword || '').trim();
      if (!email || !password) {
        return res.status(400).json({ message: 'PayPal email and password are required.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'PayPal email is invalid.' });
      }
    }

    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can top up the wallet.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      authUserId,
      { $inc: { walletBalance: parsedAmount } },
      { new: true }
    ).select('walletBalance');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await WalletTransaction.create({
      user: authUserId,
      type: 'topup',
      method,
      amount: parsedAmount,
      balanceAfter: updatedUser.walletBalance || 0,
    });

    res.json({
      message: `Wallet recharged virtually with ${parsedAmount} MAD via ${method}.`,
      walletBalance: updatedUser.walletBalance || 0,
      virtualPaymentValidated: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to top up wallet.' });
  }
};

exports.withdrawWallet = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const parsedAmount = Number(amount);
    const normalizedMethod = String(method || '').toLowerCase();
    const allowedMethods = ['wafacash', 'westernunion', 'bankaccount'];
    const feeRate = 0.1;

    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can withdraw wallet balance.' });
    }
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid withdrawal amount.' });
    }
    if (!allowedMethods.includes(normalizedMethod)) {
      return res.status(400).json({ message: 'Invalid withdrawal method.' });
    }

    const feeAmount = Number((parsedAmount * feeRate).toFixed(2));
    const amountSentToDriver = Number((parsedAmount - feeAmount).toFixed(2));
    if (amountSentToDriver <= 0) {
      return res.status(400).json({ message: 'Amount is too low after fee deduction.' });
    }

    const driver = await User.findById(authUserId).select('walletBalance driverAvailableBalance driverHoldingBalance');
    if (!driver) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const currentAvailable = getDriverAvailableBalance(driver);
    const currentHolding = getDriverHoldingBalance(driver);
    if (currentAvailable < parsedAmount) {
      return res.status(400).json({ message: 'Insufficient available driver wallet balance.' });
    }

    const nextAvailable = Number((currentAvailable - parsedAmount).toFixed(2));
    const updatedDriver = await User.findByIdAndUpdate(
      authUserId,
      {
        $set: {
          walletBalance: nextAvailable,
          driverAvailableBalance: nextAvailable,
          driverHoldingBalance: currentHolding,
        },
      },
      { new: true }
    ).select('walletBalance driverAvailableBalance driverHoldingBalance');

    const adminUser = await ensureAdminAccount();
    await User.findByIdAndUpdate(adminUser._id, { $inc: { walletBalance: feeAmount } });

    await WalletWithdrawal.create({
      driver: authUserId,
      method: normalizedMethod,
      amountRequested: parsedAmount,
      feeAmount,
      amountSentToDriver,
      status: 'completed',
    });

    res.json({
      message: `Withdrawal completed via ${normalizedMethod}. Fee: ${feeAmount} MAD.`,
      driverWalletBalance: getDriverAvailableBalance(updatedDriver),
      driverAvailableBalance: getDriverAvailableBalance(updatedDriver),
      driverHoldingBalance: getDriverHoldingBalance(updatedDriver),
      withdrawnAmount: parsedAmount,
      feeAmount,
      amountSentToDriver,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to process withdrawal.' });
  }
};

exports.getWalletHistory = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const transactions = await WalletTransaction.find({ user: authUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch wallet history.' });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const user = await User.findById(authUserId).select('role walletBalance driverAvailableBalance driverHoldingBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'driver') {
      const driverAvailableBalance = getDriverAvailableBalance(user);
      const driverHoldingBalance = getDriverHoldingBalance(user);
      return res.json({
        walletBalance: driverAvailableBalance,
        driverAvailableBalance,
        driverHoldingBalance,
        driverTotalBalance: Number((driverAvailableBalance + driverHoldingBalance).toFixed(2)),
      });
    }

    res.json({ walletBalance: Number(user.walletBalance || 0) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch wallet balance.' });
  }
};

exports.getAdminSummary = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [adminUser, studentsCount, driversCount, totalBookings, totalTrips, withdrawals,
      userStatusBreakdown, tripStatusBreakdown, bookingTotals, paymentBreakdown, recentBookings, recentTrips,
      topRoutes, pendingDocumentsCount, approvedAccountsCount, rejectedDocumentsCount] = await Promise.all([
      User.findById(authUserId).select('walletBalance name email'),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'driver' }),
      Booking.countDocuments(),
      Trip.countDocuments(),
      WalletWithdrawal.aggregate([
        { $group: { _id: null, totalFee: { $sum: '$feeAmount' }, totalWithdrawn: { $sum: '$amountRequested' } } },
      ]),
      User.aggregate([
        { $match: { role: { $in: USER_ROLES } } },
        { $group: { _id: '$documentsValidationStatus', count: { $sum: 1 } } },
      ]),
      Trip.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amountPaid' },
            totalSeatsBooked: { $sum: '$seatsBooked' },
            confirmedBookings: { $sum: { $cond: ['$confirmed', 1, 0] } },
          },
        },
      ]),
      Booking.aggregate([
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } },
        { $sort: { total: -1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
            revenue: { $sum: '$amountPaid' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Trip.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Trip.aggregate([
        {
          $group: {
            _id: { departureCity: '$departureCity', destinationCity: '$destinationCity' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      User.countDocuments({ role: { $in: USER_ROLES }, documentsValidationStatus: 'pending' }),
      User.countDocuments({ role: { $in: USER_ROLES }, accountApproved: true }),
      User.countDocuments({ role: { $in: USER_ROLES }, documentsValidationStatus: 'rejected' }),
    ]);

    const aggregate = withdrawals[0] || { totalFee: 0, totalWithdrawn: 0 };
    const bookingAggregate = bookingTotals[0] || { totalRevenue: 0, totalSeatsBooked: 0, confirmedBookings: 0 };
    const normalizeCountGroup = (items) => items.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count || 0;
      return acc;
    }, {});

    res.json({
      admin: {
        name: adminUser?.name || 'Admin',
        email: adminUser?.email || ADMIN_EMAIL,
        walletBalance: adminUser?.walletBalance || 0,
      },
      stats: {
        studentsCount,
        driversCount,
        totalBookings,
        totalTrips,
        totalWithdrawalFees: aggregate.totalFee || 0,
        totalWithdrawnByDrivers: aggregate.totalWithdrawn || 0,
        pendingDocumentsCount,
        approvedAccountsCount,
        rejectedDocumentsCount,
        totalRevenue: bookingAggregate.totalRevenue || 0,
        totalSeatsBooked: bookingAggregate.totalSeatsBooked || 0,
        confirmedBookings: bookingAggregate.confirmedBookings || 0,
        userStatusBreakdown: normalizeCountGroup(userStatusBreakdown),
        tripStatusBreakdown: normalizeCountGroup(tripStatusBreakdown),
        paymentBreakdown: paymentBreakdown.map((item) => ({
          method: item._id || 'unknown',
          count: item.count || 0,
          total: item.total || 0,
        })),
        recentBookings: recentBookings.map((item) => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count || 0,
          revenue: item.revenue || 0,
        })),
        recentTrips: recentTrips.map((item) => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count || 0,
        })),
        topRoutes: topRoutes.map((item) => ({
          departureCity: item._id.departureCity,
          destinationCity: item._id.destinationCity,
          count: item.count || 0,
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch admin summary.' });
  }
};

exports.getLoyaltyPoints = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access loyalty points.' });
    }

    const user = await User.findById(authUserId).select('loyaltyPoints loyaltyDhProgress');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      loyaltyPoints: Number(user.loyaltyPoints || 0),
      loyaltyDhProgress: Number(user.loyaltyDhProgress || 0),
      loyaltyDhPerPoint: LOYALTY_DH_PER_POINT,
      motivationalText: 'Plus vous voyagez, plus vous gagnez !',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch loyalty points.' });
  }
};

exports.getLoyaltyRewards = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can access loyalty rewards.' });
    }

    const user = await User.findById(authUserId).select('loyaltyPoints');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const points = Number(user.loyaltyPoints || 0);
    const rewards = LOYALTY_REWARDS.map((reward) => ({
      ...reward,
      affordable: points >= reward.pointsCost,
      pointsMissing: Math.max(0, reward.pointsCost - points),
    }));

    res.json({ loyaltyPoints: points, rewards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch loyalty rewards.' });
  }
};

exports.redeemLoyaltyReward = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can redeem rewards.' });
    }

    const rewardId = String(req.body?.rewardId || '').trim();
    const reward = findLoyaltyReward(rewardId);
    if (!reward) {
      return res.status(400).json({ message: 'Invalid reward selected.' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: authUserId, loyaltyPoints: { $gte: reward.pointsCost } },
      {
        $inc: { loyaltyPoints: -reward.pointsCost },
        $push: {
          loyaltyRedemptions: {
            rewardId: reward.id,
            rewardName: reward.name,
            pointsCost: reward.pointsCost,
            redeemedAt: new Date(),
          },
        },
      },
      { new: true }
    ).select('loyaltyPoints loyaltyRedemptions');

    if (!updatedUser) {
      return res.status(400).json({ message: 'Not enough loyalty points for this reward.' });
    }

    const latestRedemption = Array.isArray(updatedUser.loyaltyRedemptions)
      ? updatedUser.loyaltyRedemptions[updatedUser.loyaltyRedemptions.length - 1]
      : null;

    res.json({
      message: `${reward.name} redeemed successfully.`,
      loyaltyPoints: Number(updatedUser.loyaltyPoints || 0),
      redemption: latestRedemption,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to redeem loyalty reward.' });
  }
};

exports.getAdminWalletHistory = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const withdrawals = await WalletWithdrawal.find({})
      .populate('driver', 'firstName lastName name email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const history = withdrawals.map((entry) => {
      const driverName = entry.driver
        ? `${entry.driver.firstName || ''} ${entry.driver.lastName || ''}`.trim() || entry.driver.name || entry.driver.email || 'Driver'
        : 'Driver';
      return {
        id: entry._id,
        type: 'withdrawal_fee',
        title: `Fee from driver withdrawal (${entry.method})`,
        driverName,
        amountCreditedToAdmin: Number(entry.feeAmount || 0),
        amountRequestedByDriver: Number(entry.amountRequested || 0),
        amountSentToDriver: Number(entry.amountSentToDriver || 0),
        createdAt: entry.createdAt,
      };
    });

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch admin wallet history.' });
  }
};

exports.getPendingDocuments = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const users = await User.find({
      role: { $in: USER_ROLES },
      documentsValidationStatus: { $in: ['pending', 'rejected'] },
    })
      .select(
        'firstName lastName name email role gender profilePic scholarshipCard idCardPdf drivingLicence carDocuments documentsValidationStatus documentsRejectionReason accountApproved createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    const normalizedUsers = users.map((user) => {
      const fallback = splitFullName(user.name || '');
      return {
        ...user,
        firstName: user.firstName || fallback.firstName,
        lastName: user.lastName || fallback.lastName,
      };
    });

    res.json(normalizedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch pending documents.' });
  }
};

exports.validateUserDocuments = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const { approved, rejectionReason } = req.body;
    const targetId = req.params.id;
    const isApproved = approved === true || approved === 'true';
    const normalizedReason = String(rejectionReason || '').trim();

    const targetUser = await User.findById(targetId);
    if (!targetUser || !USER_ROLES.includes(targetUser.role)) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!isApproved && !normalizedReason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    targetUser.accountApproved = isApproved;
    targetUser.documentsValidationStatus = isApproved ? 'approved' : 'rejected';
    targetUser.documentsRejectionReason = isApproved ? '' : normalizedReason;
    targetUser.documentsReviewedBy = req.user._id;
    targetUser.documentsReviewedAt = new Date();
    await targetUser.save();

    res.json({
      message: isApproved ? 'Documents approved successfully.' : 'Documents rejected.',
      user: mapUserForClient(targetUser),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to validate documents.' });
  }
};

exports.getUsersTable = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const users = await User.find({ role: { $in: USER_ROLES } })
      .select(
        'firstName lastName name email password role gender walletBalance driverAvailableBalance driverHoldingBalance accountApproved documentsValidationStatus documentsRejectionReason createdAt'
      )
      .sort({ createdAt: -1 })
      .lean();

    const [spentByStudent, withdrawnByDriver] = await Promise.all([
      Booking.aggregate([
        { $group: { _id: '$student', amountSpent: { $sum: '$amountPaid' } } },
      ]),
      WalletWithdrawal.aggregate([
        { $group: { _id: '$driver', amountWithdrawn: { $sum: '$amountRequested' } } },
      ]),
    ]);

    const spentMap = new Map(spentByStudent.map((item) => [String(item._id), item.amountSpent || 0]));
    const withdrawnMap = new Map(withdrawnByDriver.map((item) => [String(item._id), item.amountWithdrawn || 0]));

    const table = users.map((user) => {
      const fallback = splitFullName(user.name || '');
      const normalizedFirstName = user.firstName || fallback.firstName;
      const normalizedLastName = user.lastName || fallback.lastName;
      return {
        id: user._id,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: user.email,
        passwordHash: user.password,
        role: user.role,
        sexe: user.gender || '-',
        balance: user.role === 'driver' ? getDriverAvailableBalance(user) : Number(user.walletBalance || 0),
        holdingBalance: user.role === 'driver' ? getDriverHoldingBalance(user) : 0,
        totalDriverBalance: user.role === 'driver'
          ? Number((getDriverAvailableBalance(user) + getDriverHoldingBalance(user)).toFixed(2))
          : Number(user.walletBalance || 0),
        accountApproved: !!user.accountApproved,
        documentsValidationStatus: user.documentsValidationStatus || 'pending',
        documentsRejectionReason: user.documentsRejectionReason || '',
        amountSpent: user.role === 'student' ? spentMap.get(String(user._id)) || 0 : 0,
        amountWithdrawn: user.role === 'driver' ? withdrawnMap.get(String(user._id)) || 0 : 0,
      };
    });

    res.json(table);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch users table.' });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const targetId = req.params.id;
    const { firstName, lastName, email, password } = req.body;

    const targetUser = await User.findById(targetId);
    if (!targetUser || !USER_ROLES.includes(targetUser.role)) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (firstName !== undefined) targetUser.firstName = String(firstName).trim();
    if (lastName !== undefined) targetUser.lastName = String(lastName).trim();
    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existingWithEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: targetUser._id } });
      if (existingWithEmail) {
        return res.status(400).json({ message: 'Email is already used by another account.' });
      }
      targetUser.email = normalizedEmail;
    }

    if (firstName !== undefined || lastName !== undefined) {
      if (!targetUser.firstName || !targetUser.lastName) {
        return res.status(400).json({ message: 'First and last name are required.' });
      }
      targetUser.name = `${targetUser.firstName} ${targetUser.lastName}`;
    }

    if (password !== undefined && String(password).trim()) {
      const salt = await bcrypt.genSalt(10);
      targetUser.password = await bcrypt.hash(String(password).trim(), salt);
    }

    await targetUser.save();
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update user.' });
  }
};

exports.approveExistingUsers = async (req, res) => {
  try {
    if (!ensureAdminRequest(req, res)) return;

    const result = await User.updateMany(
      {
        role: { $in: USER_ROLES },
        accountApproved: false,
      },
      {
        $set: {
          accountApproved: true,
          documentsValidationStatus: 'approved',
          documentsRejectionReason: '',
          documentsReviewedBy: req.user._id,
          documentsReviewedAt: new Date(),
        },
      }
    );

    res.json({
      message: `Approved ${result.modifiedCount || 0} existing user account(s).`,
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to approve existing users.' });
  }
};

exports.resubmitDocuments = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const user = await User.findById(authUserId).select('role');
    if (!user || !USER_ROLES.includes(user.role)) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const profilePic = req.files?.profilePic ? req.files.profilePic[0].path : null;
    const scholarshipCard = req.files?.scholarshipCard ? req.files.scholarshipCard[0].path : null;
    const idCardPdf = req.files?.idCardPdf ? req.files.idCardPdf[0].path : null;
    const drivingLicence = req.files?.drivingLicence ? req.files.drivingLicence[0].path : null;
    const carDocuments = req.files?.carDocuments ? req.files.carDocuments.map((file) => file.path) : [];

    if (!profilePic || !scholarshipCard || !idCardPdf) {
      return res.status(400).json({ message: 'Profile picture, scholarship card and ID card PDF are required.' });
    }

    if (user.role === 'driver' && (!drivingLicence || carDocuments.length === 0)) {
      return res.status(400).json({ message: 'Driving licence and car documents are required for drivers.' });
    }

    const updateData = {
      profilePic,
      scholarshipCard,
      idCardPdf,
      accountApproved: false,
      documentsValidationStatus: 'pending',
      documentsRejectionReason: '',
      documentsReviewedBy: null,
      documentsReviewedAt: null,
    };
    if (user.role === 'driver') {
      updateData.drivingLicence = drivingLicence;
      updateData.carDocuments = carDocuments;
    }

    const updatedUser = await User.findByIdAndUpdate(authUserId, { $set: updateData }, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'Documents re-uploaded successfully. Waiting for admin approval.',
      user: mapUserForClient(updatedUser),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error?.message || 'Unable to resubmit documents.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { description, bankAccountNumber, phoneNumber } = req.body;
    const profilePic = req.file ? req.file.path : null;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (profilePic) updateData.profilePic = profilePic;
    if (phoneNumber !== undefined) {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
      if (normalizedPhoneNumber && !/^\+?[0-9]{7,15}$/.test(normalizedPhoneNumber)) {
        return res.status(400).json({ message: 'Phone number format is invalid.' });
      }
      updateData.phoneNumber = normalizedPhoneNumber;
    }
    if (bankAccountNumber !== undefined) {
      const normalizedBankAccountNumber = String(bankAccountNumber).replace(/\s+/g, '').trim();
      if (req.user.role === 'driver' && !normalizedBankAccountNumber) {
        return res.status(400).json({ message: 'Bank account number is required for drivers.' });
      }
      if (normalizedBankAccountNumber && !/^[A-Za-z0-9]{8,34}$/.test(normalizedBankAccountNumber)) {
        return res.status(400).json({ message: 'Bank account number format is invalid.' });
      }
      updateData.bankAccountNumber = normalizedBankAccountNumber;
    }

    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const user = await User.findByIdAndUpdate(authUserId, updateData, { new: true });
    res.json({ message: 'Profile updated successfully', user: mapUserForClient(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};
