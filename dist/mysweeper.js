;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gameboard = require('./gameboard'),
    Modes = require('./constants').Modes,
    PresetLevels = require('./constants').PresetLevels,
    PresetSetups = require('./constants').PresetSetups,
    VERSION = require('./constants').Version,

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

        // set up <header> content...
        $("#mines-display").find("span").html(gameOptions.mines);
        $(".version").html(VERSION);

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

},{"./constants":3,"./gameboard":7}],2:[function(require,module,exports){

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
	Version: 'beta1',

	DefaultConfig: { dimensions: 9, mines: 1, board: "#board", timer: 500, debug_mode: true /*false*/ },

	Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

	Flags: 	{ OPEN: 'F_OPEN', MINED: 'F_MINED', FLAGGED: 'F_FLAGGED', INDEXED: 'F_INDEXED' },

	Unicode: { FLAG: 'x', MINE: 'Ä' },

	Modes: { PRESET: "P", CUSTOM: "C" },

    PresetLevels: { BEGINNER: "B", INTERMEDIATE: "I", EXPERT: "E" },

    PresetSetups: {
        BEGINNER: 		{ dimensions:  9, mines:  9, timer: 300 },
        INTERMEDIATE: 	{ dimensions: 12, mines: 21, timer: 420 },
        EXPERT: 		{ dimensions: 15, mines: 67, timer: 540 }
    },

	MessageOverlay: '#flash'
};

module.exports = Constants;
},{}],4:[function(require,module,exports){


function Countdown(seconds, el) {
    this.seconds = seconds;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);

    this.m1 = this.el.querySelector('#m1');
    this.m2 = this.el.querySelector('#m2');
    this.s1 = this.el.querySelector('#s1');
    this.s2 = this.el.querySelector('#s2');

    this.freeze = false;
}

Countdown.prototype = {
    _renderInitial: function() {
        var arr = this._toMinsSecs(this.seconds);
        this._setDisplay(arr[0] || 0, arr[1] || 0);
    },
    _toMinsSecs: function(secs) {
        var mins = ~~(secs / 60),
            secs = secs % 60;
        return [mins, secs];
    },
    _setDisplay: function(mins, secs) {
        var m = String(mins),
            s = String(secs),
            times = [m, s].map(function(x) {
                var arr = String(x).split('');
                if (arr.length < 2) arr.unshift('0');
                return arr;
            });
        this.m1.innerHTML = times[0][0];
        this.m2.innerHTML = times[0][1];
        this.s1.innerHTML = times[1][0];
        this.s2.innerHTML = times[1][1];
    },
    _countdown: function() {
        var _this = this,
            timer = setInterval(function() {
                if (!_this.freeze) {
                    if (_this.seconds !== 0) {
                        var arr = _this._toMinsSecs(_this.seconds);
                        _this._setDisplay(arr[0], arr[1]);
                        _this.seconds--;
                    } else {
                        clearInterval(timer);
                        _this._setDisplay(0, 0);
                    }
                } else
                    clearInterval(timer);
            }, 1000);
    },
    start: function() { this.freeze = false; this._countdown(); },
    stop: function() { this.freeze = true; },
    reset: function() { this._setDisplay(0, 0); }
};

module.exports = Countdown;
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
    Serializer = require('./serializer'),
    $C = require('./constants'),
    DEFAULT_GAME_OPTIONS = require('./constants').DefaultConfig,
    Countdown = require('./countdown');

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
    // add in the countdown clock...
    this.clock = new Countdown(+options.timer || DEFAULT_GAME_OPTIONS.timer, '#countdown');
    this.clock.start();

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
            if (!square.getDanger() > 0)
                this._recursiveReveal(square);

        } else if (square.isFlagged()) {} // no-op right now

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
    // handles autoclearing of spaces around the one clicked
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
    _prepareFinalReveal: function() {
        var _this = this;
        this.getSquares()
            .filter(function(sq) { return sq.isFlagged(); })
            .forEach(function(f) {
                _this.getGridCell(f).find('.danger').html(f.getDanger());
                f.unflag();
                _this._renderSquare(f);
            });
    },
    _gameWin: function () {
        this._prepareFinalReveal();

        this.$el.addClass('game-win');
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');

        this._removeEventListeners();
        $log("stopping clock...", this.clock)
        this.clock.stop();
        // TODO: replace with real message
        $log("---  GAME WIN!  ---");
        $log("User moves: %o", this.userMoves)
        this._flashMsg('You Win!');
    },
    _gameOver: function() {
        this._prepareFinalReveal();

        this.$el.addClass('game-over');
        // open/reveal all squares
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');

        this._removeEventListeners();
        $log("stopping clock...", this.clock)
        this.clock.stop();
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
},{"./constants":3,"./countdown":4,"./danger-calculator":5,"./multimap":8,"./serializer":9,"./square":10}],8:[function(require,module,exports){

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
},{}],10:[function(require,module,exports){
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
},{"./bit-flag-factory":2,"./constants":3}]},{},[1,2,3,5,4,6,7,8,9,10])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbXVsdGltYXAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcbiAgICBWRVJTSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5WZXJzaW9uLFxyXG5cclxuICAgIG1pbmVhYmxlU3BhY2VzID0gZnVuY3Rpb24oZGltKSB7IHJldHVybiB+fihNYXRoLnBvdyhkaW0sIDIpICogMC41KTsgfSxcclxuICAgIGRpc2FibGVPcHRpb24gPSBmdW5jdGlvbigkZWwsIHVuZG8pIHtcclxuICAgICAgICBpZiAodW5kbyA9PSBudWxsKSB1bmRvID0gZmFsc2U7XHJcbiAgICAgICAgJGVsW3VuZG8gPyAncmVtb3ZlQ2xhc3MnIDogJ2FkZENsYXNzJ10oJ2Rpc2FibGVkJyk7XHJcbiAgICAgICAgJGVsLmZpbmQoXCJpbnB1dFwiKS5wcm9wKCdyZWFkb25seScsICF1bmRvKTtcclxuICAgIH0sXHJcbiAgICBlbmFibGVPcHRpb24gPSBmdW5jdGlvbigkZWwpIHsgcmV0dXJuIGRpc2FibGVPcHRpb24oJGVsLCB0cnVlKTsgfTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICB2YXIgJHBvc3NpYmxlTWluZXMgPSAkKFwiI21pbmUtY291bnRcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpO1xyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChcInVsLnByZXNldFwiKSk7IGRpc2FibGVPcHRpb24oJChcInVsLmN1c3RvbVwiKSk7IH0pLmNsaWNrKCk7XHJcbiAgICAkKFwiI2N1c3RvbS1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChcInVsLmN1c3RvbVwiKSk7IGRpc2FibGVPcHRpb24oJChcInVsLnByZXNldFwiKSk7IH0pO1xyXG5cclxuICAgICQuZWFjaCgkKFwibGFiZWxbZm9yPWxldmVsLWJlZ2lubmVyXSxsYWJlbFtmb3I9bGV2ZWwtaW50ZXJtZWRpYXRlXSxsYWJlbFtmb3I9bGV2ZWwtZXhwZXJ0XVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pWzBdO1xyXG5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNldCB1cCA8aGVhZGVyPiBjb250ZW50Li4uXHJcbiAgICAgICAgJChcIiNtaW5lcy1kaXNwbGF5XCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoZ2FtZU9wdGlvbnMubWluZXMpO1xyXG4gICAgICAgICQoXCIudmVyc2lvblwiKS5odG1sKFZFUlNJT04pO1xyXG5cclxuICAgICAgICB3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZChnYW1lT3B0aW9ucykucmVuZGVyKCk7XHJcblxyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxufSk7XHJcbi8vIHNldCB3aWR0aC9oZWlnaHQgb2YgLnNxdWFyZTpcclxuICAgIC8vIHZhciBuZXdEaW0gPSAoKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkpICsgNjYpIC8gMjA7XHJcbiAgICAvLyAkKCcuc3F1YXJlJykuY3NzKHsgaGVpZ2h0OiBuZXdEaW0sIHdpZHRoOiBuZXdEaW0gfSk7XHJcbi8vICgwLjk1ICogJCh3aW5kb3cpLmhlaWdodCgpICsgNjYpIC8gdGhpcy5kaW1lbnNpb25zXHJcbiIsIlxyXG4vLyBAdXNhZ2UgdmFyIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsnRl9PUEVOJywgJ0ZfTUlORUQnLCAnRl9GTEFHR0VEJywgJ0ZfSU5ERVhFRCddKTsgYmYgPSBuZXcgQml0RmxhZ3M7XHJcbmZ1bmN0aW9uIEJpdEZsYWdGYWN0b3J5KGFyZ3MpIHtcclxuXHJcbiAgICB2YXIgYmluVG9EZWMgPSBmdW5jdGlvbihzdHIpIHsgcmV0dXJuIHBhcnNlSW50KHN0ciwgMik7IH0sXHJcbiAgICAgICAgZGVjVG9CaW4gPSBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfSxcclxuICAgICAgICBidWlsZFN0YXRlID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBwYWQoYXJyLm1hcChmdW5jdGlvbihwYXJhbSkgeyByZXR1cm4gU3RyaW5nKCtwYXJhbSk7IH0pLnJldmVyc2UoKS5qb2luKCcnKSk7IH0sXHJcbiAgICAgICAgcGFkID0gZnVuY3Rpb24gKHN0ciwgbWF4KSB7XHJcbiAgICAgICAgICBtYXggfHwgKG1heCA9IDQgLyogdGhpcy5ERUZBVUxUX1NJWkUubGVuZ3RoICovKTtcclxuICAgICAgICAgIHZhciBkaWZmID0gbWF4IC0gc3RyLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXTsgZGlmZiA+IDA7IGFjY1stLWRpZmZdID0gJzAnKSB7fVxyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBCaXRGbGFncy53aXRoRGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykgeyByZXR1cm4gbmV3IEJpdEZsYWdzKGRlZmF1bHRzKTsgfTtcclxuXHJcbiAgICBzZXRTdGF0ZXMoYXJncywgQml0RmxhZ3MucHJvdG90eXBlKTtcclxuXHJcbiAgICByZXR1cm4gQml0RmxhZ3M7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQml0RmxhZ0ZhY3Rvcnk7IiwiXHJcbnZhciBDb25zdGFudHMgPSB7XHJcblx0VmVyc2lvbjogJ2JldGExJyxcclxuXHJcblx0RGVmYXVsdENvbmZpZzogeyBkaW1lbnNpb25zOiA5LCBtaW5lczogMSwgYm9hcmQ6IFwiI2JvYXJkXCIsIHRpbWVyOiA1MDAsIGRlYnVnX21vZGU6IHRydWUgLypmYWxzZSovIH0sXHJcblxyXG5cdFN5bWJvbHM6IHsgQ0xPU0VEOiAneCcsIE9QRU46ICdfJywgRkxBR0dFRDogJ2YnLCBNSU5FRDogJyonIH0sXHJcblxyXG5cdEZsYWdzOiBcdHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuXHRVbmljb2RlOiB7IEZMQUc6ICd4JywgTUlORTogJ8OEJyB9LFxyXG5cclxuXHRNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiBcdFx0eyBkaW1lbnNpb25zOiAgOSwgbWluZXM6ICA5LCB0aW1lcjogMzAwIH0sXHJcbiAgICAgICAgSU5URVJNRURJQVRFOiBcdHsgZGltZW5zaW9uczogMTIsIG1pbmVzOiAyMSwgdGltZXI6IDQyMCB9LFxyXG4gICAgICAgIEVYUEVSVDogXHRcdHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDU0MCB9XHJcbiAgICB9LFxyXG5cclxuXHRNZXNzYWdlT3ZlcmxheTogJyNmbGFzaCdcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc3RhbnRzOyIsIlxyXG5cclxuZnVuY3Rpb24gQ291bnRkb3duKHNlY29uZHMsIGVsKSB7XHJcbiAgICB0aGlzLnNlY29uZHMgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG5cclxuICAgIHRoaXMubTEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMScpO1xyXG4gICAgdGhpcy5tMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20yJyk7XHJcbiAgICB0aGlzLnMxID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczEnKTtcclxuICAgIHRoaXMuczIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMicpO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcbkNvdW50ZG93bi5wcm90b3R5cGUgPSB7XHJcbiAgICBfcmVuZGVySW5pdGlhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICB0aGlzLl9zZXREaXNwbGF5KGFyclswXSB8fCAwLCBhcnJbMV0gfHwgMCk7XHJcbiAgICB9LFxyXG4gICAgX3RvTWluc1NlY3M6IGZ1bmN0aW9uKHNlY3MpIHtcclxuICAgICAgICB2YXIgbWlucyA9IH5+KHNlY3MgLyA2MCksXHJcbiAgICAgICAgICAgIHNlY3MgPSBzZWNzICUgNjA7XHJcbiAgICAgICAgcmV0dXJuIFttaW5zLCBzZWNzXTtcclxuICAgIH0sXHJcbiAgICBfc2V0RGlzcGxheTogZnVuY3Rpb24obWlucywgc2Vjcykge1xyXG4gICAgICAgIHZhciBtID0gU3RyaW5nKG1pbnMpLFxyXG4gICAgICAgICAgICBzID0gU3RyaW5nKHNlY3MpLFxyXG4gICAgICAgICAgICB0aW1lcyA9IFttLCBzXS5tYXAoZnVuY3Rpb24oeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyciA9IFN0cmluZyh4KS5zcGxpdCgnJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJyLmxlbmd0aCA8IDIpIGFyci51bnNoaWZ0KCcwJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLm0xLmlubmVySFRNTCA9IHRpbWVzWzBdWzBdO1xyXG4gICAgICAgIHRoaXMubTIuaW5uZXJIVE1MID0gdGltZXNbMF1bMV07XHJcbiAgICAgICAgdGhpcy5zMS5pbm5lckhUTUwgPSB0aW1lc1sxXVswXTtcclxuICAgICAgICB0aGlzLnMyLmlubmVySFRNTCA9IHRpbWVzWzFdWzFdO1xyXG4gICAgfSxcclxuICAgIF9jb3VudGRvd246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIHRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIV90aGlzLmZyZWV6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zZWNvbmRzICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBfdGhpcy5fdG9NaW5zU2VjcyhfdGhpcy5zZWNvbmRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldERpc3BsYXkoYXJyWzBdLCBhcnJbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWNvbmRzLS07XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICB9LCAxMDAwKTtcclxuICAgIH0sXHJcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7IHRoaXMuZnJlZXplID0gZmFsc2U7IHRoaXMuX2NvdW50ZG93bigpOyB9LFxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7IHRoaXMuZnJlZXplID0gdHJ1ZTsgfSxcclxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0RGlzcGxheSgwLCAwKTsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb3VudGRvd247IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbXVsdGltYXAnKSxcclxuICAgIERhbmdlckNhbGN1bGF0b3IgPSByZXF1aXJlKCcuL2Rhbmdlci1jYWxjdWxhdG9yJyksXHJcbiAgICBTcXVhcmUgPSByZXF1aXJlKCcuL3NxdWFyZScpLFxyXG4gICAgU2VyaWFsaXplciA9IHJlcXVpcmUoJy4vc2VyaWFsaXplcicpLFxyXG4gICAgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICBDb3VudGRvd24gPSByZXF1aXJlKCcuL2NvdW50ZG93bicpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG4gICAgLy8gc2VsZWN0aXZlbHkgZW5hYmxlIGRlYnVnIG1vZGUgZm9yIGNvbnNvbGUgdmlzdWFsaXphdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgIHRoaXMuZGVidWdfbW9kZSA9IG9wdGlvbnMuZGVidWdfbW9kZSB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5kZWJ1Z19tb2RlO1xyXG4gICAgJGxvZy5kZWJ1Z19tb2RlID0gdGhpcy5kZWJ1Z19tb2RlO1xyXG4gICAgLy8gY29udGFpbmVyIGZvciBmbGFzaCBtZXNzYWdlcywgc3VjaCBhcyB3aW4vbG9zcyBvZiBnYW1lXHJcbiAgICB0aGlzLmZsYXNoQ29udGFpbmVyID0gJCgkQy5NZXNzYWdlT3ZlcmxheSk7XHJcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHVzZXIgY2xpY2tzIHRvd2FyZHMgdGhlaXIgd2luXHJcbiAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcbiAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgLy8gYWRkIGluIHRoZSBjb3VudGRvd24gY2xvY2suLi5cclxuICAgIHRoaXMuY2xvY2sgPSBuZXcgQ291bnRkb3duKCtvcHRpb25zLnRpbWVyIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRpbWVyLCAnI2NvdW50ZG93bicpO1xyXG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xyXG5cclxuICAgIC8vIGNyZWF0ZSB0aGUgYm9hcmQgaW4gbWVtb3J5IGFuZCBhc3NpZ24gdmFsdWVzIHRvIHRoZSBzcXVhcmVzXHJcbiAgICB0aGlzLl9sb2FkQm9hcmQoKTtcclxuICAgIC8vIHJlbmRlciB0aGUgSFRNTCB0byBtYXRjaCB0aGUgYm9hcmQgaW4gbWVtb3J5XHJcbiAgICB0aGlzLl9yZW5kZXJHcmlkKCk7XHJcbn1cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcblxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgZGltZW5zaW9ucyA9IHRoaXMuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSB0aGlzLm1pbmVzLFxyXG4gICAgICAgICAgICBwb3B1bGF0ZVJvdyA9IGZ1bmN0aW9uKHJvdywgc3F1YXJlcykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc3F1YXJlczsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IG5ldyBTcXVhcmUocm93LCBpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSlcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgcG9wdWxhdGVSb3coaSwgZGltZW5zaW9ucykpO1xyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcblxyXG4gICAgICAgIC8vIHByZS1jYWxjdWxhdGUgdGhlIGRhbmdlciBpbmRleCBvZiBlYWNoIG5vbi1taW5lZCBzcXVhcmUuLi5cclxuICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICAkbG9nKFwiRyBBIE0gRSBCIE8gQSBSIERcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSgpKTtcclxuICAgICAgICAkbG9nKFwiTSBJIE4gRSAgUCBMIEEgQyBFIE0gRSBOIFQgU1xcbiVvXCIsIHRoaXMudG9Db25zb2xlKHRydWUpKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgICAgICB2YXIgcm5kID0gTWF0aC5yYW5kb20oKSAqIChNYXRoLnBvdyhkaW1lbnNpb25zLCAyKSkgfCAwLFxyXG4gICAgICAgICAgICAgICAgcm93ID0gfn4ocm5kIC8gZGltZW5zaW9ucyksXHJcbiAgICAgICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIHNxdWFyZSA9IHRoaXMuZ2V0U3F1YXJlQXQocm93LCBjZWxsKTtcclxuICAgICAgICAgICAgc3F1YXJlLm1pbmUoKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuc2V0RGFuZ2VyKF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJz5cIlxyXG4gICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBUT0RPOiBhbHNvIGhhbmRsZSBmaXJzdC1jbGljay1jYW4ndC1iZS1taW5lIChpZiB3ZSdyZSBmb2xsb3dpbmcgdGhhdCBydWxlKVxyXG4gICAgICAgIC8vIGhlcmUsIGlmIHVzZXJNb3ZlcyA9PT0gMC4uLiA6bWVzc2FnZSA9PiA6bXVsbGlnYW4/XHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgIGlmICghc3F1YXJlLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge30gLy8gbm8tb3AgcmlnaHQgbm93XHJcblxyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG5cclxuICAgICAgICBpZiAoJChcIi5zcXVhcmU6bm90KC5taW5lZClcIikubGVuZ3RoID09PSAkKFwiLm9wZW5cIikubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdjbG9zZWQnKS5hZGRDbGFzcygnZmxhZ2dlZCcpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICBzcXVhcmUudW5mbGFnKCk7XHJcbiAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdmbGFnZ2VkJykuYWRkQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSxcclxuICAgIC8vIGhhbmRsZXMgYXV0b2NsZWFyaW5nIG9mIHNwYWNlcyBhcm91bmQgdGhlIG9uZSBjbGlja2VkXHJcbiAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAvLyBiYXNlZCBvbiBgc291cmNlYCBzcXVhcmUsIHdhbGsgYW5kIHJlY3Vyc2l2ZWx5IHJldmVhbCBjb25uZWN0ZWQgc3BhY2VzXHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kKSxcclxuICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICBjZWxsID0gc291cmNlLmdldENlbGwoKSxcclxuICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmICFuZWlnaGJvci5pc0ZsYWdnZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5nZXRHcmlkQ2VsbChuZWlnaGJvcikucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5nZXREYW5nZXIoKSB8fCAhbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9yZWN1cnNpdmVSZXZlYWwobmVpZ2hib3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYXNoTXNnOiBmdW5jdGlvbihtc2csIGlzQWxlcnQpIHtcclxuICAgICAgICB0aGlzLmZsYXNoQ29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoaXNBbGVydCA/ICdnYW1lLW92ZXInIDogJ2dhbWUtd2luJylcclxuICAgICAgICAgICAgICAgIC5odG1sKG1zZylcclxuICAgICAgICAgICAgICAgIC5zaG93KCk7XHJcbiAgICB9LFxyXG4gICAgX3ByZXBhcmVGaW5hbFJldmVhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oZikge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7XHJcbiAgICAgICAgICAgICAgICBmLnVuZmxhZygpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3JlbmRlclNxdWFyZShmKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVXaW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgdGhpcy4kZWxcclxuICAgICAgICAgICAgLmZpbmQoJy5zcXVhcmUnKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdvcGVuJyk7XHJcblxyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgJGxvZyhcInN0b3BwaW5nIGNsb2NrLi4uXCIsIHRoaXMuY2xvY2spXHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgLy8gVE9ETzogcmVwbGFjZSB3aXRoIHJlYWwgbWVzc2FnZVxyXG4gICAgICAgICRsb2coXCItLS0gIEdBTUUgV0lOISAgLS0tXCIpO1xyXG4gICAgICAgICRsb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgICAgICB0aGlzLl9mbGFzaE1zZygnWW91IFdpbiEnKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAkbG9nKFwic3RvcHBpbmcgY2xvY2suLi5cIiwgdGhpcy5jbG9jaylcclxuICAgICAgICB0aGlzLmNsb2NrLnN0b3AoKTtcclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgJGxvZygnLS0tICBHQU1FIE9WRVIhICAtLS0nKTtcclxuICAgICAgICB0aGlzLl9mbGFzaE1zZygnR2FtZSBPdmVyIScsIHRydWUpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHZhciAkY2VsbCA9IHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSxcclxuICAgICAgICAgICAgZ2V0Q29udGVudHMgPSBmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzRmxhZ2dlZCgpKSByZXR1cm4gJEMuVW5pY29kZS5GTEFHO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzTWluZWQoKSkgcmV0dXJuICRDLlVuaWNvZGUuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzcS5nZXREYW5nZXIoKSAhPT0gMCA/IHNxLmdldERhbmdlcigpIDogJyc7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiBnZXRDb250ZW50cyhzcXVhcmUpIH0pO1xyXG5cclxuICAgICAgICAkY2VsbC5lbXB0eSgpLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcblxyXG4gICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKClcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnc3F1YXJlJylcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS5qb2luKCcgJykpO1xyXG5cclxuICAgICAgICAvLyBhdHRhY2ggdGhlIFNxdWFyZSB0byB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIGdyaWQgY2VsbFxyXG4gICAgICAgICRjZWxsLmRhdGEoJ3NxdWFyZScsIHNxdWFyZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFwiUFVCTElDXCIgTUVUSE9EU1xyXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAvLyByZXR1cm4gYHRoaXNgLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmUgY2hhaW5lZCB0byBpdHMgaW5pdGlhbGl6YXRpb24gY2FsbFxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldEdyaWRDZWxsOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgIC5maW5kKCd0ZCcpXHJcbiAgICAgICAgICAgICAgICAuZXEoc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlQXQ6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgIHZhciByb3cgPSB0aGlzLmJvYXJkLmdldChyb3cpO1xyXG4gICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgLnZhbHVlcygpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbCk7IH0sIFtdKVxyXG4gICAgfSxcclxuICAgIC8vIGV4cG9ydCBzZXJpYWxpemVkIHN0YXRlIHRvIHBlcnNpc3QgZ2FtZSBmb3IgbGF0ZXJcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbmVlZCBnYW1lT3B0aW9ucywgbWV0YWRhdGEgb24gZGF0ZXRpbWUvZXRjLiwgc2VyaWFsaXplIGFsbCBzcXVhcmVzJyBzdGF0ZXNcclxuICAgICAgICByZXR1cm4gU2VyaWFsaXplci5leHBvcnQodGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oc3RyLCByb3csIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN5bWJvbHMgPSAoIXdpdGhEYW5nZXIpID8gcm93IDogcm93Lm1hcChmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoc3EuaXNNaW5lZCgpKSA/ICctJyA6IHNxLmdldERhbmdlcigpID09PSAwID8gJyAnIDogc3EuZ2V0RGFuZ2VyKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdHIgKz0gc3ltYm9scy5qb2luKCcgICAnKS50b0xvd2VyQ2FzZSgpICsgXCIgICAgICAgW1wiICsgaWR4ICsgXCJdXFxuXCI7XHJcbiAgICAgICAgICAgIH0sICdcXG4nKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlxyXG5mdW5jdGlvbiBNdWx0aW1hcCgpIHtcclxuICAgIHRoaXMuX3RhYmxlID0gW107XHJcbn1cclxuXHJcbk11bHRpbWFwLnByb3RvdHlwZSA9IHtcclxuICAgIGdldDogZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbihyb3csIHZhbCkgeyAodGhpcy5fdGFibGVbcm93XSB8fCAodGhpcy5fdGFibGVbcm93XSA9IFtdKSkucHVzaCh2YWwpOyB9LFxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gX3RoaXMuX3RhYmxlW3Jvd107IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKSB7IHJldHVybiBhY2MuY29uY2F0KGl0ZW0pOyB9LCBbXSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkgeyB0aGlzLl90YWJsZSA9IHt9OyB9LFxyXG4gICAgc2l6ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE11bHRpbWFwOyIsIlxyXG52YXIgU2VyaWFsaXplciA9IHtcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgX21ldGE6IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogK25ldyBEYXRlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBjbG9jazogbnVsbCxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHQ6IFtdXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgIGJvYXJkOiBnYW1lYm9hcmQuJGVsLnNlbGVjdG9yLFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlczogSlNPTi5zdHJpbmdpZnkoZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSksXHJcbiAgICAgICAgICAgICAgICBkZWJ1Z19tb2RlOiBnYW1lYm9hcmQuZGVidWdfbW9kZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdhbWVib2FyZC5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgbWluZXM6IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgICAgIHVzZXJNb3ZlczogZ2FtZWJvYXJkLnVzZXJNb3Zlc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcmlhbGl6ZXI7IiwidmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9iaXQtZmxhZy1mYWN0b3J5JyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzLFxyXG4gICAgRmxhZ3MgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkZsYWdzLFxyXG5cclxuICAgIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsgRmxhZ3MuT1BFTiwgRmxhZ3MuTUlORUQsIEZsYWdzLkZMQUdHRUQsIEZsYWdzLklOREVYRUQgXSk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIpIHtcclxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcXVhcmUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgU3F1YXJlKGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XHJcbiAgICB0aGlzLnN0YXRlID0gbmV3IEJpdEZsYWdzO1xyXG4gICAgdGhpcy5kYW5nZXIgPSAoZGFuZ2VyID09ICtkYW5nZXIpID8gK2RhbmdlciA6IHZvaWQgMDtcclxufVxyXG5cclxuU3F1YXJlLnByb3RvdHlwZSA9IHtcclxuICAgIGdldFJvdzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJvdzsgfSxcclxuICAgIGdldENlbGw6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jZWxsOyB9LFxyXG4gICAgZ2V0RGFuZ2VyOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZGFuZ2VyOyB9LFxyXG4gICAgc2V0RGFuZ2VyOiBmdW5jdGlvbihpZHgpIHsgaWYgKGlkeCA9PSAraWR4KSB7IHRoaXMuZGFuZ2VyID0gK2lkeDsgdGhpcy5pbmRleCgpOyB9IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWEVEKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNGbGFnZ2VkKCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpOyB9LFxyXG4gICAgaXNJbmRleGVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNJbmRleGVkKCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7Il19
;