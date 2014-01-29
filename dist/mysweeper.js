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
var Multimap = require('./multimap'),
    DangerCalculator = require('./danger-calculator'),
    Square = require('./square'),
    $C = require('./constants');

function Gameboard(options) {
    // the map, serving as the internal represenation of the gameboard
    this.board = new Multimap;
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
},{"./constants":3,"./danger-calculator":4,"./multimap":7,"./square":8}],7:[function(require,module,exports){

function Multimap() {
    this._table = [];
}

Multimap.prototype = {
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

module.exports = Multimap;
},{}],8:[function(require,module,exports){
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
},{"./bit-flags":2}]},{},[2,1,5,4,3,6,7,8])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZ3MuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zdGFudHMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9kYW5nZXItY2FsY3VsYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2VtaXR0ZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9tdWx0aW1hcC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3NxdWFyZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEdhbWVib2FyZCA9IHJlcXVpcmUoJy4vZ2FtZWJvYXJkJyk7XHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgdmFyIG1pbmVhYmxlU3BhY2VzID0gZnVuY3Rpb24oZGltKSB7IHJldHVybiBNYXRoLnBvdyhkaW0sIDIpIC0gMTsgfSxcclxuICAgICAgICAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIik7XHJcblxyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuXHJcbiAgICAvLyBvbmtleXVwIHdoZW4gY2hvb3NpbmcgZ2FtZWJvYXJkIGRpbWVuc2lvbnMsXHJcbiAgICAvLyBuZWlnaGJvcmluZyBpbnB1dCBzaG91bGQgbWlycm9yIG5ldyB2YWx1ZSxcclxuICAgIC8vIGFuZCB0b3RhbCBwb3NzaWJsZSBtaW5lYWJsZSBzcXVhcmVzIChkaW1lbnNpb25zIF4gMiAtMSlcclxuICAgIC8vIGJlIGZpbGxlZCBpbnRvIGEgPHNwYW4+IGJlbG93LlxyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XHJcbiAgICAgICAgLy8gdXBkYXRlIHRoZSAnbWlycm9yJyA8aW5wdXQ+Li4uXHJcbiAgICAgICAgJCgnI2RpbWVuc2lvbnMtbWlycm9yJykudmFsKCR0aGlzLnZhbCgpKTtcclxuICAgICAgICAvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuICAgICAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCR0aGlzLnZhbCgpKSArICcuJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiZm9ybVwiKS5vbihcInN1Ym1pdFwiLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoe1xyXG4gICAgICAgICAgICBkaW1lbnNpb25zOiAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCksXHJcbiAgICAgICAgICAgIG1pbmVzOiAkKFwiI21pbmUtY291bnRcIikudmFsKClcclxuICAgICAgICB9KS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgJChcIiNvcHRpb25zLWNhcmRcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjYm9hcmQtY2FyZFwiKS5mYWRlSW4oKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG59KTtcclxuXHJcbi8vIHNldCB3aWR0aC9oZWlnaHQgb2YgLnNxdWFyZTpcclxuICAgIC8vIHZhciBuZXdEaW0gPSAoKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkpICsgNjYpIC8gMjA7XHJcbiAgICAvLyAkKCcuc3F1YXJlJykuY3NzKHsgaGVpZ2h0OiBuZXdEaW0sIHdpZHRoOiBuZXdEaW0gfSk7XHJcbi8vICgwLjk1ICogJCh3aW5kb3cpLmhlaWdodCgpICsgNjYpIC8gdGhpcy5kaW1lbnNpb25zXHJcbiIsIlxyXG5cclxuZnVuY3Rpb24gQml0RmxhZ3MoaXNPcGVuLCBpc01pbmVkLCBpc0ZsYWdnZWQsIGhhc0luZGV4KSB7XHJcbiAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgPyBidWlsZFN0YXRlKFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcclxuICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxufVxyXG5cclxuZnVuY3Rpb24gYmluVG9EZWMoc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9XHJcbmZ1bmN0aW9uIGRlY1RvQmluKG51bSkgeyByZXR1cm4gbnVtLnRvU3RyaW5nKDIpOyB9XHJcbmZ1bmN0aW9uIGJ1aWxkU3RhdGUoYXJyKSB7IHJldHVybiBhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7IHJldHVybiBTdHJpbmcoK3BhcmFtKTsgfSkuam9pbignJyk7IH1cclxuZnVuY3Rpb24gcGFkKHN0ciwgbWF4KSB7XHJcbiAgbWF4IHx8IChtYXggPSA0KTtcclxuICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgZm9yICh2YXIgYWNjPVtdOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpIHt9XHJcbiAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxufVxyXG5cclxuXHJcbkJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgIEZfT1BFTjogICAgICAgIDEsXHJcbiAgICBGX01JTkVEOiAgICAgICAyLFxyXG4gICAgRl9GTEFHR0VEOiAgICAgNCxcclxuICAgIEZfSU5ERVg6ICAgICAgIDgsXHJcblxyXG4gICAgREVGQVVMVF9TVEFURTogJzAwMDAnLFxyXG5cclxuICAgIF9oYXM6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuICEhKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIGZsYWcpOyB9LFxyXG4gICAgX3NldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpIHwgZmxhZykpOyB9LFxyXG4gICAgX3JlbW92ZTogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuX3JlbW92ZSh0aGlzLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0KHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5fcmVtb3ZlKHRoaXMuRl9GTEFHR0VEKTsgfSxcclxuICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0KHRoaXMuRl9JTkRFWCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gIXRoaXMuX2hhcyh0aGlzLkZfT1BFTik7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5faGFzKHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9oYXModGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9oYXModGhpcy5GX01JTkVEKTsgfSxcclxuICAgIGhhc0luZGV4OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2hhcyh0aGlzLkZfSU5ERVgpOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdzOyIsIlxyXG52YXIgQ29uc3RhbnRzID0ge1xyXG5cdFNZTUJPTFM6IHsgQ0xPU0VEOiAneCcsIE9QRU5FRDogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHRERUZBVUxUX0dBTUVfT1BUSU9OUzogeyBkaW1lbnNpb25zOiA5LCBtaW5lczogMSwgYm9hcmQ6IFwiI2JvYXJkXCIgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbXVsdGltYXAnKSxcclxuICAgIERhbmdlckNhbGN1bGF0b3IgPSByZXF1aXJlKCcuL2Rhbmdlci1jYWxjdWxhdG9yJyksXHJcbiAgICBTcXVhcmUgPSByZXF1aXJlKCcuL3NxdWFyZScpLFxyXG4gICAgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8ICRDLkRFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8ICRDLkRFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgJEMuREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG5cclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuXHJcbiAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxufVxyXG5cclxuR2FtZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuXHJcbiAgICAvLyBcIlBSSVZBVEVcIiBNRVRIT0RTOlxyXG4gICAgX2xvYWRCb2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcHJlZmlsbCBzcXVhcmVzIHRvIHJlcXVpcmVkIGRpbWVuc2lvbnMuLi5cclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zID0gdGhpcy5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgIGZpbGxSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIGZpbGxSb3coaSwgZGltZW5zaW9ucykpO1xyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcblxyXG4gICAgICAgIC8vIHByZS1jYWxjdWxhdGUgdGhlIGRhbmdlciBpbmRleCBvZiBlYWNoIG5vbi1taW5lZCBzcXVhcmUuLi5cclxuICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIkcgQSBNIEUgQiBPIEEgUiBEXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUoKSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNIEkgTiBFICBQIEwgQSBDIEUgTSBFIE4gVCBTXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUodHJ1ZSkpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJHcmlkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBsYXlvdXQgdGhlIEhUTUwgPHRhYmxlPiByb3dzLi4uXHJcbiAgICAgICAgdGhpcy5fY3JlYXRlSFRNTEdyaWQodGhpcy5kaW1lbnNpb25zKTtcclxuXHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgcm5kID0gTWF0aC5yYW5kb20oKSAqIChNYXRoLnBvdyhkaW1lbnNpb25zLCAyKSkgfCAwLFxyXG4gICAgICAgICAgICAgICAgcm93ID0gfn4ocm5kIC8gZGltZW5zaW9ucyksXHJcbiAgICAgICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIHNxdWFyZSA9IHRoaXMuZ2V0U3F1YXJlQXQocm93LCBjZWxsKTtcclxuICAgICAgICAgICAgc3F1YXJlLm1pbmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuZGFuZ2VyID0gX3RoaXMuZGFuZ2VyQ2FsYy5mb3JTcXVhcmUoc2FmZS5nZXRSb3coKSwgc2FmZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoJ2NsaWNrLCBjb250ZXh0bWVudScsICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX2NyZWF0ZUhUTUxHcmlkOiBmdW5jdGlvbihkaW1lbnNpb25zKSB7XHJcbiAgICAgICAgdmFyIGdyaWQgPSAnJztcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpIHtcclxuICAgICAgICAgICAgZ3JpZCArPSBcIjx0ciBpZD0ncm93XCIgKyBpICsgXCInPlwiXHJcbiAgICAgICAgICAgICAgICAgKyAgW10uam9pbi5jYWxsKHsgbGVuZ3RoOiBkaW1lbnNpb25zICsgMSB9LCBcIjx0ZD48L3RkPlwiKVxyXG4gICAgICAgICAgICAgICAgICsgIFwiPC90cj5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKGdyaWQpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KSxcclxuICAgICAgICAgICAgJGNlbGwgPSAkdGFyZ2V0LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc3BhbicgPyAkdGFyZ2V0LnBhcmVudCgpIDogJHRhcmdldCxcclxuICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IGFsc28gaGFuZGxlIGZpcnN0LWNsaWNrLWNhbid0LWJlLW1pbmUgKGlmIHdlJ3JlIGZvbGxvd2luZyB0aGF0IHJ1bGUpXHJcbiAgICAgICAgLy8gaGVyZSwgaWYgdXNlck1vdmVzID09PSAwLi4uXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJoYW5kbGUgZmxhZ2dlZCBzaXR1YXRpb24uLi5cIilcclxuICAgICAgICAgICAgLy8gVE9ETzogcmVtb3ZlIHRoaXM/XHJcblxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG5cclxuICAgICAgICBpZiAoJCgnLmNsb3NlZCcpLmxlbmd0aCA9PT0gMClcclxuICAgICAgICAgICAgdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuICAgICAgICAvLyBUT0RPOiBmaXggcmlnaHQtY2xpY2tzXHJcbiAgICAgICAgY29uc29sZS5sb2coXCIkY2VsbDogJW8sIHNxdWFyZTogJW9cIiwgJGNlbGwsIHNxdWFyZSlcclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnZmxhZ2dlZCcpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2ZsYWdnZWQnKS5hZGRDbGFzcygnY2xvc2VkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgX3JlY3Vyc2l2ZVJldmVhbDogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZCksXHJcbiAgICAgICAgICAgIHJvdyA9IHNvdXJjZS5nZXRSb3coKSxcclxuICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCksXHJcbiAgICAgICAgICAgIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgIW5laWdoYm9yLmlzTWluZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpICYmIG5laWdoYm9yLmdldERhbmdlcigpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ2V0R3JpZENlbGwobmVpZ2hib3IpLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZVdpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgLy8gVE9ETzogcmVwbGFjZSB3aXRoIHJlYWwgbWVzc2FnZVxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRyBBIE0gRSAgVyBJIE4gISEhXCIpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICB9LFxyXG4gICAgX2dhbWVPdmVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyByZXNldCBldmVyeXRoaW5nXHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHsgX3RoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7IH0pO1xyXG4gICAgICAgIC8vIG9wZW4vcmV2ZWFsIGFsbCBzcXVhcmVzXHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoJy5taW5lZCcpLmFkZENsYXNzKCdyZXZlYWxlZCcpO1xyXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoJy5jbG9zZWQsIC5mbGFnZ2VkJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAvLyBUT0RPOiByZXBsYWNlIHdpdGggcmVhbCBtZXNzYWdlXHJcbiAgICAgICAgY29uc29sZS5sb2coJ0cgQSBNIEUgIE8gViBFIFIgISEhJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICAkZGFuZ2VyU3BhbiA9ICQoJzxzcGFuIC8+JywgeyAnY2xhc3MnOiAnZGFuZ2VyJywgaHRtbDogKCFzcXVhcmUuaXNNaW5lZCgpKSA/IChzcXVhcmUuaXNGbGFnZ2VkKCkpID8gJyYjOTg3MzsnIDogc3F1YXJlLmdldERhbmdlcigpIDogJyYjOTg4MTsnIH0pO1xyXG4gICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKClcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnc3F1YXJlJylcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICAvLyBpbnNlcnQgYSBzcGFuIHdpdGggdGhlIGRhbmdlciBpbmRleFxyXG4gICAgICAgICRjZWxsLmZpbmQoJy5kYW5nZXInKVxyXG4gICAgICAgICAgICAgLnJlbW92ZSgpXHJcbiAgICAgICAgICAgICAuZW5kKClcclxuICAgICAgICAgICAgIC5hcHBlbmQoJGRhbmdlclNwYW4pO1xyXG4gICAgICAgIC8vIGFkZCBzb21lIGRhdGEtKiBhdHRyaWJ1dGVzIHRvIHBhc3MgYWxvbmcgb24gY2xpY2sgZXZlbnRzXHJcbiAgICAgICAgJGNlbGwuZGF0YSgncm93Jywgc3F1YXJlLmdldFJvdygpKTtcclxuICAgICAgICAkY2VsbC5kYXRhKCdjZWxsJywgc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICAgICAgJGNlbGwuZGF0YSgnc3F1YXJlJywgc3F1YXJlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gXCJQVUJMSUNcIiBNRVRIT0RTXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2godGhpcy5fcmVuZGVyU3F1YXJlLmJpbmQodGhpcykpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0R3JpZENlbGw6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRlbFxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJyNyb3cnICsgc3F1YXJlLmdldFJvdygpKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ3RkJylcclxuICAgICAgICAgICAgICAgIC5lcShzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG5cclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpLmpvaW4oJywgJyk7IH0sXHJcbiAgICB0b0NvbnNvbGU6IGZ1bmN0aW9uKHdpdGhEYW5nZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzeW1ib2xzID0gd2l0aERhbmdlciA/IHJvdy5tYXAoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmdldERhbmdlcigpIHx8ICcgJzsgfSkgOiByb3c7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RyICs9IHN5bWJvbHMuam9pbignICAgJykudG9Mb3dlckNhc2UoKSArIFwiICAgICAgIFtcIiArIGlkeCArIFwiXVxcblwiO1xyXG4gICAgICAgICAgICB9LCAnXFxuJyk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVib2FyZDsiLCJcclxuZnVuY3Rpb24gTXVsdGltYXAoKSB7XHJcbiAgICB0aGlzLl90YWJsZSA9IFtdO1xyXG59XHJcblxyXG5NdWx0aW1hcC5wcm90b3R5cGUgPSB7XHJcbiAgICBnZXQ6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfSxcclxuICAgIHNldDogZnVuY3Rpb24ocm93LCB2YWwpIHsgKHRoaXMuX3RhYmxlW3Jvd10gfHwgKHRoaXMuX3RhYmxlW3Jvd10gPSBbXSkpLnB1c2godmFsKTsgfSxcclxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGZuKSB7IHJldHVybiBbXS5mb3JFYWNoLmNhbGwodGhpcy52YWx1ZXMoKSwgZm4pOyB9LFxyXG4gICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgfSxcclxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfSxcclxuICAgIHNpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpLmxlbmd0aDsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aW1hcDsiLCJ2YXIgQml0RmxhZ3MgPSByZXF1aXJlKCcuL2JpdC1mbGFncycpO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgc3RhdGUsIGRhbmdlcikge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSB8fCB0aGlzLlN0YXRlcy5DTE9TRUQ7XHJcbiAgICB0aGlzLmRhbmdlciA9IGRhbmdlciB8fCAnLSc7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBTdGF0ZXM6IHsgQ0xPU0VEOiAneCcsIE9QRU5FRDogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBnZXRSb3c6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yb3c7IH0sXHJcbiAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgIGdldERhbmdlcjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmRhbmdlcjsgfSxcclxuICAgIGdldFN0YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLlN0YXRlcylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzLlN0YXRlc1trZXldID09PSBfdGhpcy5zdGF0ZTsgfSlbMF07XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZSA9IHRoaXMuU3RhdGVzLkNMT1NFRDsgfSxcclxuICAgIG9wZW46IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlID0gdGhpcy5TdGF0ZXMuT1BFTkVEOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5GTEFHR0VEOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5NSU5FRDsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlID09PSB0aGlzLlN0YXRlcy5DTE9TRUQ7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuT1BFTkVEOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUgPT09IHRoaXMuU3RhdGVzLkZMQUdHRUQ7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUgPT09IHRoaXMuU3RhdGVzLk1JTkVEOyB9LFxyXG5cclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IHJvdzogdGhpcy5yb3csIGNlbGw6IHRoaXMuY2VsbCwgc3RhdGU6IHRoaXMuc3RhdGUsIGRhbmdlcjogdGhpcy5kYW5nZXIgfSB9LFxyXG4gICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZTsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7XHJcblxyXG4vLyBUT0RPOiByZXBsYWNlIFNxdWFyZSBzdGF0ZSBpbnRlcm5hbHMgd2l0aCBCaXRGbGFncyBpbXBsLi4uIl19
;