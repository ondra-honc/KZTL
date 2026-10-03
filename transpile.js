import fs from 'node:fs';
import path from 'node:path';
import { transpileKZTL } from './compilerBase';

function resolveErrors(text) {
    console.error(text);
    process.exit(1);
}

export function runTranspiler() {
    const inputFile = process.argv[2];
    
    if (!inputFile) resolveErrors("Please enter a .kztl file as a second argument");
    
    let outputFile;
    const resolvedInputPath = path.resolve(inputFile);
    const parseFile = path.parse(resolvedInputPath);

    if (!fs.existsSync(resolvedInputPath)) resolveErrors(`Source file at ${resolvedInputPath} does not exist`);

    if (parseFile.ext === ".kztl") {
        outputFile = path.join(parseFile.dir, `${parseFile.name}.html`);
    } else resolveErrors("Please transpile a .kztl file")

    try {
        console.log(`[KZTL]  Root file: ${resolvedInputPath}`);

        const inputCode = fs.readFileSync(resolvedInputPath, 'utf8');
        const output = transpileKZTL(inputCode);
    
        fs.writeFileSync(outputFile, output);
        console.log(`Successfully transpiled to ${outputFile}`);
    } catch (err) {
        resolveErrors(`An unhandled exception happened: ${err.message}`);
    }
}

// --- TEST SETUP ---
import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runTranspiler();
}