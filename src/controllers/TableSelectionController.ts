import { TableView } from "../views";

// Types for selection system
/**
 * @category Table
 */
export interface SelectionState {
    selectedRows: Set<number>;
    lastSelectedRow: number | null;
    dragStartRow: number | null;
    isDragging: boolean;
}

/**
 * @category Table
 */
export interface SelectionOptions {
    multiSelect?: boolean;
    onSelectionChange?: (selectedRows: number[]) => void;
}

// Base controller interface
/**
 * @category Table
 */
export interface TableController {
    initialize(): void;
    destroy(): void;
}

/**
Benefits of this approach:

Separation of Concerns:
-----------------------
Selection logic is completely separated from view logic
TableView only needs to provide minimal selection-related methods
Easier to test and maintain each component


Reusability:
-----------------------
Selection controller can be used with other table implementations
Can be extended for different selection behaviors
Easy to add new selection features without modifying the view


Configurability:
-----------------------
Selection behavior can be configured independently
Easy to disable/enable features like multi-select
Can add different selection modes


Extensibility:
-----------------------
Can create different controller types for different behaviors

@example
```ts
// Usage example
const tableView = new TableView('container', data, {
    width: '1000px',
    height: '500px'
});

// Create and initialize selection controller
const selectionController = new TableSelectionController(tableView, {
    multiSelect: true,
    onSelectionChange: (selectedRows) => {
        console.log('Selected rows:', selectedRows);
    }
});

selectionController.initialize();

// Example of using the selection API
document.getElementById('selectAllButton')?.addEventListener('click', () => {
    selectionController.selectAll();
});

document.getElementById('clearSelectionButton')?.addEventListener('click', () => {
    selectionController.clearSelection();
});

// Clean up when needed
window.addEventListener('unload', () => {
    selectionController.destroy();
}
```
* @category Table
*/
export class TableSelectionController implements TableController {
    private state: SelectionState;
    private view: TableView;
    private options: SelectionOptions;
    private boundHandlers: {
        handleMouseDown: (e: MouseEvent) => void;
        handleMouseMove: (e: MouseEvent) => void;
        handleMouseUp: (e: MouseEvent) => void;
        handleKeyDown: (e: KeyboardEvent) => void;
    };

