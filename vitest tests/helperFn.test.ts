import { describe, it, expect } from 'vitest';
import {extractTag} from '../compilerBase';

describe('extractTag', () => {
    it('extracts simple tag with no attributes', () => {
        expect(extractTag('<div>')).toEqual(['div', '']);
        expect(extractTag('  <span> ')).toEqual(['span', '']);
    });

    it('extracts closing tags properly', () => {
        expect(extractTag('</div>')).toEqual(['div', '']);
    });

    it('trailing slash inside tag', () => {
        expect(extractTag('<img/>')).toEqual(['img', '']);
    });

    it('extracts tag and attributes string', () => {
        expect(extractTag('<div id="main" class="container">'))
            .toEqual(['div', 'id="main" class="container"']);
    });

    it('handles multiple spaces between tag name and attributes', () => {
        expect(extractTag('<a   href="https://example.com">'))
            .toEqual(['a', 'href="https://example.com"']);
    });
});