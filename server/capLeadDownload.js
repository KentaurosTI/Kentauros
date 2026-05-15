import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

/* global process */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

export const CAPLEAD_PACKAGE_NAME = 'CapLead-latest.zip';

export const getCapLeadDownloadConfig = (env = process.env) => {
  const packagePath = env.CAPLEAD_DOWNLOAD_FILE ||
    path.resolve(workspaceRoot, '..', 'CapLead', 'dist-electron', CAPLEAD_PACKAGE_NAME);
  const sourceDir = env.CAPLEAD_SOURCE_DIR ||
    path.resolve(workspaceRoot, '..', 'CapLead', 'dist-electron', 'win-unpacked');

  return {
    packagePath,
    sourceDir,
    filename: CAPLEAD_PACKAGE_NAME,
  };
};

const pathExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const compressDirectory = ({ sourceDir, packagePath }) => new Promise((resolve, reject) => {
  const command = [
    '$ErrorActionPreference = "Stop";',
    `Compress-Archive -Path '${sourceDir.replaceAll("'", "''")}\\*' -DestinationPath '${packagePath.replaceAll("'", "''")}' -Force`,
  ].join(' ');
  const child = spawn('powershell', ['-NoProfile', '-Command', command], {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';

  child.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });
  child.on('error', reject);
  child.on('exit', code => {
    if (code === 0) {
      resolve(packagePath);
      return;
    }
    reject(new Error(stderr || `Compress-Archive exited with code ${code}`));
  });
});

export const ensureCapLeadPackage = async (config = getCapLeadDownloadConfig()) => {
  if (await pathExists(config.packagePath)) {
    return config;
  }

  if (!(await pathExists(config.sourceDir))) {
    throw new Error(`CapLead build not found at ${config.sourceDir}`);
  }

  await fs.mkdir(path.dirname(config.packagePath), { recursive: true });
  await compressDirectory(config);
  return config;
};
