import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
// import { Alert, Platform } from 'react-native';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase.config';

export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    // console.log('Push notifications require a physical device');
    // Alert.alert('Error', 'Push notifications require a physical device.');
    return null;
  }

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    // console.log('Existing permission status:', existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      // console.log('Requested permission status:', finalStatus);
    }

    if (finalStatus !== 'granted') {
      // console.log('Push notification permission denied');
      // Alert.alert('Error', 'Please enable notifications in device settings.');
      return null;
    }

    // Get Expo push token
    let pushToken;
    try {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: '43db0104-f8f3-44de-b831-a74cd535baee',
      });
      // console.log('Push token response:', tokenResponse);
      // Alert.alert('Push Token Response', JSON.stringify(tokenResponse));

      // Handle different response structures
      if (tokenResponse && typeof tokenResponse === 'object') {
        if (tokenResponse.data) {
          pushToken = tokenResponse.data;
        } else if (tokenResponse.token) {
          pushToken = tokenResponse.token;
        } else {
          // console.error('Unexpected token response structure:', tokenResponse);
          // Alert.alert('Error', 'Invalid push token response structure.');
          return null;
        }
      } else {
        // console.error('Token response is not an object:', tokenResponse);
        // Alert.alert('Error', 'Failed to retrieve valid push token from Expo.');
        return null;
      }
      // console.log('Push token acquired:', pushToken);
    } catch (tokenError) {
      // console.error('getExpoPushTokenAsync error:', tokenError);
      // Alert.alert('Error', `Failed to get push token: ${tokenError.message}`);
      return null;
    }

    if (!userId || !pushToken) {
      // console.error('Invalid userId or push token:', { userId, pushToken });
      // Alert.alert('Error', `Invalid user ID or push token. UserId: ${userId}, Token: ${pushToken}`);
      return null;
    }

    // Verify user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      // console.error('User document missing:', userId);
      // Alert.alert('Error', 'User document not found in Firestore.');
      return null;
    }

    // Check existing tokens
    const existingTokens = userDoc.data().pushTokens || [];
    if (!existingTokens.includes(pushToken)) {
      await updateDoc(userRef, {
        pushTokens: arrayUnion(pushToken),
      });
      // console.log('Push token update requested for user:', userId);

      // Verify the write
      const updatedDoc = await getDoc(userRef);
      const updatedTokens = updatedDoc.data().pushTokens || [];
      if (updatedTokens.includes(pushToken)) {
        // console.log('Push token verified in Firestore:', pushToken);
        // Alert.alert('Success', `Push token registered: ${pushToken}`);
      } else {
        // console.error('Push token write failed:', pushToken);
        // Alert.alert('Error', 'Failed to save push token to Firestore.');
        return null;
      }
    } else {
      // console.log('Push token already registered:', userId);
      // Alert.alert('Info', 'Push token already registered.');
    }

    return pushToken;
  } catch (error) {
    // console.error('Push notification registration error:', error);
    // Alert.alert('Error', `Failed to register push token: ${error.message}`);
    return null;
  }
}
