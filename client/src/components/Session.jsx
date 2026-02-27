import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

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

function extractPlaylistId(value) {
  const input = value.trim();
  if (!input) return "";

  if (!input.includes("http")) return input;

  try {
    const url = new URL(input);
    return url.searchParams.get("list") || "";
  } catch {
    return "";
  }
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

function clearProgress(playlistId) {
  if (!playlistId) return;
  localStorage.removeItem(getProgressStorageKey(playlistId));
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

async function fetchPlaylistVideos(playlistId) {
  const endpoints = [
    `${API_BASE_URL}/youtube/playlist-videos?playlistId=${encodeURIComponent(playlistId)}`,
    `${API_BASE_URL}/youtube/playlist-items?playlistId=${encodeURIComponent(playlistId)}`,
    `${API_BASE_URL}/playlist-videos?playlistId=${encodeURIComponent(playlistId)}`,
  ];

  let lastError = "Failed to fetch playlist videos from backend.";

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
        playlistTitle: payload?.playlistTitle || payload?.title || "YouTube Playlist",
        startIndex: parseBackendStartIndex(payload),
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
  const [playlistInput, setPlaylistInput] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [pendingResumeProgress, setPendingResumeProgress] = useState(null);
  const [lastSavedProgress, setLastSavedProgress] = useState(null);
  const [isPlaylistCompleted, setIsPlaylistCompleted] = useState(false);
  const [backendStartIndex, setBackendStartIndex] = useState(0);

  const playerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const pendingStartRef = useRef(null);
  const videosRef = useRef([]);
  const currentIndexRef = useRef(0);
  const playlistIdRef = useRef("");

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

  const captureAndSaveProgress = useCallback(() => {
    const player = playerRef.current;
    const currentPlaylistId = playlistIdRef.current;
    const list = videosRef.current;
    const index = currentIndexRef.current;

    if (!player || !currentPlaylistId || !list.length || pendingResumeProgress) return null;

    const safeIndex = Math.min(Math.max(index, 0), list.length - 1);
    const currentTimeSec = Math.floor(player.getCurrentTime?.() || 0);
    const video = list[safeIndex];

    const progress = {
      playlistId: currentPlaylistId,
      videoIndex: safeIndex,
      videoId: video.videoId,
      currentTimeSec,
      updatedAt: new Date().toISOString(),
    };

    saveProgress(currentPlaylistId, progress);
    setLastSavedProgress(progress);
    return progress;
  }, [pendingResumeProgress]);

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
    [playerReady, playNow],
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
    if (!videosRef.current.length) return;
    clearProgress(currentPlaylistId);
    setLastSavedProgress(null);
    setPendingResumeProgress(null);
    startPlayback(0, 0);
  }, [startPlayback]);

  const handlePlayerStateChange = useCallback(
    (event) => {
      if (event.data === PLAYER_STATES.PAUSED) {
        captureAndSaveProgress();
      }

      if (event.data === PLAYER_STATES.ENDED) {
        captureAndSaveProgress();
        const list = videosRef.current;
        if (!list.length) return;
        const currentIdx = currentIndexRef.current;
        const isLastVideo = currentIdx >= list.length - 1;
        if (isLastVideo) {
          clearProgress(playlistIdRef.current);
          setLastSavedProgress(null);
          setIsPlaylistCompleted(true);
          return;
        }
        const nextIndex = currentIdx + 1;
        playNow(nextIndex, 0);
      }
    },
    [captureAndSaveProgress, playNow],
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

  const handleLoadPlaylist = async (event) => {
    event.preventDefault();
    const parsedId = extractPlaylistId(playlistInput);
    if (!parsedId) {
      setError("Please enter a valid YouTube playlist URL or playlist ID.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setPendingResumeProgress(null);
      setLastSavedProgress(null);
      setIsPlaylistCompleted(false);
      setBackendStartIndex(0);

      const payload = await fetchPlaylistVideos(parsedId);
      const safeStartIndex = Math.min(
        Math.max(payload.startIndex || 0, 0),
        Math.max(payload.videos.length - 1, 0),
      );
      setPlaylistId(parsedId);
      setPlaylistTitle(payload.playlistTitle);
      setVideos(payload.videos);
      setBackendStartIndex(safeStartIndex);
      setCurrentIndex(safeStartIndex);
    } catch (fetchError) {
      setError(fetchError.message || "Failed to load playlist.");
      setPlaylistId("");
      setPlaylistTitle("");
      setVideos([]);
      setBackendStartIndex(0);
      setCurrentIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!playlistId || !videos.length) return;

    let isCancelled = false;
    const initialize = async () => {
      try {
        await ensurePlayer();
        if (isCancelled) return;

        const saved = getSavedProgress(playlistId);
        if (saved && typeof saved.videoIndex === "number") {
          const safeIndex = Math.min(Math.max(saved.videoIndex, 0), videos.length - 1);
          setPendingResumeProgress({
            ...saved,
            videoIndex: safeIndex,
          });
          setLastSavedProgress(saved);
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
    if (!playerReady || !playlistId || !videos.length || pendingResumeProgress) return undefined;

    saveIntervalRef.current = window.setInterval(() => {
      captureAndSaveProgress();
    }, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [captureAndSaveProgress, pendingResumeProgress, playerReady, playlistId, videos.length]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      captureAndSaveProgress();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [captureAndSaveProgress]);

  useEffect(() => {
    return () => {
      captureAndSaveProgress();
      if (saveIntervalRef.current) {
        window.clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [captureAndSaveProgress]);

  const controlsDisabled = !videos.length || Boolean(pendingResumeProgress);
  const isAtFirstVideo = currentIndex <= 0;
  const isAtLastVideo = !videos.length || currentIndex >= videos.length - 1;

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardHeader>
        <CardTitle>YouTube Session</CardTitle>
        <CardDescription>
          Paste playlist URL, fetch videos from backend API, and play in custom sequence.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={handleLoadPlaylist} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full space-y-2">
            <Label htmlFor="playlist-url">Playlist URL</Label>
            <Input
              id="playlist-url"
              type="text"
              placeholder="https://www.youtube.com/playlist?list=..."
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

        {pendingResumeProgress ? (
          <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Resume from video #{pendingResumeProgress.videoIndex + 1} at{" "}
              {pendingResumeProgress.currentTimeSec || 0}s?
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const resumeIndex = videos.findIndex(
                    (video) => video.videoId === pendingResumeProgress.videoId,
                  );
                  const indexToUse =
                    resumeIndex >= 0 ? resumeIndex : pendingResumeProgress.videoIndex || 0;
                  startPlayback(indexToUse, pendingResumeProgress.currentTimeSec || 0);
                  setPendingResumeProgress(null);
                }}
              >
                Resume
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  clearProgress(playlistId);
                  setLastSavedProgress(null);
                  setPendingResumeProgress(null);
                  startPlayback(0, 0);
                }}
              >
                Start Over
              </Button>
            </div>
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
                    index === currentIndex
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted/60"
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
