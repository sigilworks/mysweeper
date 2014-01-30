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

},{"./gameboard":7}],2:[function(require,module,exports){

// @usage var BitFlags = new BitFlagFactory(['F_OPEN', 'F_MINED', 'F_FLAGGED', 'F_INDEX']); bf = new BitFlags;
function BitFlagFactory(args) {

    var binToDec = function(str) { return parseInt(str, 2); },
        decToBin = function(num) { return num.toString(2); },
        buildState = function(arr) { return pad(arr.map(function(param) { return String(+param); }).reverse().join('')); },
        pad = function (str, max) {
          max || (max = 4 /* this.DEFAULT_SIZE.length */);
          var diff = max - str.length;
          for (var acc=[]; diff > 0; acc[--diff] = '0') {}
          return acc.join('') + str;
        },
        createQueryMethod = function(name) { return function() { return this.has(this[name]); } },
        createQueryMethodName = function(name) {
            if (~name.indexOf('_'))
                name = name.substring(name.indexOf('_') + 1);
            return 'is' + name.charAt(0).toUpperCase() + name.substring(1);
        },
        setStates = function(args, proto) {
            if (!args.length) return;

            proto._states = [];

            for (var i=0, len=args.length; i < len; ++i) {
                var flagName = String(args[i]).toUpperCase(),
                    clsName = flagName.toLowerCase(),
                    value = Math.pow(2, i),
                    queryMethodName = createQueryMethodName(clsName),
                    queryMethod = createQueryMethod(flagName);

                proto[flagName] = value;
                proto._states[i] = clsName;
                proto[queryMethodName] = queryMethod;
            }
            proto.DEFAULT_STATE = pad('', i);
        };

    function BitFlags() {
        this._flags = arguments.length > 0
            ? buildState([].slice.call(arguments))
            : this.DEFAULT_STATE;
    }

    BitFlags.prototype = {
        constructor: BitFlags,
        has: function(flag) { return !!(binToDec(this._flags) & flag); },
        set: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) | flag)); },
        unset: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) & ~flag)); }
    };

    BitFlags.withDefaults = function(defaults) { return new BitFlags(defaults); };

    setStates(args, BitFlags.prototype);

    return BitFlags;
}

module.exports = BitFlagFactory;
},{}],3:[function(require,module,exports){

function BitFlags(isOpen, isMined, isFlagged, hasIndex) {
    this._flags = arguments.length > 0
        ? buildState([].slice.call(arguments))
        : this.DEFAULT_STATE;
}

function binToDec(str) { return parseInt(str, 2); }
function decToBin(num) { return num.toString(2); }
function buildState(arr) { return pad(arr.map(function(param) { return String(+param); }).join('')); }
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
    _unset: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) & ~flag)); },

    close: function() { this._unset(this.F_OPEN); },
    open: function() { this._set(this.F_OPEN); },
    flag: function() { this._set(this.F_FLAGGED); },
    unflag: function() { this._unset(this.F_FLAGGED); },
    mine: function() { this._set(this.F_MINED); },
    index: function() { this._set(this.F_INDEX); },

    isClosed: function() { return !this._has(this.F_OPEN); },
    isOpen: function() { return this._has(this.F_OPEN); },
    isFlagged: function() { return this._has(this.F_FLAGGED); },
    isMined: function() { return this._has(this.F_MINED); },
    hasIndex: function() { return this._has(this.F_INDEX); }
};

