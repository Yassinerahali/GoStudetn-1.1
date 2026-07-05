const requireApprovedAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (!req.user.accountApproved) {
    const status = req.user.documentsValidationStatus || 'pending';
    const rejectionReason = String(req.user.documentsRejectionReason || '').trim();
    return res.status(403).json({
      message:
        status === 'rejected'
          ? 'Your documents were rejected. Please re-upload your documents and wait for approval.'
          : 'Your account is pending document validation by admin.',
      documentsValidationStatus: status,
      documentsRejectionReason: rejectionReason,
    });
  }

  return next();
};

module.exports = requireApprovedAccount;
