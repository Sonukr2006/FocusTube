(function () {
  const SETTINGS_KEY = "focustube_blocker_settings_v1";
  const RUNTIME_KEY = "focustube_blocker_runtime_v1";
  const RUNTIME_EVENT = "focustube:blocker-runtime-updated";
  const SETTINGS_EVENT = "focustube:blocker-settings-updated";
  const SYNC_INTERVAL_MS = 3000;

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

  const uniqueSorted = (values = []) =>
    Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );

  const readRaw = (key) => window.localStorage.getItem(key);

  const readJson = (raw) => {
    try {
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const buildPayload = () => {
    const settingsRaw = readRaw(SETTINGS_KEY);
    const runtimeRaw = readRaw(RUNTIME_KEY);

    // Ignore non-FocusTube sites where these keys don't exist, otherwise
    // empty payloads can accidentally disable active blocking rules.
    if (!settingsRaw && !runtimeRaw) {
      return null;
    }

    const settings = readJson(settingsRaw);
    const runtime = readJson(runtimeRaw);
    const blockedDomainsRaw = Array.isArray(settings?.blockedDomains)
      ? settings.blockedDomains
      : [];

    return {
      settings: {
        isEnabled: settings?.isEnabled === true,
        blockedDomains: uniqueSorted(
          blockedDomainsRaw
            .map((domain) => normalizeDomain(domain))
            .filter((domain) => isValidDomain(domain))
        ),
      },
      runtime: {
        isActive: runtime?.isActive === true,
      },
      sourceOrigin: window.location.origin,
    };
  };

  let lastSignature = "";

  const syncToExtension = (reason) => {
    if (!chrome?.runtime?.id) return;

    const payload = buildPayload();
    if (!payload) return;
    const signature = JSON.stringify(payload);

    if (signature === lastSignature && reason !== "force") {
      return;
    }

    lastSignature = signature;

    chrome.runtime.sendMessage({
      type: "FOCUSTUBE_SYNC_STATE",
      payload: {
        ...payload,
        reason,
      },
    });
  };

  const handleStorage = (event) => {
    if (!event?.key) return;
    if (event.key !== SETTINGS_KEY && event.key !== RUNTIME_KEY) return;
    syncToExtension("storage");
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(RUNTIME_EVENT, () => syncToExtension("runtime-event"));
  window.addEventListener(SETTINGS_EVENT, () => syncToExtension("settings-event"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncToExtension("tab-visible");
    }
  });

  syncToExtension("init");
  window.setInterval(() => syncToExtension("poll"), SYNC_INTERVAL_MS);
})();
