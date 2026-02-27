const YT_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS_PER_PAGE = 50;

const fetchJson = async (url) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = payload?.error?.message;
    throw new Error(apiMessage || `YouTube API request failed (${response.status})`);
  }

  return payload;
};

const getPlaylistTitle = async (playlistId, apiKey) => {
  const url =
    `${YT_API_BASE_URL}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const payload = await fetchJson(url);
  const title = payload?.items?.[0]?.snippet?.title;
  return title || "YouTube Playlist";
};

const getPlaylistItems = async (playlistId, apiKey) => {
  const items = [];
  let pageToken = "";
  let safetyCounter = 0;

  while (safetyCounter < 20) {
    safetyCounter += 1;
    const url =
      `${YT_API_BASE_URL}/playlistItems?part=snippet&maxResults=${MAX_RESULTS_PER_PAGE}` +
      `&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(apiKey)}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const payload = await fetchJson(url);
    const pageItems = Array.isArray(payload?.items) ? payload.items : [];

    items.push(
      ...pageItems
        .map((item) => {
          const videoId = item?.snippet?.resourceId?.videoId || "";
          const title = item?.snippet?.title || "";
          if (!videoId) return null;
          return {
            videoId,
            title: title || `Video ${videoId}`,
          };
        })
        .filter(Boolean)
    );

    pageToken = payload?.nextPageToken || "";
    if (!pageToken) break;
  }

  return items;
};

export const getPlaylistVideos = async (req, res) => {
  try {
    const playlistId = req.query.playlistId?.trim();
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "playlistId query parameter is required",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "YOUTUBE_API_KEY is missing in server environment",
      });
    }

    const [playlistTitle, items] = await Promise.all([
      getPlaylistTitle(playlistId, apiKey),
      getPlaylistItems(playlistId, apiKey),
    ]);

    if (!items.length) {
      return res.status(404).json({
        success: false,
        message: "No videos found for this playlist",
      });
    }

    return res.status(200).json({
      playlistTitle,
      items,
      startIndex: 0,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Failed to fetch playlist videos from YouTube Data API",
      error: error.message,
    });
  }
};
