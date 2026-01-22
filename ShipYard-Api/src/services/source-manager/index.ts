import { simpleGit } from "simple-git";
import path from "path";
import fs from "fs";

export const prepareBuildSource = async ({ deploymentId, repoUrl, rootDir }: { deploymentId: string, repoUrl: string, rootDir?: string }) => {
    const git = simpleGit();

    const destinationDir = path.join(process.cwd(), 'tmp', 'deployment-src', deploymentId);

    if (fs.existsSync(destinationDir)) {
        await fs.promises.rm(destinationDir, { recursive: true, force: true });
    }

    await fs.promises.mkdir(destinationDir, { recursive: true });

    await git.clone(repoUrl, destinationDir);

    const finalBuildDir = path.join(destinationDir, rootDir || '');    
    
    return finalBuildDir;
}

export const removeBuildSource = async (deploymentId: string) => {
    const sourceDir = path.join(process.cwd(), 'tmp', 'deployment-src', deploymentId);

    if (fs.existsSync(sourceDir)) {
        await fs.promises.rm(sourceDir, { recursive: true, force: true });
    }
}

prepareBuildSource({ deploymentId: 'test-deployment-01', repoUrl: 'https://github.com/rishabhchaudhary0210/Grocery-Website.git' })
