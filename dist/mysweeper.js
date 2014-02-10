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

    $.each($("label[for=level-beginner],label[for=level-intermediate],label[for=level-expert]"), function(_, label) {
        var level = $(label).attr('for').substring('level-'.length).toUpperCase(),
            dims = PresetSetups[level].dimensions,
            mines = PresetSetups[level].mines,
            $advice = $(label).find('.advice');
        $advice.html(" (" + dims + " x " + dims + ", " + mines + " mines)");
    });

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

        $("#mines-display > span").html(gameOptions.dimensions);

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
        BEGINNER: 		{ dimensions:  9, mines:  9 },
        INTERMEDIATE: 	{ dimensions: 12, mines: 21 },
        EXPERT: 		{ dimensions: 15, mines: 67 }
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
    Serializer = require('./serializer'),
    $C = require('./constants'),
    DEFAULT_GAME_OPTIONS = require('./constants').DefaultConfig;

// wrapper around `$log`, to toggle dev mode debugging
var $log = function $log() { if ($log.debug_mode || false) console.log.apply(console, arguments); }

function Gameboard(options) {
    // the map, serving as the internal represenation of the gameboard
    this.board = new Multimap;
    // the dimensions of the board when rendered
    this.dimensions = +options.dimensions || DEFAULT_GAME_OPTIONS.dimensions;
    // the number of mines the user has selected
    this.mines = +options.mines || DEFAULT_GAME_OPTIONS.mines;
    // the DOM element of the table serving as the board
    this.$el = $(options.board || DEFAULT_GAME_OPTIONS.board);
    // selectively enable debug mode for console visualizations and notifications
    this.debug_mode = options.debug_mode || DEFAULT_GAME_OPTIONS.debug_mode;
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

        if (square.isClosed() && !square.isFlagged()) {
            square.flag();
            this._renderSquare(square);
            $cell.removeClass('closed').addClass('flagged');
        } else if (square.isFlagged()) {
            square.close();
            square.unflag();
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

            if (neighbor && !neighbor.isMined() && !neighbor.isFlagged() && neighbor.isClosed()) {
                neighbor.open();
                _this.getGridCell(neighbor).removeClass('closed').addClass('open');
                if (!neighbor.getDanger() || !neighbor.getDanger() > 0)
                    _this._recursiveReveal(neighbor);
            }
        });
    },
    _flashMsg: function(msg, isAlert) {
        this.flashContainer
                .addClass(isAlert ? 'game-over' : 'game-win')
                .html(msg)
                .show();
    },
    _gameWin: function () {
        this._removeEventListeners();
        this.$el.addClass('game-win');
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');
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
        $log("this.$el: %o", this.$el)
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');

        this._removeEventListeners();

        // put up 'Game Over' banner
        $log('---  GAME OVER!  ---');
        this._flashMsg('Game Over!', true);
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            getContents = function(sq) {
                if (sq.isFlagged()) return $C.Unicode.FLAG;
                if (sq.isMined()) return $C.Unicode.MINE;
                return sq.getDanger() !== 0 ? sq.getDanger() : '';
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
        return Serializer.export(this);
    },
    toJSON: function() { return this.board.values().join(', '); },
    toConsole: function(withDanger) {
        return this.board.values()
            .reduce(function(str, row, idx) {
                var symbols = (!withDanger) ? row : row.map(function(sq) {
                    return (sq.isMined()) ? '-' : sq.getDanger() === 0 ? ' ' : sq.getDanger();
                });
                return str += symbols.join('   ').toLowerCase() + "       [" + idx + "]\n";
            }, '\n');
    }
};

