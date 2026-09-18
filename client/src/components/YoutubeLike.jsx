import { useMemo, useState } from "react";
import { Search, PlayCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { saveActiveSessionVideo } from "@/lib/activeSessionVideo";

const RAW_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
).replace(/\/$/, "");
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const buildEmbedUrl = (videoId) =>
  `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;

const formatPublishedAt = (value) => {
  const parsed = Date.parse(value || "");
  if (Number.isNaN(parsed)) return "";
  return new Date(parsed).toLocaleDateString();
};

const YoutubeLike = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  const embedUrl = useMemo(() => {
    if (!selectedVideo?.videoId) return "";
    return buildEmbedUrl(selectedVideo.videoId);
  }, [selectedVideo]);

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    saveActiveSessionVideo({
      videoId: video.videoId,
      title: video.title || "",
      playlistId: `search:${query.trim() || "topic"}`,
    });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Please enter a topic to search videos.");
      return;
    }

    try {
      setIsSearching(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/youtube/search-videos?q=${encodeURIComponent(trimmedQuery)}&limit=12`
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || `Search failed (${response.status})`);
      }

      const videos = Array.isArray(payload?.videos) ? payload.videos : [];
      setResults(videos);

      if (videos.length) {
        handleSelectVideo(videos[0]);
      } else {
        setSelectedVideo(null);
        setError("No related videos found for this topic.");
      }
    } catch (searchError) {
      setResults([]);
      setSelectedVideo(null);
      setError(searchError?.message || "Unable to search videos right now.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Topic Video Search</CardTitle>
          <CardDescription>
            Topic search karo, related YouTube videos dekho, aur yahin embedded player me chalao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search topic like React hooks, DSA graph, OS scheduling..."
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search Videos"}
            </Button>
          </form>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="overflow-hidden rounded-xl border bg-black">
            {embedUrl ? (
              <iframe
                title={selectedVideo?.title || "YouTube video player"}
                src={embedUrl}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-slate-300">
                Search ke baad related video yahan render hoga aur play bhi hoga.
              </div>
            )}
          </div>

          {selectedVideo ? (
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-lg font-semibold">{selectedVideo.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedVideo.channelTitle || "Unknown channel"}
                {selectedVideo.publishedAt
                  ? ` • ${formatPublishedAt(selectedVideo.publishedAt)}`
                  : ""}
              </p>
              {selectedVideo.description ? (
                <p className="mt-3 line-clamp-4 text-sm text-muted-foreground">
                  {selectedVideo.description}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Kisi bhi result par click karke instantly player me load kar sakte ho.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!results.length ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Abhi koi result nahi hai. Search bar me topic likho aur related videos lao.
            </div>
          ) : null}

          {results.map((video) => {
            const isActive = selectedVideo?.videoId === video.videoId;
            return (
              <button
                key={video.videoId}
                type="button"
                onClick={() => handleSelectVideo(video)}
                className={`flex w-full gap-3 rounded-xl border p-3 text-left transition ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No thumbnail
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <PlayCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {video.channelTitle || "Unknown channel"}
                      </p>
                      {video.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {video.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default YoutubeLike;
