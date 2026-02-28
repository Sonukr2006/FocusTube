import { Router } from "express";
import {
  askYoutubeQuestion,
  chatWithAssistant,
  getPlaylistVideos,
} from "../controllers/youtube.controllers.js";

const router = Router();

router.get("/playlist-videos", getPlaylistVideos);
router.get("/playlist-items", getPlaylistVideos);
router.post("/qa", askYoutubeQuestion);
router.post("/ask", askYoutubeQuestion);
router.post("/chat", chatWithAssistant);

export default router;
