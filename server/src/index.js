import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const startServer = async () => {
  let isDatabaseConnected = false;
  try {
    await connectDB();
    isDatabaseConnected = true;
  } catch (err) {
    console.log(
      "MongoDB unavailable. Starting server in limited mode (DB routes may fail):",
      err.message
    );
  }

  app.locals.isDatabaseConnected = isDatabaseConnected;

  app.listen(process.env.PORT, () => {
    console.log(`\nServer is running on port in index.js: ${process.env.PORT}`);
    console.log(`Open http://localhost:${process.env.PORT} in your browser`);
    if (!isDatabaseConnected) {
      console.log("Running without MongoDB connection. Bot/YouTube APIs are still available.");
    }
  });
};

startServer();
