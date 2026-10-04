import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vscodeExtPath = path.join(os.homedir(), '.vscode', 'extensions');
const extensionName = 'ondrej-honc.kztl';
const targetPath = path.join(vscodeExtPath, extensionName);
const sourcePath = path.join(__dirname, 'kztl extension');

try {
  if (fs.existsSync(vscodeExtPath)) {
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    console.log('KZTL VS Code extension installed successfully!');
  } else {
    console.log('VS Code not detected, skipping extension installation.');
  }
} catch (err) {
  console.warn('Could not automatically install VS Code extension:', err.message);
}