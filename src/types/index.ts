export type TideDirection = "rising" | "falling" | "unknown";

export type TidePhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type TideType = "high" | "low" | "unknown";

export type TournamentRankingType = "biggest" | "totalSize" | "count";
export type TournamentVisibility = "public" | "private";
export type TournamentStatus = "upcoming" | "active" | "ended";
export type TournamentEntryStatus = "none" | "pending" | "approved" | "rejected";
export type TournamentRole = "owner" | "admin" | "subAdmin" | "participant" | "viewer";
export type LocationVisibility = "exact" | "public" | "hidden";
export type GroupRole = "owner" | "admin" | "moderator" | "member" | "viewer";
export type GroupVisibility = "private" | "inviteOnly" | "public";
export type GroupLocationVisibility = "exactForAdminsOnly" | "exactForAllMembers" | "blurredForMembers" | "hidden";
export type TournamentLocationVisibility = "exactForOrganizersOnly" | "blurredForParticipants" | "areaOnlyForParticipants" | "hiddenForParticipants";
export type DisplayLocationType = "exact" | "blurred" | "areaOnly" | "hidden";
export type AgeRange = "10s" | "20s" | "30s" | "40s" | "50s" | "60plus" | "preferNotToSay";
export type FishingFrequency =
  | "twiceOrMorePerWeek"
  | "oncePerWeek"
  | "twoThreeTimesPerMonth"
  | "oncePerMonth"
  | "onceEveryFewMonths"
  | "fewTimesPerYear";
export type FishingMotivation = "casual" | "improve" | "serious" | "competitive" | "business";
export type SubscriptionPlan = "free" | "premium" | "organizer" | "groupPro" | "tester";
export type FeatureKey =
  | "basicCatchLog"
  | "basicRanking"
  | "joinTournament"
  | "joinGroup"
  | "advancedAnalysis"
  | "groupAnalysis"
  | "tournamentCreate"
  | "tournamentAdmin"
  | "detailedMap"
  | "csvExport"
  | "proxyPost"
  | "tackleAnalysis"
  | "aiReport"
  | "privateGroup"
  | "unlimitedGroups"
  | "unlimitedTournaments"
  | "plan_premium"
  | "plan_organizer"
  | "plan_groupPro";
export type FeatureEventType =
  | "viewLockedFeature"
  | "clickInterested"
  | "clickLearnMore"
  | "attemptUseFeature"
  | "useFeature";

export type DisplayLocation = {
  type: DisplayLocationType;
  latitude?: number;
  longitude?: number;
  areaName?: string;
  areaCode?: string;
  message: string;
};

export type User = {
  uid: string;
  displayName: string | null;
  email: string | null;
  avatarUrl?: string | null;
  createdAt: Date;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  termsAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  termsVersion?: string;
  privacyVersion?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: Date;
  onboardingSkippedAt?: Date;
  subscriptionPlan?: SubscriptionPlan;
  enabledFeatures?: FeatureKey[];
  disabledFeatures?: FeatureKey[];
  trialEndsAt?: Date;
  planUpdatedAt?: Date;
};

export type UserProfile = {
  uid: string;
  displayName?: string;
  email?: string | null;
  avatarUrl?: string | null;
  ageRange?: AgeRange;
  residenceArea?: string;
  fishingAreas?: string[];
  fishingGenres?: string[];
  fishingFrequency?: FishingFrequency;
  fishingStyle?: string;
  appPurposes?: string[];
  fishingMotivation?: FishingMotivation;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingSkippedAt?: string | null;
  subscriptionPlan?: SubscriptionPlan;
  enabledFeatures?: FeatureKey[];
  disabledFeatures?: FeatureKey[];
  trialEndsAt?: string | null;
  planUpdatedAt?: string | null;
  updatedAt?: string | null;
};

