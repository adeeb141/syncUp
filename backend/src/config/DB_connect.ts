// // DB_connect.js
// import {Pool} from "pg"
// import dotenv from "dotenv";
// dotenv.config();
// //console.log("NODE_ENV =", process.env.NODE_ENV);
// //console.log("DATABASE_URL =", process.env.DATABASE_URL);

// export const pool:Pool = new Pool({
//   connectionString: process.env.DATABASE_URL as string,
//   // ssl: { rejectUnauthorized: false },
// ssl: process.env.DATABASE_URL?.includes("neon.tech")
//   ? { rejectUnauthorized: false }
//   : false,
//   connectionTimeoutMillis: 10000,
//   idleTimeoutMillis: 30000,
//   max: 10,
// });

// DB_connect.js
import {Pool} from "pg"
import dotenv from "dotenv";
dotenv.config();
//console.log("NODE_ENV =", process.env.NODE_ENV);
//console.log("DATABASE_URL =", process.env.DATABASE_URL);

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

// Without this, an idle client being terminated by the server (Neon does
// this routinely, e.g. error 57P01) fires an unhandled 'error' event on the
// pool, which Node treats as an uncaught exception and crashes the whole
// process. The pool itself recovers fine on its own — it just needs someone
// to acknowledge the event so Node doesn't treat it as fatal.
pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client (pool recovers automatically):", err.message);
});
