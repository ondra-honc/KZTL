#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transpileKZTL } from './compilerBase.js';
import { maybePromptForExtension, installExtension } from './firstRun.js';

const STOP_SIGNALS = ["SIGINT", "SIGTERM"];

function resolveErrors(text) {
    console.error(text);
    process.exit(1);
}

export function compileFile(inputFile) {
    let outputFile;
    const resolvedInputPath = path.resolve(inputFile);
    const parseFile = path.parse(resolvedInputPath);

    if (!fs.existsSync(resolvedInputPath)) throw new Error(`Zdrojový soubor na cestě ${resolvedInputPath} neexistuje`);

    if (parseFile.ext === ".kztl") {
        outputFile = path.join(parseFile.dir, `${parseFile.name}.html`);
    } else throw new Error("Soubor ke kompilaci musí mít příponu .kztl");

    console.log(`[KZTL]  Hlavní soubor: ${resolvedInputPath}`);

    const inputCode = fs.readFileSync(resolvedInputPath, 'utf8');
    const output = transpileKZTL(inputCode);

    fs.writeFileSync(outputFile, output); 

    console.log(`Úspěšně zkompilováno do: ${outputFile}`);
}

export function runTranspiler() {
    const inputFile = process.argv[2];
    
    if (!inputFile) resolveErrors("Prosím zadejte .kztl soubor jako druhý argument");

    try {
        compileFile(inputFile);
    } catch (err) {
        resolveErrors(err.message)
    };
}

export async function main() {
    if (process.argv[2] === 'install-extension') {
        process.exit(installExtension() ? 0 : 1);
    }

    runTranspiler();              
    await maybePromptForExtension(); 
}

export function watchTranspiler(inputFile) {
    let watcher;
    let timer;
    
    const stopWatching = () => {
        watcher?.close();
        clearTimeout(timer);
        console.log("Sledování ukončeno");
        process.exit(0);
    };
    
    for (const signal of STOP_SIGNALS) {
        process.on(signal, stopWatching);
    }

    console.log("Sleduji změny... stisknutím Ctrl + C ukončíte sledování");

    try {
        compileFile(inputFile);
    } catch (err) {
        console.error(err.message);
    }

    try {
        watcher = fs.watch(inputFile, (eventType, fileName) => {
            if (!fileName || fileName != inputFile) return;

            timer = setTimeout(() => {
                onChange(eventType, fileName);
                timer = undefined;
            }, 100)
        });
    } catch (err) {
        resolveErrors(err.message);
    }
}

const isMain = fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();