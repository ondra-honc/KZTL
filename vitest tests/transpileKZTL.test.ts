import { describe, it, expect } from 'vitest';
import { transpileKZTL } from '../compilerBase'; 

describe('transpileKZTL - Úspěšné překlady', () => {
    it('přeloží základní strukturu bez atributů', () => {
        const input = [
            '<hlavnikazdic>',
            '<kazdic>',
            'Ahoj světe!',
            '</kazdic>',
            '</hlavnikazdic>'
        ].join('\n');
        
        const expected = [
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
            '<odkaznakazdu odkazkazdy="https://test.cz" cilkazdy="_blank">',
            'Klikni zde',
            '</odkaznakazdu>'
        ].join('\n');

        const expected = [
            '<a href="https://test.cz" target="_blank">',
            'Klikni zde',
            '</a>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });

    it('správně přeskočí nepárové (void) tagy a nevyžaduje jejich uzavření', () => {
        // Tagy jako img, br, input, meta se nesmí ukládat do stacku
        const input = [
            '<kazdic>',
            '<meta kodovanikazdy="utf-8">',
            '<obrazekkazdy zdrojkazdy="logo.png">',
            '<vstupkazdy typkazdy="text">',
            '<seknikazdu>', 
            '</kazdic>'
        ].join('\n');

        const expected = [
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
            '<kazdic>',
            '    Tento text je odsazený',
            '\tTento používá tabulátor',
            '</kazdic>'
        ].join('\n');

        const expected = [
            '<body>',
            '    Tento text je odsazený',
            '\tTento používá tabulátor',
            '</body>'
        ].join('\n');

        expect(transpileKZTL(input)).toBe(expected);
    });
});

describe('transpileKZTL - Chybové stavy (Validace a stromová struktura)', () => {
    it('vyhodí chybu, pokud je použit neznámý otevírací tag', () => {
        const input = '<neexistujikazdy>';
        expect(() => transpileKZTL(input))
            .toThrow("Tag: neexistujikazdy on line: 1 doesn't exist in TAG_MAP");
    });

    it('vyhodí chybu, pokud je použit neznámý zavírací tag', () => {
        const input = [
            '<kazdic>',
            '</neexistujikazdy>'
        ].join('\n');
        expect(() => transpileKZTL(input))
            .toThrow("Tag: neexistujikazdy on line: 2 doesn't exist in TAG_MAP");
    });

    it('vyhodí chybu pro zavírací tag, pokud žádný otevírací neexistuje (prázdný stack)', () => {
        const input = '</kazdic>';
        expect(() => transpileKZTL(input))
            .toThrow("Opening tag for: kazdic on line 1 wasn't found");
    });

    it('vyhodí chybu při křížení tagů (špatné pořadí zavírání)', () => {
        const input = [
            '<kazdic>',          // Line 1: Otevře body
            '<oddilkazdy>',      // Line 2: Otevře div
            '</kazdic>'          // Line 3: Pokusí se zavřít body, ale na vrcholu stacku je div
        ].join('\n');
        
        expect(() => transpileKZTL(input))
            .toThrow("Expected tag: div on line 2 not found instead found tag: body");
    });

    it('vyhodí chybu, pokud na konci souboru zbudou neuzavřené tagy', () => {
        const input = [
            '<hlavnikazdic>',     // Line 1
            '<kazdic>'            // Line 2
        ].join('\n');
        
        // Zkontroluje víceřádkovou chybovou zprávu mapující celý zbytek zásobníku
        expect(() => transpileKZTL(input)).toThrow(
            "Found unclosed tags: \n- tag: hlavnikazdic on line: 1\n- tag: kazdic on line: 2"
        );
    });

    it('vyhodí chybu pro neznámé atributy', () => {
        const input = '<oddilkazdy neznama="hodnota">';
        expect(() => transpileKZTL(input))
            .toThrow("neznama is not included in ATTR_MAP");
    });
});