// DB_connect.js
import {Pool} from "pg"
import dotenv from "dotenv";
dotenv.config();
console.log("NODE_ENV =", process.env.NODE_ENV);
console.log("DATABASE_URL =", process.env.DATABASE_URL);

export const pool:Pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,
  // ssl: { rejectUnauthorized: false },
ssl: process.env.DATABASE_URL?.includes("neon.tech")
  ? { rejectUnauthorized: false }
  : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});