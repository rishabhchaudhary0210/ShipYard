import { execa } from "execa";
import logger from "../../lib/logger.js";
import { BUILD_TYPE } from "../../constants/index.js";

export const buildExecutor = async ({ buildType, sourceDir, imageTag, onLog }: { buildType: BUILD_TYPE, sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void> }) => {
    logger.info('Starting build execution', { buildType, imageTag });

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