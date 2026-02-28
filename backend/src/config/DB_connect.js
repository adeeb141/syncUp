// DB_connect.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,  // ← wait 10s for Neon to wake up
  idleTimeoutMillis: 30000,
  max: 10,
});