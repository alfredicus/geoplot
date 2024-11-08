import { Action } from './Action'

export class ActionManager {
    private undoStack: Action[] = [];
    private redoStack: Action[] = [];
    private maxStackSize: number;

    constructor(maxStackSize: number = 10) {
        this.maxStackSize = maxStackSize;
    }

    // Execute a new action and put it in the stack
    public do(action: Action): void {
        // Execute the action
        action.do();

        // Add to undo stack
        this.undoStack.push(action);

        // Clear redo stack as new action invalidates previous redos
        this.redoStack = [];

        // Maintain stack size limit
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift(); // Remove oldest action
        }
    }

    // Undo the last action
    public undo(): void {
        const action = this.undoStack.pop();
        if (action) {
            action.undo();
            this.redoStack.push(action);

            // Maintain stack size limit
            if (this.redoStack.length > this.maxStackSize) {
                this.redoStack.shift();
            }
        }
    }

    // Redo the last undone action
    public redo(): void {
        const action = this.redoStack.pop();
        if (action) {
            action.do();
            this.undoStack.push(action);

            // Maintain stack size limit
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }
        }
    }

    // Check if undo is available
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    // Check if redo is available
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    // Clear all stacks
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    // Get current stack sizes
    public getStackSizes(): { undoSize: number; redoSize: number } {
        return {
            undoSize: this.undoStack.length,
            redoSize: this.redoStack.length
        };
    }

    // Get list of action labels that can be undone (most recent first)
    public getUndoableActions(): string[] {
        return this.undoStack.map(action => action.label).reverse();
    }

    // Get list of action labels that can be redone (most recent first)
    public getRedoableActions(): string[] {
        return this.redoStack.map(action => action.label).reverse();
    }

}
