import { Plugin } from 'obsidian';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import SyncedLineDecoratorPlugin from './SyncedLineDecoratorPlugin';
import SyncedLineUpdateService from './SyncedLineUpdateService';

export default class SyncedLinesPlugin extends Plugin {
	async onload() {
		this.registerEditorExtension(this.getSyncedLineDecorator());
		this.registerEvent(this.getSyncedLineUpdateHandler());
	}

	getSyncedLineDecorator() {
		return ViewPlugin.fromClass(SyncedLineDecoratorPlugin, {
			decorations: (value: SyncedLineDecoratorPlugin) => value.decorations,
			provide: plugin => EditorView.atomicRanges.of(view => {
				return view.plugin(plugin)?.decorations || Decoration.none
			})
		});
	}

	getSyncedLineUpdateHandler() {
		const syncedLineUpdateService = new SyncedLineUpdateService(this.app);
		return this.app.workspace.on(
			'editor-change',
			syncedLineUpdateService.updateSyncedLinesOnSyncedLineChange,
		)
	}
}
