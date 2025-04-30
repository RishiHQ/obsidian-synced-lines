import { setIcon, Menu, Notice } from 'obsidian';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

export default class SyncedLineDecoratorPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    // TODO: update to prefix with sync_
    const regex = /\ ^([a-zA-Z0-9]+)$/g; // TODO: make all regexes match this

    for (let { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          if (node.type.name === 'blockid') {
            // TODO: Change this to UUID length
            builder.add(node.from, node.to, Decoration.replace({
              widget: new AsteriskWidget(),
              atomic: true,
            }));
            // console.log(node);
          }
        }
      })
      // const text = view.state.doc.sliceString(from, to);
      // let match;
      // while ((match = regex.exec(text)) !== null) {
      // 	const start = from + match.index;
      // 	const end = start + match[0].length;

      // builder.add(start, end, Decoration.replace());
    }
    return builder.finish();
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() {
  }
}

class AsteriskWidget extends WidgetType {
  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement('span');
    div.className = "obsidian-synced-lines_asterisk";
    div.onclick = ((event) => {
      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle('Copy')
          .setIcon('documents')
          .onClick(() => {
            new Notice('Copied');
          })
      );
      menu.showAtMouseEvent(event);
    });
    setIcon(div, 'asterisk');
    return div;
  }
}
