export const ACTIVE_SESSION_VIDEO_STORAGE_KEY =
  "focustube_active_session_video";

const sanitizeString = (value) => String(value || "").trim();

const isValidYoutubeVideoId = (value = "") => /^[\w-]{11}$/.test(value);

export const buildYoutubeWatchUrl = (videoId, playlistId = "") => {
  const safeVideoId = sanitizeString(videoId);
  if (!isValidYoutubeVideoId(safeVideoId)) return "";

  const safePlaylistId = sanitizeString(playlistId);
  const baseUrl = `https://www.youtube.com/watch?v=${safeVideoId}`;
  if (!safePlaylistId || safePlaylistId.startsWith("video:")) return baseUrl;
  return `${baseUrl}&list=${encodeURIComponent(safePlaylistId)}`;
};

export const saveActiveSessionVideo = ({ videoId, title = "", playlistId = "" }) => {
  if (typeof window === "undefined") return;
  const safeVideoId = sanitizeString(videoId);
  if (!isValidYoutubeVideoId(safeVideoId)) return;

  const payload = {
    videoId: safeVideoId,
    title: sanitizeString(title),
    playlistId: sanitizeString(playlistId),
    url: buildYoutubeWatchUrl(safeVideoId, playlistId),
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    ACTIVE_SESSION_VIDEO_STORAGE_KEY,
    JSON.stringify(payload)
  );
};

export const loadActiveSessionVideo = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACTIVE_SESSION_VIDEO_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!isValidYoutubeVideoId(parsed?.videoId)) return null;

    const safePlaylistId = sanitizeString(parsed?.playlistId);
    return {
      videoId: sanitizeString(parsed.videoId),
      title: sanitizeString(parsed?.title),
      playlistId: safePlaylistId,
      url:
        sanitizeString(parsed?.url) ||
        buildYoutubeWatchUrl(parsed.videoId, safePlaylistId),
      updatedAt: sanitizeString(parsed?.updatedAt),
    };
  } catch {
    return null;
  }
};
