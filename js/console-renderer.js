"use strict;"

var ConsoleRenderer = {

    COL_SPACING: '   ',
    MINED_SQUARE: '*',
    BLANK_SQUARE: '.',
    RENDERED_MAP: '%o',
    DEFAULT_TRANSFORMER: function(row){ return row; },

    _makeTitle: function(str) { return str.split('').join(' ').toUpperCase(); },
    _displayRowNum: function(num) { return "       [" + num + "]\n" },
    _toSymbols: function(values, fn) {
        var _this = this;
        return values.reduce(function(str, row, idx) {
            return str += fn(row).join(_this.COL_SPACING).toLowerCase() + _this._displayRowNum(idx)
        }, '\n');
    },
    _validate: function(values) {
        if (Array.isArray(values) && values.length)
            return values;
        else throw "No values present.";
    },
    _getRenderedMap: function(transformer) {
        var vals = this._validate(this.values);
        return this._toSymbols(vals, transformer);
    },

    to: function(log) { this.$log = log; return this; },
    withValues: function(values) {
        this.values = this._validate(values);
        return this;
    },

    viewGame: function() {
        var _this = this,
            transformer = function(row) {
                return row.map(function(sq) {
                    return (sq.isMined())
                        ? _this.MINED_SQUARE : sq.getDanger() === 0
                            ? _this.BLANK_SQUARE : sq.getDanger(); })
            };
        this.$log([ this._makeTitle("gameboard"), this.RENDERED_MAP ]
            .join('\n'),
            this._getRenderedMap(transformer));
    },
    viewMines: function() {
        this.$log([ this._makeTitle("mine placements"), this.RENDERED_MAP ]
            .join('\n'),
            this._getRenderedMap(this.DEFAULT_TRANSFORMER));
    }
};

module.exports = ConsoleRenderer;