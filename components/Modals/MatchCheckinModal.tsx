import React, { useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Linking, Modal } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AntDesign } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Location from "expo-location";

import {
  buildLadderCheckInPayload,
  getLadderMatchReference,
  isLadderMatchCheckedIn,
  isValidLadderCheckInScan,
} from "@shared";
import type { LadderMatch } from "@shared/types";

import { LadderContext } from "../../context/LadderContext";
import { PopupContext } from "../../context/PopupContext";
import { buildCourtMapsUrl } from "../../helpers/courtMapsUrl";
import {
  formatCourtAddress,
  getCourtCoords,
  isWithinCheckInRadius,
} from "../../helpers/locationCheckIn";

const screenWidth = Dimensions.get("window").width;
const QR_SIZE = Math.min(screenWidth - 120, 240);

// Shown on the location step so players know how to get verified.
const CHECKIN_TIPS = [
  "Make sure you've actually arrived at the court.",
  "Turn your device location / GPS on and allow access.",
  "Turn off any VPN — it can place you in the wrong location.",
];

/* -------------------------------------------------------------------------- */
/*  Location verifier — the entry point for check-in                          */
/* -------------------------------------------------------------------------- */

type VerifyStatus = "checking" | "verified" | "failed";

interface LocationVerifierModalProps {
  visible: boolean;
  onClose: () => void;
  match: LadderMatch;
  ladderId: string;
  currentUserId?: string;
  // Called once check-in is persisted (via the check-in modal opened from here).
  onCheckedIn: () => void;
}

