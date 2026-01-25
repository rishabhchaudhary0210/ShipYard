import fs from "fs";
import path from "path";
import logger from "../../lib/logger.js";
import { BUILD_TYPE } from "../../constants/index.js";

export const buildTypeDetector = async (sourceDir: string): Promise<BUILD_TYPE> => {
    const dockerFilePath = path.join(sourceDir, 'Dockerfile');

    if (fs.existsSync(dockerFilePath)) {
        logger.info('Detected Dockerfile build', { sourceDir });
        return BUILD_TYPE.DOCKER_FILE;
    }

    logger.info('Using buildpack build (no Dockerfile found)', { sourceDir });
    return BUILD_TYPE.BUILD_PACK;
}