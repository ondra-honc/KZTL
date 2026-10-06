import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';

// Mocky musí být vytvořené před importem testovaného modulu (vi.mock se hoistuje)
const mocks = vi.hoisted(() => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    watch: vi.fn(),
    realpathSync: vi.fn(() => '/neni-vstupni-soubor-cli'), // isMain musí být false
    transpileKZTL: vi.fn(),
    maybePromptForExtension: vi.fn(),
    installExtension: vi.fn(),
}));

vi.mock('node:fs', () => ({
    default: {
        existsSync: mocks.existsSync,
        readFileSync: mocks.readFileSync,
        writeFileSync: mocks.writeFileSync,
        watch: mocks.watch,
        realpathSync: mocks.realpathSync,
    },
}));

vi.mock('../compilerBase.js', () => ({
    transpileKZTL: mocks.transpileKZTL,
}));

vi.mock('../firstRun.js', () => ({
    maybePromptForExtension: mocks.maybePromptForExtension,
    installExtension: mocks.installExtension,
}));

import { watchTranspiler } from '../transpile.js';

type WatchListener = (eventType: string, fileName: string | null) => void;

const FILE = 'index.kztl';
const DEBOUNCE_MS = 100;

describe('watchTranspiler', () => {
    let fsListener: WatchListener;
    let signalHandlers: Map<string, () => void>;
    let watcher: { close: ReturnType<typeof vi.fn> };
    let logSpy: ReturnType<typeof vi.spyOn>;
    let errorSpy: ReturnType<typeof vi.spyOn>;
    let exitSpy: ReturnType<typeof vi.spyOn>;

    // Simuluje událost ze souborového systému (uložení souboru)
    const emit = (fileName: string | null = FILE, eventType = 'change') => fsListener(eventType, fileName);

    beforeEach(() => {
        vi.useFakeTimers();

        for (const mock of Object.values(mocks)) mock.mockReset();

        mocks.realpathSync.mockReturnValue('/neni-vstupni-soubor-cli');
        mocks.existsSync.mockReturnValue(true);
        mocks.readFileSync.mockReturnValue('<!DOCTYPE kztl>');
        mocks.transpileKZTL.mockReturnValue('<!DOCTYPE html>');

        watcher = { close: vi.fn() };
        mocks.watch.mockImplementation((_path: string, listener: WatchListener) => {
            fsListener = listener;
            return watcher;
        });

        // Zachytíme handlery signálů, aby se nepřipojily k reálnému procesu vitestu
        signalHandlers = new Map();
        vi.spyOn(process, 'on').mockImplementation(((event: string, handler: () => void) => {
            signalHandlers.set(event, handler);
            return process;
        }) as never);

        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
            throw new Error(`EXIT_${code}`);
        }) as never);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Spuštění', () => {
        it('vypíše úvodní zprávu s nápovědou ke Ctrl + C', () => {
            watchTranspiler(FILE);
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Ctrl + C'));
        });

        it('zkompiluje soubor jednou hned při startu', () => {
            watchTranspiler(FILE);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1);
            expect(mocks.writeFileSync).toHaveBeenCalledWith(
                expect.stringMatching(/index\.html$/),
                '<!DOCTYPE html>'
            );
        });

        it('začne sledovat zadaný soubor', () => {
            watchTranspiler(FILE);
            expect(mocks.watch).toHaveBeenCalledWith(FILE, expect.any(Function));
        });

        it('zaregistruje handlery pro SIGINT i SIGTERM', () => {
            watchTranspiler(FILE);

            expect(signalHandlers.has('SIGINT')).toBe(true);
            expect(signalHandlers.has('SIGTERM')).toBe(true);
        });

        it('nespadne a začne sledovat, i když první kompilace selže', () => {
            mocks.transpileKZTL.mockImplementationOnce(() => {
                throw new Error('Chyba syntaxe');
            });

            expect(() => watchTranspiler(FILE)).not.toThrow();

            expect(errorSpy).toHaveBeenCalledWith('Chyba syntaxe');
            expect(mocks.watch).toHaveBeenCalledTimes(1);
            expect(exitSpy).not.toHaveBeenCalled();
        });

        it('ukončí se s kódem 1, pokud sledování nejde spustit', () => {
            mocks.watch.mockImplementation(() => {
                throw new Error('EACCES: přístup odepřen');
            });

            expect(() => watchTranspiler(FILE)).toThrow('EXIT_1');
            expect(errorSpy).toHaveBeenCalledWith('EACCES: přístup odepřen');
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('ukončí se s kódem 1, pokud zdrojový soubor neexistuje', () => {
            mocks.existsSync.mockReturnValue(false);
            mocks.watch.mockImplementation(() => {
                throw new Error('ENOENT: soubor neexistuje');
            });

            expect(() => watchTranspiler('chybi.kztl')).toThrow('EXIT_1');

            // chyba z úvodní kompilace i chyba ze spuštění sledování
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('neexistuje'));
            expect(exitSpy).toHaveBeenCalledWith(1);
        });
    });

    describe('Překlad po změně souboru', () => {
        it('překompiluje soubor až po uplynutí debounce intervalu', () => {
            watchTranspiler(FILE);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1);

            emit();
            vi.advanceTimersByTime(DEBOUNCE_MS - 1);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(1);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(2);
            expect(logSpy).toHaveBeenCalledWith('Soubor změněn, překládám znovu');
        });

        it('sloučí několik rychlých událostí do jedné kompilace', () => {
            watchTranspiler(FILE);

            emit();
            vi.advanceTimersByTime(30);
            emit();
            vi.advanceTimersByTime(30);
            emit();

            vi.advanceTimersByTime(DEBOUNCE_MS - 1);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1); // jen úvodní kompilace

            vi.advanceTimersByTime(1);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(2);
        });

        it('překompiluje při každém samostatném uložení', () => {
            watchTranspiler(FILE);

            emit();
            vi.advanceTimersByTime(DEBOUNCE_MS);
            emit();
            vi.advanceTimersByTime(DEBOUNCE_MS);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(3);
        });

        it('ignoruje události pro jiné soubory', () => {
            watchTranspiler(FILE);

            emit('jiny-soubor.txt');
            vi.advanceTimersByTime(DEBOUNCE_MS * 2);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1);
        });

        it('ignoruje události bez názvu souboru', () => {
            watchTranspiler(FILE);

            emit(null);
            vi.advanceTimersByTime(DEBOUNCE_MS * 2);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1);
        });

        it('porovnává podle názvu souboru, i když je zadána cesta s adresáři', () => {
            watchTranspiler(path.join('src', FILE));

            emit(FILE); // Node hlásí jen název souboru bez cesty
            vi.advanceTimersByTime(DEBOUNCE_MS);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(2);
        });

        it('po chybě v souboru vypíše zprávu a pokračuje ve sledování', () => {
            watchTranspiler(FILE);

            mocks.transpileKZTL.mockImplementationOnce(() => {
                throw new Error('Chyba syntaxe');
            });
            emit();
            vi.advanceTimersByTime(DEBOUNCE_MS);

            expect(errorSpy).toHaveBeenCalledWith('Chyba syntaxe');
            expect(exitSpy).not.toHaveBeenCalled();

            // uživatel chybu opraví a znovu uloží
            emit();
            vi.advanceTimersByTime(DEBOUNCE_MS);

            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(3); // start + chyba + oprava
            expect(mocks.writeFileSync).toHaveBeenCalledTimes(2); // start + oprava (při chybě se nezapisuje)
        });
    });

    describe('Ukončení (Ctrl + C)', () => {
        it.each(['SIGINT', 'SIGTERM'])('%s zavře watcher, vypíše zprávu a skončí s kódem 0', (signal) => {
            watchTranspiler(FILE);

            const handler = signalHandlers.get(signal)!;
            expect(() => handler()).toThrow('EXIT_0');

            expect(watcher.close).toHaveBeenCalledTimes(1);
            expect(logSpy).toHaveBeenCalledWith('Sledování ukončeno');
            expect(exitSpy).toHaveBeenCalledWith(0);
        });

        it('zruší čekající překlad, pokud je ukončeno během debounce intervalu', () => {
            watchTranspiler(FILE);

            emit();
            const handler = signalHandlers.get('SIGINT')!;
            expect(() => handler()).toThrow('EXIT_0');

            vi.advanceTimersByTime(DEBOUNCE_MS * 2);
            expect(mocks.transpileKZTL).toHaveBeenCalledTimes(1); // jen úvodní kompilace
        });

        it('nespadne při ukončení, pokud sledování nikdy nezačalo', () => {
            mocks.watch.mockImplementation(() => {
                throw new Error('EACCES: přístup odepřen');
            });
            expect(() => watchTranspiler(FILE)).toThrow('EXIT_1');

            const handler = signalHandlers.get('SIGINT')!;
            expect(() => handler()).toThrow('EXIT_0'); // žádná jiná chyba (např. TypeError)
            expect(watcher.close).not.toHaveBeenCalled();
        });
    });
});