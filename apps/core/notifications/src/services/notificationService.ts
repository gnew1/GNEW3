
type Channel = "email" | "sms" | "inapp";

export async function sendNotification(
  userId: string,
  message: string,
  channel: Channel
) {
  // Mock service: in production, integrate with email/SMS APIs
  const notification = {
    userId,
    message,
    channel,
    timestamp: new Date().toISOString(),
  };

  console.log(`Notification sent:`, notification);
  return notification;
}


