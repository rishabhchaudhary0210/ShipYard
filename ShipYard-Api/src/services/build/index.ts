import { buildRuntimeTypeDetector, buildTypeDetector } from "./detector.js";
import { buildExecutor } from "./executor.js";


export const buildRunner = async ({sourceDir, imageTag, onLog, envVariables}: {sourceDir: string, imageTag: string, onLog: (message: string) => Promise<void>, envVariables: Record<string, string>}) => {
    const buildType = await buildTypeDetector(sourceDir);

    const runTimeType = await buildRuntimeTypeDetector(sourceDir, buildType);

    await buildExecutor({
        buildType,
        sourceDir,
        imageTag,
        runTimeType,
        onLog,
        envVariables
    })

    return {
        buildType,
        runTimeType
    }
}