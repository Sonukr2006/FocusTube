import { useEffect, useMemo, useState } from "react";
import { Bot, Loader2, SendHorizontal, UserRound, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ACTIVE_SESSION_VIDEO_STORAGE_KEY,
  loadActiveSessionVideo,
} from "@/lib/activeSessionVideo";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
).replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const QUICK_PROMPTS = [
  "Summarize this video in 5 bullets.",
  "What are the key takeaways?",
  "Give action items from this video.",
  "Explain this video for beginners.",
];

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: "bot",
    text: "Main FocusTube assistant hoon. Normal chat bhi kar sakte ho aur video se related question bhi puch sakte ho.",
  },
  {
    id: 2,
    role: "bot",
    text: "Video Q&A ke liye YouTube link + question do.",
  },
];

const extractVideoIdFromInput = (value = "") => {
  const input = value.trim();
  if (!input) return "";
  if (/^[\w-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    const videoParamId = url.searchParams.get("v") || "";
    if (/^[\w-]{11}$/.test(videoParamId)) return videoParamId;

    const hostname = url.hostname.replace(/^www\./, "");
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be" && /^[\w-]{11}$/.test(pathParts[0] || "")) {
      return pathParts[0];
    }

    if (
      (pathParts[0] === "shorts" || pathParts[0] === "embed") &&
      /^[\w-]{11}$/.test(pathParts[1] || "")
    ) {
      return pathParts[1];
    }
  } catch {
    return "";
  }

  return "";
};

