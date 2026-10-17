import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import fs from 'node:fs';
import { runTranspiler, main } from '../transpile';
import { transpileKZTL } from '../compilerBase';
import { maybePromptForExtension, installExtension } from '../firstRun';

// Mockování file systému, transpileru a promptu na rozšíření
vi.mock('node:fs');
vi.mock('../compilerBase', () => ({
    transpileKZTL: vi.fn()
}));
vi.mock('../firstRun', () => ({
    maybePromptForExtension: vi.fn(),
    installExtension: vi.fn()
}));

describe('CLI', () => {
    let exitSpy: MockInstance;
    let errorSpy: MockInstance;
    let logSpy: MockInstance;
    let originalArgv: string[];

    beforeEach(() => {
        originalArgv = process.argv;
        vi.resetAllMocks();

        exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
            throw new Error(`PROCESS_EXIT_${code}`);
        });

        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.argv = originalArgv;
        vi.restoreAllMocks();
    });

    describe('runTranspiler(inputFile)', () => {
        // Soubor se předává přímo jako argument funkce, process.argv se tu nepoužívá

        it('selže a ukončí se, pokud soubor neexistuje', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            expect(() => runTranspiler('missing.kztl')).toThrow('PROCESS_EXIT_1');

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("neexistuje"));
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('selže a ukončí se, pokud přípona není .kztl', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);

            expect(() => runTranspiler('wrong.txt')).toThrow('PROCESS_EXIT_1');

            expect(errorSpy).toHaveBeenCalledWith("Soubor ke kompilaci musí mít příponu .kztl");
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('úspěšně načte, zkompiluje a zapíše výstupní soubor', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('<kazdic></kazdic>');
            vi.mocked(transpileKZTL).mockReturnValue('<body></body>');

            // Zde nevyžadujeme toThrow, protože se očekává úspěšný průběh
            runTranspiler('index.kztl');

            expect(exitSpy).not.toHaveBeenCalled();
            expect(errorSpy).not.toHaveBeenCalled();

            expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('index.kztl'), 'utf8');
            expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('index.html'), '<body></body>');
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Úspěšně zkompilováno do:'));
        });

        it('zachytí a vypíše výjimku vyhozenou transpilerem', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('<badtag>');
            vi.mocked(transpileKZTL).mockImplementation(() => {
                throw new Error("Neznámý tag");
            });

            expect(() => runTranspiler('broken.kztl')).toThrow('PROCESS_EXIT_1');

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Neznámý tag"));
            expect(exitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('main() - zpracování argumentů', () => {
        // main() je async, takže výjimka z process.exit se projeví jako odmítnutý (rejected) promise

        it('selže a ukončí se, pokud není zadán žádný soubor', async () => {
            process.argv = ['node', 'cli.js'];

            await expect(main()).rejects.toThrow('PROCESS_EXIT_1');

            expect(errorSpy).toHaveBeenCalledWith("Prosím zadejte .kztl soubor");
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('selže a ukončí se při neznámé vlajce', async () => {
            process.argv = ['node', 'cli.js', 'index.kztl', '--wacth'];

            await expect(main()).rejects.toThrow('PROCESS_EXIT_1');

            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('--wacth'));
            expect(maybePromptForExtension).not.toHaveBeenCalled();
        });

        it('po úspěšném překladu nabídne instalaci rozšíření', async () => {
            process.argv = ['node', 'cli.js', 'index.kztl'];
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('<kazdic></kazdic>');
            vi.mocked(transpileKZTL).mockReturnValue('<body></body>');

            await main();

            expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('index.html'), '<body></body>');
            expect(maybePromptForExtension).toHaveBeenCalledTimes(1);
        });

        it('při selhání překladu se rozšíření nenabízí', async () => {
            process.argv = ['node', 'cli.js', 'index.kztl'];
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('<badtag>');
            vi.mocked(transpileKZTL).mockImplementation(() => {
                throw new Error("Neznámý tag");
            });

            await expect(main()).rejects.toThrow('PROCESS_EXIT_1');

            expect(maybePromptForExtension).not.toHaveBeenCalled();
        });

        it('install-extension spustí instalaci a skončí s kódem 0', async () => {
            process.argv = ['node', 'cli.js', 'install-extension'];
            vi.mocked(installExtension).mockReturnValue(true);

            await expect(main()).rejects.toThrow('PROCESS_EXIT_0');

            expect(installExtension).toHaveBeenCalledTimes(1);
            expect(exitSpy).toHaveBeenCalledWith(0);
        });

        it('install-extension skončí s kódem 1, pokud instalace selže', async () => {
            process.argv = ['node', 'cli.js', 'install-extension'];
            vi.mocked(installExtension).mockReturnValue(false);

            await expect(main()).rejects.toThrow('PROCESS_EXIT_1');
        });
    });
});