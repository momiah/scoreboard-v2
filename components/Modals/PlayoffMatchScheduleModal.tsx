import React from "react";

import type { Ladder } from "@shared/types";
import AddLadderMatchModal from "./AddLadderMatchModal";
import type { PlayoffMatchSchedule } from "./AddLadderMatchModal";

interface PlayoffMatchScheduleModalProps extends PlayoffMatchSchedule {
  visible: boolean;
  onClose: () => void;
  ladder: Ladder;
}

const PlayoffMatchScheduleModal: React.FC<PlayoffMatchScheduleModalProps> = ({
  visible,
  onClose,
  ladder,
  ...playoff
}) => (
  <AddLadderMatchModal
    modalVisible={visible}
    setModalVisible={(open) => {
      if (!open) onClose();
    }}
    ladder={ladder}
    playoff={playoff}
  />
);

export default PlayoffMatchScheduleModal;
