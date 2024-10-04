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

		const document = editor.document;
		const program = ts.createProgram([document.fileName], {});
		const checker = program.getTypeChecker();
		const sourceFile = program.getSourceFile(document.fileName);
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
			if(distinctSupports.length !== oSupports.length){
				vscode.window.showWarningMessage('You set repeat SupportedFunctionTypes.Please check');
			}
		}
	});


	context.subscriptions.push(disposable);
	context.subscriptions.push(configChangeDisposable);
}


