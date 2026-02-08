import { notificationTypes } from "../schemas/schema";

// Notification type constants
const ACTION_TYPES = {
  INVITE: Object.values(notificationTypes.ACTION.INVITE),
  JOIN_REQUEST: Object.values(notificationTypes.ACTION.JOIN_REQUEST),
  ADD_GAME: Object.values(notificationTypes.ACTION.ADD_GAME),
};

// Flatten and lowercase all action types for easier checking
const allActionTypes = Object.values(notificationTypes.ACTION)
  .flatMap(Object.values)
  .map((t) => t.toLowerCase());

// Modal type enum
export const MODAL_TYPES = {
  INVITE: "invite",
  JOIN_REQUEST: "joinRequest",
  GAME_APPROVAL: "gameApproval",
  WELCOME: "welcome",
};

/**
 * Check if a notification type is an action type
 */
export const isActionType = (type) =>
  allActionTypes.includes(type.toLowerCase());

/**
 * Check if a notification type is a welcome type
 */
export const isWelcomeType = (type) =>
  type.toLowerCase() === notificationTypes.WELCOME.TYPE.toLowerCase();

/**
 * Determine which modal should be opened based on notification type
 */
export const getModalTypeForNotification = (type) => {
  if (ACTION_TYPES.INVITE.includes(type)) {
    return MODAL_TYPES.INVITE;
  }

  if (ACTION_TYPES.JOIN_REQUEST.includes(type)) {
    return MODAL_TYPES.JOIN_REQUEST;
  }

  if (type === notificationTypes.WELCOME.TYPE) {
    return MODAL_TYPES.WELCOME;
  }

  return MODAL_TYPES.GAME_APPROVAL;
};
