import React, { createContext, useState } from "react";

const PopupContext = createContext();

const PopupProvider = ({ children }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [bottomToastVisible, setBottomToastVisible] = useState(false);
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [bottomToastType, setBottomToastType] = useState("success");
  const [fullscreenVideo, setFullscreenVideo] = useState(null);

  const showBottomToast = (message, type = "success") => {
    setBottomToastMessage(message);
    setBottomToastType(type);
    setBottomToastVisible(true);
  };

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
  };

  const openFullscreenVideo = ({ videoUrl, startTime = 0 }) => {
    setFullscreenVideo({ videoUrl, startTime });
  };

  const closeFullscreenVideo = () => {
    setFullscreenVideo(null);
  };

  return (
    <PopupContext.Provider
      value={{
        showPopup,
        setShowPopup,
        popupMessage,
        handleShowPopup,
        setPopupMessage,
        bottomToastVisible,
        setBottomToastVisible,
        bottomToastMessage,
        bottomToastType,
        showBottomToast,
        fullscreenVideo,
        openFullscreenVideo,
        closeFullscreenVideo,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export { PopupContext, PopupProvider };
