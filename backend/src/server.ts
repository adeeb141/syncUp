import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { pool } from "./config/DB_connect";

const PORT =Number (process.env.PORT)|| 5000;

const connectWithRetry = async (retries = 5, delay = 3000):Promise<void> => {
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