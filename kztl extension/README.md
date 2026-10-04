# KZTL Language Support

Editor support for **KZTL**, a markup language that compiles to plain HTML. This extension treats `.kztl` files like HTML, so you get familiar highlighting and snippets while you write.

## Features

- **Syntax highlighting** for `.kztl` files, based on HTML highlighting.
- **Snippets** for KZTL tags.
- **Tab completion for snippets**: in `.kztl` files, the Tab key expands snippets only, so it won't interfere with other suggestions.

## Quick example

KZTL uses one tag per line, and content goes on its own line:

```
<!DOCTYPE kztl>
<hlavnikazdic jazykkazdy="cs">
    <head>
        <title>
            My page
        </title>
    </head>
    <kazdic>
        <kazda1>
            Hello, world
        </kazda1>
        <mluvikazda>
            This compiles to plain HTML.
        </mluvikazda>
    </kazdic>
</hlavnikazdic>
```

## Compiling to HTML

Install the KZTL compiler from npm:

```
npm install -g @ondra_honc/kztl
```

Then compile a file:

```
kztl index.kztl
```

This writes `index.html` next to your source file.

## Requirements

- Visual Studio Code 1.70 or newer.

## Feedback and issues

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/ondra-honc/KZTL/issues).

## License

MIT