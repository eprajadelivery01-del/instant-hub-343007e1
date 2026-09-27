import { registerPlugin } from '@capacitor/core';

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

interface ListenerHandle {
  remove: () => Promise<void>;
}

interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance?: number;
  visibility?: number;
  vibration?: boolean;
  sound?: string;
}

interface LocalNotification {
  title: string;
  body: string;
  id: number;
  channelId?: string;
  smallIcon?: string;
  iconColor?: string;
  sound?: string;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
}

interface LocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: PermissionState }>;
  requestPermissions(): Promise<{ display: PermissionState }>;
  createChannel(channel: NotificationChannel): Promise<void>;
  schedule(options: { notifications: LocalNotification[] }): Promise<unknown>;
  addListener(
    eventName: 'localNotificationActionPerformed',
    listener: (action: { notification?: { extra?: Record<string, unknown> } }) => void,
  ): Promise<ListenerHandle>;
}

// Capacitor registers the installed native implementation. Keeping the web
// package entry out of Vite avoids transient resolution failures after install.
export const LocalNotifications = registerPlugin<LocalNotificationsPlugin>('LocalNotifications');