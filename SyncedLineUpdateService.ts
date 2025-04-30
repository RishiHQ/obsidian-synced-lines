
import { App, Editor, EditorSelection, MarkdownFileInfo, MarkdownView } from 'obsidian';

export default class SyncedLineUpdateService {
  private debounceTimer: NodeJS.Timeout | null = null;
  public isUpdatingOpenFiles: boolean;
  public app: App;

  constructor(app: App) {
    this.app = app;
    this.isUpdatingOpenFiles = false;

    // Bind methods to preserve `this` context
    this.updateSyncedLinesOnSyncedLineChange = this.updateSyncedLinesOnSyncedLineChange.bind(this);
    this.updateSyncedLines = this.updateSyncedLines.bind(this);
  }

  updateSyncedLinesOnSyncedLineChange(editor: Editor, _info: MarkdownFileInfo) {
    if (this.isUpdatingOpenFiles) {
      return;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.updateSyncedLines(editor);
    }, 500);
  }

  updateSyncedLines(editor: Editor) {
    const selectionLines = editor.listSelections();
    selectionLines.forEach((selection: EditorSelection) => {
      this.updateSyncedLinesInSelection(editor, selection)
    });
  }

  updateSyncedLinesInSelection(editor: Editor, selection: EditorSelection) {
    const { startLine, endLine } = this.getSelectionStartEndLine(selection);
    for (let line = startLine; line <= endLine; line++) {
      const lineContent = editor.getLine(line);
      if (SyncedLine.isSyncedLine(lineContent)) {
        const syncedLine = new SyncedLine(lineContent, this);
        syncedLine.updateReferences();
      }
    }
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

class SyncedLine {
  private line: string;
  private blockId: string;
  private updateService: SyncedLineUpdateService;

  constructor(line: string, updateService: SyncedLineUpdateService) {
    this.line = line;
    this.blockId = this.extractBlockId();
    this.updateService = updateService;
  }

  static isSyncedLine(line: string): boolean {
    // Check if the line contains a block reference (e.g., ^1234)
    return /\^\d+$/.test(line);
  }

  extractBlockId(): string {
    const regex = /\^(\d+)$/; // Matches ^<blockID> at the end of the line
    const match = this.line.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error(`No block ID found in line: ${this.line}`);
  }

  updateReferences() {
    this.updateReferencesInOpenFiles();
    this.updateReferencesInAllFiles();
  }

  updateReferencesInOpenFiles() {
    const openLeaves = this.updateService.app.workspace.getLeavesOfType('markdown');
    openLeaves.forEach(leaf => {
      const view = leaf.view as MarkdownView;
      const editor = view.editor;
      const content = editor.getValue();
      const lines = content.split('\n');
      const cursor = editor.getCursor();

      // Check if any line contains the block reference
      let updated = false;
      const updatedLines = lines.map(line => {
        if (this.containsBlockId(line)) {
          updated = true;
          // Update the line with the new content
          return this.line;
        }
        return line;
      });

      // If the file was updated, set the new content in the editor
      if (updated) {
        this.updateService.isUpdatingOpenFiles = true;
        editor.setValue(updatedLines.join('\n'));
        editor.setCursor(cursor);
        this.updateService.isUpdatingOpenFiles = false;
      }
    });
  }

  setValidCursor(editor: Editor, updatedLines: string[], cursor: { line: number, ch: number }) {
    const maxLine = updatedLines.length - 1;
    const validCursor = {
      line: Math.min(cursor.line, maxLine),
      ch: Math.min(cursor.ch, updatedLines[maxLine]?.length || 0),
    };
    editor.setCursor(validCursor);
  }

  // TODO: skip writing files that are already open
  async updateReferencesInAllFiles() {
    const app = this.updateService.app;
    const files = app.vault.getFiles();

    for (const file of files) {
      const content = await app.vault.read(file);
      const lines = content.split('\n');

      let updated = false;
      const updatedLines = lines.map(line => {
        if (this.containsBlockId(line)) {
          updated = true;
        }
        return this.line;
      });

      if (updated) {
        await app.vault.modify(file, updatedLines.join('\n'));
        console.log(`Updated block reference ^${this.blockId} in file: ${file.path}`);
      }
    }
  }

  containsBlockId(otherLine: string): boolean {
    const regex = new RegExp(`\\^${this.blockId}$`);
    return regex.test(otherLine);
  }
}
