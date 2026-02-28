import { useEffect, useMemo, useState } from "react";
import { Plus, Save, ShieldBan, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BLOCKER_RUNTIME_EVENT,
  BLOCKER_RUNTIME_STORAGE_KEY,
  BLOCKER_SETTINGS_EVENT,
  BLOCKER_SETTINGS_STORAGE_KEY,
  loadBlockerRuntimeState,
} from "@/lib/blockerRuntime";

const PRESET_SITES = [
  {
    label: "Instagram",
    domain: "instagram.com",
    note: "Reels, explore, feed",
  },
  {
    label: "Facebook",
    domain: "facebook.com",
    note: "Feed and notifications",
  },
  {
    label: "X (Twitter)",
    domain: "x.com",
    note: "Timeline and trends",
  },
  {
    label: "YouTube",
    domain: "youtube.com",
    note: "Home feed distractions",
  },
  {
    label: "Reddit",
    domain: "reddit.com",
    note: "Infinite scrolling threads",
  },
  {
    label: "LinkedIn",
    domain: "linkedin.com",
    note: "Feed browsing loop",
  },
];

const sanitizeDomainInput = (value = "") => {
  const cleaned = String(value || "").trim().toLowerCase();
  if (!cleaned) return "";

  return cleaned
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .trim();
};

const isValidDomain = (value = "") =>
  /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(String(value || "").trim());

const uniqueSorted = (values = []) =>
  Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

const loadBlockerSettings = () => {
  if (typeof window === "undefined") {
    return {
      isEnabled: false,
      blockedDomains: [],
      customDomains: [],
    };
  }

  try {
    const rawValue = window.localStorage.getItem(BLOCKER_SETTINGS_STORAGE_KEY);
    if (!rawValue) {
      return {
        isEnabled: false,
        blockedDomains: [],
        customDomains: [],
      };
    }

    const parsed = JSON.parse(rawValue);
    const blockedDomains = Array.isArray(parsed?.blockedDomains)
      ? parsed.blockedDomains
          .map((domain) => sanitizeDomainInput(domain))
          .filter((domain) => isValidDomain(domain))
      : [];
    const customDomains = Array.isArray(parsed?.customDomains)
      ? parsed.customDomains
          .map((domain) => sanitizeDomainInput(domain))
          .filter((domain) => isValidDomain(domain))
      : [];

    return {
      isEnabled: parsed?.isEnabled === true,
      blockedDomains: uniqueSorted(blockedDomains),
      customDomains: uniqueSorted(customDomains),
    };
  } catch {
    return {
      isEnabled: false,
      blockedDomains: [],
      customDomains: [],
    };
  }
};

