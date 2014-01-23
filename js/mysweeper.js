var Multimap = (function() {

    function Multimap(equalsPredicateFn) {
        this._table = {};
        this._size = 0;
        this.equalsFn = equalsPredicateFn || function(a, b) { return a == b; };
    }

    function containsEqual(array, item, equalsFn) { return !!~indexOfEqual(array, item, equalsFn); }

    function removeIfEqual(array, item, equalsFn) {
        var index = indexOfEqual(array, item, equalsFn);
        return (!!~index) ? array.splice(index, 1) : false;
    }

    function indexOfEqual(array, item, equalsFn) {
        for (var i=0, len=array.length >>> 0; i < len; ++i)
            if (equalsFn(array[i], item)) return i;
        return -1;
    }

    function isNumeric(val) { return String(val).replace(/,/g, ''), (val.length !== 0 && !isNaN(+val) && isFinite(+val)); }

    Multimap.prototype = {
        get: function(key) {
            var entry = this._table[key];
            if (!entry) return;
            return !entry.value ? [] : entry.value.slice();
        },
        set: function(key, value) {
            if (isNumeric(key)) key = String(key);
            if (!(key && value)) return false;
            if (!this.containsKey(key))
                return this._table[key] || this._size++, !!(this._table[key] = { key: key, value: [ value ] });
            var array = this._table[key].value;
            return containsEqual(array, value, this.equalsFn) ? false : (array.push(value), true);
        },
        _remove: function(key) {
            var prev = this._table[key];
            if (prev) return delete this._table[key], this._size--, prev.value;
        },
        remove: function(key, value) {
            if (!value) return !!this._remove(key);
            var array = this.get(key);
            return removeIfEqual(array, value, this.equalsFn) ? (array.length || this._remove(key), true) : false;
        },
        forEach: function(callback) {
            for (var name in this._table)
                if (this._table.hasOwnProperty(name))
                    if (false === callback.call(this, this._table[name].key, this._table[name].value, this._table[name]))
                        break;
        },
        keys: function() {
            var _this = this;
            return Object.keys(this._table).map(function(entry) { return _this._table[entry].key; });
        },
        values: function() {
            var _this = this;
            return Object.keys(this._table)
                .map(function(entry) { return _this._table[entry].value; })
                .reduce(function(acc, item) { return acc.concat(item); }, []);
        },
        containsKey: function(key) { return !!this.get(key); },
        clear: function() { this._table = {}; this._size = 0; },
        size: function() { return this._size; },
        isEmpty: function() { return this._size <= 0; }
    };

    return Multimap;
})();

/*  -------------------------------------------------------------------------------------------  */


