const Notification = require('../models/Notification');

// Fire-and-forget helper: create a notification without ever throwing and
// breaking the calling flow (booking, registration, etc.) if it fails.
const notify = async ({ userId, type, title, message, link = '', metadata = {} }) => {
  if (!userId || !type || !title || !message) return null;
  try {
    return await Notification.create({ user: userId, type, title, message, link, metadata });
  } catch (error) {
    console.error('Unable to create notification:', error.message);
    return null;
  }
};

module.exports = { notify };
