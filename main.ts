import { App, Modal, Plugin, Editor, EditorSelection, MarkdownFileInfo } from 'obsidian';

export default class SyncedLinesPlugin extends Plugin {
	private debounceTimer: NodeJS.Timeout | null = null;

	async onload() {
		this.registerOnEditorChange();
	}

	onunload() {
		// ...		
	}

	registerOnEditorChange() {
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor, info) => this.onEditorChange(editor, info)));
	}

	onEditorChange(editor: Editor, _info: MarkdownFileInfo) {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = setTimeout(() => {
			this.handleBlockReferences(editor);
		}, 500);
	}

	handleBlockReferences(editor: Editor) {
		// Get the current selection ranges
		const selectionLines = editor.listSelections();

		// Iterate over all selections (in case of multiple cursors or selections)
		selectionLines.forEach((selection: EditorSelection) => {
			const { startLine, endLine } = this.getSelectionStartEndLine(selection);
			for (let line = startLine; line <= endLine; line++) {
				const lineContent = editor.getLine(line);
				console.log(`Changed line ${line}: ${lineContent}`);
			}
		});
	}

	getSelectionStartEndLine(selection: EditorSelection) {
		const startLine = selection.anchor.line;
		const endLine = selection.head.line;

		return {
			// Handle cases where the selection might be reversed
			startLine: Math.min(startLine, endLine),
			endLine: Math.max(startLine, endLine),
		};
	}
}

class SyncedLineUpdater {
	isSyncedLine() {

	}
}