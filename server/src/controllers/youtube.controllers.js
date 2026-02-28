const YT_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const GEMINI_API_BASE_URLS = [
  "https://generativelanguage.googleapis.com/v1beta",
  "https://generativelanguage.googleapis.com/v1",
];
const MAX_RESULTS_PER_PAGE = 50;
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch";
const MAX_QUESTION_LENGTH = 1000;
const MAX_TRANSCRIPT_CHARS_FOR_AI = 20000;
const MAX_FALLBACK_SENTENCES = 4;
const MAX_CHAT_HISTORY_ITEMS = 12;
const MAX_CHAT_MESSAGE_CHARS = 800;
const TRANSCRIPT_UNAVAILABLE_CODE = "TRANSCRIPT_UNAVAILABLE";
const AI_PROVIDER_FAILED_CODE = "AI_PROVIDER_FAILED";
const DEFAULT_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

const isUsableApiKey = (value = "") => {
  const key = String(value || "").trim();
  if (!key) return false;
  const lowered = key.toLowerCase();
  return (
    !lowered.includes("your_") &&
    !lowered.includes("placeholder") &&
    !lowered.includes("replace_me")
  );
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: DEFAULT_REQUEST_HEADERS,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = payload?.error?.message;
    throw new Error(apiMessage || `YouTube API request failed (${response.status})`);
  }

  return payload;
};

const decodeHtmlEntities = (input = "") =>
  input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");

const sanitizeText = (input = "") =>
  decodeHtmlEntities(input).replace(/\s+/g, " ").trim();

const extractVideoId = (input = "") => {
  const value = String(input || "").trim();
  if (!value) return "";

  if (/^[\w-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const paramVideoId = url.searchParams.get("v");
    if (paramVideoId && /^[\w-]{11}$/.test(paramVideoId)) return paramVideoId;

    const hostname = url.hostname.replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be" && parts[0] && /^[\w-]{11}$/.test(parts[0])) {
      return parts[0];
    }

    if (
      (parts[0] === "shorts" || parts[0] === "embed") &&
      parts[1] &&
      /^[\w-]{11}$/.test(parts[1])
    ) {
      return parts[1];
    }
  } catch {
    return "";
  }

  return "";
};

const findJsonObjectAfterToken = (source, token) => {
  const tokenIndex = source.indexOf(token);
  if (tokenIndex === -1) return null;

  const objectStartIndex = source.indexOf("{", tokenIndex + token.length);
  if (objectStartIndex === -1) return null;

  let depth = 0;
  let isInString = false;
  let escaped = false;
  for (let index = objectStartIndex; index < source.length; index += 1) {
    const char = source[index];

    if (isInString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        isInString = false;
      }
      continue;
    }

    if (char === '"') {
      isInString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(objectStartIndex, index + 1);
      }
    }
  }

  return null;
};

const pickPreferredCaptionTrack = (captionTracks = []) => {
  if (!captionTracks.length) return null;

  const english =
    captionTracks.find((track) => track.languageCode === "en") ||
    captionTracks.find((track) => String(track.languageCode || "").startsWith("en-")) ||
    captionTracks.find((track) => String(track.name?.simpleText || "").toLowerCase().includes("english"));

  return english || captionTracks[0];
};

const parseTranscriptFromJson3 = (payload) => {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const chunks = [];

  events.forEach((event) => {
    if (!Array.isArray(event?.segs)) return;
    const merged = event.segs
      .map((segment) => (typeof segment?.utf8 === "string" ? segment.utf8 : ""))
      .join("");
    const clean = sanitizeText(merged);
    if (clean) chunks.push(clean);
  });

  return sanitizeText(chunks.join(" "));
};

const parseTranscriptFromXml = (xml) => {
  const textMatches = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || [];
  const chunks = textMatches
    .map((item) => item.replace(/^<text[^>]*>/, "").replace(/<\/text>$/, ""))
    .map((item) => sanitizeText(item))
    .filter(Boolean);

  return sanitizeText(chunks.join(" "));
};

