export const lineType = Object.freeze({
    OPENINGTAG: 0,
    CLOSINGTAG: 1,
    CONTENT: 2,
    DOCUMENTDECLARATION: 3
});

export const DOCUMENT_DEC = new Map([
    ["!DOCTYPE", "!DOCTYPE"]
]);

export const TAG_MAP = new Map([
    // Document Metadata
    ["hlavnikazdic", "html"],
    ["head", "head"],
    ["title", "title"],
    ["base", "base"],
    ["link", "link"],
    ["meta", "meta"],
    ["style", "style"],

    // Sections
    ["kazdic", "body"],
    ["novinykazdy", "article"],
    ["castkazdy", "section"],
    ["navigujkazdu", "nav"],
    ["vedlekazdy", "aside"],
    ["kazda1", "h1"],
    ["kazda2", "h2"],
    ["kazda3", "h3"],
    ["kazda4", "h4"],
    ["kazda5", "h5"],
    ["kazda6", "h6"],
    ["hlavakazdy", "header"],
    ["nohykazdy", "footer"],
    ["adresakazdy", "address"],

    // Grouping Content
    ["mluvikazda", "p"],
    ["citujekazda", "blockquote"],
    ["serazenykazda", "ol"],
    ["neserazenykazda", "ul"],
    ["itemkazda", "li"],
    ["fotkakazdy", "figure"],
    ["popisekfotkykazdy", "figcaption"],
    ["telokazdy", "main"],
    ["oddilkazdy", "div"],

    // Text-Level Semantics
    ["odkaznakazdu", "a"],
    ["fancykazda", "em"],
    ["dulezitykazda", "strong"],
    ["minikazda", "small"],
    ["skrtnikazdu", "s"],
    ["citujzdrojkazdo", "cite"],
    ["citujeinlinovekazda", "q"],
    ["zkratkakazdy", "abbr"],
    ["datakazdy", "data"],
    ["caskazdy", "time"],
    ["kodkazdy", "code"],
    ["promennykazda", "var"],
    ["spodniindexkazdy", "sub"],
    ["horniindexkazdy", "sup"],
    ["losspaneloskazda", "i"],
    ["nedulezitykazda", "b"],
    ["spatnagramatikakazdo", "u"],
    ["oznackazdu", "mark"],
    ["bachakazda", "span"],
    ["seknikazdu", "br"],

    // Edits
    ["vsunkazdu", "ins"],
    ["lepsipreskrtlykazda", "del"],

    // Embedded Content
    ["obrazkazdy", "picture"],
    ["zdrojobrazukazdy", "source"],
    ["obrazekkazdy", "img"],
    ["videokazdy", "video"],
    ["zvukkazdy", "audio"],

    // Forms
    ["formularkazdy", "form"],
    ["stitekkazdy", "label"],
    ["vstupkazdy", "input"],
    ["tlacitkokazda", "button"],
    ["textovepolekazdo", "textarea"],
    ["vystupkazdy", "output"],
    ["vysvetlivkakazdy", "legend"],

    // Interactive Elements
    ["detailykazdy", "details"],
    ["shrnkazdo", "summary"],
    ["dialog", "dialog"],

    // Web Components
    ["predlohakazdy", "template"],
    ["slotkazdy", "slot"],

    // Common Inline SVG/Math
    ["vektorkazdy", "svg"],
    ["matikakazdy", "math"]
]);

