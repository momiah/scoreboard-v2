interface NotificationData {
  [key: string]: unknown;
}

export interface Notification {
  recipientId: string;
  title?: string;
  message: string;
  type: string;
  createdAt: Date;
  isRead: boolean;
  senderId: string;
  response: string;
  data?: NotificationData;
  id?: string;
}
