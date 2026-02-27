import mongoose from "mongoose";
import { SessionProgress } from "../models/session-progress.model.js";

const sanitizeProgress = (doc) => ({
  playlistId: doc.playlistId,
  playlistTitle: doc.playlistTitle,
  videoId: doc.videoId,
  lastVideoTitle: doc.lastVideoTitle,
  videoIndex: doc.videoIndex,
  currentTimeSec: doc.currentTimeSec,
  isCompleted: doc.isCompleted,
  updatedAt: doc.updatedAt,
});

const toNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
};

export const getSessionProgress = async (req, res) => {
  try {
    const userId = req.user?.userid;
    const playlistId = req.params.playlistId?.trim();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "playlistId is required",
      });
    }

    const progress = await SessionProgress.findOne({ userId, playlistId });
    if (!progress) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizeProgress(progress),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session progress",
      error: error.message,
    });
  }
};

export const upsertSessionProgress = async (req, res) => {
  try {
    const userId = req.user?.userid;
    const userEmail = req.user?.email?.toLowerCase().trim() || "";
    const playlistId = req.params.playlistId?.trim();
    const playlistTitle = req.body.playlistTitle?.trim() || "";
    const videoId = req.body.videoId?.trim() || "";
    const lastVideoTitle = req.body.lastVideoTitle?.trim() || "";
    const videoIndex = toNonNegativeInt(req.body.videoIndex, 0);
    const currentTimeSec = toNonNegativeInt(req.body.currentTimeSec, 0);
    const isCompleted = Boolean(req.body.isCompleted);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "playlistId is required",
      });
    }

    const progress = await SessionProgress.findOneAndUpdate(
      { userId, playlistId },
      {
        userEmail,
        playlistTitle,
        videoId,
        lastVideoTitle,
        videoIndex,
        currentTimeSec,
        isCompleted,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Session progress saved",
      data: sanitizeProgress(progress),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save session progress",
      error: error.message,
    });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const userId = req.user?.userid;
    const limit = Math.min(toNonNegativeInt(req.query.limit, 10) || 10, 50);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    const history = await SessionProgress.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit);

    return res.status(200).json({
      success: true,
      data: history.map(sanitizeProgress),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session history",
      error: error.message,
    });
  }
};

export const deleteSessionProgress = async (req, res) => {
  try {
    const userId = req.user?.userid;
    const playlistId = req.params.playlistId?.trim();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid authenticated user",
      });
    }

    if (!playlistId) {
      return res.status(400).json({
        success: false,
        message: "playlistId is required",
      });
    }

    await SessionProgress.findOneAndDelete({ userId, playlistId });

    return res.status(200).json({
      success: true,
      message: "Session progress cleared",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear session progress",
      error: error.message,
    });
  }
};
