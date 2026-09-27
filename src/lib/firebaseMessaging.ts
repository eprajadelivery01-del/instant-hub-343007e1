import { registerPlugin } from '@capacitor/core';

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

interface ListenerHandle {
  remove: () => Promise<void>;
}

interface FirebaseNotification {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface FirebaseMessagingPlugin {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  getToken(): Promise<{ token: string }>;
  createChannel(options: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    visibility?: number;
    sound?: string;
    vibration?: boolean;
  }): Promise<void>;
  addListener(
    eventName: 'tokenReceived',
    listener: (event: { token: string }) => void,
  ): Promise<ListenerHandle>;
  addListener(
    eventName: 'apnsTokenReceived',
    listener: (event: { token: string }) => void,
  ): Promise<ListenerHandle>;
  addListener(
    eventName: 'notificationReceived',
    listener: (event: { notification: FirebaseNotification }) => void,
  ): Promise<ListenerHandle>;
  addListener(
    eventName: 'notificationActionPerformed',
    listener: (event: { notification: FirebaseNotification }) => void,
  ): Promise<ListenerHandle>;
}

// The native package remains installed and registered by Capacitor. Using the
// bridge directly keeps its web entry point out of the Vite dependency graph.
export const FirebaseMessaging = registerPlugin<FirebaseMessagingPlugin>('FirebaseMessaging');