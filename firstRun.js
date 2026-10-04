import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_NAME = "ondrej-honc.kztl";
const SOURCE_PATH = path.join(__dirname, "kztl extension");

const EDITORS = [
    ["VS Code", path.join(os.homedir(), ".vscode", "extensions")],
    ["VS Code Insiders", path.join(os.homedir(), ".vscode-insiders", "extensions")],
    ["VSCodium", path.join(os.homedir(), ".vscode-oss", "extensions")],
    ["Cursor", path.join(os.homedir(), ".cursor", "extensions")],
];

function stateFile() {
    const base =
        process.env.XDG_CONFIG_HOME ||
        (process.platform === "win32"
            ? process.env.APPDATA
            : path.join(os.homedir(), ".config"));
    return path.join(base, "kztl", "state.json");
}

function readState() {
    try {
        return JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    } catch {
        return {};
    }
}

function writeState(state) {
    try {
        const file = stateFile();
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(state, null, 2));
    } catch {
        // can't persist: worst case we ask again next time
    }
}

export function detectEditors() {
    return EDITORS.filter(([, dir]) => fs.existsSync(dir));
}

export function installExtension() {
    const editors = detectEditors();
    if (editors.length === 0) {
        console.log("No supported editor detected, skipping extension installation.");
        return false;
    }

    let installedAny = false;
    for (const [label, dir] of editors) {
        const target = path.join(dir, EXTENSION_NAME);
        try {
            fs.rmSync(target, { recursive: true, force: true });
            fs.cpSync(SOURCE_PATH, target, { recursive: true });
            console.log(`Installed KZTL extension for ${label}.`);
            installedAny = true;
        } catch (err) {
            console.warn(`Could not install for ${label}: ${err.message}`);
        }
    }

    if (installedAny) console.log("Restart your editor (or reload the window) to activate it.");
    return installedAny;
}

export async function maybePromptForExtension() {
    const state = readState();
    if (state.extensionPrompted) return;
    if (!process.stdin.isTTY || !process.stdout.isTTY) return;
    if (detectEditors().length === 0) return;

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answer = "";
    try {
        answer = (await rl.question("Install the KZTL editor extension now? (y/N) ")).trim().toLowerCase();
    } finally {
        rl.close();
    }

    const accepted = answer === "y" || answer === "yes";
    const ok = accepted ? installExtension() : false;

    writeState({ ...state, extensionPrompted: true, extensionInstalled: ok });

    if (!accepted) console.log("Skipped. You can install it any time with: kztl install-extension");
}