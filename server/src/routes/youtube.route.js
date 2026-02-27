import { Router } from "express";
import { getPlaylistVideos } from "../controllers/youtube.controllers.js";

const router = Router();

router.get("/playlist-videos", getPlaylistVideos);
router.get("/playlist-items", getPlaylistVideos);

export default router;
