// Interface for actions that can be undone/redone
/**
 * @category Action management
 */
export interface Action {
    do(): void;
    undo(): void;
    label?: string;  // Optional label for debugging/logging/combobox
}