const parseLegacyTimedTextTracks = (xml = "") => {
  const tracks = [];
  const trackMatches = xml.match(/<track\s+[^>]*\/>/g) || [];

  trackMatches.forEach((tag) => {
    const getAttr = (name) => {
      const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return match?.[1] || "";
    };

    const langCode = getAttr("lang_code");
    if (!langCode) return;

    tracks.push({
      langCode,
      name: decodeHtmlEntities(getAttr("name") || ""),
      kind: getAttr("kind") || "",
      langOriginal: decodeHtmlEntities(getAttr("lang_original") || ""),
      langTranslated: decodeHtmlEntities(getAttr("lang_translated") || ""),
    });
  });

  return tracks;
};

const buildLegacyTimedTextUrl = (videoId, track) => {
  const params = new URLSearchParams();
  params.set("v", videoId);
  params.set("lang", track.langCode);
  if (track.name) params.set("name", track.name);
  if (track.kind) params.set("kind", track.kind);
  return `https://video.google.com/timedtext?${params.toString()}`;
};

const fetchTranscriptFromLegacyTimedText = async (videoId) => {
  const listUrl = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listResponse = await fetch(listUrl, {
    headers: DEFAULT_REQUEST_HEADERS,
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to fetch transcript tracks list (${listResponse.status})`);
  }

  const listXml = await listResponse.text();
  const tracks = parseLegacyTimedTextTracks(listXml);
  if (!tracks.length) {
    throw new Error("No transcript tracks found");
  }

  const orderedTracks = [
    ...tracks.filter((track) => track.langCode === "en"),
    ...tracks.filter(
      (track) => track.langCode.startsWith("en-") && track.langCode !== "en"
    ),
    ...tracks.filter((track) => !track.langCode.startsWith("en")),
  ];

  const seen = new Set();
  for (const track of orderedTracks) {
    const key = `${track.langCode}|${track.name}|${track.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const trackUrl = buildLegacyTimedTextUrl(videoId, track);
    const response = await fetch(trackUrl, {
      headers: DEFAULT_REQUEST_HEADERS,
    });
    if (!response.ok) continue;

    const xml = await response.text();
    const transcript = parseTranscriptFromXml(xml);
    if (transcript) {
      return {
        transcript,
        languageCode: track.langCode,
      };
    }
  }

  throw new Error("Transcript is empty for this video");
};

const fetchTranscriptByTrackUrl = async (baseUrl) => {
  const jsonUrl = baseUrl.includes("fmt=") ? baseUrl : `${baseUrl}&fmt=json3`;
  const jsonResponse = await fetch(jsonUrl, {
    headers: DEFAULT_REQUEST_HEADERS,
  });
  if (jsonResponse.ok) {
    const jsonPayload = await jsonResponse.json().catch(() => null);
    const transcriptFromJson = parseTranscriptFromJson3(jsonPayload);
    if (transcriptFromJson) return transcriptFromJson;
  }

  const xmlResponse = await fetch(baseUrl, {
    headers: DEFAULT_REQUEST_HEADERS,
  });
  if (!xmlResponse.ok) {
    throw new Error(`Transcript request failed (${xmlResponse.status})`);
  }

  const xmlPayload = await xmlResponse.text();
  const transcriptFromXml = parseTranscriptFromXml(xmlPayload);
  if (!transcriptFromXml) {
    throw new Error("Transcript is empty for this video");
  }
  return transcriptFromXml;
};

const fetchVideoTranscript = async (videoId) => {
  const watchUrl = `${YOUTUBE_WATCH_URL}?v=${encodeURIComponent(videoId)}&hl=en`;
  const watchResponse = await fetch(watchUrl, {
    headers: DEFAULT_REQUEST_HEADERS,
  });

  if (!watchResponse.ok) {
    throw new Error(`Failed to load YouTube watch page (${watchResponse.status})`);
  }

  const html = await watchResponse.text();
  const playerResponseRaw =
    findJsonObjectAfterToken(html, "ytInitialPlayerResponse = ") ||
    findJsonObjectAfterToken(html, "var ytInitialPlayerResponse = ");

  if (!playerResponseRaw) {
    throw new Error("Unable to parse YouTube player response");
  }

  const playerResponse = JSON.parse(playerResponseRaw);
  const title = sanitizeText(playerResponse?.videoDetails?.title || "");
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  if (!captionTracks.length) {
    throw new Error("No transcript/captions available for this video");
  }

  const selectedTrack = pickPreferredCaptionTrack(captionTracks);
  const candidateTracks = [
    ...(selectedTrack ? [selectedTrack] : []),
    ...captionTracks.filter((track) => track !== selectedTrack),
  ].filter((track) => Boolean(track?.baseUrl));

  for (const track of candidateTracks) {
    try {
      const transcript = await fetchTranscriptByTrackUrl(track.baseUrl);
      if (transcript) {
        return {
          transcript,
          title: title || `Video ${videoId}`,
          languageCode: track.languageCode || "",
        };
      }
    } catch {
      // Try next track.
    }
  }

  try {
    const legacyResult = await fetchTranscriptFromLegacyTimedText(videoId);
    return {
      transcript: legacyResult.transcript,
      title: title || `Video ${videoId}`,
      languageCode: legacyResult.languageCode || "",
    };
  } catch (legacyError) {
    throw new Error(
      "Transcript unavailable for this video (captions may be disabled/private/restricted). Try another video with captions."
    );
  }
};

const buildPromptForAi = ({
  question,
  contextText,
  videoTitle,
  videoId,
  contextLabel = "Transcript",
}) => {
  const trimmedContext = contextText.slice(0, MAX_TRANSCRIPT_CHARS_FOR_AI);

  return `You are a precise assistant answering questions from YouTube source context.
Answer using only the provided context. If the context is insufficient, say what is missing.
Keep the response concise, clear, and actionable.

Video title: ${videoTitle || "Unknown"}
Video ID: ${videoId}
${contextLabel}:
${trimmedContext}

Question:
${question}`;
};

const extractOpenAiText = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join(" ")
      .trim();
  }
  return "";
};

