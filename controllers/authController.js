const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const WalletWithdrawal = require('../models/WalletWithdrawal');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');

const ADMIN_EMAIL = 'admin@gostudent.ma';
const ADMIN_PASSWORD = 'ABC123';
const USER_ROLES = ['student', 'driver'];

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
  role: user.role,
  gender: user.gender,
  description: user.description,
  profilePic: user.profilePic,
  walletBalance: user.walletBalance || 0,
  accountApproved: !!user.accountApproved,
  documentsValidationStatus: user.documentsValidationStatus || 'pending',
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
    const { name, email, password, role, gender, description } = req.body;
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin registration is not allowed.' });
    }
    const profilePic = req.files.profilePic ? req.files.profilePic[0].path : null;
    const scholarshipCard = req.files.scholarshipCard ? req.files.scholarshipCard[0].path : null;
    const drivingLicence = req.files.drivingLicence ? req.files.drivingLicence[0].path : null;
    const carDocuments = req.files.carDocuments ? req.files.carDocuments.map(file => file.path) : [];

    if (!name || !email || !password || !role || !gender || !description || !profilePic) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const { firstName, lastName } = splitFullName(name);
    if (!firstName || !lastName || lastName === '-') {
      return res.status(400).json({ message: 'Please provide first and last name.' });
    }

    if (role === 'student' && !scholarshipCard) {
      return res.status(400).json({ message: 'Scholarship card is required for students.' });
    }

    if (role === 'driver' && (!scholarshipCard || !drivingLicence || carDocuments.length === 0)) {
      return res.status(400).json({ message: 'Scholarship card, driving licence and car documents are required for drivers.' });
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
      password: hashedPassword,
      role,
      gender,
      description,
      profilePic,
      accountApproved: false,
      documentsValidationStatus: 'pending',
    };
    if (scholarshipCard) {
      userData.scholarshipCard = scholarshipCard;
    }
    if (role === 'driver') {
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

      if (!holder) {
        return res.status(400).json({ message: 'Card holder name is required.' });
      }
      if (!/^\d{16}$/.test(normalizedCardNumber)) {
        return res.status(400).json({ message: 'Card number must contain 16 digits.' });
      }
      if (!/^\d{3,4}$/.test(cvc)) {
        return res.status(400).json({ message: 'Security code must contain 3 or 4 digits.' });
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

    const updatedDriver = await User.findOneAndUpdate(
      { _id: authUserId, walletBalance: { $gte: parsedAmount } },
      { $inc: { walletBalance: -parsedAmount } },
      { new: true }
    ).select('walletBalance');

    if (!updatedDriver) {
      return res.status(400).json({ message: 'Insufficient driver wallet balance.' });
    }

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
      driverWalletBalance: updatedDriver.walletBalance || 0,
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

    const user = await User.findById(authUserId).select('walletBalance');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ walletBalance: user.walletBalance || 0 });
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

    const [adminUser, studentsCount, driversCount, totalBookings, totalTrips, withdrawals] = await Promise.all([
      User.findById(authUserId).select('walletBalance name email'),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'driver' }),
      Booking.countDocuments(),
      Trip.countDocuments(),
      WalletWithdrawal.aggregate([
        { $group: { _id: null, totalFee: { $sum: '$feeAmount' }, totalWithdrawn: { $sum: '$amountRequested' } } },
      ]),
    ]);

    const aggregate = withdrawals[0] || { totalFee: 0, totalWithdrawn: 0 };

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
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch admin summary.' });
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
        'firstName lastName name email role gender profilePic scholarshipCard drivingLicence carDocuments documentsValidationStatus accountApproved createdAt'
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

    const { approved } = req.body;
    const targetId = req.params.id;
    const isApproved = approved === true || approved === 'true';

    const targetUser = await User.findById(targetId);
    if (!targetUser || !USER_ROLES.includes(targetUser.role)) {
      return res.status(404).json({ message: 'User not found.' });
    }

    targetUser.accountApproved = isApproved;
    targetUser.documentsValidationStatus = isApproved ? 'approved' : 'rejected';
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
        'firstName lastName name email password role gender walletBalance accountApproved documentsValidationStatus createdAt'
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
        balance: user.walletBalance || 0,
        accountApproved: !!user.accountApproved,
        documentsValidationStatus: user.documentsValidationStatus || 'pending',
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

exports.updateProfile = async (req, res) => {
  try {
    const { description } = req.body;
    const profilePic = req.file ? req.file.path : null;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (profilePic) updateData.profilePic = profilePic;

    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const user = await User.findByIdAndUpdate(authUserId, updateData, { new: true });
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};
