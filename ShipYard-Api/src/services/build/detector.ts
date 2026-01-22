import fs from "fs";
import path from "path";
import { BUILD_TYPE } from "../../constants/index.js";

export const buildTypeDetector = async (sourceDir: string): Promise<BUILD_TYPE> => {
    const dockerFilePath = path.join(sourceDir, 'Dockerfile');

    if (fs.existsSync(dockerFilePath)) {
        return BUILD_TYPE.DOCKER_FILE;
    }

    return BUILD_TYPE.BUILD_PACK;
}