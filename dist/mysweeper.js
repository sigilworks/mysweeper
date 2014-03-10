;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

var Gameboard = require('./gameboard'),
    Modes = require('./constants').Modes,
    PresetLevels = require('./constants').PresetLevels,
    PresetSetups = require('./constants').PresetSetups,
    DimValidator = require('./validators').BoardDimensions,
    MineValidator = require('./validators').MineCount,
    VERSION = require('./constants').VERSION,
    MAX_GRID_DIMENSIONS = require('./constants').MAX_GRID_DIMENSIONS,
    MINEABLE_SPACES_MULTIPLIER = require('./constants').MINEABLE_SPACES_MULTIPLIER,

    mineableSpaces = function(dim) { return ~~(Math.pow(dim, 2) * MINEABLE_SPACES_MULTIPLIER); },
    disableOption = function($el, undo) {
        if (undo == null) undo = false;
        $el[undo ? 'removeClass' : 'addClass']('disabled');
        $el.find("input").prop('readonly', !undo);
    },
    enableOption = function($el) { return disableOption($el, true); };

$(function(){

    var $possibleMines = $("#mine-count").siblings(".advice").find("span"),
        PRESET_PANEL_SELECTOR = "ul.preset > li:not(:has(label[for$='-mode']))",
        CUSTOM_PANEL_SELECTOR = "ul.custom > li:not(:has(label[for$='-mode']))";

    // setting initial value
    $possibleMines.html(mineableSpaces($("#dimensions").attr("placeholder")));
    $("#dimensions").siblings(".advice").find("span").html(MAX_GRID_DIMENSIONS + " x " + MAX_GRID_DIMENSIONS);

    $("#preset-mode").on('click', function() { enableOption($(PRESET_PANEL_SELECTOR)); disableOption($(CUSTOM_PANEL_SELECTOR)); }).click();
    $("#custom-mode").on('click', function() { enableOption($(CUSTOM_PANEL_SELECTOR)); disableOption($(PRESET_PANEL_SELECTOR)); });

    $.each($("label[for^='level-']"), function(_, label) {
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
                              .filter(function(pl) { return PresetLevels[pl] === level; })
                              .pop();
            gameOptions.isCustom = false;
            gameOptions.dimensions = PresetSetups[setup].dimensions;
            gameOptions.mines = PresetSetups[setup].mines;
        } else {
            // Modes.CUSTOM...
            gameOptions.isCustom = true;

            var d = $("#dimensions").val() || +$("#dimensions").attr("placeholder"),
                m = $("#mine-count").val() || +$("#mine-count").attr("placeholder");

            try {
                gameOptions.dimensions = DimValidator.validate(d) ? +d : 9;
                gameOptions.mines = MineValidator.validate(m, mineableSpaces(gameOptions.dimensions)) ? m : 1;
            } catch (e) {
                console.log("e: %o", e);
                $("#validation-warnings").html(e.message).show();
                return false;
            }
            // set the desired color theme...
            gameOptions.theme = $("#color-theme").val();
        }

        // set up <header> content...
        $("#mines-display").find("span").html(gameOptions.mines);
        $(".version").html(VERSION);

        window.gameboard = new Gameboard(gameOptions).render();

        $("#validation-warnings").hide();
        $("#options-card").hide();
        $("#board-card").fadeIn();

        return false;
    });

    $("#board-card").on("click", "a.replay", function() {
        // temporary, brute-force fix...
        // TODO: reset form and toggle visibility on the sections...
        window.location.reload();
    });

});
},{"./constants":3,"./gameboard":7,"./validators":21}],2:[function(require,module,exports){
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
},{}],3:[function(require,module,exports){
"use strict;"

var Constants = Object.freeze({

    VERSION: 'beta5',

    MAX_GRID_DIMENSIONS: 25,
    MINEABLE_SPACES_MULTIPLIER: 0.33,

    DefaultConfig: {
        dimensions: 9,
        mines: 1,
        board: '#board',
        timer: 500,
        debug_mode: true, /*false*/
        theme: 'LIGHT'
    },

    Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

    Flags:  { OPEN: 'F_OPEN', MINED: 'F_MINED', FLAGGED: 'F_FLAGGED', INDEXED: 'F_INDEXED' },

    Glyphs: { FLAG: 'x', MINE: 'Ä' },

    Modes: { PRESET: "P", CUSTOM: "C" },

    PresetLevels: { BEGINNER: "B", INTERMEDIATE: "I", EXPERT: "E" },

    PresetSetups: {
        BEGINNER:       { dimensions:  9, mines:  9, timer: 300 },
        INTERMEDIATE:   { dimensions: 12, mines: 21, timer: 420 },
        EXPERT:         { dimensions: 15, mines: 67, timer: 540 }
    },

    Themes: { LIGHT: 'light', DARK: 'dark' },

    MessageOverlay: '#flash',

    MobileDeviceRegex: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/,

    Scoreboard: { DIGITS: 3, FX_DURATION: 800, OUT_OF_RANGE: "MAX" },

    ScoringRules: { 
        DANGER_IDX_MULTIPLIER: 1, 
        BLANK_SQUARE_PTS: 0, 
        FLAG_MINED: 25, 
        MISFLAG_UNMINED: 10, 
        UNFLAG_MINED: 25, 
        MISUNFLAG_MINED: 10, 
        USERMOVES_MULTIPLIER: 10,
        MISFLAGGED_MULTIPLIER: 10,
        FLAGGED_MINES_MULTIPLIER: 10
    }

});

module.exports = Constants;
},{}],4:[function(require,module,exports){
"use strict;"

function Countdown(seconds, el) {
    this.seconds = seconds;
    this.initial = seconds;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);

    this.m1 = this.el.querySelector('#m1');
    this.m2 = this.el.querySelector('#m2');
    this.s1 = this.el.querySelector('#s1');
    this.s2 = this.el.querySelector('#s2');

    this.freeze = false;
}

Countdown.prototype = {
    constructor: Countdown,
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
    reset: function() { this.seconds = 0; this._setDisplay(0, 0); }
};

module.exports = Countdown;
},{}],5:[function(require,module,exports){
"use strict;"

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
"use strict;"
// ERRORS AND EXCEPTIONS

function MysweeperError() {
  var args = [].slice.call(arguments),
      RGX_REPLACEMENT_TOKENS = /\{(\d+)\}/g,
      extendMessage = function(str, args) {
          return (str || '').replace(RGX_REPLACEMENT_TOKENS, function(_, index) { return args[+index] || ''; });
      };
  this.message = extendMessage(args[0], args.slice(1));
  Error.call(this, this.message);
  Error.captureStackTrace(this, arguments.callee);
  this.stack = Error().stack;
}
MysweeperError.prototype = new Error();
MysweeperError.prototype.constructor = MysweeperError;
MysweeperError.prototype.getTrace = function() { return this.stack.replace(/↵\s+/g, '\n  '); };
MysweeperError.prototype.name = 'MysweeperError';


function ValidationError() {
  MysweeperError.apply(this, arguments);
}
ValidationError.prototype = new MysweeperError();
ValidationError.prototype.constructor = ValidationError;
ValidationError.prototype.name = 'ValidationError';

module.exports.MysweeperError = MysweeperError;
module.exports.ValidationError = ValidationError;


/*  -------------------------------------------------------------------------------------------  */

},{}],7:[function(require,module,exports){
"use strict;"

var Multimap = require('./lib/multimap'),
    DangerCalculator = require('./danger-calculator'),
    Square = require('./square'),
    Serializer = require('./serializer'),
    Glyphs = require('./constants').Glyphs,
    MessageOverlay = require('./constants').MessageOverlay,
    DEFAULT_GAME_OPTIONS = require('./constants').DefaultConfig,
    rgx_mobile_devices = require('./constants').MobileDeviceRegex,
    Countdown = require('./countdown'),
    TranscribingEmitter = require('./transcribing-emitter'),
    TranscriptionStrategy = require('./transcription-strategy'),
    ThemeStyler = require('./theme-styler'),
    ConsoleRenderer = require('./console-renderer'),
    MineLayer = require('./minelayer'),
    Scorekeeper = require('./scorekeeper'),
    Scoreboard = require('./scoreboard');

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
    // is custom or preset game?
    this.isCustom = options.isCustom || false;
    // the event transcriber for playback and persistence
    this.emitter = new TranscribingEmitter(TranscriptionStrategy);
    // selectively enable debug mode for console visualizations and notifications
    this.debug_mode = options.debug_mode || DEFAULT_GAME_OPTIONS.debug_mode;
    $log.debug_mode = this.debug_mode;
    // specifies the desired color theme or skin
    this.theme = this._setColorTheme(options.theme || DEFAULT_GAME_OPTIONS.theme);
    // container for flash messages, such as win/loss of game
    this.flashContainer = $(MessageOverlay);
    // check for desktop or mobile platform (for event handlers)
    this.isMobile = this._checkForMobile();
    // keep track of user clicks towards their win
    this.userMoves = 0;
    // the object that calculates the number of surrounding mines at any square
    this.dangerCalc = new DangerCalculator(this);
    // add in the countdown clock...
    this.clock = new Countdown(+options.timer || DEFAULT_GAME_OPTIONS.timer, '#countdown');
    this.clock.start();
    // create the scorekeeping object
    this.scorekeeper = new Scorekeeper(this);
    // create the actual scoreboard view
    this.scoreboard = new Scoreboard(0, "#score-display");

    // create the board in memory and assign values to the squares
    this._loadBoard();
    // render the HTML to match the board in memory
    this._renderGrid();
    // trigger event for game to begin...
    this.emitter.trigger('gb:start', this.board, this.$el.selector);
}


Gameboard.prototype = {
    constructor: Gameboard,
    // "PRIVATE" METHODS:
    _loadBoard: function() {
        // prefill squares to required dimensions...
        var dimensions = this.dimensions,
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

        // display output and game strategy to the console...
        if (this.debug_mode) {
            this.toConsole();
            this.toConsole(true);
        }
    },
    _renderGrid: function() {
        // layout the HTML <table> rows...
        this._createHTMLGrid(this.dimensions);
        // setup event listeners to listen for user clicks
        this._setupEventListeners();
        // set the color theme...
        this._setColorTheme(this.theme);
    },
    _determineMineLocations: function(dimensions, mines) {
        var locs = new MineLayer(mines, dimensions), _this = this;
        locs.forEach(function(loc) { _this.getSquareAt(loc[0], loc[1]).mine(); });
    },
    _precalcDangerIndices: function() {
        var _this = this;
        this.board.values()
            .reduce(function(acc, val) { return acc.concat(val.filter(function(sq) { return !sq.isMined(); })); }, [])
            .forEach(function(safe) { safe.setDanger(_this.dangerCalc.forSquare(safe.getRow(), safe.getCell())); });
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
    _setColorTheme: function(theme) {
        ThemeStyler.set(theme, this.$el);
        return theme;
    },
    _checkForMobile: function() { return rgx_mobile_devices.test(navigator.userAgent.toLowerCase()); },
    _setupEventListeners: function() {

        if (this.isMobile) {
            // for touch events: tap == click, hold == right click
            this.$el.hammer().on({
                tap: this._handleClick.bind(this),
                hold: this._handleRightClick.bind(this)
            }, 'td, td > span');
        } else {
            this.$el.on({
                click: this._handleClick.bind(this),
                contextmenu: this._handleRightClick.bind(this)
            }, 'td, td > span');
        }

        // TODO: remove after development ends...for debug use only!
        // INDIVIDUAL SQUARE EVENTS
        this.emitter.on('sq:open', function(square, cell) { $log("Opening square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:close', function(square, cell) { $log("Closing square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:flag', function(square, cell) { $log("Flagging square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:unflag', function(square, cell) { $log("Unflagging square at (%o, %o).", square.getRow(), square.getCell()); });
        // GAMEBOARD-WIDE EVENTS
        this.emitter.on('gb:start', function(ename, gameboard, $el) { $log("Let the game begin!", arguments); });
        this.emitter.on('gb:end:win', function(ename, gameboard, $el) { $log("Game over! You win!"); });
        this.emitter.on('gb:end:over', function(ename, gameboard, $el) { $log("Game over! You're dead!"); });

        // --- THESE EVENTS ARE FOR REAL, TO STAY!
        var _this = this;
        // wires up the scoreboard view object to the events received from the scorekeeper
        this.emitter.on('score:change score:change:final', function() { _this.scoreboard.update(_this.scorekeeper.score); });
    },
    _removeEventListeners: function() {
        this.$el.off();
        // turn off touch events as well
        this.$el.hammer().off();
    },
    _handleClick: function(event) {
        var $target = $(event.target),
            $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
            square = $cell.data('square');

        // TODO: also handle first-click-can't-be-mine (if we're following that rule)
        // here, if userMoves === 0... :message => :mulligan?
        this.userMoves++;

        if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
            this._openSquare(square);
            if (!square.getDanger() > 0)
                this._recursiveReveal(square);

        } else if (square.isMined() && !square.isFlagged()) {
            $cell.addClass('killer-mine');
            return this._gameOver();
        }

        this._evaluateForGameWin();
    },
    _handleRightClick: function(event) {
        var $target = $(event.target),
            $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
            square = $cell.data('square');

        // stop the contextmenu from popping up on desktop browsers
        event.preventDefault();

        this.userMoves++;

        if (square.isClosed() && !square.isFlagged())
            this._flagSquare(square);
        else if (square.isFlagged()) {
            this._unflagSquare(square);
            this._closeSquare(square);
        }

        this._evaluateForGameWin();

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
                _this._openSquare(neighbor);

                if (!neighbor.getDanger() || !neighbor.getDanger() > 0)
                    _this._recursiveReveal(neighbor);
            }
        });
    },
    _openSquare: function(square, fireEvent) {
        square.open();
        this._renderSquare(square);
        fireEvent = (fireEvent == null) ? true : fireEvent;
        fireEvent && this.emitter.trigger("sq:open", square, this.getGridCell(square));
    },
    _closeSquare: function(square, fireEvent) {
        square.close();
        this._renderSquare(square);
        fireEvent = (fireEvent == null) ? true : fireEvent;
        fireEvent && this.emitter.trigger("sq:close", square, this.getGridCell(square));
    },
    _flagSquare: function(square, fireEvent) {
        square.flag();
        this._renderSquare(square);
        fireEvent = (fireEvent == null) ? true : fireEvent;
        this.getGridCell(square).removeClass('closed');
        fireEvent && this.emitter.trigger("sq:flag", square, this.getGridCell(square));
    },
    _unflagSquare: function(square, fireEvent) {
        square.unflag();
        this._renderSquare(square);
        fireEvent = (fireEvent == null) ? true : fireEvent;
        fireEvent && this.emitter.trigger("sq:unflag", square, this.getGridCell(square));
    },
    _getOpenedSquaresCount: function() { return this.getSquares().filter(function(sq) { return sq.isOpen(); }).length; },
    _evaluateForGameWin: function() {
        var notMined = this.getSquares().filter(function(sq) { return !sq.isMined(); }).length;
        if (notMined === this._getOpenedSquaresCount())
            return this._gameWin();
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
                _this._unflagSquare(f, false);
            });
        this._removeEventListeners();
        this.clock.stop();
        this.scorekeeper.close();
    },
    _gameWin: function () {
        this._prepareFinalReveal();

        this.$el.addClass('game-win');
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');

        $log("---  GAME WIN!  ---");
        $log("User moves: %o", this.userMoves)
        this._flashMsg('<span>Game Over!</span><a href="#" class="replay">Click here to play again...</a>');
        this.emitter.trigger('gb:end:win', this.board, this.$el.selector);
    },
    _gameOver: function() {
        this._prepareFinalReveal();

        this.$el.addClass('game-over');
        // open/reveal all squares
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');

        // put up 'Game Over' banner
        $log('---  GAME OVER!  ---');
        this._flashMsg('<span>Game Over!</span><a href="#" class="replay">Click here to play again...</a>', true);
        this.emitter.trigger('gb:end:over', this.board, this.$el.selector);
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            getContents = function(sq) {
                if (sq.isFlagged()) return Glyphs.FLAG;
                if (sq.isMined()) return Glyphs.MINE;
                return !!sq.getDanger() ? sq.getDanger() : '';
            },
            $dangerSpan = $('<span />', { 'class': 'danger', html: getContents(square) });

        $cell.empty().append($dangerSpan);

        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass('cell' + square.getCell())
             .addClass(square.getState().join(' '));

        // attach the Square to the data associated with the grid cell
        $cell.data('square', square);
    },

    // "PUBLIC" METHODS
    render: function() {
        this.getSquares().forEach(this._renderSquare, this);
        // return `this`, so this method can be chained to its initialization call
        return this;
    },
    // takes a Square instance as a param, returns a jQuery-wrapped DOM node of its cell
    getGridCell: function(square) {
        return this.$el
                .find('#row' + square.getRow())
                .find('td')
                .eq(square.getCell());
    },
    // takes row and cell coordinates as params, returns the associated Square instance
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
        var renderer = ConsoleRenderer.to($log).withValues(this.board.values());
        return (withDanger) ? renderer.viewGame() : renderer.viewMines();
    }
};

module.exports = Gameboard;
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":12,"./minelayer":13,"./scoreboard":14,"./scorekeeper":15,"./serializer":16,"./square":17,"./theme-styler":18,"./transcribing-emitter":19,"./transcription-strategy":20}],8:[function(require,module,exports){
"use strict;"

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
        unset: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) & ~flag)); },
        toJSON: function() { return { _flags: this._flags }; }
    };

    BitFlags.withDefaults = function(defaults) { return new BitFlags(defaults); };

    setStates(args, BitFlags.prototype);

    return BitFlags;
}

