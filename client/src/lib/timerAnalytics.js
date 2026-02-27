const LEGACY_TIMER_STATE_KEY = "studyTimer";
const TIMER_STATE_KEY_PREFIX = "studyTimer";
const TIMER_ANALYTICS_KEY_PREFIX = "studyTimerAnalytics";
const MAX_ANALYTICS_DAYS = 180;

const DEFAULT_TIMER_STATE = {
  timeLeftSec: 0,
  isRunning: false,
  isCompleted: false,
  targetSec: 0,
};

const getScopedKey = (prefix, userId) =>
  userId ? `${prefix}:${userId}` : prefix;

const isBrowser = () => typeof window !== "undefined";

const safeParseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toDateKey = (input) => {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const dispatchAnalyticsUpdate = (userId) => {
  if (!isBrowser()) return;
  window.dispatchEvent(
    new CustomEvent("focustube:timer-analytics-updated", {
      detail: { userId: userId || "" },
    })
  );
};

export const getStoredUserId = () => {
  if (!isBrowser()) return "";
  const rawUser = window.localStorage.getItem("focustube_user");
  const parsedUser = safeParseJson(rawUser, null);
  return parsedUser?._id ? String(parsedUser._id) : "";
};

export const loadTimerState = (userId) => {
  if (!isBrowser()) return { ...DEFAULT_TIMER_STATE };

  const scopedKey = getScopedKey(TIMER_STATE_KEY_PREFIX, userId);
  const scopedRaw = window.localStorage.getItem(scopedKey);
  const scopedState = safeParseJson(scopedRaw, null);

  if (scopedState) {
    return {
      ...DEFAULT_TIMER_STATE,
      ...scopedState,
      targetSec: Number(scopedState.targetSec || scopedState.timeLeftSec || 0),
    };
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_TIMER_STATE_KEY);
  const legacyState = safeParseJson(legacyRaw, null);
  if (!legacyState) return { ...DEFAULT_TIMER_STATE };

  const migratedState = {
    ...DEFAULT_TIMER_STATE,
    ...legacyState,
    targetSec: Number(legacyState.targetSec || legacyState.timeLeftSec || 0),
  };

  window.localStorage.setItem(scopedKey, JSON.stringify(migratedState));
  return migratedState;
};

export const saveTimerState = (userId, state) => {
  if (!isBrowser()) return;
  const scopedKey = getScopedKey(TIMER_STATE_KEY_PREFIX, userId);
  window.localStorage.setItem(scopedKey, JSON.stringify(state));
};

const normalizeAnalytics = (analytics) => {
  if (!analytics || typeof analytics !== "object") return {};

  return Object.entries(analytics).reduce((accumulator, [dateKey, value]) => {
    const normalizedKey = toDateKey(dateKey);
    const bucket = value && typeof value === "object" ? value : {};

    accumulator[normalizedKey] = {
      startedSessions: Math.max(0, Number(bucket.startedSessions) || 0),
      completedSessions: Math.max(0, Number(bucket.completedSessions) || 0),
      startedMinutes: Math.max(0, Number(bucket.startedMinutes) || 0),
      completedMinutes: Math.max(0, Number(bucket.completedMinutes) || 0),
    };

    return accumulator;
  }, {});
};

const trimOldAnalytics = (analytics) => {
  const sortedDates = Object.keys(analytics).sort();
  if (sortedDates.length <= MAX_ANALYTICS_DAYS) return analytics;

  const trimmed = {};
  sortedDates.slice(-MAX_ANALYTICS_DAYS).forEach((dateKey) => {
    trimmed[dateKey] = analytics[dateKey];
  });
  return trimmed;
};

export const loadTimerAnalytics = (userId) => {
  if (!isBrowser()) return {};
  const scopedKey = getScopedKey(TIMER_ANALYTICS_KEY_PREFIX, userId);
  const raw = window.localStorage.getItem(scopedKey);
  const parsed = safeParseJson(raw, {});
  return normalizeAnalytics(parsed);
};

const saveTimerAnalytics = (userId, analytics) => {
  if (!isBrowser()) return;
  const scopedKey = getScopedKey(TIMER_ANALYTICS_KEY_PREFIX, userId);
  window.localStorage.setItem(scopedKey, JSON.stringify(analytics));
  dispatchAnalyticsUpdate(userId);
};

const updateTimerAnalytics = (userId, minutes, fieldName, inputDate) => {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const dateKey = toDateKey(inputDate);
  const currentAnalytics = loadTimerAnalytics(userId);
  const currentBucket = currentAnalytics[dateKey] || {
    startedSessions: 0,
    completedSessions: 0,
    startedMinutes: 0,
    completedMinutes: 0,
  };

  const nextBucket = { ...currentBucket };
  if (fieldName === "started") {
    nextBucket.startedSessions += 1;
    nextBucket.startedMinutes += safeMinutes;
  } else if (fieldName === "completed") {
    nextBucket.completedSessions += 1;
    nextBucket.completedMinutes += safeMinutes;
  }

  const nextAnalytics = trimOldAnalytics({
    ...currentAnalytics,
    [dateKey]: nextBucket,
  });
  saveTimerAnalytics(userId, nextAnalytics);
};

export const recordTimerSessionStarted = (userId, minutes, inputDate) => {
  updateTimerAnalytics(userId, minutes, "started", inputDate);
};

export const recordTimerSessionCompleted = (userId, minutes, inputDate) => {
  updateTimerAnalytics(userId, minutes, "completed", inputDate);
};
