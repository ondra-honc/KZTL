import { TAG_MAP, ATTR_MAP, DOCUMENT_DEC, VOID_TAGS } from "./maps.js";

export const lineType = Object.freeze({
    OPENINGTAG: 0,
    CLOSINGTAG: 1,
    CONTENT: 2,
    DOCUMENTDECLARATION: 3
});

export function clasifyLine(line) {
    const trimmed = line.trim();
    const correctEnd = trimmed.endsWith('>');

    if (trimmed.startsWith('</') && correctEnd) return lineType.CLOSINGTAG;
    if (trimmed.startsWith('<!') && correctEnd) return lineType.DOCUMENTDECLARATION;
    if (trimmed.startsWith('<') && correctEnd) return lineType.OPENINGTAG;
    return lineType.CONTENT;
}

export function extractTag(tag) {
    let content = tag.trim().slice(1, -1).trim();
    
    if (content.startsWith('/')) {
        content = content.slice(1);
    }

    if (content.endsWith('/')) {
        content = content.substring(0,content.length - 1).trim();
    }

    const firstSpaceIndex = content.indexOf(" ");

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
    const result = attrString.replace(regex, (_, key, dq, sq) => {
        const mappedKey = ATTR_MAP.get(key);
        if (mappedKey === undefined) throw new Error(`${key} není zahrnut v ATTR_MAP`);
        const value = dq ?? sq;
        return value === undefined ? mappedKey : `${mappedKey}="${value}"`;
    });

    return result;
}

export function transpileKZTL(sourceCode) {
    const lines = sourceCode.split(/\r?\n/);
    const output = [];
    const stack = []; // Stores { tag: string, htmlTag: string, line: number }
    let seenDoctypeDeclaration = false;

    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const line = lines[i];
        const firstCharIndex = line.search(/[^\s]/);
        const leadingIndent = firstCharIndex != -1 ? line.substring(0, firstCharIndex) : line;
        
        switch (clasifyLine(line)) {
            case lineType.OPENINGTAG: {
                if (!seenDoctypeDeclaration) throw new Error("Prosím deklarujte doctype na začátku souboru");
                
                const rawTag = extractTag(line);
                const htmlTag = TAG_MAP.get(rawTag[0]);
                
                if (htmlTag == undefined) throw new Error(`Tag: ${rawTag[0]} na řádku ${lineNum} neexistuje v TAG_MAP`);
                
                const attr = transpileAttributes(rawTag[1]);

                output.push(`${leadingIndent}<${htmlTag}${attr == "" ? "" : " " + attr}>`);
                 
                if (!VOID_TAGS.has(htmlTag)) {
                    stack.push({ tag: rawTag[0], htmlTag, line: lineNum});
                }
                
                break;
            }
            
            case lineType.CLOSINGTAG: {
                if (!seenDoctypeDeclaration) throw new Error("Prosím deklarujte doctype na začátku souboru");
                
                const rawTag = extractTag(line);
                const htmlTag = TAG_MAP.get(rawTag[0]);
                
                if (stack.length == 0) throw new Error(`Pro tag: ${rawTag[0]} na řádku ${lineNum} nebyl nalezen otevírací tag`); 
                if (htmlTag == undefined) throw new Error(`Tag: ${rawTag[0]} na řádku ${lineNum} neexistuje v TAG_MAP`);
                
                const lastOpened = stack.pop();

                if (lastOpened.htmlTag != htmlTag) throw new Error(`Očekáván tag: ${lastOpened.htmlTag} z řádku ${lastOpened.line}, ale nalezen tag: ${htmlTag}`);

                output.push(leadingIndent + `</${htmlTag}>`);

                break;
            }

            case lineType.CONTENT: {
                if (line.trim().length == 0) continue;
                if (!seenDoctypeDeclaration) throw new Error("Prosím deklarujte doctype na začátku souboru");
                output.push(leadingIndent + line.trim());
                break;
            }
            
            case lineType.DOCUMENTDECLARATION: {
                if (!seenDoctypeDeclaration) {
                    const rawTag = extractTag(line);
                    const documentTag = DOCUMENT_DEC.get(rawTag[0]);
                    if (documentTag == undefined) throw new Error(`Tag: ${rawTag[0]} na řádku ${lineNum} neexistuje v DOCUMENT_DEC`);
    
                    const attr = rawTag[1];
    
                    if (attr == "") throw new Error(`Na řádku ${lineNum} chybí typ dokumentu`);
                    if (attr.toLowerCase().trim() != "kztl") throw new Error(`Na řádku ${lineNum} musíte použít typ kztl`);
    
                    seenDoctypeDeclaration = true;
                    output.push(`<${documentTag} html>`);
                    break;
                }

                throw new Error(`Doctype už byl definován na řádku ${lineNum}`);
            }
        }
    }

    if (stack.length > 0) {
        const mapped = stack.map((e) => `- tag: ${e.tag} na řádku: ${e.line}`).join('\n');
        throw new Error(`Nalezeny neuzavřené tagy: \n${mapped}`);
    }

    return output.join('\n');
}