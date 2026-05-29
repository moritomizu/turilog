export type TideDirection = "rising" | "falling" | "unknown";

export type TidePhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type TideType = "high" | "low" | "unknown";

export type TournamentRankingType = "biggest" | "totalSize" | "count";
export type TournamentVisibility = "public" | "private";
export type TournamentStatus = "upcoming" | "active" | "ended";
export type TournamentEntryStatus = "none" | "pending" | "approved" | "rejected";
export type TournamentRole = "owner" | "admin" | "subAdmin" | "participant" | "viewer";
export type TournamentParticipantGender = "male" | "female" | "other" | "preferNotToSay";
export type TournamentPaymentStatus = "notRequired" | "unpaid" | "paid" | "waived";
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
export type AiReportPeriod = "all" | "last7" | "last30" | "last90" | "last180" | "thisYear" | "sameSeason";
export type AiReportPlannedTimeBand = "allDay" | "morning" | "daytime" | "evening" | "night" | "custom";
export type AiReportSourceScope = "personal" | "group";
export type SubscriptionPlan = "free" | "premium" | "organizer" | "groupPro" | "tester";
export type SubscriptionStatus = "none" | "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "unpaid" | "paused";
export type NotificationCategory =
  | "tournamentStart"
  | "tournamentEndingSoon"
  | "tournamentRankingUpdated"
  | "tournamentEntryApproved"
  | "groupCatchPosted"
  | "aiReportReady"
  | "systemNotice";
export type NotificationPreferences = Record<NotificationCategory, boolean>;
export type FeatureKey =
  | "basicCatchLog"
  | "basicRanking"
  | "joinTournament"
  | "joinGroup"
  | "advancedAnalysis"
  | "groupAnalysis"
  | "tournamentCreate"
  | "tournamentAdmin"
  | "paidTournament"
  | "detailedMap"
  | "csvExport"
  | "proxyPost"
  | "tackleAnalysis"
  | "aiReport"
  | "catchVerification"
  | "catchVerificationDetails"
  | "privateGroup"
  | "unlimitedGroups"
  | "unlimitedTournaments"
  | "plan_premium"
  | "plan_organizer"
  | "plan_groupPro";
export type FeatureEventType =
  | "viewLockedFeature"
  | "clickInterested"
  | "clickNotInterested"
  | "clickLearnMore"
  | "attemptUseFeature"
  | "useFeature";
export type ProofFlag =
  | "photo_present"
  | "exif_present"
  | "exif_datetime_present"
  | "gps_present"
  | "gps_accuracy_good"
  | "caught_at_present"
  | "posted_at_present"
  | "posted_at_close_to_caught_at"
  | "tide_present"
  | "tide_direction_present"
  | "tide_phase_present"
  | "fish_type_present"
  | "size_present"
  | "measure_photo_method"
  | "measurement_photo_present"
  | "not_tournament_entry"
  | "tournament_in_period"
  | "tournament_target_fish_match"
  | "tournament_entry_submitted"
  | "missing_photo"
  | "missing_gps"
  | "low_location_accuracy"
  | "posted_at_far_from_caught_at"
  | "missing_tide"
  | "missing_fish_type"
  | "missing_size"
  | "manual_measurement_only"
  | "measurement_photo_missing"
  | "tournament_out_of_period"
  | "tournament_target_fish_mismatch"
  | "duplicate_image_suspected"
  | "impossible_travel_suspected"
  | "abnormal_size_suspected"
  | "tournament_area_mismatch"
  | "hasPhoto"
  | "hasExactLocation"
  | "hasBlurredLocation"
  | "hasCaughtAt"
  | "hasCreatedAt"
  | "hasTideData"
  | "hasWeatherData"
  | "hasSeaTemperatureData"
  | "hasLunarData"
  | "hasTackleData"
  | "hasTournamentEntry"
  | "hasGroupContext"
  | "hasPointName"
  | "missingPhoto"
  | "missingLocation"
  | "missingCaughtAt"
  | "missingSize"
  | "suspiciousFutureCaughtAt"
  | "suspiciousCreatedBeforeCaught"
  | "suspiciousHugeSize"
  | "manualLocationOnly"
  | "lowExternalData";
export type VerificationLevel = "high" | "medium" | "low" | "needs_review" | "unverified" | "basic" | "standard" | "strong" | "highTrust";
export type AnomalySeverity = "info" | "warning" | "critical";

export interface AnomalyFinding {
  flag: ProofFlag;
  severity: AnomalySeverity;
  message: string;
  details?: Record<string, unknown>;
  detectedAt: Date;
}