var Gameboard = (function(){

    function Gameboard(options) {
        this.board = new Multimap;
        this.dimensions = +options.dimensions;
        this.mines = +options.mines;
        this.$el = $(options.board || "#board");
        this.dangerCalc = new DangerCalculator(this);

        this._loadBoard();
        this._renderGrid();
    }

    Gameboard.prototype = {
        _loadBoard: function() {
            // 1. prefill squares to required dimensions...
            var _this = this,
                dimLimit = this.dimensions,
                mines = this.mines,
                fillRow = function(row, squares) {
                    var ret = [];
                    for (var i=0; i < squares; ++i)
                        ret[i] = new Square(row, i); // Square.States.CLOSED);
                    return ret;
                };

            for (var i=0; i < dimLimit; ++i)
                this.board.set(i, fillRow(i, dimLimit));

            // 2. determine random positions of mined squares...
            this._determineMineLocations(dimLimit, mines);

            // 3. pre-calculate the danger index of each non-mined square...
            this._precalcDangerIndices();

            console.log("G A M E B O A R D\n%o", this.toConsole());
            console.log("M I N E  P L A C E M E N T S\n%o", this.toConsole(true));
        },
        _renderGrid: function() {
            // 1. layout the HTML <table> rows...
            this._createHTMLGrid(this.dimensions);

            // 2. setup event listeners to listen for user clicks
            this._setupEventListeners();
        },
        _determineMineLocations: function(dimensions, mines) {
            for (var i=0; i < mines; ++i) {
                var rnd = Math.random() * (Math.pow(dimensions, 2)) | 0,
                    row = ~~(rnd / dimensions),
                    cell = rnd % dimensions,
                    square = this.getSquareAt(row, cell);
                square.mine();
            }
        },
        _precalcDangerIndices: function() {
            var _this = this;
            this.board.values()
                .reduce(function(acc, val) { return acc.concat(val.filter(function(sq) { return !sq.isMined(); })); }, [])
                .forEach(function(safe) { safe.danger = _this.dangerCalc.forSquare(safe.getRow(), safe.getCell()); });
        },
        _setupEventListeners: function() {
            var _this = this;
            this.$el.on('click', 'td, td > span', this._handleClick.bind(this));
            this.$el.on('contextmenu', 'td, td > span', this._handleRightClick.bind(this));
        },
        _createHTMLGrid: function(dimensions) {
            var grid = '';
            for (var i=0; i < dimensions; ++i) {
                grid += "<tr id='row" + i + "'>";
                grid += [].join.call({ length: dimensions + 1 }, "<td></td>");
                grid += "</tr>";
            }
            this.$el.append(grid);
        },
        _handleClick: function(event) {
            var $target = $(event.target),
                $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
                square = $cell.data('square');

            if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
                square.open();
                $cell.removeClass('closed').addClass('open');
                this._recursiveReveal(square);
            } else if (square.isFlagged())
                console.log("handle flagged situation...")
            else if (square.isMined())
                this._gameOver();
        },
        _handleRightClick: function(event) {
            var $target = $(event.target),
                $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
                square = $cell.data('square');

            console.log("$cell: %o, square: %o", $cell, square)
            if (square.isClosed()) {
                square.flag();
                this._renderSquare(square);
                $cell.removeClass('closed').addClass('flagged');
            } else if (square.isFlagged()) {
                square.close();
                $cell.removeClass('flagged').addClass('closed');
            }

            return false;
        },
        _recursiveReveal: function(source) {
            // based on `source` square, walk and recursively reveal connected spaces
            var directions = Object.keys(this.dangerCalc.neighborhood),
                row = source.getRow(),
                cell = source.getCell(),
                _this = this;

            directions.forEach(function(direction) {
                var vert = _this.dangerCalc.neighborhood[direction][0],
                    horiz = _this.dangerCalc.neighborhood[direction][1],
                    neighbor = _this.getSquareAt(row + vert, cell + horiz);

                if (neighbor && !neighbor.isMined() && neighbor.isClosed() && neighbor.getDanger() > 0) {
                    neighbor.open();
                    _this.getGridCell(neighbor).removeClass('closed').addClass('open');
                    _this._recursiveReveal(neighbor);
                }
            });
        },
        getGridCell: function(square) { return this.$el.find('#row' + square.getRow()).find('td').eq(square.getCell()); },
        _renderSquare: function(square) {
            var $cell = this.getGridCell(square),
                $dangerSpan = $('<span />', { 'class': 'danger', html: (!square.isMined()) ? (square.isFlagged()) ? '&#9873;' : square.getDanger() : '&#9881;' });
            // decorate <td> with CSS classes appropriate to square's state
            $cell.removeClass().addClass('square').addClass(square.getState().toLowerCase());
            // insert a span with the danger index
            $cell.find('.danger').remove().end().append($dangerSpan);
            // add some data-* attributes to pass along on click events
            $cell.data('row', square.getRow());
            $cell.data('cell', square.getCell());
            $cell.data('square', square);
        },
        render: function() {
            this.getSquares().forEach(this._renderSquare.bind(this));
            return this;
        },
        getSquareAt: function(row, cell) {
            var row = this.board.get(row);
            return (row && row[0] && row[0][cell]) ? row[0][cell] : null;
        },
        getSquares: function() { return this.board.values().reduce(function(acc, val) { return acc.concat(val); }, []) },
        _gameWin: function () { /*  IMPLEMENT ME!!! */ },
        _gameOver: function() {
            // reset everything
            var _this = this;

            this.getSquares()
                .filter(function(sq) { return sq.isFlagged(); })
                .forEach(function(f) { _this.getGridCell(f).find('.danger').html(f.getDanger()); });
            // open/reveal all squares
            // put up 'Game Over' banner
            this.$el.find('.mined').addClass('revealed');
            this.$el.find('.closed, .flagged').removeClass('closed flagged').addClass('open');
            console.log('G A M E  O V E R !!!');
        },
        toJSON: function() { return this.board.values().join(', '); },
        toConsole: function(withDanger) {
            return this.board.values()
                .reduce(function(str, row, idx) {
                    var symbols = withDanger ? row.map(function(sq) { return sq.getDanger() || ' '; }) : row;
                    return str += symbols.join('   ').toLowerCase() + "       [" + idx + "]\n";
                }, '\n');
        }
    };

    return Gameboard;
})();


var Square = (function(){

    function Square(row, cell, state, danger) {
        if (!(this instanceof Square))
            return new Square(arguments);
        this.row = row;
        this.cell = cell;
        this.state = state || this.States.CLOSED;
        this.danger = danger || '-';
    }

    Square.prototype = {
        States: { CLOSED: 'x', OPENED: '_', FLAGGED: 'f', MINED: '*' },

        getRow: function() { return this.row; },
        getCell: function() { return this.cell; },
        getDanger: function() { return this.danger; },
        getState: function() { var _this = this; return Object.keys(this.States).filter(function(key) { return _this.States[key] === _this.state; })[0]; },

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

    return Square;
})();

function DangerCalculator(gameboard) {
    return {
        board: gameboard,
        neighborhood: {
            // distance in steps from this square:
            //           vert. horz.
            NORTH:      [  1,  0 ],
            NORTHEAST:  [  1,  1 ],
            EAST:       [  0,  1 ],
            SOUTHEAST:  [ -1,  1 ],
            SOUTH:      [ -1,  0 ],
            SOUTHWEST:  [ -1, -1 ],
            WEST:       [  0, -1 ],
            NORTHWEST:  [  1, -1 ]
        },
        forSquare: function(row, cell) {
            if (+row >= 0 && +cell >= 0) {
                var _this = this,
                    totalMines = 0,
                    directions = Object.keys(this.neighborhood);

                directions.forEach(function(direction) {
                    var vert = _this.neighborhood[direction][0],
                        horiz = _this.neighborhood[direction][1],
                        neighbor = _this.board.getSquareAt(row + vert, cell + horiz);

                    if (neighbor && neighbor.isMined()) totalMines++;
                });
                return totalMines || '';
            } else
                return null;
        }
    };
}


/*  -------------------------------------------------------------------------------------------  */

$(function(){

    window.gameboard = new Gameboard({ dimensions: 9, mines: 15 }).render();

});

// REPLACE MULTIMAP WITH THIS:
this.board = {
    _table: [],
    get: function(row) { return this._table[row]; },
    set: function(row, val) { (this._table[row] || (this._table[row] = [])).push(val); },
    forEach: function(fn) { /* or optimize with for-comprehension... */ return [].forEach.call(Object.keys(this._table), fn); },
    values: function() { var _this = this; return Object.keys(this._table).map(function(row) { return _this._table[row]; }); },
    clear: function() { this._table = {}; },
    size: function() { return Object.keys(this._table).length; }
};