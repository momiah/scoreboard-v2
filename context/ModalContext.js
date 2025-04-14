// ModalContext.js
import React, { createContext, useState, useCallback } from "react";

export const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);

  // Function to open the modal with a specific league
  const openModalWithLeague = useCallback((league) => {
    setSelectedLeague(league);
    setModalVisible(true);
  }, []);

  // Function to close the modal and reset the selected league
  const closeModal = useCallback(() => {
    setSelectedLeague(null);
    setModalVisible(false);
  }, []);

  return (
    <ModalContext.Provider
      value={{
        modalVisible,
        setModalVisible,
        selectedLeague,
        setSelectedLeague,
        openModalWithLeague,
        closeModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
