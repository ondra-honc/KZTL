import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import fs from 'node:fs';
import { runTranspiler } from '../transpile'; 
import { transpileKZTL } from '../compilerBase';

// Mockování file systému a samotného transpileru
vi.mock('node:fs');
vi.mock('../compilerBase', () => ({
    transpileKZTL: vi.fn()
}));

describe('runTranspiler CLI', () => {
    let exitSpy: MockInstance;
    let errorSpy: MockInstance;
    let logSpy: MockInstance;
    let originalArgv: string[];

    beforeEach(() => {
        originalArgv = process.argv;
        vi.clearAllMocks();

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

    it('selže a ukončí se, pokud není zadán žádný soubor', () => {
        process.argv = ['node', 'cli.js'];
        
        // Očekáváme, že funkce vyhodí naši umělou výjimku z process.exit(1)
        expect(() => runTranspiler()).toThrow('PROCESS_EXIT_1');
        
        expect(errorSpy).toHaveBeenCalledWith("Prosím zadejte .kztl soubor jako druhý argument");
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('selže a ukončí se, pokud soubor neexistuje', () => {
        process.argv = ['node', 'cli.js', 'missing.kztl'];
        vi.mocked(fs.existsSync).mockReturnValue(false);
        
        expect(() => runTranspiler()).toThrow('PROCESS_EXIT_1');
        
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("neexistuje"));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('selže a ukončí se, pokud přípona není .kztl', () => {
        process.argv = ['node', 'cli.js', 'wrong.txt'];
        vi.mocked(fs.existsSync).mockReturnValue(true);
        
        expect(() => runTranspiler()).toThrow('PROCESS_EXIT_1');
        
        expect(errorSpy).toHaveBeenCalledWith("Soubor ke kompilaci musí mít příponu .kztl");
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('úspěšně načte, zkompiluje a zapíše výstupní soubor', () => {
        process.argv = ['node', 'cli.js', 'index.kztl'];
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('<kazdic></kazdic>');
        vi.mocked(transpileKZTL).mockReturnValue('<body></body>');
        
        // Zde nevyžadujeme toThrow, protože se očekává úspěšný průběh
        runTranspiler();
        
        expect(exitSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('index.kztl'), 'utf8');
        expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('index.html'), '<body></body>');
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Úspěšně zkompilováno do:'));
    });

    it('zachytí a vypíše výjimku vyhozenou transpilerem', () => {
        process.argv = ['node', 'cli.js', 'broken.kztl'];
        
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('<badtag>');
        
        vi.mocked(transpileKZTL).mockImplementation(() => {
            throw new Error("Neznámý tag");
        });
        
        expect(() => runTranspiler()).toThrow('PROCESS_EXIT_1');
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Došlo k neočekávané chybě: Neznámý tag"));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});