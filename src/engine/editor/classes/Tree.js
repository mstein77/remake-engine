import { AbstractTreeView } from "../classes";

class ScreenTreeView extends AbstractTreeView {

    getTypes() {
        return [
            {id: 'area', name: 'Areas', match: 'areas'},
            {id: 'pane', name: 'Panes', match: 'panes'},
            {id: null, name: 'Items', match: null}
        ];
    }

    getSortings() {
        return [
            {
                id: 'default', name: 'Default', sortAsc: (a, b) => {
                    if (a.modelIndex === b.modelIndex) return 0;
                    return a.modelIndex < b.modelIndex ? -1 : 1;
                }
            },
            {
                id: 'alpha', name: 'Alpha', sortAsc: (a, b) => {
                    const nameA = a.name.toLowerCase();
                    const nameB = b.name.toLowerCase();
                    if (nameA === nameB) return 0;
                    return nameA < nameB ? -1 : 1;
                }
            }
        ];
    }

    hasGroupDeselect() {
        return false
    }

    getGroups() {
        return [
            {
                id: '', name: 'All', dynamic: true,
                exclusive: true, indirect: true,
                filter: node => true
            },
            {
                id: 'panes', name: 'Panes', dynamic: true,
                exclusive: true, indirect: true,
                filter: node => node.type === 'pane'
            },
            {
                id: 'marked', name: 'Marked', dynamic: true,
                exclusive: true, indirect: false,
                disabled: () => {
                    const {selector} = this.context;
                    return selector.selection.length === 0
                },
                filter: node => {
                    const {selector} = this.context;
                    return selector.selection.includes(node.id)
                }
            }
        ];
    }

    setClickMode(node) {
        node.clickMode = node.type === null ? 0 : 1;
    }

    extractType(model) {
        const type = model.type === 'areas' ? 'area' : model.type;
        return this.types.has(type) ? type : null
    }

    extractId(model, modelIndex) {
        return 'x' + super.extractId(model, modelIndex);
    }
}

export {
    ScreenTreeView
}