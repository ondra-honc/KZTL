#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { main } from "./transpile.js";

const isMain = fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();