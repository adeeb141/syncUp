// DB_connect.js
import {Pool} from "pg"
import dotenv from "dotenv";
dotenv.config();


export const pool:Pool = new Pool({
  connectionString: process.env.DATABASE_URL as string,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});