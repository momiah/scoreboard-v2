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
  getLadderCheckInProgress,
  getLadderMatchReference,
  hasUserCheckedIn,
  isLadderMatchCheckedIn,
  isValidLadderCheckInScan,
} from "@shared";
import type { LadderMatch } from "@shared/types";

import { LadderContext } from "../../context/LadderContext";
import { PopupContext } from "../../context/PopupContext";
import { buildCourtMapsUrl } from "../../helpers/courtMapsUrl";
import {
  CHECKIN_RADIUS_METERS,
  distanceInMeters,
  formatCourtAddress,
  getCourtCoords,
} from "../../helpers/locationCheckIn";
import type { Court } from "@shared/types";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const QR_SIZE = Math.min(screenWidth - 120, 240);
// Fixed height for the location verifier so the modal doesn't shrink when the
// tips / error content disappears on a successful check.
const VERIFIER_HEIGHT = Math.min(screenHeight * 0.62, 520);

// Always show the "checking" state for at least this long so a fast result
// (or an immediate failure) doesn't flash an error that looks broken.
const MIN_CHECK_MS = 1200;

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
  const { fetchLadderMatches } = useContext(LadderContext);

  const [status, setStatus] = useState<VerifyStatus>("checking");
  const [showCheckin, setShowCheckin] = useState(false);
  // The court we verify against. Defaults to the match prop, but each check
  // re-fetches the match so edits to its coordinates are picked up live.
  const [court, setCourt] = useState<Court>(match.court);
  // Bumped on each verify run so a stale/slow run can't overwrite a newer one
  // (e.g. the modal was reopened, or the user tapped "Check again").
  const runIdRef = useRef(0);

  const address = formatCourtAddress(court);

  const verify = async () => {
    const runId = ++runIdRef.current;
    setStatus("checking");
    const startedAt = Date.now();

    let result: VerifyStatus = "failed";
    try {
      // Re-fetch the match so we compare against the latest court coordinates
      // (the court is stored on the match, so a Firestore edit only shows up
      // after a fresh read). Fall back to the prop if the fetch fails.
      let targetCourt = match.court;
      try {
        const matches = await fetchLadderMatches(ladderId);
        const latest = matches.find(
          (m) => m.ladderMatchId === match.ladderMatchId,
        );
        if (latest?.court) {
          targetCourt = latest.court;
          setCourt(latest.court);
        }
      } catch (fetchError) {
        console.error("Error refreshing court for check-in:", fetchError);
      }

      const courtCoords = getCourtCoords(targetCourt);
      if (courtCoords) {
        const { granted } = await Location.requestForegroundPermissionsAsync();
        if (granted) {
          // Force a fresh, high-accuracy fix rather than a cached last-known
          // position, so moving/opening again re-checks the real location.
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          const device = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const distance = distanceInMeters(device, courtCoords);
          if (__DEV__) {
            console.log("[check-in] location verify", {
              device,
              court: courtCoords,
              distanceMeters: Math.round(distance),
              radiusMeters: CHECKIN_RADIUS_METERS,
            });
          }
          result = distance <= CHECKIN_RADIUS_METERS ? "verified" : "failed";
        }
      }
    } catch (error) {
      console.error("Error verifying check-in location:", error);
      result = "failed";
    }

    // Keep the spinner up for a minimum beat so the result never appears
    // instantly (which reads as a broken/error screen).
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_CHECK_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, MIN_CHECK_MS - elapsed),
      );
    }

    // Only apply the result if this is still the latest run.
    if (runIdRef.current === runId) {
      setStatus(result);
    }
  };

  // The flow is always verify-location → check-in, with NO persistence of the
  // location result: every open starts a fresh verification. This prevents a
  // player verifying at the court, leaving, then checking in later.
  useEffect(() => {
    if (visible) {
      setShowCheckin(false);
      verify();
    } else {
      // Closing resets everything and invalidates any in-flight verify, so a
      // stale "verified" state can never show on the next open.
      runIdRef.current++;
      setStatus("checking");
      setShowCheckin(false);
    }
  }, [visible, match.ladderMatchId]);

  const closeAll = () => {
    setShowCheckin(false);
    onClose();
  };

  const openMap = () =>
    Linking.openURL(buildCourtMapsUrl(court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );

  const verified = status === "verified";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeAll}
    >
      <ModalContainer>
        <VerifierContent testID="location-verifier-modal">
          <CloseButton onPress={closeAll} testID="location-verifier-close">
            <AntDesign name="close-circle" size={30} color="red" />
          </CloseButton>

          <VerifierBody
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              gap: 14,
              paddingVertical: 4,
              // Centre short states; top-align the tall failed state so its
              // support note stays scrollable/visible instead of being clipped.
              justifyContent: status === "failed" ? "flex-start" : "center",
            }}
          >
            {status === "checking" && (
              <StatusBlock testID="location-verifier-checking">
                <ActivityIndicator size="large" color="#00A2FF" />
                <SectionTitle>Checking your location…</SectionTitle>
                <Helper>Making sure you&apos;ve arrived at the court.</Helper>
              </StatusBlock>
            )}

            {verified && (
              <StatusBlock testID="location-verifier-verified">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={56}
                  color="#00C853"
                />
                <SectionTitle>You&apos;re at the venue</SectionTitle>
                <Helper>
                  Location confirmed — you can check in now below.
                </Helper>
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

            {status === "failed" && (
              <>
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
                <ErrorText style={{ color: "#71b5ffff" }}>
                  If you are sure you are in the right location and still cannot
                  check in, please play your games and send your scores to
                  support (Video evidence of your games are recommended).
                </ErrorText>
              </>
            )}
          </VerifierBody>

          <ActionButton
            testID="location-verifier-checkin"
            activeOpacity={0.85}
            disabled={!verified}
            isDisabled={!verified}
            onPress={() => verified && setShowCheckin(true)}
          >
            <ActionButtonText>Checkin</ActionButtonText>
          </ActionButton>
        </VerifierContent>
      </ModalContainer>

      {/* Nested so the check-in modal stacks ABOVE the verifier (which stays
            mounted underneath), matching the AddLeagueModal pattern. */}
      {showCheckin && (
        <MatchCheckinModal
          visible={showCheckin}
          onClose={closeAll}
          match={match}
          ladderId={ladderId}
          currentUserId={currentUserId}
          onCheckedIn={onCheckedIn}
        />
      )}
    </Modal>
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
  // The accepter's manual fallback: the code read out by the poster when the
  // QR can't be scanned.
  const [code, setCode] = useState("");
  // Live match, refreshed by the subscription so every device sees who has
  // checked in and when the match becomes complete.
  const [liveMatch, setLiveMatch] = useState<LadderMatch>(match);
  // Guards against the camera firing onBarcodeScanned repeatedly for one code.
  const handledRef = useRef(false);

  // Everyone checks in from their own device; games unlock only once all
  // participants are in. Derived live from the subscription.
  const selfCheckedIn =
    !!currentUserId && hasUserCheckedIn(liveMatch, currentUserId);
  const checkinComplete = isLadderMatchCheckedIn(liveMatch);
  const progress = getLadderCheckInProgress(liveMatch);

  // Reset transient state whenever the modal is (re)opened.
  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      setProcessing(false);
      setCode("");
      setLiveMatch(match);
    }
  }, [visible, match]);

  // Watch the match so both sides see check-ins land and the completion flip.
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = subscribeToLadderMatches(
      ladderId,
      (matches: LadderMatch[]) => {
        const updated = matches.find(
          (m) => m.ladderMatchId === match.ladderMatchId,
        );
        if (updated) setLiveMatch(updated);
      },
    );
    return unsubscribe;
  }, [visible, ladderId, match.ladderMatchId, subscribeToLadderMatches]);

  const finishAndClose = () => {
    onCheckedIn();
    onClose();
  };

  // Records the current user's own check-in. Shared by the scan, the manual
  // code, and the poster's automatic check-in on open.
  const recordCheckIn = async () => {
    if (handledRef.current || processing) return;
    if (!currentUserId) {
      showBottomToast("You need to be signed in to check in", "error");
      return;
    }
    // Fast-fail if the user isn't in this match (the write enforces this too,
    // but this gives immediate, clearer feedback to a non-participant).
    if (!match.participants.includes(currentUserId)) {
      showBottomToast("This code isn't for a match you're in", "error");
      return;
    }
    handledRef.current = true;
    setProcessing(true);

    const { success } = await checkInLadderMatch(
      ladderId,
      match.ladderMatchId,
      currentUserId,
    );
    setProcessing(false);
    // On success the subscription reflects the new state (self checked in, and
    // completion once everyone is in). handledRef stays set to stop re-scans.
    if (!success) {
      showBottomToast("Couldn't complete check-in. Please try again.", "error");
      handledRef.current = false;
    }
  };

  // The poster shows the QR but must also count as present — they reached this
  // screen through the location gate, so check them in automatically on open.
  useEffect(() => {
    if (visible && isPoster && !selfCheckedIn) {
      recordCheckIn();
    }
  }, [visible, isPoster]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (handledRef.current || processing) return;
    if (!isValidLadderCheckInScan(match, result.data)) {
      showBottomToast("That QR code is for a different match", "error");
      return;
    }
    recordCheckIn();
  };

  const handleSubmitCode = () => {
    if (processing) return;
    if (code.trim().toUpperCase() !== reference) {
      showBottomToast(
        "That code doesn't match. Check it with your opponent.",
        "error",
      );
      return;
    }
    recordCheckIn();
  };

  const renderPoster = () => (
    <>
      <PosterHeading>Show this QR code to all players</PosterHeading>
      <QRFrame>
        <QRCode value={qrValue} size={QR_SIZE} />
      </QRFrame>
      <WaitingRow testID="match-checkin-waiting">
        <Ionicons name="hourglass-outline" size={16} color="#9fb8c8" />
        <WaitingText>Waiting for the others to scan…</WaitingText>
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

          {checkinComplete ? (
            <SuccessBlock testID="match-checkin-success">
              <Ionicons
                name="checkmark-circle-outline"
                size={56}
                color="#00C853"
              />
              <SectionTitle>Checked in!</SectionTitle>
              <Helper>
                Everyone&apos;s checked in. The games are now unlocked.
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
          ) : selfCheckedIn && !isPoster ? (
            <SuccessBlock testID="match-checkin-waiting-self">
              <Ionicons
                name="checkmark-circle-outline"
                size={56}
                color="#00C853"
              />
              <SectionTitle>You&apos;re checked in</SectionTitle>
              <Helper>
                Waiting for the others… ({progress.checkedIn} of{" "}
                {progress.total} checked in). The games unlock once everyone is
                in.
              </Helper>
              <ActionButton
                testID="match-checkin-waiting-done"
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

              {isPoster ? (
                <EmergencyRow testID="match-checkin-reference">
                  <EmergencyLabel>
                    If your QR cannot be scanned, give this code to your
                    opponent
                  </EmergencyLabel>
                  <EmergencyCode>{reference}</EmergencyCode>
                </EmergencyRow>
              ) : (
                <EmergencyRow testID="match-checkin-reference">
                  <EmergencyLabel>
                    Can&apos;t scan? Enter the code from your opponent
                  </EmergencyLabel>
                  <CodeInputRow>
                    <CodeInput
                      value={code}
                      onChangeText={(text: string) =>
                        setCode(text.toUpperCase())
                      }
                      placeholder="CODE"
                      placeholderTextColor="#5b7183"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={reference.length}
                      editable={!processing}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmitCode}
                      testID="match-checkin-code-input"
                    />
                    <CodeSubmit
                      onPress={handleSubmitCode}
                      activeOpacity={0.85}
                      disabled={processing || code.trim().length === 0}
                      isDisabled={processing || code.trim().length === 0}
                      testID="match-checkin-code-submit"
                    >
                      <CodeSubmitText>Submit</CodeSubmitText>
                    </CodeSubmit>
                  </CodeInputRow>
                </EmergencyRow>
              )}
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

// Fixed-height verifier card: the body flexes/centres so shorter states
// (checking / verified) don't shrink the modal, and the button stays pinned
// to the bottom across every state.
const VerifierContent = styled(ModalContent)({
  height: VERIFIER_HEIGHT,
  justifyContent: "space-between",
});

// A ScrollView so the tallest state (failed: tips + support text) can scroll
// within the fixed height instead of clipping, while shorter states stay
// vertically centred.
const VerifierBody = styled.ScrollView.attrs({
  showsVerticalScrollIndicator: false,
})({
  flex: 1,
  alignSelf: "stretch",
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

const PosterHeading = styled(SectionTitle)({
  marginTop: 8,
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
  alignItems: "center",
  gap: 4,
});

const EmergencyLabel = styled.Text({
  color: "#7f97a8",
  fontSize: 11,
  textAlign: "center",
});

const EmergencyCode = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1.5,
  fontVariant: ["tabular-nums"],
});

const CodeInputRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 2,
});

const CodeInput = styled.TextInput({
  minWidth: 120,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "700",
  letterSpacing: 3,
  textAlign: "center",
});

const CodeSubmit = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const CodeSubmitText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "700",
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
