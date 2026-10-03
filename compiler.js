const lineType = Object.freeze({
    OPENINGTAG: 0,
    CLOSINGTAG: 1,
    CONTENT: 2
});

function clasifyLine(line) {
    const trimmed = line.trim();

    if (trimmed.startsWith('</') && trimmed.endsWith('>')) return lineType.CLOSINGTAG;
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return lineType.OPENINGTAG;
    return lineType.CONTENT;
}

function extractTag(tag) {
    const content = tag.trim().slice(1, -1).trim();
    
    if (content.startsWith('/')) {
        content = content.slice(1);
    }

    const firstSpaceIndex = content.indexOf(" ");

    if (firstSpaceIndex === -1) {
        return [content, ""];
    }

    const realTag = content.slice(0, firstSpaceIndex);
    const attributes = content.slice(firstSpaceIndex + 1).trim();

    return [realTag, attributes];
}