export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices: number[];
  explanation: string;
  customPositiveMark?: number | null;
  customNegativeMark?: number | null;
  difficulty: "A" | "B" | "C" | "D" | "NONE";
  timestamp?: number;
}

export interface BackgroundConfig {
  type: "SOLID" | "LINEAR_GRADIENT" | "RADIAL_GRADIENT" | "SWEEP_GRADIENT" | "TRANSPARENT";
  colors: string[];
  gradientAngle?: number;
  isAnimated?: boolean;
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
  shape?: string;
  cornerRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  background?: BackgroundConfig;
  textConfig?: TextConfig | null;
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
  isHidden: boolean;
  routineHtml?: string | null;
  adminNote?: string | null;

  // 🔥 Android Parity Fields
  styleColor?: string;
  gradientEndColor?: string;
  badgeText?: string | null;
  badgeColor?: string | null;

  // 🔥 Web SEO Fields
  seoTitle?: string | null;
  seoDescription?: string | null;
  slug?: string | null;
}