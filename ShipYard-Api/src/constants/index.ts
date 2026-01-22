export enum DEPLOYMENT_STATUS {
    QUEUED = 'QUEUED',
    BUILDING = 'BUILDING',
    DEPLOYING = 'DEPLOYING',
    DEPLOYED = 'DEPLOYED',
    FAILED = 'FAILED'
}

export enum LOG_TYPE {
    BUILD = 'BUILD',
    RUNTIME = 'RUNTIME'
}

export const QUEUE_NAME = {
    DEPLOYMENT: 'deployments-queue'
}

export enum BUILD_TYPE {
    DOCKER_FILE = 'DOCKER_FILE',
    BUILD_PACK = 'BUILD_PACK'
}