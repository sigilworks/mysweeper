var BitFlags = require('./bit-flags');

function Square(row, cell, state, danger) {
    if (!(this instanceof Square))
        return new Square(arguments);
    this.row = row;
    this.cell = cell;
    this.state = state || this.States.CLOSED;
    // TODO: fix this.danger default, get states ftom constants (as flags?).
    this.danger = danger || '-';
}

Square.prototype = {
    // TODO: revisit and remove...
    // Replace the rest of the prototype, delegating to BitFlags.
    States: { CLOSED: 'x', OPENED: '_', FLAGGED: 'f', MINED: '*' },

    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    getState: function() {
        var _this = this;
        return Object.keys(this.States)
                     .filter(function(key) { return _this.States[key] === _this.state; })[0];
    },

    close: function() { this.state = this.States.CLOSED; },
    open: function() { this.state = this.States.OPENED; },
    flag: function() { this.state = this.States.FLAGGED; },
    mine: function() { this.state = this.States.MINED; },

    isClosed: function() { return this.state === this.States.CLOSED; },
    isOpen: function() { return this.state === this.States.OPENED; },
    isFlagged: function() { return this.state === this.States.FLAGGED; },
    isMined: function() { return this.state === this.States.MINED; },

    toJSON: function() { return { row: this.row, cell: this.cell, state: this.state, danger: this.danger } },
    toString: function() { return this.state; }
};

module.exports = Square;

// TODO: replace Square state internals with BitFlags impl...