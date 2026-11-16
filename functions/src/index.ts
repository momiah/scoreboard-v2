import * as admin from "firebase-admin";
import { autoApproveLeagueGames } from "./autoApproveLeagueGames";
import { distributeLeaguePrizes } from "./distributeLeaguePrizes";
import { broadcastNotification } from "./broadcastNotification";
import {
  distributeTournamentPrizes,
  distributeTournamentPrizesOnComplete,
} from "./distributeTournamentPrizes";
import { ogPreview } from "./ogPreview";
import { autoApproveTournamentGames } from "./autoApproveTournamentGames";
import { autoApproveLadderGames } from "./autoApproveLadderGames";
import { autoExpireLadderMatches } from "./autoExpireLadderMatches";
import { onLadderMatchStatusChange } from "./onLadderMatchStatusChange";
import { onLadderPrizePayoutReviewed } from "./onLadderPrizePayoutReviewed";
import { autoVoidLadderDisputes } from "./autoVoidLadderDisputes";
import { processLadderPhases } from "./processLadderPhases";
import { recordLadderArrival } from "./recordLadderArrival";
import { verifyLadderEligibility } from "./verifyLadderEligibility";
import { sendLadderMatchReminders } from "./sendLadderMatchReminders";
import { notifyOwnersToInvitePlayers } from "./notifyOwnersToInvitePlayers";
import { transcodeVideo } from "./transcodeVideo";
import { deleteVideo } from "./deleteVideo";
import { onVideoReported } from "./onVideoReported";
import { processLadderPreRegistrationLaunches } from "./processLadderPreRegistrationLaunches";
import {
  generateR2UploadUrl,
  updateGameVideoUrl,
  checkR2VideoExists,
} from "./videoFunctions";
import {
  checkEmailAvailable,
  checkUsernameAvailable,
} from "./signupAvailability";

admin.initializeApp();

export {
  distributeLeaguePrizes,
  broadcastNotification,
  distributeTournamentPrizes,
  distributeTournamentPrizesOnComplete,
  ogPreview,
  autoApproveLeagueGames,
  autoApproveTournamentGames,
  autoApproveLadderGames,
  autoExpireLadderMatches,
  onLadderMatchStatusChange,
  onLadderPrizePayoutReviewed,
  autoVoidLadderDisputes,
  processLadderPhases,
  recordLadderArrival,
  verifyLadderEligibility,
  sendLadderMatchReminders,
  notifyOwnersToInvitePlayers,
  generateR2UploadUrl,
  updateGameVideoUrl,
  checkR2VideoExists,
  transcodeVideo,
  deleteVideo,
  onVideoReported,
  processLadderPreRegistrationLaunches,
  checkEmailAvailable,
  checkUsernameAvailable,
};
