import {
  CompetitionType,
  CollectionName,
  PlayingTime,
  PendingInvites,
  ScoreboardProfile,
  PendingRequests,
  Court,
} from "@shared";

import {
  UserProfile,
  League,
  Tournament,
  Club,
  Player,
  Fixtures,
  Game,
  TeamStats,
} from "@shared";

interface PendingRequestCompetition {
  id: string;
  collectionName: CollectionName;
  pendingRequests?: PendingRequests[];
}

export interface LeagueContextType {
  // Playtime Management
  addPlaytime: (params: {
    playtime: PlayingTime[];
    existingPlaytime?: PlayingTime | null;
    competitionType: CompetitionType;
    competitionId: string;
  }) => Promise<void>;

  deletePlaytime: (params: {
    playtimeToDelete: PlayingTime;
    competitionType: CompetitionType;
    competitionId: string;
  }) => Promise<void>;

  // Competition Data Management
  addCompetition: (params: {
    data: League & Tournament;
    competitionType: CompetitionType;
    resetDelayMs?: number;
  }) => Promise<void>;

  addClub: (params: {
    data: Club;
    ownerParticipant: Player;
  }) => Promise<void>;

  updateCompetition: (params: {
    competition: League | Tournament;
    collectionName: CollectionName;
  }) => Promise<void>;

  fetchLeagues: (options?: object) => Promise<League[]>;

  fetchUpcomingLeagues: () => Promise<void>;

  fetchCompetitionById: (_: {
    competitionId: string;
    collectionName: CollectionName;
  }) => Promise<League | Tournament | null>;

  getCourts: () => Promise<Court[]>;

  addCourt: (courtData: Court) => Promise<string>;
  updatePendingInvites: (
    competitionId: string,
    userId: string,
    collectionName: CollectionName,
  ) => Promise<boolean>;
  getPendingInviteUsers: (competition: {
    pendingInvites?: PendingInvites[];
  }) => Promise<UserProfile[]>;
  removePendingInvite: (
    competitionId: string,
    userId: string,
    collectionName: CollectionName,
  ) => Promise<void>;
  assignCompetitionAdmin: (params: {
    competitionId: string;
    collectionName: string;
    user: { userId: string; username: string };
  }) => Promise<void>;
  revokeCompetitionAdmin: (params: {
    competitionId: string;
    collectionName: string;
    userId: string;
  }) => Promise<void>;
  fetchUserPendingRequests: (
    userId: string,
  ) => Promise<PendingRequestCompetition[]>;
  withdrawJoinRequest: (params: {
    competitionId: string;
    userId: string;
    collectionName?: CollectionName;
  }) => Promise<void>;
  sendChatMessage: (params: {
    message: {
      text: string;
      createdAt: Date;
      user: { _id: string; name: string; avatar?: string };
    };
    competitionId: string;
    competitionType?: string;
  }) => Promise<void>;

  // League State
  upcomingLeagues: League[];
  leagueById: League | null;
  leagueNavigationId: string;
  setLeagueNavigationId: (id: string) => void;

  // Club State
  clubById: Club | null;
  clubNavigationId: string;
  fetchClubById: (clubId: string) => Promise<Club | null>;
  upcomingClubs: Club[];
  upcomingClubsLoading: boolean;
  fetchUpcomingClubs: () => Promise<void>;
  handleLeagueDescription: (newDescription: string) => Promise<void>;
  removePlayerFromCompetition: (params: {
    competitionId: string;
    collectionName: string;
    userId: string;
    reason: string;
  }) => Promise<void>;
  acceptCompetitionInvite: (params: {
    userId: string;
    competitionId: string;
    notificationId: string;
    collectionName: CollectionName;
  }) => Promise<void>;
  declineCompetitionInvite: (params: {
    userId: string;
    competitionId: string;
    notificationId: string;
    collectionName: CollectionName;
  }) => Promise<void>;
  requestToJoinLeague: (params: {
    competitionId: string;
    currentUser: UserProfile;
    ownerId: string;
    collectionName: CollectionName;
  }) => Promise<boolean>;
  acceptCompetitionJoinRequest: (params: {
    senderId: string;
    competitionId: string;
    notificationId: string;
    userId: string;
    collectionName: CollectionName;
  }) => Promise<void>;
  declineCompetitionJoinRequest: (params: {
    senderId: string;
    competitionId: string;
    notificationId: string;
    userId: string;
    collectionName: CollectionName;
  }) => Promise<void>;
  approveGame: (params: {
    gameId: string;
    competitionId: string;
    userId: string;
    senderId: string;
    notificationId: string;
    notificationType: string;
    videoApproved?: boolean;
  }) => Promise<void>;
  declineGame: (params: {
    gameId: string;
    competitionId: string;
    userId: string;
    senderId: string;
    notificationId: string;
    notificationType: string;
  }) => Promise<void>;
  deleteCompetition: (
    collectionName: CollectionName,
    competitionId: string,
  ) => Promise<void>;

  // Tournament State
  upcomingTournaments: Tournament[];
  tournamentById: Tournament | null;
  setTournamentById: (tournament: Tournament | null) => void;
  tournamentNavigationId: string;
  setTournamentNavigationId: (id: string) => void;
  setUpcomingTournaments: (tournaments: Tournament[]) => void;

  // Tournament Data Management
  fetchUpcomingTournaments: () => Promise<void>;
  fetchTournaments: (options?: object) => Promise<Tournament[]>;
  addTournamentFixtures: (params: {
    tournamentId: string;
    fixtures: Fixtures[];
    initialTeams?: TeamStats[];
    numberOfCourts: number;
    currentUser: UserProfile;
    mode: string;
    generationType: string;
  }) => Promise<{ success: boolean }>;
  updateTournamentGame: (params: {
    tournamentId: string;
    gameId: string;
    updatedGame: Game;
    removeGame?: boolean;
  }) => Promise<{ success: boolean }>;
  fetchTournamentParticipants: (
    tournamentId: string,
  ) => Promise<ScoreboardProfile[]>;
  deleteCompetitionFixtures: (tournamentId: string) => Promise<void>;

  // Mock Data
  showMockData: boolean;
  setShowMockData: (show: boolean) => void;

  subscribeToCompetition: (
    competitionId: string,
    collectionName: CollectionName,
    onUpdate: (data: League | Tournament | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
}
