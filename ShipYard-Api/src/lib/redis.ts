import { getAppConfig } from "../config/index.js";
import { Redis } from "ioredis";

const redisUrl = getAppConfig('redisUrl') as string;

if (!redisUrl || !redisUrl?.trim()) {
    throw new Error('REDIS_URL is not defined');
}

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
});

export default redis;