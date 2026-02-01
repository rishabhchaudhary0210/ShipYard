import fs from "fs";
import path from "path";
import logger from "../../lib/logger.js";
import { BUILD_TYPE, RUN_TIME_TYPE } from "../../constants/index.js";

export const buildTypeDetector = async (sourceDir: string): Promise<BUILD_TYPE> => {
    const dockerFilePath = path.join(sourceDir, 'Dockerfile');

    if (fs.existsSync(dockerFilePath)) {
        logger.info('Detected Dockerfile build', { sourceDir });
        return BUILD_TYPE.DOCKER_FILE;
    }

    logger.info('Using buildpack build (no Dockerfile found)', { sourceDir });
    return BUILD_TYPE.BUILD_PACK;
}

export const buildRuntimeTypeDetector = async (sourceDir: string, buildType: BUILD_TYPE): Promise<RUN_TIME_TYPE> => {
    if (buildType === BUILD_TYPE.DOCKER_FILE) {
        return RUN_TIME_TYPE.SERVER;
    }

    // check for package.json
    const packageJsonPath = path.join(sourceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);

        if (packageJson?.scripts && packageJson?.scripts?.build && !packageJson?.scripts?.start) {
            return RUN_TIME_TYPE.STATIC;
        }
    }

    const indexHtmlPath = path.join(sourceDir, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        return RUN_TIME_TYPE.STATIC;
    }

    return RUN_TIME_TYPE.SERVER;
}