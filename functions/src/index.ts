import * as admin from "firebase-admin";
import { autoApproveLeagueGames } from "./autoApproveLeagueGames";
import { distributeLeaguePrizes } from "./distributeLeaguePrizes";
import { broadcastNotification } from "./broadcastNotification";
import { distributeTournamentPrizes } from "./distributeTournamentPrizes";
import { ogPreview } from "./ogPreview";
import { autoApproveTournamentGames } from "./autoApproveTournamentGames";
import { notifyOwnersToInvitePlayers } from "./notifyOwnersToInvitePlayers";
import { transcodeVideo } from "./transcodeVideo";
import {
  generateR2UploadUrl,
  updateGameVideoUrl,
  checkR2VideoExists,
} from "./videoFunctions";

admin.initializeApp();

export {
  distributeLeaguePrizes,
  broadcastNotification,
  distributeTournamentPrizes,
  ogPreview,
  autoApproveLeagueGames,
  autoApproveTournamentGames,
  notifyOwnersToInvitePlayers,
  generateR2UploadUrl,
  updateGameVideoUrl,
  checkR2VideoExists,
  transcodeVideo,
};
