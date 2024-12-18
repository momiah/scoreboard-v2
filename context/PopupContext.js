import React, { createContext, useState } from "react";

const PopupContext = createContext();

const PopupProvider = ({ children }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

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
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export { PopupContext, PopupProvider };
