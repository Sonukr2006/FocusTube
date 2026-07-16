import { Router } from "express";
import {
  askYoutubeQuestion,
  chatWithAssistant,
  getPlaylistVideos,
  getSearchVideos,
} from "../controllers/youtube.controllers.js";

const router = Router();

router.get("/playlist-videos", getPlaylistVideos);
router.get("/playlist-items", getPlaylistVideos);
router.get("/search-videos", getSearchVideos);
router.post("/qa", askYoutubeQuestion);
router.post("/ask", askYoutubeQuestion);
router.post("/chat", chatWithAssistant);

export default router;
