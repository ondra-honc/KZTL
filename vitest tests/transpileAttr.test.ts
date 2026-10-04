import { describe, it, expect, beforeEach } from 'vitest';
import { transpileAttributes, extractTag } from '../compilerBase';
import { TAG_MAP } from "../maps"

describe('ATTR_MAP Transpilation', () => {
  it('přeloží základní atributy s hodnotou', () => {
    const input = 'tridakazdy="btn" identifikatorkazdy="hlavni"';
    expect(transpileAttributes(input)).toBe('class="btn" id="hlavni"');
  });

  it('přeloží odkaz a cílové okno', () => {
    const input = 'odkazkazdy="https://example.cz" cilkazdy="_blank"';
    expect(transpileAttributes(input)).toBe('href="https://example.cz" target="_blank"');
  });

  it('přeloží boolean atributy (bez hodnoty)', () => {
    const input = 'zakazanokazdo povinnekazdo';
    expect(transpileAttributes(input)).toBe('disabled required');
  });

  it('kombinuje hodnotové i boolean atributy', () => {
    const input = 'tridakazdy="vstup" zakazanokazdo napovedakazdy="Napište text..."';
    expect(transpileAttributes(input)).toBe('class="vstup" disabled placeholder="Napište text..."');
  });

  it('vyhodí chybu u neznámého atributu', () => {
    const input = 'neznamykazdy="test"';
    expect(() => transpileAttributes(input)).toThrow('neznamykazdy není zahrnut v ATTR_MAP');
  });
});

describe('TAG_MAP Transpilation', () => {
  it('správně namapuje custom tagy na HTML tagy', () => {
    expect(TAG_MAP.get('kazdic')).toBe('body');
    expect(TAG_MAP.get('bachakazda')).toBe('span');
    expect(TAG_MAP.get('odkaznakazdu')).toBe('a');
    expect(TAG_MAP.get('tlacitkokazda')).toBe('button');
  });

  it('vyhodí undefined nebo chybu pro neexistující tag', () => {
    expect(TAG_MAP.get('div')).toBeUndefined(); // Standardní HTML tagy v mapě klíčů nejsou
  });
});

describe('End-to-End Tag Transpilation', () => {
  // Příklad end-to-end funkce, která kombinuje extractTag + transpileAttributes + TAG_MAP
  it('přeloží kompletní otevírací tag s atributy', () => {
    const inputTag = '<odkaznakazdu odkazkazdy="https://kazda.cz" tridakazdy="odkaz">';
    
    const [rawTag, rawAttrs] = extractTag(inputTag);
    const mappedTag = TAG_MAP.get(rawTag);
    const mappedAttrs = transpileAttributes(rawAttrs);

    const result = `<${mappedTag} ${mappedAttrs}>`;
    expect(result).toBe('<a href="https://kazda.cz" class="odkaz">');
  });
});