const statusValue = document.getElementById("statusValue");
const timerValue = document.getElementById("timerValue");
const domainList = document.getElementById("domainList");
const refreshBtn = document.getElementById("refreshBtn");
const openAppLink = document.getElementById("openAppLink");

const renderDomainList = (domains) => {
  domainList.innerHTML = "";

  if (!domains.length) {
    const item = document.createElement("li");
    item.textContent = "No domains configured";
    domainList.appendChild(item);
    return;
  }

  domains.forEach((domain) => {
    const item = document.createElement("li");
    item.textContent = domain;
    domainList.appendChild(item);
  });
};

const renderState = (state) => {
  const isEnabled = state?.settings?.isEnabled === true;
  const blockedDomains = Array.isArray(state?.settings?.blockedDomains)
    ? state.settings.blockedDomains
    : [];
  const timerActive = state?.runtime?.isActive === true;
  const sourceOrigin = String(state?.sourceOrigin || "").trim();

  const isBlocking = isEnabled && timerActive && blockedDomains.length > 0;
  statusValue.textContent = isBlocking ? "Blocking Active" : "Blocking Inactive";
  statusValue.className = `status-text ${isBlocking ? "status-on" : "status-off"}`;

  if (!isEnabled) {
    timerValue.textContent = "Blocked list disabled in FocusTube";
  } else if (!timerActive) {
    timerValue.textContent = "Timer not running or session finished";
  } else {
    timerValue.textContent = "Timer running (block should be ON)";
  }

  if (openAppLink && /^https?:\/\//i.test(sourceOrigin)) {
    openAppLink.href = sourceOrigin;
  }

  renderDomainList(blockedDomains);
};

const requestState = () =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "FOCUSTUBE_GET_STATE" }, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message || "Unable to get extension state"));
        return;
      }

      if (!response?.ok) {
        reject(new Error(response?.error || "State unavailable"));
        return;
      }

      resolve(response?.state || null);
    });
  });

const refreshRules = () =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FOCUSTUBE_REFRESH_RULES" }, () => {
      resolve();
    });
  });

const loadState = async () => {
  try {
    await refreshRules();
    const state = await requestState();
    renderState(state || {});
  } catch (error) {
    statusValue.textContent = "Sync Error";
    statusValue.className = "status-text status-on";
    timerValue.textContent = error?.message || "Unable to read blocker state";
    renderDomainList([]);
  }
};

refreshBtn.addEventListener("click", () => {
  loadState();
});

loadState();
