import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { pool } from "./config/DB_connect.js";

const PORT = process.env.PORT || 5000;

const connectWithRetry = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.connect();
      console.log("Database connected");
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
      return;
    } catch (err) {
      console.log(`DB connection attempt ${i + 1} failed. Retrying in ${delay/1000}s...`);
      if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
      else console.error("Could not connect to database:", err);
    }
  }
};

connectWithRetry();