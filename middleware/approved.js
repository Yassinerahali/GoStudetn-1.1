const requireApprovedAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.user.accountApproved) {
    return res.status(403).json({
      message: 'Your account is pending document validation by admin.',
      documentsValidationStatus: req.user.documentsValidationStatus || 'pending',
    });
  }

  return next();
};

module.exports = requireApprovedAccount;
