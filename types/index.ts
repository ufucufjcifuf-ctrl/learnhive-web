export interface PublicQuestion {
  id: string;
  text: string;
  options: string[];
  customPositiveMark?: number | null;
  customNegativeMark?: number | null;
  difficulty: "A" | "B" | "C" | "D" | "NONE";
}

export interface AnswerEntry {
  i: number;
  c: number[];
  e: string;
}

export interface Question extends PublicQuestion {
  correctOptionIndex: number;
  correctOptionIndices: number[];
  explanation: string;
  timestamp?: number;
}

export interface BackgroundConfig {
  type: "SOLID" | "LINEAR_GRADIENT" | "RADIAL_GRADIENT" | "SWEEP_GRADIENT" | "TRANSPARENT";
  colors: string[];
  gradientAngle?: number;
  isAnimated?: boolean;
}

export interface PaddingConfig {
  start: number;
  top: number;
  end: number;
  bottom: number;
}

export interface TextConfig {
  fontSize?: number;
  textColor?: string;
  fontWeight?: "NORMAL" | "BOLD";
  textAlign?: "START" | "CENTER" | "END";
}

export interface UiStyle {
  width?: string;
  height?: string;
  weight?: number | null;
  autoScrollDelay?: number;
  showDotIndicator?: boolean;
  padding?: PaddingConfig;
  margin?: PaddingConfig;
  shape?: string;
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  background?: BackgroundConfig;
  textConfig?: TextConfig | null;
  showSubtitle?: boolean;
  overlayOpacity?: number;
  showTitleOnImage?: boolean;
}

export interface UiAction {
  type: string;
  targetCommand?: string;
  actionUri?: string;
}

export interface CardDesign {
  gridSpan: number;
  aspectRatio: number;
  shapeType: string;
  cornerRadius: number;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  background?: BackgroundConfig;
  showBadge?: boolean;
  showLiveIndicator?: boolean;
}

export interface ExamConfig {
  durationMinutes: number;
  questionLimit: number;
  allowUserToChooseCount: boolean;
  isShuffleEnabled: boolean;
  showResultInstantly: boolean;
  isPremium: boolean;
  isExplanationPremium: boolean;
  isAdEnabled: boolean;
  isLeaderboardEnabled: boolean;
  isBattleEnabled: boolean;
  allowInCustomExam: boolean;
  isSmartAdaptiveEnabled: boolean;
  allowDifficultyFilter: boolean;
  startAdType?: string;
  showBannerAd?: boolean;
  positiveMark: number;
  negativeMark: number;
  attachedNoteType?: string | null;
  attachedNoteLink?: string | null;
  attachedNoteTab?: string | null;
  startTimeMs?: number | null;
  liveEndTimeMs?: number | null;
  archiveEndTimeMs?: number | null;
  leaderboardMode: "LIVE_ONLY" | "ALL_TIME";
  hideSolutionUntilLiveEnds: boolean;
}

export interface DashboardItem {
  id: string;
  title: string;
  subtitle: string;
  iconUrl?: string | null;
  type: string;
  command: string;
  isPremium: boolean;
  questionCount: number;
  examConfig?: ExamConfig | null;
  loadType: "LINKED" | "EMBEDDED";
  embeddedItems?: DashboardItem[] | null;
  visibilityCondition: "ALL" | "FREE_ONLY" | "PREMIUM_ONLY";
  cardDesign?: CardDesign | null;
  uiStyle?: UiStyle;
  uiAction?: UiAction;
  displayMode?: string;
  isHidden: boolean;
  routineHtml?: string | null;
  routineConfig?: Record<string, unknown> | null;
  adminNote?: string | null;
  styleColor?: string;
  gradientEndColor?: string;
  textAlignment?: string;
  badgeText?: string | null;
  badgeColor?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
  timestamp?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email: string;
  photoUrl?: string | null;
  referralCode: string;
  referredBy?: string;
  isPremium: boolean;
  premiumExpiry: number;
  totalScore: number;
  badges: string[];
  isReferralClaimed: boolean;
  isBanned?: boolean;
  role?: string;
}

