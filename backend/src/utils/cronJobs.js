/**
 * CRON JOBS FOR SCHEDULED TASKS
 * Use node-cron or node-schedule for production
 * This file simulates scheduled tasks
 */

const Fee = require('../models/Fee.model');
const { sendEmail } = require('../services/email.service');
const { createNotification } = require('../services/notification.service');

/**
 * Send automated fee reminders
 * Should run daily
 */
const sendAutomatedFeeReminders = async () => {
  try {
    console.log('[CRON] Running automated fee reminders...');

    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find fees due in 3 days
    const upcomingFees = await Fee.find({
      status: { $in: ['pending', 'partially_paid'] },
      dueDate: {
        $gte: today,
        $lte: threeDaysFromNow,
      },
      sendReminders: true,
    })
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' },
      })
      .limit(50);

    let sentCount = 0;

    for (const fee of upcomingFees) {
      try {
        // Check if reminder already sent today
        const lastReminder = fee.remindersSent[fee.remindersSent.length - 1];
        if (lastReminder && isSameDay(lastReminder.sentAt, today)) {
          continue;
        }

        await sendEmail({
          to: fee.student.userId.email,
          subject: 'Fee Payment Reminder',
          text: `Dear ${fee.student.userId.name},\n\nThis is a reminder that your fee payment of ₹${fee.dueAmount} is due on ${fee.dueDate.toLocaleDateString()}.\n\nPlease make the payment before the due date to avoid late fees.\n\nThank you.`,
          html: `<p>Dear ${fee.student.userId.name},</p><p>This is a reminder that your fee payment of <strong>₹${fee.dueAmount}</strong> is due on <strong>${fee.dueDate.toLocaleDateString()}</strong>.</p><p>Please make the payment before the due date to avoid late fees.</p><p>Thank you.</p>`,
        });

        // Create in-app notification
        await createNotification(fee.student.userId._id, {
          type: 'warning',
          category: 'fee',
          title: 'Fee Payment Due Soon',
          message: `Your fee payment of ₹${fee.dueAmount} is due on ${fee.dueDate.toLocaleDateString()}`,
          priority: 'high',
          channels: { inApp: true, email: false },
        });

        fee.remindersSent.push({
          sentAt: new Date(),
          method: 'email',
        });
        await fee.save();

        sentCount++;
      } catch (error) {
        console.error(`Failed to send reminder for fee ${fee._id}:`, error);
      }
    }

    console.log(`[CRON] Sent ${sentCount} fee reminders`);
  } catch (error) {
    console.error('[CRON] Error in automated fee reminders:', error);
  }
};

/**
 * Mark overdue fees
 * Should run daily
 */
const markOverdueFees = async () => {
  try {
    console.log('[CRON] Marking overdue fees...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Fee.updateMany(
      {
        status: { $in: ['pending', 'partially_paid'] },
        dueDate: { $lt: today },
      },
      {
        $set: { status: 'overdue' },
      }
    );

    console.log(`[CRON] Marked ${result.modifiedCount} fees as overdue`);
  } catch (error) {
    console.error('[CRON] Error marking overdue fees:', error);
  }
};

/**
 * Apply late fees automatically
 * Should run daily
 */
const applyLateFees = async () => {
  try {
    console.log('[CRON] Applying late fees...');

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const overdueFees = await Fee.find({
      status: 'overdue',
      dueDate: { $lt: sevenDaysAgo },
      lateFee: 0,
    });

    let appliedCount = 0;

    for (const fee of overdueFees) {
      // Apply 2% late fee or minimum ₹500
      const calculatedLateFee = Math.max((fee.dueAmount * 0.02), 500);
      fee.lateFee = calculatedLateFee;
      await fee.save();
      appliedCount++;
    }

    console.log(`[CRON] Applied late fees to ${appliedCount} records`);
  } catch (error) {
    console.error('[CRON] Error applying late fees:', error);
  }
};

/**
 * Helper function to check if two dates are the same day
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Initialize all cron jobs
 * In production, use node-cron or node-schedule
 */
const initializeCronJobs = () => {
  // Example with setTimeout (replace with node-cron in production)
  
  // Run fee reminders daily at 9 AM
  // Schedule: '0 9 * * *'
  console.log('[CRON] Cron jobs initialized (simulated)');
  console.log('[CRON] - Fee reminders: Daily at 9:00 AM');
  console.log('[CRON] - Mark overdue: Daily at 12:00 AM');
  console.log('[CRON] - Apply late fees: Daily at 1:00 AM');
  
  // In production:
  // const cron = require('node-cron');
  // cron.schedule('0 9 * * *', sendAutomatedFeeReminders);
  // cron.schedule('0 0 * * *', markOverdueFees);
  // cron.schedule('0 1 * * *', applyLateFees);
};

module.exports = {
  sendAutomatedFeeReminders,
  markOverdueFees,
  applyLateFees,
  initializeCronJobs,
};
