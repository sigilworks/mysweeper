
var Constants = {
	Version: 'beta1',

	DefaultConfig: { dimensions: 9, mines: 1, board: "#board", debug_mode: true /*false*/ },

	Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

	Flags: 	{ OPEN: 'F_OPEN', MINED: 'F_MINED', FLAGGED: 'F_FLAGGED', INDEXED: 'F_INDEXED' },

	Unicode: { FLAG: 'x', MINE: 'Ä' },

	Modes: { PRESET: "P", CUSTOM: "C" },

    PresetLevels: { BEGINNER: "B", INTERMEDIATE: "I", EXPERT: "E" },

    PresetSetups: {
        BEGINNER: 		{ dimensions:  9, mines:  9 },
        INTERMEDIATE: 	{ dimensions: 12, mines: 21 },
        EXPERT: 		{ dimensions: 15, mines: 67 }
    },

	MessageOverlay: '#flash'
};

module.exports = Constants;