interface AppConfig {
    databaseUrl: string;
    redisUrl: string;
    port: number | string;
    dockerSocketPath: string;
}

const APP_CONFIG: AppConfig = {
    databaseUrl: process.env.DATABASE_URL || 'file:./shipyard.db',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    port: process.env.PORT || 8000,
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH || '//./pipe/docker_engine',
}

export const getAppConfig = (key: keyof typeof APP_CONFIG): AppConfig[keyof AppConfig] => {
    return APP_CONFIG[key];
}