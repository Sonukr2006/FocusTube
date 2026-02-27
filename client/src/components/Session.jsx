import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  getSessionProgress,
  saveSessionProgress,
} from "@/lib/sessionProgress";

const YT_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";
const SAVE_INTERVAL_MS = 10000;
const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
).replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const PLAYER_STATES = {
  ENDED: 0,
  PAUSED: 2,
};

let ytApiPromise;

function parseYoutubeInput(value) {
  const input = value.trim();
  if (!input) return null;

  if (/^video:[\w-]{6,}$/.test(input)) {
    const videoId = input.slice("video:".length);
    return {
      kind: "video",
      sourceId: videoId,
      sessionId: `video:${videoId}`,
      normalizedInput: input,
    };
  }

  if (!input.includes("http")) {
    if (/^(PL|UU|LL|RD|FL|OLAK5uy)[\w-]+$/.test(input)) {
      return {
        kind: "playlist",
        sourceId: input,
        sessionId: input,
        normalizedInput: input,
      };
    }

    if (/^[\w-]{11}$/.test(input)) {
      return {
        kind: "video",
        sourceId: input,
        sessionId: `video:${input}`,
        normalizedInput: input,
      };
    }

    return {
      kind: "playlist",
      sourceId: input,
      sessionId: input,
      normalizedInput: input,
    };
  }

  try {
    const url = new URL(input);
    const playlistId = url.searchParams.get("list") || "";
    if (playlistId) {
      return {
        kind: "playlist",
        sourceId: playlistId,
        sessionId: playlistId,
        normalizedInput: input,
      };
    }

    const videoParamId = url.searchParams.get("v") || "";
    if (videoParamId) {
      return {
        kind: "video",
        sourceId: videoParamId,
        sessionId: `video:${videoParamId}`,
        normalizedInput: input,
      };
    }

    const hostname = url.hostname.replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (hostname === "youtu.be" && pathParts[0]) {
      return {
        kind: "video",
        sourceId: pathParts[0],
        sessionId: `video:${pathParts[0]}`,
        normalizedInput: input,
      };
    }

    if ((pathParts[0] === "shorts" || pathParts[0] === "embed") && pathParts[1]) {
      return {
        kind: "video",
        sourceId: pathParts[1],
        sessionId: `video:${pathParts[1]}`,
        normalizedInput: input,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function resolveTargetFromSessionKey(sessionKey, fallbackVideoId = "") {
  const safeKey = (sessionKey || "").trim();
  if (!safeKey) return null;

  if (safeKey.startsWith("video:")) {
    const rawVideoId = safeKey.slice("video:".length) || fallbackVideoId;
    if (!rawVideoId) return null;
    return {
      kind: "video",
      sourceId: rawVideoId,
      sessionId: `video:${rawVideoId}`,
      normalizedInput: rawVideoId,
    };
  }

  return {
    kind: "playlist",
    sourceId: safeKey,
    sessionId: safeKey,
    normalizedInput: safeKey,
  };
}

function getProgressStorageKey(playlistId) {
  return `focus_tube_playlist_progress_${playlistId}`;
}

function getSavedProgress(playlistId) {
  if (!playlistId) return null;
  const raw = localStorage.getItem(getProgressStorageKey(playlistId));
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProgress(playlistId, progress) {
  if (!playlistId || !progress) return;
  localStorage.setItem(getProgressStorageKey(playlistId), JSON.stringify(progress));
}

function normalizeVideoItems(rawItems) {
  const items = Array.isArray(rawItems)
    ? rawItems
    : rawItems?.items || rawItems?.videos || rawItems?.data || [];

  return items
    .map((item) => {
      if (typeof item === "string") {
        return {
          videoId: item,
          title: item,
        };
      }

      const videoId =
        item?.videoId ||
        item?.id?.videoId ||
        item?.snippet?.resourceId?.videoId ||
        item?.id ||
        "";

      const title =
        item?.title ||
        item?.snippet?.title ||
        `Video ${videoId || ""}`.trim();

      return { videoId, title };
    })
    .filter((item) => Boolean(item.videoId));
}

function parseBackendStartIndex(payload) {
  const candidates = [
    payload?.startIndex,
    payload?.startVideoIndex,
    payload?.initialIndex,
    payload?.meta?.startIndex,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }

  return 0;
}

function parseIsoTime(value) {
  const timestamp = Date.parse(value || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function pickLatestProgress(localProgress, remoteProgress) {
  if (!localProgress && !remoteProgress) return null;
  if (!localProgress) return remoteProgress;
  if (!remoteProgress) return localProgress;

  return parseIsoTime(remoteProgress.updatedAt) >= parseIsoTime(localProgress.updatedAt)
    ? remoteProgress
    : localProgress;
}

async function fetchPlaylistVideos(target) {
  const query =
    target.kind === "video"
      ? `videoId=${encodeURIComponent(target.sourceId)}`
      : `playlistId=${encodeURIComponent(target.sourceId)}`;

  const endpoints = [
    `${API_BASE_URL}/youtube/playlist-videos?${query}`,
    `${API_BASE_URL}/youtube/playlist-items?${query}`,
    `${API_BASE_URL}/playlist-videos?${query}`,
  ];

  let lastError =
    target.kind === "video"
      ? "Failed to fetch video from backend."
      : "Failed to fetch playlist videos from backend.";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        lastError = `API request failed (${response.status})`;
        continue;
      }

      const payload = await response.json();
      const videos = normalizeVideoItems(payload);
      if (!videos.length) {
        lastError = "No playable videos found in playlist.";
        continue;
      }

      return {
        videos,
        playlistTitle:
          payload?.playlistTitle ||
          payload?.title ||
          (target.kind === "video" ? "Single Video" : "YouTube Playlist"),
        startIndex: parseBackendStartIndex(payload),
        sessionId: payload?.sourceId || target.sessionId,
      };
    } catch {
      lastError = "Unable to connect to backend API.";
    }
  }

  throw new Error(lastError);
}

function loadYoutubeIframeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("Window is not available"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${YT_IFRAME_API_SRC}"]`);
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = YT_IFRAME_API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    const timeoutId = window.setTimeout(() => {
      reject(new Error("YouTube API loading timed out"));
    }, 15000);

    const intervalId = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearTimeout(timeoutId);
        window.clearInterval(intervalId);
        resolve(window.YT);
      }
    }, 200);
  });

  return ytApiPromise;
}

