;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gameboard = require('./gameboard');

$(function(){

    var mineableSpaces = function(dim) { return Math.pow(dim, 2) - 1; },
        $possibleMines = $("#mine-count").siblings(".advice").find("span");

    // setting initial value
    $possibleMines.html(mineableSpaces($("#dimensions").attr("placeholder")));

    // onkeyup when choosing gameboard dimensions,
    // neighboring input should mirror new value,
    // and total possible mineable squares (dimensions ^ 2 -1)
    // be filled into a <span> below.
    $("#dimensions").on('keyup', function() {
        var $this = $(this);
        // update the 'mirror' <input>...
        $('#dimensions-mirror').val($this.val());
        // ...and the possible number of mines.
        $possibleMines.html(mineableSpaces($this.val()) + '.');
    });

    $("form").on("submit", function() {

        window.gameboard = new Gameboard({
            dimensions: $("#dimensions").val(),
            mines: $("#mine-count").val()
        }).render();

        $("#options-card").hide();
        $("#board-card").fadeIn();

        return false;
    });

});

// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions

},{"./gameboard":6}],2:[function(require,module,exports){


function BitFlags(isOpen, isMined, isFlagged, hasIndex) {
    this._flags = arguments.length > 0
        ? buildState([].slice.call(arguments))
        : this.DEFAULT_STATE;
}

function binToDec(str) { return parseInt(str, 2); }
function decToBin(num) { return num.toString(2); }
function buildState(arr) { return arr.map(function(param) { return String(+param); }).join(''); }
function pad(str, max) {
  max || (max = 4);
  var diff = max - str.length;
  for (var acc=[]; diff > 0; acc[--diff] = '0') {}
  return acc.join('') + str;
}


BitFlags.prototype = {
    F_OPEN:        1,
    F_MINED:       2,
    F_FLAGGED:     4,
    F_INDEX:       8,

    DEFAULT_STATE: '0000',

    _has: function(flag) { return !!(binToDec(this._flags) & flag); },
    _set: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) | flag)); },
    _remove: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) & ~flag)); },

    close: function() { this._remove(this.F_OPEN); },
    open: function() { this._set(this.F_OPEN); },
    flag: function() { this._set(this.F_FLAGGED); },
    unflag: function() { this._remove(this.F_FLAGGED); },
    mine: function() { this._set(this.F_MINED); },
    index: function() { this._set(this.F_INDEX); },

    isClosed: function() { return !this._has(this.F_OPEN); },
    isOpen: function() { return this._has(this.F_OPEN); },
    isFlagged: function() { return this._has(this.F_FLAGGED); },
    isMined: function() { return this._has(this.F_MINED); },
    hasIndex: function() { return this._has(this.F_INDEX); }
};

