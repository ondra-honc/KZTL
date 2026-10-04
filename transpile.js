#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transpileKZTL } from './compilerBase.js';
import { maybePromptForExtension, installExtension } from './firstRun.js';

function resolveErrors(text) {
    console.error(text);
    process.exit(1);
}

export function runTranspiler() {
    const inputFile = process.argv[2];
    
    if (!inputFile) resolveErrors("Prosím zadejte .kztl soubor jako druhý argument");
    
    let outputFile;
    const resolvedInputPath = path.resolve(inputFile);
    const parseFile = path.parse(resolvedInputPath);

    if (!fs.existsSync(resolvedInputPath)) resolveErrors(`Zdrojový soubor na cestě ${resolvedInputPath} neexistuje`);

    if (parseFile.ext === ".kztl") {
        outputFile = path.join(parseFile.dir, `${parseFile.name}.html`);
    } else resolveErrors("Soubor ke kompilaci musí mít příponu .kztl")

    try {
        console.log(`[KZTL]  Hlavní soubor: ${resolvedInputPath}`);

        const inputCode = fs.readFileSync(resolvedInputPath, 'utf8');
        const output = transpileKZTL(inputCode);
    
        fs.writeFileSync(outputFile, output);
        console.log(`Úspěšně zkompilováno do: ${outputFile}`);
    } catch (err) {
        resolveErrors(`Došlo k neočekávané chybě: ${err.message}`);
    }
}

// --- TEST SETUP ---
/*if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runTranspiler();
}*/

export async function main() {
    if (process.argv[2] === 'install-extension') {
        process.exit(installExtension() ? 0 : 1);
    }

    runTranspiler();              
    await maybePromptForExtension(); 
}

const isMain = fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();