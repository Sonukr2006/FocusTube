const isBrowser = () => typeof window !== "undefined";

export const BLOCKER_SETTINGS_STORAGE_KEY = "focustube_blocker_settings_v1";
export const BLOCKER_RUNTIME_STORAGE_KEY = "focustube_blocker_runtime_v1";
export const BLOCKER_RUNTIME_EVENT = "focustube:blocker-runtime-updated";
export const BLOCKER_SETTINGS_EVENT = "focustube:blocker-settings-updated";

const safeParseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeDomain = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .trim();

const isValidDomain = (value = "") =>
  /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(String(value || "").trim());

export const loadBlockerSettings = () => {
  if (!isBrowser()) {
    return {
      isEnabled: false,
      blockedDomains: [],
    };
  }

  const raw = window.localStorage.getItem(BLOCKER_SETTINGS_STORAGE_KEY);
  const parsed = safeParseJson(raw, {});
  const blockedDomains = Array.isArray(parsed?.blockedDomains)
    ? parsed.blockedDomains
        .map((domain) => normalizeDomain(domain))
        .filter((domain) => isValidDomain(domain))
    : [];

  return {
    isEnabled: parsed?.isEnabled === true,
    blockedDomains: Array.from(new Set(blockedDomains)),
  };
};

export const isTimerBlockerConfigured = () => {
  const settings = loadBlockerSettings();
  return settings.isEnabled && settings.blockedDomains.length > 0;
};

export const loadBlockerRuntimeState = () => {
  if (!isBrowser()) {
    return {
      isActive: false,
      source: "study-timer",
      updatedAt: "",
    };
  }

  const raw = window.localStorage.getItem(BLOCKER_RUNTIME_STORAGE_KEY);
  const parsed = safeParseJson(raw, {});

  return {
    isActive: parsed?.isActive === true,
    source: String(parsed?.source || "study-timer"),
    updatedAt: String(parsed?.updatedAt || ""),
  };
};

export const setTimerDrivenBlockState = (isActive) => {
  if (!isBrowser()) return;

  const current = loadBlockerRuntimeState();
  const nextActive = isActive === true;

  if (current.isActive === nextActive) return;

  const payload = {
    isActive: nextActive,
    source: "study-timer",
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(BLOCKER_RUNTIME_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(BLOCKER_RUNTIME_EVENT, { detail: payload }));
};
