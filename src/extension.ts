// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ts from 'typescript';

enum Scope {
	FUNC = 'func',
	FILE = 'file'
}

enum Support {
	FunctionDeclaration = "isFunctionDeclaration",
	FunctionExpression = "isFunctionExpression",
	ArrowFunction = "isArrowFunction",
	MethodDeclaration = "isMethodDeclaration",
	GetAccessorDeclaration = 'isGetAccessorDeclaration'
}

async function loadLibSources() {
	const compilerApiPromise = await import("typescript");;
	const api = { ...await compilerApiPromise as any };

	const cachedSourceFiles: any = [];
	const libFiles = require("./typescript/index.js");

	for (const sourceFile of getLibSourceFiles()) {
		cachedSourceFiles[sourceFile.fileName] = sourceFile;
	}

	return cachedSourceFiles;

	function getLibSourceFiles() {
		return Object.keys(libFiles)
			.map((key) => (libFiles as any)[key] as { fileName: string; text: string })
			.map((libFile) =>
				api.createSourceFile(libFile.fileName, libFile.text, api.ScriptTarget.Latest, false, api.ScriptKind.TS)
			);
	}
}


async function buildHost(options: ts.CompilerOptions) {
	const host = ts.createCompilerHost(options);
	const libSource = await loadLibSources();
	const originalGetSourceFile = host.getSourceFile;
	host.getDefaultLibLocation = () => {
		return "/";
	};
	host.getSourceFile = (fileName, languageVersion, onError) => {
		console.log("load: ", fileName);
		if (libSource[fileName]) {
			return libSource[fileName];
		}
		return originalGetSourceFile.call(host, fileName, languageVersion, onError);
	};
	return host;
}




function getVsCodeEditByNodeToReturnType(node: ts.Node, checker: ts.TypeChecker, document: vscode.TextDocument, supports: Support[], otherPredicte: (node: ts.Node) => boolean): vscode.TextEdit | null {
	if (supports.some(support => ts[support](node) && !node.type && node.body) && otherPredicte(node)) {
		const declaration = node as ts.SignatureDeclaration;
		const signature = checker.getSignatureFromDeclaration(declaration);
		if (!signature) {
			return null;
		}
		const type = checker.getReturnTypeOfSignature(signature);
		if (!type) {
			return null;
		}
		const typeString = checker.typeToString(type);
		console.log('return infer ', 'getVsCodeEditByNodeToReturnType ', typeString, signature);

		const closingParen = declaration.parameters.end + 1;
		const position = document.positionAt(closingParen);
		const edit = vscode.TextEdit.insert(position, `: ${typeString}`);
		return edit;
	}
	return null;
}


function inferReturnTypes(sourceFile: ts.SourceFile, checker: ts.TypeChecker, document: vscode.TextDocument, supports: Support[], otherPredicte: (node: ts.Node) => boolean): vscode.TextEdit[] {
	const edits: vscode.TextEdit[] = [];
	const visitNode = (node: ts.Node) => {
		const edit = getVsCodeEditByNodeToReturnType(node, checker, document, supports, otherPredicte);
		edit && edits.push(edit);
		ts.forEachChild(node, visitNode);
	};
	visitNode(sourceFile);
	return edits;
}

async function applyEdits(document: vscode.TextDocument, edits: vscode.TextEdit[]) {
	const workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.set(document.uri, edits);
	await vscode.workspace.applyEdit(workspaceEdit);
	await document.save();
}

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('typescript-return-type-inference-plugin.inferFuncReturnTypes', async () => {
		const editor = vscode.window.activeTextEditor;
		const configuration = vscode.workspace.getConfiguration('ReturnTypeInference');
		const scope = configuration.get<Scope>('scope', Scope.FUNC);
		const supports = Array.from(new Set(configuration.get<Support[]>('supportedFunctionTypes', [])));

		if (!editor) {
			return;
		}

		if (!supports?.length) {
			vscode.window.showWarningMessage('SupportedFunctionTypes is empty');
			return;
		}

		const options = {
			target: ts.ScriptTarget.ES2022,
			lib: ["lib.es2022.d.ts"],
		};
		const document = editor.document;
		const host = await buildHost(options);
		const program = ts.createProgram([document.fileName], options, host);
		console.log('return infer', program.getCompilerOptions().lib);
		const checker = program.getTypeChecker();
		const sourceFile = program.getSourceFile(document.fileName);

		const sourceFiles = program.getSourceFiles();
		sourceFiles.forEach(sourceFile => {
			console.log("Source File:", sourceFile.fileName);
		});

		const position = editor.selection.active;


		if (!sourceFile) {
			return;
		}

		if (scope === Scope.FUNC && !editor.selection.active) {
			return;
		}

		const predicte = {
			[Scope.FUNC]: (node: ts.Node) => {
				const start = document.positionAt(node.getStart());
				const end = document.positionAt(node.getEnd());
				return position.isAfterOrEqual(start) && position.isBeforeOrEqual(end);
			},
			[Scope.FILE]: (node: ts.Node) => true,
		};


		const edits = inferReturnTypes(sourceFile, checker, document, supports, predicte[scope]);
		if (edits.length) {
			applyEdits(document, edits);
		}
	});

	const configChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('ReturnTypeInference.supportedFunctionTypes')) {
			const configuration = vscode.workspace.getConfiguration('ReturnTypeInference');
			const oSupports = configuration.get<Support[]>('supportedFunctionTypes', []);
			const distinctSupports = Array.from(new Set(oSupports));
			if (distinctSupports.length !== oSupports.length) {
				vscode.window.showWarningMessage('You set repeat SupportedFunctionTypes.Please check');
			}
		}
	});


	context.subscriptions.push(disposable);
	context.subscriptions.push(configChangeDisposable);
}