const askOpenAi = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!isUsableApiKey(apiKey)) throw new Error("OPENAI_API_KEY is missing");

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You answer strictly from the provided transcript. Be concise and structured.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = payload?.error?.message;
    throw new Error(apiMessage || `OpenAI request failed (${response.status})`);
  }

  const answer = extractOpenAiText(payload);
  if (!answer) throw new Error("OpenAI returned empty response");
  return answer;
};

const normalizeGeminiModelName = (model = "") =>
  String(model || "")
    .trim()
    .replace(/^models\//i, "");

const isGeminiModelNotFoundError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const status = Number(error?.status || 0);
  return (
    status === 404 ||
    message.includes("not found") ||
    message.includes("not supported for generatecontent")
  );
};

const extractGeminiText = (payload) => {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join(" ")
    .trim();

  return text || "";
};

const callGeminiGenerateContent = async ({ apiKey, model, prompt }) => {
  const safeModel = normalizeGeminiModelName(model);
  let lastError = null;

  for (const baseUrl of GEMINI_API_BASE_URLS) {
    const endpoint = `${baseUrl}/models/${encodeURIComponent(safeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = payload?.error?.message;
      const error = new Error(apiMessage || `Gemini request failed (${response.status})`);
      error.status = response.status;
      error.model = safeModel;
      error.baseUrl = baseUrl;
      lastError = error;

      if (isGeminiModelNotFoundError(error)) {
        continue;
      }

      throw error;
    }

    const answer = extractGeminiText(payload);
    if (!answer) {
      const error = new Error("Gemini returned empty response");
      error.model = safeModel;
      error.baseUrl = baseUrl;
      throw error;
    }

    return answer;
  }

  throw lastError || new Error("Gemini request failed");
};

const listGeminiGenerateContentModels = async (apiKey) => {
  const discoveredModels = [];

  for (const baseUrl of GEMINI_API_BASE_URLS) {
    const endpoint = `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) continue;

    const payload = await response.json().catch(() => ({}));
    const models = Array.isArray(payload?.models) ? payload.models : [];

    discoveredModels.push(
      ...models
        .filter((model) =>
          Array.isArray(model?.supportedGenerationMethods)
            ? model.supportedGenerationMethods.includes("generateContent")
            : false
        )
        .map((model) => normalizeGeminiModelName(model?.name || ""))
        .filter(Boolean)
    );
  }

  return Array.from(new Set(discoveredModels));
};

const askGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!isUsableApiKey(apiKey)) throw new Error("GEMINI_API_KEY is missing");

  const configuredModel = normalizeGeminiModelName(
    process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash"
  );
  const candidateModels = Array.from(
    new Set([configuredModel, ...GEMINI_FALLBACK_MODELS.map(normalizeGeminiModelName)])
  ).filter(Boolean);

  let lastModelError = null;
  for (const model of candidateModels) {
    try {
      return await callGeminiGenerateContent({
        apiKey,
        model,
        prompt,
      });
    } catch (error) {
      lastModelError = error;
      if (isGeminiModelNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }

  const availableModels = await listGeminiGenerateContentModels(apiKey).catch(() => []);
  const suggestedModel = availableModels[0] || "gemini-2.0-flash";
  const availableMessage = availableModels.length
    ? ` Available models: ${availableModels.slice(0, 8).join(", ")}.`
    : "";

  throw new Error(
    `Configured Gemini model is unavailable. Set GEMINI_MODEL=${suggestedModel}.${availableMessage} Last error: ${lastModelError?.message || "unknown"}`
  );
};

const fallbackContextAnswer = (question, contextText) => {
  const questionTerms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const sentenceCandidates = contextText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sanitizeText(sentence))
    .filter(Boolean);

  const scored = sentenceCandidates.map((sentence) => {
    const lower = sentence.toLowerCase();
    const score = questionTerms.reduce(
      (accumulator, term) => (lower.includes(term) ? accumulator + 1 : accumulator),
      0
    );
    return { sentence, score };
  });

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FALLBACK_SENTENCES)
    .map((item) => item.sentence)
    .filter(Boolean);

  if (!selected.length) {
    return "Video context mil gaya, but AI provider key missing hai. Please set GEMINI_API_KEY or OPENAI_API_KEY for smart answers.";
  }

  return `AI key missing, so yeh context-based fallback answer hai:\n${selected.join(" ")}`;
};

const resolveAiProvider = (requestedProvider) => {
  const normalized = String(requestedProvider || "").toLowerCase().trim();
  const hasGemini = isUsableApiKey(process.env.GEMINI_API_KEY);
  const hasOpenAi = isUsableApiKey(process.env.OPENAI_API_KEY);

  if (normalized === "gemini") {
    if (!hasGemini) throw new Error("Requested provider Gemini is not configured");
    return "gemini";
  }

  if (normalized === "openai") {
    if (!hasOpenAi) throw new Error("Requested provider OpenAI is not configured");
    return "openai";
  }

  if (hasGemini) return "gemini";
  if (hasOpenAi) return "openai";
  return "local";
};

const generateAnswerFromContext = async ({
  question,
  contextText,
  videoId,
  videoTitle,
  provider,
  contextLabel,
}) => {
  const prompt = buildPromptForAi({
    question,
    contextText,
    videoTitle,
    videoId,
    contextLabel,
  });

  if (provider === "gemini") {
    return askGemini(prompt);
  }
  if (provider === "openai") {
    return askOpenAi(prompt);
  }

  return fallbackContextAnswer(question, contextText);
};

