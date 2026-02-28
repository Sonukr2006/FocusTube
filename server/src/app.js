import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhostOrigin = /^http:\/\/localhost:\d+$/.test(origin);
    if (
      isLocalhostOrigin ||
      configuredOrigins.includes("*") ||
      configuredOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//routes import
import userRouter from "./routes/user.route.js";
import todoRouter from "./routes/todo.route.js";
import youtubeRouter from "./routes/youtube.route.js";
import sessionProgressRouter from "./routes/session-progress.route.js";

//routes declaration
app.use("/api/users", userRouter);
app.use("/api/todos", todoRouter);
app.use("/api/youtube", youtubeRouter);
app.use("/api/sessions", sessionProgressRouter);
app.use("/api", youtubeRouter);

export { app };
