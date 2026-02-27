import mongoose from "mongoose";

const sessionProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    playlistId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    playlistTitle: {
      type: String,
      default: "",
      trim: true,
    },
    videoId: {
      type: String,
      default: "",
      trim: true,
    },
    lastVideoTitle: {
      type: String,
      default: "",
      trim: true,
    },
    videoIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentTimeSec: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

sessionProgressSchema.index({ userId: 1, playlistId: 1 }, { unique: true });

const SessionProgress = mongoose.model("SessionProgress", sessionProgressSchema);

export { SessionProgress };
