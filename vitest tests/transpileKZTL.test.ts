import { describe, it, expect } from 'vitest';
import { transpileKZTL } from '../compilerBase'; 

const DOCTYPE_IN = '<!DOCTYPE kztl>';
const DOCTYPE_OUT = '<!DOCTYPE html>';

describe('transpileKZTL - Úspěšné překlady', () => {
    it('přeloží základní strukturu bez atributů', () => {
        const input = [
            DOCTYPE_IN,
            '<hlavnikazdic>',
            '<kazdic>',
            'Ahoj světe!',
            '</kazdic>',
            '</hlavnikazdic>'
        ].join('\n');
        
        const expected = [
            DOCTYPE_OUT,
            '<html>',
            '<body>',
            'Ahoj světe!',
            '</body>',
            '</html>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });

    it('přeloží tagy s atributy', () => {
        const input = [
            DOCTYPE_IN,
            '<odkaznakazdu odkazkazdy="https://test.cz" cilkazdy="_blank">',
            'Klikni zde',
            '</odkaznakazdu>'
        ].join('\n');

        const expected = [
            DOCTYPE_OUT,
            '<a href="https://test.cz" target="_blank">',
            'Klikni zde',
            '</a>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });

    it('správně přeskočí nepárové (void) tagy a nevyžaduje jejich uzavření', () => {
        // Tagy jako img, br, input, meta se nesmí ukládat do stacku
        const input = [
            DOCTYPE_IN,
            '<kazdic>',
            '<meta kodovanikazdy="utf-8">',
            '<obrazekkazdy zdrojkazdy="logo.png">',
            '<vstupkazdy typkazdy="text">',
            '<seknikazdu>', 
            '</kazdic>'
        ].join('\n');

        const expected = [
            DOCTYPE_OUT,
            '<body>',
            '<meta charset="utf-8">',
            '<img src="logo.png">',
            '<input type="text">',
            '<br>',
            '</body>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });

    it('zachová odsazení a bílé znaky u textového obsahu (CONTENT)', () => {
        const input = [
            DOCTYPE_IN,
            '<kazdic>',
            '    Tento text je odsazený',
            '\tTento používá tabulátor',
            '</kazdic>'
        ].join('\n');

        const expected = [
            DOCTYPE_OUT,
            '<body>',
            '    Tento text je odsazený',
            '\tTento používá tabulátor',
            '</body>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });

    it('přijme doctype bez ohledu na velikost písmen u typu dokumentu', () => {
        expect(transpileKZTL('<!DOCTYPE KZTL>')).toBe(DOCTYPE_OUT);
    });
});

describe('transpileKZTL - Doctype', () => {
    it('vyhodí chybu, pokud soubor začíná tagem místo doctype', () => {
        expect(() => transpileKZTL('<kazdic>'))
            .toThrow("Prosím deklarujte doctype na začátku souboru");
    });

    it('vyhodí chybu, pokud soubor začíná textem místo doctype', () => {
        expect(() => transpileKZTL('Ahoj světe!'))
            .toThrow("Prosím deklarujte doctype na začátku souboru");
    });

    it('vyhodí chybu, pokud je doctype definován dvakrát', () => {
        const input = [DOCTYPE_IN, DOCTYPE_IN].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("Doctype už byl definován na řádku 2");
    });

    it('vyhodí chybu, pokud chybí typ dokumentu', () => {
        expect(() => transpileKZTL('<!DOCTYPE>'))
            .toThrow("Na řádku 1 chybí typ dokumentu");
    });

    it('vyhodí chybu, pokud typ dokumentu není kztl', () => {
        expect(() => transpileKZTL('<!DOCTYPE html>'))
            .toThrow("Na řádku 1 musíte použít typ kztl");
    });

    it('vyhodí chybu pro neznámou deklaraci', () => {
        expect(() => transpileKZTL('<!NECO kztl>'))
            .toThrow("Tag: !NECO na řádku 1 neexistuje v DOCUMENT_DEC");
    });
});

describe('transpileKZTL - Chybové stavy (Validace a stromová struktura)', () => {
    it('vyhodí chybu, pokud je použit neznámý otevírací tag', () => {
        const input = [DOCTYPE_IN, '<neexistujikazdy>'].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("Tag: neexistujikazdy na řádku 2 neexistuje v TAG_MAP");
    });

    it('vyhodí chybu, pokud je použit neznámý zavírací tag', () => {
        const input = [
            DOCTYPE_IN,
            '<kazdic>',
            '</neexistujikazdy>'
        ].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("Tag: neexistujikazdy na řádku 3 neexistuje v TAG_MAP");
    });

    it('vyhodí chybu pro zavírací tag, pokud žádný otevírací neexistuje (prázdný stack)', () => {
        const input = [DOCTYPE_IN, '</kazdic>'].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("Pro tag: kazdic na řádku 2 nebyl nalezen otevírací tag");
    });

    it('vyhodí chybu při křížení tagů (špatné pořadí zavírání)', () => {
        const input = [
            DOCTYPE_IN,          // Řádek 1: Doctype
            '<kazdic>',          // Řádek 2: Otevře body
            '<oddilkazdy>',      // Řádek 3: Otevře div
            '</kazdic>'          // Řádek 4: Pokusí se zavřít body, ale na vrcholu stacku je div
        ].join('\n');
        
        expect(() => transpileKZTL(input))
            .toThrow("Očekáván tag: div z řádku 3, ale nalezen tag: body");
    });

    it('vyhodí chybu, pokud na konci souboru zbudou neuzavřené tagy', () => {
        const input = [
            DOCTYPE_IN,           // Řádek 1
            '<hlavnikazdic>',     // Řádek 2
            '<kazdic>'            // Řádek 3
        ].join('\n');
        
        // Zkontroluje víceřádkovou chybovou zprávu mapující celý zbytek zásobníku
        expect(() => transpileKZTL(input)).toThrow(
            "Nalezeny neuzavřené tagy: \n- tag: hlavnikazdic na řádku: 2\n- tag: kazdic na řádku: 3"
        );
    });

    it('vyhodí chybu pro neznámé atributy', () => {
        const input = [DOCTYPE_IN, '<oddilkazdy neznama="hodnota">'].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("neznama není zahrnut v ATTR_MAP");
    });
});