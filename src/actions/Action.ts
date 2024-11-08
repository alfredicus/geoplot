// Interface for actions that can be undone/redone
export interface Action {
    do(): void;
    undo(): void;
    label?: string;  // Optional label for debugging/logging/combobox
}