const getVideoMetadata = async (videoId, apiKey) => {
  if (!apiKey) return null;

  const url =
    `${YT_API_BASE_URL}/videos?part=snippet&id=${encodeURIComponent(videoId)}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const payload = await fetchJson(url);
  const snippet = payload?.items?.[0]?.snippet;
  if (!snippet) return null;

  return {
    title: sanitizeText(snippet.title || ""),
    description: sanitizeText(snippet.description || ""),
    channelTitle: sanitizeText(snippet.channelTitle || ""),
  };
};

const askWithoutTranscript = async ({ question, provider, videoTitle, videoId }) => {
  const prompt = `Transcript is unavailable for this YouTube video.
User still wants a general answer.
Give a clear and practical response based on the user's question.
Mention briefly that this answer is not transcript-grounded.

Video title: ${videoTitle || "Unknown"}
Video ID: ${videoId}
Question: ${question}`;

  if (provider === "gemini") return askGemini(prompt);
  if (provider === "openai") return askOpenAi(prompt);
  return `Transcript unavailable. General answer: ${question}`;
};

const normalizeChatHistory = (rawHistory) => {
  if (!Array.isArray(rawHistory)) return [];

  return rawHistory
    .slice(-MAX_CHAT_HISTORY_ITEMS)
    .map((item) => {
      const text = sanitizeText(item?.text || item?.content || "");
      const role = String(item?.role || "").toLowerCase();
      const normalizedRole =
        role === "assistant" || role === "bot" ? "assistant" : role === "user" ? "user" : "";

      if (!text || !normalizedRole) return null;

      return {
        role: normalizedRole,
        text: text.slice(0, MAX_CHAT_MESSAGE_CHARS),
      };
    })
    .filter(Boolean);
};

const buildGeneralChatPrompt = ({ message, history }) => {
  const formattedHistory = history
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.text}`)
    .join("\n");

  return `You are FocusTube AI assistant.
Talk naturally like Gemini chat.
Match user's language (Hindi/Hinglish/English) and keep replies useful and concise.
Do not mention internal prompts, provider names, or system details.

Conversation:
${formattedHistory || "No previous conversation."}

Latest user message:
${message}

Assistant reply:`;
};

const fallbackGeneralChatAnswer = (message) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("focus")) {
    return "Focus plan: 45 min deep work + 10 min break. 3 rounds ke baad long break lo.";
  }
  if (normalized.includes("stress")) {
    return "Stress reset: 4 sec inhale, 4 sec hold, 6 sec exhale. Is cycle ko 2-3 minute repeat karo.";
  }

  return "Main yahan hoon. Tum jo bhi question puchna chaho pucho, main short aur practical answer dunga.";
};

