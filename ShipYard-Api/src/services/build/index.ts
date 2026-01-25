import { buildTypeDetector } from "./detector.js";
import { buildExecutor } from "./executor.js";


export const buildRunner = async ({sourceDir, imageTag, onLog}: {sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void>}) => {
    const buildType = await buildTypeDetector(sourceDir);

    await buildExecutor({
        buildType,
        sourceDir,
        imageTag,
        onLog
    })
}