module.exports = Gameboard;
},{"./constants":3,"./danger-calculator":4,"./multimap":7,"./serializer":8,"./square":9}],7:[function(require,module,exports){

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

var Serializer = {
    export: function(gameboard) {
        return {
            _meta: {
                timestamp: +new Date,
                score: null,
                clock: null,
                transcript: []
            },
            options: {
                board: gameboard.$el.selector,
                squares: JSON.stringify(gameboard.board._table),
                debug_mode: gameboard.debug_mode,
                dimensions: gameboard.dimensions,
                mines: gameboard.mines,
                userMoves: gameboard.userMoves
            }
        };
    }
}
module.exports = Serializer;
},{}],9:[function(require,module,exports){
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
    this.danger = (danger == +danger) ? +danger : void 0;
}

Square.prototype = {
    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    setDanger: function(idx) { if (idx == +idx) { this.danger = +idx; this.index(); } },
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
    index: function() { this.state.set(this.state.F_INDEXED); },

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
},{"./bit-flag-factory":2,"./constants":3}]},{},[1,2,4,3,6,7,5,9,8])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbXVsdGltYXAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEdhbWVib2FyZCA9IHJlcXVpcmUoJy4vZ2FtZWJvYXJkJyksXHJcbiAgICBNb2RlcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9kZXMsXHJcbiAgICBQcmVzZXRMZXZlbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldExldmVscyxcclxuICAgIFByZXNldFNldHVwcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0U2V0dXBzLFxyXG5cclxuICAgIG1pbmVhYmxlU3BhY2VzID0gZnVuY3Rpb24oZGltKSB7IHJldHVybiB+fihNYXRoLnBvdyhkaW0sIDIpICogMC41KTsgfSxcclxuICAgIGRpc2FibGVPcHRpb24gPSBmdW5jdGlvbigkZWwsIHVuZG8pIHtcclxuICAgICAgICBpZiAodW5kbyA9PSBudWxsKSB1bmRvID0gZmFsc2U7XHJcbiAgICAgICAgJGVsW3VuZG8gPyAncmVtb3ZlQ2xhc3MnIDogJ2FkZENsYXNzJ10oJ2Rpc2FibGVkJyk7XHJcbiAgICAgICAgJGVsLmZpbmQoXCJpbnB1dFwiKS5wcm9wKCdyZWFkb25seScsICF1bmRvKTtcclxuICAgIH0sXHJcbiAgICBlbmFibGVPcHRpb24gPSBmdW5jdGlvbigkZWwpIHsgcmV0dXJuIGRpc2FibGVPcHRpb24oJGVsLCB0cnVlKTsgfTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICB2YXIgJHBvc3NpYmxlTWluZXMgPSAkKFwiI21pbmUtY291bnRcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpO1xyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChcInVsLnByZXNldFwiKSk7IGRpc2FibGVPcHRpb24oJChcInVsLmN1c3RvbVwiKSk7IH0pLmNsaWNrKCk7XHJcbiAgICAkKFwiI2N1c3RvbS1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChcInVsLmN1c3RvbVwiKSk7IGRpc2FibGVPcHRpb24oJChcInVsLnByZXNldFwiKSk7IH0pO1xyXG5cclxuICAgICQuZWFjaCgkKFwibGFiZWxbZm9yPWxldmVsLWJlZ2lubmVyXSxsYWJlbFtmb3I9bGV2ZWwtaW50ZXJtZWRpYXRlXSxsYWJlbFtmb3I9bGV2ZWwtZXhwZXJ0XVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pWzBdO1xyXG5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgICQoXCIjbWluZXMtZGlzcGxheSA+IHNwYW5cIikuaHRtbChnYW1lT3B0aW9ucy5kaW1lbnNpb25zKTtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbn0pO1xyXG4vLyBzZXQgd2lkdGgvaGVpZ2h0IG9mIC5zcXVhcmU6XHJcbiAgICAvLyB2YXIgbmV3RGltID0gKCgwLjk1ICogJCh3aW5kb3cpLmhlaWdodCgpKSArIDY2KSAvIDIwO1xyXG4gICAgLy8gJCgnLnNxdWFyZScpLmNzcyh7IGhlaWdodDogbmV3RGltLCB3aWR0aDogbmV3RGltIH0pO1xyXG4vLyAoMC45NSAqICQod2luZG93KS5oZWlnaHQoKSArIDY2KSAvIHRoaXMuZGltZW5zaW9uc1xyXG4iLCJcclxuLy8gQHVzYWdlIHZhciBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbJ0ZfT1BFTicsICdGX01JTkVEJywgJ0ZfRkxBR0dFRCcsICdGX0lOREVYRUQnXSk7IGJmID0gbmV3IEJpdEZsYWdzO1xyXG5mdW5jdGlvbiBCaXRGbGFnRmFjdG9yeShhcmdzKSB7XHJcblxyXG4gICAgdmFyIGJpblRvRGVjID0gZnVuY3Rpb24oc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9LFxyXG4gICAgICAgIGRlY1RvQmluID0gZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0udG9TdHJpbmcoMik7IH0sXHJcbiAgICAgICAgYnVpbGRTdGF0ZSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5yZXZlcnNlKCkuam9pbignJykpOyB9LFxyXG4gICAgICAgIHBhZCA9IGZ1bmN0aW9uIChzdHIsIG1heCkge1xyXG4gICAgICAgICAgbWF4IHx8IChtYXggPSA0IC8qIHRoaXMuREVGQVVMVF9TSVpFLmxlbmd0aCAqLyk7XHJcbiAgICAgICAgICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKHZhciBhY2M9W107IGRpZmYgPiAwOyBhY2NbLS1kaWZmXSA9ICcwJykge31cclxuICAgICAgICAgIHJldHVybiBhY2Muam9pbignJykgKyBzdHI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZCA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5oYXModGhpc1tuYW1lXSk7IH0gfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIGlmICh+bmFtZS5pbmRleE9mKCdfJykpXHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcobmFtZS5pbmRleE9mKCdfJykgKyAxKTtcclxuICAgICAgICAgICAgcmV0dXJuICdpcycgKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTdGF0ZXMgPSBmdW5jdGlvbihhcmdzLCBwcm90bykge1xyXG4gICAgICAgICAgICBpZiAoIWFyZ3MubGVuZ3RoKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBwcm90by5fc3RhdGVzID0gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1hcmdzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmxhZ05hbWUgPSBTdHJpbmcoYXJnc1tpXSkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICBjbHNOYW1lID0gZmxhZ05hbWUudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgucG93KDIsIGkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kTmFtZSA9IGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZShjbHNOYW1lKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZCA9IGNyZWF0ZVF1ZXJ5TWV0aG9kKGZsYWdOYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwcm90b1tmbGFnTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHByb3RvLl9zdGF0ZXNbaV0gPSBjbHNOYW1lO1xyXG4gICAgICAgICAgICAgICAgcHJvdG9bcXVlcnlNZXRob2ROYW1lXSA9IHF1ZXJ5TWV0aG9kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByb3RvLkRFRkFVTFRfU1RBVEUgPSBwYWQoJycsIGkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gQml0RmxhZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5fZmxhZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgICA/IGJ1aWxkU3RhdGUoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKVxyXG4gICAgICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxuICAgIH1cclxuXHJcbiAgICBCaXRGbGFncy5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgY29uc3RydWN0b3I6IEJpdEZsYWdzLFxyXG4gICAgICAgIGhhczogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gISEoYmluVG9EZWModGhpcy5fZmxhZ3MpICYgZmxhZyk7IH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgfCBmbGFnKSk7IH0sXHJcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIH5mbGFnKSk7IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlxyXG52YXIgQ29uc3RhbnRzID0ge1xyXG5cclxuXHREZWZhdWx0Q29uZmlnOiB7IGRpbWVuc2lvbnM6IDksIG1pbmVzOiAxLCBib2FyZDogXCIjYm9hcmRcIiwgZGVidWdfbW9kZTogdHJ1ZSAvKmZhbHNlKi8gfSxcclxuXHJcblx0U3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcblx0RmxhZ3M6IFx0eyBPUEVOOiAnRl9PUEVOJywgTUlORUQ6ICdGX01JTkVEJywgRkxBR0dFRDogJ0ZfRkxBR0dFRCcsIElOREVYRUQ6ICdGX0lOREVYRUQnIH0sXHJcblxyXG5cdFVuaWNvZGU6IHsgRkxBRzogJ3gnLCBNSU5FOiAnw4QnIH0sXHJcblxyXG5cdE1vZGVzOiB7IFBSRVNFVDogXCJQXCIsIENVU1RPTTogXCJDXCIgfSxcclxuXHJcbiAgICBQcmVzZXRMZXZlbHM6IHsgQkVHSU5ORVI6IFwiQlwiLCBJTlRFUk1FRElBVEU6IFwiSVwiLCBFWFBFUlQ6IFwiRVwiIH0sXHJcblxyXG4gICAgUHJlc2V0U2V0dXBzOiB7XHJcbiAgICAgICAgQkVHSU5ORVI6IFx0XHR7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDkgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6IFx0eyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxIH0sXHJcbiAgICAgICAgRVhQRVJUOiBcdFx0eyBkaW1lbnNpb25zOiAxNSwgbWluZXM6IDY3IH1cclxuICAgIH0sXHJcblxyXG5cdE1lc3NhZ2VPdmVybGF5OiAnI2ZsYXNoJ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbXVsdGltYXAnKSxcclxuICAgIERhbmdlckNhbGN1bGF0b3IgPSByZXF1aXJlKCcuL2Rhbmdlci1jYWxjdWxhdG9yJyksXHJcbiAgICBTcXVhcmUgPSByZXF1aXJlKCcuL3NxdWFyZScpLFxyXG4gICAgU2VyaWFsaXplciA9IHJlcXVpcmUoJy4vc2VyaWFsaXplcicpLFxyXG4gICAgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWc7XHJcblxyXG4vLyB3cmFwcGVyIGFyb3VuZCBgJGxvZ2AsIHRvIHRvZ2dsZSBkZXYgbW9kZSBkZWJ1Z2dpbmdcclxudmFyICRsb2cgPSBmdW5jdGlvbiAkbG9nKCkgeyBpZiAoJGxvZy5kZWJ1Z19tb2RlIHx8IGZhbHNlKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9XHJcblxyXG5mdW5jdGlvbiBHYW1lYm9hcmQob3B0aW9ucykge1xyXG4gICAgLy8gdGhlIG1hcCwgc2VydmluZyBhcyB0aGUgaW50ZXJuYWwgcmVwcmVzZW5hdGlvbiBvZiB0aGUgZ2FtZWJvYXJkXHJcbiAgICB0aGlzLmJvYXJkID0gbmV3IE11bHRpbWFwO1xyXG4gICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtvcHRpb25zLmRpbWVuc2lvbnMgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGltZW5zaW9ucztcclxuICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICB0aGlzLm1pbmVzID0gK29wdGlvbnMubWluZXMgfHwgREVGQVVMVF9HQU1FX09QVElPTlMubWluZXM7XHJcbiAgICAvLyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIHRhYmxlIHNlcnZpbmcgYXMgdGhlIGJvYXJkXHJcbiAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5ib2FyZCB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5ib2FyZCk7XHJcbiAgICAvLyBzZWxlY3RpdmVseSBlbmFibGUgZGVidWcgbW9kZSBmb3IgY29uc29sZSB2aXN1YWxpemF0aW9ucyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgdGhpcy5kZWJ1Z19tb2RlID0gb3B0aW9ucy5kZWJ1Z19tb2RlIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRlYnVnX21vZGU7XHJcbiAgICAkbG9nLmRlYnVnX21vZGUgPSB0aGlzLmRlYnVnX21vZGU7XHJcbiAgICAvLyBjb250YWluZXIgZm9yIGZsYXNoIG1lc3NhZ2VzLCBzdWNoIGFzIHdpbi9sb3NzIG9mIGdhbWVcclxuICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKCRDLk1lc3NhZ2VPdmVybGF5KTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG59XHJcblxyXG5HYW1lYm9hcmQucHJvdG90eXBlID0ge1xyXG5cclxuICAgIC8vIFwiUFJJVkFURVwiIE1FVEhPRFM6XHJcbiAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBwcmVmaWxsIHNxdWFyZXMgdG8gcmVxdWlyZWQgZGltZW5zaW9ucy4uLlxyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgJGxvZyhcIkcgQSBNIEUgQiBPIEEgUiBEXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUoKSk7XHJcbiAgICAgICAgJGxvZyhcIk0gSSBOIEUgIFAgTCBBIEMgRSBNIEUgTiBUIFNcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSh0cnVlKSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICAgICAgdmFyIHJuZCA9IE1hdGgucmFuZG9tKCkgKiAoTWF0aC5wb3coZGltZW5zaW9ucywgMikpIHwgMCxcclxuICAgICAgICAgICAgICAgIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBzcXVhcmUgPSB0aGlzLmdldFNxdWFyZUF0KHJvdywgY2VsbCk7XHJcbiAgICAgICAgICAgIHNxdWFyZS5taW5lKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcihfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIic+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwoc3F1YXJlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNGbGFnZ2VkKCkpXHJcbiAgICAgICAgICAgICRsb2coXCJoYW5kbGUgZmxhZ2dlZCBzaXR1YXRpb24uLi5cIilcclxuICAgICAgICAgICAgLy8gVE9ETzogcmVtb3ZlIHRoaXM/XHJcblxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG5cclxuICAgICAgICBpZiAoJChcIi5zcXVhcmU6bm90KC5taW5lZClcIikubGVuZ3RoID09PSAkKFwiLm9wZW5cIikubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnZmxhZ2dlZCcpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICBzcXVhcmUudW5mbGFnKCk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdmbGFnZ2VkJykuYWRkQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSxcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpLFxyXG4gICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKG5laWdoYm9yKS5yZW1vdmVDbGFzcygnY2xvc2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAgICAgICAgIGlmICghbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgfHwgIW5laWdoYm9yLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIF9mbGFzaE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGlzQWxlcnQgPyAnZ2FtZS1vdmVyJyA6ICdnYW1lLXdpbicpXHJcbiAgICAgICAgICAgICAgICAuaHRtbChtc2cpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS13aW4nKTtcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAvLyBUT0RPOiByZXBsYWNlIHdpdGggcmVhbCBtZXNzYWdlXHJcbiAgICAgICAgJGxvZyhcIi0tLSAgR0FNRSBXSU4hICAtLS1cIik7XHJcbiAgICAgICAgJGxvZyhcIlVzZXIgbW92ZXM6ICVvXCIsIHRoaXMudXNlck1vdmVzKVxyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKCdZb3UgV2luIScpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lT3ZlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcmVzZXQgZXZlcnl0aGluZ1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHsgX3RoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7IH0pO1xyXG5cclxuICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgICRsb2coXCJ0aGlzLiRlbDogJW9cIiwgdGhpcy4kZWwpXHJcbiAgICAgICAgdGhpcy4kZWxcclxuICAgICAgICAgICAgLmZpbmQoJy5zcXVhcmUnKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdvcGVuJyk7XHJcblxyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICAkbG9nKCctLS0gIEdBTUUgT1ZFUiEgIC0tLScpO1xyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKCdHYW1lIE92ZXIhJywgdHJ1ZSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiAkQy5Vbmljb2RlLkZMQUc7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNNaW5lZCgpKSByZXR1cm4gJEMuVW5pY29kZS5NSU5FO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNxLmdldERhbmdlcigpICE9PSAwID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKHNxdWFyZS5nZXRTdGF0ZSgpLmpvaW4oJyAnKSk7XHJcblxyXG4gICAgICAgIC8vIGF0dGFjaCB0aGUgU3F1YXJlIHRvIHRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ3JpZCBjZWxsXHJcbiAgICAgICAgJGNlbGwuZGF0YSgnc3F1YXJlJywgc3F1YXJlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gXCJQVUJMSUNcIiBNRVRIT0RTXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2godGhpcy5fcmVuZGVyU3F1YXJlLmJpbmQodGhpcykpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZ2V0R3JpZENlbGw6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRlbFxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJyNyb3cnICsgc3F1YXJlLmdldFJvdygpKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ3RkJylcclxuICAgICAgICAgICAgICAgIC5lcShzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBuZWVkIGdhbWVPcHRpb25zLCBtZXRhZGF0YSBvbiBkYXRldGltZS9ldGMuLCBzZXJpYWxpemUgYWxsIHNxdWFyZXMnIHN0YXRlc1xyXG4gICAgICAgIHJldHVybiBTZXJpYWxpemVyLmV4cG9ydCh0aGlzKTtcclxuICAgIH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc3ltYm9scyA9ICghd2l0aERhbmdlcikgPyByb3cgOiByb3cubWFwKGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChzcS5pc01pbmVkKCkpID8gJy0nIDogc3EuZ2V0RGFuZ2VyKCkgPT09IDAgPyAnICcgOiBzcS5nZXREYW5nZXIoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBzeW1ib2xzLmpvaW4oJyAgICcpLnRvTG93ZXJDYXNlKCkgKyBcIiAgICAgICBbXCIgKyBpZHggKyBcIl1cXG5cIjtcclxuICAgICAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lYm9hcmQ7IiwiXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuTXVsdGltYXAucHJvdG90eXBlID0ge1xyXG4gICAgZ2V0OiBmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihmbikgeyByZXR1cm4gW10uZm9yRWFjaC5jYWxsKHRoaXMudmFsdWVzKCksIGZuKTsgfSxcclxuICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiBfdGhpcy5fdGFibGVbcm93XTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH0sXHJcbiAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwiXHJcbnZhciBTZXJpYWxpemVyID0ge1xyXG4gICAgZXhwb3J0OiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBfbWV0YToge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiArbmV3IERhdGUsXHJcbiAgICAgICAgICAgICAgICBzY29yZTogbnVsbCxcclxuICAgICAgICAgICAgICAgIGNsb2NrOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdDogW11cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgICAgYm9hcmQ6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBzcXVhcmVzOiBKU09OLnN0cmluZ2lmeShnYW1lYm9hcmQuYm9hcmQuX3RhYmxlKSxcclxuICAgICAgICAgICAgICAgIGRlYnVnX21vZGU6IGdhbWVib2FyZC5kZWJ1Z19tb2RlLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczogZ2FtZWJvYXJkLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBtaW5lczogZ2FtZWJvYXJkLm1pbmVzLFxyXG4gICAgICAgICAgICAgICAgdXNlck1vdmVzOiBnYW1lYm9hcmQudXNlck1vdmVzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbm1vZHVsZS5leHBvcnRzID0gU2VyaWFsaXplcjsiLCJ2YXIgQml0RmxhZ0ZhY3RvcnkgPSByZXF1aXJlKCcuL2JpdC1mbGFnLWZhY3RvcnknKSxcclxuICAgIFN5bWJvbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlN5bWJvbHMsXHJcbiAgICBGbGFncyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuRmxhZ3MsXHJcblxyXG4gICAgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWyBGbGFncy5PUEVOLCBGbGFncy5NSU5FRCwgRmxhZ3MuRkxBR0dFRCwgRmxhZ3MuSU5ERVhFRCBdKTtcclxuXHJcbmZ1bmN0aW9uIFNxdWFyZShyb3csIGNlbGwsIGRhbmdlcikge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBuZXcgQml0RmxhZ3M7XHJcbiAgICB0aGlzLmRhbmdlciA9IChkYW5nZXIgPT0gK2RhbmdlcikgPyArZGFuZ2VyIDogdm9pZCAwO1xyXG59XHJcblxyXG5TcXVhcmUucHJvdG90eXBlID0ge1xyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyBpZiAoaWR4ID09ICtpZHgpIHsgdGhpcy5kYW5nZXIgPSAraWR4OyB0aGlzLmluZGV4KCk7IH0gfSxcclxuICAgIGdldFN0YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhTeW1ib2xzKVxyXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gX3RoaXNbICdpcycgKyBrZXkuY2hhckF0KDApICsga2V5LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpIF0oKTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihrZXkpIHsgcmV0dXJuIGtleS50b0xvd2VyQ2FzZSgpOyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIG9wZW46IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICBtaW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0lOREVYRUQpOyB9LFxyXG5cclxuICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuICF0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKTsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKCk7IH0sXHJcbiAgICBpc0luZGV4ZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0luZGV4ZWQoKTsgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyByb3c6IHRoaXMucm93LCBjZWxsOiB0aGlzLmNlbGwsIHN0YXRlOiB0aGlzLnN0YXRlLCBkYW5nZXI6IHRoaXMuZGFuZ2VyIH0gfSxcclxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpXHJcbiAgICAgICAgICAgID8gU3ltYm9scy5NSU5FRCA6IHRoaXMuc3RhdGUuaXNGbGFnZ2VkKClcclxuICAgICAgICAgICAgICAgID8gU3ltYm9scy5GTEFHR0VEIDogdGhpcy5zdGF0ZS5pc09wZW4oKVxyXG4gICAgICAgICAgICAgICAgICAgID8gU3ltYm9scy5PUEVOIDogU3ltYm9scy5DTE9TRUQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNxdWFyZTsiXX0=
;