export type FeatureEvent = {
  id: string;
  userId: string;
  featureKey: FeatureKey;
  eventType: FeatureEventType;
  planAtEvent: SubscriptionPlan;
  pagePath: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type TideInfo = {
  tideHeight: number | null;
  tideDirection: TideDirection;
  tidePhase: TidePhase | null;
  tidePhaseLabel: string;
  previousTideTime: string | null;
  previousTideType: TideType;
  nextTideTime: string | null;
  nextTideType: TideType;
  minutesToNextTide: number | null;
  tideStationName: string | null;
  tideStationDistance: number | null;
  tideApiProvider: "stormglass" | "worldtides" | "none";
};

export type OfficialTideReference = {
  officialTideStationName: string | null;
  officialTideStationDistance: number | null;
  officialTideCurveUrl: string | null;
  officialTideSourceName: string | null;
  officialTideDate: string | null;
};

export type OfficialCurrentReference = {
  officialCurrentStationName: string | null;
  officialCurrentStationDistance: number | null;
  officialCurrentCurveUrl: string | null;
  officialCurrentSourceName: string | null;
  officialCurrentDate: string | null;
  officialCurrentNote: string | null;
};

export type WeatherInfo = {
  weatherLabel: string;
  weatherCode: number | null;
  temperatureC: number | null;
  precipitationMm: number | null;
  cloudCoverPercent: number | null;
  windSpeedMs: number | null;
  windDirectionDeg: number | null;
  windDirectionLabel: string | null;
  windGustMs: number | null;
  weatherSourceName: string | null;
  weatherSourceUrl: string | null;
  weatherFetchedAt: string | null;
};

export type SeaTemperatureInfo = {
  seaTemperatureC: number | null;
  seaTemperatureAreaName: string | null;
  seaTemperatureAreaCode: string | null;
  seaTemperatureDate: string | null;
  seaTemperatureSourceName: string | null;
  seaTemperatureSourceUrl: string | null;
  seaTemperatureFetchedAt: string | null;
};

export type LunarInfo = {
  lunarDateLabel: string | null;
  lunarYearName: string | null;
  lunarMonthLabel: string | null;
  lunarDay: number | null;
  moonAge: number | null;
  moonPhase: number | null;
  moonPhaseLabel: string | null;
};

export type TackleInfo = {
  lureName: string;
  lureColor: string;
  rodName: string;
  reelName: string;
  lineName: string;
  leaderName: string;
};

export type Tackle = {
  id: string;
  userId: string;
  name: string;
  fishingGenre?: string;
  rod?: string;
  reel?: string;
  line?: string;
  leader?: string;
  lure?: string;
  memo?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type Catch = TideInfo &
  OfficialTideReference &
  OfficialCurrentReference & {
  weather: WeatherInfo;
  seaTemperature: SeaTemperatureInfo;
  lunar: LunarInfo;
  tackle: TackleInfo;
  tackleId?: string | null;
  tackleName?: string;
  rod?: string;
  reel?: string;
  line?: string;
  leader?: string;
  lure?: string;
  id: string;
  userId: string;
  imageUrl: string | null;
  fishType: string;
  sizeCm: number;
  caughtAt: string;
  comment: string;
  latitude: number | null;
  longitude: number | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  locationVisibility: LocationVisibility;
  areaName: string;
  areaCode: string;
  pointName: string;
  blurRadiusMeters: number | null;
  locationCreatedAt: string | null;
  locationUpdatedAt: string | null;
  isPublic: boolean;
  publicShareEnabledAt: string | null;
  tournamentId: string | null;
  isTournamentEntry: boolean;
  tournamentEntryStatus: TournamentEntryStatus;
  tournamentSubmittedAt: string | null;
  groupIds: string[];
  primaryGroupId: string | null;
  postedByUserId: string;
  actualAnglerUserId: string;
  isProxyPost: boolean;
  proxyPostReason: string;
  createdAt: string;
};

export type LocationPoint = {
  latitude: number;
  longitude: number;
};

export type Tournament = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  targetFishTypes: string[];
  rankingType: TournamentRankingType;
  rules: string;
  visibility: TournamentVisibility;
  maxParticipants: number | null;
  locationVisibilityDefault: TournamentLocationVisibility;
  createdAt: string;
  updatedAt: string;
};

export type TournamentParticipant = {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  email: string | null;
  avatarUrl: string | null;
  role: TournamentRole;
  canViewExactLocation: boolean;
  canViewPrivateCatchDetails: boolean;
  canApproveEntries: boolean;
  joinedAt: string;
  updatedAt: string | null;
  status: "active";
};

export type Group = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  visibility: GroupVisibility;
  locationVisibilityDefault: GroupLocationVisibility;
  inviteCode: string;
  createdAt: string;
  updatedAt: string | null;
  memberCount: number;
  catchCount: number;
};

export type GroupMember = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  email: string | null;
  role: GroupRole;
  canViewExactLocation: boolean;
  canPost: boolean;
  canProxyPost: boolean;
  canEditGroupCatches: boolean;
  canDeleteGroupCatches: boolean;
  joinedAt: string;
  updatedAt: string | null;
  status: "active" | "invited" | "removed";
};

export type GroupCatchComment = {
  id: string;
  groupId: string;
  catchId: string;
  userId: string;
  userName: string;
  body: string;
  replyToCommentId: string | null;
  replyToUserName: string | null;
  createdAt: string;
};

export type GroupJoinRequestStatus = "pending" | "approved" | "rejected";

export type GroupJoinRequest = {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  email: string | null;
  message: string;
  status: GroupJoinRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};
