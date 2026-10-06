import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';

const CHANNEL_ID = 'waiter-alerts';
const SERVICE_ID = 99;
const isNative = Capacitor.isNativePlatform();

let channelReady = false;

/**
 * Called once at app start. Creates the Android notification channel,
 * requests permissions, and starts the foreground service.
 */
export async function initNotifications() {
  if (!isNative) return;

  try {
    // 1. Create the notification channel
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Waiter Calls',
      description: 'Order-ready alerts for waiters',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#8B5CF6',
      sound: 'default',
    });

    // 2. Request notification permission (Android 13+)
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    channelReady = true;
    console.log('[notifications] channel ready');
  } catch (e) {
    console.warn('[notifications] init failed', e);
  }
}

/**
 * Start a foreground service. This keeps the app alive in the
 * background, even when the screen is off. Shows a persistent
 * (non-dismissible) notification in the status bar.
 */
export async function startForegroundService() {
  if (!isNative) return;

  try {
    // 3. Request battery optimization exemption
    //    (opens the system dialog "Allow app to run in background?")
    try {
      const isIgnoring = await ForegroundService.isIgnoringBatteryOptimizations?.();
      if (!isIgnoring) {
        await ForegroundService.requestIgnoreBatteryOptimizations?.();
      }
    } catch (e) {
      console.warn('[foreground] battery exemption failed', e);
    }

    // 4. Start the foreground service
    await ForegroundService.startForegroundService({
      id: SERVICE_ID,
      title: 'Safina Waiter',
      body: 'Listening for waiter calls…',
      smallIcon: 'ic_stat_icon_config_sample',
      importance: 2,     // 2 = low priority (silent, no heads-up)
      silent: true,      // no sound for the persistent notification
      ongoing: true,     // user cannot swipe it away
    });

    console.log('[foreground] service started');
  } catch (e) {
    console.warn('[foreground] start failed', e);
  }
}

export async function stopForegroundService() {
  if (!isNative) return;
  try {
    await ForegroundService.stopForegroundService();
    console.log('[foreground] service stopped');
  } catch (e) {
    console.warn('[foreground] stop failed', e);
  }
}

/**
 * Fire a heads-up notification for an incoming waiter call.
 */
export async function fireWaiterCall(call) {
  if (!isNative || !channelReady) return;

  try {
    await Haptics.vibrate({ duration: 800 });
  } catch {}

  let location = 'Ready';
  if (call.orderType === 'TABLE' && call.tableNumber) {
    location = `Table ${String(call.tableNumber).toUpperCase()}`;
  } else if (call.orderType === 'ROOM') {
    location = call.tableNumber ? `Room ${call.tableNumber}` : 'Room';
  } else if (call.orderType === 'DELIVERY') {
    location = 'Delivery';
  } else if (call.orderType === 'PICKUP') {
    location = 'Takeaway';
  }

  const body = `Order #${call.orderNumber} · ${location}`;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashToId(call.orderId),
          title: '🔔 Waiter Call',
          body,
          channelId: CHANNEL_ID,
          sound: 'default',
          ongoing: true,
          autoCancel: false,
          group: 'waiter-calls',
          groupSummary: false,
          extra: { orderId: call.orderId },
        },
      ],
    });
  } catch (e) {
    console.warn('[notifications] schedule failed', e);
  }
}

export async function clearWaiterNotifications() {
  if (!isNative) return;
  try {
    await LocalNotifications.removeAllDeliveredNotifications();
  } catch {}
}

export async function listenForNotificationTaps(callback) {
  if (!isNative) return () => {};

  const handle = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (event) => {
      try {
        const orderId = event?.notification?.extra?.orderId;
        if (orderId) callback(orderId);
      } catch {}
    }
  );

  return () => {
    handle?.remove?.();
  };
}

function hashToId(str) {
  if (!str) return Date.now() % 2147483647;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Re-fire the notification for an existing call so Android
 * re-plays its sound. Uses the SAME id so the notification
 * is replaced rather than duplicated.
 *
 * This is how we make the bell ring in the background —
 * Android plays the notification sound natively, and it works
 * even when the WebView is suspended.
 */
export async function ringWaiterBell(call) {
  if (!isNative || !channelReady) return;

  // Vibrate again (native, works in background)
  try {
    await Haptics.vibrate({ duration: 600 });
  } catch {}

  // Compute the location string once
  let location = 'Ready';
  if (call.orderType === 'TABLE' && call.tableNumber) {
    location = `Table ${String(call.tableNumber).toUpperCase()}`;
  } else if (call.orderType === 'ROOM') {
    location = call.tableNumber ? `Room ${call.tableNumber}` : 'Room';
  } else if (call.orderType === 'DELIVERY') {
    location = 'Delivery';
  } else if (call.orderType === 'PICKUP') {
    location = 'Takeaway';
  }

  const body = `Order #${call.orderNumber} · ${location}`;

  try {
    // Schedule a NEW notification with the SAME id.
    // Android replaces the old one → sound plays again.
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashToId(call.orderId),
          title: '🔔 Waiter Call',
          body,
          channelId: CHANNEL_ID,
          sound: 'default',
          ongoing: true,
          autoCancel: false,
          group: 'waiter-calls',
          extra: { orderId: call.orderId },
        },
      ],
    });
  } catch (e) {
    console.warn('[notifications] ring failed', e);
  }
}