const Session = () => {
  const location = useLocation();
  const { userId } = useParams();
  const [playlistInput, setPlaylistInput] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [lastSavedProgress, setLastSavedProgress] = useState(null);
  const [isPlaylistCompleted, setIsPlaylistCompleted] = useState(false);
  const [backendStartIndex, setBackendStartIndex] = useState(0);

  const playerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const pendingStartRef = useRef(null);
  const videosRef = useRef([]);
  const currentIndexRef = useRef(0);
  const playlistIdRef = useRef("");
  const playlistTitleRef = useRef("");
  const handledLocationKeyRef = useRef("");
  const storedUser = useMemo(() => {
    const rawUser = localStorage.getItem("focustube_user");
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }, []);
  const authenticatedUserId = storedUser?._id ? String(storedUser._id) : "";
  const routeUserId = userId ? String(userId) : "";
  const isValidUserSession =
    Boolean(authenticatedUserId) && Boolean(routeUserId) && authenticatedUserId === routeUserId;

  const currentVideo = useMemo(() => videos[currentIndex] || null, [videos, currentIndex]);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playlistIdRef.current = playlistId;
  }, [playlistId]);

  useEffect(() => {
    playlistTitleRef.current = playlistTitle;
  }, [playlistTitle]);

  const captureAndSaveProgress = useCallback(() => {
    const player = playerRef.current;
    const currentPlaylistId = playlistIdRef.current;
    const list = videosRef.current;
    const index = currentIndexRef.current;

    if (!player || !currentPlaylistId || !list.length) return null;

    const safeIndex = Math.min(Math.max(index, 0), list.length - 1);
    const currentTimeSec = Math.floor(player.getCurrentTime?.() || 0);
    const video = list[safeIndex];

    const progress = {
      playlistId: currentPlaylistId,
      playlistTitle: playlistTitleRef.current || "YouTube Playlist",
      videoIndex: safeIndex,
      videoId: video.videoId,
      lastVideoTitle: video.title || "",
      currentTimeSec,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };

    saveProgress(currentPlaylistId, progress);
    setLastSavedProgress(progress);
    return progress;
  }, []);

  const syncProgressToBackend = useCallback(async (progress) => {
    if (!progress?.playlistId) return;

    try {
      await saveSessionProgress(progress.playlistId, {
        playlistTitle: progress.playlistTitle,
        videoId: progress.videoId,
        lastVideoTitle: progress.lastVideoTitle,
        videoIndex: progress.videoIndex,
        currentTimeSec: progress.currentTimeSec,
        isCompleted: progress.isCompleted,
      });
    } catch {
      // Keep local progress as fallback when backend sync fails.
    }
  }, []);

  const playNow = useCallback((index, startSeconds = 0) => {
    const list = videosRef.current;
    const player = playerRef.current;
    if (!list.length || !player) return false;

    const boundedIndex = ((index % list.length) + list.length) % list.length;
    const video = list[boundedIndex];
    setIsPlaylistCompleted(false);
    player.loadVideoById({
      videoId: video.videoId,
      startSeconds: Math.max(startSeconds, 0),
    });
    currentIndexRef.current = boundedIndex;
    setCurrentIndex(boundedIndex);
    return true;
  }, []);

  const startPlayback = useCallback(
    (index, startSeconds = 0) => {
      if (!playerReady) {
        pendingStartRef.current = { index, startSeconds };
        return;
      }
      playNow(index, startSeconds);
    },
    [playerReady, playNow]
  );

  const handlePrevious = useCallback(() => {
    const list = videosRef.current;
    if (!list.length) return;
    startPlayback(currentIndexRef.current - 1, 0);
  }, [startPlayback]);

  const handleNext = useCallback(() => {
    const list = videosRef.current;
    if (!list.length) return;
    const currentIdx = currentIndexRef.current;
    if (currentIdx >= list.length - 1) return;
    startPlayback(currentIdx + 1, 0);
  }, [startPlayback]);

  const handleReplayPlaylist = useCallback(() => {
    const currentPlaylistId = playlistIdRef.current;
    const list = videosRef.current;
    if (!list.length) return;

    const firstVideo = list[0];
    const resetProgress = {
      playlistId: currentPlaylistId,
      playlistTitle: playlistTitleRef.current || "YouTube Playlist",
      videoIndex: 0,
      videoId: firstVideo.videoId,
      lastVideoTitle: firstVideo.title || "",
      currentTimeSec: 0,
      isCompleted: false,
      updatedAt: new Date().toISOString(),
    };
    saveProgress(currentPlaylistId, resetProgress);
    setLastSavedProgress(resetProgress);
    void syncProgressToBackend(resetProgress);
    startPlayback(0, 0);
  }, [startPlayback, syncProgressToBackend]);

  const handlePlayerStateChange = useCallback(
    (event) => {
      if (event.data === PLAYER_STATES.PAUSED) {
        const progress = captureAndSaveProgress();
        if (progress) void syncProgressToBackend(progress);
      }

      if (event.data === PLAYER_STATES.ENDED) {
        const progress = captureAndSaveProgress();
        if (progress) void syncProgressToBackend(progress);

        const list = videosRef.current;
        if (!list.length) return;
        const currentIdx = currentIndexRef.current;
        const isLastVideo = currentIdx >= list.length - 1;

        if (isLastVideo) {
          const currentPlaylistId = playlistIdRef.current;
          const firstVideo = list[0];
          const completedVideo = list[currentIdx];
          const completedProgress = {
            playlistId: currentPlaylistId,
            playlistTitle: playlistTitleRef.current || "YouTube Playlist",
            videoIndex: 0,
            videoId: firstVideo?.videoId || completedVideo?.videoId || "",
            lastVideoTitle: completedVideo?.title || "",
            currentTimeSec: 0,
            isCompleted: true,
            updatedAt: new Date().toISOString(),
          };
          saveProgress(currentPlaylistId, completedProgress);
          setLastSavedProgress(completedProgress);
          void syncProgressToBackend(completedProgress);
          setIsPlaylistCompleted(true);
          return;
        }

        playNow(currentIdx + 1, 0);
      }
    },
    [captureAndSaveProgress, playNow, syncProgressToBackend]
  );

  const ensurePlayer = useCallback(async () => {
    await loadYoutubeIframeApi();
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player("session-youtube-player", {
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          if (pendingStartRef.current) {
            playNow(pendingStartRef.current.index, pendingStartRef.current.startSeconds);
            pendingStartRef.current = null;
          }
        },
        onStateChange: handlePlayerStateChange,
        onError: () => {
          setError("This video cannot be played in embedded mode.");
        },
      },
    });
  }, [handlePlayerStateChange, playNow]);

  const loadTarget = useCallback(async (target) => {
    try {
      setIsLoading(true);
      setError("");
      setLastSavedProgress(null);
      setIsPlaylistCompleted(false);
      setBackendStartIndex(0);

      const payload = await fetchPlaylistVideos(target);
      const safeStartIndex = Math.min(
        Math.max(payload.startIndex || 0, 0),
        Math.max(payload.videos.length - 1, 0)
      );

      setPlaylistId(payload.sessionId || target.sessionId);
      setPlaylistTitle(payload.playlistTitle);
      setVideos(payload.videos);
      setBackendStartIndex(safeStartIndex);
      setCurrentIndex(safeStartIndex);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load content.");
      setPlaylistId("");
      setPlaylistTitle("");
      setVideos([]);
      setBackendStartIndex(0);
      setCurrentIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadPlaylist = async (event) => {
    event.preventDefault();
    const parsedTarget = parseYoutubeInput(playlistInput);
    if (!parsedTarget) {
      setError("Please enter a valid YouTube playlist/video URL or ID.");
      return;
    }

    await loadTarget(parsedTarget);
  };

  useEffect(() => {
    const resumeData = location.state?.resumeSession;
    const resumeSessionKey = (resumeData?.playlistId || "").trim();
    const resumeTarget = resolveTargetFromSessionKey(
      resumeSessionKey,
      resumeData?.videoId || ""
    );
    if (!resumeTarget) return;
    if (handledLocationKeyRef.current === location.key) return;

    if (!isValidUserSession) {
      setError("Invalid user session. Please login again.");
      return;
    }

    const ownerUserId = resumeData?.ownerUserId ? String(resumeData.ownerUserId) : "";
    if (ownerUserId && ownerUserId !== authenticatedUserId) {
      setError("This playlist was saved by another user.");
      return;
    }

    handledLocationKeyRef.current = location.key;

    setPlaylistInput(resumeTarget.normalizedInput || resumeTarget.sourceId);

    const resumeProgress = {
      playlistId: resumeTarget.sessionId,
      playlistTitle: resumeData?.playlistTitle || "YouTube Playlist",
      videoId: resumeData?.videoId || "",
      lastVideoTitle: resumeData?.lastVideoTitle || "",
      videoIndex: Math.max(0, Number(resumeData?.videoIndex) || 0),
      currentTimeSec: Math.max(0, Number(resumeData?.currentTimeSec) || 0),
      isCompleted: Boolean(resumeData?.isCompleted),
      updatedAt: resumeData?.updatedAt || new Date().toISOString(),
    };

    saveProgress(resumeTarget.sessionId, resumeProgress);
    void loadTarget(resumeTarget);
  }, [authenticatedUserId, isValidUserSession, loadTarget, location.key, location.state]);

  useEffect(() => {
    if (!playlistId || !videos.length) return;

    let isCancelled = false;

    const initialize = async () => {
      try {
        await ensurePlayer();
        if (isCancelled) return;

        const localSaved = getSavedProgress(playlistId);
        let remoteSaved = null;

        try {
          const remoteResponse = await getSessionProgress(playlistId);
          remoteSaved = remoteResponse?.data || null;
        } catch {
          remoteSaved = null;
        }

        const saved = pickLatestProgress(localSaved, remoteSaved);
        if (saved && typeof saved.videoIndex === "number") {
          const safeIndex = Math.min(Math.max(saved.videoIndex, 0), videos.length - 1);
          const safeTime = Math.max(0, Number(saved.currentTimeSec) || 0);
          const normalizedSaved = {
            ...saved,
            videoIndex: safeIndex,
            currentTimeSec: safeTime,
          };

          saveProgress(playlistId, normalizedSaved);
          setLastSavedProgress(normalizedSaved);
          startPlayback(safeIndex, safeTime);
          return;
        }

        startPlayback(backendStartIndex, 0);
      } catch {
        if (!isCancelled) {
          setError("Unable to initialize YouTube player.");
        }
      }
    };

    initialize();

    return () => {
      isCancelled = true;
    };
  }, [backendStartIndex, ensurePlayer, playlistId, startPlayback, videos]);

  useEffect(() => {
    if (!playerReady || !playlistId || !videos.length) return undefined;

    saveIntervalRef.current = window.setInterval(() => {
      const progress = captureAndSaveProgress();
      if (progress) void syncProgressToBackend(progress);
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [captureAndSaveProgress, playerReady, playlistId, syncProgressToBackend, videos.length]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const progress = captureAndSaveProgress();
      if (progress) void syncProgressToBackend(progress);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [captureAndSaveProgress, syncProgressToBackend]);

  useEffect(() => {
    return () => {
      const progress = captureAndSaveProgress();
      if (progress) void syncProgressToBackend(progress);

      if (saveIntervalRef.current) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [captureAndSaveProgress, syncProgressToBackend]);

  const controlsDisabled = !videos.length;
  const isAtFirstVideo = currentIndex <= 0;
  const isAtLastVideo = !videos.length || currentIndex >= videos.length - 1;

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardHeader>
        <CardTitle>YouTube Session</CardTitle>
        <CardDescription>
          Paste playlist or single-video URL/ID, then continue exactly where you left off.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleLoadPlaylist} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-2">
            <Label htmlFor="playlist-url">Playlist / Video</Label>
            <Input
              id="playlist-url"
              type="text"
              placeholder="Playlist URL/ID or Video URL/ID"
              value={playlistInput}
              onChange={(event) => setPlaylistInput(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Load Playlist"}
          </Button>
        </form>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {playlistId && videos.length ? (
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{playlistTitle || "Playlist Loaded"}</p>
            <p>{videos.length} videos found</p>
            {currentVideo ? <p>Now playing: {currentVideo.title}</p> : null}
            {isPlaylistCompleted ? (
              <p className="font-medium text-foreground">Playlist completed.</p>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border">
          <div id="session-youtube-player" className="h-[240px] w-full bg-muted sm:h-[420px]" />
        </div>

        {videos.length ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={controlsDisabled || isAtFirstVideo}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNext}
              disabled={controlsDisabled || isAtLastVideo}
            >
              Next
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReplayPlaylist}
              disabled={controlsDisabled}
            >
              Replay Playlist
            </Button>
          </div>
        ) : null}

        {videos.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Sequence</p>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {videos.map((video, index) => (
                <button
                  key={`${video.videoId}-${index}`}
                  type="button"
                  onClick={() => startPlayback(index, 0)}
                  className={`w-full rounded-md border p-2 text-left text-sm transition ${
                    index === currentIndex ? "border-primary bg-primary/10" : "hover:bg-muted/60"
                  }`}
                >
                  {index + 1}. {video.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {lastSavedProgress ? (
          <p className="text-xs text-muted-foreground">
            Last saved: video #{lastSavedProgress.videoIndex + 1} at{" "}
            {lastSavedProgress.currentTimeSec}s
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default Session;
