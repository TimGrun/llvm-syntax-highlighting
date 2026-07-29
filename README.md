# LLVM Syntax Highlighting

Syntax highlighting for modern LLVM intermediate representation (`.ll`) files in Visual Studio Code.

The grammar distinguishes LLVM symbols and language forms using standard TextMate scopes, producing readable colors across common VS Code themes rather than assigning one style to most IR tokens.

> Recommended to be used alongside the `LLVM IR Language Support` extension by rev.ng Labs for folding range and go-to-definition support

## Highlighting

- SSA values such as `%result` and `%0`
- Global variables and function symbols such as `@table` and `@llvm.assume`
- Named types, primitive types, opaque pointers, arrays, vectors, and structs
- Basic block definitions and `label` references
- Instructions, terminators, comparison predicates, and atomic operations
- Linkage, calling conventions, function attributes, fast-math flags, and memory effects
- Attribute groups, metadata references, metadata constructors, and debug records
- Integer, decimal, scientific, and LLVM hexadecimal constants
- Strings, LLVM byte escapes, punctuation, and comments

The vocabulary follows current LLVM IR and includes forms used by LLVM 20-era output, including opaque pointers, `#dbg_value`, `memory(...)`, `nneg`, `disjoint`, and modern `atomicrmw` operations.

## Install

Install the published extension from the Visual Studio Code Marketplace, or install a locally built VSIX:

1. Open the Command Palette.
2. Run **Extensions: Install from VSIX...**.
3. Select the generated `.vsix` file.

Files ending in `.ll` are automatically assigned the LLVM language mode. You can also select **LLVM** from the language picker.

## Development

Requirements:

- Node.js 20 or newer
- npm
- Visual Studio Code

Install the development dependency:

```console
npm install
```

Open this repository in Visual Studio Code and press `F5` to launch an Extension Development Host.

After changing the grammar, reload the Extension Development Host with **Developer: Reload Window**.

## Validate

Run the dependency-free grammar checks with:

```console
npm test
```

The validator:

- parses the TextMate grammar and compiles every regular expression;
- verifies that all repository includes resolve;
- checks precedence for comments, strings, and symbols;
- asserts expected scopes for representative LLVM constructs; and
- scans both `.ll` fixtures for unclassified sigil-prefixed tokens.

When adding syntax support, add a representative form to a fixture and a focused expectation to [scripts/validate-grammar.js](scripts/validate-grammar.js).

## Build

Create an installable VSIX after installing dependencies:

```console
npm run package
```

The package command runs validation first, then uses `@vscode/vsce` to write `llvm-syntax-highlighting-<version>.vsix` to the repository root. Development fixtures and validation scripts are excluded from the VSIX.

## Project Structure

- [syntaxes/llvm.tmLanguage.json](syntaxes/llvm.tmLanguage.json): LLVM TextMate grammar
- [language-configuration.json](language-configuration.json): comments, brackets, and auto-closing pairs
- [scripts/validate-grammar.js](scripts/validate-grammar.js): grammar regression checks
- [lib/example.ll](lib/example.ll): compact language-form fixture

## Contributing

Keep grammar rules narrowly scoped and ordered from constructs that must win lexical precedence, such as comments and strings, to more general token classes. Run `npm test` before submitting a change and include a fixture example for newly supported LLVM syntax.

Please report unsupported valid IR with the LLVM version and a minimal `.ll` example.

