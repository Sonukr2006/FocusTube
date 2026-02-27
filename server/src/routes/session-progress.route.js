import { Router } from "express";
import {
  getSessionHistory,
  deleteSessionProgress,
  getSessionProgress,
  upsertSessionProgress,
} from "../controllers/session-progress.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get("/history", getSessionHistory);
router.get("/progress/:playlistId", getSessionProgress);
router.put("/progress/:playlistId", upsertSessionProgress);
router.delete("/progress/:playlistId", deleteSessionProgress);

export default router;
