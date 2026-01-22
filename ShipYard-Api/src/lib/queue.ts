import { Queue } from "bullmq";
import redisClient from "./redis.js";
import { QUEUE_NAME } from "../constants/index.js";

const deployQueue = new Queue(QUEUE_NAME.DEPLOYMENT, {
    connection: redisClient,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

export default deployQueue;