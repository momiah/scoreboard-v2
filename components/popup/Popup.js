import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const Popup = ({
  visible,
  message,
  onClose,
  type,
  buttonText = "Close",
  height = undefined,
}) => {
  if (!visible) return null;

  const iconName =
    type === "success"
      ? "checkmark-circle-outline"
      : type === "error"
      ? "alert-circle-outline"
      : "information-circle-outline";

  const iconColor =
    type === "success" ? "#00A2FF" : type === "error" ? "#FF0000" : "#FFA500";

  return (
    <PopupContainer>
      <PopupContent style={{ height: height }}>
        <Ionicons name={iconName} size={75} color={iconColor} />
        <MessageText>{message}</MessageText>
        <CloseButton onPress={onClose}>
          <ButtonText>{buttonText}</ButtonText>
        </CloseButton>
      </PopupContent>
    </PopupContainer>
  );
};

export default Popup;

const PopupContainer = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,

  // backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 60,
});

const PopupContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 30,
  width: 350,
  // height: 450,
  borderRadius: 10,
  alignItems: "center",
  justifyContent: "center",
});

const MessageText = styled.Text({
  fontSize: 18,
  marginBottom: 10,
  textAlign: "center",
  color: "#fff",
});

const CloseButton = styled.TouchableOpacity({
  backgroundColor: "#2196F3",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
  marginTop: 10,
});

const ButtonText = styled.Text({
  color: "#fff",
  fontSize: 16,
});

// import React from "react";
// import { TouchableOpacity, View, Text, Modal } from "react-native";
// import styled from "styled-components/native";

// const Popup = ({ visible, message, onClose }) => {
//   if (!visible) return null;

//   return (
//     <Modal
//       transparent={true}
//       animationType="fade"
//       visible={visible}
//       onRequestClose={() => setTooltipVisible(false)}
//     >
//       <TooltipContainer>
//         <TooltipContent>
//           <TooltipText>{message}</TooltipText>
//           <CloseButton onPress={onClose}>
//             <CloseButtonText>Close</CloseButtonText>
//           </CloseButton>
//         </TooltipContent>
//       </TooltipContainer>
//     </Modal>
//     // <PopupContainer>
//     //   <PopupContent>
//     //     <MessageText>{message}</MessageText>
//     //     <CloseButton onPress={onClose}>
//     //       <ButtonText>Close</ButtonText>
//     //     </CloseButton>
//     //   </PopupContent>
//     // </PopupContainer>
//   );
// };

// export default Popup;

// const TooltipContainer = styled.View({
//   flex: 1,
//   justifyContent: "center",
//   alignItems: "center",
//   backgroundColor: "rgba(0, 0, 0, 0.6)",
// });

// const TooltipContent = styled.View({
//   width: "80%",
//   backgroundColor: "#262626",
//   borderRadius: 12,
//   padding: 20,
//   alignItems: "center",
// });

// const TooltipText = styled.Text({
//   color: "#ffffff",
//   fontSize: 14,
//   marginBottom: 20,
//   textAlign: "center",
// });

// const CloseButton = styled.TouchableOpacity({
//   backgroundColor: "#00A2FF",
//   paddingVertical: 10,
//   paddingHorizontal: 20,
//   borderRadius: 8,
// });

// const CloseButtonText = styled.Text({
//   color: "#ffffff",
//   fontSize: 14,
//   fontWeight: "bold",
// });

// const PopupContainer = styled.View({
//   position: "absolute",
//   top: 0,
//   left: 0,
//   right: 0,
//   bottom: 0,

//   backgroundColor: "rgba(0, 0, 0, 0.5)",
//   justifyContent: "center",
//   alignItems: "center",
//   zIndex: 60,
// });

// const PopupContent = styled.View({
//   backgroundColor: "#fff",
//   padding: 20,
//   width: 300,
//   borderRadius: 10,
//   alignItems: "center",
// });

// const MessageText = styled.Text({
//   fontSize: 18,
//   marginBottom: 10,
//   textAlign: "center",
// });

// const CloseButton = styled.TouchableOpacity({
//   backgroundColor: "#2196F3",
//   paddingVertical: 10,
//   paddingHorizontal: 20,
//   borderRadius: 5,
//   alignItems: "center",
//   justifyContent: "center",
//   marginTop: 10,
// });

// const ButtonText = styled.Text({
//   color: "#fff",
//   fontSize: 16,
// });