export interface AppMainConfig {
  adsEnabled?: boolean;
  bannerAdEnabled?: boolean;
  interstitialAdEnabled?: boolean;
  rewardedAdEnabled?: boolean;
  maintenanceMode?: boolean;
  minVersionCode?: number;
  dailyQuote?: string;
  referralRewardDaysReferrer?: number;
  referralRewardDaysReferee?: number;
  isReferralSystemEnabled?: boolean;
  privacyPolicyUrl?: string;
  rulesHtml?: string;
}

export interface PremiumPackage {
  id: string;
  title: string;
  durationDays: number;
  price: number;
  features: string;
  isPopular?: boolean;
}

export interface PremiumConfig {
  instructions: string;
  whatsappNumber: string;
  facebookLink: string;
  packages: PremiumPackage[];
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  score: number;
  rank: number;
  photoUrl?: string | null;
  timeTakenSec?: number;
  roll?: string;
}

// =========================================================================
// GROUP BATTLE ENGINE TYPES (Cloudflare Durable Objects + WebSockets)
// =========================================================================
export type BattleMode = "RACE" | "SYNCED";
export type BattleStatus = "waiting" | "playing" | "finished";
export type BattleConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING";

export interface BattleRules {
  questionCount: number;
  timePerQuestion: number;
  posMark: number;
  negMark: number;
  maxPlayers: number;
}

export interface BattlePlayer {
  uid: string;
  name: string;
  photoUrl?: string | null;
  isGuest: boolean;
  score: number;
  qIndex: number;
  correctCount: number;
  wrongCount: number;
  streak: number;
  bestStreak: number;
  hasFinished: boolean;
  forfeited: boolean;
  isOnline: boolean;
  totalTimeMs: number;
  rank?: number;
  globalXP?: number;
}

export interface BattleRoomPreview {
  roomId: string;
  examId?: string;
  examTitle: string;
  hostUid?: string;
  hostName?: string;
  status: BattleStatus;
  mode: BattleMode;
  allowGuests: boolean;
  playerCount: number;
  rules: BattleRules;
}

export interface BattleRoomSnapshot {
  roomId: string;
  examId: string;
  examTitle: string;
  hostUid: string;
  myUid: string;
  status: BattleStatus;
  mode: BattleMode;
  allowGuests: boolean;
  showExplanation: boolean;
  startedAtMs: number;
  rules: BattleRules;
  players: BattlePlayer[];
  questions: PublicQuestion[];
  syncedQIndex: number;
  syncedPhase: "QUESTION" | "REVEAL";
  syncedDeadlineMs: number;
  myQIndex: number;
  myQStartedAtMs: number;
  myScore: number;
  myStreak: number;
  myHasFinished: boolean;
  myAnswers: Record<string, number>;
  winnerUid: string | null;
  podiumTop3: BattlePlayer[];
  rankings: BattlePlayer[];
  solutionsMap: Record<string, AnswerEntry>;
}

export interface BattleAnswerResult {
  qIndex: number;
  isCorrect: boolean;
  isTimeout: boolean;
  correctIndices: number[];
  explanation: string;
  earnedPoints: number;
  totalScore: number;
  streak: number;
  nextQIndex: number;
  qStartedAtMs: number;
  hasFinished: boolean;
}

export interface BattleAnswerLocked {
  qIndex: number;
  selectedIndex: number;
}

export interface BattleSyncedReveal {
  qIndex: number;
  correctIndices: number[];
  explanation: string;
  nextAtMs: number;
}

export interface BattleReactionPopup {
  id: string;
  uid: string;
  name: string;
  emoji: string;
}

export interface BattleSpeedHighlight {
  id: string;
  uid: string;
  name: string;
  speedMs: number;
}