export const LocationVerifierModal: React.FC<LocationVerifierModalProps> = ({
  visible,
  onClose,
  match,
  ladderId,
  currentUserId,
  onCheckedIn,
}) => {
  const [status, setStatus] = useState<VerifyStatus>("checking");
  const [showCheckin, setShowCheckin] = useState(false);

  const address = formatCourtAddress(match.court);

  const verify = async () => {
    setStatus("checking");
    try {
      // The court must have coordinates to verify against.
      if (!getCourtCoords(match.court)) {
        setStatus("failed");
        return;
      }

      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus("failed");
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const withinRange = isWithinCheckInRadius(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        match.court,
      );
      setStatus(withinRange ? "verified" : "failed");
    } catch (error) {
      console.error("Error verifying check-in location:", error);
      setStatus("failed");
    }
  };

  // Verify whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setShowCheckin(false);
      verify();
    }
  }, [visible, match.ladderMatchId]);

  const closeAll = () => {
    setShowCheckin(false);
    onClose();
  };

  const openMap = () =>
    Linking.openURL(buildCourtMapsUrl(match.court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );

  const verified = status === "verified";

  return (
    <>
      <Modal
        visible={visible && !showCheckin}
        transparent
        animationType="slide"
        onRequestClose={closeAll}
      >
        <ModalContainer>
          <ModalContent testID="location-verifier-modal">
            <CloseButton onPress={closeAll} testID="location-verifier-close">
              <AntDesign name="close-circle" size={30} color="red" />
            </CloseButton>

            {status === "checking" && (
              <StatusBlock testID="location-verifier-checking">
                <ActivityIndicator size="large" color="#00A2FF" />
                <SectionTitle>Checking your location…</SectionTitle>
                <Helper>Making sure you&apos;ve arrived at the court.</Helper>
              </StatusBlock>
            )}

            {verified && (
              <StatusBlock testID="location-verifier-verified">
                <Ionicons name="checkmark-circle" size={56} color="#00C853" />
                <SectionTitle>You&apos;re at the venue</SectionTitle>
                <Helper>Location confirmed — you can check in now.</Helper>
              </StatusBlock>
            )}

            {status === "failed" && (
              <StatusBlock testID="location-verifier-failed">
                <Ionicons name="location-outline" size={48} color="#FF4B6E" />
                <SectionTitle>Location not verified</SectionTitle>
                <ErrorText>
                  You are not in the right location to check in, please ensure
                  you have arrived at the correct address
                </ErrorText>
                {!!address && (
                  <AddressLink
                    onPress={openMap}
                    testID="location-verifier-address"
                    activeOpacity={0.7}
                  >
                    <AddressLinkText numberOfLines={2}>
                      {address}
                    </AddressLinkText>
                    <Ionicons name="open-outline" size={14} color="#00A2FF" />
                  </AddressLink>
                )}
                <RetryButton
                  onPress={verify}
                  activeOpacity={0.8}
                  testID="location-verifier-retry"
                >
                  <Ionicons name="refresh" size={16} color="#00A2FF" />
                  <RetryText>Check again</RetryText>
                </RetryButton>
              </StatusBlock>
            )}

            {!verified && (
              <TipsCard>
                <TipsTitle>Tips to check in</TipsTitle>
                {CHECKIN_TIPS.map((tip) => (
                  <TipRow key={tip}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={14}
                      color="#9fb8c8"
                    />
                    <TipText>{tip}</TipText>
                  </TipRow>
                ))}
              </TipsCard>
            )}

            <ErrorText style={{ color: "#71b5ffff" }}>
              If you are sure you are in the right location and still cannot
              check in, please play your games and send your scores to support
              (Video evidence of your games are recommended).
            </ErrorText>

            <ActionButton
              testID="location-verifier-checkin"
              activeOpacity={0.85}
              disabled={!verified}
              isDisabled={!verified}
              onPress={() => verified && setShowCheckin(true)}
            >
              <ActionButtonText>Checkin</ActionButtonText>
            </ActionButton>
          </ModalContent>
        </ModalContainer>
      </Modal>

      <MatchCheckinModal
        visible={visible && showCheckin}
        onClose={closeAll}
        match={match}
        ladderId={ladderId}
        currentUserId={currentUserId}
        onCheckedIn={onCheckedIn}
      />
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*  Check-in modal — poster shows QR, accepter scans                          */
/* -------------------------------------------------------------------------- */

interface MatchCheckinModalProps {
  visible: boolean;
  onClose: () => void;
  match: LadderMatch;
  ladderId: string;
  currentUserId?: string;
  // Called once check-in is persisted (accepter scans, or poster's screen sees
  // the persisted handshake). The parent refreshes the match and unlocks games.
  onCheckedIn: () => void;
}

const MatchCheckinModal: React.FC<MatchCheckinModalProps> = ({
  visible,
  onClose,
  match,
  ladderId,
  currentUserId,
  onCheckedIn,
}) => {
  const { checkInLadderMatch, subscribeToLadderMatches } =
    useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);
  const [permission, requestPermission] = useCameraPermissions();

  const isPoster = !!currentUserId && currentUserId === match.createdBy;
  const reference = getLadderMatchReference(match.ladderMatchId);
  const qrValue = JSON.stringify(buildLadderCheckInPayload(match));

  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  // Guards against the camera firing onBarcodeScanned repeatedly for one code.
  const handledRef = useRef(false);

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      setProcessing(false);
      setSucceeded(false);
    }
  }, [visible]);

  // Poster waits for the accepter's scan: watch the persisted state and finish
  // when the handshake completes.
  useEffect(() => {
    if (!visible || !isPoster) return;
    const unsubscribe = subscribeToLadderMatches(
      ladderId,
      (matches: LadderMatch[]) => {
        const updated = matches.find(
          (m) => m.ladderMatchId === match.ladderMatchId,
        );
        if (updated && isLadderMatchCheckedIn(updated) && !handledRef.current) {
          handledRef.current = true;
          setSucceeded(true);
        }
      },
    );
    return unsubscribe;
  }, [
    visible,
    isPoster,
    ladderId,
    match.ladderMatchId,
    subscribeToLadderMatches,
  ]);

  const finishAndClose = () => {
    onCheckedIn();
    onClose();
  };

  const handleScan = async (result: BarcodeScanningResult) => {
    if (handledRef.current || processing) return;

    if (!isValidLadderCheckInScan(match, result.data)) {
      showBottomToast("That QR code is for a different match", "error");
      return;
    }

    handledRef.current = true;
    setProcessing(true);
    if (!currentUserId) {
      showBottomToast("You need to be signed in to check in", "error");
      handledRef.current = false;
      setProcessing(false);
      return;
    }

    const { success } = await checkInLadderMatch(
      ladderId,
      match.ladderMatchId,
      currentUserId,
    );
    setProcessing(false);
    if (success) {
      setSucceeded(true);
    } else {
      showBottomToast("Couldn't complete check-in. Please try again.", "error");
      handledRef.current = false;
    }
  };

  const renderPoster = () => (
    <>
      <QRFrame>
        <QRCode value={qrValue} size={QR_SIZE} />
      </QRFrame>
      <WaitingRow testID="match-checkin-waiting">
        <Ionicons name="hourglass-outline" size={16} color="#9fb8c8" />
        <WaitingText>Waiting for your opponent to scan…</WaitingText>
      </WaitingRow>
    </>
  );

  const renderScanner = () => {
    if (!permission) {
      return <Helper>Checking camera permission…</Helper>;
    }
    if (!permission.granted) {
      return (
        <PermissionBlock>
          <Ionicons name="camera-outline" size={40} color="#00A2FF" />
          <SectionTitle>Camera access needed</SectionTitle>
          <Helper>
            Allow camera access to scan your opponent&apos;s check-in code.
          </Helper>
          <ActionButton
            testID="match-checkin-grant-permission"
            activeOpacity={0.85}
            isDisabled={false}
            onPress={requestPermission}
          >
            <ActionButtonText>Allow Camera</ActionButtonText>
          </ActionButton>
        </PermissionBlock>
      );
    }
    return (
      <>
        <SectionTitle>Scan your opponent&apos;s code</SectionTitle>
        <Helper>Point your camera at the QR code on their screen.</Helper>
        <ScannerFrame>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={processing ? undefined : handleScan}
            testID="match-checkin-camera"
          />
          {processing && (
            <ScannerOverlay>
              <WaitingText>Checking in…</WaitingText>
            </ScannerOverlay>
          )}
        </ScannerFrame>
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ModalContainer>
        <ModalContent testID="match-checkin-modal">
          <CloseButton onPress={onClose} testID="match-checkin-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          {succeeded ? (
            <SuccessBlock testID="match-checkin-success">
              <Ionicons
                name="checkmark-circle-outline"
                size={56}
                color="#00C853"
              />
              <SectionTitle>Checked in!</SectionTitle>
              <Helper>
                You&apos;re both checked in. The games are now unlocked.
              </Helper>
              <ActionButton
                testID="match-checkin-done"
                activeOpacity={0.85}
                isDisabled={false}
                onPress={finishAndClose}
              >
                <ActionButtonText>Done</ActionButtonText>
              </ActionButton>
            </SuccessBlock>
          ) : (
            <>
              {isPoster ? renderPoster() : renderScanner()}

              <EmergencyRow testID="match-checkin-reference">
                <EmergencyLabel>Emergency code</EmergencyLabel>
                <EmergencyCode>{reference}</EmergencyCode>
              </EmergencyRow>
            </>
          )}
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