module.exports = BitFlags;
},{}],3:[function(require,module,exports){

var Constants = {
	SYMBOLS: { CLOSED: 'x', OPENED: '_', FLAGGED: 'f', MINED: '*' },
	DEFAULT_GAME_OPTIONS: { dimensions: 9, mines: 1, board: "#board" }
};

module.exports = Constants;
},{}],4:[function(require,module,exports){

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

module.exports = DangerCalculator;
},{}],5:[function(require,module,exports){

function Emitter() {
    this._events = {};
}

Emitter.prototype = {
    on: function(event, fn) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(fn);
    },
    off: function(event, fn) {
        if (this._events[event] !== false)
            this._events[event].splice(this._events[event].indexOf(fn), 1);
    },
    trigger: function(event /*, data... [varargs] */) {
        if (this._events[event] !== false)
            for (var i=0, len=this._events[event].length; i < len; ++i)
                this._events[event][i].apply(this, [].slice.call(arguments, 1));
    }
};

exports.Emitter = Emitter;
},{}],6:[function(require,module,exports){
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
},{"./constants":3,"./danger-calculator":4,"./square":7}],7:[function(require,module,exports){
var BitFlags = require('./bit-flags');

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
},{"./bit-flags":2}]},{},[1,2,3,5,4,6,7])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZ3MuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zdGFudHMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9kYW5nZXItY2FsY3VsYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2VtaXR0ZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zcXVhcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEdhbWVib2FyZCA9IHJlcXVpcmUoJy4vZ2FtZWJvYXJkJyk7XHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgdmFyIG1pbmVhYmxlU3BhY2VzID0gZnVuY3Rpb24oZGltKSB7IHJldHVybiBNYXRoLnBvdyhkaW0sIDIpIC0gMTsgfSxcclxuICAgICAgICAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIik7XHJcblxyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuXHJcbiAgICAvLyBvbmtleXVwIHdoZW4gY2hvb3NpbmcgZ2FtZWJvYXJkIGRpbWVuc2lvbnMsXHJcbiAgICAvLyBuZWlnaGJvcmluZyBpbnB1dCBzaG91bGQgbWlycm9yIG5ldyB2YWx1ZSxcclxuICAgIC8vIGFuZCB0b3RhbCBwb3NzaWJsZSBtaW5lYWJsZSBzcXVhcmVzIChkaW1lbnNpb25zIF4gMiAtMSlcclxuICAgIC8vIGJlIGZpbGxlZCBpbnRvIGEgPHNwYW4+IGJlbG93LlxyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XHJcbiAgICAgICAgLy8gdXBkYXRlIHRoZSAnbWlycm9yJyA8aW5wdXQ+Li4uXHJcbiAgICAgICAgJCgnI2RpbWVuc2lvbnMtbWlycm9yJykudmFsKCR0aGlzLnZhbCgpKTtcclxuICAgICAgICAvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuICAgICAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCR0aGlzLnZhbCgpKSArICcuJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiZm9ybVwiKS5vbihcInN1Ym1pdFwiLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoe1xyXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCksXHJcbiAgICAgICAgICAgIG1pbmVzOiAkKFwiI21pbmUtY291bnRcIikudmFsKClcclxuICAgICAgICB9KS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgJChcIiNvcHRpb25zLWNhcmRcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjYm9hcmQtY2FyZFwiKS5mYWRlSW4oKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbi8vIHNldCB3aWR0aC9oZWlnaHQgb2YgLnNxdWFyZTpcclxuICAgIC8vIHZhciBuZXdEaW0gPSAoKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkpICsgNjYpIC8gMjA7XHJcbiAgICAvLyAkKCcuc3F1YXJlJykuY3NzKHsgaGVpZ2h0OiBuZXdEaW0sIHdpZHRoOiBuZXdEaW0gfSk7XHJcbi8vICgwLjk1ICogJCh3aW5kb3cpLmhlaWdodCgpICsgNjYpIC8gdGhpcy5kaW1lbnNpb25zXHJcbiIsIlxyXG5cclxuZnVuY3Rpb24gQml0RmxhZ3MoaXNPcGVuLCBpc01pbmVkLCBpc0ZsYWdnZWQsIGhhc0luZGV4KSB7XHJcbiAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgPyBidWlsZFN0YXRlKFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcclxuICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxufVxyXG5cclxuZnVuY3Rpb24gYmluVG9EZWMoc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9XHJcbmZ1bmN0aW9uIGRlY1RvQmluKG51bSkgeyByZXR1cm4gbnVtLnRvU3RyaW5nKDIpOyB9XHJcbmZ1bmN0aW9uIGJ1aWxkU3RhdGUoYXJyKSB7IHJldHVybiBhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7IHJldHVybiBTdHJpbmcoK3BhcmFtKTsgfSkuam9pbignJyk7IH1cclxuZnVuY3Rpb24gcGFkKHN0ciwgbWF4KSB7XHJcbiAgbWF4IHx8IChtYXggPSA0KTtcclxuICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgZm9yICh2YXIgYWNjPVtdOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpIHt9XHJcbiAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxufVxyXG5cclxuXHJcbkJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgIEZfT1BFTjogICAgICAgIDEsXHJcbiAgICBGX01JTkVEOiAgICAgICAyLFxyXG4gICAgRl9GTEFHR0VEOiAgICAgNCxcclxuICAgIEZfSU5ERVg6ICAgICAgIDgsXHJcblxyXG4gICAgREVGQVVMVF9TVEFURTogJzAwMDAnLFxyXG5cclxuICAgIF9oYXM6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuICEhKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIGZsYWcpOyB9LFxyXG4gICAgX3NldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpIHwgZmxhZykpOyB9LFxyXG4gICAgX3JlbW92ZTogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuX3JlbW92ZSh0aGlzLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0KHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5fcmVtb3ZlKHRoaXMuRl9GTEFHR0VEKTsgfSxcclxuICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0KHRoaXMuRl9JTkRFWCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gIXRoaXMuX2hhcyh0aGlzLkZfT1BFTik7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5faGFzKHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9oYXModGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9oYXModGhpcy5GX01JTkVEKTsgfSxcclxuICAgIGhhc0luZGV4OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2hhcyh0aGlzLkZfSU5ERVgpOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdzOyIsIlxyXG52YXIgQ29uc3RhbnRzID0ge1xyXG5cdFNZTUJPTFM6IHsgQ0xPU0VEOiAneCcsIE9QRU5FRDogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHRERUZBVUxUX0dBTUVfT1BUSU9OUzogeyBkaW1lbnNpb25zOiA5LCBtaW5lczogMSwgYm9hcmQ6IFwiI2JvYXJkXCIgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIEdhbWVib2FyZChvcHRpb25zKSB7XHJcbiAgICAvLyB0aGUgbWFwLCBzZXJ2aW5nIGFzIHRoZSBpbnRlcm5hbCByZXByZXNlbmF0aW9uIG9mIHRoZSBnYW1lYm9hcmRcclxuICAgIHRoaXMuYm9hcmQgPSB7XHJcbiAgICAgICAgX3RhYmxlOiBbXSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICAgICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfSxcclxuICAgICAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtvcHRpb25zLmRpbWVuc2lvbnMgfHwgJEMuREVGQVVMVF9HQU1FX09QVElPTlMuZGltZW5zaW9ucztcclxuICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICB0aGlzLm1pbmVzID0gK29wdGlvbnMubWluZXMgfHwgJEMuREVGQVVMVF9HQU1FX09QVElPTlMubWluZXM7XHJcbiAgICAvLyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIHRhYmxlIHNlcnZpbmcgYXMgdGhlIGJvYXJkXHJcbiAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5ib2FyZCB8fCAkQy5ERUZBVUxUX0dBTUVfT1BUSU9OUy5ib2FyZCk7XHJcblxyXG4gICAgLy8ga2VlcCB0cmFjayBvZiB1c2VyIGNsaWNrcyB0b3dhcmRzIHRoZWlyIHdpblxyXG4gICAgdGhpcy51c2VyTW92ZXMgPSAwO1xyXG5cclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG59XHJcblxyXG5HYW1lYm9hcmQucHJvdG90eXBlID0ge1xyXG5cclxuICAgIC8vIFwiUFJJVkFURVwiIE1FVEhPRFM6XHJcbiAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBwcmVmaWxsIHNxdWFyZXMgdG8gcmVxdWlyZWQgZGltZW5zaW9ucy4uLlxyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgZmlsbFJvdyA9IGZ1bmN0aW9uKHJvdywgc3F1YXJlcykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc3F1YXJlczsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IG5ldyBTcXVhcmUocm93LCBpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSlcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgZmlsbFJvdyhpLCBkaW1lbnNpb25zKSk7XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSByYW5kb20gcG9zaXRpb25zIG9mIG1pbmVkIHNxdWFyZXMuLi5cclxuICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKGRpbWVuc2lvbnMsIG1pbmVzKTtcclxuXHJcbiAgICAgICAgLy8gcHJlLWNhbGN1bGF0ZSB0aGUgZGFuZ2VyIGluZGV4IG9mIGVhY2ggbm9uLW1pbmVkIHNxdWFyZS4uLlxyXG4gICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRyBBIE0gRSBCIE8gQSBSIERcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSgpKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIk0gSSBOIEUgIFAgTCBBIEMgRSBNIEUgTiBUIFNcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSh0cnVlKSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG5cclxuICAgICAgICAvLyBzZXR1cCBldmVudCBsaXN0ZW5lcnMgdG8gbGlzdGVuIGZvciB1c2VyIGNsaWNrc1xyXG4gICAgICAgIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lTWluZUxvY2F0aW9uczogZnVuY3Rpb24oZGltZW5zaW9ucywgbWluZXMpIHtcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBtaW5lczsgKytpKSB7XHJcbiAgICAgICAgICAgIHZhciBybmQgPSBNYXRoLnJhbmRvbSgpICogKE1hdGgucG93KGRpbWVuc2lvbnMsIDIpKSB8IDAsXHJcbiAgICAgICAgICAgICAgICByb3cgPSB+fihybmQgLyBkaW1lbnNpb25zKSxcclxuICAgICAgICAgICAgICAgIGNlbGwgPSBybmQgJSBkaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlID0gdGhpcy5nZXRTcXVhcmVBdChyb3csIGNlbGwpO1xyXG4gICAgICAgICAgICBzcXVhcmUubWluZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcHJlY2FsY0RhbmdlckluZGljZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pKTsgfSwgW10pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNhZmUpIHsgc2FmZS5kYW5nZXIgPSBfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZignY2xpY2ssIGNvbnRleHRtZW51JywgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIic+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc01pbmVkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUub3BlbigpO1xyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnY2xvc2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImhhbmRsZSBmbGFnZ2VkIHNpdHVhdGlvbi4uLlwiKVxyXG4gICAgICAgICAgICAvLyBUT0RPOiByZW1vdmUgdGhpcz9cclxuXHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVPdmVyKCk7XHJcblxyXG4gICAgICAgIGlmICgkKCcuY2xvc2VkJykubGVuZ3RoID09PSAwKVxyXG4gICAgICAgICAgICB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZVJpZ2h0Q2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG4gICAgICAgIC8vIFRPRE86IGZpeCByaWdodC1jbGlja3NcclxuICAgICAgICBjb25zb2xlLmxvZyhcIiRjZWxsOiAlbywgc3F1YXJlOiAlb1wiLCAkY2VsbCwgc3F1YXJlKVxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdmbGFnZ2VkJyk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnZmxhZ2dlZCcpLmFkZENsYXNzKCdjbG9zZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAvLyBiYXNlZCBvbiBgc291cmNlYCBzcXVhcmUsIHdhbGsgYW5kIHJlY3Vyc2l2ZWx5IHJldmVhbCBjb25uZWN0ZWQgc3BhY2VzXHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kKSxcclxuICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICBjZWxsID0gc291cmNlLmdldENlbGwoKSxcclxuICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkgJiYgbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5nZXRHcmlkQ2VsbChuZWlnaGJvcikucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS13aW4nKTtcclxuICAgICAgICAvLyBUT0RPOiByZXBsYWNlIHdpdGggcmVhbCBtZXNzYWdlXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJHIEEgTSBFICBXIEkgTiAhISFcIik7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oZikgeyBfdGhpcy5nZXRHcmlkQ2VsbChmKS5maW5kKCcuZGFuZ2VyJykuaHRtbChmLmdldERhbmdlcigpKTsgfSk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgdGhpcy4kZWwuZmluZCgnLm1pbmVkJykuYWRkQ2xhc3MoJ3JldmVhbGVkJyk7XHJcbiAgICAgICAgdGhpcy4kZWwuZmluZCgnLmNsb3NlZCwgLmZsYWdnZWQnKS5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgIC8vIFRPRE86IHJlcGxhY2Ugd2l0aCByZWFsIG1lc3NhZ2VcclxuICAgICAgICBjb25zb2xlLmxvZygnRyBBIE0gRSAgTyBWIEUgUiAhISEnKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICB2YXIgJGNlbGwgPSB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSksXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiAoIXNxdWFyZS5pc01pbmVkKCkpID8gKHNxdWFyZS5pc0ZsYWdnZWQoKSkgPyAnJiM5ODczOycgOiBzcXVhcmUuZ2V0RGFuZ2VyKCkgOiAnJiM5ODgxOycgfSk7XHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKHNxdWFyZS5nZXRTdGF0ZSgpLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgIC8vIGluc2VydCBhIHNwYW4gd2l0aCB0aGUgZGFuZ2VyIGluZGV4XHJcbiAgICAgICAgJGNlbGwuZmluZCgnLmRhbmdlcicpXHJcbiAgICAgICAgICAgICAucmVtb3ZlKClcclxuICAgICAgICAgICAgIC5lbmQoKVxyXG4gICAgICAgICAgICAgLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcbiAgICAgICAgLy8gYWRkIHNvbWUgZGF0YS0qIGF0dHJpYnV0ZXMgdG8gcGFzcyBhbG9uZyBvbiBjbGljayBldmVudHNcclxuICAgICAgICAkY2VsbC5kYXRhKCdyb3cnLCBzcXVhcmUuZ2V0Um93KCkpO1xyXG4gICAgICAgICRjZWxsLmRhdGEoJ2NlbGwnLCBzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgLy8gcmV0dXJuIGB0aGlzYCwgc28gdGhpcyBtZXRob2QgY2FuIGJlIGNoYWluZWQgdG8gaXRzIGluaXRpYWxpemF0aW9uIGNhbGxcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZUF0OiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICB2YXIgcm93ID0gdGhpcy5ib2FyZC5nZXQocm93KTtcclxuICAgICAgICByZXR1cm4gKHJvdyAmJiByb3dbMF0gJiYgcm93WzBdW2NlbGxdKSA/IHJvd1swXVtjZWxsXSA6IG51bGw7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmRcclxuICAgICAgICAgICAgICAgIC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwpOyB9LCBbXSlcclxuICAgIH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oc3RyLCByb3csIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN5bWJvbHMgPSB3aXRoRGFuZ2VyID8gcm93Lm1hcChmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuZ2V0RGFuZ2VyKCkgfHwgJyAnOyB9KSA6IHJvdztcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdHIgKz0gc3ltYm9scy5qb2luKCcgICAnKS50b0xvd2VyQ2FzZSgpICsgXCIgICAgICAgW1wiICsgaWR4ICsgXCJdXFxuXCI7XHJcbiAgICAgICAgICAgIH0sICdcXG4nKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsInZhciBCaXRGbGFncyA9IHJlcXVpcmUoJy4vYml0LWZsYWdzJyk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBzdGF0ZSwgZGFuZ2VyKSB7XHJcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICByZXR1cm4gbmV3IFNxdWFyZShhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5yb3cgPSByb3c7XHJcbiAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlIHx8IHRoaXMuU3RhdGVzLkNMT1NFRDtcclxuICAgIHRoaXMuZGFuZ2VyID0gZGFuZ2VyIHx8ICctJztcclxufVxyXG5cclxuU3F1YXJlLnByb3RvdHlwZSA9IHtcclxuICAgIFN0YXRlczogeyBDTE9TRUQ6ICd4JywgT1BFTkVEOiAnXycsIEZMQUdHRUQ6ICdmJywgTUlORUQ6ICcqJyB9LFxyXG5cclxuICAgIGdldFJvdzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJvdzsgfSxcclxuICAgIGdldENlbGw6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jZWxsOyB9LFxyXG4gICAgZ2V0RGFuZ2VyOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZGFuZ2VyOyB9LFxyXG4gICAgZ2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuU3RhdGVzKVxyXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gX3RoaXMuU3RhdGVzW2tleV0gPT09IF90aGlzLnN0YXRlOyB9KVswXTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlID0gdGhpcy5TdGF0ZXMuQ0xPU0VEOyB9LFxyXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5PUEVORUQ7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZSA9IHRoaXMuU3RhdGVzLkZMQUdHRUQ7IH0sXHJcbiAgICBtaW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZSA9IHRoaXMuU3RhdGVzLk1JTkVEOyB9LFxyXG5cclxuICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUgPT09IHRoaXMuU3RhdGVzLkNMT1NFRDsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlID09PSB0aGlzLlN0YXRlcy5PUEVORUQ7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuRkxBR0dFRDsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuTUlORUQ7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNxdWFyZTtcclxuXHJcbi8vIFRPRE86IHJlcGxhY2UgU3F1YXJlIHN0YXRlIGludGVybmFscyB3aXRoIEJpdEZsYWdzIGltcGwuLi4iXX0=
;