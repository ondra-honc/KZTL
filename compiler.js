export const lineType = Object.freeze({
    OPENINGTAG: 0,
    CLOSINGTAG: 1,
    CONTENT: 2
});

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

    if (trimmed.startsWith('</') && trimmed.endsWith('>')) return lineType.CLOSINGTAG;
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return lineType.OPENINGTAG;
    return lineType.CONTENT;
}

export function extractTag(tag) {
    let content = tag.trim().slice(1, -1).trim();
    
    if (content.startsWith('/')) {
        content = content.slice(1);
    }

    if (content.endsWith('/')) {
        content = content.slice(-1);
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
    if (!attrString.trim()) return "";
    
    const regex = /([a-zA-Z0-9_-]+)(?:=\s*"([^"]*)")?/g;
    const result = attrString.replace(regex, (FullMatch, key, value) => {
        if (ATTR_MAP.get(key) == undefined) throw new Error(`${key} is not included in ATTR_MAP`);
        
        const mappedKey =  ATTR_MAP.get(key);
        if (value == undefined) return `${mappedKey}`
        return `${mappedKey}="${value}"`
    })

    return result;
}