module.exports = BitFlags;
},{}],4:[function(require,module,exports){

var Constants = {

	Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

	Unicode: { FLAG: '\u2691' /*'⚑'*/ /*'&#9873;'*/, MINE: '\u2699' /*'⚙'*/ /*'&#9881;'*/ },

	DefaultConfig: { dimensions: 9, mines: 1, board: "#board", debug_mode: true /*false*/ }

};

module.exports = Constants;
},{}],5:[function(require,module,exports){

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
},{}],6:[function(require,module,exports){

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
},{}],7:[function(require,module,exports){
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
                 +  [].join.call({ length: dimensions + 1 }, "<td><span class='danger'></span></td>")
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

        else if ($('.closed').length === 0)
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
            $dangerSpan = $cell.find('.danger');

        // set the appropriate symbol when revealed:
        $dangerSpan.html(function() {
            if (square.isMined()) return '⚙'; // $C.Unicode.MINE
            if (square.isFlagged()) return $C.Unicode.FLAG; //'⚑'
            return square.getDanger();
         });

        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass(square.getState().join(' '));

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
},{"./constants":4,"./danger-calculator":5,"./multimap":8,"./square":9}],8:[function(require,module,exports){

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
},{}],9:[function(require,module,exports){
var BitFlags = require('./bit-flags'),
    Symbols = require('./constants').Symbols;

function Square(row, cell, danger) {
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
},{"./bit-flags":3,"./constants":4}]},{},[1,2,3,5,4,6,7,8,9])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvYml0LWZsYWdzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbXVsdGltYXAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zcXVhcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICB2YXIgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIE1hdGgucG93KGRpbSwgMikgLSAxOyB9LFxyXG4gICAgICAgICRwb3NzaWJsZU1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKTtcclxuXHJcbiAgICAvLyBzZXR0aW5nIGluaXRpYWwgdmFsdWVcclxuICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSkpO1xyXG5cclxuICAgIC8vIG9ua2V5dXAgd2hlbiBjaG9vc2luZyBnYW1lYm9hcmQgZGltZW5zaW9ucyxcclxuICAgIC8vIG5laWdoYm9yaW5nIGlucHV0IHNob3VsZCBtaXJyb3IgbmV3IHZhbHVlLFxyXG4gICAgLy8gYW5kIHRvdGFsIHBvc3NpYmxlIG1pbmVhYmxlIHNxdWFyZXMgKGRpbWVuc2lvbnMgXiAyIC0xKVxyXG4gICAgLy8gYmUgZmlsbGVkIGludG8gYSA8c3Bhbj4gYmVsb3cuXHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikub24oJ2tleXVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcclxuICAgICAgICAvLyB1cGRhdGUgdGhlICdtaXJyb3InIDxpbnB1dD4uLi5cclxuICAgICAgICAkKCcjZGltZW5zaW9ucy1taXJyb3InKS52YWwoJHRoaXMudmFsKCkpO1xyXG4gICAgICAgIC8vIC4uLmFuZCB0aGUgcG9zc2libGUgbnVtYmVyIG9mIG1pbmVzLlxyXG4gICAgICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJHRoaXMudmFsKCkpICsgJy4nKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCJmb3JtXCIpLm9uKFwic3VibWl0XCIsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZCh7XHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnM6ICQoXCIjZGltZW5zaW9uc1wiKS52YWwoKSxcclxuICAgICAgICAgICAgbWluZXM6ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKVxyXG4gICAgICAgIH0pLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG5cclxuLy8gc2V0IHdpZHRoL2hlaWdodCBvZiAuc3F1YXJlOlxyXG4gICAgLy8gdmFyIG5ld0RpbSA9ICgoMC45NSAqICQod2luZG93KS5oZWlnaHQoKSkgKyA2NikgLyAyMDtcclxuICAgIC8vICQoJy5zcXVhcmUnKS5jc3MoeyBoZWlnaHQ6IG5ld0RpbSwgd2lkdGg6IG5ld0RpbSB9KTtcclxuLy8gKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkgKyA2NikgLyB0aGlzLmRpbWVuc2lvbnNcclxuIiwiXHJcbi8vIEB1c2FnZSB2YXIgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWydGX09QRU4nLCAnRl9NSU5FRCcsICdGX0ZMQUdHRUQnLCAnRl9JTkRFWCddKTsgYmYgPSBuZXcgQml0RmxhZ3M7XHJcbmZ1bmN0aW9uIEJpdEZsYWdGYWN0b3J5KGFyZ3MpIHtcclxuXHJcbiAgICB2YXIgYmluVG9EZWMgPSBmdW5jdGlvbihzdHIpIHsgcmV0dXJuIHBhcnNlSW50KHN0ciwgMik7IH0sXHJcbiAgICAgICAgZGVjVG9CaW4gPSBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfSxcclxuICAgICAgICBidWlsZFN0YXRlID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBwYWQoYXJyLm1hcChmdW5jdGlvbihwYXJhbSkgeyByZXR1cm4gU3RyaW5nKCtwYXJhbSk7IH0pLnJldmVyc2UoKS5qb2luKCcnKSk7IH0sXHJcbiAgICAgICAgcGFkID0gZnVuY3Rpb24gKHN0ciwgbWF4KSB7XHJcbiAgICAgICAgICBtYXggfHwgKG1heCA9IDQgLyogdGhpcy5ERUZBVUxUX1NJWkUubGVuZ3RoICovKTtcclxuICAgICAgICAgIHZhciBkaWZmID0gbWF4IC0gc3RyLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXTsgZGlmZiA+IDA7IGFjY1stLWRpZmZdID0gJzAnKSB7fVxyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBCaXRGbGFncy53aXRoRGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykgeyByZXR1cm4gbmV3IEJpdEZsYWdzKGRlZmF1bHRzKTsgfTtcclxuXHJcbiAgICBzZXRTdGF0ZXMoYXJncywgQml0RmxhZ3MucHJvdG90eXBlKTtcclxuXHJcbiAgICByZXR1cm4gQml0RmxhZ3M7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQml0RmxhZ0ZhY3Rvcnk7IiwiXHJcbmZ1bmN0aW9uIEJpdEZsYWdzKGlzT3BlbiwgaXNNaW5lZCwgaXNGbGFnZ2VkLCBoYXNJbmRleCkge1xyXG4gICAgdGhpcy5fZmxhZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMFxyXG4gICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgOiB0aGlzLkRFRkFVTFRfU1RBVEU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJpblRvRGVjKHN0cikgeyByZXR1cm4gcGFyc2VJbnQoc3RyLCAyKTsgfVxyXG5mdW5jdGlvbiBkZWNUb0JpbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfVxyXG5mdW5jdGlvbiBidWlsZFN0YXRlKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5qb2luKCcnKSk7IH1cclxuZnVuY3Rpb24gcGFkKHN0ciwgbWF4KSB7XHJcbiAgbWF4IHx8IChtYXggPSA0KTtcclxuICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgZm9yICh2YXIgYWNjPVtdOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpIHt9XHJcbiAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxufVxyXG5cclxuQml0RmxhZ3MucHJvdG90eXBlID0ge1xyXG4gICAgRl9PUEVOOiAgICAgICAgMSxcclxuICAgIEZfTUlORUQ6ICAgICAgIDIsXHJcbiAgICBGX0ZMQUdHRUQ6ICAgICA0LFxyXG4gICAgRl9JTkRFWDogICAgICAgOCxcclxuXHJcbiAgICBERUZBVUxUX1NUQVRFOiAnMDAwMCcsXHJcblxyXG4gICAgX2hhczogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gISEoYmluVG9EZWModGhpcy5fZmxhZ3MpICYgZmxhZyk7IH0sXHJcbiAgICBfc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgfCBmbGFnKSk7IH0sXHJcbiAgICBfdW5zZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIH5mbGFnKSk7IH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLl91bnNldCh0aGlzLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0KHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5fdW5zZXQodGhpcy5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuX3NldCh0aGlzLkZfTUlORUQpOyB9LFxyXG4gICAgaW5kZXg6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXQodGhpcy5GX0lOREVYKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5faGFzKHRoaXMuRl9PUEVOKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9oYXModGhpcy5GX09QRU4pOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2hhcyh0aGlzLkZfRkxBR0dFRCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2hhcyh0aGlzLkZfTUlORUQpOyB9LFxyXG4gICAgaGFzSW5kZXg6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5faGFzKHRoaXMuRl9JTkRFWCk7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQml0RmxhZ3M7IiwiXHJcbnZhciBDb25zdGFudHMgPSB7XHJcblxyXG5cdFN5bWJvbHM6IHsgQ0xPU0VEOiAneCcsIE9QRU46ICdfJywgRkxBR0dFRDogJ2YnLCBNSU5FRDogJyonIH0sXHJcblxyXG5cdFVuaWNvZGU6IHsgRkxBRzogJ1xcdTI2OTEnIC8qJ+KakScqLyAvKicmIzk4NzM7JyovLCBNSU5FOiAnXFx1MjY5OScgLyon4pqZJyovIC8qJyYjOTg4MTsnKi8gfSxcclxuXHJcblx0RGVmYXVsdENvbmZpZzogeyBkaW1lbnNpb25zOiA5LCBtaW5lczogMSwgYm9hcmQ6IFwiI2JvYXJkXCIsIGRlYnVnX21vZGU6IHRydWUgLypmYWxzZSovIH1cclxuXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnN0YW50czsiLCJcclxuZnVuY3Rpb24gRGFuZ2VyQ2FsY3VsYXRvcihnYW1lYm9hcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYm9hcmQ6IGdhbWVib2FyZCxcclxuICAgICAgICBuZWlnaGJvcmhvb2Q6IHtcclxuICAgICAgICAgICAgLy8gZGlzdGFuY2UgaW4gc3RlcHMgZnJvbSB0aGlzIHNxdWFyZTpcclxuICAgICAgICAgICAgLy8gICAgICAgICAgIHZlcnQuIGhvcnouXHJcbiAgICAgICAgICAgIE5PUlRIOiAgICAgIFsgIDEsICAwIF0sXHJcbiAgICAgICAgICAgIE5PUlRIRUFTVDogIFsgIDEsICAxIF0sXHJcbiAgICAgICAgICAgIEVBU1Q6ICAgICAgIFsgIDAsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIRUFTVDogIFsgLTEsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIOiAgICAgIFsgLTEsICAwIF0sXHJcbiAgICAgICAgICAgIFNPVVRIV0VTVDogIFsgLTEsIC0xIF0sXHJcbiAgICAgICAgICAgIFdFU1Q6ICAgICAgIFsgIDAsIC0xIF0sXHJcbiAgICAgICAgICAgIE5PUlRIV0VTVDogIFsgIDEsIC0xIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvclNxdWFyZTogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgICAgIGlmICgrcm93ID49IDAgJiYgK2NlbGwgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbE1pbmVzID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5uZWlnaGJvcmhvb2QpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmJvYXJkLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiBuZWlnaGJvci5pc01pbmVkKCkpIHRvdGFsTWluZXMrKztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsTWluZXMgfHwgJyc7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEYW5nZXJDYWxjdWxhdG9yOyIsIlxyXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbn1cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlID0ge1xyXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChmbik7XHJcbiAgICB9LFxyXG4gICAgb2ZmOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0uc3BsaWNlKHRoaXMuX2V2ZW50c1tldmVudF0uaW5kZXhPZihmbiksIDEpO1xyXG4gICAgfSxcclxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50IC8qLCBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgICAgIGlmICh0aGlzLl9ldmVudHNbZXZlbnRdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dGhpcy5fZXZlbnRzW2V2ZW50XS5sZW5ndGg7IGkgPCBsZW47ICsraSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgIH1cclxufTtcclxuXHJcbmV4cG9ydHMuRW1pdHRlciA9IEVtaXR0ZXI7IiwidmFyIE11bHRpbWFwID0gcmVxdWlyZSgnLi9tdWx0aW1hcCcpLFxyXG4gICAgRGFuZ2VyQ2FsY3VsYXRvciA9IHJlcXVpcmUoJy4vZGFuZ2VyLWNhbGN1bGF0b3InKSxcclxuICAgIFNxdWFyZSA9IHJlcXVpcmUoJy4vc3F1YXJlJyksXHJcbiAgICAkQyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XHJcblxyXG4vLyB3cmFwcGVyIGFyb3VuZCBgJGxvZ2AsIHRvIHRvZ2dsZSBkZXYgbW9kZSBkZWJ1Z2dpbmdcclxudmFyICRsb2cgPSBmdW5jdGlvbiAkbG9nKCkgeyBpZiAoJGxvZy5kZWJ1Z19tb2RlIHx8IGZhbHNlKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9XHJcblxyXG5mdW5jdGlvbiBHYW1lYm9hcmQob3B0aW9ucykge1xyXG4gICAgLy8gdGhlIG1hcCwgc2VydmluZyBhcyB0aGUgaW50ZXJuYWwgcmVwcmVzZW5hdGlvbiBvZiB0aGUgZ2FtZWJvYXJkXHJcbiAgICB0aGlzLmJvYXJkID0gbmV3IE11bHRpbWFwO1xyXG4gICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtvcHRpb25zLmRpbWVuc2lvbnMgfHwgJEMuRGVmYXVsdENvbmZpZy5kaW1lbnNpb25zO1xyXG4gICAgLy8gdGhlIG51bWJlciBvZiBtaW5lcyB0aGUgdXNlciBoYXMgc2VsZWN0ZWRcclxuICAgIHRoaXMubWluZXMgPSArb3B0aW9ucy5taW5lcyB8fCAkQy5EZWZhdWx0Q29uZmlnLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgJEMuRGVmYXVsdENvbmZpZy5ib2FyZCk7XHJcbiAgICAvLyBzZWxlY3RpdmVseSBlbmFibGUgZGVidWcgbW9kZSBmb3IgY29uc29sZSB2aXN1YWxpemF0aW9ucyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgdGhpcy5kZWJ1Z19tb2RlID0gb3B0aW9ucy5kZWJ1Z19tb2RlIHx8ICRDLkRlZmF1bHRDb25maWcuZGVidWdfbW9kZTtcclxuICAgICRsb2cuZGVidWdfbW9kZSA9IHRoaXMuZGVidWdfbW9kZTtcclxuXHJcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHVzZXIgY2xpY2tzIHRvd2FyZHMgdGhlaXIgd2luXHJcbiAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcblxyXG4gICAgLy8gdGhlIG9iamVjdCB0aGF0IGNhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBzdXJyb3VuZGluZyBtaW5lcyBhdCBhbnkgc3F1YXJlXHJcbiAgICB0aGlzLmRhbmdlckNhbGMgPSBuZXcgRGFuZ2VyQ2FsY3VsYXRvcih0aGlzKTtcclxuICAgIC8vIGNyZWF0ZSB0aGUgYm9hcmQgaW4gbWVtb3J5IGFuZCBhc3NpZ24gdmFsdWVzIHRvIHRoZSBzcXVhcmVzXHJcbiAgICB0aGlzLl9sb2FkQm9hcmQoKTtcclxuICAgIC8vIHJlbmRlciB0aGUgSFRNTCB0byBtYXRjaCB0aGUgYm9hcmQgaW4gbWVtb3J5XHJcbiAgICB0aGlzLl9yZW5kZXJHcmlkKCk7XHJcbn1cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgZGltZW5zaW9ucyA9IHRoaXMuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSB0aGlzLm1pbmVzLFxyXG4gICAgICAgICAgICBwb3B1bGF0ZVJvdyA9IGZ1bmN0aW9uKHJvdywgc3F1YXJlcykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc3F1YXJlczsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IG5ldyBTcXVhcmUocm93LCBpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSlcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgcG9wdWxhdGVSb3coaSwgZGltZW5zaW9ucykpO1xyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcblxyXG4gICAgICAgIC8vIHByZS1jYWxjdWxhdGUgdGhlIGRhbmdlciBpbmRleCBvZiBlYWNoIG5vbi1taW5lZCBzcXVhcmUuLi5cclxuICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICAkbG9nKFwiRyBBIE0gRSBCIE8gQSBSIERcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSgpKTtcclxuICAgICAgICAkbG9nKFwiTSBJIE4gRSAgUCBMIEEgQyBFIE0gRSBOIFQgU1xcbiVvXCIsIHRoaXMudG9Db25zb2xlKHRydWUpKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcblxyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIHJuZCA9IE1hdGgucmFuZG9tKCkgKiAoTWF0aC5wb3coZGltZW5zaW9ucywgMikpIHwgMCxcclxuICAgICAgICAgICAgICAgIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBzcXVhcmUgPSB0aGlzLmdldFNxdWFyZUF0KHJvdywgY2VsbCk7XHJcbiAgICAgICAgICAgIHNxdWFyZS5taW5lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcihfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoJ2NsaWNrLCBjb250ZXh0bWVudScsICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX2NyZWF0ZUhUTUxHcmlkOiBmdW5jdGlvbihkaW1lbnNpb25zKSB7XHJcbiAgICAgICAgdmFyIGdyaWQgPSAnJztcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpIHtcclxuICAgICAgICAgICAgZ3JpZCArPSBcIjx0ciBpZD0ncm93XCIgKyBpICsgXCInPlwiXHJcbiAgICAgICAgICAgICAgICAgKyAgW10uam9pbi5jYWxsKHsgbGVuZ3RoOiBkaW1lbnNpb25zICsgMSB9LCBcIjx0ZD48c3BhbiBjbGFzcz0nZGFuZ2VyJz48L3NwYW4+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBUT0RPOiBhbHNvIGhhbmRsZSBmaXJzdC1jbGljay1jYW4ndC1iZS1taW5lIChpZiB3ZSdyZSBmb2xsb3dpbmcgdGhhdCBydWxlKVxyXG4gICAgICAgIC8vIGhlcmUsIGlmIHVzZXJNb3ZlcyA9PT0gMC4uLiA6bWVzc2FnZSA9PiA6bXVsbGlnYW4/XHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgJGxvZyhcImhhbmRsZSBmbGFnZ2VkIHNpdHVhdGlvbi4uLlwiKVxyXG4gICAgICAgICAgICAvLyBUT0RPOiByZW1vdmUgdGhpcz9cclxuXHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVPdmVyKCk7XHJcblxyXG4gICAgICAgIGVsc2UgaWYgKCQoJy5jbG9zZWQnKS5sZW5ndGggPT09IDApXHJcbiAgICAgICAgICAgIHRoaXMuX2dhbWVXaW4oKTtcclxuICAgIH0sXHJcbiAgICBfaGFuZGxlUmlnaHRDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KSxcclxuICAgICAgICAgICAgJGNlbGwgPSAkdGFyZ2V0LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc3BhbicgPyAkdGFyZ2V0LnBhcmVudCgpIDogJHRhcmdldCxcclxuICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcbiAgICAgICAgLy8gVE9ETzogZml4IHJpZ2h0LWNsaWNrc1xyXG4gICAgICAgICRsb2coXCIkY2VsbDogJW8sIHNxdWFyZTogJW9cIiwgJGNlbGwsIHNxdWFyZSlcclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnZmxhZ2dlZCcpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2ZsYWdnZWQnKS5hZGRDbGFzcygnY2xvc2VkJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgX3JlY3Vyc2l2ZVJldmVhbDogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZCksXHJcbiAgICAgICAgICAgIHJvdyA9IHNvdXJjZS5nZXRSb3coKSxcclxuICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCksXHJcbiAgICAgICAgICAgIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgIW5laWdoYm9yLmlzTWluZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpICYmIG5laWdoYm9yLmdldERhbmdlcigpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ2V0R3JpZENlbGwobmVpZ2hib3IpLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZVdpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgLy8gVE9ETzogcmVwbGFjZSB3aXRoIHJlYWwgbWVzc2FnZVxyXG4gICAgICAgICRsb2coXCJHIEEgTSBFICBXIEkgTiAhISFcIik7XHJcbiAgICAgICAgJGxvZyhcIlVzZXIgbW92ZXM6ICVvXCIsIHRoaXMudXNlck1vdmVzKVxyXG4gICAgfSxcclxuICAgIF9nYW1lT3ZlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcmVzZXQgZXZlcnl0aGluZ1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihmKSB7IF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpOyB9KTtcclxuICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICB0aGlzLiRlbC5maW5kKCcubWluZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoJy5jbG9zZWQsIC5mbGFnZ2VkJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAvLyBUT0RPOiByZXBsYWNlIHdpdGggcmVhbCBtZXNzYWdlXHJcbiAgICAgICAgJGxvZygnRyBBIE0gRSAgTyBWIEUgUiAhISEnKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICB2YXIgJGNlbGwgPSB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSksXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJGNlbGwuZmluZCgnLmRhbmdlcicpO1xyXG5cclxuICAgICAgICAvLyBzZXQgdGhlIGFwcHJvcHJpYXRlIHN5bWJvbCB3aGVuIHJldmVhbGVkOlxyXG4gICAgICAgICRkYW5nZXJTcGFuLmh0bWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKSByZXR1cm4gJ+KamSc7IC8vICRDLlVuaWNvZGUuTUlORVxyXG4gICAgICAgICAgICBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSByZXR1cm4gJEMuVW5pY29kZS5GTEFHOyAvLyfimpEnXHJcbiAgICAgICAgICAgIHJldHVybiBzcXVhcmUuZ2V0RGFuZ2VyKCk7XHJcbiAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBkZWNvcmF0ZSA8dGQ+IHdpdGggQ1NTIGNsYXNzZXMgYXBwcm9wcmlhdGUgdG8gc3F1YXJlJ3Mgc3RhdGVcclxuICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NxdWFyZScpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYWRkIHNvbWUgZGF0YS0qIGF0dHJpYnV0ZXMgdG8gcGFzcyBhbG9uZyBvbiBjbGljayBldmVudHNcclxuICAgICAgICAkY2VsbC5kYXRhKCdyb3cnLCBzcXVhcmUuZ2V0Um93KCkpO1xyXG4gICAgICAgICRjZWxsLmRhdGEoJ2NlbGwnLCBzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgLy8gcmV0dXJuIGB0aGlzYCwgc28gdGhpcyBtZXRob2QgY2FuIGJlIGNoYWluZWQgdG8gaXRzIGluaXRpYWxpemF0aW9uIGNhbGxcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZUF0OiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICB2YXIgcm93ID0gdGhpcy5ib2FyZC5nZXQocm93KTtcclxuICAgICAgICByZXR1cm4gKHJvdyAmJiByb3dbMF0gJiYgcm93WzBdW2NlbGxdKSA/IHJvd1swXVtjZWxsXSA6IG51bGw7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmRcclxuICAgICAgICAgICAgICAgIC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwpOyB9LCBbXSlcclxuICAgIH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oc3RyLCByb3csIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN5bWJvbHMgPSB3aXRoRGFuZ2VyID8gcm93Lm1hcChmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuZ2V0RGFuZ2VyKCkgfHwgJyAnOyB9KSA6IHJvdztcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdHIgKz0gc3ltYm9scy5qb2luKCcgICAnKS50b0xvd2VyQ2FzZSgpICsgXCIgICAgICAgW1wiICsgaWR4ICsgXCJdXFxuXCI7XHJcbiAgICAgICAgICAgIH0sICdcXG4nKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlxyXG5mdW5jdGlvbiBNdWx0aW1hcCgpIHtcclxuICAgIHRoaXMuX3RhYmxlID0gW107XHJcbn1cclxuXHJcbk11bHRpbWFwLnByb3RvdHlwZSA9IHtcclxuICAgIGdldDogZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbihyb3csIHZhbCkgeyAodGhpcy5fdGFibGVbcm93XSB8fCAodGhpcy5fdGFibGVbcm93XSA9IFtdKSkucHVzaCh2YWwpOyB9LFxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gX3RoaXMuX3RhYmxlW3Jvd107IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKSB7IHJldHVybiBhY2MuY29uY2F0KGl0ZW0pOyB9LCBbXSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkgeyB0aGlzLl90YWJsZSA9IHt9OyB9LFxyXG4gICAgc2l6ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE11bHRpbWFwOyIsInZhciBCaXRGbGFncyA9IHJlcXVpcmUoJy4vYml0LWZsYWdzJyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyKSB7XHJcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICByZXR1cm4gbmV3IFNxdWFyZShhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5yb3cgPSByb3c7XHJcbiAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgdGhpcy5zdGF0ZSA9IG5ldyBCaXRGbGFncztcclxuICAgIC8vIFRPRE86IGZpeCB0aGlzLmRhbmdlciBkZWZhdWx0LCBnZXQgc3RhdGVzIGZ0b20gY29uc3RhbnRzIChhcyBmbGFncz8pLlxyXG4gICAgdGhpcy5kYW5nZXIgPSBkYW5nZXIgfHwgJy0nO1xyXG59XHJcblxyXG5TcXVhcmUucHJvdG90eXBlID0ge1xyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyB0aGlzLmRhbmdlciA9IGlkeDsgdGhpcy5zdGF0ZS5pbmRleCgpOyB9LFxyXG4gICAgZ2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKFN5bWJvbHMpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBfdGhpcy5zdGF0ZVsnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKV0oKTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihrZXkpIHsgcmV0dXJuIGtleS50b0xvd2VyQ2FzZSgpOyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLmNsb3NlKCk7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5vcGVuKCk7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5mbGFnKCk7IH0sXHJcbiAgICB1bmZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuZmxhZygpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUubWluZSgpOyB9LFxyXG4gICAgaW5kZXg6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLmluZGV4KCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0Nsb3NlZCgpOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKTsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKCk7IH0sXHJcbiAgICBoYXNJbmRleDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmhhc0luZGV4KCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7Il19
;