var Multimap = require('./multimap'),
    DangerCalculator = require('./danger-calculator'),
    Square = require('./square'),
    $C = require('./constants');

// wrapper around `$log`, to toggle dev mode debugging
var $log = function $log() { if ($log.debug_mode || false) console.log.apply(console, arguments); }

function Gameboard(options) {
    // the map, serving as the internal represenation of the gameboard
    this.board = new Multimap;
    // the dimensions of the board when rendered
    this.dimensions = +options.dimensions || $C.DefaultConfig.dimensions;
    // the number of mines the user has selected
    this.mines = +options.mines || $C.DefaultConfig.mines;
    // the DOM element of the table serving as the board
    this.$el = $(options.board || $C.DefaultConfig.board);
    // selectively enable debug mode for console visualizations and notifications
    this.debug_mode = options.debug_mode || $C.DefaultConfig.debug_mode;
    $log.debug_mode = this.debug_mode;

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
            populateRow = function(row, squares) {
                var ret = [];
                for (var i=0; i < squares; ++i)
                    ret[i] = new Square(row, i);
                return ret;
            };

        for (var i=0; i < dimensions; ++i)
            this.board.set(i, populateRow(i, dimensions));

        // determine random positions of mined squares...
        this._determineMineLocations(dimensions, mines);

        // pre-calculate the danger index of each non-mined square...
        this._precalcDangerIndices();

        $log("G A M E B O A R D\n%o", this.toConsole());
        $log("M I N E  P L A C E M E N T S\n%o", this.toConsole(true));
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
            .forEach(function(safe) { safe.setDanger(_this.dangerCalc.forSquare(safe.getRow(), safe.getCell())); });
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
        // here, if userMoves === 0... :message => :mulligan?
        this.userMoves++;

        if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
            square.open();
            $cell.removeClass('closed').addClass('open');
            this._recursiveReveal(square);

        } else if (square.isFlagged())
            $log("handle flagged situation...")
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
        $log("$cell: %o, square: %o", $cell, square)
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
        $log("G A M E  W I N !!!");
        $log("User moves: %o", this.userMoves)
    },
    _gameOver: function() {
        // reset everything
        var _this = this;

        this.getSquares()
            .filter(function(sq) { return sq.isFlagged(); })
            .forEach(function(f) { _this.getGridCell(f).find('.danger').html(f.getDanger()); });
        // open/reveal all squares
        // put up 'Game Over' banner
        this.$el.find('.mined').addClass('open');
        this.$el.find('.closed, .flagged').removeClass('closed flagged').addClass('open');
        // TODO: replace with real message
        $log('G A M E  O V E R !!!');
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            $dangerSpan = $('<span />', {
                'class': 'danger',
                html: (!square.isMined()) ? (square.isFlagged()) ? $C.Unicode.FLAG : square.getDanger() : $C.Unicode.MINE });
        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass(square.getState().join(' '));
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