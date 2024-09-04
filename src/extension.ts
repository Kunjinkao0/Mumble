import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension is now active!');

	const legend = new vscode.SemanticTokensLegend(['variable', 'function', 'parameter'], []);

	const provider = vscode.languages.registerDocumentSemanticTokensProvider(
		{ language: 'typescript', pattern: '**/*.rules.ts' },
		new RuleSemanticTokensProvider(),
		legend,
	);

	const hoverProvider = vscode.languages.registerHoverProvider(
		{ language: 'typescript', pattern: '**/*.rules.ts' },
		{
			provideHover(document, position, token) {
				const range = document.getWordRangeAtPosition(position, /\w+/);
				const word = document.getText(range);

				if (word === 'pickArr') {
					const hoverMessage = new vscode.MarkdownString();
					hoverMessage.appendMarkdown('**pickArr**: A function to select multiple properties from an object and return them as an array.');

					// 使 hover 中的 markdown 安全，不允许执行脚本
					hoverMessage.isTrusted = false;

					return new vscode.Hover(hoverMessage, range);
				}
			}
		}
	);

	context.subscriptions.push(provider);
	context.subscriptions.push(hoverProvider);
}

class RuleSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	async provideDocumentSemanticTokens(document: vscode.TextDocument): Promise<vscode.SemanticTokens> {
		const tokensBuilder = new vscode.SemanticTokensBuilder();
		const text = document.getText();

		// 正则匹配所有 DSL 表达式
		const regex = /\{\{\s*([^{}]+)\s*\}\}/g;
		let match;

		while ((match = regex.exec(text)) !== null) {
			const startPos = document.positionAt(match.index);
			const expression = match[1].trim();

			// 匹配函数调用
			const functionCallMatch = /^(\w+)\(([^)]+)\)$/.exec(expression);
			if (functionCallMatch) {
				// 高亮函数名
				const functionName = functionCallMatch[1];
				const functionNameStart = startPos.translate(0, match[0].indexOf(functionName));
				tokensBuilder.push(functionNameStart.line, functionNameStart.character, functionName.length, 1, 0);

				// 高亮参数
				const args = functionCallMatch[2].split(',').map(arg => arg.trim());
				let currentPosition = match[0].indexOf('(') + 1;
				for (const arg of args) {
					const argIndex = text.indexOf(arg, match.index + currentPosition);
					if (argIndex !== -1) {
						const argStart = document.positionAt(argIndex);
						tokensBuilder.push(argStart.line, argStart.character, arg.length, 2, 0);
						currentPosition += arg.length + 1;  // +1 for the comma or space
					}
				}
			} else {
				// 匹配单一变量
				tokensBuilder.push(startPos.line, startPos.character, match[0].length, 0, 0);
			}

			console.log(`Highlighted expression: ${expression}`);
		}

		return tokensBuilder.build();
	}
}

export function deactivate() {
	console.log('Extension is now deactivated');
}