const askYoutubeTranscriptQuestion = async ({
  youtubeUrl,
  question,
  allowWithoutTranscript = false,
}) => {
  const response = await fetch(`${API_BASE_URL}/youtube/qa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      youtubeUrl,
      question,
      allowWithoutTranscript,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.error ||
        payload?.message ||
        `YouTube QA request failed (${response.status})`
    );
    error.code = payload?.code || "";
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const askGeneralChatQuestion = async ({ message, history = [] }) => {
  const response = await fetch(`${API_BASE_URL}/youtube/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history,
      provider: "gemini",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.error ||
        payload?.message ||
        `General chat request failed (${response.status})`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const BotPanel = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoQuestion, setVideoQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [chatError, setChatError] = useState("");
  const [activeSessionVideo, setActiveSessionVideo] = useState(null);
  const [pendingNoTranscriptRequest, setPendingNoTranscriptRequest] = useState(null);

  useEffect(() => {
    setActiveSessionVideo(loadActiveSessionVideo());
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key && event.key !== ACTIVE_SESSION_VIDEO_STORAGE_KEY) return;
      setActiveSessionVideo(loadActiveSessionVideo());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const resolvedYoutubeUrl = useMemo(() => {
    const typedUrl = youtubeUrl.trim();
    if (typedUrl) return typedUrl;
    return activeSessionVideo?.url || "";
  }, [youtubeUrl, activeSessionVideo]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isChatting) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: trimmed,
    };

    const chatHistory = messages
      .filter((message) => message.role === "user" || message.role === "bot")
      .slice(-12)
      .map((message) => ({
        role: message.role === "bot" ? "assistant" : "user",
        text: message.text,
      }));

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setChatError("");
    setIsChatting(true);

    try {
      const payload = await askGeneralChatQuestion({
        message: trimmed,
        history: chatHistory,
      });

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          text: payload?.answer || "No answer received from server.",
          meta: `Provider: ${payload?.provider || "unknown"}`,
        },
      ]);
    } catch (error) {
      const message = error?.message || "Failed to process general question.";
      setChatError(message);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          text: `Chat failed: ${message}`,
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleAskYoutubeQuestion = async (event) => {
    event.preventDefault();
    const trimmedTypedUrl = youtubeUrl.trim();
    const autoSessionUrl = activeSessionVideo?.url || "";
    let resolvedRequestUrl = trimmedTypedUrl || autoSessionUrl;
    const trimmedQuestion = videoQuestion.trim();

    if (!resolvedRequestUrl || !trimmedQuestion) {
      setAnalysisError("YouTube link aur question dono required hain.");
      return;
    }

    let previewVideoId = extractVideoIdFromInput(resolvedRequestUrl);
    let sourceLabel = "manual";
    if (!previewVideoId && autoSessionUrl) {
      previewVideoId = extractVideoIdFromInput(autoSessionUrl);
      sourceLabel = "session-active-video";
      resolvedRequestUrl = autoSessionUrl;
    } else if (!trimmedTypedUrl && previewVideoId) {
      sourceLabel = "session-active-video";
    }

    if (!previewVideoId) {
      setAnalysisError("Valid YouTube link do.");
      return;
    }

    setAnalysisError("");
    setPendingNoTranscriptRequest(null);

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        role: "user",
        text: `Analyze video (${previewVideoId}): ${trimmedQuestion}`,
        meta:
          sourceLabel === "session-active-video"
            ? `Auto source (Session): ${resolvedRequestUrl}`
            : resolvedRequestUrl,
      },
    ]);

    setIsAnalyzing(true);

    try {
      const payload = await askYoutubeTranscriptQuestion({
        youtubeUrl: resolvedRequestUrl,
        question: trimmedQuestion,
      });

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          text: payload?.answer || "No answer received from server.",
          meta: `Video: ${payload?.videoId || previewVideoId} | Provider: ${payload?.provider || "unknown"} | Source: ${sourceLabel} | Context: ${payload?.contextSource || "transcript"}`,
        },
      ]);
      setVideoQuestion("");
    } catch (error) {
      const message = error?.message || "Failed to process YouTube transcript question.";
      if (error?.code === "TRANSCRIPT_UNAVAILABLE") {
        setAnalysisError("Transcript unavailable. Continue without transcript?");
        setPendingNoTranscriptRequest({
          youtubeUrl: resolvedRequestUrl,
          question: trimmedQuestion,
          previewVideoId,
          sourceLabel,
        });
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "bot",
            text: "Is video ka transcript available nahi hai. Agar chaho to main bina transcript ke general answer de sakta hoon.",
          },
        ]);
      } else {
        setAnalysisError(message);
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: "bot",
            text: `YouTube Q&A failed: ${message}`,
          },
        ]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinueWithoutTranscript = async () => {
    if (!pendingNoTranscriptRequest) return;
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const payload = await askYoutubeTranscriptQuestion({
        youtubeUrl: pendingNoTranscriptRequest.youtubeUrl,
        question: pendingNoTranscriptRequest.question,
        allowWithoutTranscript: true,
      });

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          text: payload?.answer || "No answer received from server.",
          meta: `Video: ${payload?.videoId || pendingNoTranscriptRequest.previewVideoId} | Provider: ${payload?.provider || "unknown"} | Source: ${pendingNoTranscriptRequest.sourceLabel} | Context: ${payload?.contextSource || "question-only"}`,
        },
      ]);
      setPendingNoTranscriptRequest(null);
    } catch (error) {
      const message =
        error?.message || "Failed to generate answer without transcript.";
      setAnalysisError(message);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "bot",
          text: `Without-transcript mode failed: ${message}`,
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendMessage(draft);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">FocusTube AI Bot</Badge>
              <Badge variant="secondary">Chat + YouTube Q&A</Badge>
            </div>
            <CardTitle className="text-xl">Ask From YouTube Video</CardTitle>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleAskYoutubeQuestion} className="space-y-3">
            <Input
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {activeSessionVideo?.url ? (
              <p className="text-xs text-muted-foreground">
                Session video available: {activeSessionVideo.title || activeSessionVideo.videoId}
                {" | "}
                URL empty chhodoge to yahi auto-use hoga.
              </p>
            ) : null}
            <Input
              value={videoQuestion}
              onChange={(event) => setVideoQuestion(event.target.value)}
              placeholder="Ask your question from this video..."
            />
            {analysisError ? <p className="text-xs text-red-500">{analysisError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={isAnalyzing || !resolvedYoutubeUrl || !videoQuestion.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Video className="mr-1 h-4 w-4" />
                    Ask Video
                  </>
                )}
              </Button>
              {QUICK_PROMPTS.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  onClick={() => setVideoQuestion(prompt)}
                >
                  {prompt}
                </Button>
              ))}
              {pendingNoTranscriptRequest ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleContinueWithoutTranscript}
                  disabled={isAnalyzing}
                >
                  Continue without transcript
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            {messages.map((message) => {
              const isBot = message.role === "bot";
              return (
                <div
                  key={message.id}
                  className={`flex ${isBot ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl border px-3 py-2 text-sm ${
                      isBot ? "bg-muted" : "bg-primary/10"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      {isBot ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : (
                        <UserRound className="h-3.5 w-3.5" />
                      )}
                      {isBot ? "FocusBot" : "You"}
                    </div>
                    <p>{message.text}</p>
                    {message?.meta ? (
                      <p className="mt-1 text-xs text-muted-foreground">{message.meta}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {isAnalyzing ? (
              <div className="flex justify-start">
                <div className="rounded-xl border bg-muted px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching transcript and preparing answer...
                  </span>
                </div>
              </div>
            ) : null}
            {isChatting ? (
              <div className="flex justify-start">
                <div className="rounded-xl border bg-muted px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {chatError ? <p className="text-xs text-red-500">{chatError}</p> : null}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask anything..."
            />
            <Button type="submit" disabled={!draft.trim() || isChatting}>
              {isChatting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BotPanel;
