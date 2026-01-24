import Docker from 'dockerode';
import { getAppConfig } from '../config/index.js';

export const dockerClient = new Docker({
    socketPath: getAppConfig('dockerSocketPath') as string,
});