export default MatchCheckinModal;

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  width: screenWidth - 40,
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderRadius: 16,
  padding: 24,
  alignItems: "center",
  gap: 14,
});

const CloseButton = styled.TouchableOpacity({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 10,
  padding: 2,
});

const SectionTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
  textAlign: "center",
});

const Helper = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "center",
});

const StatusBlock = styled.View({
  alignItems: "center",
  gap: 10,
  paddingTop: 8,
});

const ErrorText = styled.Text({
  color: "#FF4B6E",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "left",
});

const AddressLink = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  backgroundColor: "rgba(0, 162, 255, 0.08)",
});

const AddressLinkText = styled.Text({
  color: "#00A2FF",
  fontSize: 13,
  fontWeight: "600",
  flexShrink: 1,
  textAlign: "left",
});

const RetryButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  paddingVertical: 14,
});

const RetryText = styled.Text({
  color: "#00A2FF",
  fontSize: 13,
  fontWeight: "600",
});

const TipsCard = styled.View({
  alignSelf: "stretch",
  gap: 8,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
});

const TipsTitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 0.6,
  textTransform: "uppercase",
});

const TipRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 8,
});

const TipText = styled.Text({
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 17,
  flexShrink: 1,
});

const QRFrame = styled.View({
  padding: 16,
  borderRadius: 16,
  backgroundColor: "#ffffff",
});

const ScannerFrame = styled.View({
  width: QR_SIZE + 32,
  height: QR_SIZE + 32,
  borderRadius: 16,
  overflow: "hidden",
  backgroundColor: "#000000",
  borderWidth: 2,
  borderColor: "#00A2FF",
});

const ScannerOverlay = styled.View({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.55)",
});

const PermissionBlock = styled.View({
  alignItems: "center",
  gap: 12,
});

const WaitingRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const WaitingText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  fontWeight: "600",
});

// Small, subtle fallback — the QR/scan is the primary path; the reference is
// only for emergencies (e.g. a camera that won't scan).
const EmergencyRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
});

const EmergencyLabel = styled.Text({
  color: "#7f97a8",
  fontSize: 11,
});

const EmergencyCode = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1.5,
  fontVariant: ["tabular-nums"],
});

const SuccessBlock = styled.View({
  alignItems: "center",
  gap: 12,
  paddingVertical: 8,
});

const ActionButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    alignSelf: "stretch",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const ActionButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
