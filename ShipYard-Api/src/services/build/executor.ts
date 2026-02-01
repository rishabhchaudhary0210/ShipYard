import { execa } from "execa";
import fs from "fs";
import path from "path";
import logger from "../../lib/logger.js";
import { BUILD_TYPE, RUN_TIME_TYPE } from "../../constants/index.js";
import { dockerClient } from "../../lib/docker.js";
import { cleanDockerStreamLog, findStaticOutput, ensureImage } from "../../helpers/index.js";
import { getAppConfig } from "../../config/index.js";

export const buildExecutor = async ({
    buildType, sourceDir, imageTag, runTimeType, onLog, envVariables
}: { buildType: BUILD_TYPE, sourceDir: string, imageTag: string, runTimeType: RUN_TIME_TYPE, onLog: (message: string) => Promise<void>, envVariables: Record<string, string> }) => {
    logger.info('Starting build execution', { buildType, imageTag });

    switch (runTimeType) {
        case RUN_TIME_TYPE.STATIC:
            logger.info('Build runtime type detected as STATIC', { imageTag });
            return await executeStaticBuild(sourceDir, imageTag, onLog, envVariables);
        case RUN_TIME_TYPE.SERVER:
            logger.info('Build runtime type detected as SERVER', { imageTag });
            break;
        default:
            logger.error('Unsupported runtime type', { runTimeType });
            throw new Error(`Unsupported runtime type: ${runTimeType}`);
    }

    switch (buildType) {
        case BUILD_TYPE.DOCKER_FILE:
            return await executeDockerBuild(sourceDir, imageTag, onLog);
        case BUILD_TYPE.BUILD_PACK:
            return await executePackBuild(sourceDir, imageTag, onLog);
        default:
            logger.error('Unsupported build type', { buildType });
            throw new Error(`Unsupported build type: ${buildType}`);
    }
}

const executeDockerBuild = async (sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void>) => {
    logger.info('Executing Docker build', { imageTag, sourceDir });

    const dockerBuildProcess = execa('docker', [
        'build',
        '-t',
        `${imageTag}`,
        sourceDir
    ], {
        all: true
    })

    dockerBuildProcess.all?.on('data', (data) => {
        onLog(data.toString());
    });

    try {
        await dockerBuildProcess;
        logger.info('Docker build completed successfully', { imageTag });
    } catch (error) {
        logger.error('Docker build failed', {
            imageTag,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

const executePackBuild = async (sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void>) => {
    logger.info('Executing Pack build', { imageTag, sourceDir });

    const packBuildProcess = execa('pack', [
        'build',
        `${imageTag}`,
        '--builder',
        'paketobuildpacks/builder-jammy-base',
        '--path',
        sourceDir
    ], {
        all: true
    })

    packBuildProcess.all?.on('data', (data) => {
        onLog(data.toString());
    });

    try {
        await packBuildProcess;
        logger.info('Pack build completed successfully', { imageTag });
    } catch (error) {
        logger.error('Pack build failed', {
            imageTag,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

const executeStaticBuild = async (sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void>, envVariables: Record<string, string>) => {
    logger.info('Executing Static site build using Pack', { imageTag, sourceDir });

    const packageJsonPath = path.join(sourceDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
        const hostSourcePath = getAppConfig('shipyardWorkspaceHostRoot') as string;
        const hostVolumePath = path.join(hostSourcePath, sourceDir);
        
        logger.info('Found package.json, running build script', { sourceDir, hostSourcePath, hostVolumePath });

        await ensureImage('node:24-alpine', onLog);

        const buildContainer = await dockerClient.createContainer({
            Image: 'node:24-alpine',
            Cmd: ['sh', '-c', 'rm -rf node_modules package-lock.json && npm install && npm run build'],
            Volumes: {
                'workspace': {}
            },
            HostConfig: {
                Binds: [
                    `${hostVolumePath}:/workspace`
                ],
                AutoRemove: true
            },
            WorkingDir: '/workspace',
            Env: [...Object.entries({ ...(envVariables || {}) }).map(([key, value]) => `${key}=${value}`)]
        })

        const logStream = await buildContainer.attach({
            stream: true,
            stdout: true,
            stderr: true
        });

        logStream.on('data', async (chunk) => {
            const cleanedLog = cleanDockerStreamLog(chunk.toString());
            if (cleanedLog) {
                await onLog(cleanedLog);
            }
        });

        await buildContainer.start();

        try {
            const result = await buildContainer.wait();

            if (result.StatusCode !== 0) {
                throw new Error(`Container exited with code ${result.StatusCode}`);
            }

            logger.info('Docker build completed successfully');
        } catch (err) {
            logger.error('Docker build failed', {
                error: err instanceof Error ? err.message : 'Unknown error'
            });
            throw err;
        } finally { }

        logger.info('Build script completed', { sourceDir });
    }

    const staticOutputDir = findStaticOutput(sourceDir);
    const isSameDir = path.resolve(staticOutputDir) === path.resolve(sourceDir);
    const buildDir = isSameDir ? staticOutputDir : path.join(sourceDir, 'shipyard_build_temp');
    const htmlDir = isSameDir ? staticOutputDir : path.join(buildDir, 'html');

    logger.info('Preparing Docker build context for static site', { staticOutputDir, buildDir, htmlDir });

    if (!fs.existsSync(htmlDir)) {
        fs.mkdirSync(htmlDir, { recursive: true });
    }

    if (!isSameDir) {
        fs.cpSync(staticOutputDir, htmlDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(buildDir, 'Dockerfile'),
        `
FROM nginx:alpine
COPY ${isSameDir ? '.' : 'html'} /usr/share/nginx/html
`.trim()
    );

    await executeDockerBuild(buildDir, imageTag, onLog);
}



