import fs from "fs";
import path from "path";
import { dockerClient } from "../lib/docker.js";

/**
 * Clean Docker log buffer by parsing Docker's log format
 * Docker wraps logs in frames with stream type and message length headers
 */
export function cleanDockerLogBuffer(buffer: Buffer): string {
  let i = 0;
  let output = "";

  while (i < buffer.length) {
    // Docker log frame:
    // byte 0: stream type
    // bytes 1–3: unused
    // bytes 4–7: message length (uint32 BE)
    const messageLength = buffer.readUInt32BE(i + 4);

    const messageStart = i + 8;
    const messageEnd = messageStart + messageLength;

    let currLine = buffer.slice(messageStart, messageEnd).toString("utf-8");

    if (!currLine.includes("[Object: null prototype]")) {
      output += currLine;
    }

    i = messageEnd;
  }

  return output;
}

const STATIC_OUTPUT_CANDIDATES = ["dist", "build", "out", "public"];

/**
 * Find the static build output directory
 * Checks for common output directories (dist, build, out, public) or index.html at root
 */
export function findStaticOutput(sourceDir: string): string {
  for (const dir of STATIC_OUTPUT_CANDIDATES) {
    const fullPath = path.join(sourceDir, dir);

    if (
      fs.existsSync(fullPath) &&
      fs.statSync(fullPath).isDirectory() &&
      fs.readdirSync(fullPath).length > 0
    ) {
      return fullPath;
    }
  }

  if (fs.existsSync(path.join(sourceDir, "index.html"))) {
    return sourceDir;
  }

  throw new Error("No static build output found");
}

/**
 * Clean raw string logs from Docker streams
 * Removes ANSI escape codes and other encoding artifacts
 */
export function cleanDockerStreamLog(log: string): string {
  // Remove ANSI color codes and escape sequences
  let cleaned = log.replace(/\x1b\[[0-9;]*m/g, "");
  
  // Remove any null bytes or control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Remove the object prototype marker
  if (cleaned.includes("[Object: null prototype]")) {
    return "";
  }
  
  return cleaned;
}

/**
 * Ensure Docker image is available locally
 * Pulls the image if not found locally
 */
export async function ensureImage(
  image: string,
  onLog?: (msg: string) => void
): Promise<void> {
  onLog?.(`[pull] Ensuring image ${image} is available locally...`);

  try {
    await dockerClient.getImage(image).inspect();
    onLog?.(`[pull] Image ${image} found locally.`);
    return;
  } catch {}

  onLog?.(`[pull] Image ${image} not found locally. Pulling...`);

  await new Promise<void>((resolve, reject) => {
    dockerClient.pull(image, (err: unknown, stream: any) => {
      if (err) return reject(err);

      dockerClient?.modem?.followProgress(
        stream,
        (err) => (err ? reject(err) : resolve()),
        (event) => {
          if (event.status) {
            onLog?.(`[pull] ${event.status}`);
          }
        }
      );
    });
  });
}
