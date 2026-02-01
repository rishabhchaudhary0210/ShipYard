import { simpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import logger from "../../lib/logger.js";
import { getAppConfig } from "../../config/index.js";

export const prepareBuildSource = async ({ deploymentId, repoUrl, rootDir }: { deploymentId: string, repoUrl: string, rootDir?: string }) => {
    logger.info('Preparing build source', { deploymentId, repoUrl, rootDir });

    const git = simpleGit();

    const destinationDir = path.join(getAppConfig('shipyardWorkspaceRoot') as string, 'deployment-src', deploymentId);

    if (fs.existsSync(destinationDir)) {
        logger.debug('Removing existing source directory', { destinationDir });
        await fs.promises.rm(destinationDir, { recursive: true, force: true });
    }

    await fs.promises.mkdir(destinationDir, { recursive: true });

    try {
        await git.clone(repoUrl, destinationDir);
        logger.info('Repository cloned successfully', { deploymentId, repoUrl });
    } catch (error) {
        logger.error('Failed to clone repository', { 
            deploymentId, 
            repoUrl, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw error;
    }

    const finalBuildDir = path.join(destinationDir, rootDir || '');    
    
    return finalBuildDir;
}

export const removeBuildSource = async (deploymentId: string) => {
    const sourceDir = path.join(getAppConfig('shipyardWorkspaceRoot') as string, 'deployment-src', deploymentId);

    if (fs.existsSync(sourceDir)) {
        logger.debug('Removing build source directory', { deploymentId, sourceDir });
        await fs.promises.rm(sourceDir, { recursive: true, force: true });
        logger.debug('Build source removed', { deploymentId });
    }
}

export const getImageTag = (projectId: string, deploymentId: string, retry: number) => {
    return `${projectId}:${deploymentId}-${retry}`;
}