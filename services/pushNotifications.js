import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase.config';

export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    console.log('Push notifications only work on a real device');
    return;
  }

  try {
    //request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return;
    }

    // Get Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '43db0104-f8f3-44de-b831-a74cd535baee',
    });
    console.log('Push token acquired:', token.data);

    // Save to Firestore (multi-device safe)
    if (userId && token.data) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushTokens: arrayUnion(token.data), // Store as array
      });
      console.log('Push token saved for user:', userId);
    }

    return token.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return;
  }
}
