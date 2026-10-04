const fs = require('fs');
const path = require('path');
const os = require('os');

const vscodeExtPath = path.join(os.homedir(), '.vscode', 'extensions');
const extensionName = 'kztl-language';
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