const geoplot = require('../../dist/geoplot')

// Example implementations of different Action types
class TextAction {
    constructor(textField, newText, label) {
        this.textField = textField;
        this.oldText = textField.text;
        this.newText = newText;
        this.label = label;
    }

    do() {
        this.textField.text = this.newText;
    }

    undo() {
        this.textField.text = this.oldText;
    }
}

class ColorAction {
    constructor(element, newColor, label) {
        this.element = element;
        this.oldColor = element.color;
        this.newColor = newColor;
        this.label = label;
    }

    do() {
        this.element.color = this.newColor;
    }

    undo() {
        this.element.color = this.oldColor;
    }
}


// Create an action manager
const actionManager = new geoplot.ActionManager();

const textField = { text: "Hello" };
const colorElement = { color: "red" };

actionManager.do(new TextAction(textField, "Hello World", "Text"));
actionManager.do(new ColorAction(colorElement, "blue", "Color"));
actionManager.do(new TextAction(textField, "Hello World!", "Text"));

console.log("undoable actions:", actionManager.getUndoableActions());

actionManager.undo();

console.log("undoable actions:", actionManager.getUndoableActions());
console.log("redoable actions:", actionManager.getRedoableActions());