    constructor(view: TableView, options: SelectionOptions = {}) {
        this.view = view;
        this.options = {
            multiSelect: true,
            ...options
        };

        this.state = {
            selectedRows: new Set<number>(),
            lastSelectedRow: null,
            dragStartRow: null,
            isDragging: false
        };

        // Bind event handlers
        this.boundHandlers = {
            handleMouseDown: this.handleMouseDown.bind(this),
            handleMouseMove: this.handleMouseMove.bind(this),
            handleMouseUp: this.handleMouseUp.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this)
        };
    }

    initialize(): void {
        const bodyWrapper = this.view.getBodyWrapper();
        
        bodyWrapper.addEventListener('mousedown', this.boundHandlers.handleMouseDown);
        document.addEventListener('mousemove', this.boundHandlers.handleMouseMove);
        document.addEventListener('mouseup', this.boundHandlers.handleMouseUp);
        document.addEventListener('keydown', this.boundHandlers.handleKeyDown);
        
        // Prevent text selection during drag
        bodyWrapper.addEventListener('selectstart', (e) => {
            if (this.state.isDragging) {
                e.preventDefault();
            }
        });
    }

    destroy(): void {
        const bodyWrapper = this.view.getBodyWrapper();
        
        bodyWrapper.removeEventListener('mousedown', this.boundHandlers.handleMouseDown);
        document.removeEventListener('mousemove', this.boundHandlers.handleMouseMove);
        document.removeEventListener('mouseup', this.boundHandlers.handleMouseUp);
        document.removeEventListener('keydown', this.boundHandlers.handleKeyDown);
        
        this.clearSelection();
    }

    private handleMouseDown(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        if (target.classList.contains('excel-row-selector')) {
            const rowIndex = parseInt(target.dataset.rowIndex!);
            this.startSelection(rowIndex, e.ctrlKey || e.metaKey, e.shiftKey);
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        if (this.state.isDragging && this.state.dragStartRow !== null) {
            const rowElement = this.getRowElementFromPoint(e.clientY);
            if (rowElement) {
                const currentRow = parseInt(rowElement.dataset.rowIndex!);
                this.updateSelection(currentRow, e.ctrlKey || e.metaKey, e.shiftKey);
            }
        }
    }

    private handleMouseUp(): void {
        if (this.state.isDragging) {
            this.state.isDragging = false;
            this.state.dragStartRow = null;
            this.notifySelectionChange();
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // Ctrl/Cmd + A to select all
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAll();
        }
    }

    private startSelection(rowIndex: number, isCtrlKey: boolean, isShiftKey: boolean): void {
        this.state.isDragging = true;
        this.state.dragStartRow = rowIndex;
        this.updateSelection(rowIndex, isCtrlKey, isShiftKey);
    }

    private updateSelection(currentRow: number, isCtrlKey: boolean, isShiftKey: boolean): void {
        if (!this.options.multiSelect) {
            this.setSingleSelection(currentRow);
            return;
        }

        let newSelection = new Set<number>();

        if (isShiftKey && this.state.lastSelectedRow !== null) {
            // Range selection
            const start = Math.min(this.state.lastSelectedRow, currentRow);
            const end = Math.max(this.state.lastSelectedRow, currentRow);
            for (let i = start; i <= end; i++) {
                newSelection.add(i);
            }
        } else if (isCtrlKey) {
            // Toggle selection
            newSelection = new Set(this.state.selectedRows);
            if (newSelection.has(currentRow)) {
                newSelection.delete(currentRow);
            } else {
                newSelection.add(currentRow);
            }
        } else {
            // Single selection
            newSelection.add(currentRow);
        }

        this.state.selectedRows = newSelection;
        this.state.lastSelectedRow = currentRow;
        this.updateSelectionVisuals();
    }

    private setSingleSelection(rowIndex: number): void {
        this.state.selectedRows = new Set([rowIndex]);
        this.state.lastSelectedRow = rowIndex;
        this.updateSelectionVisuals();
    }

    private getRowElementFromPoint(y: number): HTMLElement | null {
        const container = this.view.getBodyWrapper();
        const elements = document.elementsFromPoint(container.getBoundingClientRect().left, y);
        return elements.find(el => el.classList.contains('excel-row-selector')) as HTMLElement || null;
        return null
    }

    private updateSelectionVisuals(): void {
        this.view.updateRowSelection(Array.from(this.state.selectedRows));
        this.notifySelectionChange();
    }

    private notifySelectionChange(): void {
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.state.selectedRows));
        }
    }

    // Public API
    selectAll(): void {
        if (!this.options.multiSelect) return;
        
        const rowCount = this.view.getRowCount();
        this.state.selectedRows = new Set(Array.from({ length: rowCount }, (_, i) => i));
        this.updateSelectionVisuals();
    }

    clearSelection(): void {
        this.state.selectedRows.clear();
        this.state.lastSelectedRow = null;
        this.updateSelectionVisuals();
    }

    getSelectedRows(): number[] {
        return Array.from(this.state.selectedRows).sort((a, b) => a - b);
    }
}

// Modified TableView class (partial)
// ----------------------------------
/*
class TableView {
    // ... other existing properties ...

    private bodyWrapper: HTMLElement;

    constructor(containerId: string, data: any[], config: TableViewConfig = {}) {
        // ... existing constructor code ...
        this.bodyWrapper = document.createElement('div');
        this.bodyWrapper.className = 'excel-body-wrapper';
    }

    // New methods to support the selection controller
    getBodyWrapper(): HTMLElement {
        return this.bodyWrapper;
    }

    getRowCount(): number {
        return this.data.length;
    }

    updateRowSelection(selectedRows: number[]): void {
        const rowSelectors = this.table.querySelectorAll('.excel-row-selector');
        rowSelectors.forEach((selector: Element) => {
            const rowIndex = parseInt((selector as HTMLElement).dataset.rowIndex!);
            selector.classList.toggle('selected', selectedRows.includes(rowIndex));
        });

        const cells = this.table.querySelectorAll('.excel-cell');
        cells.forEach((cell: Element) => {
            const rowIndex = parseInt((cell as HTMLElement).dataset.row!);
            cell.classList.toggle('selected', selectedRows.includes(rowIndex));
        });
    }
}
*/
