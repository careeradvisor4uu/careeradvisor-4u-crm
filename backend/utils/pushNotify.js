const webpush = require('web-push');
const cron = require('node-cron');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const Lead = require('../models/Lead');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const sendPush = async (subscription, payload) => {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: payload.title, body: payload.body, url: payload.url || '/' })
    );
    return true;
  } catch (err) {
    if (err.statusCode === 410) {
      await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
    }
    return false;
  }
};

const startNotificationScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const due = await Notification.find({
        sent: false,
        scheduledAt: { $lte: new Date() },
        type: 'callback'
      });

      for (const notif of due) {
        const sub = await PushSubscription.findOne({ userId: notif.userId });
        if (sub) {
          const lead = await Lead.findById(notif.leadId);
          const name = lead ? lead.name : 'a lead';
          const phone = lead ? lead.phone : '';
          await sendPush(sub.subscription, {
            title: `Callback due — ${name}`,
            body: `Time to call ${phone}. Tap to open.`,
            url: `/leads/${notif.leadId}`,
          });
        }
        notif.sent = true;
        await notif.save();
      }
    } catch (err) {
      console.error('Scheduler error:', err.message);
    }
  });
  console.log('Notification scheduler started');
};

module.exports = { sendPush, startNotificationScheduler };