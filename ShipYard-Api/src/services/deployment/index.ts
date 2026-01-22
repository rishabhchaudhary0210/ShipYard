import { execa } from "execa";

const INTERNAL_PORT = 3001;

export const deployContainer = async (imageName: string, hostPort: number, env?: Record<string, string>) => {
    const envARgs = Object.entries({ ...(env || {}), PORT: INTERNAL_PORT }).flatMap(([key, value]) => ['-e', `${key}=${value}`]);

    const { stdout } = await execa('docker', [
        'run',
        '-d',
        '--restart',
        'unless-stopped',
        '-p',
        `${hostPort}:${INTERNAL_PORT}`,
        ...envARgs,
        imageName
    ])

    const containerId = stdout.trim();

    if (!containerId) {
        throw new Error("Error deploying container");
    }

    return { containerId, hostPort, internalPort: INTERNAL_PORT };
}

export const performContainerAction = async (containerId: string, action: 'ON' | 'OFF') => {
    const { stdout } = await execa('docker', [
        action === 'OFF' ? 'stop' : 'start',
        containerId
    ]);

    const stoppedContainerId = stdout.trim();

    if (!stoppedContainerId) {
        throw new Error("Error performing action on container");
    }

    return true;
}

export const removeContainer = async (containerId: string) => {
    const { stdout } = await execa('docker', [
        'rm',
        '-f',
        containerId
    ]);

    if (!stdout.includes(containerId)) {
        throw new Error("Error removing container");
    }
    
    return true;
}

