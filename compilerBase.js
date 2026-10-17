import { TAG_MAP, ATTR_MAP, DOCUMENT_DEC, VOID_TAGS, FORBIDDEN_TAGS, RAW_TEXT_TAGS } from "./maps.js";

export const tokenType = Object.freeze({
    OPEN: 0,
    CLOSE: 1,
    TEXT: 2,
    DECLARATION: 3
});

export function extractTag(tag) {
    let content = tag.trim().slice(1, -1).trim();
    
    if (content.startsWith('/')) {
        content = content.slice(1);
    }

    if (content.endsWith('/')) {
        content = content.substring(0,content.length - 1).trim();
    }

    const firstSpaceIndex = content.search(/\s/);

    if (firstSpaceIndex === -1) {
        return [content, ""];
    }

    const realTag = content.slice(0, firstSpaceIndex);
    const attributes = content.slice(firstSpaceIndex + 1).trim();

    return [realTag, attributes];
}

export function transpileAttributes(attrString) {
    if (!attrString) return "";
    
    const regex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
    return attrString.replace(regex, (_, key, dq, sq) => {
        const mappedKey = ATTR_MAP.get(key);
        if (mappedKey === undefined) throw new Error(`${key} není zahrnut v ATTR_MAP`);
        const value = dq ?? sq;
        return value === undefined ? mappedKey : `${mappedKey}="${value}"`;
    });
}

export function buildHtml(tokens) {
    const output = [];
    const stack = []; 
    let seenDoctype = false;

    for (const token of tokens) {
        if (token.type !== tokenType.DECLARATION && !seenDoctype) {
            throw new Error("Prosím deklarujte doctype na začátku souboru");
        }

        switch (token.type) {
            case tokenType.OPEN: {
                if (FORBIDDEN_TAGS.has(token.name.toLowerCase())) {
                    throw new Error(`Tag: ${token.name} na řádku ${token.line} je v KZTL zakázán`);
                }

                const htmlTag = TAG_MAP.get(token.name);
                if (htmlTag === undefined) throw new Error(`Tag: ${token.name} na řádku ${token.line} neexistuje v TAG_MAP`);

                const attr = transpileAttributes(token.attrs);
                output.push(`${token.leading}<${htmlTag}${attr === "" ? "" : " " + attr}>`);

                if (!VOID_TAGS.has(htmlTag)) {
                    stack.push({ tag: token.name, htmlTag, line: token.line });
                }
                break;
            }

            case tokenType.CLOSE: {
                const htmlTag = TAG_MAP.get(token.name);

                if (stack.length === 0) throw new Error(`Pro tag: ${token.name} na řádku ${token.line} nebyl nalezen otevírací tag`);
                if (htmlTag === undefined) throw new Error(`Tag: ${token.name} na řádku ${token.line} neexistuje v TAG_MAP`);

                const lastOpened = stack.pop();
                if (lastOpened.htmlTag !== htmlTag) {
                    throw new Error(`Očekáván tag: ${lastOpened.htmlTag} z řádku ${lastOpened.line}, ale nalezen tag: ${htmlTag}`);
                }

                output.push(`${token.leading}</${htmlTag}>`);
                break;
            }

            case tokenType.TEXT:
                output.push(token.leading + token.text);
                break;

            case tokenType.DECLARATION: {
                if (seenDoctype) throw new Error(`Doctype už byl definován na řádku ${token.line}`);

                const documentTag = DOCUMENT_DEC.get(token.name);
                if (documentTag === undefined) throw new Error(`Tag: ${token.name} na řádku ${token.line} neexistuje v DOCUMENT_DEC`);

                if (token.attrs === "") throw new Error(`Na řádku ${token.line} chybí typ dokumentu`);
                if (token.attrs.toLowerCase().trim() !== "kztl") throw new Error(`Na řádku ${token.line} musíte použít typ kztl`);

                seenDoctype = true;
                output.push(`<${documentTag} html>`);
                break;
            }
        }
    }

    if (stack.length > 0) {
        const mapped = stack.map((e) => `- tag: ${e.tag} na řádku: ${e.line}`).join('\n');
        throw new Error(`Nalezeny neuzavřené tagy: \n${mapped}`);
    }

    return output.join('');
}

function findTagStart(src, from) {
    const re = /<(?=[A-Za-z\/!])/g;
    re.lastIndex = from;
    const match = re.exec(src);
    return match ? match.index : -1;
}

function findTagEnd(src, start) {
    let quote = null;
    for (let i = start + 1; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === ">") {
            return i;
        }
    }
    return -1;
}

function countNewlines(text) {
    let count = 0;
    for (const ch of text) if (ch === "\n") count++;
    return count;
}

export function tokenizeSource(sourceCode) {
    const src = sourceCode.replace(/\r\n/g, "\n");
    const tokens = [];
    let pos = 0;
    let line = 1;
    let pending = "";

    while (pos < src.length) {
        const tagStart = findTagStart(src, pos);
        const segmentEnd = tagStart === -1 ? src.length : tagStart;
        const segment = src.slice(pos, segmentEnd);

        if (segment !== "") {
            const trimmedEnd = segment.trimEnd();
            const leadLength = segment.length - segment.trimStart().length;

            if (trimmedEnd === "") {
                pending += segment;
            } else {
                const lead = segment.slice(0, leadLength);
                tokens.push({
                    type: tokenType.TEXT,
                    line: line + countNewlines(lead),
                    leading: pending + lead,
                    text: trimmedEnd.slice(leadLength),
                });
                pending = segment.slice(trimmedEnd.length);
            }
            line += countNewlines(segment);
        }

        if (tagStart === -1) break;

        const tagEnd = findTagEnd(src, tagStart);
        if (tagEnd === -1) throw new Error(`Nedokončený tag na řádku ${line}`);

        const raw = src.slice(tagStart, tagEnd + 1);
        const [name, attrs] = extractTag(raw);

        let type = tokenType.OPEN;
        if (raw.startsWith("</")) type = tokenType.CLOSE;
        else if (raw.startsWith("<!")) type = tokenType.DECLARATION;

        tokens.push({ type, line, leading: pending, name, attrs });
        pending = "";

        line += countNewlines(raw);
        pos = tagEnd + 1;

        if (type === tokenType.OPEN && RAW_TEXT_TAGS.has(name) && !raw.endsWith("/>")) {
            const closeRe = new RegExp(`</${name}`, "ig");
            closeRe.lastIndex = pos;
            const closeMatch = closeRe.exec(src);
            const rawEnd = closeMatch ? closeMatch.index : src.length;
            const rawText = src.slice(pos, rawEnd);

            if (rawText !== "") {
                tokens.push({ type: tokenType.TEXT, line, leading: "", text: rawText });
                line += countNewlines(rawText);
                pos = rawEnd;
            }
        }
    }

    return tokens;
}

export function transpileKZTL(sourceCode) {
    return buildHtml(tokenizeSource(sourceCode));
}