const Blocker = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [blockedDomains, setBlockedDomains] = useState([]);
  const [customDomains, setCustomDomains] = useState([]);
  const [customDomainInput, setCustomDomainInput] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("muted");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [runtimeState, setRuntimeState] = useState(() => loadBlockerRuntimeState());

  useEffect(() => {
    const settings = loadBlockerSettings();
    setIsEnabled(settings.isEnabled);
    setBlockedDomains(settings.blockedDomains);
    setCustomDomains(settings.customDomains);
  }, []);

  useEffect(() => {
    const syncRuntimeState = () => {
      setRuntimeState(loadBlockerRuntimeState());
    };

    const handleStorage = (event) => {
      if (!event.key) return;
      if (
        event.key !== BLOCKER_RUNTIME_STORAGE_KEY &&
        event.key !== BLOCKER_SETTINGS_STORAGE_KEY
      ) {
        return;
      }

      syncRuntimeState();
    };

    window.addEventListener(BLOCKER_RUNTIME_EVENT, syncRuntimeState);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(BLOCKER_RUNTIME_EVENT, syncRuntimeState);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const blockedCount = blockedDomains.length;

  const presetDomains = useMemo(
    () => new Set(PRESET_SITES.map((site) => site.domain)),
    []
  );

  const handleToggleDomain = (domain, checked) => {
    setBlockedDomains((current) => {
      const hasDomain = current.includes(domain);

      if (checked === true && !hasDomain) {
        setHasUnsavedChanges(true);
        return uniqueSorted([...current, domain]);
      }

      if (checked !== true && hasDomain) {
        setHasUnsavedChanges(true);
        return current.filter((item) => item !== domain);
      }

      return current;
    });
  };

  const handleAddCustomDomain = () => {
    const normalized = sanitizeDomainInput(customDomainInput);
    if (!normalized || !isValidDomain(normalized)) {
      setMessageType("error");
      setMessage("Valid domain enter karo. Example: instagram.com");
      return;
    }

    const isAlreadyCustom = customDomains.includes(normalized);
    const isAlreadyBlocked = blockedDomains.includes(normalized);

    if (!isAlreadyCustom) {
      setCustomDomains((current) => uniqueSorted([...current, normalized]));
    }

    if (!isAlreadyBlocked) {
      setBlockedDomains((current) => uniqueSorted([...current, normalized]));
    }

    setHasUnsavedChanges(true);
    setCustomDomainInput("");
    setMessageType("success");
    setMessage(`${normalized} added to block list.`);
  };

  const handleRemoveCustomDomain = (domain) => {
    setCustomDomains((current) => current.filter((item) => item !== domain));
    setBlockedDomains((current) => current.filter((item) => item !== domain));
    setHasUnsavedChanges(true);
  };

  const handleApplyCommonSites = () => {
    const commonDomains = PRESET_SITES.map((site) => site.domain);
    setBlockedDomains((current) => uniqueSorted([...current, ...commonDomains]));
    setHasUnsavedChanges(true);
    setMessageType("success");
    setMessage("Common social sites selected.");
  };

  const handleSaveSettings = () => {
    const payload = {
      isEnabled,
      blockedDomains: uniqueSorted(blockedDomains),
      customDomains: uniqueSorted(customDomains),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        BLOCKER_SETTINGS_STORAGE_KEY,
        JSON.stringify(payload)
      );
      window.dispatchEvent(
        new CustomEvent(BLOCKER_SETTINGS_EVENT, {
          detail: {
            isEnabled: payload.isEnabled,
            blockedCount: payload.blockedDomains.length,
          },
        })
      );
    }

    setHasUnsavedChanges(false);
    setMessageType("success");
    setMessage("Blocker settings saved.");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Blocker Active" : "Blocker Paused"}
            </Badge>
            <Badge variant="outline">Blocked Sites: {blockedCount}</Badge>
            <Badge variant={runtimeState.isActive ? "destructive" : "outline"}>
              Timer Block: {runtimeState.isActive ? "ON" : "OFF"}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldBan className="h-5 w-5" />
            Social Media Blocker
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Yahan list choose karo. Browser-level tab blocking ke liye extension
            integration required hota hai, lekin settings yahi se manage hongi.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label htmlFor="blocker-toggle" className="text-base">
                  Enable blocker
                </Label>
                <p className="text-xs text-muted-foreground">
                  Focus session ke time selected sites block karne ke liye.
                </p>
              </div>
              <Checkbox
                id="blocker-toggle"
                checked={isEnabled}
                onCheckedChange={(checked) => {
                  setIsEnabled(checked === true);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Preset Sites</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyCommonSites}
              >
                Select Common Sites
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRESET_SITES.map((site) => (
                <label
                  key={site.domain}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={blockedDomains.includes(site.domain)}
                    onCheckedChange={(checked) =>
                      handleToggleDomain(site.domain, checked)
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{site.label}</p>
                    <p className="text-xs text-muted-foreground">{site.domain}</p>
                    <p className="text-xs text-muted-foreground">{site.note}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Custom Domain</h3>
            <div className="flex flex-wrap gap-2">
              <Input
                value={customDomainInput}
                onChange={(event) => setCustomDomainInput(event.target.value)}
                placeholder="example.com"
                className="max-w-md"
              />
              <Button type="button" onClick={handleAddCustomDomain}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
            {customDomains.length ? (
              <div className="space-y-2">
                {customDomains.map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={blockedDomains.includes(domain)}
                        onCheckedChange={(checked) =>
                          handleToggleDomain(domain, checked)
                        }
                      />
                      <span className="text-sm">{domain}</span>
                      {presetDomains.has(domain) ? (
                        <Badge variant="outline">Preset</Badge>
                      ) : null}
                    </div>
                    {!presetDomains.has(domain) ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCustomDomain(domain)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Abhi koi custom domain added nahi hai.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSaveSettings}>
              <Save className="mr-1 h-4 w-4" />
              Save Settings
            </Button>
            {hasUnsavedChanges ? (
              <Badge variant="secondary">Unsaved changes</Badge>
            ) : (
              <Badge variant="outline">Saved</Badge>
            )}
          </div>

          {message ? (
            <p
              className={`text-sm ${
                messageType === "error" ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default Blocker;