export const ATTR_MAP = new Map([
    // Global Attributes
    ["identifikatorkazdy", "id"],
    ["tridakazdy", "class"],
    ["stylkazdy", "style"],
    ["titulekkazdy", "title"],
    ["jazykkazdy", "lang"],
    ["skrytykazda", "hidden"],
    ["poradikazdy", "tabindex"],
    ["tahatelnykazda", "draggable"],

    // Links & Navigation
    ["odkazkazdy", "href"],
    ["cilkazdy", "target"],
    ["vztahkazdy", "rel"],
    ["stahnoutkazdu", "download"],

    // Embedded Content & Media
    ["zdrojkazdy", "src"],
    ["alternativnikazdy", "alt"],
    ["sirkakazdy", "width"],
    ["vyskakazdy", "height"],
    ["nahledkazdy", "poster"],
    ["ovladanikazdy", "controls"],
    ["samospustenikazdy", "autoplay"],
    ["smyckakazdy", "loop"],
    ["ztisenokazdo", "muted"],
    ["sadaobrazkukazdy", "srcset"],
    ["velikostikazdy", "sizes"],

    // Forms & Inputs
    ["typkazdy", "type"],
    ["hodnotakazdy", "value"],
    ["jmenokazdy", "name"],
    ["napovedakazdy", "placeholder"],
    ["zakazanokazdo", "disabled"],
    ["zaskrtnutokazdo", "checked"],
    ["povinnekazdo", "required"],
    ["pouzeproctenikazdo", "readonly"],
    ["akcekazdy", "action"],
    ["metodakazdy", "method"],
    ["prokazdu", "for"],
    ["minimumkazdy", "min"],
    ["maximumkazdy", "max"],
    ["krokkazdy", "step"],
    ["vzorkazdy", "pattern"],
    ["vicenasobnykazda", "multiple"],
    ["radkykazdy", "rows"],
    ["sloupcekazdy", "cols"],
    ["autofokuskazdy", "autofocus"],
    ["autodoplnenikazdy", "autocomplete"],

    // Metadata
    ["kodovanikazdy", "charset"],
    ["obsahkazdy", "content"],
    ["httpequivkazdy", "http-equiv"],
    ["mediakazda", "media"],

    // Interactive & Dialog
    ["otevrenokazdo", "open"]
]);

const VOID_TAGS = new Set([
    "base",
    "link",
    "br",
    "img",
    "source",
    "input",
    "meta"
]);

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
        if (mappedKey === undefined) throw new Error(`${key} is not included in ATTR_MAP`);
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
                if (!seenDoctypeDeclaration) throw new Error("Please declare doctype on top of your file");
                
                const rawTag = extractTag(line);
                const htmlTag = TAG_MAP.get(rawTag[0]);
                
                if (htmlTag == undefined) throw new Error(`Tag: ${rawTag[0]} on line: ${lineNum} doesn't exist in TAG_MAP`);
                
                const attr = transpileAttributes(rawTag[1]);

                output.push(`${leadingIndent}<${htmlTag}${attr == "" ? "" : " " + attr}>`);
                 
                if (!VOID_TAGS.has(htmlTag)) {
                    stack.push({ tag: rawTag[0], htmlTag, line: lineNum});
                }
                
                break;
            }
            
            case lineType.CLOSINGTAG: {
                if (!seenDoctypeDeclaration) throw new Error("Please declare doctype on top of your file");
                
                const rawTag = extractTag(line);
                const htmlTag = TAG_MAP.get(rawTag[0]);
                
                if (stack.length == 0) throw new Error(`Opening tag for: ${rawTag[0]} on line ${lineNum} wasn't found`); 
                if (htmlTag == undefined) throw new Error(`Tag: ${rawTag[0]} on line: ${lineNum} doesn't exist in TAG_MAP`);
                
                const lastOpened = stack.pop();

                if (lastOpened.htmlTag != htmlTag) throw new Error(`Expected tag: ${lastOpened.htmlTag} on line ${lastOpened.line} not found instead found tag: ${htmlTag}`);

                output.push(leadingIndent + `</${htmlTag}>`);

                break;
            }

            case lineType.CONTENT: {
                if (line.trim().length == 0) continue;
                if (!seenDoctypeDeclaration) throw new Error("Please declare doctype on top of your file");
                output.push(leadingIndent + line.trim());
                break;
            }
            
            case lineType.DOCUMENTDECLARATION: {
                if (!seenDoctypeDeclaration) {
                    const rawTag = extractTag(line);
                    const documentTag = DOCUMENT_DEC.get(rawTag[0]);
                    if (documentTag == undefined) throw new Error(`Tag: ${rawTag[0]} on line: ${lineNum} doesn't exist in DOCUMENT_DEC`);
    
                    const attr = rawTag[1];
    
                    if (attr == "") throw new Error(`On line: ${lineNum} forgot to declare document type`);
                    if (attr.toLowerCase().trim() != "kztl") throw new Error(`On line: ${lineNum} you must declare using the kztl type`);
    
                    seenDoctypeDeclaration = true;
                    output.push(`<${documentTag} html>`);
                    break;
                }

                throw new Error(`You already defined doctype on line ${lineNum}`);
            }
        }
    }

    if (stack.length > 0) {
        const mapped = stack.map((e) => `- tag: ${e.tag} on line: ${e.line}`).join('\n');
        throw new Error(`Found unclosed tags: \n${mapped}`);
    }

    return output.join('\n');
}