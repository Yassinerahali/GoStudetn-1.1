const Notification = require('../models/Notification');

const resolveAuthUserId = (req) => {
  if (!req || !req.user) return null;
  return req.user._id || req.user.id || req.user.userId || null;
};

exports.getNotifications = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const notifications = await Notification.find({ user: authUserId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unseenCount = await Notification.countDocuments({ user: authUserId, seen: false });

    res.json({ notifications, unseenCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch notifications.' });
  }
};

exports.getUnseenCount = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const unseenCount = await Notification.countDocuments({ user: authUserId, seen: false });
    res.json({ unseenCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch notification count.' });
  }
};

exports.markNotificationSeen = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: authUserId },
      { $set: { seen: true, seenAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update notification.' });
  }
};

exports.markAllNotificationsSeen = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    await Notification.updateMany(
      { user: authUserId, seen: false },
      { $set: { seen: true, seenAt: new Date() } }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update notifications.' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: authUserId });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification deleted.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to delete notification.' });
  }
};

exports.clearAllNotifications = async (req, res) => {
  try {
    const authUserId = resolveAuthUserId(req);
    if (!authUserId) {
      return res.status(401).json({ message: 'Unauthorized user context.' });
    }

    await Notification.deleteMany({ user: authUserId });
    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to clear notifications.' });
  }
};
