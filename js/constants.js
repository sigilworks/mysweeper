
var Constants = {

	Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

	Unicode: { FLAG: '\u2691' /*'⚑'*/ /*'&#9873;'*/, MINE: '\u2699' /*'⚙'*/ /*'&#9881;'*/ },

	DefaultConfig: { dimensions: 9, mines: 1, board: "#board", debug_mode: true /*false*/ }

};

module.exports = Constants;