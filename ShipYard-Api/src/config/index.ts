interface AppConfig {
    databaseUrl: string;
    redisUrl: string;
    port: number | string;
    dockerSocketPath: string;
    deploymentQueueRetryDelayMs?: number;
    deploymentQueueMaxRetries?: number;
}

const APP_CONFIG: AppConfig = {
    databaseUrl: process.env.DATABASE_URL || 'file:./shipyard.db',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    port: process.env.PORT || 8000,
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH || '//./pipe/docker_engine',
    deploymentQueueRetryDelayMs: process.env.DEPLOYMENT_QUEUE_RETRY_DELAY_MS
        ? parseInt(process.env.DEPLOYMENT_QUEUE_RETRY_DELAY_MS)
        : 5000,
    deploymentQueueMaxRetries: process.env.DEPLOYMENT_QUEUE_MAX_RETRIES
        ? parseInt(process.env.DEPLOYMENT_QUEUE_MAX_RETRIES)
        : 3,
}

export const getAppConfig = (key: keyof typeof APP_CONFIG): AppConfig[keyof AppConfig] => {
    return APP_CONFIG[key];
}