module.exports = BitFlagFactory;
},{}],9:[function(require,module,exports){
"use strict;"

function Emitter() {
    this._events = {};
}

Emitter.prototype = {
    constructor: Emitter,
    on: function(event, fn) {
        event.split(/\s+/g).forEach(function(e) {
            this._events[e] = this._events[e] || [];
            this._events[e].push(fn);
        }, this);
        return this;
    },
    off: function(event, fn) {
        event.split(/\s+/g).forEach(function(e) {
            if (this._events[e] !== false)
                this._events[e].splice(this._events[e].indexOf(fn), 1);
        }, this);
        return this;
    },
    trigger: function(event /*, data... [varargs] */) {
        if (this._events[event] !== false)
            for (var i=0, len=this._events[event].length; i < len; ++i)
                this._events[event][i].apply(this, [].slice.call(arguments, 1));
        return this;
    }
};

module.exports = Emitter;
},{}],10:[function(require,module,exports){
"use strict;"

var Flippable = function(duration, wrapper) {
    if (!(this instanceof Flippable))
        return new Flippable(duration, wrapper);
    
    var nodeNameToTag = function(node) { return "<" + node + "/>"; },
        verifyDOMNode = function(str) {
            var tags = "a,abbr,acronym,address,applet,area,article,aside,audio,"
                + "b,base,basefont,bdi,bdo,bgsound,big,blink,blockquote,body,br,button,"
                + "canvas,caption,center,cite,code,col,colgroup,content,data,datalist,dd,"
                + "decorator,del,details,dfn,dir,div,dl,dt,element,em,embed,fieldset,figcaption,"
                + "figure,font,footer,form,frame,frameset,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,"
                + "i,iframe,img,input,ins,isindex,kbd,keygen,label,legend,li,link,listing,"
                + "main,map,mark,marquee,menu,menuitem,meta,meter,nav,nobr,noframes,noscript,object,"
                + "ol,optgroup,option,output,p,param,plaintext,pre,progress,q,rp,rt,ruby,s,samp,script,"
                + "section,select,shadow,small,source,spacer,span,strike,strong,style,sub,summary,sup,"
                + "table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,tt,u,ul,var,video,wbr,xmp";
            if (str = String(str).toLowerCase(), str && !!~tags.indexOf(str)) 
                return str;
        };
    
    return function() {
        this._flipDuration = +duration || 800,
        this._flipWrapper = verifyDOMNode(wrapper) || 'span';

        this._flip = function($el, content) {
            $el
                .wrapInner($(nodeNameToTag(this._flipWrapper)))
                .find(this.wrapper)
                .delay(this._flipDuration)
                .slideUp(this._flipDuration, function() { $(this).parent().html(content) });
        }
    };
};

module.exports = Flippable;
},{}],11:[function(require,module,exports){
// Linear Congruential Generator: variant of a Lehman Generator
// based on LCG found here: https://gist.github.com/Protonk?page=4
var LinearCongruentialGenerator = (function(){
  "use strict;"
  // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
  // m is basically chosen to be large (as it is the max period)
  // and for its relationships to a and c
  function LinearCongruentialGenerator() {
      this.m = 4294967296;
      // a - 1 should be divisible by m's prime factors
      this.a = 1664525;
      // c and m should be co-prime
      this.c = 1013904223;
      this.seed = void 0;
      this.z = void 0;
      // initial priming of the generator, until later overriden
      this.setSeed();
  }
  LinearCongruentialGenerator.prototype = {
    constructor: LinearCongruentialGenerator,
    setSeed: function(val) { this.z = this.seed = val || Math.round(Math.random() * this.m); },
    getSeed: function() { return this.seed; },
    rand: function() {
      // define the recurrence relationship
      this.z = (this.a * this.z + this.c) % this.m;
      // return a float in [0, 1)
      // if z = m then z / m = 0 therefore (z % m) / m < 1 always
      return this.z / this.m;
    }
  };
  return LinearCongruentialGenerator;
})();

module.exports = LinearCongruentialGenerator;
},{}],12:[function(require,module,exports){
"use strict;"

function Multimap() {
    this._table = [];
}

Multimap.prototype = {
    constructor: Multimap,
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
},{}],13:[function(require,module,exports){
"use strict;"

var LinearCongruentialGenerator = require('./lib/lcgenerator');

function MineLayer(mines, dimensions) {
    this.generator = new LinearCongruentialGenerator;
    this.mines = +mines || 0;
    this.dimensions = +dimensions || 0;

    var rands = [],
        _this = this,
        getRandomNumber = function() { return _this.generator.rand() * (Math.pow(_this.dimensions, 2)) | 0; };

    for (var i=0; i < mines; ++i) {
        var rnd = getRandomNumber();

        if (!~rands.indexOf(rnd))
            rands.push(rnd);
        // ...otherwise, give it another go-'round:
        else {
            mines++;
            continue;
        }
    }

    this.locations = rands.map(function(rnd) {
        var row = ~~(rnd / dimensions),
            cell = rnd % dimensions;
        return [ row, cell ];
    });

    return this.locations;
}

module.exports = MineLayer;
},{"./lib/lcgenerator":11}],14:[function(require,module,exports){
"use strict;"

var FX_DURATION = require('./constants').Scoreboard.FX_DURATION,
    DIGITS_MAX = require('./constants').Scoreboard.DIGITS,
    OUT_OF_RANGE = require('./constants').Scoreboard.OUT_OF_RANGE;

function Scoreboard(score, el) {
    this.score = score || 0;
    this.initial = score;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);
    this.$el = $(el);

    this.$L = this.$el.find('#sc1');
    this.$M = this.$el.find('#sc2');
    this.$R = this.$el.find('#sc3');

    this.update(this.initial);
}

Scoreboard.prototype = {
    constructor: Scoreboard,
    _increment: function(chips) {

        chips.forEach(function(chip) {
            var $chip = chip[0], pts = chip[1];

            if ($chip.html() !== pts)
                $chip
                    .wrapInner("<span/>")
                    .find("span")
                    .delay(FX_DURATION)
                    .slideUp(FX_DURATION, function() { $(this).parent().html(pts) });
        }, this);
    },
    update: function(points) {
        if (!points) return;
        var pts = toStringArray(points);
        this._increment([[this.$R, pts[2]], [this.$M, pts[1]], [this.$L, pts[0]]]);
    }
};

module.exports = Scoreboard;

function toStringArray(n) {
    var num = String(n),
        len = num.length;

    // too big for *this* scoreboard...
    if (len > DIGITS_MAX) {
        num = OUT_OF_RANGE;
        len = OUT_OF_RANGE.length;
    }

    return [ num[len - 3] || "0", num[len - 2] || "0", num[len - 1] || "0" ];
}
},{"./constants":3}],15:[function(require,module,exports){
"use strict;"

var Points = require('./constants').ScoringRules;

function Scorekeeper(gameboard) {
  var _this = this;

  this.callbacks = {
    up: function up(pts) { 
      this.score += pos(pts); 
      this.emitter.trigger("score:change", this.score); }.bind(this),
    down: function down(pts) { 
      this.score = (this.score - neg(pts) <= 0) ? 0 : this.score - neg(pts); 
      this.emitter.trigger("score:change", this.score); }.bind(this)
  };

  this.finalizers = {
    forOpeningSquares: function(gameboard) {
        var moves = gameboard.userMoves,
            unmined = Math.pow(gameboard.dimensions, 2) - gameboard.mines;
        return 1 - (~~(moves / unmined) * 10);
    },
    forTimePassed: function(gameboard) {
        var total = gameboard.clock.initial, elapsed = gameboard.clock.seconds;
        return 100 - ~~(elapsed / total * 100);
    },
    forFewestMoves: function(gameboard) {
        // experimental: sqrt(x^2 - x) * 10
        var dims = Math.pow(gameboard.dimensions, 2);
        return ~~(Math.sqrt(dims - gameboard.userMoves) * Points.USERMOVES_MULTIPLIER);
    },
    forFinalMisflaggings: function(gameboard) {
        var squares = gameboard.getSquares(),
            flagged = squares.filter(function(sq) { return sq.isFlagged(); }),
            misflagged = flagged.filter(function(sq) { return !sq.isMined(); });
        return (misflagged.length * Points.MISFLAGGED_MULTIPLIER) || 0;
    },
    forCorrectFlagging: function(gameboard) {
        var mines = gameboard.mines,
            squares = gameboard.getSquares(),
            flagged = squares.filter(function(sq) { return sq.isFlagged(); }),
            flaggedMines = squares.filter(function(sq) { return sq.isMined(); }),
            pct = ~~(flaggedMines.length / mines);
        return Math.ceil((mines * Points.FLAGGED_MINES_MULTIPLIER) * pct);
    }
  };

  this.queue = [];
  this.final = [];

  // TODO: wean this class off dependency on gameboard
  // should only need to have ctor injected with the gameboard's emitter
  this.gameboard = gameboard;
  this.emitter = gameboard.emitter;
  this.score = 0;

  this.nsu = this._determineSignificantUnit();
  this.endGame = false; // if game is now over, flush queues
  this.timer = setInterval(this._tick.bind(_this), this.nsu);

  console.log("Scorekeeper initialized.  :score => %o, :timer => %o", this.score, this.timer);
  this._setupEventListeners();
}

function pos(pts) { return Math.abs(+pts) || 0; }
function neg(pts) { return -1 * Math.abs(+pts) || 0; }

Scorekeeper.prototype = {
    _setupEventListeners: function() {
      var EVENTS = {
        'sq:open': function(square, cell) {
                    if (square.getDanger() > 0)
                      this.up(square.getDanger() * Points.DANGER_IDX_MULTIPLIER);
                    else
                      this.up(Points.BLANK_SQUARE_PTS)
                  },
        'sq:close': function(square, cell) {}, // ...is this even possible?
        'sq:flag': function(square, cell) {
                    if (square.isMined())
                      this.deferredUp(Points.FLAG_MINED);
                    else
                      this.deferredDown(Points.MISFLAG_UNMINED);
                  },
        'sq:unflag': function(square, cell) {
                    if (square.isMined())
                      this.deferredDown(Points.UNFLAG_MINED);
                    else
                      this.deferredUp(Points.MISUNFLAG_MINED);
                  },

        'gb:start': function(ename, gameboard, $el) {
                      this.endGame = false;
                      /* START THE SCOREKEEPER */ 
                    },
        'gb:end:win': function(ename, gameboard, $el) { 
                      this.endGame = true; 
                      /* STOP THE SCOREKEEPER */ 
                    },
        'gb:end:over': function(ename, gameboard, $el) { 
                      this.endGame = true; 
                      /* STOP THE SCOREKEEPER */ 
                    }
      };

      for (var event in EVENTS) 
        this.emitter.on(event, EVENTS[event].bind(this));
    },
    _determineSignificantUnit: function() {
        var isCustom = this.gameboard.isCustom,
            s = this.gameboard.clock.seconds,
            SECONDS = 1000, // milliseconds
            getMaxTime = function(time) { return Math.max(time, 1 * SECONDS) };

        if (s / 100 >= 1)
            return getMaxTime(~~(s / 250 * SECONDS));
        else if (s / 10 >= 1)
            return getMaxTime(5 * SECONDS);
        else
            return 1 * SECONDS;
    },
    _binarySearch: function(x) {
        var lo = 0, hi = this.queue.length;
        while (lo < hi) {
            var mid = ~~((lo + hi) >> 1);
            if (x.time < this.queue[mid].time)
                hi = mid;
            else
                lo = mid + 1;
        }
        return lo;
    },
    _enqueue: function(x) { return this.queue.splice(this._binarySearch(x), 0, x); },
    _processEvent: function(event) {
        var fn = this.callbacks[event.type];
        if (fn != null)
            return (fn.length > 1)
                ? fn.call(this, event.pts, function(err) { if (!err) return void 0; })
                : console.log("<score event: %o>: :old [%o]", fn.name, this.score),
                  fn.call(this, event.pts),
                  console.log("...:new => [%o]", this.score);
        else
            return console.log("[Scorekeeper] could not find function " + event.type);

        this.emitter.trigger("score:change", this.score);
    },
    _processFinalizers: function() {
        for (var visitor in this.finalizers) {
            console.log("<finalizer: %o>: :old [%o] => :new [%o]... ", visitor, this.score, (this.score += this.finalizers[visitor](this.gameboard)));
            // this.score += visitor(this.gameboard);
        }
        this.final.forEach(function(f) { this.score += f; }, this);
        // final update of the score
        this.emitter.trigger("score:change:final", this.score);
    },
    _tick: function() {
        var currIdx = this._binarySearch({ time: new Date().getTime() }), index = 0;
        while (index < currIdx) {
            var _this = this,
                callback = function() { _this._processEvent(_this.queue[index]); return index += 1; };
            callback();
        }
        return this.queue.splice(0, currIdx);
    },
    _addScoreToQueue: function(type, pts) { return this._enqueue({ time: ((+new Date) + this.nsu), type: type, pts: pts }); },

    up: function(pts) { console.log("up: %o", pts); this.callbacks.up(pts); },
    down: function(pts) { console.log("down: %o", pts); this.callbacks.down(pts); },

    deferredUp: function(pts) { console.log("Queueing `up` score event of %o", pos(pts)); this._addScoreToQueue("up", pos(pts)); },
    deferredDown: function(pts) { console.log("Queueing `down` score event of %o", neg(pts)); this._addScoreToQueue("down", neg(pts)); },

    finalUp: function(pts) { this.final.push(pos(pts)); },
    finalDown: function(pts) { this.final.push(neg(pts)); },

    getPendingScoreCount: function() { return this.queue.length; },

    close: function() {
      clearInterval(this.timer);

      console.log("Clearing out remaining queue!");
      var _this = this;
      this.queue.forEach(function(event) { _this._processEvent(event); });

      this._processFinalizers();

      console.info("FINAL SCORE: %o", this.score);
    },
    clear: function() {
      clearInterval(this.timer);
      this.queue.length = 0;
      this.final.length = 0;
      this.score = 0;
    }
};

module.exports = Scorekeeper;
},{"./constants":3}],16:[function(require,module,exports){
"use strict;"

var Serializer = {
    export: function(gameboard) {
        return {
            _meta: {
                timestamp: +new Date,
                score: gameboard.scorekeeper.score,
                timer: gameboard.clock.seconds,
                transcripts: gameboard.emitter._transcripts || [],
                user: {}
            },
            options: {
                $el: gameboard.$el.selector,
                board: gameboard.board._table,
                scorekeeper: { queue: gameboard.scorekeeper.queue, final: gameboard.scorekeeper.final },
                flashContainer: gameboard.flashContainer.selector,
                theme: gameboard.theme,
                debug_mode: gameboard.debug_mode,
                dimensions: gameboard.dimensions,
                mines: gameboard.mines,
                userMoves: gameboard.userMoves,
                isMobile: gameboard.isMobile
            }
        };
    },
    import: function(exported) {
        // 1. new Gameboard object (defaults is ok)
        // 2. replace `board` with new Multimap:
        //     - count arrays at first level in board for num rows
        //          [[[{"row":0,"cell":0,"state":{"_flags":"1000"},"danger":0},
        //          {"row":0,"cell":2,"state":{"_flags":"0010"}}]]]
        //     - parse each object to create new Square(row, cell, danger, _flags)
        // 3. $el = $(exported.$el)
        // 4. flashContainer = $(exported.flashContainer)
        // 5. theme = exported.theme
        // 6. debug_mode = exported.debug_mode
        // 7. dimensions = exported.dimensions
        // 8. mines = gameboard.mines
        // 9. userMoves = gameboad.userMoves, and isMobile
        // 10. make new Countdown with exported._meta.timer = seconds, clock.start()
        // 11. instantiate new TranscribingEmitter, loading _meta.transcripts into its _transcripts
        // 12. re-run the internal init() ops: _loadBoard, _renderGrid
    }
}

module.exports = Serializer;
},{}],17:[function(require,module,exports){
"use strict;"

var BitFlagFactory = require('./lib/bit-flag-factory'),
    Symbols = require('./constants').Symbols,
    Flags = require('./constants').Flags,

    BitFlags = new BitFlagFactory([ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ]);

function Square(row, cell, danger, flags) {
    if (!(this instanceof Square))
        return new Square(arguments);
    this.row = row;
    this.cell = cell;
    this.state = flags ? new BitFlags(flags) : new BitFlags;
    this.danger = (danger == +danger) ? +danger : 0;

    if (this.danger > 0) this.index();
}

Square.prototype = {
    constructor: Square,
    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    setDanger: function(idx) { if (idx == +idx) { this.danger = +idx; this.danger > 0 && this.index(); } },
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
},{"./constants":3,"./lib/bit-flag-factory":8}],18:[function(require,module,exports){
"use strict;"

var $C = require('./constants');

var ThemeStyler = {
	set: function(theme, $el) {

		$el || ($el = $($C.DefaultConfig.board));

		var themeFile = $C.Themes[theme],
			$head = $el.parents("body").siblings("head"),
			$styles = $head.find("link"),

			hasPreExisting = function(stylesheets) {
				return !!stylesheets.filter(function() {
					return !!~$(this).attr('href').indexOf(themeFile);
				}).length
			},
			// build a new <link> tag for the desired theme stylesheet:
			$link = $("<link />", {
				rel: 'stylesheet',
				type: 'text/css',
				href: 'css/' + themeFile + '.css'
			});
		// using $el as anchor to the DOM, go up and
		// look for light.css or dark.css, and--if necessary--swap
		// it out for `theme`.
		// Add $link iff it doesn't already exist!
		if (!hasPreExisting($styles))
			$styles.after($link);
	}
};

module.exports = ThemeStyler;
},{"./constants":3}],19:[function(require,module,exports){
"use strict;"

var Emitter = require('./lib/emitter'),
    TranscriptionStrategy = require('./transcription-strategy');

function TranscribingEmitter(strategy) {
    Emitter.call(this);
    this._transcripts = [];
    this._strategy = (strategy && strategy.apply) ? strategy : TranscriptionStrategy;
}

TranscribingEmitter.prototype = Object.create(Emitter.prototype);
TranscribingEmitter.prototype.constructor = TranscribingEmitter;

TranscribingEmitter.prototype.__trigger__ = TranscribingEmitter.prototype.trigger;
TranscribingEmitter.prototype.trigger = function(/* data... [varargs] */) {
    var args = [].slice.call(arguments);
    // send original params to the subscribers...
    this.__trigger__.apply(this, args);
    // ...then alter the params for the transcript's records
    this._transcripts.push(this._strategy.apply(args));
};

module.exports = TranscribingEmitter;
},{"./lib/emitter":9,"./transcription-strategy":20}],20:[function(require,module,exports){
"use strict;"

var DefaultTranscriptionStrategy = {
        apply: function(data) {
            if (data && data[0]) {
                switch (data[0]) {
                    case "sq:open":
                    case "sq:close":
                    case "sq:flag":
                    case "sq:unflag":
                    case "sq:mine":
                        // standard Square-based event
                        // 0: event name, 1: Square instance, 2: jQuery-wrapped DOM element
                        if (data[1].constructor.name === "Square")
                            data[1] = JSON.stringify(data[1]);
                        if (data[2] instanceof jQuery)
                            data[2] = buildDOMString(data[2]);
                        break;
                    case "gb:start":
                    case "gb:end:win":
                    case "gb:end:over":
                        // standard Gameboard-based event
                        if (data[1].constructor.name === "Multimap")
                            data[1] = JSON.stringify(data[1]);
                        break;
                }
                // prefix array contents with the current timestamp as its key
                data.unshift(+new Date);
                return data;
            }
        }
};
module.exports = DefaultTranscriptionStrategy;

// Takes a <td> DOM node, and converts it to a
// string descriptor, e.g., "tr#row0 td.cell0.mined.closed".
function buildDOMString($el) {
    var node = $el instanceof jQuery ? $el[0] : $el,
        // sorts class names, putting the "cellX" class first
        SORT_FN_CELL_FIRST = function(a, b) {
            function incipit(str) { return str.substring(0, "cell".length).toLowerCase(); };
            return (incipit(a) === "cell" || incipit(b) === "cell" || a > b) ? 1 : (a < b) ? -1 : 0;
        };
    return node.parentNode.tagName.toLowerCase()
        + "#" + node.parentNode.id + " "
        + node.tagName.toLowerCase() + "."
        + node.className.split(' ')
        .sort(SORT_FN_CELL_FIRST)
        .join('.');
}

},{}],21:[function(require,module,exports){
"use strict;"

var $C = require('./constants'),
    ValidationError = require('./errors').ValidationError,
    // validation helper fns
    isNumeric = function(val) {
        return String(val).replace(/,/g, ''), (val.length !== 0 && !isNaN(+val) && isFinite(+val));
    },

    Validators = {
        BoardDimensions: {
            validate: function(dim) {
                // is numeric input
                if (!isNumeric(dim)) {
                    throw new ValidationError("User entered {0}, which is not a number, and an invalid board dimension.", dim);
                    return false;
                }
                // is not greater than MAX_DIMENSIONS constant
                if (!(dim <= $C.MAX_GRID_DIMENSIONS)) {
                    throw new ValidationError("User entered {0}, which is greater than the game's maximum grid dimensions", +dim);
                    return false;
                }
                // else...
                return true;
            }
        },
        MineCount: {
            validate: function(mines, maxPossible) {
                console.log("mines: %o, maxPossible: %o", mines, maxPossible)
                // is numeric input
                if (!isNumeric(mines)) {
                    throw new ValidationError("User entered {0}, which is not a number, and an invalid number of mines.", mines);
                    return false;
                }
                // is not greater than maxPossible for this configuration
                if (mines > maxPossible) {
                    throw new ValidationError("User entered {0}, which is greater than the possible number of mines ({1}).", +mines, maxPossible);
                    return false;
                }
                // else...
                return true;
            }
        }
};

module.exports = Validators;
},{"./constants":3,"./errors":6}],22:[function(require,module,exports){
/*! jQuery plugin for Hammer.JS - v1.0.1 - 2014-02-03
 * http://eightmedia.github.com/hammer.js
 *
 * Hammer.JS - v1.0.7dev - 2014-02-18
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */

(function(window, undefined) {
  'use strict';

/**
 * Hammer
 * use this to create instances
 * @param   {HTMLElement}   element
 * @param   {Object}        options
 * @returns {Hammer.Instance}
 * @constructor
 */
var Hammer = function(element, options) {
  return new Hammer.Instance(element, options || {});
};

// default settings
Hammer.defaults = {
  // add styles and attributes to the element to prevent the browser from doing
  // its native behavior. this doesnt prevent the scrolling, but cancels
  // the contextmenu, tap highlighting etc
  // set to false to disable this
  stop_browser_behavior: {
    // this also triggers onselectstart=false for IE
    userSelect       : 'none',
    // this makes the element blocking in IE10 >, you could experiment with the value
    // see for more options this issue; https://github.com/EightMedia/hammer.js/issues/241
    touchAction      : 'none',
    touchCallout     : 'none',
    contentZooming   : 'none',
    userDrag         : 'none',
    tapHighlightColor: 'rgba(0,0,0,0)'
  }

  //
  // more settings are defined per gesture at gestures.js
  //
};

// detect touchevents
Hammer.HAS_POINTEREVENTS = window.navigator.pointerEnabled || window.navigator.msPointerEnabled;
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

// dont use mouseevents on mobile devices
Hammer.MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android|silk/i;
Hammer.NO_MOUSEEVENTS = Hammer.HAS_TOUCHEVENTS && window.navigator.userAgent.match(Hammer.MOBILE_REGEX);

// eventtypes per touchevent (start, move, end)
// are filled by Hammer.event.determineEventTypes on setup
Hammer.EVENT_TYPES = {};

// direction defines
Hammer.DIRECTION_DOWN = 'down';
Hammer.DIRECTION_LEFT = 'left';
Hammer.DIRECTION_UP = 'up';
Hammer.DIRECTION_RIGHT = 'right';

// pointer type
Hammer.POINTER_MOUSE = 'mouse';
Hammer.POINTER_TOUCH = 'touch';
Hammer.POINTER_PEN = 'pen';

// interval in which Hammer recalculates current velocity in ms
Hammer.UPDATE_VELOCITY_INTERVAL = 20;

// touch event defines
Hammer.EVENT_START = 'start';
Hammer.EVENT_MOVE = 'move';
Hammer.EVENT_END = 'end';

// hammer document where the base events are added at
Hammer.DOCUMENT = window.document;

// plugins and gestures namespaces
Hammer.plugins = Hammer.plugins || {};
Hammer.gestures = Hammer.gestures || {};


// if the window events are set...
Hammer.READY = false;

/**
 * setup events to detect gestures on the document
 */
function setup() {
  if(Hammer.READY) {
    return;
  }

  // find what eventtypes we add listeners to
  Hammer.event.determineEventTypes();

  // Register all gestures inside Hammer.gestures
  Hammer.utils.each(Hammer.gestures, function(gesture){
    Hammer.detection.register(gesture);
  });

  // Add touch events on the document
  Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_MOVE, Hammer.detection.detect);
  Hammer.event.onTouch(Hammer.DOCUMENT, Hammer.EVENT_END, Hammer.detection.detect);

  // Hammer is ready...!
  Hammer.READY = true;
}

Hammer.utils = {
  /**
   * extend method,
   * also used for cloning when dest is an empty object
   * @param   {Object}    dest
   * @param   {Object}    src
   * @parm  {Boolean}  merge    do a merge
   * @returns {Object}    dest
   */
  extend: function extend(dest, src, merge) {
    for(var key in src) {
      if(dest[key] !== undefined && merge) {
        continue;
      }
      dest[key] = src[key];
    }
    return dest;
  },


  /**
   * for each
   * @param obj
   * @param iterator
   */
  each: function(obj, iterator, context) {
    var i, length;
    // native forEach on arrays
    if ('forEach' in obj) {
      obj.forEach(iterator, context);
    }
    // arrays
    else if(obj.length !== undefined) {
      for (i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === false) {
          return;
        }
      }
    }
    // objects
    else {
      for (i in obj) {
        if (obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj) === false) {
          return;
        }
      }
    }
  },

  /**
   * find if a node is in the given parent
   * used for event delegation tricks
   * @param   {HTMLElement}   node
   * @param   {HTMLElement}   parent
   * @returns {boolean}       has_parent
   */
  hasParent: function(node, parent) {
    while(node) {
      if(node == parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },


  /**
   * get the center of all the touches
   * @param   {Array}     touches
   * @returns {Object}    center
   */
  getCenter: function getCenter(touches) {
    var valuesX = [], valuesY = [];

    Hammer.utils.each(touches, function(touch) {
      // I prefer clientX because it ignore the scrolling position
      valuesX.push(typeof touch.clientX !== 'undefined' ? touch.clientX : touch.pageX );
      valuesY.push(typeof touch.clientY !== 'undefined' ? touch.clientY : touch.pageY );
    });

    return {
      pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
      pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
    };
  },


  /**
   * calculate the velocity between two points
   * @param   {Number}    delta_time
   * @param   {Number}    delta_x
   * @param   {Number}    delta_y
   * @returns {Object}    velocity
   */
  getVelocity: function getVelocity(delta_time, delta_x, delta_y) {
    return {
      x: Math.abs(delta_x / delta_time) || 0,
      y: Math.abs(delta_y / delta_time) || 0
    };
  },


  /**
   * calculate the angle between two coordinates
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {Number}    angle
   */
  getAngle: function getAngle(touch1, touch2) {
    var y = touch2.pageY - touch1.pageY,
      x = touch2.pageX - touch1.pageX;
    return Math.atan2(y, x) * 180 / Math.PI;
  },


  /**
   * angle to direction define
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {String}    direction constant, like Hammer.DIRECTION_LEFT
   */
  getDirection: function getDirection(touch1, touch2) {
    var x = Math.abs(touch1.pageX - touch2.pageX),
      y = Math.abs(touch1.pageY - touch2.pageY);

    if(x >= y) {
      return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
    }
    else {
      return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
    }
  },


  /**
   * calculate the distance between two touches
   * @param   {Touch}     touch1
   * @param   {Touch}     touch2
   * @returns {Number}    distance
   */
  getDistance: function getDistance(touch1, touch2) {
    var x = touch2.pageX - touch1.pageX,
      y = touch2.pageY - touch1.pageY;
    return Math.sqrt((x * x) + (y * y));
  },


  /**
   * calculate the scale factor between two touchLists (fingers)
   * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
   * @param   {Array}     start
   * @param   {Array}     end
   * @returns {Number}    scale
   */
  getScale: function getScale(start, end) {
    // need two fingers...
    if(start.length >= 2 && end.length >= 2) {
      return this.getDistance(end[0], end[1]) /
        this.getDistance(start[0], start[1]);
    }
    return 1;
  },


  /**
   * calculate the rotation degrees between two touchLists (fingers)
   * @param   {Array}     start
   * @param   {Array}     end
   * @returns {Number}    rotation
   */
  getRotation: function getRotation(start, end) {
    // need two fingers
    if(start.length >= 2 && end.length >= 2) {
      return this.getAngle(end[1], end[0]) -
        this.getAngle(start[1], start[0]);
    }
    return 0;
  },


  /**
   * boolean if the direction is vertical
   * @param    {String}    direction
   * @returns  {Boolean}   is_vertical
   */
  isVertical: function isVertical(direction) {
    return (direction == Hammer.DIRECTION_UP || direction == Hammer.DIRECTION_DOWN);
  },


  /**
   * stop browser default behavior with css props
   * @param   {HtmlElement}   element
   * @param   {Object}        css_props
   */
  stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(element, css_props) {
    if(!css_props || !element || !element.style) {
      return;
    }

    // with css properties for modern browsers
    Hammer.utils.each(['webkit', 'khtml', 'moz', 'Moz', 'ms', 'o', ''], function(vendor) {
      Hammer.utils.each(css_props, function(value, prop) {
          // vender prefix at the property
          if(vendor) {
            prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
          }
          // set the style
          if(prop in element.style) {
            element.style[prop] = value;
          }
      });
    });

    // also the disable onselectstart
    if(css_props.userSelect == 'none') {
      element.onselectstart = function() {
        return false;
      };
    }

    // and disable ondragstart
    if(css_props.userDrag == 'none') {
      element.ondragstart = function() {
        return false;
      };
    }
  },


  /**
   * reverts all changes made by 'stopDefaultBrowserBehavior'
   * @param   {HtmlElement}   element
   * @param   {Object}        css_props
   */
  startDefaultBrowserBehavior: function startDefaultBrowserBehavior(element, css_props) {
    if(!css_props || !element || !element.style) {
      return;
    }

    // with css properties for modern browsers
    Hammer.utils.each(['webkit', 'khtml', 'moz', 'Moz', 'ms', 'o', ''], function(vendor) {
      Hammer.utils.each(css_props, function(value, prop) {
          // vender prefix at the property
          if(vendor) {
            prop = vendor + prop.substring(0, 1).toUpperCase() + prop.substring(1);
          }
          // reset the style
          if(prop in element.style) {
            element.style[prop] = '';
          }
      });
    });

    // also the enable onselectstart
    if(css_props.userSelect == 'none') {
      element.onselectstart = null;
    }

    // and enable ondragstart
    if(css_props.userDrag == 'none') {
      element.ondragstart = null;
    }
  }
};


/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}       element
 * @param   {Object}            [options={}]
 * @returns {Hammer.Instance}
 * @constructor
 */
Hammer.Instance = function(element, options) {
  var self = this;

  // setup HammerJS window events and register all gestures
  // this also sets up the default options
  setup();

  this.element = element;

  // start/stop detection option
  this.enabled = true;

  // merge options
  this.options = Hammer.utils.extend(
    Hammer.utils.extend({}, Hammer.defaults),
    options || {});

  // add some css to the element to prevent the browser from doing its native behavoir
  if(this.options.stop_browser_behavior) {
    Hammer.utils.stopDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
  }

  // start detection on touchstart
  this._eventStartHandler = Hammer.event.onTouch(element, Hammer.EVENT_START, function(ev) {
    if(self.enabled) {
      Hammer.detection.startDetect(self, ev);
    }
  });

  // keep a list of user event handlers which needs to be removed when calling 'dispose'
  this._eventHandler = [];

  // return instance
  return this;
};


Hammer.Instance.prototype = {
  /**
   * bind events to the instance
   * @param   {String}      gesture
   * @param   {Function}    handler
   * @returns {Hammer.Instance}
   */
  on: function onEvent(gesture, handler) {
    var gestures = gesture.split(' ');
    Hammer.utils.each(gestures, function(gesture) {
      this.element.addEventListener(gesture, handler, false);
      this._eventHandler.push({ gesture: gesture, handler: handler });
    }, this);
    return this;
  },


  /**
   * unbind events to the instance
   * @param   {String}      gesture
   * @param   {Function}    handler
   * @returns {Hammer.Instance}
   */
  off: function offEvent(gesture, handler) {
    var gestures = gesture.split(' ');
    Hammer.utils.each(gestures, function(gesture) {
      this.element.removeEventListener(gesture, handler, false);

      // remove the event handler from the internal list
      var index = -1;
      Hammer.utils.each(this._eventHandler, function(eventHandler, i) {
        if (index === -1 && eventHandler.gesture === gesture && eventHandler.handler === handler) {
          index = i;
        }
      }, this);

      if (index > -1) {
        this._eventHandler.splice(index, 1);
      }
    }, this);
    return this;
  },


  /**
   * trigger gesture event
   * @param   {String}      gesture
   * @param   {Object}      [eventData]
   * @returns {Hammer.Instance}
   */
  trigger: function triggerEvent(gesture, eventData) {
    // optional
    if(!eventData) {
      eventData = {};
    }

    // create DOM event
    var event = Hammer.DOCUMENT.createEvent('Event');
    event.initEvent(gesture, true, true);
    event.gesture = eventData;

    // trigger on the target if it is in the instance element,
    // this is for event delegation tricks
    var element = this.element;
    if(Hammer.utils.hasParent(eventData.target, element)) {
      element = eventData.target;
    }

    element.dispatchEvent(event);
    return this;
  },


  /**
   * enable of disable hammer.js detection
   * @param   {Boolean}   state
   * @returns {Hammer.Instance}
   */
  enable: function enable(state) {
    this.enabled = state;
    return this;
  },


  /**
   * dispose this hammer instance
   * @returns {Hammer.Instance}
   */
  dispose: function dispose() {

    // undo all changes made by stop_browser_behavior
    if(this.options.stop_browser_behavior) {
      Hammer.utils.startDefaultBrowserBehavior(this.element, this.options.stop_browser_behavior);
    }

    // unbind all custom event handlers
    Hammer.utils.each(this._eventHandler, function(eventHandler) {
      this.element.removeEventListener(eventHandler.gesture, eventHandler.handler, false);
    }, this);
    this._eventHandler.length = 0;

    // unbind the start event listener
    Hammer.event.unbindDom(this.element, Hammer.EVENT_TYPES[Hammer.EVENT_START], this._eventStartHandler);
    return this;
  }
};


/**
 * this holds the last move event,
 * used to fix empty touchend issue
 * see the onTouch event for an explanation
 * @type {Object}
 */
var last_move_event = null;


/**
 * when the mouse is hold down, this is true
 * @type {Boolean}
 */
var enable_detect = false;


/**
 * when touch events have been fired, this is true
 * @type {Boolean}
 */
var touch_triggered = false;


Hammer.event = {
  /**
   * simple addEventListener
   * @param   {HTMLElement}   element
   * @param   {String}        type
   * @param   {Function}      handler
   */
  bindDom: function(element, type, handler) {
    var types = type.split(' ');
    Hammer.utils.each(types, function(type){
      element.addEventListener(type, handler, false);
    });
  },


  /**
   * simple removeEventListener
   * @param   {HTMLElement}   element
   * @param   {String}        type
   * @param   {Function}      handler
   */
  unbindDom: function(element, type, handler) {
    var types = type.split(' ');
    Hammer.utils.each(types, function(type){
      element.removeEventListener(type, handler, false);
    });
  },


  /**
   * touch events with mouse fallback
   * @param   {HTMLElement}   element
   * @param   {String}        eventType        like Hammer.EVENT_MOVE
   * @param   {Function}      handler
   */
  onTouch: function onTouch(element, eventType, handler) {
    var self = this;

    var fn = function bindDomOnTouch(ev) {
      var sourceEventType = ev.type.toLowerCase();

      // onmouseup, but when touchend has been fired we do nothing.
      // this is for touchdevices which also fire a mouseup on touchend
      if(sourceEventType.match(/mouse/) && touch_triggered) {
        return;
      }

      // mousebutton must be down or a touch event
      else if(sourceEventType.match(/touch/) ||   // touch events are always on screen
        sourceEventType.match(/pointerdown/) || // pointerevents touch
        (sourceEventType.match(/mouse/) && ev.which === 1)   // mouse is pressed
        ) {
        enable_detect = true;
      }

      // mouse isn't pressed
      else if(sourceEventType.match(/mouse/) && !ev.which) {
        enable_detect = false;
      }


      // we are in a touch event, set the touch triggered bool to true,
      // this for the conflicts that may occur on ios and android
      if(sourceEventType.match(/touch|pointer/)) {
        touch_triggered = true;
      }

      // count the total touches on the screen
      var count_touches = 0;

      // when touch has been triggered in this detection session
      // and we are now handling a mouse event, we stop that to prevent conflicts
      if(enable_detect) {
        // update pointerevent
        if(Hammer.HAS_POINTEREVENTS && eventType != Hammer.EVENT_END) {
          count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
        }
        // touch
        else if(sourceEventType.match(/touch/)) {
          count_touches = ev.touches.length;
        }
        // mouse
        else if(!touch_triggered) {
          count_touches = sourceEventType.match(/up/) ? 0 : 1;
        }

        // if we are in a end event, but when we remove one touch and
        // we still have enough, set eventType to move
        if(count_touches > 0 && eventType == Hammer.EVENT_END) {
          eventType = Hammer.EVENT_MOVE;
        }
        // no touches, force the end event
        else if(!count_touches) {
          eventType = Hammer.EVENT_END;
        }

        // store the last move event
        if(count_touches || last_move_event === null) {
          last_move_event = ev;
        }

        // trigger the handler
        handler.call(Hammer.detection, self.collectEventData(element, eventType, self.getTouchList(last_move_event, eventType), ev));

        // remove pointerevent from list
        if(Hammer.HAS_POINTEREVENTS && eventType == Hammer.EVENT_END) {
          count_touches = Hammer.PointerEvent.updatePointer(eventType, ev);
        }
      }

      // on the end we reset everything
      if(!count_touches) {
        last_move_event = null;
        enable_detect = false;
        touch_triggered = false;
        Hammer.PointerEvent.reset();
      }
    };

    this.bindDom(element, Hammer.EVENT_TYPES[eventType], fn);

    // return the bound function to be able to unbind it later
    return fn;
    },


  /**
   * we have different events for each device/browser
   * determine what we need and set them in the Hammer.EVENT_TYPES constant
   */
  determineEventTypes: function determineEventTypes() {
    // determine the eventtype we want to set
    var types;

    // pointerEvents magic
    if(Hammer.HAS_POINTEREVENTS) {
      types = Hammer.PointerEvent.getEvents();
    }
    // on Android, iOS, blackberry, windows mobile we dont want any mouseevents
    else if(Hammer.NO_MOUSEEVENTS) {
      types = [
        'touchstart',
        'touchmove',
        'touchend touchcancel'];
    }
    // for non pointer events browsers and mixed browsers,
    // like chrome on windows8 touch laptop
    else {
      types = [
        'touchstart mousedown',
        'touchmove mousemove',
        'touchend touchcancel mouseup'];
    }

    Hammer.EVENT_TYPES[Hammer.EVENT_START] = types[0];
    Hammer.EVENT_TYPES[Hammer.EVENT_MOVE] = types[1];
    Hammer.EVENT_TYPES[Hammer.EVENT_END] = types[2];
  },


  /**
   * create touchlist depending on the event
   * @param   {Object}    ev
   * @param   {String}    eventType   used by the fakemultitouch plugin
   */
  getTouchList: function getTouchList(ev/*, eventType*/) {
    // get the fake pointerEvent touchlist
    if(Hammer.HAS_POINTEREVENTS) {
      return Hammer.PointerEvent.getTouchList();
    }
    // get the touchlist
    else if(ev.touches) {
      return ev.touches;
    }
    // make fake touchlist from mouse position
    else {
      ev.identifier = 1;
      return [ev];
    }
  },


  /**
   * collect event data for Hammer js
   * @param   {HTMLElement}   element
   * @param   {String}        eventType        like Hammer.EVENT_MOVE
   * @param   {Object}        eventData
   */
  collectEventData: function collectEventData(element, eventType, touches, ev) {
    // find out pointerType
    var pointerType = Hammer.POINTER_TOUCH;
    if(ev.type.match(/mouse/) || Hammer.PointerEvent.matchType(Hammer.POINTER_MOUSE, ev)) {
      pointerType = Hammer.POINTER_MOUSE;
    }

    return {
      center     : Hammer.utils.getCenter(touches),
      timeStamp  : new Date().getTime(),
      target     : ev.target,
      touches    : touches,
      eventType  : eventType,
      pointerType: pointerType,
      srcEvent   : ev,

      /**
       * prevent the browser default actions
       * mostly used to disable scrolling of the browser
       */
      preventDefault: function() {
        if(this.srcEvent.preventManipulation) {
          this.srcEvent.preventManipulation();
        }

        if(this.srcEvent.preventDefault) {
          this.srcEvent.preventDefault();
        }
      },

      /**
       * stop bubbling the event up to its parents
       */
      stopPropagation: function() {
        this.srcEvent.stopPropagation();
      },

      /**
       * immediately stop gesture detection
       * might be useful after a swipe was detected
       * @return {*}
       */
      stopDetect: function() {
        return Hammer.detection.stopDetect();
      }
    };
  }
};

Hammer.PointerEvent = {
  /**
   * holds all pointers
   * @type {Object}
   */
  pointers: {},

  /**
   * get a list of pointers
   * @returns {Array}     touchlist
   */
  getTouchList: function() {
    var self = this;
    var touchlist = [];

    // we can use forEach since pointerEvents only is in IE10
    Hammer.utils.each(self.pointers, function(pointer){
      touchlist.push(pointer);
    });

    return touchlist;
  },

  /**
   * update the position of a pointer
   * @param   {String}   type             Hammer.EVENT_END
   * @param   {Object}   pointerEvent
   */
  updatePointer: function(type, pointerEvent) {
    if(type == Hammer.EVENT_END) {
      delete this.pointers[pointerEvent.pointerId];
    }
    else {
      pointerEvent.identifier = pointerEvent.pointerId;
      this.pointers[pointerEvent.pointerId] = pointerEvent;
    }

    return Object.keys(this.pointers).length;
  },

  /**
   * check if ev matches pointertype
   * @param   {String}        pointerType     Hammer.POINTER_MOUSE
   * @param   {PointerEvent}  ev
   */
  matchType: function(pointerType, ev) {
    if(!ev.pointerType) {
      return false;
    }

    var pt = ev.pointerType,
      types = {};
    types[Hammer.POINTER_MOUSE] = (pt === ev.MSPOINTER_TYPE_MOUSE || pt === Hammer.POINTER_MOUSE);
    types[Hammer.POINTER_TOUCH] = (pt === ev.MSPOINTER_TYPE_TOUCH || pt === Hammer.POINTER_TOUCH);
    types[Hammer.POINTER_PEN] = (pt === ev.MSPOINTER_TYPE_PEN || pt === Hammer.POINTER_PEN);
    return types[pointerType];
  },


  /**
   * get events
   */
  getEvents: function() {
    return [
      'pointerdown MSPointerDown',
      'pointermove MSPointerMove',
      'pointerup pointercancel MSPointerUp MSPointerCancel'
    ];
  },

  /**
   * reset the list
   */
  reset: function() {
    this.pointers = {};
  }
};


Hammer.detection = {
  // contains all registred Hammer.gestures in the correct order
  gestures: [],

  // data of the current Hammer.gesture detection session
  current : null,

  // the previous Hammer.gesture session data
  // is a full clone of the previous gesture.current object
  previous: null,

  // when this becomes true, no gestures are fired
  stopped : false,


  /**
   * start Hammer.gesture detection
   * @param   {Hammer.Instance}   inst
   * @param   {Object}            eventData
   */
  startDetect: function startDetect(inst, eventData) {
    // already busy with a Hammer.gesture detection on an element
    if(this.current) {
      return;
    }

    this.stopped = false;

    this.current = {
      inst      : inst, // reference to HammerInstance we're working for
      startEvent: Hammer.utils.extend({}, eventData), // start eventData for distances, timing etc
      lastEvent : false, // last eventData
      lastVEvent: false, // last eventData for velocity.
      velocity  : false, // current velocity
      name      : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
    };

    this.detect(eventData);
  },


  /**
   * Hammer.gesture detection
   * @param   {Object}    eventData
   */
  detect: function detect(eventData) {
    if(!this.current || this.stopped) {
      return;
    }

    // extend event data with calculations about scale, distance etc
    eventData = this.extendEventData(eventData);

    // instance options
    var inst_options = this.current.inst.options;

    // call Hammer.gesture handlers
    Hammer.utils.each(this.gestures, function(gesture) {
      // only when the instance options have enabled this gesture
      if(!this.stopped && inst_options[gesture.name] !== false) {
        // if a handler returns false, we stop with the detection
        if(gesture.handler.call(gesture, eventData, this.current.inst) === false) {
          this.stopDetect();
          return false;
        }
      }
    }, this);

    // store as previous event event
    if(this.current) {
      this.current.lastEvent = eventData;
    }

    // endevent, but not the last touch, so dont stop
    if(eventData.eventType == Hammer.EVENT_END && !eventData.touches.length - 1) {
      this.stopDetect();
    }

    return eventData;
  },


  /**
   * clear the Hammer.gesture vars
   * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
   * to stop other Hammer.gestures from being fired
   */
  stopDetect: function stopDetect() {
    // clone current data to the store as the previous gesture
    // used for the double tap gesture, since this is an other gesture detect session
    this.previous = Hammer.utils.extend({}, this.current);

    // reset the current
    this.current = null;

    // stopped!
    this.stopped = true;
  },


  /**
   * extend eventData for Hammer.gestures
   * @param   {Object}   ev
   * @returns {Object}   ev
   */
  extendEventData: function extendEventData(ev) {
    var startEv = this.current.startEvent,
        lastVEv = this.current.lastVEvent;

    // if the touches change, set the new touches over the startEvent touches
    // this because touchevents don't have all the touches on touchstart, or the
    // user must place his fingers at the EXACT same time on the screen, which is not realistic
    // but, sometimes it happens that both fingers are touching at the EXACT same time
    if(startEv && (ev.touches.length != startEv.touches.length || ev.touches === startEv.touches)) {
      // extend 1 level deep to get the touchlist with the touch objects
      startEv.touches = [];
      Hammer.utils.each(ev.touches, function(touch) {
        startEv.touches.push(Hammer.utils.extend({}, touch));
      });
    }

    var delta_time = ev.timeStamp - startEv.timeStamp
      , delta_x = ev.center.pageX - startEv.center.pageX
      , delta_y = ev.center.pageY - startEv.center.pageY
      , interimAngle
      , interimDirection
      , velocity = this.current.velocity;

    if (lastVEv !== false && ev.timeStamp - lastVEv.timeStamp > Hammer.UPDATE_VELOCITY_INTERVAL) {

        velocity =  Hammer.utils.getVelocity(ev.timeStamp - lastVEv.timeStamp, ev.center.pageX - lastVEv.center.pageX, ev.center.pageY - lastVEv.center.pageY);
        this.current.lastVEvent = ev;

        if (velocity.x > 0 && velocity.y > 0) {
            this.current.velocity = velocity;
        }

    } else if(this.current.velocity === false) {
        velocity = Hammer.utils.getVelocity(delta_time, delta_x, delta_y);
        this.current.velocity = velocity;
        this.current.lastVEvent = ev;
    }

    // end events (e.g. dragend) don't have useful values for interimDirection & interimAngle
    // because the previous event has exactly the same coordinates
    // so for end events, take the previous values of interimDirection & interimAngle
    // instead of recalculating them and getting a spurious '0'
    if(ev.eventType === 'end') {
      interimAngle = this.current.lastEvent && this.current.lastEvent.interimAngle;
      interimDirection = this.current.lastEvent && this.current.lastEvent.interimDirection;
    }
    else {
      interimAngle = this.current.lastEvent && Hammer.utils.getAngle(this.current.lastEvent.center, ev.center);
      interimDirection = this.current.lastEvent && Hammer.utils.getDirection(this.current.lastEvent.center, ev.center);
    }

    Hammer.utils.extend(ev, {
      deltaTime: delta_time,

      deltaX: delta_x,
      deltaY: delta_y,

      velocityX: velocity.x,
      velocityY: velocity.y,

      distance: Hammer.utils.getDistance(startEv.center, ev.center),

      angle: Hammer.utils.getAngle(startEv.center, ev.center),
      interimAngle: interimAngle,

      direction: Hammer.utils.getDirection(startEv.center, ev.center),
      interimDirection: interimDirection,

      scale: Hammer.utils.getScale(startEv.touches, ev.touches),
      rotation: Hammer.utils.getRotation(startEv.touches, ev.touches),

      startEvent: startEv
    });

    return ev;
  },


  /**
   * register new gesture
   * @param   {Object}    gesture object, see gestures.js for documentation
   * @returns {Array}     gestures
   */
  register: function register(gesture) {
    // add an enable gesture options if there is no given
    var options = gesture.defaults || {};
    if(options[gesture.name] === undefined) {
      options[gesture.name] = true;
    }

    // extend Hammer default options with the Hammer.gesture options
    Hammer.utils.extend(Hammer.defaults, options, true);

    // set its index
    gesture.index = gesture.index || 1000;

    // add Hammer.gesture to the list
    this.gestures.push(gesture);

    // sort the list by index
    this.gestures.sort(function(a, b) {
      if(a.index < b.index) { return -1; }
      if(a.index > b.index) { return 1; }
      return 0;
    });

    return this.gestures;
  }
};


/**
 * Drag
 * Move with x fingers (default 1) around on the page. Blocking the scrolling when
 * moving left and right is a good practice. When all the drag events are blocking
 * you disable scrolling on that area.
 * @events  drag, drapleft, dragright, dragup, dragdown
 */
Hammer.gestures.Drag = {
  name     : 'drag',
  index    : 50,
  defaults : {
    drag_min_distance            : 10,

    // Set correct_for_drag_min_distance to true to make the starting point of the drag
    // be calculated from where the drag was triggered, not from where the touch started.
    // Useful to avoid a jerk-starting drag, which can make fine-adjustments
    // through dragging difficult, and be visually unappealing.
    correct_for_drag_min_distance: true,

    // set 0 for unlimited, but this can conflict with transform
    drag_max_touches             : 1,

    // prevent default browser behavior when dragging occurs
    // be careful with it, it makes the element a blocking element
    // when you are using the drag gesture, it is a good practice to set this true
    drag_block_horizontal        : false,
    drag_block_vertical          : false,

    // drag_lock_to_axis keeps the drag gesture on the axis that it started on,
    // It disallows vertical directions if the initial direction was horizontal, and vice versa.
    drag_lock_to_axis            : false,

    // drag lock only kicks in when distance > drag_lock_min_distance
    // This way, locking occurs only when the distance has become large enough to reliably determine the direction
    drag_lock_min_distance       : 25
  },

  triggered: false,
  handler  : function dragGesture(ev, inst) {
    // current gesture isnt drag, but dragged is true
    // this means an other gesture is busy. now call dragend
    if(Hammer.detection.current.name != this.name && this.triggered) {
      inst.trigger(this.name + 'end', ev);
      this.triggered = false;
      return;
    }

    // max touches
    if(inst.options.drag_max_touches > 0 &&
      ev.touches.length > inst.options.drag_max_touches) {
      return;
    }

    switch(ev.eventType) {
      case Hammer.EVENT_START:
        this.triggered = false;
        break;

      case Hammer.EVENT_MOVE:
        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(ev.distance < inst.options.drag_min_distance &&
          Hammer.detection.current.name != this.name) {
          return;
        }

        // we are dragging!
        if(Hammer.detection.current.name != this.name) {
          Hammer.detection.current.name = this.name;
          if(inst.options.correct_for_drag_min_distance && ev.distance > 0) {
            // When a drag is triggered, set the event center to drag_min_distance pixels from the original event center.
            // Without this correction, the dragged distance would jumpstart at drag_min_distance pixels instead of at 0.
            // It might be useful to save the original start point somewhere
            var factor = Math.abs(inst.options.drag_min_distance / ev.distance);
            Hammer.detection.current.startEvent.center.pageX += ev.deltaX * factor;
            Hammer.detection.current.startEvent.center.pageY += ev.deltaY * factor;

            // recalculate event data using new start point
            ev = Hammer.detection.extendEventData(ev);
          }
        }

        // lock drag to axis?
        if(Hammer.detection.current.lastEvent.drag_locked_to_axis || (inst.options.drag_lock_to_axis && inst.options.drag_lock_min_distance <= ev.distance)) {
          ev.drag_locked_to_axis = true;
        }
        var last_direction = Hammer.detection.current.lastEvent.direction;
        if(ev.drag_locked_to_axis && last_direction !== ev.direction) {
          // keep direction on the axis that the drag gesture started on
          if(Hammer.utils.isVertical(last_direction)) {
            ev.direction = (ev.deltaY < 0) ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
          }
          else {
            ev.direction = (ev.deltaX < 0) ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
          }
        }

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
          this.triggered = true;
        }

        // trigger normal event
        inst.trigger(this.name, ev);

        // direction event, like dragdown
        inst.trigger(this.name + ev.direction, ev);

        // block the browser events
        if((inst.options.drag_block_vertical && Hammer.utils.isVertical(ev.direction)) ||
          (inst.options.drag_block_horizontal && !Hammer.utils.isVertical(ev.direction))) {
          ev.preventDefault();
        }
        break;

      case Hammer.EVENT_END:
        // trigger dragend
        if(this.triggered) {
          inst.trigger(this.name + 'end', ev);
        }

        this.triggered = false;
        break;
    }
  }
};

/**
 * Hold
 * Touch stays at the same place for x time
 * @events  hold
 */
Hammer.gestures.Hold = {
  name    : 'hold',
  index   : 10,
  defaults: {
    hold_timeout  : 500,
    hold_threshold: 1
  },
  timer   : null,
  handler : function holdGesture(ev, inst) {
    switch(ev.eventType) {
      case Hammer.EVENT_START:
        // clear any running timers
        clearTimeout(this.timer);

        // set the gesture so we can check in the timeout if it still is
        Hammer.detection.current.name = this.name;

        // set timer and if after the timeout it still is hold,
        // we trigger the hold event
        this.timer = setTimeout(function() {
          if(Hammer.detection.current.name == 'hold') {
            inst.trigger('hold', ev);
          }
        }, inst.options.hold_timeout);
        break;

      // when you move or end we clear the timer
      case Hammer.EVENT_MOVE:
        if(ev.distance > inst.options.hold_threshold) {
          clearTimeout(this.timer);
        }
        break;

      case Hammer.EVENT_END:
        clearTimeout(this.timer);
        break;
    }
  }
};

/**
 * Release
 * Called as last, tells the user has released the screen
 * @events  release
 */
Hammer.gestures.Release = {
  name   : 'release',
  index  : Infinity,
  handler: function releaseGesture(ev, inst) {
    if(ev.eventType == Hammer.EVENT_END) {
      inst.trigger(this.name, ev);
    }
  }
};

/**
 * Swipe
 * triggers swipe events when the end velocity is above the threshold
 * @events  swipe, swipeleft, swiperight, swipeup, swipedown
 */
Hammer.gestures.Swipe = {
  name    : 'swipe',
  index   : 40,
  defaults: {
    // set 0 for unlimited, but this can conflict with transform
    swipe_min_touches: 1,
    swipe_max_touches: 1,
    swipe_velocity   : 0.7
  },
  handler : function swipeGesture(ev, inst) {
    if(ev.eventType == Hammer.EVENT_END) {
      // max touches
      if(inst.options.swipe_max_touches > 0 &&
        ev.touches.length < inst.options.swipe_min_touches &&
        ev.touches.length > inst.options.swipe_max_touches) {
        return;
      }

      // when the distance we moved is too small we skip this gesture
      // or we can be already in dragging
      if(ev.velocityX > inst.options.swipe_velocity ||
        ev.velocityY > inst.options.swipe_velocity) {
        // trigger swipe events
        inst.trigger(this.name, ev);
        inst.trigger(this.name + ev.direction, ev);
      }
    }
  }
};

/**
 * Tap/DoubleTap
 * Quick touch at a place or double at the same place
 * @events  tap, doubletap
 */
Hammer.gestures.Tap = {
  name    : 'tap',
  index   : 100,
  defaults: {
    tap_max_touchtime : 250,
    tap_max_distance  : 10,
    tap_always        : true,
    doubletap_distance: 20,
    doubletap_interval: 300
  },
  handler : function tapGesture(ev, inst) {
    if(ev.eventType == Hammer.EVENT_MOVE && !Hammer.detection.current.reachedTapMaxDistance) {
      //Track the distance we've moved. If it's above the max ONCE, remember that (fixes #406).
      Hammer.detection.current.reachedTapMaxDistance = (ev.distance > inst.options.tap_max_distance);
    } else if(ev.eventType == Hammer.EVENT_END && ev.srcEvent.type != 'touchcancel') {
      // previous gesture, for the double tap since these are two different gesture detections
      var prev = Hammer.detection.previous,
        did_doubletap = false;

      // when the touchtime is higher then the max touch time
      // or when the moving distance is too much
      if(Hammer.detection.current.reachedTapMaxDistance || ev.deltaTime > inst.options.tap_max_touchtime) {
        return;
      }

      // check if double tap
      if(prev && prev.name == 'tap' &&
        (ev.timeStamp - prev.lastEvent.timeStamp) < inst.options.doubletap_interval &&
        ev.distance < inst.options.doubletap_distance) {
        inst.trigger('doubletap', ev);
        did_doubletap = true;
      }

      // do a single tap
      if(!did_doubletap || inst.options.tap_always) {
        Hammer.detection.current.name = 'tap';
        inst.trigger(Hammer.detection.current.name, ev);
      }
    }
  }
};

/**
 * Touch
 * Called as first, tells the user has touched the screen
 * @events  touch
 */
Hammer.gestures.Touch = {
  name    : 'touch',
  index   : -Infinity,
  defaults: {
    // call preventDefault at touchstart, and makes the element blocking by
    // disabling the scrolling of the page, but it improves gestures like
    // transforming and dragging.
    // be careful with using this, it can be very annoying for users to be stuck
    // on the page
    prevent_default    : false,

    // disable mouse events, so only touch (or pen!) input triggers events
    prevent_mouseevents: false
  },
  handler : function touchGesture(ev, inst) {
    if(inst.options.prevent_mouseevents && ev.pointerType == Hammer.POINTER_MOUSE) {
      ev.stopDetect();
      return;
    }

    if(inst.options.prevent_default) {
      ev.preventDefault();
    }

    if(ev.eventType == Hammer.EVENT_START) {
      inst.trigger(this.name, ev);
    }
  }
};


/**
 * Transform
 * User want to scale or rotate with 2 fingers
 * @events  transform, pinch, pinchin, pinchout, rotate
 */
Hammer.gestures.Transform = {
  name     : 'transform',
  index    : 45,
  defaults : {
    // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
    transform_min_scale   : 0.01,
    // rotation in degrees
    transform_min_rotation: 1,
    // prevent default browser behavior when two touches are on the screen
    // but it makes the element a blocking element
    // when you are using the transform gesture, it is a good practice to set this true
    transform_always_block: false
  },
  triggered: false,
  handler  : function transformGesture(ev, inst) {
    // current gesture isnt drag, but dragged is true
    // this means an other gesture is busy. now call dragend
    if(Hammer.detection.current.name != this.name && this.triggered) {
      inst.trigger(this.name + 'end', ev);
      this.triggered = false;
      return;
    }

    // atleast multitouch
    if(ev.touches.length < 2) {
      return;
    }

    // prevent default when two fingers are on the screen
    if(inst.options.transform_always_block) {
      ev.preventDefault();
    }

    switch(ev.eventType) {
      case Hammer.EVENT_START:
        this.triggered = false;
        break;

      case Hammer.EVENT_MOVE:
        var scale_threshold = Math.abs(1 - ev.scale);
        var rotation_threshold = Math.abs(ev.rotation);

        // when the distance we moved is too small we skip this gesture
        // or we can be already in dragging
        if(scale_threshold < inst.options.transform_min_scale &&
          rotation_threshold < inst.options.transform_min_rotation) {
          return;
        }

        // we are transforming!
        Hammer.detection.current.name = this.name;

        // first time, trigger dragstart event
        if(!this.triggered) {
          inst.trigger(this.name + 'start', ev);
          this.triggered = true;
        }

        inst.trigger(this.name, ev); // basic transform event

        // trigger rotate event
        if(rotation_threshold > inst.options.transform_min_rotation) {
          inst.trigger('rotate', ev);
        }

        // trigger pinch event
        if(scale_threshold > inst.options.transform_min_scale) {
          inst.trigger('pinch', ev);
          inst.trigger('pinch' + ((ev.scale < 1) ? 'in' : 'out'), ev);
        }
        break;

      case Hammer.EVENT_END:
        // trigger dragend
        if(this.triggered) {
          inst.trigger(this.name + 'end', ev);
        }

        this.triggered = false;
        break;
    }
  }
};

  // Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if(typeof define == 'function' && define.amd) {
    // define as an anonymous module
    define(function() { return Hammer; });
  }

  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if(typeof module === 'object' && module.exports) {
    module.exports = Hammer;
  }

  else {
    window.Hammer = Hammer;
  }

})(window);

