var BitFlags = require('./bit-flags'),
    Symbols = require('./constants').Symbols;

function Square(row, cell, state, danger) {
    if (!(this instanceof Square))
        return new Square(arguments);
    this.row = row;
    this.cell = cell;
    this.state = new BitFlags;
    // TODO: fix this.danger default, get states ftom constants (as flags?).
    this.danger = danger || '-';
}

Square.prototype = {
    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    setDanger: function(idx) { this.danger = idx; this.state.index(); },
    getState: function() {
        var _this = this;
        return Object.keys(Symbols)
                     .filter(function(key) { return _this.state['is' + key.charAt(0) + key.substring(1).toLowerCase()](); })
                     .map(function(key) { return key.toLowerCase(); });
    },

    close: function() { this.state.close(); },
    open: function() { this.state.open(); },
    flag: function() { this.state.flag(); },
    unflag: function() { this.state.unflag(); },
    mine: function() { this.state.mine(); },
    index: function() { this.state.index(); },

    isClosed: function() { return this.state.isClosed(); },
    isOpen: function() { return this.state.isOpen(); },
    isFlagged: function() { return this.state.isFlagged(); },
    isMined: function() { return this.state.isMined(); },
    hasIndex: function() { return this.state.hasIndex(); },

    toJSON: function() { return { row: this.row, cell: this.cell, state: this.state, danger: this.danger } },
    toString: function() { return this.state.isMined()
            ? Symbols.MINED : this.state.isFlagged()
                ? Symbols.FLAGGED : this.state.isOpen()
                    ? Symbols.OPEN : Symbols.CLOSED;
    }
};

module.exports = Square;