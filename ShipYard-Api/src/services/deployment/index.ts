import { dockerClient } from "../../lib/docker.js";

const INTERNAL_PORT = 3001;

export const deployContainer = async (imageName: string, hostPort: number, env?: Record<string, string>) => {
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
        Env: [...Object.entries({ ...(env || {}), PORT: INTERNAL_PORT }).map(([key, value]) => `${key}=${value}`)]
    })

    await container.start();

    const containerId = container.id;

    if (!containerId) {
        throw new Error("Error deploying container");
    }

    return { containerId, hostPort, internalPort: INTERNAL_PORT };
}

export const getContainer = async (containerId: string) => {
    const container = dockerClient.getContainer(containerId);
    
    if (!container) {
        throw new Error("Container not found");
    }

    return container;
}

export const performContainerAction = async (containerId: string, action: 'ON' | 'OFF') => {
    const container = await getContainer(containerId);

    if (action === 'OFF') {
        await container.stop();
    }

    else if (action === 'ON') {
        await container.start();
    }

    else {
        throw new Error("Unsupported container action");
    }

    return true;
}

export const removeContainer = async (containerId: string) => {
    const container = await getContainer(containerId);

    await container.remove({ force: true });
    
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
