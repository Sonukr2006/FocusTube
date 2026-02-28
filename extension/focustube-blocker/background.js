const BLOCKER_STATE_KEY = "focustube_blocker_extension_state";
const BLOCKER_RULE_IDS_KEY = "focustube_blocker_extension_rule_ids";
const DYNAMIC_RULE_ID_START = 1000;
const MAX_BLOCKED_DOMAINS = 200;

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

const uniqueSortedDomains = (domains = []) =>
  Array.from(new Set(domains.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

const getLocal = (keys) =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result || {});
    });
  });

const setLocal = (value) =>
  new Promise((resolve) => {
    chrome.storage.local.set(value, () => resolve());
  });

const updateDynamicRules = ({ removeRuleIds, addRules }) =>
  new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateDynamicRules(
      {
        removeRuleIds,
        addRules,
      },
      () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || "Failed to update dynamic rules"));
          return;
        }
        resolve();
      }
    );
  });

const setActionBadge = ({ isBlocking, blockedCount }) => {
  chrome.action.setBadgeBackgroundColor({
    color: isBlocking ? "#c62828" : "#455a64",
  });
  chrome.action.setBadgeText({
    text: isBlocking ? "ON" : "",
  });
  chrome.action.setTitle({
    title: isBlocking
      ? `FocusTube Blocker ON (${blockedCount} domains)`
      : "FocusTube Blocker OFF",
  });
};

const sanitizeIncomingState = (payload = {}) => {
  const isEnabled = payload?.settings?.isEnabled === true;
  const blockedDomainsRaw = Array.isArray(payload?.settings?.blockedDomains)
    ? payload.settings.blockedDomains
    : [];
  const blockedDomains = uniqueSortedDomains(
    blockedDomainsRaw
      .map((domain) => normalizeDomain(domain))
      .filter((domain) => isValidDomain(domain))
  ).slice(0, MAX_BLOCKED_DOMAINS);

  const isTimerActive = payload?.runtime?.isActive === true;
  const sourceOrigin = String(payload?.sourceOrigin || "").trim();

  return {
    settings: {
      isEnabled,
      blockedDomains,
    },
    runtime: {
      isActive: isTimerActive,
    },
    sourceOrigin,
    updatedAt: new Date().toISOString(),
  };
};

const buildDnrRules = (domains = []) =>
  domains.map((domain, index) => ({
    id: DYNAMIC_RULE_ID_START + index,
    priority: 1,
    action: {
      type: "block",
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  }));

const applyRulesFromState = async () => {
  const stateResult = await getLocal([BLOCKER_STATE_KEY, BLOCKER_RULE_IDS_KEY]);
  const state = stateResult[BLOCKER_STATE_KEY] || {};
  const previousRuleIds = Array.isArray(stateResult[BLOCKER_RULE_IDS_KEY])
    ? stateResult[BLOCKER_RULE_IDS_KEY]
    : [];

  const shouldBlock =
    state?.settings?.isEnabled === true &&
    state?.runtime?.isActive === true &&
    Array.isArray(state?.settings?.blockedDomains) &&
    state.settings.blockedDomains.length > 0;

  const activeDomains = shouldBlock ? state.settings.blockedDomains : [];
  const nextRules = buildDnrRules(activeDomains);
  const nextRuleIds = nextRules.map((rule) => rule.id);

  const removeRuleIds = Array.from(
    new Set([...(previousRuleIds || []), ...nextRuleIds])
  );

  await updateDynamicRules({
    removeRuleIds,
    addRules: nextRules,
  });

  await setLocal({
    [BLOCKER_RULE_IDS_KEY]: nextRuleIds,
  });

  setActionBadge({
    isBlocking: shouldBlock,
    blockedCount: activeDomains.length,
  });

  return {
    shouldBlock,
    blockedDomains: activeDomains,
  };
};

const syncStateFromFocusTube = async (payload) => {
  const nextState = sanitizeIncomingState(payload);
  await setLocal({
    [BLOCKER_STATE_KEY]: nextState,
  });
  await applyRulesFromState();
  return nextState;
};

chrome.runtime.onInstalled.addListener(() => {
  applyRulesFromState().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  applyRulesFromState().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = String(message?.type || "");

  if (type === "FOCUSTUBE_SYNC_STATE") {
    syncStateFromFocusTube(message?.payload || {})
      .then((state) => {
        sendResponse({
          ok: true,
          state,
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Failed to sync FocusTube state",
        });
      });
    return true;
  }

  if (type === "FOCUSTUBE_GET_STATE") {
    getLocal([BLOCKER_STATE_KEY]).then((result) => {
      sendResponse({
        ok: true,
        state: result[BLOCKER_STATE_KEY] || null,
      });
    });
    return true;
  }

  if (type === "FOCUSTUBE_REFRESH_RULES") {
    applyRulesFromState()
      .then((summary) => {
        sendResponse({
          ok: true,
          summary,
        });
      })
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error?.message || "Failed to refresh rules",
        });
      });
    return true;
  }

  return false;
});
