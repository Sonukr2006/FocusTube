import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(process.env.PORT, () => {
      console.log(`\nServer is running on port in index.js: ${process.env.PORT}`);
      console.log(`Open http://localhost:${process.env.PORT} in your browser`);
    });
  } catch (err) {
    console.log("Error in index.js starting server:", err);
    process.exit(1);
  }
};

startServer();
