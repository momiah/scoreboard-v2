import React, { createContext, useState } from "react";

const PopupContext = createContext();

const PopupProvider = ({ children }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [bottomToastVisible, setBottomToastVisible] = useState(false);
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [bottomToastType, setBottomToastType] = useState("success");

  const showBottomToast = (message, type = "success") => {
    setBottomToastMessage(message);
    setBottomToastType(type);
    setBottomToastVisible(true);
  };

  const handleShowPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
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
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export { PopupContext, PopupProvider };
