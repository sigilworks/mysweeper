"use strict;"

var ConsoleRenderer = {

    COL_SPACING: '   ',
    MINED_SQUARE: '*',
    BLANK_SQUARE: '.',
    RENDERED_MAP: '%o',
    DEFAULT_TRANSFORMER: function(row){ return row; },

    to: function(log) { this.$log = log; return this; },
    withValues: function(values) {
        this.values = validate(values);
        return this;
    },
    viewGame: function() {
        var ctx = this,
            transformer = function(row) {
                return row.map(function(sq) {
                    return (sq.isMined())
                        ? this.MINED_SQUARE : sq.getDanger() === 0
                            ? this.BLANK_SQUARE : sq.getDanger(); }, ctx)
            };
        this.$log([ makeTitle("gameboard"), this.RENDERED_MAP ]
            .join('\n'),
            getRenderedMap(transformer, this.values));
    },
    viewMines: function() {
        this.$log([ makeTitle("mine placements"), this.RENDERED_MAP ]
            .join('\n'),
            getRenderedMap(this.DEFAULT_TRANSFORMER, this.values));
    }
};

function makeTitle(str) { return str.split('').join(' ').toUpperCase(); }
function displayRowNum(num) { return "       [" + num + "]\n" }
function toSymbols(values, fn) {
    return values.reduce(function(str, row, idx) {
        return str += fn(row).join(ConsoleRenderer.COL_SPACING).toLowerCase() + displayRowNum(idx)
    }.bind(this), '\n');
}
function validate(values) {
    if (Array.isArray(values) && values.length)
        return values;
    else throw "No values present.";
}
function getRenderedMap(transformer, values) {
    var vals = validate(values);
    return toSymbols(vals, transformer);
}

module.exports = ConsoleRenderer;