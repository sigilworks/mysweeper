;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gameboard = require('./gameboard'),
    Modes = require('./constants').Modes,
    PresetLevels = require('./constants').PresetLevels,
    PresetSetups = require('./constants').PresetSetups,

    mineableSpaces = function(dim) { return ~~(Math.pow(dim, 2) * 0.5); },
    disableOption = function($el, undo) {
        if (undo == null) undo = false;
        $el[undo ? 'removeClass' : 'addClass']('disabled');
        $el.find("input").prop('readonly', !undo);
    },
    enableOption = function($el) { return disableOption($el, true); };

$(function(){

    var $possibleMines = $("#mine-count").siblings(".advice").find("span");
    // setting initial value
    $possibleMines.html(mineableSpaces($("#dimensions").attr("placeholder")));

    $("#preset-mode").on('click', function() { enableOption($("ul.preset")); disableOption($("ul.custom")); }).click();
    $("#custom-mode").on('click', function() { enableOption($("ul.custom")); disableOption($("ul.preset")); });

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

    $("output[for=dimensions-range]").html($("#dimensions-range").val() + ' x ' + $("#dimensions-range").val());
    $("#dimensions-range").on("change", function() {
        var val = $(this).val();
        $("output[for=dimensions-range]").html(val + ' x ' + val);

        var oldmax = +$("#mines-range").prop('max') || 1,
            oldval = +$("#mines-range").val(),
            ratio = oldval / oldmax;

        $("#mines-range").prop('max', mineableSpaces(val));
        $("#mines-range").val(~~($("#mines-range").prop('max') * ratio)).change();
    });

    $("output[for=mines-range]").html($("#mines-range").val());
    $("#mines-range").on("change", function() { $("output[for=mines-range]").html($(this).val()); });

    $("form").on("submit", function() {

        var mode = $("[name=mode-select]:checked").val(),
            gameOptions = {};

        if (mode === Modes.PRESET) {
            var level = $("[name=preset-level]:checked").val(),
                setup = Object.keys(PresetLevels)
                              .filter(function(pl) { return PresetLevels[pl] === level; })[0];

            gameOptions.dimensions = PresetSetups[setup].dimensions;
            gameOptions.mines = PresetSetups[setup].mines;
        } else {
            // Modes.CUSTOM...
            gameOptions.dimensions = $("#dimensions").val();
            gameOptions.mines = $("#mine-count").val();
        }

        window.gameboard = new Gameboard(gameOptions).render();

        $("#options-card").hide();
        $("#board-card").fadeIn();

        return false;
    });

});
// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions

},{"./constants":3,"./gameboard":6}],2:[function(require,module,exports){

// @usage var BitFlags = new BitFlagFactory(['F_OPEN', 'F_MINED', 'F_FLAGGED', 'F_INDEXED']); bf = new BitFlags;
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

var Constants = {

	DefaultConfig: { dimensions: 9, mines: 1, board: "#board", debug_mode: true /*false*/ },

	Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

	Flags: 	{ OPEN: 'F_OPEN', MINED: 'F_MINED', FLAGGED: 'F_FLAGGED', INDEXED: 'F_INDEXED' },

	Unicode: { FLAG: 'x', MINE: 'Ä' },

	Modes: { PRESET: "P", CUSTOM: "C" },

    PresetLevels: { BEGINNER: "B", INTERMEDIATE: "I", EXPERT: "E" },

    PresetSetups: {
        BEGINNER: { dimensions: 9, mines: 9 },
        INTERMEDIATE: { dimensions: 12, mines: 21 },
        EXPERT: { dimensions: 15, mines: 67 }
    },

	MessageOverlay: '#flash'
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
    // container for flash messages, such as win/loss of game
    this.flashContainer = $($C.MessageOverlay);
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
        this.$el.off();
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

        if ($(".square:not(.mined)").length === $(".open").length)
            return this._gameWin();
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

            if (neighbor && !neighbor.isMined() && !neighbor.isFlagged() && neighbor.isClosed() && !neighbor.getDanger()) {
                neighbor.open();
                _this.getGridCell(neighbor).removeClass('closed').addClass('open');
                _this._recursiveReveal(neighbor);
            }
        });
    },
    _flashMsg: function(msg) { this.flashContainer.html(msg).show(); },
    _gameWin: function () {
        this._removeEventListeners();
        this.$el.addClass('game-win');
        // TODO: replace with real message
        $log("---  GAME WIN!  ---");
        $log("User moves: %o", this.userMoves)
        this._flashMsg('You Win!');
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
        this._removeEventListeners();
        // TODO: replace with real message
        $log('---  GAME OVER!  ---');
        this._flashMsg('Game Over!');
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            getContents = function(sq) {
                if (sq.isMined()) return $C.Unicode.MINE;//'⚙'; // '&#9873;'; // $C.Unicode.MINE
                if (sq.isFlagged()) return  $C.Unicode.FLAG; //'⚑' // '&9844;'
                return sq.getDanger();
            },
            $dangerSpan = $('<span />', { 'class': 'danger', html: getContents(square) });

        $cell.empty().append($dangerSpan);

        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass(square.getState().join(' '));

        // attach the Square to the data associated with the grid cell
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
    // export serialized state to persist game for later
    export: function() {
        // need gameOptions, metadata on datetime/etc., serialize all squares' states
        return {
            _meta: {
                timestamp: +new Date,
                score: null,
                clock: null,
                transcript: []
            },
            options: {
                board: this.$el.selector,
                squares: JSON.stringify(this.board._table),
                debug_mode: this.debug_mode,
                dimensions: this.dimensions,
                mines: this.mines,
                userMoves: this.userMoves
            }
        };
    },
    toJSON: function() { return this.board.values().join(', '); },
    toConsole: function(withDanger) {
        return this.board.values()
            .reduce(function(str, row, idx) {
                var symbols = (!withDanger) ? row : row.map(function(sq) {
                    return (sq.isMined()) ? '-' : sq.getDanger() || '';
                });
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
var BitFlagFactory = require('./bit-flag-factory'),
    Symbols = require('./constants').Symbols,
    Flags = require('./constants').Flags,

    BitFlags = new BitFlagFactory([ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ]);

function Square(row, cell, danger) {
    if (!(this instanceof Square))
        return new Square(arguments);
    this.row = row;
    this.cell = cell;
    this.state = new BitFlags;
    this.danger = danger;
}

Square.prototype = {
    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    setDanger: function(idx) { this.danger = idx; this.index(); },
    getState: function() {
        var _this = this;
        return Object.keys(Symbols)
                     .filter(function(key) { return _this[ 'is' + key.charAt(0) + key.substring(1).toLowerCase() ](); })
                     .map(function(key) { return key.toLowerCase(); });
    },

    close: function() { this.state.unset(this.state.F_OPEN); },
    open: function() { this.state.set(this.state.F_OPEN); },
    flag: function() { this.state.set(this.state.F_FLAGGED); },
    unflag: function() { this.state.unset(this.state.F_FLAGGED); },
    mine: function() { this.state.set(this.state.F_MINED); },
    index: function() { this.state.set(this.state.F_INDEX); },

    isClosed: function() { return !this.state.isOpen(); },
    isOpen: function() { return this.state.isOpen(); },
    isFlagged: function() { return this.state.isFlagged(); },
    isMined: function() { return this.state.isMined(); },
    isIndexed: function() { return this.state.isIndexed(); },

    toJSON: function() { return { row: this.row, cell: this.cell, state: this.state, danger: this.danger } },
    toString: function() { return this.state.isMined()
            ? Symbols.MINED : this.state.isFlagged()
                ? Symbols.FLAGGED : this.state.isOpen()
                    ? Symbols.OPEN : Symbols.CLOSED;
    }
};

module.exports = Square;
},{"./bit-flag-factory":2,"./constants":3}]},{},[1,2,4,5,3,7,6,8])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbXVsdGltYXAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zcXVhcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcblxyXG4gICAgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIH5+KE1hdGgucG93KGRpbSwgMikgKiAwLjUpOyB9LFxyXG4gICAgZGlzYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCwgdW5kbykge1xyXG4gICAgICAgIGlmICh1bmRvID09IG51bGwpIHVuZG8gPSBmYWxzZTtcclxuICAgICAgICAkZWxbdW5kbyA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnXSgnZGlzYWJsZWQnKTtcclxuICAgICAgICAkZWwuZmluZChcImlucHV0XCIpLnByb3AoJ3JlYWRvbmx5JywgIXVuZG8pO1xyXG4gICAgfSxcclxuICAgIGVuYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCkgeyByZXR1cm4gZGlzYWJsZU9wdGlvbigkZWwsIHRydWUpOyB9O1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cclxuICAgIHZhciAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIik7XHJcbiAgICAvLyBzZXR0aW5nIGluaXRpYWwgdmFsdWVcclxuICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSkpO1xyXG5cclxuICAgICQoXCIjcHJlc2V0LW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKFwidWwucHJlc2V0XCIpKTsgZGlzYWJsZU9wdGlvbigkKFwidWwuY3VzdG9tXCIpKTsgfSkuY2xpY2soKTtcclxuICAgICQoXCIjY3VzdG9tLW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKFwidWwuY3VzdG9tXCIpKTsgZGlzYWJsZU9wdGlvbigkKFwidWwucHJlc2V0XCIpKTsgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcIm91dHB1dFtmb3I9ZGltZW5zaW9ucy1yYW5nZV1cIikuaHRtbCgkKFwiI2RpbWVuc2lvbnMtcmFuZ2VcIikudmFsKCkgKyAnIHggJyArICQoXCIjZGltZW5zaW9ucy1yYW5nZVwiKS52YWwoKSk7XHJcbiAgICAkKFwiI2RpbWVuc2lvbnMtcmFuZ2VcIikub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIHZhbCA9ICQodGhpcykudmFsKCk7XHJcbiAgICAgICAgJChcIm91dHB1dFtmb3I9ZGltZW5zaW9ucy1yYW5nZV1cIikuaHRtbCh2YWwgKyAnIHggJyArIHZhbCk7XHJcblxyXG4gICAgICAgIHZhciBvbGRtYXggPSArJChcIiNtaW5lcy1yYW5nZVwiKS5wcm9wKCdtYXgnKSB8fCAxLFxyXG4gICAgICAgICAgICBvbGR2YWwgPSArJChcIiNtaW5lcy1yYW5nZVwiKS52YWwoKSxcclxuICAgICAgICAgICAgcmF0aW8gPSBvbGR2YWwgLyBvbGRtYXg7XHJcblxyXG4gICAgICAgICQoXCIjbWluZXMtcmFuZ2VcIikucHJvcCgnbWF4JywgbWluZWFibGVTcGFjZXModmFsKSk7XHJcbiAgICAgICAgJChcIiNtaW5lcy1yYW5nZVwiKS52YWwofn4oJChcIiNtaW5lcy1yYW5nZVwiKS5wcm9wKCdtYXgnKSAqIHJhdGlvKSkuY2hhbmdlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwib3V0cHV0W2Zvcj1taW5lcy1yYW5nZV1cIikuaHRtbCgkKFwiI21pbmVzLXJhbmdlXCIpLnZhbCgpKTtcclxuICAgICQoXCIjbWluZXMtcmFuZ2VcIikub24oXCJjaGFuZ2VcIiwgZnVuY3Rpb24oKSB7ICQoXCJvdXRwdXRbZm9yPW1pbmVzLXJhbmdlXVwiKS5odG1sKCQodGhpcykudmFsKCkpOyB9KTtcclxuXHJcbiAgICAkKFwiZm9ybVwiKS5vbihcInN1Ym1pdFwiLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIG1vZGUgPSAkKFwiW25hbWU9bW9kZS1zZWxlY3RdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIGlmIChtb2RlID09PSBNb2Rlcy5QUkVTRVQpIHtcclxuICAgICAgICAgICAgdmFyIGxldmVsID0gJChcIltuYW1lPXByZXNldC1sZXZlbF06Y2hlY2tlZFwiKS52YWwoKSxcclxuICAgICAgICAgICAgICAgIHNldHVwID0gT2JqZWN0LmtleXMoUHJlc2V0TGV2ZWxzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHBsKSB7IHJldHVybiBQcmVzZXRMZXZlbHNbcGxdID09PSBsZXZlbDsgfSlbMF07XHJcblxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gUHJlc2V0U2V0dXBzW3NldHVwXS5kaW1lbnNpb25zO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9IFByZXNldFNldHVwc1tzZXR1cF0ubWluZXM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gTW9kZXMuQ1VTVE9NLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmRpbWVuc2lvbnMgPSAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCk7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnZhbCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG4vLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIC5zcXVhcmU6XHJcbiAgICAvLyB2YXIgbmV3RGltID0gKCgwLjk1ICogJCh3aW5kb3cpLmhlaWdodCgpKSArIDY2KSAvIDIwO1xyXG4gICAgLy8gJCgnLnNxdWFyZScpLmNzcyh7IGhlaWdodDogbmV3RGltLCB3aWR0aDogbmV3RGltIH0pO1xyXG4vLyAoMC45NSAqICQod2luZG93KS5oZWlnaHQoKSArIDY2KSAvIHRoaXMuZGltZW5zaW9uc1xyXG4iLCJcclxuLy8gQHVzYWdlIHZhciBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbJ0ZfT1BFTicsICdGX01JTkVEJywgJ0ZfRkxBR0dFRCcsICdGX0lOREVYRUQnXSk7IGJmID0gbmV3IEJpdEZsYWdzO1xyXG5mdW5jdGlvbiBCaXRGbGFnRmFjdG9yeShhcmdzKSB7XHJcblxyXG4gICAgdmFyIGJpblRvRGVjID0gZnVuY3Rpb24oc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9LFxyXG4gICAgICAgIGRlY1RvQmluID0gZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0udG9TdHJpbmcoMik7IH0sXHJcbiAgICAgICAgYnVpbGRTdGF0ZSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5yZXZlcnNlKCkuam9pbignJykpOyB9LFxyXG4gICAgICAgIHBhZCA9IGZ1bmN0aW9uIChzdHIsIG1heCkge1xyXG4gICAgICAgICAgbWF4IHx8IChtYXggPSA0IC8qIHRoaXMuREVGQVVMVF9TSVpFLmxlbmd0aCAqLyk7XHJcbiAgICAgICAgICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKHZhciBhY2M9W107IGRpZmYgPiAwOyBhY2NbLS1kaWZmXSA9ICcwJykge31cclxuICAgICAgICAgIHJldHVybiBhY2Muam9pbignJykgKyBzdHI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZCA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5oYXModGhpc1tuYW1lXSk7IH0gfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIGlmICh+bmFtZS5pbmRleE9mKCdfJykpXHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcobmFtZS5pbmRleE9mKCdfJykgKyAxKTtcclxuICAgICAgICAgICAgcmV0dXJuICdpcycgKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTdGF0ZXMgPSBmdW5jdGlvbihhcmdzLCBwcm90bykge1xyXG4gICAgICAgICAgICBpZiAoIWFyZ3MubGVuZ3RoKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBwcm90by5fc3RhdGVzID0gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1hcmdzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmxhZ05hbWUgPSBTdHJpbmcoYXJnc1tpXSkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICBjbHNOYW1lID0gZmxhZ05hbWUudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgucG93KDIsIGkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kTmFtZSA9IGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZShjbHNOYW1lKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZCA9IGNyZWF0ZVF1ZXJ5TWV0aG9kKGZsYWdOYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwcm90b1tmbGFnTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHByb3RvLl9zdGF0ZXNbaV0gPSBjbHNOYW1lO1xyXG4gICAgICAgICAgICAgICAgcHJvdG9bcXVlcnlNZXRob2ROYW1lXSA9IHF1ZXJ5TWV0aG9kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByb3RvLkRFRkFVTFRfU1RBVEUgPSBwYWQoJycsIGkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gQml0RmxhZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5fZmxhZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgICA/IGJ1aWxkU3RhdGUoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKVxyXG4gICAgICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxuICAgIH1cclxuXHJcbiAgICBCaXRGbGFncy5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgY29uc3RydWN0b3I6IEJpdEZsYWdzLFxyXG4gICAgICAgIGhhczogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gISEoYmluVG9EZWModGhpcy5fZmxhZ3MpICYgZmxhZyk7IH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgfCBmbGFnKSk7IH0sXHJcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIH5mbGFnKSk7IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlxyXG52YXIgQ29uc3RhbnRzID0ge1xyXG5cclxuXHREZWZhdWx0Q29uZmlnOiB7IGRpbWVuc2lvbnM6IDksIG1pbmVzOiAxLCBib2FyZDogXCIjYm9hcmRcIiwgZGVidWdfbW9kZTogdHJ1ZSAvKmZhbHNlKi8gfSxcclxuXHJcblx0U3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcblx0RmxhZ3M6IFx0eyBPUEVOOiAnRl9PUEVOJywgTUlORUQ6ICdGX01JTkVEJywgRkxBR0dFRDogJ0ZfRkxBR0dFRCcsIElOREVYRUQ6ICdGX0lOREVYRUQnIH0sXHJcblxyXG5cdFVuaWNvZGU6IHsgRkxBRzogJ3gnLCBNSU5FOiAnw4QnIH0sXHJcblxyXG5cdE1vZGVzOiB7IFBSRVNFVDogXCJQXCIsIENVU1RPTTogXCJDXCIgfSxcclxuXHJcbiAgICBQcmVzZXRMZXZlbHM6IHsgQkVHSU5ORVI6IFwiQlwiLCBJTlRFUk1FRElBVEU6IFwiSVwiLCBFWFBFUlQ6IFwiRVwiIH0sXHJcblxyXG4gICAgUHJlc2V0U2V0dXBzOiB7XHJcbiAgICAgICAgQkVHSU5ORVI6IHsgZGltZW5zaW9uczogOSwgbWluZXM6IDkgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6IHsgZGltZW5zaW9uczogMTIsIG1pbmVzOiAyMSB9LFxyXG4gICAgICAgIEVYUEVSVDogeyBkaW1lbnNpb25zOiAxNSwgbWluZXM6IDY3IH1cclxuICAgIH0sXHJcblxyXG5cdE1lc3NhZ2VPdmVybGF5OiAnI2ZsYXNoJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbXVsdGltYXAnKSxcclxuICAgIERhbmdlckNhbGN1bGF0b3IgPSByZXF1aXJlKCcuL2Rhbmdlci1jYWxjdWxhdG9yJyksXHJcbiAgICBTcXVhcmUgPSByZXF1aXJlKCcuL3NxdWFyZScpLFxyXG4gICAgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8ICRDLkRlZmF1bHRDb25maWcuZGltZW5zaW9ucztcclxuICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICB0aGlzLm1pbmVzID0gK29wdGlvbnMubWluZXMgfHwgJEMuRGVmYXVsdENvbmZpZy5taW5lcztcclxuICAgIC8vIHRoZSBET00gZWxlbWVudCBvZiB0aGUgdGFibGUgc2VydmluZyBhcyB0aGUgYm9hcmRcclxuICAgIHRoaXMuJGVsID0gJChvcHRpb25zLmJvYXJkIHx8ICRDLkRlZmF1bHRDb25maWcuYm9hcmQpO1xyXG4gICAgLy8gc2VsZWN0aXZlbHkgZW5hYmxlIGRlYnVnIG1vZGUgZm9yIGNvbnNvbGUgdmlzdWFsaXphdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgIHRoaXMuZGVidWdfbW9kZSA9IG9wdGlvbnMuZGVidWdfbW9kZSB8fCAkQy5EZWZhdWx0Q29uZmlnLmRlYnVnX21vZGU7XHJcbiAgICAkbG9nLmRlYnVnX21vZGUgPSB0aGlzLmRlYnVnX21vZGU7XHJcbiAgICAvLyBjb250YWluZXIgZm9yIGZsYXNoIG1lc3NhZ2VzLCBzdWNoIGFzIHdpbi9sb3NzIG9mIGdhbWVcclxuICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKCRDLk1lc3NhZ2VPdmVybGF5KTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG59XHJcblxyXG5HYW1lYm9hcmQucHJvdG90eXBlID0ge1xyXG5cclxuICAgIC8vIFwiUFJJVkFURVwiIE1FVEhPRFM6XHJcbiAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBwcmVmaWxsIHNxdWFyZXMgdG8gcmVxdWlyZWQgZGltZW5zaW9ucy4uLlxyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgJGxvZyhcIkcgQSBNIEUgQiBPIEEgUiBEXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUoKSk7XHJcbiAgICAgICAgJGxvZyhcIk0gSSBOIEUgIFAgTCBBIEMgRSBNIEUgTiBUIFNcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSh0cnVlKSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIHJuZCA9IE1hdGgucmFuZG9tKCkgKiAoTWF0aC5wb3coZGltZW5zaW9ucywgMikpIHwgMCxcclxuICAgICAgICAgICAgICAgIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBzcXVhcmUgPSB0aGlzLmdldFNxdWFyZUF0KHJvdywgY2VsbCk7XHJcbiAgICAgICAgICAgIHNxdWFyZS5taW5lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcihfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIic+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwoc3F1YXJlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNGbGFnZ2VkKCkpXHJcbiAgICAgICAgICAgICRsb2coXCJoYW5kbGUgZmxhZ2dlZCBzaXR1YXRpb24uLi5cIilcclxuICAgICAgICAgICAgLy8gVE9ETzogcmVtb3ZlIHRoaXM/XHJcblxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG5cclxuICAgICAgICBpZiAoJChcIi5zcXVhcmU6bm90KC5taW5lZClcIikubGVuZ3RoID09PSAkKFwiLm9wZW5cIikubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuICAgICAgICAvLyBUT0RPOiBmaXggcmlnaHQtY2xpY2tzXHJcbiAgICAgICAgJGxvZyhcIiRjZWxsOiAlbywgc3F1YXJlOiAlb1wiLCAkY2VsbCwgc3F1YXJlKVxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdmbGFnZ2VkJyk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnZmxhZ2dlZCcpLmFkZENsYXNzKCdjbG9zZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAvLyBiYXNlZCBvbiBgc291cmNlYCBzcXVhcmUsIHdhbGsgYW5kIHJlY3Vyc2l2ZWx5IHJldmVhbCBjb25uZWN0ZWQgc3BhY2VzXHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kKSxcclxuICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICBjZWxsID0gc291cmNlLmdldENlbGwoKSxcclxuICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmICFuZWlnaGJvci5pc0ZsYWdnZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpICYmICFuZWlnaGJvci5nZXREYW5nZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3Iub3BlbigpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ2V0R3JpZENlbGwobmVpZ2hib3IpLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfZmxhc2hNc2c6IGZ1bmN0aW9uKG1zZykgeyB0aGlzLmZsYXNoQ29udGFpbmVyLmh0bWwobXNnKS5zaG93KCk7IH0sXHJcbiAgICBfZ2FtZVdpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgLy8gVE9ETzogcmVwbGFjZSB3aXRoIHJlYWwgbWVzc2FnZVxyXG4gICAgICAgICRsb2coXCItLS0gIEdBTUUgV0lOISAgLS0tXCIpO1xyXG4gICAgICAgICRsb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgICAgICB0aGlzLl9mbGFzaE1zZygnWW91IFdpbiEnKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihmKSB7IF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpOyB9KTtcclxuICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICB0aGlzLiRlbC5maW5kKCcubWluZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgIHRoaXMuJGVsLmZpbmQoJy5jbG9zZWQsIC5mbGFnZ2VkJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICB0aGlzLl9yZW1vdmVFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIC8vIFRPRE86IHJlcGxhY2Ugd2l0aCByZWFsIG1lc3NhZ2VcclxuICAgICAgICAkbG9nKCctLS0gIEdBTUUgT1ZFUiEgIC0tLScpO1xyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKCdHYW1lIE92ZXIhJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNNaW5lZCgpKSByZXR1cm4gJEMuVW5pY29kZS5NSU5FOy8vJ+KamSc7IC8vICcmIzk4NzM7JzsgLy8gJEMuVW5pY29kZS5NSU5FXHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiAgJEMuVW5pY29kZS5GTEFHOyAvLyfimpEnIC8vICcmOTg0NDsnXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3EuZ2V0RGFuZ2VyKCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiBnZXRDb250ZW50cyhzcXVhcmUpIH0pO1xyXG5cclxuICAgICAgICAkY2VsbC5lbXB0eSgpLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcblxyXG4gICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKClcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnc3F1YXJlJylcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS5qb2luKCcgJykpO1xyXG5cclxuICAgICAgICAvLyBhdHRhY2ggdGhlIFNxdWFyZSB0byB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIGdyaWQgY2VsbFxyXG4gICAgICAgICRjZWxsLmRhdGEoJ3NxdWFyZScsIHNxdWFyZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFwiUFVCTElDXCIgTUVUSE9EU1xyXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAvLyByZXR1cm4gYHRoaXNgLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmUgY2hhaW5lZCB0byBpdHMgaW5pdGlhbGl6YXRpb24gY2FsbFxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldEdyaWRDZWxsOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgIC5maW5kKCd0ZCcpXHJcbiAgICAgICAgICAgICAgICAuZXEoc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlQXQ6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgIHZhciByb3cgPSB0aGlzLmJvYXJkLmdldChyb3cpO1xyXG4gICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgLnZhbHVlcygpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbCk7IH0sIFtdKVxyXG4gICAgfSxcclxuICAgIC8vIGV4cG9ydCBzZXJpYWxpemVkIHN0YXRlIHRvIHBlcnNpc3QgZ2FtZSBmb3IgbGF0ZXJcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbmVlZCBnYW1lT3B0aW9ucywgbWV0YWRhdGEgb24gZGF0ZXRpbWUvZXRjLiwgc2VyaWFsaXplIGFsbCBzcXVhcmVzJyBzdGF0ZXNcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBfbWV0YToge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiArbmV3IERhdGUsXHJcbiAgICAgICAgICAgICAgICBzY29yZTogbnVsbCxcclxuICAgICAgICAgICAgICAgIGNsb2NrOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdDogW11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgYm9hcmQ6IHRoaXMuJGVsLnNlbGVjdG9yLFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlczogSlNPTi5zdHJpbmdpZnkodGhpcy5ib2FyZC5fdGFibGUpLFxyXG4gICAgICAgICAgICAgICAgZGVidWdfbW9kZTogdGhpcy5kZWJ1Z19tb2RlLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczogdGhpcy5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgbWluZXM6IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgICAgICB1c2VyTW92ZXM6IHRoaXMudXNlck1vdmVzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpLmpvaW4oJywgJyk7IH0sXHJcbiAgICB0b0NvbnNvbGU6IGZ1bmN0aW9uKHdpdGhEYW5nZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzeW1ib2xzID0gKCF3aXRoRGFuZ2VyKSA/IHJvdyA6IHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSkgPyAnLScgOiBzcS5nZXREYW5nZXIoKSB8fCAnJztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBzeW1ib2xzLmpvaW4oJyAgICcpLnRvTG93ZXJDYXNlKCkgKyBcIiAgICAgICBbXCIgKyBpZHggKyBcIl1cXG5cIjtcclxuICAgICAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lYm9hcmQ7IiwiXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuTXVsdGltYXAucHJvdG90eXBlID0ge1xyXG4gICAgZ2V0OiBmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihmbikgeyByZXR1cm4gW10uZm9yRWFjaC5jYWxsKHRoaXMudmFsdWVzKCksIGZuKTsgfSxcclxuICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiBfdGhpcy5fdGFibGVbcm93XTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH0sXHJcbiAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwidmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9iaXQtZmxhZy1mYWN0b3J5JyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzLFxyXG4gICAgRmxhZ3MgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkZsYWdzLFxyXG5cclxuICAgIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsgRmxhZ3MuT1BFTiwgRmxhZ3MuTUlORUQsIEZsYWdzLkZMQUdHRUQsIEZsYWdzLklOREVYRUQgXSk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIpIHtcclxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcXVhcmUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgU3F1YXJlKGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XHJcbiAgICB0aGlzLnN0YXRlID0gbmV3IEJpdEZsYWdzO1xyXG4gICAgdGhpcy5kYW5nZXIgPSBkYW5nZXI7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBnZXRSb3c6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yb3c7IH0sXHJcbiAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgIGdldERhbmdlcjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmRhbmdlcjsgfSxcclxuICAgIHNldERhbmdlcjogZnVuY3Rpb24oaWR4KSB7IHRoaXMuZGFuZ2VyID0gaWR4OyB0aGlzLmluZGV4KCk7IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gIXRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKTsgfSxcclxuICAgIGlzSW5kZXhlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzSW5kZXhlZCgpOyB9LFxyXG5cclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IHJvdzogdGhpcy5yb3csIGNlbGw6IHRoaXMuY2VsbCwgc3RhdGU6IHRoaXMuc3RhdGUsIGRhbmdlcjogdGhpcy5kYW5nZXIgfSB9LFxyXG4gICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKClcclxuICAgICAgICAgICAgPyBTeW1ib2xzLk1JTkVEIDogdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKVxyXG4gICAgICAgICAgICAgICAgPyBTeW1ib2xzLkZMQUdHRUQgOiB0aGlzLnN0YXRlLmlzT3BlbigpXHJcbiAgICAgICAgICAgICAgICAgICAgPyBTeW1ib2xzLk9QRU4gOiBTeW1ib2xzLkNMT1NFRDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3F1YXJlOyJdfQ==
;