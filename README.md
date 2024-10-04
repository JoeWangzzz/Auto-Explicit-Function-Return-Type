# TypeScript Return Type Inference Plugin

This VSCode plugin automatically infers and adds return types for TypeScript functions that do not have an explicitly declared return type. The plugin is especially helpful for developers working with the `typescript-eslint` rule `@typescript-eslint/explicit-function-return-type`, which requires all functions to have a defined return type.

## Features

- Automatically infers and adds return types to functions without them.
- Supports different function types: `FunctionDeclaration`, `FunctionExpression`, `ArrowFunction`, `MethodDeclaration`, and `GetAccessorDeclaration`.
- Can operate on the entire file or just the function under the cursor, based on the configuration.
- Helps users resolve linting errors and warnings related to the `@typescript-eslint/explicit-function-return-type` rule.

## Installation

To install the plugin, follow these steps:

1. Open VSCode and navigate to the Extensions tab.
2. Search for "TypeScript Return Type Inference Plugin."
3. Click "Install."

Alternatively, you can install it from the command line:

```bash
code --install-extension typescript-return-type-inference-plugin
```

## Usage

Once the plugin is installed:

1. Open any TypeScript file in your workspace.
2. When you encounter a function without an explicit return type, trigger the plugin:
   - **File Mode:** If the scope is set to 'file,' the plugin will automatically add return types to all functions in the file that lack them.
   - **Function Mode:** If the scope is set to 'func,' it will add the return type only to the function where the cursor is currently positioned.
   
You can configure the scope in your workspace settings or use the default behavior.

The default shortcut is ctrl+alt+i, you can change it through `typescript-return-type-inference-plugin.inferFuncReturnTypes`

## Configuration Options

- **scope**: Defines whether the plugin should work on the entire file or just the function under the cursor. 
  - Values: `'file' | 'func'`
  
- **supportedFunctionTypes**: Specifies which function types the plugin should infer return types for.
  - Values: `'isFunctionDeclaration' | 'isFunctionExpression' | 'ArrowFunction' | 'isMethodDeclaration' | 'isGetAccessorDeclaration'`
  
## Example

Consider the following TypeScript code without explicit return types:

```typescript
function add(a: number, b: number) {
  return a + b;
}

const subtract = (a: number, b: number) => a - b;
```

After running the plugin, the return types will be automatically added:
```typescript
function add(a: number, b: number): number {
  return a + b;
}

const subtract = (a: number, b: number): number => a - b;
```

## Resolving `typescript-eslint` Warnings and Errors

This plugin is designed to assist developers who encounter warnings and errors from `@typescript-eslint/explicit-function-return-type`. When applied, it automatically fixes these issues by inferring and adding the correct return types to your functions.

## Contributing

If you'd like to contribute to this plugin, feel free to report issues.

GitHub Repository: https://github.com/JoeWangzzz/TypeScript-Return-Type-Inference-Plugin

## Discussion

The decision not to support a fixer for `explicit-function-return-type` in `typescript-eslint` has been discussed in the community. https://github.com/typescript-eslint/typescript-eslint/issues/59

Nonetheless, I believe that providing an automatic fixer for `explicit-function-return-type` is necessary. This plugin fills this gap, helping developers enhance their productivity, reduce the manual effort of adding return types, and decrease linting warnings or errors due to missing return types, thus improving type safety in TypeScript code.

## License

MIT License