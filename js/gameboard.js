var DangerCalculator = require('./danger-calculator'),
    Square = require('./square'),
    $C = require('./constants');

function Gameboard(options) {
    // the map, serving as the internal represenation of the gameboard
    this.board = {
        _table: [],
        get: function(row) { return this._table[row]; },
        set: function(row, val) { (this._table[row] || (this._table[row] = [])).push(val); },
        forEach: function(fn) { return [].forEach.call(this.values(), fn); },
        values: function() {
            var _this = this;
            return Object.keys(this._table)
                         .map(function(row) { return _this._table[row]; })
                         .reduce(function(acc, item) { return acc.concat(item); }, []);
        },
        clear: function() { this._table = {}; },
        size: function() { return Object.keys(this._table).length; }
    };

    // the dimensions of the board when rendered
    this.dimensions = +options.dimensions || $C.DEFAULT_GAME_OPTIONS.dimensions;
    // the number of mines the user has selected
    this.mines = +options.mines || $C.DEFAULT_GAME_OPTIONS.mines;
    // the DOM element of the table serving as the board
    this.$el = $(options.board || $C.DEFAULT_GAME_OPTIONS.board);

    // keep track of user clicks towards their win
    this.userMoves = 0;

    // the object that calculates the number of surrounding mines at any square
    this.dangerCalc = new DangerCalculator(this);
    // create the board in memory and assign values to the squares
    this._loadBoard();
    // render the HTML to match the board in memory
    this._renderGrid();
}

Gameboard.prototype = {

    // "PRIVATE" METHODS:
    _loadBoard: function() {
        // prefill squares to required dimensions...
        var _this = this,
            dimensions = this.dimensions,
            mines = this.mines,
            fillRow = function(row, squares) {
                var ret = [];
                for (var i=0; i < squares; ++i)
                    ret[i] = new Square(row, i);
                return ret;
            };

        for (var i=0; i < dimensions; ++i)
            this.board.set(i, fillRow(i, dimensions));

        // determine random positions of mined squares...
        this._determineMineLocations(dimensions, mines);

        // pre-calculate the danger index of each non-mined square...
        this._precalcDangerIndices();

        console.log("G A M E B O A R D\n%o", this.toConsole());
        console.log("M I N E  P L A C E M E N T S\n%o", this.toConsole(true));
    },
    _renderGrid: function() {
        // layout the HTML <table> rows...
        this._createHTMLGrid(this.dimensions);

        // setup event listeners to listen for user clicks
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
        this.$el.on({
            click: this._handleClick.bind(this),
            contextmenu: this._handleRightClick.bind(this)
        }, 'td, td > span');
    },
    _removeEventListeners: function() {
        this.$el.off('click, contextmenu', 'td, td > span');
    },
    _createHTMLGrid: function(dimensions) {
        var grid = '';
        for (var i=0; i < dimensions; ++i) {
            grid += "<tr id='row" + i + "'>"
                 +  [].join.call({ length: dimensions + 1 }, "<td></td>")
                 +  "</tr>";
        }
        this.$el.append(grid);
    },
    _handleClick: function(event) {
        var $target = $(event.target),
            $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
            square = $cell.data('square');

        // TODO: also handle first-click-can't-be-mine (if we're following that rule)
        // here, if userMoves === 0...
        this.userMoves++;

        if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
            square.open();
            $cell.removeClass('closed').addClass('open');
            this._recursiveReveal(square);

        } else if (square.isFlagged())
            console.log("handle flagged situation...")
            // TODO: remove this?

        else if (square.isMined())
            return this._gameOver();

        if ($('.closed').length === 0)
            this._gameWin();
    },
    _handleRightClick: function(event) {
        var $target = $(event.target),
            $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
            square = $cell.data('square');

        this.userMoves++;
        // TODO: fix right-clicks
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
    _gameWin: function () {
        this._removeEventListeners();
        this.$el.addClass('game-win');
        // TODO: replace with real message
        console.log("G A M E  W I N !!!");
        console.log("User moves: %o", this.userMoves)
    },
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
        // TODO: replace with real message
        console.log('G A M E  O V E R !!!');
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            $dangerSpan = $('<span />', { 'class': 'danger', html: (!square.isMined()) ? (square.isFlagged()) ? '&#9873;' : square.getDanger() : '&#9881;' });
        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass(square.getState().toLowerCase());
        // insert a span with the danger index
        $cell.find('.danger')
             .remove()
             .end()
             .append($dangerSpan);
        // add some data-* attributes to pass along on click events
        $cell.data('row', square.getRow());
        $cell.data('cell', square.getCell());
        $cell.data('square', square);
    },

    // "PUBLIC" METHODS
    render: function() {
        this.getSquares().forEach(this._renderSquare.bind(this));
        // return `this`, so this method can be chained to its initialization call
        return this;
    },
    getGridCell: function(square) {
        return this.$el
                .find('#row' + square.getRow())
                .find('td')
                .eq(square.getCell());
    },
    getSquareAt: function(row, cell) {
        var row = this.board.get(row);
        return (row && row[0] && row[0][cell]) ? row[0][cell] : null;
    },
    getSquares: function() {
        return this.board
                .values()
                .reduce(function(acc, val) { return acc.concat(val); }, [])
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

module.exports = Gameboard;