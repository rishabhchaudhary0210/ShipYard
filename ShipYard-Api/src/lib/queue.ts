import { Queue } from "bullmq";
import redisClient from "./redis.js";
import { QUEUE_NAME } from "../constants/index.js";
import { getAppConfig } from "../config/index.js";

const deployQueue = new Queue(QUEUE_NAME.DEPLOYMENT, {
    connection: redisClient,
    defaultJobOptions: {
        attempts: getAppConfig('deploymentQueueMaxRetries') as number || 3,
        backoff: {
            type: 'exponential',
            delay: getAppConfig('deploymentQueueRetryDelayMs') as number || 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

export default deployQueue;