import { buildTypeDetector } from "./detector.js";
import { buildExecutor } from "./executor.js";


export const buildRunner = async ({sourceDir, imageName, imageTag, onLog}: {sourceDir: string, imageName: string, imageTag: string, onLog: (message: string) => Promise<void>}) => {
    const buildType = await buildTypeDetector(sourceDir);

    await buildExecutor({
        buildType,
        sourceDir,
        imageName,
        imageTag,
        onLog
    })
}