/*! jQuery plugin for Hammer.JS - v1.0.1 - 2014-02-03
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2014 Jorik Tangelder <j.tangelder@gmail.com>;
 * Licensed under the MIT license */(function(window, undefined) {
  'use strict';

function setup(Hammer, $) {
  /**
   * bind dom events
   * this overwrites addEventListener
   * @param   {HTMLElement}   element
   * @param   {String}        eventTypes
   * @param   {Function}      handler
   */
  Hammer.event.bindDom = function(element, eventTypes, handler) {
    $(element).on(eventTypes, function(ev) {
      var data = ev.originalEvent || ev;

      if(data.pageX === undefined) {
        data.pageX = ev.pageX;
        data.pageY = ev.pageY;
      }

      if(!data.target) {
        data.target = ev.target;
      }

      if(data.which === undefined) {
        data.which = data.button;
      }

      if(!data.preventDefault) {
        data.preventDefault = ev.preventDefault;
      }

      if(!data.stopPropagation) {
        data.stopPropagation = ev.stopPropagation;
      }

      handler.call(this, data);
    });
  };

  /**
   * the methods are called by the instance, but with the jquery plugin
   * we use the jquery event methods instead.
   * @this    {Hammer.Instance}
   * @return  {jQuery}
   */
  Hammer.Instance.prototype.on = function(types, handler) {
    return $(this.element).on(types, handler);
  };
  Hammer.Instance.prototype.off = function(types, handler) {
    return $(this.element).off(types, handler);
  };


  /**
   * trigger events
   * this is called by the gestures to trigger an event like 'tap'
   * @this    {Hammer.Instance}
   * @param   {String}    gesture
   * @param   {Object}    eventData
   * @return  {jQuery}
   */
  Hammer.Instance.prototype.trigger = function(gesture, eventData) {
    var el = $(this.element);
    if(el.has(eventData.target).length) {
      el = $(eventData.target);
    }

    return el.trigger({
      type   : gesture,
      gesture: eventData
    });
  };


  /**
   * jQuery plugin
   * create instance of Hammer and watch for gestures,
   * and when called again you can change the options
   * @param   {Object}    [options={}]
   * @return  {jQuery}
   */
  $.fn.hammer = function(options) {
    return this.each(function() {
      var el = $(this);
      var inst = el.data('hammer');
      // start new hammer instance
      if(!inst) {
        el.data('hammer', new Hammer(this, options || {}));
      }
      // change the options
      else if(inst && options) {
        Hammer.utils.extend(inst.options, options);
      }
    });
  };
}

  // Based off Lo-Dash's excellent UMD wrapper (slightly modified) - https://github.com/bestiejs/lodash/blob/master/lodash.js#L5515-L5543
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // define as an anonymous module
    define(['hammerjs', 'jquery'], setup);

  }
  else {
    setup(window.Hammer, window.jQuery || window.Zepto);
  }
})(window);
},{}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvYXBwLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2NvbnNvbGUtcmVuZGVyZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2NvdW50ZG93bi5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9kYW5nZXItY2FsY3VsYXRvci5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9lcnJvcnMuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9mbGlwcGFibGUuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvbGliL2xjZ2VuZXJhdG9yLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9tdWx0aW1hcC5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9taW5lbGF5ZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvc2NvcmVib2FyZC5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9zY29yZWtlZXBlci5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL3NxdWFyZS5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy90aGVtZS1zdHlsZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvdHJhbnNjcmliaW5nLWVtaXR0ZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvdHJhbnNjcmlwdGlvbi1zdHJhdGVneS5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy92YWxpZGF0b3JzLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL3ZlbmRvci9qcXVlcnkuaGFtbWVyLWZ1bGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBHYW1lYm9hcmQgPSByZXF1aXJlKCcuL2dhbWVib2FyZCcpLFxyXG4gICAgTW9kZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vZGVzLFxyXG4gICAgUHJlc2V0TGV2ZWxzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRMZXZlbHMsXHJcbiAgICBQcmVzZXRTZXR1cHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldFNldHVwcyxcclxuICAgIERpbVZhbGlkYXRvciA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpLkJvYXJkRGltZW5zaW9ucyxcclxuICAgIE1pbmVWYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5NaW5lQ291bnQsXHJcbiAgICBWRVJTSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5WRVJTSU9OLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTUFYX0dSSURfRElNRU5TSU9OUyxcclxuICAgIE1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5NSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUixcclxuXHJcbiAgICBtaW5lYWJsZVNwYWNlcyA9IGZ1bmN0aW9uKGRpbSkgeyByZXR1cm4gfn4oTWF0aC5wb3coZGltLCAyKSAqIE1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSKTsgfSxcclxuICAgIGRpc2FibGVPcHRpb24gPSBmdW5jdGlvbigkZWwsIHVuZG8pIHtcclxuICAgICAgICBpZiAodW5kbyA9PSBudWxsKSB1bmRvID0gZmFsc2U7XHJcbiAgICAgICAgJGVsW3VuZG8gPyAncmVtb3ZlQ2xhc3MnIDogJ2FkZENsYXNzJ10oJ2Rpc2FibGVkJyk7XHJcbiAgICAgICAgJGVsLmZpbmQoXCJpbnB1dFwiKS5wcm9wKCdyZWFkb25seScsICF1bmRvKTtcclxuICAgIH0sXHJcbiAgICBlbmFibGVPcHRpb24gPSBmdW5jdGlvbigkZWwpIHsgcmV0dXJuIGRpc2FibGVPcHRpb24oJGVsLCB0cnVlKTsgfTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICB2YXIgJHBvc3NpYmxlTWluZXMgPSAkKFwiI21pbmUtY291bnRcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLFxyXG4gICAgICAgIFBSRVNFVF9QQU5FTF9TRUxFQ1RPUiA9IFwidWwucHJlc2V0ID4gbGk6bm90KDpoYXMobGFiZWxbZm9yJD0nLW1vZGUnXSkpXCIsXHJcbiAgICAgICAgQ1VTVE9NX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5jdXN0b20gPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIjtcclxuXHJcbiAgICAvLyBzZXR0aW5nIGluaXRpYWwgdmFsdWVcclxuICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSkpO1xyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKS5odG1sKE1BWF9HUklEX0RJTUVOU0lPTlMgKyBcIiB4IFwiICsgTUFYX0dSSURfRElNRU5TSU9OUyk7XHJcblxyXG4gICAgJChcIiNwcmVzZXQtbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoUFJFU0VUX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChDVVNUT01fUEFORUxfU0VMRUNUT1IpKTsgfSkuY2xpY2soKTtcclxuICAgICQoXCIjY3VzdG9tLW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyBkaXNhYmxlT3B0aW9uKCQoUFJFU0VUX1BBTkVMX1NFTEVDVE9SKSk7IH0pO1xyXG5cclxuICAgICQuZWFjaCgkKFwibGFiZWxbZm9yXj0nbGV2ZWwtJ11cIiksIGZ1bmN0aW9uKF8sIGxhYmVsKSB7XHJcbiAgICAgICAgdmFyIGxldmVsID0gJChsYWJlbCkuYXR0cignZm9yJykuc3Vic3RyaW5nKCdsZXZlbC0nLmxlbmd0aCkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgZGltcyA9IFByZXNldFNldHVwc1tsZXZlbF0uZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSBQcmVzZXRTZXR1cHNbbGV2ZWxdLm1pbmVzLFxyXG4gICAgICAgICAgICAkYWR2aWNlID0gJChsYWJlbCkuZmluZCgnLmFkdmljZScpO1xyXG4gICAgICAgICRhZHZpY2UuaHRtbChcIiAoXCIgKyBkaW1zICsgXCIgeCBcIiArIGRpbXMgKyBcIiwgXCIgKyBtaW5lcyArIFwiIG1pbmVzKVwiKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIG9ua2V5dXAgd2hlbiBjaG9vc2luZyBnYW1lYm9hcmQgZGltZW5zaW9ucyxcclxuICAgIC8vIG5laWdoYm9yaW5nIGlucHV0IHNob3VsZCBtaXJyb3IgbmV3IHZhbHVlLFxyXG4gICAgLy8gYW5kIHRvdGFsIHBvc3NpYmxlIG1pbmVhYmxlIHNxdWFyZXMgKGRpbWVuc2lvbnMgXiAyIC0xKVxyXG4gICAgLy8gYmUgZmlsbGVkIGludG8gYSA8c3Bhbj4gYmVsb3cuXHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikub24oJ2tleXVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcclxuICAgICAgICAvLyB1cGRhdGUgdGhlICdtaXJyb3InIDxpbnB1dD4uLi5cclxuICAgICAgICAkKCcjZGltZW5zaW9ucy1taXJyb3InKS52YWwoJHRoaXMudmFsKCkpO1xyXG4gICAgICAgIC8vIC4uLmFuZCB0aGUgcG9zc2libGUgbnVtYmVyIG9mIG1pbmVzLlxyXG4gICAgICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJHRoaXMudmFsKCkpICsgJy4nKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCJmb3JtXCIpLm9uKFwic3VibWl0XCIsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgbW9kZSA9ICQoXCJbbmFtZT1tb2RlLXNlbGVjdF06Y2hlY2tlZFwiKS52YWwoKSxcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMgPSB7fTtcclxuXHJcbiAgICAgICAgaWYgKG1vZGUgPT09IE1vZGVzLlBSRVNFVCkge1xyXG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSAkKFwiW25hbWU9cHJlc2V0LWxldmVsXTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICAgICAgc2V0dXAgPSBPYmplY3Qua2V5cyhQcmVzZXRMZXZlbHMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24ocGwpIHsgcmV0dXJuIFByZXNldExldmVsc1twbF0gPT09IGxldmVsOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucG9wKCk7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmlzQ3VzdG9tID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmRpbWVuc2lvbnMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLmRpbWVuc2lvbnM7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gUHJlc2V0U2V0dXBzW3NldHVwXS5taW5lcztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBNb2Rlcy5DVVNUT00uLi5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdmFyIGQgPSAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCkgfHwgKyQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIiksXHJcbiAgICAgICAgICAgICAgICBtID0gJChcIiNtaW5lLWNvdW50XCIpLnZhbCgpIHx8ICskKFwiI21pbmUtY291bnRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGdhbWVPcHRpb25zLmRpbWVuc2lvbnMgPSBEaW1WYWxpZGF0b3IudmFsaWRhdGUoZCkgPyArZCA6IDk7XHJcbiAgICAgICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9IE1pbmVWYWxpZGF0b3IudmFsaWRhdGUobSwgbWluZWFibGVTcGFjZXMoZ2FtZU9wdGlvbnMuZGltZW5zaW9ucykpID8gbSA6IDE7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZTogJW9cIiwgZSk7XHJcbiAgICAgICAgICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaHRtbChlLm1lc3NhZ2UpLnNob3coKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzZXQgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMudGhlbWUgPSAkKFwiI2NvbG9yLXRoZW1lXCIpLnZhbCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2V0IHVwIDxoZWFkZXI+IGNvbnRlbnQuLi5cclxuICAgICAgICAkKFwiI21pbmVzLWRpc3BsYXlcIikuZmluZChcInNwYW5cIikuaHRtbChnYW1lT3B0aW9ucy5taW5lcyk7XHJcbiAgICAgICAgJChcIi52ZXJzaW9uXCIpLmh0bWwoVkVSU0lPTik7XHJcblxyXG4gICAgICAgIHdpbmRvdy5nYW1lYm9hcmQgPSBuZXcgR2FtZWJvYXJkKGdhbWVPcHRpb25zKS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiI2JvYXJkLWNhcmRcIikub24oXCJjbGlja1wiLCBcImEucmVwbGF5XCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHRlbXBvcmFyeSwgYnJ1dGUtZm9yY2UgZml4Li4uXHJcbiAgICAgICAgLy8gVE9ETzogcmVzZXQgZm9ybSBhbmQgdG9nZ2xlIHZpc2liaWxpdHkgb24gdGhlIHNlY3Rpb25zLi4uXHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xyXG4gICAgfSk7XHJcblxyXG59KTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBDb25zb2xlUmVuZGVyZXIgPSB7XHJcblxyXG4gICAgQ09MX1NQQUNJTkc6ICcgICAnLFxyXG4gICAgTUlORURfU1FVQVJFOiAnKicsXHJcbiAgICBCTEFOS19TUVVBUkU6ICcuJyxcclxuICAgIFJFTkRFUkVEX01BUDogJyVvJyxcclxuICAgIERFRkFVTFRfVFJBTlNGT1JNRVI6IGZ1bmN0aW9uKHJvdyl7IHJldHVybiByb3c7IH0sXHJcblxyXG4gICAgX21ha2VUaXRsZTogZnVuY3Rpb24oc3RyKSB7IHJldHVybiBzdHIuc3BsaXQoJycpLmpvaW4oJyAnKS50b1VwcGVyQ2FzZSgpOyB9LFxyXG4gICAgX2Rpc3BsYXlSb3dOdW06IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gXCIgICAgICAgW1wiICsgbnVtICsgXCJdXFxuXCIgfSxcclxuICAgIF90b1N5bWJvbHM6IGZ1bmN0aW9uKHZhbHVlcywgZm4pIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBmbihyb3cpLmpvaW4oX3RoaXMuQ09MX1NQQUNJTkcpLnRvTG93ZXJDYXNlKCkgKyBfdGhpcy5fZGlzcGxheVJvd051bShpZHgpXHJcbiAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfSxcclxuICAgIF92YWxpZGF0ZTogZnVuY3Rpb24odmFsdWVzKSB7XHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVzKSAmJiB2YWx1ZXMubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xyXG4gICAgICAgIGVsc2UgdGhyb3cgXCJObyB2YWx1ZXMgcHJlc2VudC5cIjtcclxuICAgIH0sXHJcbiAgICBfZ2V0UmVuZGVyZWRNYXA6IGZ1bmN0aW9uKHRyYW5zZm9ybWVyKSB7XHJcbiAgICAgICAgdmFyIHZhbHMgPSB0aGlzLl92YWxpZGF0ZSh0aGlzLnZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RvU3ltYm9scyh2YWxzLCB0cmFuc2Zvcm1lcik7XHJcbiAgICB9LFxyXG5cclxuICAgIHRvOiBmdW5jdGlvbihsb2cpIHsgdGhpcy4kbG9nID0gbG9nOyByZXR1cm4gdGhpczsgfSxcclxuICAgIHdpdGhWYWx1ZXM6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIHRoaXMudmFsdWVzID0gdGhpcy5fdmFsaWRhdGUodmFsdWVzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcblxyXG4gICAgdmlld0dhbWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gZnVuY3Rpb24ocm93KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcm93Lm1hcChmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoc3EuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLk1JTkVEX1NRVUFSRSA6IHNxLmdldERhbmdlcigpID09PSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLkJMQU5LX1NRVUFSRSA6IHNxLmdldERhbmdlcigpOyB9KVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuJGxvZyhbIHRoaXMuX21ha2VUaXRsZShcImdhbWVib2FyZFwiKSwgdGhpcy5SRU5ERVJFRF9NQVAgXVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIHRoaXMuX2dldFJlbmRlcmVkTWFwKHRyYW5zZm9ybWVyKSk7XHJcbiAgICB9LFxyXG4gICAgdmlld01pbmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJtaW5lIHBsYWNlbWVudHNcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0aGlzLkRFRkFVTFRfVFJBTlNGT1JNRVIpKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZVJlbmRlcmVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIENvbnN0YW50cyA9IE9iamVjdC5mcmVlemUoe1xyXG5cclxuICAgIFZFUlNJT046ICdiZXRhNScsXHJcblxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcbiAgICBNSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUjogMC4zMyxcclxuXHJcbiAgICBEZWZhdWx0Q29uZmlnOiB7XHJcbiAgICAgICAgZGltZW5zaW9uczogOSxcclxuICAgICAgICBtaW5lczogMSxcclxuICAgICAgICBib2FyZDogJyNib2FyZCcsXHJcbiAgICAgICAgdGltZXI6IDUwMCxcclxuICAgICAgICBkZWJ1Z19tb2RlOiB0cnVlLCAvKmZhbHNlKi9cclxuICAgICAgICB0aGVtZTogJ0xJR0hUJ1xyXG4gICAgfSxcclxuXHJcbiAgICBTeW1ib2xzOiB7IENMT1NFRDogJ3gnLCBPUEVOOiAnXycsIEZMQUdHRUQ6ICdmJywgTUlORUQ6ICcqJyB9LFxyXG5cclxuICAgIEZsYWdzOiAgeyBPUEVOOiAnRl9PUEVOJywgTUlORUQ6ICdGX01JTkVEJywgRkxBR0dFRDogJ0ZfRkxBR0dFRCcsIElOREVYRUQ6ICdGX0lOREVYRUQnIH0sXHJcblxyXG4gICAgR2x5cGhzOiB7IEZMQUc6ICd4JywgTUlORTogJ8OEJyB9LFxyXG5cclxuICAgIE1vZGVzOiB7IFBSRVNFVDogXCJQXCIsIENVU1RPTTogXCJDXCIgfSxcclxuXHJcbiAgICBQcmVzZXRMZXZlbHM6IHsgQkVHSU5ORVI6IFwiQlwiLCBJTlRFUk1FRElBVEU6IFwiSVwiLCBFWFBFUlQ6IFwiRVwiIH0sXHJcblxyXG4gICAgUHJlc2V0U2V0dXBzOiB7XHJcbiAgICAgICAgQkVHSU5ORVI6ICAgICAgIHsgZGltZW5zaW9uczogIDksIG1pbmVzOiAgOSwgdGltZXI6IDMwMCB9LFxyXG4gICAgICAgIElOVEVSTUVESUFURTogICB7IGRpbWVuc2lvbnM6IDEyLCBtaW5lczogMjEsIHRpbWVyOiA0MjAgfSxcclxuICAgICAgICBFWFBFUlQ6ICAgICAgICAgeyBkaW1lbnNpb25zOiAxNSwgbWluZXM6IDY3LCB0aW1lcjogNTQwIH1cclxuICAgIH0sXHJcblxyXG4gICAgVGhlbWVzOiB7IExJR0hUOiAnbGlnaHQnLCBEQVJLOiAnZGFyaycgfSxcclxuXHJcbiAgICBNZXNzYWdlT3ZlcmxheTogJyNmbGFzaCcsXHJcblxyXG4gICAgTW9iaWxlRGV2aWNlUmVnZXg6IC9hbmRyb2lkfHdlYm9zfGlwaG9uZXxpcGFkfGlwb2R8YmxhY2tiZXJyeXxpZW1vYmlsZXxvcGVyYSBtaW5pLyxcclxuXHJcbiAgICBTY29yZWJvYXJkOiB7IERJR0lUUzogMywgRlhfRFVSQVRJT046IDgwMCwgT1VUX09GX1JBTkdFOiBcIk1BWFwiIH0sXHJcblxyXG4gICAgU2NvcmluZ1J1bGVzOiB7IFxyXG4gICAgICAgIERBTkdFUl9JRFhfTVVMVElQTElFUjogMSwgXHJcbiAgICAgICAgQkxBTktfU1FVQVJFX1BUUzogMCwgXHJcbiAgICAgICAgRkxBR19NSU5FRDogMjUsIFxyXG4gICAgICAgIE1JU0ZMQUdfVU5NSU5FRDogMTAsIFxyXG4gICAgICAgIFVORkxBR19NSU5FRDogMjUsIFxyXG4gICAgICAgIE1JU1VORkxBR19NSU5FRDogMTAsIFxyXG4gICAgICAgIFVTRVJNT1ZFU19NVUxUSVBMSUVSOiAxMCxcclxuICAgICAgICBNSVNGTEFHR0VEX01VTFRJUExJRVI6IDEwLFxyXG4gICAgICAgIEZMQUdHRURfTUlORVNfTVVMVElQTElFUjogMTBcclxuICAgIH1cclxuXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oc2Vjb25kcywgZWwpIHtcclxuICAgIHRoaXMuc2Vjb25kcyA9IHNlY29uZHM7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG5cclxuICAgIHRoaXMubTEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMScpO1xyXG4gICAgdGhpcy5tMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20yJyk7XHJcbiAgICB0aGlzLnMxID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczEnKTtcclxuICAgIHRoaXMuczIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMicpO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcbkNvdW50ZG93bi5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogQ291bnRkb3duLFxyXG4gICAgX3JlbmRlckluaXRpYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fc2V0RGlzcGxheShhcnJbMF0gfHwgMCwgYXJyWzFdIHx8IDApO1xyXG4gICAgfSxcclxuICAgIF90b01pbnNTZWNzOiBmdW5jdGlvbihzZWNzKSB7XHJcbiAgICAgICAgdmFyIG1pbnMgPSB+fihzZWNzIC8gNjApLFxyXG4gICAgICAgICAgICBzZWNzID0gc2VjcyAlIDYwO1xyXG4gICAgICAgIHJldHVybiBbbWlucywgc2Vjc107XHJcbiAgICB9LFxyXG4gICAgX3NldERpc3BsYXk6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKSBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5tMS5pbm5lckhUTUwgPSB0aW1lc1swXVswXTtcclxuICAgICAgICB0aGlzLm0yLmlubmVySFRNTCA9IHRpbWVzWzBdWzFdO1xyXG4gICAgICAgIHRoaXMuczEuaW5uZXJIVE1MID0gdGltZXNbMV1bMF07XHJcbiAgICAgICAgdGhpcy5zMi5pbm5lckhUTUwgPSB0aW1lc1sxXVsxXTtcclxuICAgIH0sXHJcbiAgICBfY291bnRkb3duOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5mcmVlemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Vjb25kcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gX3RoaXMuX3RvTWluc1NlY3MoX3RoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KGFyclswXSwgYXJyWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2Vjb25kcy0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0RGlzcGxheSgwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICB9LFxyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IGZhbHNlOyB0aGlzLl9jb3VudGRvd24oKTsgfSxcclxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IHRydWU7IH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7IHRoaXMuc2Vjb25kcyA9IDA7IHRoaXMuX3NldERpc3BsYXkoMCwgMCk7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ291bnRkb3duOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuZnVuY3Rpb24gRGFuZ2VyQ2FsY3VsYXRvcihnYW1lYm9hcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYm9hcmQ6IGdhbWVib2FyZCxcclxuICAgICAgICBuZWlnaGJvcmhvb2Q6IHtcclxuICAgICAgICAgICAgLy8gZGlzdGFuY2UgaW4gc3RlcHMgZnJvbSB0aGlzIHNxdWFyZTpcclxuICAgICAgICAgICAgLy8gICAgICAgICAgIHZlcnQuIGhvcnouXHJcbiAgICAgICAgICAgIE5PUlRIOiAgICAgIFsgIDEsICAwIF0sXHJcbiAgICAgICAgICAgIE5PUlRIRUFTVDogIFsgIDEsICAxIF0sXHJcbiAgICAgICAgICAgIEVBU1Q6ICAgICAgIFsgIDAsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIRUFTVDogIFsgLTEsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIOiAgICAgIFsgLTEsICAwIF0sXHJcbiAgICAgICAgICAgIFNPVVRIV0VTVDogIFsgLTEsIC0xIF0sXHJcbiAgICAgICAgICAgIFdFU1Q6ICAgICAgIFsgIDAsIC0xIF0sXHJcbiAgICAgICAgICAgIE5PUlRIV0VTVDogIFsgIDEsIC0xIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvclNxdWFyZTogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgICAgIGlmICgrcm93ID49IDAgJiYgK2NlbGwgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbE1pbmVzID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5uZWlnaGJvcmhvb2QpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmJvYXJkLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiBuZWlnaGJvci5pc01pbmVkKCkpIHRvdGFsTWluZXMrKztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsTWluZXMgfHwgJyc7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEYW5nZXJDYWxjdWxhdG9yOyIsIlwidXNlIHN0cmljdDtcIlxuLy8gRVJST1JTIEFORCBFWENFUFRJT05TXG5cbmZ1bmN0aW9uIE15c3dlZXBlckVycm9yKCkge1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgIFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMgPSAvXFx7KFxcZCspXFx9L2csXG4gICAgICBleHRlbmRNZXNzYWdlID0gZnVuY3Rpb24oc3RyLCBhcmdzKSB7XG4gICAgICAgICAgcmV0dXJuIChzdHIgfHwgJycpLnJlcGxhY2UoUkdYX1JFUExBQ0VNRU5UX1RPS0VOUywgZnVuY3Rpb24oXywgaW5kZXgpIHsgcmV0dXJuIGFyZ3NbK2luZGV4XSB8fCAnJzsgfSk7XG4gICAgICB9O1xuICB0aGlzLm1lc3NhZ2UgPSBleHRlbmRNZXNzYWdlKGFyZ3NbMF0sIGFyZ3Muc2xpY2UoMSkpO1xuICBFcnJvci5jYWxsKHRoaXMsIHRoaXMubWVzc2FnZSk7XG4gIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIGFyZ3VtZW50cy5jYWxsZWUpO1xuICB0aGlzLnN0YWNrID0gRXJyb3IoKS5zdGFjaztcbn1cbk15c3dlZXBlckVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTXlzd2VlcGVyRXJyb3I7XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUuZ2V0VHJhY2UgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhY2sucmVwbGFjZSgv4oa1XFxzKy9nLCAnXFxuICAnKTsgfTtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5uYW1lID0gJ015c3dlZXBlckVycm9yJztcblxuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoKSB7XG4gIE15c3dlZXBlckVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG5cbm1vZHVsZS5leHBvcnRzLk15c3dlZXBlckVycm9yID0gTXlzd2VlcGVyRXJyb3I7XG5tb2R1bGUuZXhwb3J0cy5WYWxpZGF0aW9uRXJyb3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5cblxuLyogIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gICovXG4iLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICByZ3hfbW9iaWxlX2RldmljZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vYmlsZURldmljZVJlZ2V4LFxyXG4gICAgQ291bnRkb3duID0gcmVxdWlyZSgnLi9jb3VudGRvd24nKSxcclxuICAgIFRyYW5zY3JpYmluZ0VtaXR0ZXIgPSByZXF1aXJlKCcuL3RyYW5zY3JpYmluZy1lbWl0dGVyJyksXHJcbiAgICBUcmFuc2NyaXB0aW9uU3RyYXRlZ3kgPSByZXF1aXJlKCcuL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3knKSxcclxuICAgIFRoZW1lU3R5bGVyID0gcmVxdWlyZSgnLi90aGVtZS1zdHlsZXInKSxcclxuICAgIENvbnNvbGVSZW5kZXJlciA9IHJlcXVpcmUoJy4vY29uc29sZS1yZW5kZXJlcicpLFxyXG4gICAgTWluZUxheWVyID0gcmVxdWlyZSgnLi9taW5lbGF5ZXInKSxcclxuICAgIFNjb3Jla2VlcGVyID0gcmVxdWlyZSgnLi9zY29yZWtlZXBlcicpLFxyXG4gICAgU2NvcmVib2FyZCA9IHJlcXVpcmUoJy4vc2NvcmVib2FyZCcpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG4gICAgLy8gaXMgY3VzdG9tIG9yIHByZXNldCBnYW1lP1xyXG4gICAgdGhpcy5pc0N1c3RvbSA9IG9wdGlvbnMuaXNDdXN0b20gfHwgZmFsc2U7XHJcbiAgICAvLyB0aGUgZXZlbnQgdHJhbnNjcmliZXIgZm9yIHBsYXliYWNrIGFuZCBwZXJzaXN0ZW5jZVxyXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIoVHJhbnNjcmlwdGlvblN0cmF0ZWd5KTtcclxuICAgIC8vIHNlbGVjdGl2ZWx5IGVuYWJsZSBkZWJ1ZyBtb2RlIGZvciBjb25zb2xlIHZpc3VhbGl6YXRpb25zIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICB0aGlzLmRlYnVnX21vZGUgPSBvcHRpb25zLmRlYnVnX21vZGUgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGVidWdfbW9kZTtcclxuICAgICRsb2cuZGVidWdfbW9kZSA9IHRoaXMuZGVidWdfbW9kZTtcclxuICAgIC8vIHNwZWNpZmllcyB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZSBvciBza2luXHJcbiAgICB0aGlzLnRoZW1lID0gdGhpcy5fc2V0Q29sb3JUaGVtZShvcHRpb25zLnRoZW1lIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRoZW1lKTtcclxuICAgIC8vIGNvbnRhaW5lciBmb3IgZmxhc2ggbWVzc2FnZXMsIHN1Y2ggYXMgd2luL2xvc3Mgb2YgZ2FtZVxyXG4gICAgdGhpcy5mbGFzaENvbnRhaW5lciA9ICQoTWVzc2FnZU92ZXJsYXkpO1xyXG4gICAgLy8gY2hlY2sgZm9yIGRlc2t0b3Agb3IgbW9iaWxlIHBsYXRmb3JtIChmb3IgZXZlbnQgaGFuZGxlcnMpXHJcbiAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBhZGQgaW4gdGhlIGNvdW50ZG93biBjbG9jay4uLlxyXG4gICAgdGhpcy5jbG9jayA9IG5ldyBDb3VudGRvd24oK29wdGlvbnMudGltZXIgfHwgREVGQVVMVF9HQU1FX09QVElPTlMudGltZXIsICcjY291bnRkb3duJyk7XHJcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIHNjb3Jla2VlcGluZyBvYmplY3RcclxuICAgIHRoaXMuc2NvcmVrZWVwZXIgPSBuZXcgU2NvcmVrZWVwZXIodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGFjdHVhbCBzY29yZWJvYXJkIHZpZXdcclxuICAgIHRoaXMuc2NvcmVib2FyZCA9IG5ldyBTY29yZWJvYXJkKDAsIFwiI3Njb3JlLWRpc3BsYXlcIik7XHJcblxyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIHRyaWdnZXIgZXZlbnQgZm9yIGdhbWUgdG8gYmVnaW4uLi5cclxuICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjpzdGFydCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxufVxyXG5cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogR2FtZWJvYXJkLFxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgLy8gZGlzcGxheSBvdXRwdXQgYW5kIGdhbWUgc3RyYXRlZ3kgdG8gdGhlIGNvbnNvbGUuLi5cclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy50aGVtZSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgdmFyIGxvY3MgPSBuZXcgTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSwgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGxvY3MuZm9yRWFjaChmdW5jdGlvbihsb2MpIHsgX3RoaXMuZ2V0U3F1YXJlQXQobG9jWzBdLCBsb2NbMV0pLm1pbmUoKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuc2V0RGFuZ2VyKF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJz5cIlxyXG4gICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfc2V0Q29sb3JUaGVtZTogZnVuY3Rpb24odGhlbWUpIHtcclxuICAgICAgICBUaGVtZVN0eWxlci5zZXQodGhlbWUsIHRoaXMuJGVsKTtcclxuICAgICAgICByZXR1cm4gdGhlbWU7XHJcbiAgICB9LFxyXG4gICAgX2NoZWNrRm9yTW9iaWxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHJneF9tb2JpbGVfZGV2aWNlcy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7IH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciB0b3VjaCBldmVudHM6IHRhcCA9PSBjbGljaywgaG9sZCA9PSByaWdodCBjbGlja1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vbih7XHJcbiAgICAgICAgICAgICAgICB0YXA6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBob2xkOiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGNvbnRleHRtZW51OiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSBhZnRlciBkZXZlbG9wbWVudCBlbmRzLi4uZm9yIGRlYnVnIHVzZSBvbmx5IVxyXG4gICAgICAgIC8vIElORElWSURVQUwgU1FVQVJFIEVWRU5UU1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6Y2xvc2UnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkNsb3Npbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIlVuZmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICAvLyBHQU1FQk9BUkQtV0lERSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmVnaW4hXCIsIGFyZ3VtZW50cyk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOndpbicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3Ugd2luIVwiKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6b3ZlcicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgZGVhZCFcIik7IH0pO1xyXG5cclxuICAgICAgICAvLyAtLS0gVEhFU0UgRVZFTlRTIEFSRSBGT1IgUkVBTCwgVE8gU1RBWSFcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIHdpcmVzIHVwIHRoZSBzY29yZWJvYXJkIHZpZXcgb2JqZWN0IHRvIHRoZSBldmVudHMgcmVjZWl2ZWQgZnJvbSB0aGUgc2NvcmVrZWVwZXJcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3Njb3JlOmNoYW5nZSBzY29yZTpjaGFuZ2U6ZmluYWwnLCBmdW5jdGlvbigpIHsgX3RoaXMuc2NvcmVib2FyZC51cGRhdGUoX3RoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgaWYgKCFzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCdraWxsZXItbWluZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gc3RvcCB0aGUgY29udGV4dG1lbnUgZnJvbSBwb3BwaW5nIHVwIG9uIGRlc2t0b3AgYnJvd3NlcnNcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgdGhpcy5fZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xvc2VTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgLy8gaGFuZGxlcyBhdXRvY2xlYXJpbmcgb2Ygc3BhY2VzIGFyb3VuZCB0aGUgb25lIGNsaWNrZWRcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpLFxyXG4gICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLl9vcGVuU3F1YXJlKG5laWdoYm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLmdldERhbmdlcigpIHx8ICFuZWlnaGJvci5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfb3BlblNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUub3BlbigpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOm9wZW5cIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9jbG9zZVNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpjbG9zZVwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF91bmZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLnVuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOnVuZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2dldE9wZW5lZFNxdWFyZXNDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzT3BlbigpOyB9KS5sZW5ndGg7IH0sXHJcbiAgICBfZXZhbHVhdGVGb3JHYW1lV2luOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbm90TWluZWQgPSB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pLmxlbmd0aDtcclxuICAgICAgICBpZiAobm90TWluZWQgPT09IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9mbGFzaE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGlzQWxlcnQgPyAnZ2FtZS1vdmVyJyA6ICdnYW1lLXdpbicpXHJcbiAgICAgICAgICAgICAgICAuaHRtbChtc2cpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgfSxcclxuICAgIF9wcmVwYXJlRmluYWxSZXZlYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3VuZmxhZ1NxdWFyZShmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci5jbG9zZSgpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXdpbicpO1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG5cclxuICAgICAgICAkbG9nKFwiLS0tICBHQU1FIFdJTiEgIC0tLVwiKTtcclxuICAgICAgICAkbG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOndpbicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOm92ZXInLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiBHbHlwaHMuRkxBRztcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc01pbmVkKCkpIHJldHVybiBHbHlwaHMuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXNxLmdldERhbmdlcigpID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdjZWxsJyArIHNxdWFyZS5nZXRDZWxsKCkpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYXR0YWNoIHRoZSBTcXVhcmUgdG8gdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBncmlkIGNlbGxcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUsIHRoaXMpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgYSBTcXVhcmUgaW5zdGFuY2UgYXMgYSBwYXJhbSwgcmV0dXJucyBhIGpRdWVyeS13cmFwcGVkIERPTSBub2RlIG9mIGl0cyBjZWxsXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIHJvdyBhbmQgY2VsbCBjb29yZGluYXRlcyBhcyBwYXJhbXMsIHJldHVybnMgdGhlIGFzc29jaWF0ZWQgU3F1YXJlIGluc3RhbmNlXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBuZWVkIGdhbWVPcHRpb25zLCBtZXRhZGF0YSBvbiBkYXRldGltZS9ldGMuLCBzZXJpYWxpemUgYWxsIHNxdWFyZXMnIHN0YXRlc1xyXG4gICAgICAgIHJldHVybiBTZXJpYWxpemVyLmV4cG9ydCh0aGlzKTtcclxuICAgIH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gQ29uc29sZVJlbmRlcmVyLnRvKCRsb2cpLndpdGhWYWx1ZXModGhpcy5ib2FyZC52YWx1ZXMoKSk7XHJcbiAgICAgICAgcmV0dXJuICh3aXRoRGFuZ2VyKSA/IHJlbmRlcmVyLnZpZXdHYW1lKCkgOiByZW5kZXJlci52aWV3TWluZXMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuLy8gQHVzYWdlIHZhciBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbJ0ZfT1BFTicsICdGX01JTkVEJywgJ0ZfRkxBR0dFRCcsICdGX0lOREVYRUQnXSk7IGJmID0gbmV3IEJpdEZsYWdzO1xyXG5mdW5jdGlvbiBCaXRGbGFnRmFjdG9yeShhcmdzKSB7XHJcblxyXG4gICAgdmFyIGJpblRvRGVjID0gZnVuY3Rpb24oc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9LFxyXG4gICAgICAgIGRlY1RvQmluID0gZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0udG9TdHJpbmcoMik7IH0sXHJcbiAgICAgICAgYnVpbGRTdGF0ZSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5yZXZlcnNlKCkuam9pbignJykpOyB9LFxyXG4gICAgICAgIHBhZCA9IGZ1bmN0aW9uIChzdHIsIG1heCkge1xyXG4gICAgICAgICAgbWF4IHx8IChtYXggPSA0IC8qIHRoaXMuREVGQVVMVF9TSVpFLmxlbmd0aCAqLyk7XHJcbiAgICAgICAgICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKHZhciBhY2M9W107IGRpZmYgPiAwOyBhY2NbLS1kaWZmXSA9ICcwJykge31cclxuICAgICAgICAgIHJldHVybiBhY2Muam9pbignJykgKyBzdHI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZCA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5oYXModGhpc1tuYW1lXSk7IH0gfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIGlmICh+bmFtZS5pbmRleE9mKCdfJykpXHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcobmFtZS5pbmRleE9mKCdfJykgKyAxKTtcclxuICAgICAgICAgICAgcmV0dXJuICdpcycgKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTdGF0ZXMgPSBmdW5jdGlvbihhcmdzLCBwcm90bykge1xyXG4gICAgICAgICAgICBpZiAoIWFyZ3MubGVuZ3RoKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBwcm90by5fc3RhdGVzID0gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1hcmdzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmxhZ05hbWUgPSBTdHJpbmcoYXJnc1tpXSkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICBjbHNOYW1lID0gZmxhZ05hbWUudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgucG93KDIsIGkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kTmFtZSA9IGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZShjbHNOYW1lKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZCA9IGNyZWF0ZVF1ZXJ5TWV0aG9kKGZsYWdOYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwcm90b1tmbGFnTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHByb3RvLl9zdGF0ZXNbaV0gPSBjbHNOYW1lO1xyXG4gICAgICAgICAgICAgICAgcHJvdG9bcXVlcnlNZXRob2ROYW1lXSA9IHF1ZXJ5TWV0aG9kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByb3RvLkRFRkFVTFRfU1RBVEUgPSBwYWQoJycsIGkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gQml0RmxhZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5fZmxhZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgICA/IGJ1aWxkU3RhdGUoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKVxyXG4gICAgICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxuICAgIH1cclxuXHJcbiAgICBCaXRGbGFncy5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgY29uc3RydWN0b3I6IEJpdEZsYWdzLFxyXG4gICAgICAgIGhhczogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gISEoYmluVG9EZWModGhpcy5fZmxhZ3MpICYgZmxhZyk7IH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgfCBmbGFnKSk7IH0sXHJcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIH5mbGFnKSk7IH0sXHJcbiAgICAgICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgX2ZsYWdzOiB0aGlzLl9mbGFncyB9OyB9XHJcbiAgICB9O1xyXG5cclxuICAgIEJpdEZsYWdzLndpdGhEZWZhdWx0cyA9IGZ1bmN0aW9uKGRlZmF1bHRzKSB7IHJldHVybiBuZXcgQml0RmxhZ3MoZGVmYXVsdHMpOyB9O1xyXG5cclxuICAgIHNldFN0YXRlcyhhcmdzLCBCaXRGbGFncy5wcm90b3R5cGUpO1xyXG5cclxuICAgIHJldHVybiBCaXRGbGFncztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCaXRGbGFnRmFjdG9yeTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIEVtaXR0ZXIoKSB7XHJcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcclxufVxyXG5cclxuRW1pdHRlci5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogRW1pdHRlcixcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICBldmVudC5zcGxpdCgvXFxzKy9nKS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2VdID0gdGhpcy5fZXZlbnRzW2VdIHx8IFtdO1xyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZV0ucHVzaChmbik7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgb2ZmOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICBldmVudC5zcGxpdCgvXFxzKy9nKS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tlXSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZV0uc3BsaWNlKHRoaXMuX2V2ZW50c1tlXS5pbmRleE9mKGZuKSwgMSk7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24oZXZlbnQgLyosIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj10aGlzLl9ldmVudHNbZXZlbnRdLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XVtpXS5hcHBseSh0aGlzLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyOyIsIlwidXNlIHN0cmljdDtcIlxuXG52YXIgRmxpcHBhYmxlID0gZnVuY3Rpb24oZHVyYXRpb24sIHdyYXBwZXIpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRmxpcHBhYmxlKSlcbiAgICAgICAgcmV0dXJuIG5ldyBGbGlwcGFibGUoZHVyYXRpb24sIHdyYXBwZXIpO1xuICAgIFxuICAgIHZhciBub2RlTmFtZVRvVGFnID0gZnVuY3Rpb24obm9kZSkgeyByZXR1cm4gXCI8XCIgKyBub2RlICsgXCIvPlwiOyB9LFxuICAgICAgICB2ZXJpZnlET01Ob2RlID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICB2YXIgdGFncyA9IFwiYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxhcHBsZXQsYXJlYSxhcnRpY2xlLGFzaWRlLGF1ZGlvLFwiXG4gICAgICAgICAgICAgICAgKyBcImIsYmFzZSxiYXNlZm9udCxiZGksYmRvLGJnc291bmQsYmlnLGJsaW5rLGJsb2NrcXVvdGUsYm9keSxicixidXR0b24sXCJcbiAgICAgICAgICAgICAgICArIFwiY2FudmFzLGNhcHRpb24sY2VudGVyLGNpdGUsY29kZSxjb2wsY29sZ3JvdXAsY29udGVudCxkYXRhLGRhdGFsaXN0LGRkLFwiXG4gICAgICAgICAgICAgICAgKyBcImRlY29yYXRvcixkZWwsZGV0YWlscyxkZm4sZGlyLGRpdixkbCxkdCxlbGVtZW50LGVtLGVtYmVkLGZpZWxkc2V0LGZpZ2NhcHRpb24sXCJcbiAgICAgICAgICAgICAgICArIFwiZmlndXJlLGZvbnQsZm9vdGVyLGZvcm0sZnJhbWUsZnJhbWVzZXQsaDEsaDIsaDMsaDQsaDUsaDYsaGVhZCxoZWFkZXIsaGdyb3VwLGhyLGh0bWwsXCJcbiAgICAgICAgICAgICAgICArIFwiaSxpZnJhbWUsaW1nLGlucHV0LGlucyxpc2luZGV4LGtiZCxrZXlnZW4sbGFiZWwsbGVnZW5kLGxpLGxpbmssbGlzdGluZyxcIlxuICAgICAgICAgICAgICAgICsgXCJtYWluLG1hcCxtYXJrLG1hcnF1ZWUsbWVudSxtZW51aXRlbSxtZXRhLG1ldGVyLG5hdixub2JyLG5vZnJhbWVzLG5vc2NyaXB0LG9iamVjdCxcIlxuICAgICAgICAgICAgICAgICsgXCJvbCxvcHRncm91cCxvcHRpb24sb3V0cHV0LHAscGFyYW0scGxhaW50ZXh0LHByZSxwcm9ncmVzcyxxLHJwLHJ0LHJ1YnkscyxzYW1wLHNjcmlwdCxcIlxuICAgICAgICAgICAgICAgICsgXCJzZWN0aW9uLHNlbGVjdCxzaGFkb3csc21hbGwsc291cmNlLHNwYWNlcixzcGFuLHN0cmlrZSxzdHJvbmcsc3R5bGUsc3ViLHN1bW1hcnksc3VwLFwiXG4gICAgICAgICAgICAgICAgKyBcInRhYmxlLHRib2R5LHRkLHRlbXBsYXRlLHRleHRhcmVhLHRmb290LHRoLHRoZWFkLHRpbWUsdGl0bGUsdHIsdHJhY2ssdHQsdSx1bCx2YXIsdmlkZW8sd2JyLHhtcFwiO1xuICAgICAgICAgICAgaWYgKHN0ciA9IFN0cmluZyhzdHIpLnRvTG93ZXJDYXNlKCksIHN0ciAmJiAhIX50YWdzLmluZGV4T2Yoc3RyKSkgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfTtcbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2ZsaXBEdXJhdGlvbiA9ICtkdXJhdGlvbiB8fCA4MDAsXG4gICAgICAgIHRoaXMuX2ZsaXBXcmFwcGVyID0gdmVyaWZ5RE9NTm9kZSh3cmFwcGVyKSB8fCAnc3Bhbic7XG5cbiAgICAgICAgdGhpcy5fZmxpcCA9IGZ1bmN0aW9uKCRlbCwgY29udGVudCkge1xuICAgICAgICAgICAgJGVsXG4gICAgICAgICAgICAgICAgLndyYXBJbm5lcigkKG5vZGVOYW1lVG9UYWcodGhpcy5fZmxpcFdyYXBwZXIpKSlcbiAgICAgICAgICAgICAgICAuZmluZCh0aGlzLndyYXBwZXIpXG4gICAgICAgICAgICAgICAgLmRlbGF5KHRoaXMuX2ZsaXBEdXJhdGlvbilcbiAgICAgICAgICAgICAgICAuc2xpZGVVcCh0aGlzLl9mbGlwRHVyYXRpb24sIGZ1bmN0aW9uKCkgeyAkKHRoaXMpLnBhcmVudCgpLmh0bWwoY29udGVudCkgfSk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGbGlwcGFibGU7IiwiLy8gTGluZWFyIENvbmdydWVudGlhbCBHZW5lcmF0b3I6IHZhcmlhbnQgb2YgYSBMZWhtYW4gR2VuZXJhdG9yXHJcbi8vIGJhc2VkIG9uIExDRyBmb3VuZCBoZXJlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9Qcm90b25rP3BhZ2U9NFxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCl7XHJcbiAgXCJ1c2Ugc3RyaWN0O1wiXHJcbiAgLy8gU2V0IHRvIHZhbHVlcyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTnVtZXJpY2FsX1JlY2lwZXNcclxuICAvLyBtIGlzIGJhc2ljYWxseSBjaG9zZW4gdG8gYmUgbGFyZ2UgKGFzIGl0IGlzIHRoZSBtYXggcGVyaW9kKVxyXG4gIC8vIGFuZCBmb3IgaXRzIHJlbGF0aW9uc2hpcHMgdG8gYSBhbmQgY1xyXG4gIGZ1bmN0aW9uIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcigpIHtcclxuICAgICAgdGhpcy5tID0gNDI5NDk2NzI5NjtcclxuICAgICAgLy8gYSAtIDEgc2hvdWxkIGJlIGRpdmlzaWJsZSBieSBtJ3MgcHJpbWUgZmFjdG9yc1xyXG4gICAgICB0aGlzLmEgPSAxNjY0NTI1O1xyXG4gICAgICAvLyBjIGFuZCBtIHNob3VsZCBiZSBjby1wcmltZVxyXG4gICAgICB0aGlzLmMgPSAxMDEzOTA0MjIzO1xyXG4gICAgICB0aGlzLnNlZWQgPSB2b2lkIDA7XHJcbiAgICAgIHRoaXMueiA9IHZvaWQgMDtcclxuICAgICAgLy8gaW5pdGlhbCBwcmltaW5nIG9mIHRoZSBnZW5lcmF0b3IsIHVudGlsIGxhdGVyIG92ZXJyaWRlblxyXG4gICAgICB0aGlzLnNldFNlZWQoKTtcclxuICB9XHJcbiAgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IsXHJcbiAgICBzZXRTZWVkOiBmdW5jdGlvbih2YWwpIHsgdGhpcy56ID0gdGhpcy5zZWVkID0gdmFsIHx8IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHRoaXMubSk7IH0sXHJcbiAgICBnZXRTZWVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc2VlZDsgfSxcclxuICAgIHJhbmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBkZWZpbmUgdGhlIHJlY3VycmVuY2UgcmVsYXRpb25zaGlwXHJcbiAgICAgIHRoaXMueiA9ICh0aGlzLmEgKiB0aGlzLnogKyB0aGlzLmMpICUgdGhpcy5tO1xyXG4gICAgICAvLyByZXR1cm4gYSBmbG9hdCBpbiBbMCwgMSlcclxuICAgICAgLy8gaWYgeiA9IG0gdGhlbiB6IC8gbSA9IDAgdGhlcmVmb3JlICh6ICUgbSkgLyBtIDwgMSBhbHdheXNcclxuICAgICAgcmV0dXJuIHRoaXMueiAvIHRoaXMubTtcclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuTXVsdGltYXAucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IE11bHRpbWFwLFxyXG4gICAgZ2V0OiBmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihmbikgeyByZXR1cm4gW10uZm9yRWFjaC5jYWxsKHRoaXMudmFsdWVzKCksIGZuKTsgfSxcclxuICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiBfdGhpcy5fdGFibGVbcm93XTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH0sXHJcbiAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gcmVxdWlyZSgnLi9saWIvbGNnZW5lcmF0b3InKTtcclxuXHJcbmZ1bmN0aW9uIE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucykge1xyXG4gICAgdGhpcy5nZW5lcmF0b3IgPSBuZXcgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yO1xyXG4gICAgdGhpcy5taW5lcyA9ICttaW5lcyB8fCAwO1xyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK2RpbWVuc2lvbnMgfHwgMDtcclxuXHJcbiAgICB2YXIgcmFuZHMgPSBbXSxcclxuICAgICAgICBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgZ2V0UmFuZG9tTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBfdGhpcy5nZW5lcmF0b3IucmFuZCgpICogKE1hdGgucG93KF90aGlzLmRpbWVuc2lvbnMsIDIpKSB8IDA7IH07XHJcblxyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgIHZhciBybmQgPSBnZXRSYW5kb21OdW1iZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKCF+cmFuZHMuaW5kZXhPZihybmQpKVxyXG4gICAgICAgICAgICByYW5kcy5wdXNoKHJuZCk7XHJcbiAgICAgICAgLy8gLi4ub3RoZXJ3aXNlLCBnaXZlIGl0IGFub3RoZXIgZ28tJ3JvdW5kOlxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5lcysrO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2NhdGlvbnMgPSByYW5kcy5tYXAoZnVuY3Rpb24ocm5kKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucztcclxuICAgICAgICByZXR1cm4gWyByb3csIGNlbGwgXTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmxvY2F0aW9ucztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lTGF5ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRlhfRFVSQVRJT04gPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuRlhfRFVSQVRJT04sXHJcbiAgICBESUdJVFNfTUFYID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLkRJR0lUUyxcclxuICAgIE9VVF9PRl9SQU5HRSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5PVVRfT0ZfUkFOR0U7XHJcblxyXG5mdW5jdGlvbiBTY29yZWJvYXJkKHNjb3JlLCBlbCkge1xyXG4gICAgdGhpcy5zY29yZSA9IHNjb3JlIHx8IDA7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBzY29yZTtcclxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbC5jaGFyQXQoMCkgPT09ICcjJyA/IGVsLnN1YnN0cmluZygxKSA6IGVsKTtcclxuICAgIHRoaXMuJGVsID0gJChlbCk7XHJcblxyXG4gICAgdGhpcy4kTCA9IHRoaXMuJGVsLmZpbmQoJyNzYzEnKTtcclxuICAgIHRoaXMuJE0gPSB0aGlzLiRlbC5maW5kKCcjc2MyJyk7XHJcbiAgICB0aGlzLiRSID0gdGhpcy4kZWwuZmluZCgnI3NjMycpO1xyXG5cclxuICAgIHRoaXMudXBkYXRlKHRoaXMuaW5pdGlhbCk7XHJcbn1cclxuXHJcblNjb3JlYm9hcmQucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IFNjb3JlYm9hcmQsXHJcbiAgICBfaW5jcmVtZW50OiBmdW5jdGlvbihjaGlwcykge1xyXG5cclxuICAgICAgICBjaGlwcy5mb3JFYWNoKGZ1bmN0aW9uKGNoaXApIHtcclxuICAgICAgICAgICAgdmFyICRjaGlwID0gY2hpcFswXSwgcHRzID0gY2hpcFsxXTtcclxuXHJcbiAgICAgICAgICAgIGlmICgkY2hpcC5odG1sKCkgIT09IHB0cylcclxuICAgICAgICAgICAgICAgICRjaGlwXHJcbiAgICAgICAgICAgICAgICAgICAgLndyYXBJbm5lcihcIjxzcGFuLz5cIilcclxuICAgICAgICAgICAgICAgICAgICAuZmluZChcInNwYW5cIilcclxuICAgICAgICAgICAgICAgICAgICAuZGVsYXkoRlhfRFVSQVRJT04pXHJcbiAgICAgICAgICAgICAgICAgICAgLnNsaWRlVXAoRlhfRFVSQVRJT04sIGZ1bmN0aW9uKCkgeyAkKHRoaXMpLnBhcmVudCgpLmh0bWwocHRzKSB9KTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKHBvaW50cykge1xyXG4gICAgICAgIGlmICghcG9pbnRzKSByZXR1cm47XHJcbiAgICAgICAgdmFyIHB0cyA9IHRvU3RyaW5nQXJyYXkocG9pbnRzKTtcclxuICAgICAgICB0aGlzLl9pbmNyZW1lbnQoW1t0aGlzLiRSLCBwdHNbMl1dLCBbdGhpcy4kTSwgcHRzWzFdXSwgW3RoaXMuJEwsIHB0c1swXV1dKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVib2FyZDtcclxuXHJcbmZ1bmN0aW9uIHRvU3RyaW5nQXJyYXkobikge1xyXG4gICAgdmFyIG51bSA9IFN0cmluZyhuKSxcclxuICAgICAgICBsZW4gPSBudW0ubGVuZ3RoO1xyXG5cclxuICAgIC8vIHRvbyBiaWcgZm9yICp0aGlzKiBzY29yZWJvYXJkLi4uXHJcbiAgICBpZiAobGVuID4gRElHSVRTX01BWCkge1xyXG4gICAgICAgIG51bSA9IE9VVF9PRl9SQU5HRTtcclxuICAgICAgICBsZW4gPSBPVVRfT0ZfUkFOR0UubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBbIG51bVtsZW4gLSAzXSB8fCBcIjBcIiwgbnVtW2xlbiAtIDJdIHx8IFwiMFwiLCBudW1bbGVuIC0gMV0gfHwgXCIwXCIgXTtcclxufSIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIFBvaW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmluZ1J1bGVzO1xyXG5cclxuZnVuY3Rpb24gU2NvcmVrZWVwZXIoZ2FtZWJvYXJkKSB7XHJcbiAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgdGhpcy5jYWxsYmFja3MgPSB7XHJcbiAgICB1cDogZnVuY3Rpb24gdXAocHRzKSB7IFxyXG4gICAgICB0aGlzLnNjb3JlICs9IHBvcyhwdHMpOyBcclxuICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzY29yZTpjaGFuZ2VcIiwgdGhpcy5zY29yZSk7IH0uYmluZCh0aGlzKSxcclxuICAgIGRvd246IGZ1bmN0aW9uIGRvd24ocHRzKSB7IFxyXG4gICAgICB0aGlzLnNjb3JlID0gKHRoaXMuc2NvcmUgLSBuZWcocHRzKSA8PSAwKSA/IDAgOiB0aGlzLnNjb3JlIC0gbmVnKHB0cyk7IFxyXG4gICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZVwiLCB0aGlzLnNjb3JlKTsgfS5iaW5kKHRoaXMpXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5maW5hbGl6ZXJzID0ge1xyXG4gICAgZm9yT3BlbmluZ1NxdWFyZXM6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtb3ZlcyA9IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgIHVubWluZWQgPSBNYXRoLnBvdyhnYW1lYm9hcmQuZGltZW5zaW9ucywgMikgLSBnYW1lYm9hcmQubWluZXM7XHJcbiAgICAgICAgcmV0dXJuIDEgLSAofn4obW92ZXMgLyB1bm1pbmVkKSAqIDEwKTtcclxuICAgIH0sXHJcbiAgICBmb3JUaW1lUGFzc2VkOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgdG90YWwgPSBnYW1lYm9hcmQuY2xvY2suaW5pdGlhbCwgZWxhcHNlZCA9IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzO1xyXG4gICAgICAgIHJldHVybiAxMDAgLSB+fihlbGFwc2VkIC8gdG90YWwgKiAxMDApO1xyXG4gICAgfSxcclxuICAgIGZvckZld2VzdE1vdmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICAvLyBleHBlcmltZW50YWw6IHNxcnQoeF4yIC0geCkgKiAxMFxyXG4gICAgICAgIHZhciBkaW1zID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpO1xyXG4gICAgICAgIHJldHVybiB+fihNYXRoLnNxcnQoZGltcyAtIGdhbWVib2FyZC51c2VyTW92ZXMpICogUG9pbnRzLlVTRVJNT1ZFU19NVUxUSVBMSUVSKTtcclxuICAgIH0sXHJcbiAgICBmb3JGaW5hbE1pc2ZsYWdnaW5nczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIHNxdWFyZXMgPSBnYW1lYm9hcmQuZ2V0U3F1YXJlcygpLFxyXG4gICAgICAgICAgICBmbGFnZ2VkID0gc3F1YXJlcy5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KSxcclxuICAgICAgICAgICAgbWlzZmxhZ2dlZCA9IGZsYWdnZWQuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KTtcclxuICAgICAgICByZXR1cm4gKG1pc2ZsYWdnZWQubGVuZ3RoICogUG9pbnRzLk1JU0ZMQUdHRURfTVVMVElQTElFUikgfHwgMDtcclxuICAgIH0sXHJcbiAgICBmb3JDb3JyZWN0RmxhZ2dpbmc6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtaW5lcyA9IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBmbGFnZ2VkTWluZXMgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNNaW5lZCgpOyB9KSxcclxuICAgICAgICAgICAgcGN0ID0gfn4oZmxhZ2dlZE1pbmVzLmxlbmd0aCAvIG1pbmVzKTtcclxuICAgICAgICByZXR1cm4gTWF0aC5jZWlsKChtaW5lcyAqIFBvaW50cy5GTEFHR0VEX01JTkVTX01VTFRJUExJRVIpICogcGN0KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0aGlzLnF1ZXVlID0gW107XHJcbiAgdGhpcy5maW5hbCA9IFtdO1xyXG5cclxuICAvLyBUT0RPOiB3ZWFuIHRoaXMgY2xhc3Mgb2ZmIGRlcGVuZGVuY3kgb24gZ2FtZWJvYXJkXHJcbiAgLy8gc2hvdWxkIG9ubHkgbmVlZCB0byBoYXZlIGN0b3IgaW5qZWN0ZWQgd2l0aCB0aGUgZ2FtZWJvYXJkJ3MgZW1pdHRlclxyXG4gIHRoaXMuZ2FtZWJvYXJkID0gZ2FtZWJvYXJkO1xyXG4gIHRoaXMuZW1pdHRlciA9IGdhbWVib2FyZC5lbWl0dGVyO1xyXG4gIHRoaXMuc2NvcmUgPSAwO1xyXG5cclxuICB0aGlzLm5zdSA9IHRoaXMuX2RldGVybWluZVNpZ25pZmljYW50VW5pdCgpO1xyXG4gIHRoaXMuZW5kR2FtZSA9IGZhbHNlOyAvLyBpZiBnYW1lIGlzIG5vdyBvdmVyLCBmbHVzaCBxdWV1ZXNcclxuICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwodGhpcy5fdGljay5iaW5kKF90aGlzKSwgdGhpcy5uc3UpO1xyXG5cclxuICBjb25zb2xlLmxvZyhcIlNjb3Jla2VlcGVyIGluaXRpYWxpemVkLiAgOnNjb3JlID0+ICVvLCA6dGltZXIgPT4gJW9cIiwgdGhpcy5zY29yZSwgdGhpcy50aW1lcik7XHJcbiAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwb3MocHRzKSB7IHJldHVybiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcbmZ1bmN0aW9uIG5lZyhwdHMpIHsgcmV0dXJuIC0xICogTWF0aC5hYnMoK3B0cykgfHwgMDsgfVxyXG5cclxuU2NvcmVrZWVwZXIucHJvdG90eXBlID0ge1xyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgRVZFTlRTID0ge1xyXG4gICAgICAgICdzcTpvcGVuJzogZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNxdWFyZS5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwKHNxdWFyZS5nZXREYW5nZXIoKSAqIFBvaW50cy5EQU5HRVJfSURYX01VTFRJUExJRVIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXAoUG9pbnRzLkJMQU5LX1NRVUFSRV9QVFMpXHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ3NxOmNsb3NlJzogZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7fSwgLy8gLi4uaXMgdGhpcyBldmVuIHBvc3NpYmxlP1xyXG4gICAgICAgICdzcTpmbGFnJzogZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNxdWFyZS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVycmVkVXAoUG9pbnRzLkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWREb3duKFBvaW50cy5NSVNGTEFHX1VOTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdzcTp1bmZsYWcnOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWREb3duKFBvaW50cy5VTkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWRVcChQb2ludHMuTUlTVU5GTEFHX01JTkVEKTtcclxuICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAgICAgJ2diOnN0YXJ0JzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZEdhbWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgIC8qIFNUQVJUIFRIRSBTQ09SRUtFRVBFUiAqLyBcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdnYjplbmQ6d2luJzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmRHYW1lID0gdHJ1ZTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyBcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdnYjplbmQ6b3Zlcic6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyBcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW5kR2FtZSA9IHRydWU7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgLyogU1RPUCBUSEUgU0NPUkVLRUVQRVIgKi8gXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZm9yICh2YXIgZXZlbnQgaW4gRVZFTlRTKSBcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oZXZlbnQsIEVWRU5UU1tldmVudF0uYmluZCh0aGlzKSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZVNpZ25pZmljYW50VW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGlzQ3VzdG9tID0gdGhpcy5nYW1lYm9hcmQuaXNDdXN0b20sXHJcbiAgICAgICAgICAgIHMgPSB0aGlzLmdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICBTRUNPTkRTID0gMTAwMCwgLy8gbWlsbGlzZWNvbmRzXHJcbiAgICAgICAgICAgIGdldE1heFRpbWUgPSBmdW5jdGlvbih0aW1lKSB7IHJldHVybiBNYXRoLm1heCh0aW1lLCAxICogU0VDT05EUykgfTtcclxuXHJcbiAgICAgICAgaWYgKHMgLyAxMDAgPj0gMSlcclxuICAgICAgICAgICAgcmV0dXJuIGdldE1heFRpbWUofn4ocyAvIDI1MCAqIFNFQ09ORFMpKTtcclxuICAgICAgICBlbHNlIGlmIChzIC8gMTAgPj0gMSlcclxuICAgICAgICAgICAgcmV0dXJuIGdldE1heFRpbWUoNSAqIFNFQ09ORFMpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIDEgKiBTRUNPTkRTO1xyXG4gICAgfSxcclxuICAgIF9iaW5hcnlTZWFyY2g6IGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICB2YXIgbG8gPSAwLCBoaSA9IHRoaXMucXVldWUubGVuZ3RoO1xyXG4gICAgICAgIHdoaWxlIChsbyA8IGhpKSB7XHJcbiAgICAgICAgICAgIHZhciBtaWQgPSB+figobG8gKyBoaSkgPj4gMSk7XHJcbiAgICAgICAgICAgIGlmICh4LnRpbWUgPCB0aGlzLnF1ZXVlW21pZF0udGltZSlcclxuICAgICAgICAgICAgICAgIGhpID0gbWlkO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBsbyA9IG1pZCArIDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsbztcclxuICAgIH0sXHJcbiAgICBfZW5xdWV1ZTogZnVuY3Rpb24oeCkgeyByZXR1cm4gdGhpcy5xdWV1ZS5zcGxpY2UodGhpcy5fYmluYXJ5U2VhcmNoKHgpLCAwLCB4KTsgfSxcclxuICAgIF9wcm9jZXNzRXZlbnQ6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyIGZuID0gdGhpcy5jYWxsYmFja3NbZXZlbnQudHlwZV07XHJcbiAgICAgICAgaWYgKGZuICE9IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiAoZm4ubGVuZ3RoID4gMSlcclxuICAgICAgICAgICAgICAgID8gZm4uY2FsbCh0aGlzLCBldmVudC5wdHMsIGZ1bmN0aW9uKGVycikgeyBpZiAoIWVycikgcmV0dXJuIHZvaWQgMDsgfSlcclxuICAgICAgICAgICAgICAgIDogY29uc29sZS5sb2coXCI8c2NvcmUgZXZlbnQ6ICVvPjogOm9sZCBbJW9dXCIsIGZuLm5hbWUsIHRoaXMuc2NvcmUpLFxyXG4gICAgICAgICAgICAgICAgICBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cyksXHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLi4uOm5ldyA9PiBbJW9dXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnNvbGUubG9nKFwiW1Njb3Jla2VlcGVyXSBjb3VsZCBub3QgZmluZCBmdW5jdGlvbiBcIiArIGV2ZW50LnR5cGUpO1xyXG5cclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZVwiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBfcHJvY2Vzc0ZpbmFsaXplcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZvciAodmFyIHZpc2l0b3IgaW4gdGhpcy5maW5hbGl6ZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiPGZpbmFsaXplcjogJW8+OiA6b2xkIFslb10gPT4gOm5ldyBbJW9dLi4uIFwiLCB2aXNpdG9yLCB0aGlzLnNjb3JlLCAodGhpcy5zY29yZSArPSB0aGlzLmZpbmFsaXplcnNbdmlzaXRvcl0odGhpcy5nYW1lYm9hcmQpKSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuc2NvcmUgKz0gdmlzaXRvcih0aGlzLmdhbWVib2FyZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZmluYWwuZm9yRWFjaChmdW5jdGlvbihmKSB7IHRoaXMuc2NvcmUgKz0gZjsgfSwgdGhpcyk7XHJcbiAgICAgICAgLy8gZmluYWwgdXBkYXRlIG9mIHRoZSBzY29yZVxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlOmZpbmFsXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF90aWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3VycklkeCA9IHRoaXMuX2JpbmFyeVNlYXJjaCh7IHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpIH0pLCBpbmRleCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgY3VycklkeCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChfdGhpcy5xdWV1ZVtpbmRleF0pOyByZXR1cm4gaW5kZXggKz0gMTsgfTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKDAsIGN1cnJJZHgpO1xyXG4gICAgfSxcclxuICAgIF9hZGRTY29yZVRvUXVldWU6IGZ1bmN0aW9uKHR5cGUsIHB0cykgeyByZXR1cm4gdGhpcy5fZW5xdWV1ZSh7IHRpbWU6ICgoK25ldyBEYXRlKSArIHRoaXMubnN1KSwgdHlwZTogdHlwZSwgcHRzOiBwdHMgfSk7IH0sXHJcblxyXG4gICAgdXA6IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcInVwOiAlb1wiLCBwdHMpOyB0aGlzLmNhbGxiYWNrcy51cChwdHMpOyB9LFxyXG4gICAgZG93bjogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwiZG93bjogJW9cIiwgcHRzKTsgdGhpcy5jYWxsYmFja3MuZG93bihwdHMpOyB9LFxyXG5cclxuICAgIGRlZmVycmVkVXA6IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGB1cGAgc2NvcmUgZXZlbnQgb2YgJW9cIiwgcG9zKHB0cykpOyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJ1cFwiLCBwb3MocHRzKSk7IH0sXHJcbiAgICBkZWZlcnJlZERvd246IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGBkb3duYCBzY29yZSBldmVudCBvZiAlb1wiLCBuZWcocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcImRvd25cIiwgbmVnKHB0cykpOyB9LFxyXG5cclxuICAgIGZpbmFsVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmZpbmFsLnB1c2gocG9zKHB0cykpOyB9LFxyXG4gICAgZmluYWxEb3duOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBnZXRQZW5kaW5nU2NvcmVDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnF1ZXVlLmxlbmd0aDsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIG91dCByZW1haW5pbmcgcXVldWUhXCIpO1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICB0aGlzLnF1ZXVlLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChldmVudCk7IH0pO1xyXG5cclxuICAgICAgdGhpcy5fcHJvY2Vzc0ZpbmFsaXplcnMoKTtcclxuXHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkZJTkFMIFNDT1JFOiAlb1wiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcbiAgICAgIHRoaXMucXVldWUubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5maW5hbC5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVrZWVwZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgU2VyaWFsaXplciA9IHtcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgX21ldGE6IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogK25ldyBEYXRlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5zY29yZSxcclxuICAgICAgICAgICAgICAgIHRpbWVyOiBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzOiBnYW1lYm9hcmQuZW1pdHRlci5fdHJhbnNjcmlwdHMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICB1c2VyOiB7fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAkZWw6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBib2FyZDogZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSxcclxuICAgICAgICAgICAgICAgIHNjb3Jla2VlcGVyOiB7IHF1ZXVlOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIucXVldWUsIGZpbmFsOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIuZmluYWwgfSxcclxuICAgICAgICAgICAgICAgIGZsYXNoQ29udGFpbmVyOiBnYW1lYm9hcmQuZmxhc2hDb250YWluZXIuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICB0aGVtZTogZ2FtZWJvYXJkLnRoZW1lLFxyXG4gICAgICAgICAgICAgICAgZGVidWdfbW9kZTogZ2FtZWJvYXJkLmRlYnVnX21vZGUsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBnYW1lYm9hcmQuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIG1pbmVzOiBnYW1lYm9hcmQubWluZXMsXHJcbiAgICAgICAgICAgICAgICB1c2VyTW92ZXM6IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgICAgICBpc01vYmlsZTogZ2FtZWJvYXJkLmlzTW9iaWxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIGltcG9ydDogZnVuY3Rpb24oZXhwb3J0ZWQpIHtcclxuICAgICAgICAvLyAxLiBuZXcgR2FtZWJvYXJkIG9iamVjdCAoZGVmYXVsdHMgaXMgb2spXHJcbiAgICAgICAgLy8gMi4gcmVwbGFjZSBgYm9hcmRgIHdpdGggbmV3IE11bHRpbWFwOlxyXG4gICAgICAgIC8vICAgICAtIGNvdW50IGFycmF5cyBhdCBmaXJzdCBsZXZlbCBpbiBib2FyZCBmb3IgbnVtIHJvd3NcclxuICAgICAgICAvLyAgICAgICAgICBbW1t7XCJyb3dcIjowLFwiY2VsbFwiOjAsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMTAwMFwifSxcImRhbmdlclwiOjB9LFxyXG4gICAgICAgIC8vICAgICAgICAgIHtcInJvd1wiOjAsXCJjZWxsXCI6MixcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIwMDEwXCJ9fV1dXVxyXG4gICAgICAgIC8vICAgICAtIHBhcnNlIGVhY2ggb2JqZWN0IHRvIGNyZWF0ZSBuZXcgU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBfZmxhZ3MpXHJcbiAgICAgICAgLy8gMy4gJGVsID0gJChleHBvcnRlZC4kZWwpXHJcbiAgICAgICAgLy8gNC4gZmxhc2hDb250YWluZXIgPSAkKGV4cG9ydGVkLmZsYXNoQ29udGFpbmVyKVxyXG4gICAgICAgIC8vIDUuIHRoZW1lID0gZXhwb3J0ZWQudGhlbWVcclxuICAgICAgICAvLyA2LiBkZWJ1Z19tb2RlID0gZXhwb3J0ZWQuZGVidWdfbW9kZVxyXG4gICAgICAgIC8vIDcuIGRpbWVuc2lvbnMgPSBleHBvcnRlZC5kaW1lbnNpb25zXHJcbiAgICAgICAgLy8gOC4gbWluZXMgPSBnYW1lYm9hcmQubWluZXNcclxuICAgICAgICAvLyA5LiB1c2VyTW92ZXMgPSBnYW1lYm9hZC51c2VyTW92ZXMsIGFuZCBpc01vYmlsZVxyXG4gICAgICAgIC8vIDEwLiBtYWtlIG5ldyBDb3VudGRvd24gd2l0aCBleHBvcnRlZC5fbWV0YS50aW1lciA9IHNlY29uZHMsIGNsb2NrLnN0YXJ0KClcclxuICAgICAgICAvLyAxMS4gaW5zdGFudGlhdGUgbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIsIGxvYWRpbmcgX21ldGEudHJhbnNjcmlwdHMgaW50byBpdHMgX3RyYW5zY3JpcHRzXHJcbiAgICAgICAgLy8gMTIuIHJlLXJ1biB0aGUgaW50ZXJuYWwgaW5pdCgpIG9wczogX2xvYWRCb2FyZCwgX3JlbmRlckdyaWRcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZXJpYWxpemVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvYml0LWZsYWctZmFjdG9yeScpLFxyXG4gICAgU3ltYm9scyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU3ltYm9scyxcclxuICAgIEZsYWdzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5GbGFncyxcclxuXHJcbiAgICBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbIEZsYWdzLk9QRU4sIEZsYWdzLk1JTkVELCBGbGFncy5GTEFHR0VELCBGbGFncy5JTkRFWEVEIF0pO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBmbGFncykge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBmbGFncyA/IG5ldyBCaXRGbGFncyhmbGFncykgOiBuZXcgQml0RmxhZ3M7XHJcbiAgICB0aGlzLmRhbmdlciA9IChkYW5nZXIgPT0gK2RhbmdlcikgPyArZGFuZ2VyIDogMDtcclxuXHJcbiAgICBpZiAodGhpcy5kYW5nZXIgPiAwKSB0aGlzLmluZGV4KCk7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU3F1YXJlLFxyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyBpZiAoaWR4ID09ICtpZHgpIHsgdGhpcy5kYW5nZXIgPSAraWR4OyB0aGlzLmRhbmdlciA+IDAgJiYgdGhpcy5pbmRleCgpOyB9IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWEVEKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNGbGFnZ2VkKCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpOyB9LFxyXG4gICAgaXNJbmRleGVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNJbmRleGVkKCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxudmFyIFRoZW1lU3R5bGVyID0ge1xyXG5cdHNldDogZnVuY3Rpb24odGhlbWUsICRlbCkge1xyXG5cclxuXHRcdCRlbCB8fCAoJGVsID0gJCgkQy5EZWZhdWx0Q29uZmlnLmJvYXJkKSk7XHJcblxyXG5cdFx0dmFyIHRoZW1lRmlsZSA9ICRDLlRoZW1lc1t0aGVtZV0sXHJcblx0XHRcdCRoZWFkID0gJGVsLnBhcmVudHMoXCJib2R5XCIpLnNpYmxpbmdzKFwiaGVhZFwiKSxcclxuXHRcdFx0JHN0eWxlcyA9ICRoZWFkLmZpbmQoXCJsaW5rXCIpLFxyXG5cclxuXHRcdFx0aGFzUHJlRXhpc3RpbmcgPSBmdW5jdGlvbihzdHlsZXNoZWV0cykge1xyXG5cdFx0XHRcdHJldHVybiAhIXN0eWxlc2hlZXRzLmZpbHRlcihmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHJldHVybiAhIX4kKHRoaXMpLmF0dHIoJ2hyZWYnKS5pbmRleE9mKHRoZW1lRmlsZSk7XHJcblx0XHRcdFx0fSkubGVuZ3RoXHJcblx0XHRcdH0sXHJcblx0XHRcdC8vIGJ1aWxkIGEgbmV3IDxsaW5rPiB0YWcgZm9yIHRoZSBkZXNpcmVkIHRoZW1lIHN0eWxlc2hlZXQ6XHJcblx0XHRcdCRsaW5rID0gJChcIjxsaW5rIC8+XCIsIHtcclxuXHRcdFx0XHRyZWw6ICdzdHlsZXNoZWV0JyxcclxuXHRcdFx0XHR0eXBlOiAndGV4dC9jc3MnLFxyXG5cdFx0XHRcdGhyZWY6ICdjc3MvJyArIHRoZW1lRmlsZSArICcuY3NzJ1xyXG5cdFx0XHR9KTtcclxuXHRcdC8vIHVzaW5nICRlbCBhcyBhbmNob3IgdG8gdGhlIERPTSwgZ28gdXAgYW5kXHJcblx0XHQvLyBsb29rIGZvciBsaWdodC5jc3Mgb3IgZGFyay5jc3MsIGFuZC0taWYgbmVjZXNzYXJ5LS1zd2FwXHJcblx0XHQvLyBpdCBvdXQgZm9yIGB0aGVtZWAuXHJcblx0XHQvLyBBZGQgJGxpbmsgaWZmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdCFcclxuXHRcdGlmICghaGFzUHJlRXhpc3RpbmcoJHN0eWxlcykpXHJcblx0XHRcdCRzdHlsZXMuYWZ0ZXIoJGxpbmspO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGhlbWVTdHlsZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vbGliL2VtaXR0ZXInKSxcclxuICAgIFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHJlcXVpcmUoJy4vdHJhbnNjcmlwdGlvbi1zdHJhdGVneScpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNjcmliaW5nRW1pdHRlcihzdHJhdGVneSkge1xyXG4gICAgRW1pdHRlci5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5fdHJhbnNjcmlwdHMgPSBbXTtcclxuICAgIHRoaXMuX3N0cmF0ZWd5ID0gKHN0cmF0ZWd5ICYmIHN0cmF0ZWd5LmFwcGx5KSA/IHN0cmF0ZWd5IDogVHJhbnNjcmlwdGlvblN0cmF0ZWd5O1xyXG59XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW1pdHRlci5wcm90b3R5cGUpO1xyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5fX3RyaWdnZXJfXyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXI7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbigvKiBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAvLyBzZW5kIG9yaWdpbmFsIHBhcmFtcyB0byB0aGUgc3Vic2NyaWJlcnMuLi5cclxuICAgIHRoaXMuX190cmlnZ2VyX18uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAvLyAuLi50aGVuIGFsdGVyIHRoZSBwYXJhbXMgZm9yIHRoZSB0cmFuc2NyaXB0J3MgcmVjb3Jkc1xyXG4gICAgdGhpcy5fdHJhbnNjcmlwdHMucHVzaCh0aGlzLl9zdHJhdGVneS5hcHBseShhcmdzKSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXG5cbnZhciBEZWZhdWx0VHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0ge1xuICAgICAgICBhcHBseTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVswXSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZGF0YVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6b3BlblwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6Y2xvc2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOmZsYWdcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOnVuZmxhZ1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6bWluZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RhbmRhcmQgU3F1YXJlLWJhc2VkIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAwOiBldmVudCBuYW1lLCAxOiBTcXVhcmUgaW5zdGFuY2UsIDI6IGpRdWVyeS13cmFwcGVkIERPTSBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIlNxdWFyZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMV0gPSBKU09OLnN0cmluZ2lmeShkYXRhWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzJdIGluc3RhbmNlb2YgalF1ZXJ5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMl0gPSBidWlsZERPTVN0cmluZyhkYXRhWzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6c3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDp3aW5cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDpvdmVyXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdGFuZGFyZCBHYW1lYm9hcmQtYmFzZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTXVsdGltYXBcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzFdID0gSlNPTi5zdHJpbmdpZnkoZGF0YVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcHJlZml4IGFycmF5IGNvbnRlbnRzIHdpdGggdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGl0cyBrZXlcbiAgICAgICAgICAgICAgICBkYXRhLnVuc2hpZnQoK25ldyBEYXRlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRGVmYXVsdFRyYW5zY3JpcHRpb25TdHJhdGVneTtcblxuLy8gVGFrZXMgYSA8dGQ+IERPTSBub2RlLCBhbmQgY29udmVydHMgaXQgdG8gYVxuLy8gc3RyaW5nIGRlc2NyaXB0b3IsIGUuZy4sIFwidHIjcm93MCB0ZC5jZWxsMC5taW5lZC5jbG9zZWRcIi5cbmZ1bmN0aW9uIGJ1aWxkRE9NU3RyaW5nKCRlbCkge1xuICAgIHZhciBub2RlID0gJGVsIGluc3RhbmNlb2YgalF1ZXJ5ID8gJGVsWzBdIDogJGVsLFxuICAgICAgICAvLyBzb3J0cyBjbGFzcyBuYW1lcywgcHV0dGluZyB0aGUgXCJjZWxsWFwiIGNsYXNzIGZpcnN0XG4gICAgICAgIFNPUlRfRk5fQ0VMTF9GSVJTVCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGluY2lwaXQoc3RyKSB7IHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIFwiY2VsbFwiLmxlbmd0aCkudG9Mb3dlckNhc2UoKTsgfTtcbiAgICAgICAgICAgIHJldHVybiAoaW5jaXBpdChhKSA9PT0gXCJjZWxsXCIgfHwgaW5jaXBpdChiKSA9PT0gXCJjZWxsXCIgfHwgYSA+IGIpID8gMSA6IChhIDwgYikgPyAtMSA6IDA7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgKyBcIiNcIiArIG5vZGUucGFyZW50Tm9kZS5pZCArIFwiIFwiXG4gICAgICAgICsgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBcIi5cIlxuICAgICAgICArIG5vZGUuY2xhc3NOYW1lLnNwbGl0KCcgJylcbiAgICAgICAgLnNvcnQoU09SVF9GTl9DRUxMX0ZJUlNUKVxuICAgICAgICAuam9pbignLicpO1xufVxuIiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG4gICAgVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcnMnKS5WYWxpZGF0aW9uRXJyb3IsXHJcbiAgICAvLyB2YWxpZGF0aW9uIGhlbHBlciBmbnNcclxuICAgIGlzTnVtZXJpYyA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgIHJldHVybiBTdHJpbmcodmFsKS5yZXBsYWNlKC8sL2csICcnKSwgKHZhbC5sZW5ndGggIT09IDAgJiYgIWlzTmFOKCt2YWwpICYmIGlzRmluaXRlKCt2YWwpKTtcclxuICAgIH0sXHJcblxyXG4gICAgVmFsaWRhdG9ycyA9IHtcclxuICAgICAgICBCb2FyZERpbWVuc2lvbnM6IHtcclxuICAgICAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGRpbSkge1xyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMoZGltKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIGJvYXJkIGRpbWVuc2lvbi5cIiwgZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgZ3JlYXRlciB0aGFuIE1BWF9ESU1FTlNJT05TIGNvbnN0YW50XHJcbiAgICAgICAgICAgICAgICBpZiAoIShkaW0gPD0gJEMuTUFYX0dSSURfRElNRU5TSU9OUykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBnYW1lJ3MgbWF4aW11bSBncmlkIGRpbWVuc2lvbnNcIiwgK2RpbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIE1pbmVDb3VudDoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24obWluZXMsIG1heFBvc3NpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pbmVzOiAlbywgbWF4UG9zc2libGU6ICVvXCIsIG1pbmVzLCBtYXhQb3NzaWJsZSlcclxuICAgICAgICAgICAgICAgIC8vIGlzIG51bWVyaWMgaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmICghaXNOdW1lcmljKG1pbmVzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIG51bWJlciBvZiBtaW5lcy5cIiwgbWluZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gbWF4UG9zc2libGUgZm9yIHRoaXMgY29uZmlndXJhdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKG1pbmVzID4gbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMgKHsxfSkuXCIsICttaW5lcywgbWF4UG9zc2libGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UuLi5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JzOyIsIi8qISBqUXVlcnkgcGx1Z2luIGZvciBIYW1tZXIuSlMgLSB2MS4wLjEgLSAyMDE0LTAyLTAzXHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIEhhbW1lci5KUyAtIHYxLjAuN2RldiAtIDIwMTQtMDItMThcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDE0IEpvcmlrIFRhbmdlbGRlciA8ai50YW5nZWxkZXJAZ21haWwuY29tPjtcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlICovXHJcblxyXG4oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogSGFtbWVyXHJcbiAqIHVzZSB0aGlzIHRvIGNyZWF0ZSBpbnN0YW5jZXNcclxuICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgIG9wdGlvbnNcclxuICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG52YXIgSGFtbWVyID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xyXG4gIHJldHVybiBuZXcgSGFtbWVyLkluc3RhbmNlKGVsZW1lbnQsIG9wdGlvbnMgfHwge30pO1xyXG59O1xyXG5cclxuLy8gZGVmYXVsdCBzZXR0aW5nc1xyXG5IYW1tZXIuZGVmYXVsdHMgPSB7XHJcbiAgLy8gYWRkIHN0eWxlcyBhbmQgYXR0cmlidXRlcyB0byB0aGUgZWxlbWVudCB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gZG9pbmdcclxuICAvLyBpdHMgbmF0aXZlIGJlaGF2aW9yLiB0aGlzIGRvZXNudCBwcmV2ZW50IHRoZSBzY3JvbGxpbmcsIGJ1dCBjYW5jZWxzXHJcbiAgLy8gdGhlIGNvbnRleHRtZW51LCB0YXAgaGlnaGxpZ2h0aW5nIGV0Y1xyXG4gIC8vIHNldCB0byBmYWxzZSB0byBkaXNhYmxlIHRoaXNcclxuICBzdG9wX2Jyb3dzZXJfYmVoYXZpb3I6IHtcclxuICAgIC8vIHRoaXMgYWxzbyB0cmlnZ2VycyBvbnNlbGVjdHN0YXJ0PWZhbHNlIGZvciBJRVxyXG4gICAgdXNlclNlbGVjdCAgICAgICA6ICdub25lJyxcclxuICAgIC8vIHRoaXMgbWFrZXMgdGhlIGVsZW1lbnQgYmxvY2tpbmcgaW4gSUUxMCA+LCB5b3UgY291bGQgZXhwZXJpbWVudCB3aXRoIHRoZSB2YWx1ZVxyXG4gICAgLy8gc2VlIGZvciBtb3JlIG9wdGlvbnMgdGhpcyBpc3N1ZTsgaHR0cHM6Ly9naXRodWIuY29tL0VpZ2h0TWVkaWEvaGFtbWVyLmpzL2lzc3Vlcy8yNDFcclxuICAgIHRvdWNoQWN0aW9uICAgICAgOiAnbm9uZScsXHJcbiAgICB0b3VjaENhbGxvdXQgICAgIDogJ25vbmUnLFxyXG4gICAgY29udGVudFpvb21pbmcgICA6ICdub25lJyxcclxuICAgIHVzZXJEcmFnICAgICAgICAgOiAnbm9uZScsXHJcbiAgICB0YXBIaWdobGlnaHRDb2xvcjogJ3JnYmEoMCwwLDAsMCknXHJcbiAgfVxyXG5cclxuICAvL1xyXG4gIC8vIG1vcmUgc2V0dGluZ3MgYXJlIGRlZmluZWQgcGVyIGdlc3R1cmUgYXQgZ2VzdHVyZXMuanNcclxuICAvL1xyXG59O1xyXG5cclxuLy8gZGV0ZWN0IHRvdWNoZXZlbnRzXHJcbkhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyA9IHdpbmRvdy5uYXZpZ2F0b3IucG9pbnRlckVuYWJsZWQgfHwgd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkO1xyXG5IYW1tZXIuSEFTX1RPVUNIRVZFTlRTID0gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyk7XHJcblxyXG4vLyBkb250IHVzZSBtb3VzZWV2ZW50cyBvbiBtb2JpbGUgZGV2aWNlc1xyXG5IYW1tZXIuTU9CSUxFX1JFR0VYID0gL21vYmlsZXx0YWJsZXR8aXAoYWR8aG9uZXxvZCl8YW5kcm9pZHxzaWxrL2k7XHJcbkhhbW1lci5OT19NT1VTRUVWRU5UUyA9IEhhbW1lci5IQVNfVE9VQ0hFVkVOVFMgJiYgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goSGFtbWVyLk1PQklMRV9SRUdFWCk7XHJcblxyXG4vLyBldmVudHR5cGVzIHBlciB0b3VjaGV2ZW50IChzdGFydCwgbW92ZSwgZW5kKVxyXG4vLyBhcmUgZmlsbGVkIGJ5IEhhbW1lci5ldmVudC5kZXRlcm1pbmVFdmVudFR5cGVzIG9uIHNldHVwXHJcbkhhbW1lci5FVkVOVF9UWVBFUyA9IHt9O1xyXG5cclxuLy8gZGlyZWN0aW9uIGRlZmluZXNcclxuSGFtbWVyLkRJUkVDVElPTl9ET1dOID0gJ2Rvd24nO1xyXG5IYW1tZXIuRElSRUNUSU9OX0xFRlQgPSAnbGVmdCc7XHJcbkhhbW1lci5ESVJFQ1RJT05fVVAgPSAndXAnO1xyXG5IYW1tZXIuRElSRUNUSU9OX1JJR0hUID0gJ3JpZ2h0JztcclxuXHJcbi8vIHBvaW50ZXIgdHlwZVxyXG5IYW1tZXIuUE9JTlRFUl9NT1VTRSA9ICdtb3VzZSc7XHJcbkhhbW1lci5QT0lOVEVSX1RPVUNIID0gJ3RvdWNoJztcclxuSGFtbWVyLlBPSU5URVJfUEVOID0gJ3Blbic7XHJcblxyXG4vLyBpbnRlcnZhbCBpbiB3aGljaCBIYW1tZXIgcmVjYWxjdWxhdGVzIGN1cnJlbnQgdmVsb2NpdHkgaW4gbXNcclxuSGFtbWVyLlVQREFURV9WRUxPQ0lUWV9JTlRFUlZBTCA9IDIwO1xyXG5cclxuLy8gdG91Y2ggZXZlbnQgZGVmaW5lc1xyXG5IYW1tZXIuRVZFTlRfU1RBUlQgPSAnc3RhcnQnO1xyXG5IYW1tZXIuRVZFTlRfTU9WRSA9ICdtb3ZlJztcclxuSGFtbWVyLkVWRU5UX0VORCA9ICdlbmQnO1xyXG5cclxuLy8gaGFtbWVyIGRvY3VtZW50IHdoZXJlIHRoZSBiYXNlIGV2ZW50cyBhcmUgYWRkZWQgYXRcclxuSGFtbWVyLkRPQ1VNRU5UID0gd2luZG93LmRvY3VtZW50O1xyXG5cclxuLy8gcGx1Z2lucyBhbmQgZ2VzdHVyZXMgbmFtZXNwYWNlc1xyXG5IYW1tZXIucGx1Z2lucyA9IEhhbW1lci5wbHVnaW5zIHx8IHt9O1xyXG5IYW1tZXIuZ2VzdHVyZXMgPSBIYW1tZXIuZ2VzdHVyZXMgfHwge307XHJcblxyXG5cclxuLy8gaWYgdGhlIHdpbmRvdyBldmVudHMgYXJlIHNldC4uLlxyXG5IYW1tZXIuUkVBRFkgPSBmYWxzZTtcclxuXHJcbi8qKlxyXG4gKiBzZXR1cCBldmVudHMgdG8gZGV0ZWN0IGdlc3R1cmVzIG9uIHRoZSBkb2N1bWVudFxyXG4gKi9cclxuZnVuY3Rpb24gc2V0dXAoKSB7XHJcbiAgaWYoSGFtbWVyLlJFQURZKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHdoYXQgZXZlbnR0eXBlcyB3ZSBhZGQgbGlzdGVuZXJzIHRvXHJcbiAgSGFtbWVyLmV2ZW50LmRldGVybWluZUV2ZW50VHlwZXMoKTtcclxuXHJcbiAgLy8gUmVnaXN0ZXIgYWxsIGdlc3R1cmVzIGluc2lkZSBIYW1tZXIuZ2VzdHVyZXNcclxuICBIYW1tZXIudXRpbHMuZWFjaChIYW1tZXIuZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpe1xyXG4gICAgSGFtbWVyLmRldGVjdGlvbi5yZWdpc3RlcihnZXN0dXJlKTtcclxuICB9KTtcclxuXHJcbiAgLy8gQWRkIHRvdWNoIGV2ZW50cyBvbiB0aGUgZG9jdW1lbnRcclxuICBIYW1tZXIuZXZlbnQub25Ub3VjaChIYW1tZXIuRE9DVU1FTlQsIEhhbW1lci5FVkVOVF9NT1ZFLCBIYW1tZXIuZGV0ZWN0aW9uLmRldGVjdCk7XHJcbiAgSGFtbWVyLmV2ZW50Lm9uVG91Y2goSGFtbWVyLkRPQ1VNRU5ULCBIYW1tZXIuRVZFTlRfRU5ELCBIYW1tZXIuZGV0ZWN0aW9uLmRldGVjdCk7XHJcblxyXG4gIC8vIEhhbW1lciBpcyByZWFkeS4uLiFcclxuICBIYW1tZXIuUkVBRFkgPSB0cnVlO1xyXG59XHJcblxyXG5IYW1tZXIudXRpbHMgPSB7XHJcbiAgLyoqXHJcbiAgICogZXh0ZW5kIG1ldGhvZCxcclxuICAgKiBhbHNvIHVzZWQgZm9yIGNsb25pbmcgd2hlbiBkZXN0IGlzIGFuIGVtcHR5IG9iamVjdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGRlc3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBzcmNcclxuICAgKiBAcGFybSAge0Jvb2xlYW59ICBtZXJnZSAgICBkbyBhIG1lcmdlXHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgZGVzdFxyXG4gICAqL1xyXG4gIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYywgbWVyZ2UpIHtcclxuICAgIGZvcih2YXIga2V5IGluIHNyYykge1xyXG4gICAgICBpZihkZXN0W2tleV0gIT09IHVuZGVmaW5lZCAmJiBtZXJnZSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGRlc3Rba2V5XSA9IHNyY1trZXldO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlc3Q7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGZvciBlYWNoXHJcbiAgICogQHBhcmFtIG9ialxyXG4gICAqIEBwYXJhbSBpdGVyYXRvclxyXG4gICAqL1xyXG4gIGVhY2g6IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcclxuICAgIHZhciBpLCBsZW5ndGg7XHJcbiAgICAvLyBuYXRpdmUgZm9yRWFjaCBvbiBhcnJheXNcclxuICAgIGlmICgnZm9yRWFjaCcgaW4gb2JqKSB7XHJcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcclxuICAgIH1cclxuICAgIC8vIGFycmF5c1xyXG4gICAgZWxzZSBpZihvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gb2JqZWN0c1xyXG4gICAgZWxzZSB7XHJcbiAgICAgIGZvciAoaSBpbiBvYmopIHtcclxuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGkpICYmIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIGZpbmQgaWYgYSBub2RlIGlzIGluIHRoZSBnaXZlbiBwYXJlbnRcclxuICAgKiB1c2VkIGZvciBldmVudCBkZWxlZ2F0aW9uIHRyaWNrc1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBub2RlXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIHBhcmVudFxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAgICAgICBoYXNfcGFyZW50XHJcbiAgICovXHJcbiAgaGFzUGFyZW50OiBmdW5jdGlvbihub2RlLCBwYXJlbnQpIHtcclxuICAgIHdoaWxlKG5vZGUpIHtcclxuICAgICAgaWYobm9kZSA9PSBwYXJlbnQpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBnZXQgdGhlIGNlbnRlciBvZiBhbGwgdGhlIHRvdWNoZXNcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICB0b3VjaGVzXHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgY2VudGVyXHJcbiAgICovXHJcbiAgZ2V0Q2VudGVyOiBmdW5jdGlvbiBnZXRDZW50ZXIodG91Y2hlcykge1xyXG4gICAgdmFyIHZhbHVlc1ggPSBbXSwgdmFsdWVzWSA9IFtdO1xyXG5cclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRvdWNoZXMsIGZ1bmN0aW9uKHRvdWNoKSB7XHJcbiAgICAgIC8vIEkgcHJlZmVyIGNsaWVudFggYmVjYXVzZSBpdCBpZ25vcmUgdGhlIHNjcm9sbGluZyBwb3NpdGlvblxyXG4gICAgICB2YWx1ZXNYLnB1c2godHlwZW9mIHRvdWNoLmNsaWVudFggIT09ICd1bmRlZmluZWQnID8gdG91Y2guY2xpZW50WCA6IHRvdWNoLnBhZ2VYICk7XHJcbiAgICAgIHZhbHVlc1kucHVzaCh0eXBlb2YgdG91Y2guY2xpZW50WSAhPT0gJ3VuZGVmaW5lZCcgPyB0b3VjaC5jbGllbnRZIDogdG91Y2gucGFnZVkgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHBhZ2VYOiAoKE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlc1gpICsgTWF0aC5tYXguYXBwbHkoTWF0aCwgdmFsdWVzWCkpIC8gMiksXHJcbiAgICAgIHBhZ2VZOiAoKE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlc1kpICsgTWF0aC5tYXguYXBwbHkoTWF0aCwgdmFsdWVzWSkpIC8gMilcclxuICAgIH07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgdmVsb2NpdHkgYmV0d2VlbiB0d28gcG9pbnRzXHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfdGltZVxyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3hcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV95XHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgdmVsb2NpdHlcclxuICAgKi9cclxuICBnZXRWZWxvY2l0eTogZnVuY3Rpb24gZ2V0VmVsb2NpdHkoZGVsdGFfdGltZSwgZGVsdGFfeCwgZGVsdGFfeSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogTWF0aC5hYnMoZGVsdGFfeCAvIGRlbHRhX3RpbWUpIHx8IDAsXHJcbiAgICAgIHk6IE1hdGguYWJzKGRlbHRhX3kgLyBkZWx0YV90aW1lKSB8fCAwXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIGFuZ2xlIGJldHdlZW4gdHdvIGNvb3JkaW5hdGVzXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgYW5nbGVcclxuICAgKi9cclxuICBnZXRBbmdsZTogZnVuY3Rpb24gZ2V0QW5nbGUodG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB5ID0gdG91Y2gyLnBhZ2VZIC0gdG91Y2gxLnBhZ2VZLFxyXG4gICAgICB4ID0gdG91Y2gyLnBhZ2VYIC0gdG91Y2gxLnBhZ2VYO1xyXG4gICAgcmV0dXJuIE1hdGguYXRhbjIoeSwgeCkgKiAxODAgLyBNYXRoLlBJO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBhbmdsZSB0byBkaXJlY3Rpb24gZGVmaW5lXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge1N0cmluZ30gICAgZGlyZWN0aW9uIGNvbnN0YW50LCBsaWtlIEhhbW1lci5ESVJFQ1RJT05fTEVGVFxyXG4gICAqL1xyXG4gIGdldERpcmVjdGlvbjogZnVuY3Rpb24gZ2V0RGlyZWN0aW9uKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeCA9IE1hdGguYWJzKHRvdWNoMS5wYWdlWCAtIHRvdWNoMi5wYWdlWCksXHJcbiAgICAgIHkgPSBNYXRoLmFicyh0b3VjaDEucGFnZVkgLSB0b3VjaDIucGFnZVkpO1xyXG5cclxuICAgIGlmKHggPj0geSkge1xyXG4gICAgICByZXR1cm4gdG91Y2gxLnBhZ2VYIC0gdG91Y2gyLnBhZ2VYID4gMCA/IEhhbW1lci5ESVJFQ1RJT05fTEVGVCA6IEhhbW1lci5ESVJFQ1RJT05fUklHSFQ7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRvdWNoMS5wYWdlWSAtIHRvdWNoMi5wYWdlWSA+IDAgPyBIYW1tZXIuRElSRUNUSU9OX1VQIDogSGFtbWVyLkRJUkVDVElPTl9ET1dOO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gdHdvIHRvdWNoZXNcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBkaXN0YW5jZVxyXG4gICAqL1xyXG4gIGdldERpc3RhbmNlOiBmdW5jdGlvbiBnZXREaXN0YW5jZSh0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHggPSB0b3VjaDIucGFnZVggLSB0b3VjaDEucGFnZVgsXHJcbiAgICAgIHkgPSB0b3VjaDIucGFnZVkgLSB0b3VjaDEucGFnZVk7XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KCh4ICogeCkgKyAoeSAqIHkpKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB0d28gdG91Y2hMaXN0cyAoZmluZ2VycylcclxuICAgKiBubyBzY2FsZSBpcyAxLCBhbmQgZ29lcyBkb3duIHRvIDAgd2hlbiBwaW5jaGVkIHRvZ2V0aGVyLCBhbmQgYmlnZ2VyIHdoZW4gcGluY2hlZCBvdXRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBzdGFydFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGVuZFxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIHNjYWxlXHJcbiAgICovXHJcbiAgZ2V0U2NhbGU6IGZ1bmN0aW9uIGdldFNjYWxlKHN0YXJ0LCBlbmQpIHtcclxuICAgIC8vIG5lZWQgdHdvIGZpbmdlcnMuLi5cclxuICAgIGlmKHN0YXJ0Lmxlbmd0aCA+PSAyICYmIGVuZC5sZW5ndGggPj0gMikge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXREaXN0YW5jZShlbmRbMF0sIGVuZFsxXSkgL1xyXG4gICAgICAgIHRoaXMuZ2V0RGlzdGFuY2Uoc3RhcnRbMF0sIHN0YXJ0WzFdKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHJvdGF0aW9uIGRlZ3JlZXMgYmV0d2VlbiB0d28gdG91Y2hMaXN0cyAoZmluZ2VycylcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBzdGFydFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGVuZFxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIHJvdGF0aW9uXHJcbiAgICovXHJcbiAgZ2V0Um90YXRpb246IGZ1bmN0aW9uIGdldFJvdGF0aW9uKHN0YXJ0LCBlbmQpIHtcclxuICAgIC8vIG5lZWQgdHdvIGZpbmdlcnNcclxuICAgIGlmKHN0YXJ0Lmxlbmd0aCA+PSAyICYmIGVuZC5sZW5ndGggPj0gMikge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXRBbmdsZShlbmRbMV0sIGVuZFswXSkgLVxyXG4gICAgICAgIHRoaXMuZ2V0QW5nbGUoc3RhcnRbMV0sIHN0YXJ0WzBdKTtcclxuICAgIH1cclxuICAgIHJldHVybiAwO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBib29sZWFuIGlmIHRoZSBkaXJlY3Rpb24gaXMgdmVydGljYWxcclxuICAgKiBAcGFyYW0gICAge1N0cmluZ30gICAgZGlyZWN0aW9uXHJcbiAgICogQHJldHVybnMgIHtCb29sZWFufSAgIGlzX3ZlcnRpY2FsXHJcbiAgICovXHJcbiAgaXNWZXJ0aWNhbDogZnVuY3Rpb24gaXNWZXJ0aWNhbChkaXJlY3Rpb24pIHtcclxuICAgIHJldHVybiAoZGlyZWN0aW9uID09IEhhbW1lci5ESVJFQ1RJT05fVVAgfHwgZGlyZWN0aW9uID09IEhhbW1lci5ESVJFQ1RJT05fRE9XTik7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHN0b3AgYnJvd3NlciBkZWZhdWx0IGJlaGF2aW9yIHdpdGggY3NzIHByb3BzXHJcbiAgICogQHBhcmFtICAge0h0bWxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY3NzX3Byb3BzXHJcbiAgICovXHJcbiAgc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3I6IGZ1bmN0aW9uIHN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yKGVsZW1lbnQsIGNzc19wcm9wcykge1xyXG4gICAgaWYoIWNzc19wcm9wcyB8fCAhZWxlbWVudCB8fCAhZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2l0aCBjc3MgcHJvcGVydGllcyBmb3IgbW9kZXJuIGJyb3dzZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChbJ3dlYmtpdCcsICdraHRtbCcsICdtb3onLCAnTW96JywgJ21zJywgJ28nLCAnJ10sIGZ1bmN0aW9uKHZlbmRvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChjc3NfcHJvcHMsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XHJcbiAgICAgICAgICAvLyB2ZW5kZXIgcHJlZml4IGF0IHRoZSBwcm9wZXJ0eVxyXG4gICAgICAgICAgaWYodmVuZG9yKSB7XHJcbiAgICAgICAgICAgIHByb3AgPSB2ZW5kb3IgKyBwcm9wLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBzZXQgdGhlIHN0eWxlXHJcbiAgICAgICAgICBpZihwcm9wIGluIGVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9IHZhbHVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFsc28gdGhlIGRpc2FibGUgb25zZWxlY3RzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJTZWxlY3QgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25zZWxlY3RzdGFydCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhbmQgZGlzYWJsZSBvbmRyYWdzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJEcmFnID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uZHJhZ3N0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiByZXZlcnRzIGFsbCBjaGFuZ2VzIG1hZGUgYnkgJ3N0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yJ1xyXG4gICAqIEBwYXJhbSAgIHtIdG1sRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNzc19wcm9wc1xyXG4gICAqL1xyXG4gIHN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcjogZnVuY3Rpb24gc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yKGVsZW1lbnQsIGNzc19wcm9wcykge1xyXG4gICAgaWYoIWNzc19wcm9wcyB8fCAhZWxlbWVudCB8fCAhZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2l0aCBjc3MgcHJvcGVydGllcyBmb3IgbW9kZXJuIGJyb3dzZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChbJ3dlYmtpdCcsICdraHRtbCcsICdtb3onLCAnTW96JywgJ21zJywgJ28nLCAnJ10sIGZ1bmN0aW9uKHZlbmRvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChjc3NfcHJvcHMsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XHJcbiAgICAgICAgICAvLyB2ZW5kZXIgcHJlZml4IGF0IHRoZSBwcm9wZXJ0eVxyXG4gICAgICAgICAgaWYodmVuZG9yKSB7XHJcbiAgICAgICAgICAgIHByb3AgPSB2ZW5kb3IgKyBwcm9wLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyByZXNldCB0aGUgc3R5bGVcclxuICAgICAgICAgIGlmKHByb3AgaW4gZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlW3Byb3BdID0gJyc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWxzbyB0aGUgZW5hYmxlIG9uc2VsZWN0c3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyU2VsZWN0ID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uc2VsZWN0c3RhcnQgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGFuZCBlbmFibGUgb25kcmFnc3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyRHJhZyA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbmRyYWdzdGFydCA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgbmV3IGhhbW1lciBpbnN0YW5jZVxyXG4gKiBhbGwgbWV0aG9kcyBzaG91bGQgcmV0dXJuIHRoZSBpbnN0YW5jZSBpdHNlbGYsIHNvIGl0IGlzIGNoYWluYWJsZS5cclxuICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgICAgICBlbGVtZW50XHJcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICAgICAgW29wdGlvbnM9e31dXHJcbiAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuSGFtbWVyLkluc3RhbmNlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gc2V0dXAgSGFtbWVySlMgd2luZG93IGV2ZW50cyBhbmQgcmVnaXN0ZXIgYWxsIGdlc3R1cmVzXHJcbiAgLy8gdGhpcyBhbHNvIHNldHMgdXAgdGhlIGRlZmF1bHQgb3B0aW9uc1xyXG4gIHNldHVwKCk7XHJcblxyXG4gIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XHJcblxyXG4gIC8vIHN0YXJ0L3N0b3AgZGV0ZWN0aW9uIG9wdGlvblxyXG4gIHRoaXMuZW5hYmxlZCA9IHRydWU7XHJcblxyXG4gIC8vIG1lcmdlIG9wdGlvbnNcclxuICB0aGlzLm9wdGlvbnMgPSBIYW1tZXIudXRpbHMuZXh0ZW5kKFxyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgSGFtbWVyLmRlZmF1bHRzKSxcclxuICAgIG9wdGlvbnMgfHwge30pO1xyXG5cclxuICAvLyBhZGQgc29tZSBjc3MgdG8gdGhlIGVsZW1lbnQgdG8gcHJldmVudCB0aGUgYnJvd3NlciBmcm9tIGRvaW5nIGl0cyBuYXRpdmUgYmVoYXZvaXJcclxuICBpZih0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKSB7XHJcbiAgICBIYW1tZXIudXRpbHMuc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3IodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKTtcclxuICB9XHJcblxyXG4gIC8vIHN0YXJ0IGRldGVjdGlvbiBvbiB0b3VjaHN0YXJ0XHJcbiAgdGhpcy5fZXZlbnRTdGFydEhhbmRsZXIgPSBIYW1tZXIuZXZlbnQub25Ub3VjaChlbGVtZW50LCBIYW1tZXIuRVZFTlRfU1RBUlQsIGZ1bmN0aW9uKGV2KSB7XHJcbiAgICBpZihzZWxmLmVuYWJsZWQpIHtcclxuICAgICAgSGFtbWVyLmRldGVjdGlvbi5zdGFydERldGVjdChzZWxmLCBldik7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIC8vIGtlZXAgYSBsaXN0IG9mIHVzZXIgZXZlbnQgaGFuZGxlcnMgd2hpY2ggbmVlZHMgdG8gYmUgcmVtb3ZlZCB3aGVuIGNhbGxpbmcgJ2Rpc3Bvc2UnXHJcbiAgdGhpcy5fZXZlbnRIYW5kbGVyID0gW107XHJcblxyXG4gIC8vIHJldHVybiBpbnN0YW5jZVxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbkhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUgPSB7XHJcbiAgLyoqXHJcbiAgICogYmluZCBldmVudHMgdG8gdGhlIGluc3RhbmNlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICBoYW5kbGVyXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBvbjogZnVuY3Rpb24gb25FdmVudChnZXN0dXJlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgZ2VzdHVyZXMgPSBnZXN0dXJlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChnZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihnZXN0dXJlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICAgIHRoaXMuX2V2ZW50SGFuZGxlci5wdXNoKHsgZ2VzdHVyZTogZ2VzdHVyZSwgaGFuZGxlcjogaGFuZGxlciB9KTtcclxuICAgIH0sIHRoaXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHVuYmluZCBldmVudHMgdG8gdGhlIGluc3RhbmNlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICBoYW5kbGVyXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBvZmY6IGZ1bmN0aW9uIG9mZkV2ZW50KGdlc3R1cmUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBnZXN0dXJlcyA9IGdlc3R1cmUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKGdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGdlc3R1cmUsIGhhbmRsZXIsIGZhbHNlKTtcclxuXHJcbiAgICAgIC8vIHJlbW92ZSB0aGUgZXZlbnQgaGFuZGxlciBmcm9tIHRoZSBpbnRlcm5hbCBsaXN0XHJcbiAgICAgIHZhciBpbmRleCA9IC0xO1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLl9ldmVudEhhbmRsZXIsIGZ1bmN0aW9uKGV2ZW50SGFuZGxlciwgaSkge1xyXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEgJiYgZXZlbnRIYW5kbGVyLmdlc3R1cmUgPT09IGdlc3R1cmUgJiYgZXZlbnRIYW5kbGVyLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcclxuICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sIHRoaXMpO1xyXG5cclxuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcclxuICAgICAgICB0aGlzLl9ldmVudEhhbmRsZXIuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgfVxyXG4gICAgfSwgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdHJpZ2dlciBnZXN0dXJlIGV2ZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICBbZXZlbnREYXRhXVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgdHJpZ2dlcjogZnVuY3Rpb24gdHJpZ2dlckV2ZW50KGdlc3R1cmUsIGV2ZW50RGF0YSkge1xyXG4gICAgLy8gb3B0aW9uYWxcclxuICAgIGlmKCFldmVudERhdGEpIHtcclxuICAgICAgZXZlbnREYXRhID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY3JlYXRlIERPTSBldmVudFxyXG4gICAgdmFyIGV2ZW50ID0gSGFtbWVyLkRPQ1VNRU5ULmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xyXG4gICAgZXZlbnQuaW5pdEV2ZW50KGdlc3R1cmUsIHRydWUsIHRydWUpO1xyXG4gICAgZXZlbnQuZ2VzdHVyZSA9IGV2ZW50RGF0YTtcclxuXHJcbiAgICAvLyB0cmlnZ2VyIG9uIHRoZSB0YXJnZXQgaWYgaXQgaXMgaW4gdGhlIGluc3RhbmNlIGVsZW1lbnQsXHJcbiAgICAvLyB0aGlzIGlzIGZvciBldmVudCBkZWxlZ2F0aW9uIHRyaWNrc1xyXG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XHJcbiAgICBpZihIYW1tZXIudXRpbHMuaGFzUGFyZW50KGV2ZW50RGF0YS50YXJnZXQsIGVsZW1lbnQpKSB7XHJcbiAgICAgIGVsZW1lbnQgPSBldmVudERhdGEudGFyZ2V0O1xyXG4gICAgfVxyXG5cclxuICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZW5hYmxlIG9mIGRpc2FibGUgaGFtbWVyLmpzIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtCb29sZWFufSAgIHN0YXRlXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBlbmFibGU6IGZ1bmN0aW9uIGVuYWJsZShzdGF0ZSkge1xyXG4gICAgdGhpcy5lbmFibGVkID0gc3RhdGU7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZGlzcG9zZSB0aGlzIGhhbW1lciBpbnN0YW5jZVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgZGlzcG9zZTogZnVuY3Rpb24gZGlzcG9zZSgpIHtcclxuXHJcbiAgICAvLyB1bmRvIGFsbCBjaGFuZ2VzIG1hZGUgYnkgc3RvcF9icm93c2VyX2JlaGF2aW9yXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5zdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3IodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB1bmJpbmQgYWxsIGN1c3RvbSBldmVudCBoYW5kbGVyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5fZXZlbnRIYW5kbGVyLCBmdW5jdGlvbihldmVudEhhbmRsZXIpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRIYW5kbGVyLmdlc3R1cmUsIGV2ZW50SGFuZGxlci5oYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHRoaXMuX2V2ZW50SGFuZGxlci5sZW5ndGggPSAwO1xyXG5cclxuICAgIC8vIHVuYmluZCB0aGUgc3RhcnQgZXZlbnQgbGlzdGVuZXJcclxuICAgIEhhbW1lci5ldmVudC51bmJpbmREb20odGhpcy5lbGVtZW50LCBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX1NUQVJUXSwgdGhpcy5fZXZlbnRTdGFydEhhbmRsZXIpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGlzIGhvbGRzIHRoZSBsYXN0IG1vdmUgZXZlbnQsXHJcbiAqIHVzZWQgdG8gZml4IGVtcHR5IHRvdWNoZW5kIGlzc3VlXHJcbiAqIHNlZSB0aGUgb25Ub3VjaCBldmVudCBmb3IgYW4gZXhwbGFuYXRpb25cclxuICogQHR5cGUge09iamVjdH1cclxuICovXHJcbnZhciBsYXN0X21vdmVfZXZlbnQgPSBudWxsO1xyXG5cclxuXHJcbi8qKlxyXG4gKiB3aGVuIHRoZSBtb3VzZSBpcyBob2xkIGRvd24sIHRoaXMgaXMgdHJ1ZVxyXG4gKiBAdHlwZSB7Qm9vbGVhbn1cclxuICovXHJcbnZhciBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcblxyXG5cclxuLyoqXHJcbiAqIHdoZW4gdG91Y2ggZXZlbnRzIGhhdmUgYmVlbiBmaXJlZCwgdGhpcyBpcyB0cnVlXHJcbiAqIEB0eXBlIHtCb29sZWFufVxyXG4gKi9cclxudmFyIHRvdWNoX3RyaWdnZXJlZCA9IGZhbHNlO1xyXG5cclxuXHJcbkhhbW1lci5ldmVudCA9IHtcclxuICAvKipcclxuICAgKiBzaW1wbGUgYWRkRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHR5cGVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIGJpbmREb206IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciB0eXBlcyA9IHR5cGUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHR5cGVzLCBmdW5jdGlvbih0eXBlKXtcclxuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzaW1wbGUgcmVtb3ZlRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHR5cGVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIHVuYmluZERvbTogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHR5cGVzID0gdHlwZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godHlwZXMsIGZ1bmN0aW9uKHR5cGUpe1xyXG4gICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRvdWNoIGV2ZW50cyB3aXRoIG1vdXNlIGZhbGxiYWNrXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlICAgICAgICBsaWtlIEhhbW1lci5FVkVOVF9NT1ZFXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBvblRvdWNoOiBmdW5jdGlvbiBvblRvdWNoKGVsZW1lbnQsIGV2ZW50VHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBmbiA9IGZ1bmN0aW9uIGJpbmREb21PblRvdWNoKGV2KSB7XHJcbiAgICAgIHZhciBzb3VyY2VFdmVudFR5cGUgPSBldi50eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAvLyBvbm1vdXNldXAsIGJ1dCB3aGVuIHRvdWNoZW5kIGhhcyBiZWVuIGZpcmVkIHdlIGRvIG5vdGhpbmcuXHJcbiAgICAgIC8vIHRoaXMgaXMgZm9yIHRvdWNoZGV2aWNlcyB3aGljaCBhbHNvIGZpcmUgYSBtb3VzZXVwIG9uIHRvdWNoZW5kXHJcbiAgICAgIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiB0b3VjaF90cmlnZ2VyZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG1vdXNlYnV0dG9uIG11c3QgYmUgZG93biBvciBhIHRvdWNoIGV2ZW50XHJcbiAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaC8pIHx8ICAgLy8gdG91Y2ggZXZlbnRzIGFyZSBhbHdheXMgb24gc2NyZWVuXHJcbiAgICAgICAgc291cmNlRXZlbnRUeXBlLm1hdGNoKC9wb2ludGVyZG93bi8pIHx8IC8vIHBvaW50ZXJldmVudHMgdG91Y2hcclxuICAgICAgICAoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmIGV2LndoaWNoID09PSAxKSAgIC8vIG1vdXNlIGlzIHByZXNzZWRcclxuICAgICAgICApIHtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gbW91c2UgaXNuJ3QgcHJlc3NlZFxyXG4gICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiAhZXYud2hpY2gpIHtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICAvLyB3ZSBhcmUgaW4gYSB0b3VjaCBldmVudCwgc2V0IHRoZSB0b3VjaCB0cmlnZ2VyZWQgYm9vbCB0byB0cnVlLFxyXG4gICAgICAvLyB0aGlzIGZvciB0aGUgY29uZmxpY3RzIHRoYXQgbWF5IG9jY3VyIG9uIGlvcyBhbmQgYW5kcm9pZFxyXG4gICAgICBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNofHBvaW50ZXIvKSkge1xyXG4gICAgICAgIHRvdWNoX3RyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGNvdW50IHRoZSB0b3RhbCB0b3VjaGVzIG9uIHRoZSBzY3JlZW5cclxuICAgICAgdmFyIGNvdW50X3RvdWNoZXMgPSAwO1xyXG5cclxuICAgICAgLy8gd2hlbiB0b3VjaCBoYXMgYmVlbiB0cmlnZ2VyZWQgaW4gdGhpcyBkZXRlY3Rpb24gc2Vzc2lvblxyXG4gICAgICAvLyBhbmQgd2UgYXJlIG5vdyBoYW5kbGluZyBhIG1vdXNlIGV2ZW50LCB3ZSBzdG9wIHRoYXQgdG8gcHJldmVudCBjb25mbGljdHNcclxuICAgICAgaWYoZW5hYmxlX2RldGVjdCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSBwb2ludGVyZXZlbnRcclxuICAgICAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgJiYgZXZlbnRUeXBlICE9IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LnVwZGF0ZVBvaW50ZXIoZXZlbnRUeXBlLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRvdWNoXHJcbiAgICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNoLykpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBldi50b3VjaGVzLmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbW91c2VcclxuICAgICAgICBlbHNlIGlmKCF0b3VjaF90cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBzb3VyY2VFdmVudFR5cGUubWF0Y2goL3VwLykgPyAwIDogMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlmIHdlIGFyZSBpbiBhIGVuZCBldmVudCwgYnV0IHdoZW4gd2UgcmVtb3ZlIG9uZSB0b3VjaCBhbmRcclxuICAgICAgICAvLyB3ZSBzdGlsbCBoYXZlIGVub3VnaCwgc2V0IGV2ZW50VHlwZSB0byBtb3ZlXHJcbiAgICAgICAgaWYoY291bnRfdG91Y2hlcyA+IDAgJiYgZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGV2ZW50VHlwZSA9IEhhbW1lci5FVkVOVF9NT1ZFO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBubyB0b3VjaGVzLCBmb3JjZSB0aGUgZW5kIGV2ZW50XHJcbiAgICAgICAgZWxzZSBpZighY291bnRfdG91Y2hlcykge1xyXG4gICAgICAgICAgZXZlbnRUeXBlID0gSGFtbWVyLkVWRU5UX0VORDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN0b3JlIHRoZSBsYXN0IG1vdmUgZXZlbnRcclxuICAgICAgICBpZihjb3VudF90b3VjaGVzIHx8IGxhc3RfbW92ZV9ldmVudCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgbGFzdF9tb3ZlX2V2ZW50ID0gZXY7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHRoZSBoYW5kbGVyXHJcbiAgICAgICAgaGFuZGxlci5jYWxsKEhhbW1lci5kZXRlY3Rpb24sIHNlbGYuY29sbGVjdEV2ZW50RGF0YShlbGVtZW50LCBldmVudFR5cGUsIHNlbGYuZ2V0VG91Y2hMaXN0KGxhc3RfbW92ZV9ldmVudCwgZXZlbnRUeXBlKSwgZXYpKTtcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHBvaW50ZXJldmVudCBmcm9tIGxpc3RcclxuICAgICAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgJiYgZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LnVwZGF0ZVBvaW50ZXIoZXZlbnRUeXBlLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBvbiB0aGUgZW5kIHdlIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgaWYoIWNvdW50X3RvdWNoZXMpIHtcclxuICAgICAgICBsYXN0X21vdmVfZXZlbnQgPSBudWxsO1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuICAgICAgICB0b3VjaF90cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBIYW1tZXIuUG9pbnRlckV2ZW50LnJlc2V0KCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5iaW5kRG9tKGVsZW1lbnQsIEhhbW1lci5FVkVOVF9UWVBFU1tldmVudFR5cGVdLCBmbik7XHJcblxyXG4gICAgLy8gcmV0dXJuIHRoZSBib3VuZCBmdW5jdGlvbiB0byBiZSBhYmxlIHRvIHVuYmluZCBpdCBsYXRlclxyXG4gICAgcmV0dXJuIGZuO1xyXG4gICAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHdlIGhhdmUgZGlmZmVyZW50IGV2ZW50cyBmb3IgZWFjaCBkZXZpY2UvYnJvd3NlclxyXG4gICAqIGRldGVybWluZSB3aGF0IHdlIG5lZWQgYW5kIHNldCB0aGVtIGluIHRoZSBIYW1tZXIuRVZFTlRfVFlQRVMgY29uc3RhbnRcclxuICAgKi9cclxuICBkZXRlcm1pbmVFdmVudFR5cGVzOiBmdW5jdGlvbiBkZXRlcm1pbmVFdmVudFR5cGVzKCkge1xyXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBldmVudHR5cGUgd2Ugd2FudCB0byBzZXRcclxuICAgIHZhciB0eXBlcztcclxuXHJcbiAgICAvLyBwb2ludGVyRXZlbnRzIG1hZ2ljXHJcbiAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMpIHtcclxuICAgICAgdHlwZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LmdldEV2ZW50cygpO1xyXG4gICAgfVxyXG4gICAgLy8gb24gQW5kcm9pZCwgaU9TLCBibGFja2JlcnJ5LCB3aW5kb3dzIG1vYmlsZSB3ZSBkb250IHdhbnQgYW55IG1vdXNlZXZlbnRzXHJcbiAgICBlbHNlIGlmKEhhbW1lci5OT19NT1VTRUVWRU5UUykge1xyXG4gICAgICB0eXBlcyA9IFtcclxuICAgICAgICAndG91Y2hzdGFydCcsXHJcbiAgICAgICAgJ3RvdWNobW92ZScsXHJcbiAgICAgICAgJ3RvdWNoZW5kIHRvdWNoY2FuY2VsJ107XHJcbiAgICB9XHJcbiAgICAvLyBmb3Igbm9uIHBvaW50ZXIgZXZlbnRzIGJyb3dzZXJzIGFuZCBtaXhlZCBicm93c2VycyxcclxuICAgIC8vIGxpa2UgY2hyb21lIG9uIHdpbmRvd3M4IHRvdWNoIGxhcHRvcFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHR5cGVzID0gW1xyXG4gICAgICAgICd0b3VjaHN0YXJ0IG1vdXNlZG93bicsXHJcbiAgICAgICAgJ3RvdWNobW92ZSBtb3VzZW1vdmUnLFxyXG4gICAgICAgICd0b3VjaGVuZCB0b3VjaGNhbmNlbCBtb3VzZXVwJ107XHJcbiAgICB9XHJcblxyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9TVEFSVF0gPSB0eXBlc1swXTtcclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfTU9WRV0gPSB0eXBlc1sxXTtcclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfRU5EXSA9IHR5cGVzWzJdO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjcmVhdGUgdG91Y2hsaXN0IGRlcGVuZGluZyBvbiB0aGUgZXZlbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldlxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGV2ZW50VHlwZSAgIHVzZWQgYnkgdGhlIGZha2VtdWx0aXRvdWNoIHBsdWdpblxyXG4gICAqL1xyXG4gIGdldFRvdWNoTGlzdDogZnVuY3Rpb24gZ2V0VG91Y2hMaXN0KGV2LyosIGV2ZW50VHlwZSovKSB7XHJcbiAgICAvLyBnZXQgdGhlIGZha2UgcG9pbnRlckV2ZW50IHRvdWNobGlzdFxyXG4gICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTKSB7XHJcbiAgICAgIHJldHVybiBIYW1tZXIuUG9pbnRlckV2ZW50LmdldFRvdWNoTGlzdCgpO1xyXG4gICAgfVxyXG4gICAgLy8gZ2V0IHRoZSB0b3VjaGxpc3RcclxuICAgIGVsc2UgaWYoZXYudG91Y2hlcykge1xyXG4gICAgICByZXR1cm4gZXYudG91Y2hlcztcclxuICAgIH1cclxuICAgIC8vIG1ha2UgZmFrZSB0b3VjaGxpc3QgZnJvbSBtb3VzZSBwb3NpdGlvblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGV2LmlkZW50aWZpZXIgPSAxO1xyXG4gICAgICByZXR1cm4gW2V2XTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY29sbGVjdCBldmVudCBkYXRhIGZvciBIYW1tZXIganNcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGUgICAgICAgIGxpa2UgSGFtbWVyLkVWRU5UX01PVkVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgY29sbGVjdEV2ZW50RGF0YTogZnVuY3Rpb24gY29sbGVjdEV2ZW50RGF0YShlbGVtZW50LCBldmVudFR5cGUsIHRvdWNoZXMsIGV2KSB7XHJcbiAgICAvLyBmaW5kIG91dCBwb2ludGVyVHlwZVxyXG4gICAgdmFyIHBvaW50ZXJUeXBlID0gSGFtbWVyLlBPSU5URVJfVE9VQ0g7XHJcbiAgICBpZihldi50eXBlLm1hdGNoKC9tb3VzZS8pIHx8IEhhbW1lci5Qb2ludGVyRXZlbnQubWF0Y2hUeXBlKEhhbW1lci5QT0lOVEVSX01PVVNFLCBldikpIHtcclxuICAgICAgcG9pbnRlclR5cGUgPSBIYW1tZXIuUE9JTlRFUl9NT1VTRTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjZW50ZXIgICAgIDogSGFtbWVyLnV0aWxzLmdldENlbnRlcih0b3VjaGVzKSxcclxuICAgICAgdGltZVN0YW1wICA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG4gICAgICB0YXJnZXQgICAgIDogZXYudGFyZ2V0LFxyXG4gICAgICB0b3VjaGVzICAgIDogdG91Y2hlcyxcclxuICAgICAgZXZlbnRUeXBlICA6IGV2ZW50VHlwZSxcclxuICAgICAgcG9pbnRlclR5cGU6IHBvaW50ZXJUeXBlLFxyXG4gICAgICBzcmNFdmVudCAgIDogZXYsXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcHJldmVudCB0aGUgYnJvd3NlciBkZWZhdWx0IGFjdGlvbnNcclxuICAgICAgICogbW9zdGx5IHVzZWQgdG8gZGlzYWJsZSBzY3JvbGxpbmcgb2YgdGhlIGJyb3dzZXJcclxuICAgICAgICovXHJcbiAgICAgIHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICBpZih0aGlzLnNyY0V2ZW50LnByZXZlbnRNYW5pcHVsYXRpb24pIHtcclxuICAgICAgICAgIHRoaXMuc3JjRXZlbnQucHJldmVudE1hbmlwdWxhdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGhpcy5zcmNFdmVudC5wcmV2ZW50RGVmYXVsdCkge1xyXG4gICAgICAgICAgdGhpcy5zcmNFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBzdG9wIGJ1YmJsaW5nIHRoZSBldmVudCB1cCB0byBpdHMgcGFyZW50c1xyXG4gICAgICAgKi9cclxuICAgICAgc3RvcFByb3BhZ2F0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnNyY0V2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIGltbWVkaWF0ZWx5IHN0b3AgZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgICAgICogbWlnaHQgYmUgdXNlZnVsIGFmdGVyIGEgc3dpcGUgd2FzIGRldGVjdGVkXHJcbiAgICAgICAqIEByZXR1cm4geyp9XHJcbiAgICAgICAqL1xyXG4gICAgICBzdG9wRGV0ZWN0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gSGFtbWVyLmRldGVjdGlvbi5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuSGFtbWVyLlBvaW50ZXJFdmVudCA9IHtcclxuICAvKipcclxuICAgKiBob2xkcyBhbGwgcG9pbnRlcnNcclxuICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAqL1xyXG4gIHBvaW50ZXJzOiB7fSxcclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IGEgbGlzdCBvZiBwb2ludGVyc1xyXG4gICAqIEByZXR1cm5zIHtBcnJheX0gICAgIHRvdWNobGlzdFxyXG4gICAqL1xyXG4gIGdldFRvdWNoTGlzdDogZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgdG91Y2hsaXN0ID0gW107XHJcblxyXG4gICAgLy8gd2UgY2FuIHVzZSBmb3JFYWNoIHNpbmNlIHBvaW50ZXJFdmVudHMgb25seSBpcyBpbiBJRTEwXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChzZWxmLnBvaW50ZXJzLCBmdW5jdGlvbihwb2ludGVyKXtcclxuICAgICAgdG91Y2hsaXN0LnB1c2gocG9pbnRlcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdG91Y2hsaXN0O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIHVwZGF0ZSB0aGUgcG9zaXRpb24gb2YgYSBwb2ludGVyXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICB0eXBlICAgICAgICAgICAgIEhhbW1lci5FVkVOVF9FTkRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgIHBvaW50ZXJFdmVudFxyXG4gICAqL1xyXG4gIHVwZGF0ZVBvaW50ZXI6IGZ1bmN0aW9uKHR5cGUsIHBvaW50ZXJFdmVudCkge1xyXG4gICAgaWYodHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIGRlbGV0ZSB0aGlzLnBvaW50ZXJzW3BvaW50ZXJFdmVudC5wb2ludGVySWRdO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHBvaW50ZXJFdmVudC5pZGVudGlmaWVyID0gcG9pbnRlckV2ZW50LnBvaW50ZXJJZDtcclxuICAgICAgdGhpcy5wb2ludGVyc1twb2ludGVyRXZlbnQucG9pbnRlcklkXSA9IHBvaW50ZXJFdmVudDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5wb2ludGVycykubGVuZ3RoO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIGNoZWNrIGlmIGV2IG1hdGNoZXMgcG9pbnRlcnR5cGVcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgcG9pbnRlclR5cGUgICAgIEhhbW1lci5QT0lOVEVSX01PVVNFXHJcbiAgICogQHBhcmFtICAge1BvaW50ZXJFdmVudH0gIGV2XHJcbiAgICovXHJcbiAgbWF0Y2hUeXBlOiBmdW5jdGlvbihwb2ludGVyVHlwZSwgZXYpIHtcclxuICAgIGlmKCFldi5wb2ludGVyVHlwZSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHB0ID0gZXYucG9pbnRlclR5cGUsXHJcbiAgICAgIHR5cGVzID0ge307XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9NT1VTRV0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX01PVVNFIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9NT1VTRSk7XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9UT1VDSF0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX1RPVUNIIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9UT1VDSCk7XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9QRU5dID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9QRU4gfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX1BFTik7XHJcbiAgICByZXR1cm4gdHlwZXNbcG9pbnRlclR5cGVdO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBnZXQgZXZlbnRzXHJcbiAgICovXHJcbiAgZ2V0RXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgICdwb2ludGVyZG93biBNU1BvaW50ZXJEb3duJyxcclxuICAgICAgJ3BvaW50ZXJtb3ZlIE1TUG9pbnRlck1vdmUnLFxyXG4gICAgICAncG9pbnRlcnVwIHBvaW50ZXJjYW5jZWwgTVNQb2ludGVyVXAgTVNQb2ludGVyQ2FuY2VsJ1xyXG4gICAgXTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiByZXNldCB0aGUgbGlzdFxyXG4gICAqL1xyXG4gIHJlc2V0OiBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMucG9pbnRlcnMgPSB7fTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuSGFtbWVyLmRldGVjdGlvbiA9IHtcclxuICAvLyBjb250YWlucyBhbGwgcmVnaXN0cmVkIEhhbW1lci5nZXN0dXJlcyBpbiB0aGUgY29ycmVjdCBvcmRlclxyXG4gIGdlc3R1cmVzOiBbXSxcclxuXHJcbiAgLy8gZGF0YSBvZiB0aGUgY3VycmVudCBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb24gc2Vzc2lvblxyXG4gIGN1cnJlbnQgOiBudWxsLFxyXG5cclxuICAvLyB0aGUgcHJldmlvdXMgSGFtbWVyLmdlc3R1cmUgc2Vzc2lvbiBkYXRhXHJcbiAgLy8gaXMgYSBmdWxsIGNsb25lIG9mIHRoZSBwcmV2aW91cyBnZXN0dXJlLmN1cnJlbnQgb2JqZWN0XHJcbiAgcHJldmlvdXM6IG51bGwsXHJcblxyXG4gIC8vIHdoZW4gdGhpcyBiZWNvbWVzIHRydWUsIG5vIGdlc3R1cmVzIGFyZSBmaXJlZFxyXG4gIHN0b3BwZWQgOiBmYWxzZSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHN0YXJ0IEhhbW1lci5nZXN0dXJlIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtIYW1tZXIuSW5zdGFuY2V9ICAgaW5zdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICAgICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgc3RhcnREZXRlY3Q6IGZ1bmN0aW9uIHN0YXJ0RGV0ZWN0KGluc3QsIGV2ZW50RGF0YSkge1xyXG4gICAgLy8gYWxyZWFkeSBidXN5IHdpdGggYSBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb24gb24gYW4gZWxlbWVudFxyXG4gICAgaWYodGhpcy5jdXJyZW50KSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnN0b3BwZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLmN1cnJlbnQgPSB7XHJcbiAgICAgIGluc3QgICAgICA6IGluc3QsIC8vIHJlZmVyZW5jZSB0byBIYW1tZXJJbnN0YW5jZSB3ZSdyZSB3b3JraW5nIGZvclxyXG4gICAgICBzdGFydEV2ZW50OiBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCBldmVudERhdGEpLCAvLyBzdGFydCBldmVudERhdGEgZm9yIGRpc3RhbmNlcywgdGltaW5nIGV0Y1xyXG4gICAgICBsYXN0RXZlbnQgOiBmYWxzZSwgLy8gbGFzdCBldmVudERhdGFcclxuICAgICAgbGFzdFZFdmVudDogZmFsc2UsIC8vIGxhc3QgZXZlbnREYXRhIGZvciB2ZWxvY2l0eS5cclxuICAgICAgdmVsb2NpdHkgIDogZmFsc2UsIC8vIGN1cnJlbnQgdmVsb2NpdHlcclxuICAgICAgbmFtZSAgICAgIDogJycgLy8gY3VycmVudCBnZXN0dXJlIHdlJ3JlIGluL2RldGVjdGVkLCBjYW4gYmUgJ3RhcCcsICdob2xkJyBldGNcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5kZXRlY3QoZXZlbnREYXRhKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgZGV0ZWN0OiBmdW5jdGlvbiBkZXRlY3QoZXZlbnREYXRhKSB7XHJcbiAgICBpZighdGhpcy5jdXJyZW50IHx8IHRoaXMuc3RvcHBlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0ZW5kIGV2ZW50IGRhdGEgd2l0aCBjYWxjdWxhdGlvbnMgYWJvdXQgc2NhbGUsIGRpc3RhbmNlIGV0Y1xyXG4gICAgZXZlbnREYXRhID0gdGhpcy5leHRlbmRFdmVudERhdGEoZXZlbnREYXRhKTtcclxuXHJcbiAgICAvLyBpbnN0YW5jZSBvcHRpb25zXHJcbiAgICB2YXIgaW5zdF9vcHRpb25zID0gdGhpcy5jdXJyZW50Lmluc3Qub3B0aW9ucztcclxuXHJcbiAgICAvLyBjYWxsIEhhbW1lci5nZXN0dXJlIGhhbmRsZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLmdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIC8vIG9ubHkgd2hlbiB0aGUgaW5zdGFuY2Ugb3B0aW9ucyBoYXZlIGVuYWJsZWQgdGhpcyBnZXN0dXJlXHJcbiAgICAgIGlmKCF0aGlzLnN0b3BwZWQgJiYgaW5zdF9vcHRpb25zW2dlc3R1cmUubmFtZV0gIT09IGZhbHNlKSB7XHJcbiAgICAgICAgLy8gaWYgYSBoYW5kbGVyIHJldHVybnMgZmFsc2UsIHdlIHN0b3Agd2l0aCB0aGUgZGV0ZWN0aW9uXHJcbiAgICAgICAgaWYoZ2VzdHVyZS5oYW5kbGVyLmNhbGwoZ2VzdHVyZSwgZXZlbnREYXRhLCB0aGlzLmN1cnJlbnQuaW5zdCkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICB0aGlzLnN0b3BEZXRlY3QoKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sIHRoaXMpO1xyXG5cclxuICAgIC8vIHN0b3JlIGFzIHByZXZpb3VzIGV2ZW50IGV2ZW50XHJcbiAgICBpZih0aGlzLmN1cnJlbnQpIHtcclxuICAgICAgdGhpcy5jdXJyZW50Lmxhc3RFdmVudCA9IGV2ZW50RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBlbmRldmVudCwgYnV0IG5vdCB0aGUgbGFzdCB0b3VjaCwgc28gZG9udCBzdG9wXHJcbiAgICBpZihldmVudERhdGEuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQgJiYgIWV2ZW50RGF0YS50b3VjaGVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgdGhpcy5zdG9wRGV0ZWN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGV2ZW50RGF0YTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2xlYXIgdGhlIEhhbW1lci5nZXN0dXJlIHZhcnNcclxuICAgKiB0aGlzIGlzIGNhbGxlZCBvbiBlbmREZXRlY3QsIGJ1dCBjYW4gYWxzbyBiZSB1c2VkIHdoZW4gYSBmaW5hbCBIYW1tZXIuZ2VzdHVyZSBoYXMgYmVlbiBkZXRlY3RlZFxyXG4gICAqIHRvIHN0b3Agb3RoZXIgSGFtbWVyLmdlc3R1cmVzIGZyb20gYmVpbmcgZmlyZWRcclxuICAgKi9cclxuICBzdG9wRGV0ZWN0OiBmdW5jdGlvbiBzdG9wRGV0ZWN0KCkge1xyXG4gICAgLy8gY2xvbmUgY3VycmVudCBkYXRhIHRvIHRoZSBzdG9yZSBhcyB0aGUgcHJldmlvdXMgZ2VzdHVyZVxyXG4gICAgLy8gdXNlZCBmb3IgdGhlIGRvdWJsZSB0YXAgZ2VzdHVyZSwgc2luY2UgdGhpcyBpcyBhbiBvdGhlciBnZXN0dXJlIGRldGVjdCBzZXNzaW9uXHJcbiAgICB0aGlzLnByZXZpb3VzID0gSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgdGhpcy5jdXJyZW50KTtcclxuXHJcbiAgICAvLyByZXNldCB0aGUgY3VycmVudFxyXG4gICAgdGhpcy5jdXJyZW50ID0gbnVsbDtcclxuXHJcbiAgICAvLyBzdG9wcGVkIVxyXG4gICAgdGhpcy5zdG9wcGVkID0gdHJ1ZTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZXh0ZW5kIGV2ZW50RGF0YSBmb3IgSGFtbWVyLmdlc3R1cmVzXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICBldlxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgZXZcclxuICAgKi9cclxuICBleHRlbmRFdmVudERhdGE6IGZ1bmN0aW9uIGV4dGVuZEV2ZW50RGF0YShldikge1xyXG4gICAgdmFyIHN0YXJ0RXYgPSB0aGlzLmN1cnJlbnQuc3RhcnRFdmVudCxcclxuICAgICAgICBsYXN0VkV2ID0gdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQ7XHJcblxyXG4gICAgLy8gaWYgdGhlIHRvdWNoZXMgY2hhbmdlLCBzZXQgdGhlIG5ldyB0b3VjaGVzIG92ZXIgdGhlIHN0YXJ0RXZlbnQgdG91Y2hlc1xyXG4gICAgLy8gdGhpcyBiZWNhdXNlIHRvdWNoZXZlbnRzIGRvbid0IGhhdmUgYWxsIHRoZSB0b3VjaGVzIG9uIHRvdWNoc3RhcnQsIG9yIHRoZVxyXG4gICAgLy8gdXNlciBtdXN0IHBsYWNlIGhpcyBmaW5nZXJzIGF0IHRoZSBFWEFDVCBzYW1lIHRpbWUgb24gdGhlIHNjcmVlbiwgd2hpY2ggaXMgbm90IHJlYWxpc3RpY1xyXG4gICAgLy8gYnV0LCBzb21ldGltZXMgaXQgaGFwcGVucyB0aGF0IGJvdGggZmluZ2VycyBhcmUgdG91Y2hpbmcgYXQgdGhlIEVYQUNUIHNhbWUgdGltZVxyXG4gICAgaWYoc3RhcnRFdiAmJiAoZXYudG91Y2hlcy5sZW5ndGggIT0gc3RhcnRFdi50b3VjaGVzLmxlbmd0aCB8fCBldi50b3VjaGVzID09PSBzdGFydEV2LnRvdWNoZXMpKSB7XHJcbiAgICAgIC8vIGV4dGVuZCAxIGxldmVsIGRlZXAgdG8gZ2V0IHRoZSB0b3VjaGxpc3Qgd2l0aCB0aGUgdG91Y2ggb2JqZWN0c1xyXG4gICAgICBzdGFydEV2LnRvdWNoZXMgPSBbXTtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goZXYudG91Y2hlcywgZnVuY3Rpb24odG91Y2gpIHtcclxuICAgICAgICBzdGFydEV2LnRvdWNoZXMucHVzaChIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCB0b3VjaCkpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZGVsdGFfdGltZSA9IGV2LnRpbWVTdGFtcCAtIHN0YXJ0RXYudGltZVN0YW1wXHJcbiAgICAgICwgZGVsdGFfeCA9IGV2LmNlbnRlci5wYWdlWCAtIHN0YXJ0RXYuY2VudGVyLnBhZ2VYXHJcbiAgICAgICwgZGVsdGFfeSA9IGV2LmNlbnRlci5wYWdlWSAtIHN0YXJ0RXYuY2VudGVyLnBhZ2VZXHJcbiAgICAgICwgaW50ZXJpbUFuZ2xlXHJcbiAgICAgICwgaW50ZXJpbURpcmVjdGlvblxyXG4gICAgICAsIHZlbG9jaXR5ID0gdGhpcy5jdXJyZW50LnZlbG9jaXR5O1xyXG5cclxuICAgIGlmIChsYXN0VkV2ICE9PSBmYWxzZSAmJiBldi50aW1lU3RhbXAgLSBsYXN0VkV2LnRpbWVTdGFtcCA+IEhhbW1lci5VUERBVEVfVkVMT0NJVFlfSU5URVJWQUwpIHtcclxuXHJcbiAgICAgICAgdmVsb2NpdHkgPSAgSGFtbWVyLnV0aWxzLmdldFZlbG9jaXR5KGV2LnRpbWVTdGFtcCAtIGxhc3RWRXYudGltZVN0YW1wLCBldi5jZW50ZXIucGFnZVggLSBsYXN0VkV2LmNlbnRlci5wYWdlWCwgZXYuY2VudGVyLnBhZ2VZIC0gbGFzdFZFdi5jZW50ZXIucGFnZVkpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudC5sYXN0VkV2ZW50ID0gZXY7XHJcblxyXG4gICAgICAgIGlmICh2ZWxvY2l0eS54ID4gMCAmJiB2ZWxvY2l0eS55ID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQudmVsb2NpdHkgPSB2ZWxvY2l0eTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmKHRoaXMuY3VycmVudC52ZWxvY2l0eSA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2ZWxvY2l0eSA9IEhhbW1lci51dGlscy5nZXRWZWxvY2l0eShkZWx0YV90aW1lLCBkZWx0YV94LCBkZWx0YV95KTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQudmVsb2NpdHkgPSB2ZWxvY2l0eTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQubGFzdFZFdmVudCA9IGV2O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVuZCBldmVudHMgKGUuZy4gZHJhZ2VuZCkgZG9uJ3QgaGF2ZSB1c2VmdWwgdmFsdWVzIGZvciBpbnRlcmltRGlyZWN0aW9uICYgaW50ZXJpbUFuZ2xlXHJcbiAgICAvLyBiZWNhdXNlIHRoZSBwcmV2aW91cyBldmVudCBoYXMgZXhhY3RseSB0aGUgc2FtZSBjb29yZGluYXRlc1xyXG4gICAgLy8gc28gZm9yIGVuZCBldmVudHMsIHRha2UgdGhlIHByZXZpb3VzIHZhbHVlcyBvZiBpbnRlcmltRGlyZWN0aW9uICYgaW50ZXJpbUFuZ2xlXHJcbiAgICAvLyBpbnN0ZWFkIG9mIHJlY2FsY3VsYXRpbmcgdGhlbSBhbmQgZ2V0dGluZyBhIHNwdXJpb3VzICcwJ1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09PSAnZW5kJykge1xyXG4gICAgICBpbnRlcmltQW5nbGUgPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIHRoaXMuY3VycmVudC5sYXN0RXZlbnQuaW50ZXJpbUFuZ2xlO1xyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiB0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmludGVyaW1EaXJlY3Rpb247XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgaW50ZXJpbUFuZ2xlID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiBIYW1tZXIudXRpbHMuZ2V0QW5nbGUodGhpcy5jdXJyZW50Lmxhc3RFdmVudC5jZW50ZXIsIGV2LmNlbnRlcik7XHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb24gPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIEhhbW1lci51dGlscy5nZXREaXJlY3Rpb24odGhpcy5jdXJyZW50Lmxhc3RFdmVudC5jZW50ZXIsIGV2LmNlbnRlcik7XHJcbiAgICB9XHJcblxyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZChldiwge1xyXG4gICAgICBkZWx0YVRpbWU6IGRlbHRhX3RpbWUsXHJcblxyXG4gICAgICBkZWx0YVg6IGRlbHRhX3gsXHJcbiAgICAgIGRlbHRhWTogZGVsdGFfeSxcclxuXHJcbiAgICAgIHZlbG9jaXR5WDogdmVsb2NpdHkueCxcclxuICAgICAgdmVsb2NpdHlZOiB2ZWxvY2l0eS55LFxyXG5cclxuICAgICAgZGlzdGFuY2U6IEhhbW1lci51dGlscy5nZXREaXN0YW5jZShzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuXHJcbiAgICAgIGFuZ2xlOiBIYW1tZXIudXRpbHMuZ2V0QW5nbGUoc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcbiAgICAgIGludGVyaW1BbmdsZTogaW50ZXJpbUFuZ2xlLFxyXG5cclxuICAgICAgZGlyZWN0aW9uOiBIYW1tZXIudXRpbHMuZ2V0RGlyZWN0aW9uKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uOiBpbnRlcmltRGlyZWN0aW9uLFxyXG5cclxuICAgICAgc2NhbGU6IEhhbW1lci51dGlscy5nZXRTY2FsZShzdGFydEV2LnRvdWNoZXMsIGV2LnRvdWNoZXMpLFxyXG4gICAgICByb3RhdGlvbjogSGFtbWVyLnV0aWxzLmdldFJvdGF0aW9uKHN0YXJ0RXYudG91Y2hlcywgZXYudG91Y2hlcyksXHJcblxyXG4gICAgICBzdGFydEV2ZW50OiBzdGFydEV2XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXY7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHJlZ2lzdGVyIG5ldyBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZ2VzdHVyZSBvYmplY3QsIHNlZSBnZXN0dXJlcy5qcyBmb3IgZG9jdW1lbnRhdGlvblxyXG4gICAqIEByZXR1cm5zIHtBcnJheX0gICAgIGdlc3R1cmVzXHJcbiAgICovXHJcbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uIHJlZ2lzdGVyKGdlc3R1cmUpIHtcclxuICAgIC8vIGFkZCBhbiBlbmFibGUgZ2VzdHVyZSBvcHRpb25zIGlmIHRoZXJlIGlzIG5vIGdpdmVuXHJcbiAgICB2YXIgb3B0aW9ucyA9IGdlc3R1cmUuZGVmYXVsdHMgfHwge307XHJcbiAgICBpZihvcHRpb25zW2dlc3R1cmUubmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBvcHRpb25zW2dlc3R1cmUubmFtZV0gPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dGVuZCBIYW1tZXIgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIEhhbW1lci5nZXN0dXJlIG9wdGlvbnNcclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoSGFtbWVyLmRlZmF1bHRzLCBvcHRpb25zLCB0cnVlKTtcclxuXHJcbiAgICAvLyBzZXQgaXRzIGluZGV4XHJcbiAgICBnZXN0dXJlLmluZGV4ID0gZ2VzdHVyZS5pbmRleCB8fCAxMDAwO1xyXG5cclxuICAgIC8vIGFkZCBIYW1tZXIuZ2VzdHVyZSB0byB0aGUgbGlzdFxyXG4gICAgdGhpcy5nZXN0dXJlcy5wdXNoKGdlc3R1cmUpO1xyXG5cclxuICAgIC8vIHNvcnQgdGhlIGxpc3QgYnkgaW5kZXhcclxuICAgIHRoaXMuZ2VzdHVyZXMuc29ydChmdW5jdGlvbihhLCBiKSB7XHJcbiAgICAgIGlmKGEuaW5kZXggPCBiLmluZGV4KSB7IHJldHVybiAtMTsgfVxyXG4gICAgICBpZihhLmluZGV4ID4gYi5pbmRleCkgeyByZXR1cm4gMTsgfVxyXG4gICAgICByZXR1cm4gMDtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmdlc3R1cmVzO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogRHJhZ1xyXG4gKiBNb3ZlIHdpdGggeCBmaW5nZXJzIChkZWZhdWx0IDEpIGFyb3VuZCBvbiB0aGUgcGFnZS4gQmxvY2tpbmcgdGhlIHNjcm9sbGluZyB3aGVuXHJcbiAqIG1vdmluZyBsZWZ0IGFuZCByaWdodCBpcyBhIGdvb2QgcHJhY3RpY2UuIFdoZW4gYWxsIHRoZSBkcmFnIGV2ZW50cyBhcmUgYmxvY2tpbmdcclxuICogeW91IGRpc2FibGUgc2Nyb2xsaW5nIG9uIHRoYXQgYXJlYS5cclxuICogQGV2ZW50cyAgZHJhZywgZHJhcGxlZnQsIGRyYWdyaWdodCwgZHJhZ3VwLCBkcmFnZG93blxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLkRyYWcgPSB7XHJcbiAgbmFtZSAgICAgOiAnZHJhZycsXHJcbiAgaW5kZXggICAgOiA1MCxcclxuICBkZWZhdWx0cyA6IHtcclxuICAgIGRyYWdfbWluX2Rpc3RhbmNlICAgICAgICAgICAgOiAxMCxcclxuXHJcbiAgICAvLyBTZXQgY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2UgdG8gdHJ1ZSB0byBtYWtlIHRoZSBzdGFydGluZyBwb2ludCBvZiB0aGUgZHJhZ1xyXG4gICAgLy8gYmUgY2FsY3VsYXRlZCBmcm9tIHdoZXJlIHRoZSBkcmFnIHdhcyB0cmlnZ2VyZWQsIG5vdCBmcm9tIHdoZXJlIHRoZSB0b3VjaCBzdGFydGVkLlxyXG4gICAgLy8gVXNlZnVsIHRvIGF2b2lkIGEgamVyay1zdGFydGluZyBkcmFnLCB3aGljaCBjYW4gbWFrZSBmaW5lLWFkanVzdG1lbnRzXHJcbiAgICAvLyB0aHJvdWdoIGRyYWdnaW5nIGRpZmZpY3VsdCwgYW5kIGJlIHZpc3VhbGx5IHVuYXBwZWFsaW5nLlxyXG4gICAgY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2U6IHRydWUsXHJcblxyXG4gICAgLy8gc2V0IDAgZm9yIHVubGltaXRlZCwgYnV0IHRoaXMgY2FuIGNvbmZsaWN0IHdpdGggdHJhbnNmb3JtXHJcbiAgICBkcmFnX21heF90b3VjaGVzICAgICAgICAgICAgIDogMSxcclxuXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgYnJvd3NlciBiZWhhdmlvciB3aGVuIGRyYWdnaW5nIG9jY3Vyc1xyXG4gICAgLy8gYmUgY2FyZWZ1bCB3aXRoIGl0LCBpdCBtYWtlcyB0aGUgZWxlbWVudCBhIGJsb2NraW5nIGVsZW1lbnRcclxuICAgIC8vIHdoZW4geW91IGFyZSB1c2luZyB0aGUgZHJhZyBnZXN0dXJlLCBpdCBpcyBhIGdvb2QgcHJhY3RpY2UgdG8gc2V0IHRoaXMgdHJ1ZVxyXG4gICAgZHJhZ19ibG9ja19ob3Jpem9udGFsICAgICAgICA6IGZhbHNlLFxyXG4gICAgZHJhZ19ibG9ja192ZXJ0aWNhbCAgICAgICAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRyYWdfbG9ja190b19heGlzIGtlZXBzIHRoZSBkcmFnIGdlc3R1cmUgb24gdGhlIGF4aXMgdGhhdCBpdCBzdGFydGVkIG9uLFxyXG4gICAgLy8gSXQgZGlzYWxsb3dzIHZlcnRpY2FsIGRpcmVjdGlvbnMgaWYgdGhlIGluaXRpYWwgZGlyZWN0aW9uIHdhcyBob3Jpem9udGFsLCBhbmQgdmljZSB2ZXJzYS5cclxuICAgIGRyYWdfbG9ja190b19heGlzICAgICAgICAgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkcmFnIGxvY2sgb25seSBraWNrcyBpbiB3aGVuIGRpc3RhbmNlID4gZHJhZ19sb2NrX21pbl9kaXN0YW5jZVxyXG4gICAgLy8gVGhpcyB3YXksIGxvY2tpbmcgb2NjdXJzIG9ubHkgd2hlbiB0aGUgZGlzdGFuY2UgaGFzIGJlY29tZSBsYXJnZSBlbm91Z2ggdG8gcmVsaWFibHkgZGV0ZXJtaW5lIHRoZSBkaXJlY3Rpb25cclxuICAgIGRyYWdfbG9ja19taW5fZGlzdGFuY2UgICAgICAgOiAyNVxyXG4gIH0sXHJcblxyXG4gIHRyaWdnZXJlZDogZmFsc2UsXHJcbiAgaGFuZGxlciAgOiBmdW5jdGlvbiBkcmFnR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgLy8gY3VycmVudCBnZXN0dXJlIGlzbnQgZHJhZywgYnV0IGRyYWdnZWQgaXMgdHJ1ZVxyXG4gICAgLy8gdGhpcyBtZWFucyBhbiBvdGhlciBnZXN0dXJlIGlzIGJ1c3kuIG5vdyBjYWxsIGRyYWdlbmRcclxuICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSAmJiB0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG1heCB0b3VjaGVzXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMuZHJhZ19tYXhfdG91Y2hlcyA+IDAgJiZcclxuICAgICAgZXYudG91Y2hlcy5sZW5ndGggPiBpbnN0Lm9wdGlvbnMuZHJhZ19tYXhfdG91Y2hlcykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICAgIGlmKGV2LmRpc3RhbmNlIDwgaW5zdC5vcHRpb25zLmRyYWdfbWluX2Rpc3RhbmNlICYmXHJcbiAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHdlIGFyZSBkcmFnZ2luZyFcclxuICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUpIHtcclxuICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG4gICAgICAgICAgaWYoaW5zdC5vcHRpb25zLmNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlICYmIGV2LmRpc3RhbmNlID4gMCkge1xyXG4gICAgICAgICAgICAvLyBXaGVuIGEgZHJhZyBpcyB0cmlnZ2VyZWQsIHNldCB0aGUgZXZlbnQgY2VudGVyIHRvIGRyYWdfbWluX2Rpc3RhbmNlIHBpeGVscyBmcm9tIHRoZSBvcmlnaW5hbCBldmVudCBjZW50ZXIuXHJcbiAgICAgICAgICAgIC8vIFdpdGhvdXQgdGhpcyBjb3JyZWN0aW9uLCB0aGUgZHJhZ2dlZCBkaXN0YW5jZSB3b3VsZCBqdW1wc3RhcnQgYXQgZHJhZ19taW5fZGlzdGFuY2UgcGl4ZWxzIGluc3RlYWQgb2YgYXQgMC5cclxuICAgICAgICAgICAgLy8gSXQgbWlnaHQgYmUgdXNlZnVsIHRvIHNhdmUgdGhlIG9yaWdpbmFsIHN0YXJ0IHBvaW50IHNvbWV3aGVyZVxyXG4gICAgICAgICAgICB2YXIgZmFjdG9yID0gTWF0aC5hYnMoaW5zdC5vcHRpb25zLmRyYWdfbWluX2Rpc3RhbmNlIC8gZXYuZGlzdGFuY2UpO1xyXG4gICAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQuc3RhcnRFdmVudC5jZW50ZXIucGFnZVggKz0gZXYuZGVsdGFYICogZmFjdG9yO1xyXG4gICAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQuc3RhcnRFdmVudC5jZW50ZXIucGFnZVkgKz0gZXYuZGVsdGFZICogZmFjdG9yO1xyXG5cclxuICAgICAgICAgICAgLy8gcmVjYWxjdWxhdGUgZXZlbnQgZGF0YSB1c2luZyBuZXcgc3RhcnQgcG9pbnRcclxuICAgICAgICAgICAgZXYgPSBIYW1tZXIuZGV0ZWN0aW9uLmV4dGVuZEV2ZW50RGF0YShldik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBsb2NrIGRyYWcgdG8gYXhpcz9cclxuICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubGFzdEV2ZW50LmRyYWdfbG9ja2VkX3RvX2F4aXMgfHwgKGluc3Qub3B0aW9ucy5kcmFnX2xvY2tfdG9fYXhpcyAmJiBpbnN0Lm9wdGlvbnMuZHJhZ19sb2NrX21pbl9kaXN0YW5jZSA8PSBldi5kaXN0YW5jZSkpIHtcclxuICAgICAgICAgIGV2LmRyYWdfbG9ja2VkX3RvX2F4aXMgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGFzdF9kaXJlY3Rpb24gPSBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubGFzdEV2ZW50LmRpcmVjdGlvbjtcclxuICAgICAgICBpZihldi5kcmFnX2xvY2tlZF90b19heGlzICYmIGxhc3RfZGlyZWN0aW9uICE9PSBldi5kaXJlY3Rpb24pIHtcclxuICAgICAgICAgIC8vIGtlZXAgZGlyZWN0aW9uIG9uIHRoZSBheGlzIHRoYXQgdGhlIGRyYWcgZ2VzdHVyZSBzdGFydGVkIG9uXHJcbiAgICAgICAgICBpZihIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChsYXN0X2RpcmVjdGlvbikpIHtcclxuICAgICAgICAgICAgZXYuZGlyZWN0aW9uID0gKGV2LmRlbHRhWSA8IDApID8gSGFtbWVyLkRJUkVDVElPTl9VUCA6IEhhbW1lci5ESVJFQ1RJT05fRE9XTjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBldi5kaXJlY3Rpb24gPSAoZXYuZGVsdGFYIDwgMCkgPyBIYW1tZXIuRElSRUNUSU9OX0xFRlQgOiBIYW1tZXIuRElSRUNUSU9OX1JJR0hUO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlyc3QgdGltZSwgdHJpZ2dlciBkcmFnc3RhcnQgZXZlbnRcclxuICAgICAgICBpZighdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnc3RhcnQnLCBldik7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIG5vcm1hbCBldmVudFxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuXHJcbiAgICAgICAgLy8gZGlyZWN0aW9uIGV2ZW50LCBsaWtlIGRyYWdkb3duXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArIGV2LmRpcmVjdGlvbiwgZXYpO1xyXG5cclxuICAgICAgICAvLyBibG9jayB0aGUgYnJvd3NlciBldmVudHNcclxuICAgICAgICBpZigoaW5zdC5vcHRpb25zLmRyYWdfYmxvY2tfdmVydGljYWwgJiYgSGFtbWVyLnV0aWxzLmlzVmVydGljYWwoZXYuZGlyZWN0aW9uKSkgfHxcclxuICAgICAgICAgIChpbnN0Lm9wdGlvbnMuZHJhZ19ibG9ja19ob3Jpem9udGFsICYmICFIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChldi5kaXJlY3Rpb24pKSkge1xyXG4gICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgLy8gdHJpZ2dlciBkcmFnZW5kXHJcbiAgICAgICAgaWYodGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogSG9sZFxyXG4gKiBUb3VjaCBzdGF5cyBhdCB0aGUgc2FtZSBwbGFjZSBmb3IgeCB0aW1lXHJcbiAqIEBldmVudHMgIGhvbGRcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Ib2xkID0ge1xyXG4gIG5hbWUgICAgOiAnaG9sZCcsXHJcbiAgaW5kZXggICA6IDEwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICBob2xkX3RpbWVvdXQgIDogNTAwLFxyXG4gICAgaG9sZF90aHJlc2hvbGQ6IDFcclxuICB9LFxyXG4gIHRpbWVyICAgOiBudWxsLFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiBob2xkR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICAvLyBjbGVhciBhbnkgcnVubmluZyB0aW1lcnNcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcblxyXG4gICAgICAgIC8vIHNldCB0aGUgZ2VzdHVyZSBzbyB3ZSBjYW4gY2hlY2sgaW4gdGhlIHRpbWVvdXQgaWYgaXQgc3RpbGwgaXNcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuXHJcbiAgICAgICAgLy8gc2V0IHRpbWVyIGFuZCBpZiBhZnRlciB0aGUgdGltZW91dCBpdCBzdGlsbCBpcyBob2xkLFxyXG4gICAgICAgIC8vIHdlIHRyaWdnZXIgdGhlIGhvbGQgZXZlbnRcclxuICAgICAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID09ICdob2xkJykge1xyXG4gICAgICAgICAgICBpbnN0LnRyaWdnZXIoJ2hvbGQnLCBldik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgaW5zdC5vcHRpb25zLmhvbGRfdGltZW91dCk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAvLyB3aGVuIHlvdSBtb3ZlIG9yIGVuZCB3ZSBjbGVhciB0aGUgdGltZXJcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICBpZihldi5kaXN0YW5jZSA+IGluc3Qub3B0aW9ucy5ob2xkX3RocmVzaG9sZCkge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbGVhc2VcclxuICogQ2FsbGVkIGFzIGxhc3QsIHRlbGxzIHRoZSB1c2VyIGhhcyByZWxlYXNlZCB0aGUgc2NyZWVuXHJcbiAqIEBldmVudHMgIHJlbGVhc2VcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5SZWxlYXNlID0ge1xyXG4gIG5hbWUgICA6ICdyZWxlYXNlJyxcclxuICBpbmRleCAgOiBJbmZpbml0eSxcclxuICBoYW5kbGVyOiBmdW5jdGlvbiByZWxlYXNlR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTd2lwZVxyXG4gKiB0cmlnZ2VycyBzd2lwZSBldmVudHMgd2hlbiB0aGUgZW5kIHZlbG9jaXR5IGlzIGFib3ZlIHRoZSB0aHJlc2hvbGRcclxuICogQGV2ZW50cyAgc3dpcGUsIHN3aXBlbGVmdCwgc3dpcGVyaWdodCwgc3dpcGV1cCwgc3dpcGVkb3duXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuU3dpcGUgPSB7XHJcbiAgbmFtZSAgICA6ICdzd2lwZScsXHJcbiAgaW5kZXggICA6IDQwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICAvLyBzZXQgMCBmb3IgdW5saW1pdGVkLCBidXQgdGhpcyBjYW4gY29uZmxpY3Qgd2l0aCB0cmFuc2Zvcm1cclxuICAgIHN3aXBlX21pbl90b3VjaGVzOiAxLFxyXG4gICAgc3dpcGVfbWF4X3RvdWNoZXM6IDEsXHJcbiAgICBzd2lwZV92ZWxvY2l0eSAgIDogMC43XHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gc3dpcGVHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAvLyBtYXggdG91Y2hlc1xyXG4gICAgICBpZihpbnN0Lm9wdGlvbnMuc3dpcGVfbWF4X3RvdWNoZXMgPiAwICYmXHJcbiAgICAgICAgZXYudG91Y2hlcy5sZW5ndGggPCBpbnN0Lm9wdGlvbnMuc3dpcGVfbWluX3RvdWNoZXMgJiZcclxuICAgICAgICBldi50b3VjaGVzLmxlbmd0aCA+IGluc3Qub3B0aW9ucy5zd2lwZV9tYXhfdG91Y2hlcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgIGlmKGV2LnZlbG9jaXR5WCA+IGluc3Qub3B0aW9ucy5zd2lwZV92ZWxvY2l0eSB8fFxyXG4gICAgICAgIGV2LnZlbG9jaXR5WSA+IGluc3Qub3B0aW9ucy5zd2lwZV92ZWxvY2l0eSkge1xyXG4gICAgICAgIC8vIHRyaWdnZXIgc3dpcGUgZXZlbnRzXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyBldi5kaXJlY3Rpb24sIGV2KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUYXAvRG91YmxlVGFwXHJcbiAqIFF1aWNrIHRvdWNoIGF0IGEgcGxhY2Ugb3IgZG91YmxlIGF0IHRoZSBzYW1lIHBsYWNlXHJcbiAqIEBldmVudHMgIHRhcCwgZG91YmxldGFwXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVGFwID0ge1xyXG4gIG5hbWUgICAgOiAndGFwJyxcclxuICBpbmRleCAgIDogMTAwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICB0YXBfbWF4X3RvdWNodGltZSA6IDI1MCxcclxuICAgIHRhcF9tYXhfZGlzdGFuY2UgIDogMTAsXHJcbiAgICB0YXBfYWx3YXlzICAgICAgICA6IHRydWUsXHJcbiAgICBkb3VibGV0YXBfZGlzdGFuY2U6IDIwLFxyXG4gICAgZG91YmxldGFwX2ludGVydmFsOiAzMDBcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiB0YXBHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX01PVkUgJiYgIUhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UpIHtcclxuICAgICAgLy9UcmFjayB0aGUgZGlzdGFuY2Ugd2UndmUgbW92ZWQuIElmIGl0J3MgYWJvdmUgdGhlIG1heCBPTkNFLCByZW1lbWJlciB0aGF0IChmaXhlcyAjNDA2KS5cclxuICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSA9IChldi5kaXN0YW5jZSA+IGluc3Qub3B0aW9ucy50YXBfbWF4X2Rpc3RhbmNlKTtcclxuICAgIH0gZWxzZSBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCAmJiBldi5zcmNFdmVudC50eXBlICE9ICd0b3VjaGNhbmNlbCcpIHtcclxuICAgICAgLy8gcHJldmlvdXMgZ2VzdHVyZSwgZm9yIHRoZSBkb3VibGUgdGFwIHNpbmNlIHRoZXNlIGFyZSB0d28gZGlmZmVyZW50IGdlc3R1cmUgZGV0ZWN0aW9uc1xyXG4gICAgICB2YXIgcHJldiA9IEhhbW1lci5kZXRlY3Rpb24ucHJldmlvdXMsXHJcbiAgICAgICAgZGlkX2RvdWJsZXRhcCA9IGZhbHNlO1xyXG5cclxuICAgICAgLy8gd2hlbiB0aGUgdG91Y2h0aW1lIGlzIGhpZ2hlciB0aGVuIHRoZSBtYXggdG91Y2ggdGltZVxyXG4gICAgICAvLyBvciB3aGVuIHRoZSBtb3ZpbmcgZGlzdGFuY2UgaXMgdG9vIG11Y2hcclxuICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSB8fCBldi5kZWx0YVRpbWUgPiBpbnN0Lm9wdGlvbnMudGFwX21heF90b3VjaHRpbWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGNoZWNrIGlmIGRvdWJsZSB0YXBcclxuICAgICAgaWYocHJldiAmJiBwcmV2Lm5hbWUgPT0gJ3RhcCcgJiZcclxuICAgICAgICAoZXYudGltZVN0YW1wIC0gcHJldi5sYXN0RXZlbnQudGltZVN0YW1wKSA8IGluc3Qub3B0aW9ucy5kb3VibGV0YXBfaW50ZXJ2YWwgJiZcclxuICAgICAgICBldi5kaXN0YW5jZSA8IGluc3Qub3B0aW9ucy5kb3VibGV0YXBfZGlzdGFuY2UpIHtcclxuICAgICAgICBpbnN0LnRyaWdnZXIoJ2RvdWJsZXRhcCcsIGV2KTtcclxuICAgICAgICBkaWRfZG91YmxldGFwID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZG8gYSBzaW5nbGUgdGFwXHJcbiAgICAgIGlmKCFkaWRfZG91YmxldGFwIHx8IGluc3Qub3B0aW9ucy50YXBfYWx3YXlzKSB7XHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSAndGFwJztcclxuICAgICAgICBpbnN0LnRyaWdnZXIoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUsIGV2KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUb3VjaFxyXG4gKiBDYWxsZWQgYXMgZmlyc3QsIHRlbGxzIHRoZSB1c2VyIGhhcyB0b3VjaGVkIHRoZSBzY3JlZW5cclxuICogQGV2ZW50cyAgdG91Y2hcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Ub3VjaCA9IHtcclxuICBuYW1lICAgIDogJ3RvdWNoJyxcclxuICBpbmRleCAgIDogLUluZmluaXR5LFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICAvLyBjYWxsIHByZXZlbnREZWZhdWx0IGF0IHRvdWNoc3RhcnQsIGFuZCBtYWtlcyB0aGUgZWxlbWVudCBibG9ja2luZyBieVxyXG4gICAgLy8gZGlzYWJsaW5nIHRoZSBzY3JvbGxpbmcgb2YgdGhlIHBhZ2UsIGJ1dCBpdCBpbXByb3ZlcyBnZXN0dXJlcyBsaWtlXHJcbiAgICAvLyB0cmFuc2Zvcm1pbmcgYW5kIGRyYWdnaW5nLlxyXG4gICAgLy8gYmUgY2FyZWZ1bCB3aXRoIHVzaW5nIHRoaXMsIGl0IGNhbiBiZSB2ZXJ5IGFubm95aW5nIGZvciB1c2VycyB0byBiZSBzdHVja1xyXG4gICAgLy8gb24gdGhlIHBhZ2VcclxuICAgIHByZXZlbnRfZGVmYXVsdCAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRpc2FibGUgbW91c2UgZXZlbnRzLCBzbyBvbmx5IHRvdWNoIChvciBwZW4hKSBpbnB1dCB0cmlnZ2VycyBldmVudHNcclxuICAgIHByZXZlbnRfbW91c2VldmVudHM6IGZhbHNlXHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gdG91Y2hHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihpbnN0Lm9wdGlvbnMucHJldmVudF9tb3VzZWV2ZW50cyAmJiBldi5wb2ludGVyVHlwZSA9PSBIYW1tZXIuUE9JTlRFUl9NT1VTRSkge1xyXG4gICAgICBldi5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMucHJldmVudF9kZWZhdWx0KSB7XHJcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9TVEFSVCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBUcmFuc2Zvcm1cclxuICogVXNlciB3YW50IHRvIHNjYWxlIG9yIHJvdGF0ZSB3aXRoIDIgZmluZ2Vyc1xyXG4gKiBAZXZlbnRzICB0cmFuc2Zvcm0sIHBpbmNoLCBwaW5jaGluLCBwaW5jaG91dCwgcm90YXRlXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVHJhbnNmb3JtID0ge1xyXG4gIG5hbWUgICAgIDogJ3RyYW5zZm9ybScsXHJcbiAgaW5kZXggICAgOiA0NSxcclxuICBkZWZhdWx0cyA6IHtcclxuICAgIC8vIGZhY3Rvciwgbm8gc2NhbGUgaXMgMSwgem9vbWluIGlzIHRvIDAgYW5kIHpvb21vdXQgdW50aWwgaGlnaGVyIHRoZW4gMVxyXG4gICAgdHJhbnNmb3JtX21pbl9zY2FsZSAgIDogMC4wMSxcclxuICAgIC8vIHJvdGF0aW9uIGluIGRlZ3JlZXNcclxuICAgIHRyYW5zZm9ybV9taW5fcm90YXRpb246IDEsXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgYnJvd3NlciBiZWhhdmlvciB3aGVuIHR3byB0b3VjaGVzIGFyZSBvbiB0aGUgc2NyZWVuXHJcbiAgICAvLyBidXQgaXQgbWFrZXMgdGhlIGVsZW1lbnQgYSBibG9ja2luZyBlbGVtZW50XHJcbiAgICAvLyB3aGVuIHlvdSBhcmUgdXNpbmcgdGhlIHRyYW5zZm9ybSBnZXN0dXJlLCBpdCBpcyBhIGdvb2QgcHJhY3RpY2UgdG8gc2V0IHRoaXMgdHJ1ZVxyXG4gICAgdHJhbnNmb3JtX2Fsd2F5c19ibG9jazogZmFsc2VcclxuICB9LFxyXG4gIHRyaWdnZXJlZDogZmFsc2UsXHJcbiAgaGFuZGxlciAgOiBmdW5jdGlvbiB0cmFuc2Zvcm1HZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICAvLyBjdXJyZW50IGdlc3R1cmUgaXNudCBkcmFnLCBidXQgZHJhZ2dlZCBpcyB0cnVlXHJcbiAgICAvLyB0aGlzIG1lYW5zIGFuIG90aGVyIGdlc3R1cmUgaXMgYnVzeS4gbm93IGNhbGwgZHJhZ2VuZFxyXG4gICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lICYmIHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYXRsZWFzdCBtdWx0aXRvdWNoXHJcbiAgICBpZihldi50b3VjaGVzLmxlbmd0aCA8IDIpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCB3aGVuIHR3byBmaW5nZXJzIGFyZSBvbiB0aGUgc2NyZWVuXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX2Fsd2F5c19ibG9jaykge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgdmFyIHNjYWxlX3RocmVzaG9sZCA9IE1hdGguYWJzKDEgLSBldi5zY2FsZSk7XHJcbiAgICAgICAgdmFyIHJvdGF0aW9uX3RocmVzaG9sZCA9IE1hdGguYWJzKGV2LnJvdGF0aW9uKTtcclxuXHJcbiAgICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgICBpZihzY2FsZV90aHJlc2hvbGQgPCBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9zY2FsZSAmJlxyXG4gICAgICAgICAgcm90YXRpb25fdGhyZXNob2xkIDwgaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fcm90YXRpb24pIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHdlIGFyZSB0cmFuc2Zvcm1pbmchXHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcblxyXG4gICAgICAgIC8vIGZpcnN0IHRpbWUsIHRyaWdnZXIgZHJhZ3N0YXJ0IGV2ZW50XHJcbiAgICAgICAgaWYoIXRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ3N0YXJ0JywgZXYpO1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpOyAvLyBiYXNpYyB0cmFuc2Zvcm0gZXZlbnRcclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciByb3RhdGUgZXZlbnRcclxuICAgICAgICBpZihyb3RhdGlvbl90aHJlc2hvbGQgPiBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9yb3RhdGlvbikge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdyb3RhdGUnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHBpbmNoIGV2ZW50XHJcbiAgICAgICAgaWYoc2NhbGVfdGhyZXNob2xkID4gaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fc2NhbGUpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncGluY2gnLCBldik7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3BpbmNoJyArICgoZXYuc2NhbGUgPCAxKSA/ICdpbicgOiAnb3V0JyksIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgLy8gdHJpZ2dlciBkcmFnZW5kXHJcbiAgICAgICAgaWYodGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4gIC8vIEJhc2VkIG9mZiBMby1EYXNoJ3MgZXhjZWxsZW50IFVNRCB3cmFwcGVyIChzbGlnaHRseSBtb2RpZmllZCkgLSBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL2xvZGFzaC5qcyNMNTUxNS1MNTU0M1xyXG4gIC8vIHNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XHJcbiAgaWYodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIGRlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlXHJcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBIYW1tZXI7IH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gY2hlY2sgZm9yIGBleHBvcnRzYCBhZnRlciBgZGVmaW5lYCBpbiBjYXNlIGEgYnVpbGQgb3B0aW1pemVyIGFkZHMgYW4gYGV4cG9ydHNgIG9iamVjdFxyXG4gIGVsc2UgaWYodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gSGFtbWVyO1xyXG4gIH1cclxuXHJcbiAgZWxzZSB7XHJcbiAgICB3aW5kb3cuSGFtbWVyID0gSGFtbWVyO1xyXG4gIH1cclxuXHJcbn0pKHdpbmRvdyk7XHJcblxyXG4vKiEgalF1ZXJ5IHBsdWdpbiBmb3IgSGFtbWVyLkpTIC0gdjEuMC4xIC0gMjAxNC0wMi0wM1xyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgSm9yaWsgVGFuZ2VsZGVyIDxqLnRhbmdlbGRlckBnbWFpbC5jb20+O1xyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgKi8oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBzZXR1cChIYW1tZXIsICQpIHtcclxuICAvKipcclxuICAgKiBiaW5kIGRvbSBldmVudHNcclxuICAgKiB0aGlzIG92ZXJ3cml0ZXMgYWRkRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZXNcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIEhhbW1lci5ldmVudC5iaW5kRG9tID0gZnVuY3Rpb24oZWxlbWVudCwgZXZlbnRUeXBlcywgaGFuZGxlcikge1xyXG4gICAgJChlbGVtZW50KS5vbihldmVudFR5cGVzLCBmdW5jdGlvbihldikge1xyXG4gICAgICB2YXIgZGF0YSA9IGV2Lm9yaWdpbmFsRXZlbnQgfHwgZXY7XHJcblxyXG4gICAgICBpZihkYXRhLnBhZ2VYID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkYXRhLnBhZ2VYID0gZXYucGFnZVg7XHJcbiAgICAgICAgZGF0YS5wYWdlWSA9IGV2LnBhZ2VZO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS50YXJnZXQpIHtcclxuICAgICAgICBkYXRhLnRhcmdldCA9IGV2LnRhcmdldDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoZGF0YS53aGljaCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZGF0YS53aGljaCA9IGRhdGEuYnV0dG9uO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS5wcmV2ZW50RGVmYXVsdCkge1xyXG4gICAgICAgIGRhdGEucHJldmVudERlZmF1bHQgPSBldi5wcmV2ZW50RGVmYXVsdDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgZGF0YS5zdG9wUHJvcGFnYXRpb24gPSBldi5zdG9wUHJvcGFnYXRpb247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBkYXRhKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIHRoZSBtZXRob2RzIGFyZSBjYWxsZWQgYnkgdGhlIGluc3RhbmNlLCBidXQgd2l0aCB0aGUganF1ZXJ5IHBsdWdpblxyXG4gICAqIHdlIHVzZSB0aGUganF1ZXJ5IGV2ZW50IG1ldGhvZHMgaW5zdGVhZC5cclxuICAgKiBAdGhpcyAgICB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICByZXR1cm4gJCh0aGlzLmVsZW1lbnQpLm9uKHR5cGVzLCBoYW5kbGVyKTtcclxuICB9O1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZXMsIGhhbmRsZXIpIHtcclxuICAgIHJldHVybiAkKHRoaXMuZWxlbWVudCkub2ZmKHR5cGVzLCBoYW5kbGVyKTtcclxuICB9O1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdHJpZ2dlciBldmVudHNcclxuICAgKiB0aGlzIGlzIGNhbGxlZCBieSB0aGUgZ2VzdHVyZXMgdG8gdHJpZ2dlciBhbiBldmVudCBsaWtlICd0YXAnXHJcbiAgICogQHRoaXMgICAge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZlbnREYXRhXHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihnZXN0dXJlLCBldmVudERhdGEpIHtcclxuICAgIHZhciBlbCA9ICQodGhpcy5lbGVtZW50KTtcclxuICAgIGlmKGVsLmhhcyhldmVudERhdGEudGFyZ2V0KS5sZW5ndGgpIHtcclxuICAgICAgZWwgPSAkKGV2ZW50RGF0YS50YXJnZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbC50cmlnZ2VyKHtcclxuICAgICAgdHlwZSAgIDogZ2VzdHVyZSxcclxuICAgICAgZ2VzdHVyZTogZXZlbnREYXRhXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogalF1ZXJ5IHBsdWdpblxyXG4gICAqIGNyZWF0ZSBpbnN0YW5jZSBvZiBIYW1tZXIgYW5kIHdhdGNoIGZvciBnZXN0dXJlcyxcclxuICAgKiBhbmQgd2hlbiBjYWxsZWQgYWdhaW4geW91IGNhbiBjaGFuZ2UgdGhlIG9wdGlvbnNcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBbb3B0aW9ucz17fV1cclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gICQuZm4uaGFtbWVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIGVsID0gJCh0aGlzKTtcclxuICAgICAgdmFyIGluc3QgPSBlbC5kYXRhKCdoYW1tZXInKTtcclxuICAgICAgLy8gc3RhcnQgbmV3IGhhbW1lciBpbnN0YW5jZVxyXG4gICAgICBpZighaW5zdCkge1xyXG4gICAgICAgIGVsLmRhdGEoJ2hhbW1lcicsIG5ldyBIYW1tZXIodGhpcywgb3B0aW9ucyB8fCB7fSkpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIGNoYW5nZSB0aGUgb3B0aW9uc1xyXG4gICAgICBlbHNlIGlmKGluc3QgJiYgb3B0aW9ucykge1xyXG4gICAgICAgIEhhbW1lci51dGlscy5leHRlbmQoaW5zdC5vcHRpb25zLCBvcHRpb25zKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfTtcclxufVxyXG5cclxuICAvLyBCYXNlZCBvZmYgTG8tRGFzaCdzIGV4Y2VsbGVudCBVTUQgd3JhcHBlciAoc2xpZ2h0bHkgbW9kaWZpZWQpIC0gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9sb2Rhc2guanMjTDU1MTUtTDU1NDNcclxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnMgbGlrZSB0aGUgZm9sbG93aW5nOlxyXG4gIGlmKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZVxyXG4gICAgZGVmaW5lKFsnaGFtbWVyanMnLCAnanF1ZXJ5J10sIHNldHVwKTtcclxuXHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgc2V0dXAod2luZG93LkhhbW1lciwgd2luZG93LmpRdWVyeSB8fCB3aW5kb3cuWmVwdG8pO1xyXG4gIH1cclxufSkod2luZG93KTsiXX0=
;