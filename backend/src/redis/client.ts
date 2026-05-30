import Redis from "ioredis";

export const publisher = new Redis(process.env.REDIS_URL!);
export const subscriber = new Redis(process.env.REDIS_URL!);