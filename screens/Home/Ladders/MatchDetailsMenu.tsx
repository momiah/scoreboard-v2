import React, { useContext, useEffect, useState } from "react";
import { View, Linking, StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import moment from "moment";

import { getLadderMatchChangeOption } from "@shared/helpers";
import type { LadderMatch, LadderType } from "@shared/types";

import { PopupContext } from "../../../context/PopupContext";
import { UserContext } from "../../../context/UserContext";
import { LadderContext } from "../../../context/LadderContext";
import { useLadderMatchCancellation } from "../../../hooks/useLadderMatchCancellation";
import { useLadderMatchChanges } from "../../../hooks/useLadderMatchChanges";
import {
  LADDER_MATCH_CANCEL_ACTION,
  canExtendLadderMatch,
  getLadderMatchCancelAction,
  getLadderMatchRescheduleAction,
} from "../../../helpers/ladderMatchCancellation";
import ReportPlayerModal from "../../../components/Modals/ReportPlayerModal";
import InfoModal from "../../../components/Modals/InfoModal";
import ScheduleMatchModal from "../../../components/Modals/ScheduleMatchModal";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const SUPPORT_EMAIL = "support@courtchamps.com";
const MODAL_HANDOFF_MS = 350;

type MatchMenuAction =
  | "LadderRules"
  | "LadderTerms"
  | "RescheduleMatch"
  | "Extension"
  | "Report"
  | "Support"
  | "CancelMatch";

interface MatchDetailsMenuParams {
  ladderId: string;
  matchId: string;
  match?: LadderMatch;
  ladderType?: LadderType;
}

interface MenuOption {
  label: string;
  icon: IoniconName;
  action: MatchMenuAction;
  color?: string;
  disabled?: boolean;
}

const MUTED = "#9fb8c8";

const CANCEL_OPTION: MenuOption = {
  label: "Cancel Match",
  icon: "close-circle-outline",
  action: "CancelMatch",
  color: "#FF4B6E",
};

const MatchDetailsMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, MatchDetailsMenuParams>, string>>();
  const { ladderId, matchId, match } = route.params;
  const { showBottomToast } = useContext(PopupContext);
  const { currentUser } = useContext(UserContext);
  const { fetchLadderMatchDeadline } = useContext(LadderContext);
  const { startCancellation } = useLadderMatchCancellation();
  const { requestReschedule, extendMatch } = useLadderMatchChanges();
  const [reportVisible, setReportVisible] = useState(false);
  const [infoModal, setInfoModal] = useState<"reschedule" | "extension" | null>(
    null,
  );
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);

  const userId: string | undefined = currentUser?.userId;
  const isParticipant = !!userId && !!match?.participants?.includes(userId);

  useEffect(() => {
    if (!match || !isParticipant) return;
    let active = true;
    fetchLadderMatchDeadline(ladderId, match).then((date) => {
      if (active) setDeadline(date);
    });
    return () => {
      active = false;
    };
  }, [fetchLadderMatchDeadline, isParticipant, ladderId, match]);

  const cancelAction = getLadderMatchCancelAction(match, userId);
  const rescheduleAction = getLadderMatchRescheduleAction(match, userId);

  const cancelOption = (): MenuOption => {
    if (cancelAction === LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE) {
      return {
        ...CANCEL_OPTION,
        label: "Cancellation requested",
        icon: "time-outline",
        color: MUTED,
        disabled: true,
      };
    }
    if (cancelAction === LADDER_MATCH_CANCEL_ACTION.RESPOND) {
      return {
        ...CANCEL_OPTION,
        label: "Respond to request",
        icon: "alert-circle-outline",
        color: "#f5c451",
      };
    }
    return CANCEL_OPTION;
  };

  const changeOption = (): MenuOption | null => {
    const base = { icon: "calendar-outline" as IoniconName, action: "RescheduleMatch" as const };
    switch (rescheduleAction) {
      case LADDER_MATCH_CANCEL_ACTION.REQUEST:
        return { ...base, label: "Reschedule Match" };
      case LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE:
        return {
          ...base,
          label: "Reschedule requested",
          icon: "time-outline",
          color: MUTED,
          disabled: true,
        };
      case LADDER_MATCH_CANCEL_ACTION.RESPOND:
        return {
          ...base,
          label: "Respond to reschedule",
          icon: "alert-circle-outline",
          color: "#f5c451",
        };
      default:
        break;
    }
    if (canExtendLadderMatch(match, userId)) {
      return { label: "Request Extension", icon: "hourglass-outline", action: "Extension" };
    }
    if (isParticipant && match && getLadderMatchChangeOption(match) === "extended") {
      return {
        label: "Already extended",
        icon: "hourglass-outline",
        action: "Extension",
        color: MUTED,
        disabled: true,
      };
    }
    return null;
  };

  const options: MenuOption[] = [
    { label: "Rules", icon: "book-outline", action: "LadderRules" },
    {
      label: "Terms & Conditions",
      icon: "document-text-outline",
      action: "LadderTerms",
    },
    ...[changeOption()].filter((option): option is MenuOption => !!option),
    { label: "Report a Player", icon: "flag-outline", action: "Report" },
    { label: "Support", icon: "help-buoy-outline", action: "Support" },
    cancelOption(),
  ];

  const handleReschedule = () => {
    if (rescheduleAction === LADDER_MATCH_CANCEL_ACTION.RESPOND) {
      showBottomToast(
        "Your opponent has asked to move this match. Respond on the match screen.",
        "info",
      );
      return;
    }
    setInfoModal("reschedule");
  };

  const handleChooseTime = () => {
    setInfoModal(null);
    setTimeout(() => setScheduleVisible(true), MODAL_HANDOFF_MS);
  };

  const handleExtend = async () => {
    if (!match) return;
    setInfoModal(null);
    if (await extendMatch({ ladderId, match })) navigation.goBack();
  };

  const handleCancel = () => {
    if (!match) {
      showBottomToast("Open the match to cancel it", "info");
      return;
    }
    startCancellation({ ladderId, match, onDone: () => navigation.goBack() });
  };

  const handleSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch((err) =>
      console.error("Error opening support email:", err),
    );
  };

  const handlePress = (option: MenuOption) => {
    if (option.disabled) return;
    switch (option.action) {
      case "LadderRules":
      case "LadderTerms":
        navigation.navigate(option.action, { ladderId });
        return;
      case "RescheduleMatch":
        handleReschedule();
        return;
      case "Extension":
        setInfoModal("extension");
        return;
      case "Report":
        if (!match) {
          showBottomToast("Open the match to report a player", "info");
          return;
        }
        setReportVisible(true);
        return;
      case "Support":
        handleSupport();
        return;
      case "CancelMatch":
        handleCancel();
        return;
      default:
        return;
    }
  };

  const playoffDeadlineText =
    match?.playoffTieId && deadline
      ? ` This playoff game must be finished by ${moment(deadline).format("ddd D MMM")}.`
      : "";

  return (
    <Container>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="match-menu-back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle>Match Options</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {options.map((option) => (
          <MenuItem
            key={option.action}
            onPress={() => handlePress(option)}
            testID={`match-menu-${option.action}`}
            activeOpacity={option.disabled ? 1 : 0.2}
            style={{ opacity: option.disabled ? 0.6 : 1 }}
          >
            <LeftContainer>
              <Ionicons
                name={option.icon}
                size={20}
                color={option.color ?? "white"}
              />
              <MenuText style={{ color: option.color ?? "white" }}>
                {option.label}
              </MenuText>
            </LeftContainer>
            {!option.disabled && (
              <Ionicons name="chevron-forward" size={18} color="#666" />
            )}
          </MenuItem>
        ))}
      </MenuList>

      {match && (
        <ReportPlayerModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          ladderId={ladderId}
          match={match}
          currentUserId={userId}
        />
      )}

      <InfoModal
        visible={infoModal === "reschedule"}
        onClose={() => setInfoModal(null)}
        title="Reschedule match"
        description="Propose a new date and time. Your opponent can accept or decline, and the match stays as it is until they accept."
        ctaLabel="Choose a time"
        onCtaPress={handleChooseTime}
        icon="calendar-outline"
        testID="reschedule-info-modal"
      />

      <InfoModal
        visible={infoModal === "extension"}
        onClose={() => setInfoModal(null)}
        title="Request extension"
        description={`Get 7 more days to finish this match. It applies straight away, and each match can be extended once.${playoffDeadlineText}`}
        ctaLabel="Extend match"
        onCtaPress={handleExtend}
        icon="hourglass-outline"
        testID="extension-info-modal"
      />

      {match && (
        <ScheduleMatchModal
          visible={scheduleVisible}
          onClose={() => setScheduleVisible(false)}
          title="Reschedule match"
          courtName={match.court?.courtName ?? ""}
          deadline={deadline}
          submitLabel="Send to opponent"
          testID="reschedule-match"
          onSubmit={async (time) => {
            const failure = await requestReschedule({ ladderId, match, ...time });
            if (!failure) setTimeout(() => navigation.goBack(), MODAL_HANDOFF_MS);
            return failure;
          }}
        />
      )}
    </Container>
  );
};

export default MatchDetailsMenu;

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const BackButton = styled.TouchableOpacity({});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const MenuList = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  paddingVertical: 10,
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const LeftContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 15,
});

const MenuText = styled.Text({
  color: "white",
  fontSize: 16,
});
