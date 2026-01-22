import { execa } from "execa";
import { BUILD_TYPE } from "../../constants/index.js";

export const buildExecutor = async ({ buildType, sourceDir, imageName, imageTag, onLog }: { buildType: BUILD_TYPE, sourceDir: string, imageName: string, imageTag: string, onLog: (message: string) => Promise<void> }) => {
    switch (buildType) {
        case BUILD_TYPE.DOCKER_FILE:
            return await executeDockerBuild(sourceDir, imageName, imageTag, onLog);
        case BUILD_TYPE.BUILD_PACK:
            return await executePackBuild(sourceDir, imageName, imageTag, onLog);
        default:
            throw new Error(`Unsupported build type: ${buildType}`);
    }
}

const executeDockerBuild = async (sourceDir: string, imageName: string, imageTag: string, onLog: (message: string) => Promise<void>) => {
    const dockerBuildProcess = execa('docker', [
        'build',
        '-t',
        `${imageName}:${imageTag}`,
        sourceDir
    ], {
        all: true
    })

    dockerBuildProcess.all?.on('data', (data) => {
        onLog(data.toString());
    });

    await dockerBuildProcess;
}

const executePackBuild = async (sourceDir: string, imageName: string, imageTag: string, onLog: (message: string) => Promise<void>) => {
    const packBuildProcess = execa('pack', [
        'build',
        `${imageName}:${imageTag}`,
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

    await packBuildProcess;
}