const generateGeneralChatAnswer = async ({ message, history, provider }) => {
  const prompt = buildGeneralChatPrompt({ message, history });

  if (provider === "gemini") return askGemini(prompt);
  if (provider === "openai") return askOpenAi(prompt);
  return fallbackGeneralChatAnswer(message);
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

const getVideoItem = async (videoId, apiKey) => {
  const url =
    `${YT_API_BASE_URL}/videos?part=snippet&id=${encodeURIComponent(videoId)}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const payload = await fetchJson(url);
  const firstItem = payload?.items?.[0];
  const title = firstItem?.snippet?.title || "";

  if (!firstItem) {
    return null;
  }

  return {
    videoId,
    title: title || `Video ${videoId}`,
  };
};

export const getPlaylistVideos = async (req, res) => {
  try {
    const playlistId = req.query.playlistId?.trim();
    const videoId = req.query.videoId?.trim();
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();

    if (!playlistId && !videoId) {
      return res.status(400).json({
        success: false,
        message: "playlistId or videoId query parameter is required",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "YOUTUBE_API_KEY is missing in server environment",
      });
    }

    if (playlistId) {
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
        sourceType: "playlist",
        sourceId: playlistId,
      });
    }

    const item = await getVideoItem(videoId, apiKey);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.status(200).json({
      playlistTitle: item.title || "Single Video",
      items: [item],
      startIndex: 0,
      sourceType: "video",
      sourceId: `video:${videoId}`,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Failed to fetch data from YouTube Data API",
      error: error.message,
    });
  }
};

export const askYoutubeQuestion = async (req, res) => {
  try {
    const youtubeUrl = req.body?.youtubeUrl?.trim() || "";
    const rawVideoId = req.body?.videoId?.trim() || "";
    const question = req.body?.question?.trim() || "";
    const requestedProvider = req.body?.provider;
    const allowWithoutTranscript = req.body?.allowWithoutTranscript === true;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "question is required",
      });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `question is too long (max ${MAX_QUESTION_LENGTH} chars)`,
      });
    }

    const videoId = extractVideoId(rawVideoId || youtubeUrl);
    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Valid YouTube link or videoId is required",
      });
    }

    let provider = resolveAiProvider(requestedProvider);
    let title = `Video ${videoId}`;
    let languageCode = "";
    let contextSource = "transcript";
    let contextLabel = "Transcript";
    let contextText = "";
    const apiKey = process.env.YOUTUBE_API_KEY?.trim();

    try {
      const transcriptResult = await fetchVideoTranscript(videoId);
      contextText = transcriptResult.transcript;
      title = transcriptResult.title || title;
      languageCode = transcriptResult.languageCode || "";
    } catch (transcriptError) {
      const metadata = await getVideoMetadata(videoId, apiKey);
      title = metadata?.title || title;

      if (!allowWithoutTranscript) {
        return res.status(409).json({
          success: false,
          code: TRANSCRIPT_UNAVAILABLE_CODE,
          message:
            "Transcript unavailable for this video. Continue without transcript if you want a general answer.",
          videoId,
          videoTitle: title,
          canProceedWithoutTranscript: true,
        });
      }

      contextSource = "no-transcript-user-consent";
      contextLabel = "Question Only";
      contextText = question;
    }

    if (!contextText) {
      throw new Error("No usable context available for answer generation");
    }

    let answer = "";

    try {
      if (contextSource === "no-transcript-user-consent") {
        answer = await askWithoutTranscript({
          question,
          provider,
          videoTitle: title,
          videoId,
        });
      } else {
        answer = await generateAnswerFromContext({
          question,
          contextText,
          videoId,
          videoTitle: title,
          provider,
          contextLabel,
        });
      }
    } catch (aiError) {
      provider = "local-fallback";
      answer =
        contextSource === "no-transcript-user-consent"
          ? `Transcript unavailable. General fallback answer: ${question}`
          : fallbackContextAnswer(question, contextText);
    }

    return res.status(200).json({
      success: true,
      videoId,
      videoTitle: title,
      provider,
      contextSource,
      languageCode,
      transcriptLength: contextText.length,
      transcriptPreview: contextText.slice(0, 280),
      answer,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Failed to process YouTube transcript question",
      error: error.message,
    });
  }
};

export const chatWithAssistant = async (req, res) => {
  try {
    const message = sanitizeText(req.body?.message || req.body?.question || "");
    const requestedProvider = req.body?.provider || "gemini";
    const history = normalizeChatHistory(req.body?.history);

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "message is required",
      });
    }

    if (message.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `message is too long (max ${MAX_QUESTION_LENGTH} chars)`,
      });
    }

    let provider = resolveAiProvider(requestedProvider);
    if (provider === "local") {
      return res.status(503).json({
        success: false,
        message:
          "Gemini/OpenAI key is not configured. Set GEMINI_API_KEY in server .env and restart server.",
      });
    }

    let answer = "";

    try {
      answer = await generateGeneralChatAnswer({
        message,
        history,
        provider,
      });
    } catch (aiError) {
      return res.status(502).json({
        success: false,
        code: AI_PROVIDER_FAILED_CODE,
        message: `Failed to generate AI reply using ${provider}.`,
        error: aiError?.message || "Unknown AI provider error",
        provider,
      });
    }

    return res.status(200).json({
      success: true,
      provider,
      historyUsed: history.length,
      answer,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: "Failed to process chat request",
      error: error.message,
    });
  }
};