export type CatchProofPackage = {
  proofVersion: "v1";
  catchId?: string | null;
  userId: string;
  image: {
    hasImage: boolean;
    imageUrl?: string | null;
    hasExif?: boolean;
    hasExifDateTime?: boolean;
  };
  size: {
    fishType?: string;
    sizeCm: number;
    hasValidSize: boolean;
    measurementMethod?: "manual" | "measurePhoto" | "aiAssisted" | "unknown";
    measurementPhotoUrl?: string | null;
  };
  measurement: {
    measurementMethod: "manual" | "measurePhoto" | "aiAssisted" | "unknown";
    hasMeasurementPhoto: boolean;
    measurementPhotoUrl: string | null;
    sizeCm: number;
  };
  time: {
    caughtAt?: string | null;
    createdAt?: string | null;
    minutesFromCaughtToCreated: number | null;
  };
  location: {
    hasExactLocation: boolean;
    hasBlurredLocation: boolean;
    latitude?: number | null;
    longitude?: number | null;
    publicLatitude?: number | null;
    publicLongitude?: number | null;
    areaName?: string;
    areaCode?: string;
    pointName?: string;
    blurRadiusMeters?: number | null;
    accuracyMeters?: number | null;
  };
  environment: {
    hasTideData: boolean;
    hasWeatherData: boolean;
    hasSeaTemperatureData: boolean;
    hasLunarData: boolean;
    tidePhaseLabel?: string;
    weatherLabel?: string;
    seaTemperatureC?: number | null;
    moonAge?: number | null;
  };
  context: {
    tournamentId?: string | null;
    isTournamentEntry: boolean;
    tournamentEntryStatus?: TournamentEntryStatus;
    groupIds: string[];
    primaryGroupId?: string | null;
    postedByUserId?: string | null;
    actualAnglerUserId?: string | null;
    isProxyPost: boolean;
    tournamentStartAt?: string | null;
    tournamentEndAt?: string | null;
    tournamentTargetFishTypes?: string[];
    tournamentAllowedAreaCodes?: string[];
    tournamentAllowedAreas?: string[];
  };
  flags: ProofFlag[];
  anomalyFindings?: AnomalyFinding[];
  generatedAt: string;
};

export type VerificationScore = {
  total: number;
  totalScore: number;
  level: VerificationLevel;
  flags: ProofFlag[];
  criticalFlags: ProofFlag[];
  messages: string[];
  mediaScore: number;
  gpsScore: number;
  timeScore: number;
  tideScore: number;
  fishScore: number;
  measurementScore: number;
  tournamentScore: number;
  anomalyFindings?: AnomalyFinding[];
  positiveScore: number;
  penaltyScore: number;
  breakdown: Array<{
    key: string;
    label: string;
    score: number;
  }>;
  calculatedAt: string;
};

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
  selfIntroduction?: string;
  preferredLocale?: "ja" | "en";
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
  subscriptionStatus?: SubscriptionStatus | string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
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
  selfIntroduction?: string;
  preferredLocale?: "ja" | "en";
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
  subscriptionStatus?: SubscriptionStatus | string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  enabledFeatures?: FeatureKey[];
  disabledFeatures?: FeatureKey[];
  trialEndsAt?: string | null;
  planUpdatedAt?: string | null;
  notificationEnabled?: boolean;
  fcmTokens?: string[];
  notificationPreferences?: NotificationPreferences;
  notificationUpdatedAt?: string | null;
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

export type AiReportFilters = {
  fishType: string;
  period: AiReportPeriod;
  plannedDate?: string;
  plannedTimeBand?: AiReportPlannedTimeBand;
  plannedStartTime?: string;
  plannedEndTime?: string;
  plannedArea?: string;
  sourceScope?: AiReportSourceScope;
  groupId?: string;
};

export type AiReport = {
  id: string;
  userId: string;
  fishType: string;
  period: AiReportPeriod;
  sourceScope: AiReportSourceScope;
  groupId: string | null;
  groupName: string | null;
  plannedDate: string | null;
  plannedTimeBand: AiReportPlannedTimeBand | null;
  plannedStartTime: string | null;
  plannedEndTime: string | null;
  plannedArea: string | null;
  catchCount: number;
  reportText: string;
  summaryJson: Record<string, unknown>;
  createdAt: string;
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
  measurementPhotoUrl?: string | null;
  measurementMethod?: "manual" | "measurePhoto" | "aiAssisted";
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
  publicAnglerName?: string;
  publicAnglerAvatarUrl?: string | null;
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
  catchProof?: CatchProofPackage;
  verificationScore?: VerificationScore;
  anomalyFindings?: AnomalyFinding[];
  rankingEligibility?: { eligible: boolean; reason?: string; checkedAt: Date };
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
  imageUrl: string | null;
  startAt: string;
  endAt: string;
  targetFishTypes: string[];
  rankingType: TournamentRankingType;
  rules: string;
  visibility: TournamentVisibility;
  maxParticipants: number | null;
  requiresParticipantInfo: boolean;
  entryFeeEnabled: boolean;
  entryFeeAmount: number | null;
  entryFeeCurrency: "JPY";
  paymentInstructions: string;
  locationVisibilityDefault: TournamentLocationVisibility;
  allowedAreaCodes?: string[];
  allowedAreas?: string[];
  createdAt: string;
  updatedAt: string;
};

export type TournamentParticipantSafetyInfo = {
  fullName: string;
  address: string;
  age: number | null;
  gender: TournamentParticipantGender;
  phoneNumber: string;
  emergencyContact: string;
};

export type TournamentParticipant = {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  email: string | null;
  avatarUrl: string | null;
  safetyInfo?: TournamentParticipantSafetyInfo | null;
  safetyInfoSubmittedAt?: string | null;
  paymentStatus: TournamentPaymentStatus;
  paymentConfirmedAt?: string | null;
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
  iconUrl?: string | null;
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
