import { DEPLOYMENT_CONTAINER_ACTION } from "../../constants/index.js";
import { dockerClient } from "../../lib/docker.js";
import logger from "../../lib/logger.js";
import { removePortAllocation } from "../port-allocation/index.js";

const INTERNAL_PORT = 3001;

export const deployContainer = async (imageName: string, hostPort: number, env?: Record<string, string>) => {
    logger.info('Creating container', { imageName, hostPort });

    const container = await dockerClient.createContainer({
        Image: imageName,
        HostConfig: {
            PortBindings: {
                [`${INTERNAL_PORT}/tcp`] : [
                    { HostPort: hostPort?.toString() }
                ]
            },
            RestartPolicy: {
                Name: 'unless-stopped'
            }
        },
        ExposedPorts: {
            [`${INTERNAL_PORT}/tcp`]: {}
        },
        Env: [...Object.entries({ PORT: INTERNAL_PORT, ...(env || {}) }).map(([key, value]) => `${key}=${value}`)]
    })

    await container.start();

    const containerId = container.id;

    if (!containerId) {
        logger.error('Failed to get container ID after creation', { imageName });
        throw new Error("Error deploying container");
    }

    logger.info('Container deployed successfully', { containerId, imageName, hostPort });

    return { containerId, hostPort, internalPort: INTERNAL_PORT };
}

export const getContainer = async (containerId: string) => {
    const container = dockerClient.getContainer(containerId);
    
    if (!container) {
        throw new Error("Container not found");
    }

    return container;
}

export const performContainerAction = async (containerId: string, action: DEPLOYMENT_CONTAINER_ACTION) => {
    const container = await getContainer(containerId);

    logger.info('Performing container action', { containerId, action });

    switch (action) {
        case DEPLOYMENT_CONTAINER_ACTION.START:
            await container.start();
            break;
        case DEPLOYMENT_CONTAINER_ACTION.STOP:
            await container.stop();
            break;
        case DEPLOYMENT_CONTAINER_ACTION.RESTART:
            await container.restart();
            break;
        default:
            logger.error('Unsupported container action', { containerId, action });
            throw new Error("Unsupported container action");
    }

    logger.info('Container action completed', { containerId, action });

    return true;
}

export const removeContainer = async (containerId: string) => {
    logger.info('Removing container', { containerId });

    const container = await getContainer(containerId);

    await container.remove({ force: true });

    await removePortAllocation(containerId);

    logger.info('Container removed successfully', { containerId });
    
    return true;
}

export const getContainerLogs = async (containerId: string, options?: { lines?: number, follow?: boolean }) => {
    const container = await getContainer(containerId);

    const logOptions = {
        stdout: true,
            stderr: true,
            tail: options?.lines || 100,
    }

    if (options?.follow) {
        return { container, stream: await container.logs({
            ...logOptions,
            follow: true,
        }) };
    }
    
    const streamBuffer = await container.logs({
        ...logOptions,
        follow: false,
    });

    return { container, stream: cleanDockerLogBuffer(streamBuffer) };
}

function cleanDockerLogBuffer(buffer: Buffer): string {
  let i = 0;
  let output = "";

  while (i < buffer.length) {
    // Docker log frame:
    // byte 0: stream type
    // bytes 1–3: unused
    // bytes 4–7: message length (uint32 BE)
    const messageLength = buffer.readUInt32BE(i + 4);

    const messageStart = i + 8;
    const messageEnd = messageStart + messageLength;

    let currLine = buffer.slice(messageStart, messageEnd).toString("utf-8");

    if (!currLine.includes("[Object: null prototype]")) {
        output += currLine;
    }

    i = messageEnd;
  }

  return output;
}

export const listContainers = async () => {
    const containers = await dockerClient.listContainers({ all: true });
    return containers;
}

export const getContainerShell = async (containerId: string) => {
    const container = await getContainer(containerId);

    const exec = await container.exec({
        Cmd: ['/bin/sh'],
        AttachStdin: true,
        Tty: true,
        AttachStdout: true,
        AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, Tty: true });

    return { container, exec, stream };
}

export const removeImage = async (imageName: string) => {
    logger.info('Removing Docker image', { imageName });
    const image = dockerClient.getImage(imageName);
    await image.remove({ force: true });
    logger.info('Docker image removed', { imageName });
    return true;
}