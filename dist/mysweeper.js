;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

var Gameboard = require('./gameboard'),
    Modes = require('./constants').Modes,
    PresetLevels = require('./constants').PresetLevels,
    PresetSetups = require('./constants').PresetSetups,
    DimValidator = require('./validators').BoardDimensions,
    MineValidator = require('./validators').MineCount,
    DEFAULT_CONFIG = require('./constants').DefaultConfig,
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

    $(document.body).addClass(DEFAULT_CONFIG.theme.toLowerCase());

    var $possibleMines = $("#mine-count").siblings(".advice").find("span"),
        PRESET_PANEL_SELECTOR = "ul.preset > li:not(:has(label[for$='-mode']))",
        CUSTOM_PANEL_SELECTOR = "ul.custom > li:not(:has(label[for$='-mode']))";

    // setting initial value
    $possibleMines.html(mineableSpaces($("#dimensions").attr("placeholder")));
    $("#dimensions").siblings(".advice").find("span").html(MAX_GRID_DIMENSIONS + " x " + MAX_GRID_DIMENSIONS);

    $("#preset-mode").on('click', function() { enableOption($(PRESET_PANEL_SELECTOR)); disableOption($(CUSTOM_PANEL_SELECTOR)); }).click();
    $("#custom-mode").on('click', function() { enableOption($(CUSTOM_PANEL_SELECTOR)); disableOption($(PRESET_PANEL_SELECTOR)); $("#dimensions").focus(); });

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
                console.warn("Error: %o", e);

                $("#validation-warnings").html(e.message).show();
                return false;
            }
            // set the desired color theme...
            gameOptions.theme = $("#color-theme").val();
        }

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
},{"./constants":3,"./gameboard":7,"./validators":23}],2:[function(require,module,exports){
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
    // for calculating clock, defaults
    // to 1.25s for every mined square
    TIME_AVG_ALLOC_PER_OPEN_SQUARE: 1.25,

    DefaultConfig: {
        dimensions: 9,
        mines: 1,
        board: '#board',
        isCountdown: true,
        debug_mode: true, /*false*/
        theme: 'LIGHT'
    },

    Symbols: { CLOSED: 'x', OPEN: '_', FLAGGED: 'f', MINED: '*' },

    Flags:  { OPEN: 'F_OPEN', MINED: 'F_MINED', FLAGGED: 'F_FLAGGED', INDEXED: 'F_INDEXED' },

    Glyphs: { FLAG: 'x', MINE: 'Ä' },

    Modes: { PRESET: "P", CUSTOM: "C" },

    PresetLevels: { BEGINNER: "B", INTERMEDIATE: "I", EXPERT: "E" },

    PresetSetups: {
        BEGINNER:       { dimensions:  9, mines:  9, timer:  90 },
        INTERMEDIATE:   { dimensions: 12, mines: 21, timer: 150 },
        EXPERT:         { dimensions: 15, mines: 67, timer: 200 }
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

var Flippable = require('./lib/flippable');

function Countdown(el) {
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);
    this.$el = $(el);

    this.$m1 = this.$el.find('#m1');
    this.$m2 = this.$el.find('#m2');
    this.$s1 = this.$el.find('#s1');
    this.$s2 = this.$el.find('#s2');
}

Countdown.prototype = {
    constructor: Countdown,
    _increment: function(chips) {
        chips.forEach(function(chip) { this._flip(chip[0], chip[1]); }, this);
    },
    update: function(mins, secs) {
        var m = String(mins),
            s = String(secs),
            times = [m, s].map(function(x) {
                var arr = String(x).split('');
                if (arr.length < 2)
                    arr.unshift('0');
                return arr;
            });

        this._increment([
            [this.$s2, times[1][1]],
            [this.$s1, times[1][0]],
            [this.$m2, times[0][1]],
            [this.$m1, times[0][0]]
        ]);
    }
};

Flippable().call(Countdown.prototype);

module.exports = Countdown;
},{"./lib/flippable":10}],5:[function(require,module,exports){
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
  // Error.captureStackTrace(this, arguments.callee);
  this.stack = Error().stack;
}
MysweeperError.prototype = new Error();
MysweeperError.prototype.constructor = MysweeperError;
MysweeperError.prototype.getTrace = function() { return this.stack.replace(/↵\s+/g, '\n  '); };
MysweeperError.prototype.name = 'MysweeperError';

/*  -------------------------------------------------------------------------------------------  */

function ValidationError() {
  MysweeperError.apply(this, arguments);
}
ValidationError.prototype = new MysweeperError();
ValidationError.prototype.constructor = ValidationError;
ValidationError.prototype.name = 'ValidationError';

function ScoreEventHandlerMissingError() {
  MysweeperError.apply(this, arguments);
}
ScoreEventHandlerMissingError.prototype = new MysweeperError();
ScoreEventHandlerMissingError.prototype.constructor = ScoreEventHandlerMissingError;
ScoreEventHandlerMissingError.prototype.name = 'ScoreEventHandlerMissingError';


module.exports.MysweeperError = MysweeperError;
module.exports.ValidationError = ValidationError;
module.exports.ScoreEventHandlerMissingError = ScoreEventHandlerMissingError;
},{}],7:[function(require,module,exports){
"use strict;"

var Multimap = require('./lib/multimap'),
    DangerCalculator = require('./danger-calculator'),
    Square = require('./square'),
    Serializer = require('./serializer'),
    Glyphs = require('./constants').Glyphs,
    MessageOverlay = require('./constants').MessageOverlay,
    DEFAULT_GAME_OPTIONS = require('./constants').DefaultConfig,
    TIME_AVG_ALLOC_PER_OPEN_SQUARE = require('./constants').TIME_AVG_ALLOC_PER_OPEN_SQUARE,
    RGX_MOBILE_DEVICES = require('./constants').MobileDeviceRegex,
    VERSION = require('./constants').VERSION,
    Timer = require('./timer'),
    Countdown = require('./countdown'),
    MinesDisplay = require('./mines-display'),
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
    // the display object for the number of mines
    this.minesDisplay = new MinesDisplay(this.mines, "#mines-display");
    // display the current version of the game:
    $(".version").html(VERSION);
    // add in the countdown clock...
    this.clock = new Timer(0, +options.timer || this._determineTimer(),
        options.isCountdown || DEFAULT_GAME_OPTIONS.isCountdown, this.emitter);
    this.countdown = new Countdown("#countdown");
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
    this.clock.start();
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
            grid += "<tr id='row" + i + "' class='-row'>"
                 +  [].join.call({ length: dimensions + 1 }, "<td></td>")
                 +  "</tr>";
        }
        this.$el.append(grid);
    },
    _setColorTheme: function(theme) {
        ThemeStyler.set(theme, this.$el);
        return theme;
    },
    _determineTimer: function() { return TIME_AVG_ALLOC_PER_OPEN_SQUARE * (Math.pow(this.dimensions, 2) - this.mines); },
    _checkForMobile: function() { return RGX_MOBILE_DEVICES.test(navigator.userAgent.toLowerCase()); },
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
        /*this.emitter.on('sq:open', function(square, cell) { $log("Opening square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:flag', function(square, cell) { $log("Flagging square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:unflag', function(square, cell) { $log("Unflagging square at (%o, %o).", square.getRow(), square.getCell()); });*/
        // GAMEBOARD-WIDE EVENTS
        this.emitter.on('gb:start', function(ename, gameboard, $el) { $log("Let the game begin!", arguments); });
        this.emitter.on('gb:end:win', function(ename, gameboard, $el) { $log("Game over! You win!"); });
        this.emitter.on('gb:end:over', function(ename, gameboard, $el) { $log("Game over! You're dead!"); });
        this.emitter.on('gb:end:timedout', function(ename, gameboard, $el) { $log("Game over! You're outta time!"); });

        // --- THESE EVENTS ARE FOR REAL, TO STAY!
        var _this = this;
        // wires up the scoreboard view object to the events received from the scorekeeper
        this.emitter.on('score:change score:change:final', function() { _this.scoreboard.update(_this.scorekeeper.score); });
        this.emitter.on('timer:start timer:stop timer:change timer:reset timer:end', function(mins, secs) { _this.countdown.update(mins, secs); });
        this.emitter.on('timer:end', function() { _this._gameTimedOut(); });
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

        // as a courtesy to the user, their first click
        // will never be mined (can't lose game on first user move)
        if (square.isMined() && this.userMoves === 0) {
            this.getSquares().forEach(function(sq) { sq.unmine(); });
            this._determineMineLocations(this.dimensions, this.mines);
            this._precalcDangerIndices();
            this.render();
            if (this.debug_mode) {
                this.toConsole();
                this.toConsole(true);
            }
        }

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
    _gameEndMsg: function(msg, isAlert) {
        var REPLAY_LINK = "<a href='#' class='replay'>Click here to play again...</a>";
        this._flashMsg("<span>" + msg + "</span>" + REPLAY_LINK, isAlert);
    },
    _prepareFinalReveal: function() {
        var _this = this;
        // for all flagged squares, remove flag icon
        // and replace with original danger index instead
        // for when it's opened
        this.getSquares()
            .filter(function(sq) { return sq.isFlagged(); })
            .forEach(function(f) {
                _this.getGridCell(f).find('.danger').html(f.getDanger());
                _this._unflagSquare(f, false);
            });
        // open/reveal all squares
        this.$el
            .find('.square')
            .removeClass('closed flagged')
            .addClass('open');
        this._removeEventListeners();
        this.clock.stop();
        this.scorekeeper.close();
    },
    _gameWin: function () {
        this._prepareFinalReveal();
        this.$el.addClass('game-win');
        $log("---  GAME WIN!  ---");
        $log("User moves: %o", this.userMoves)
        this._gameEndMsg("Game Over! You win!");
        this.emitter.trigger('gb:end:win', this.board, this.$el.selector);
    },
    _gameOver: function() {
        this._prepareFinalReveal();
        this.$el.addClass('game-over');
        // put up 'Game Over' banner
        $log('---  GAME OVER!  ---');
        this._gameEndMsg("Game Over!", true);
        this.emitter.trigger('gb:end:over', this.board, this.$el.selector);
    },
    _gameTimedOut: function() {
        this._prepareFinalReveal();
        this.$el.addClass('game-timedout');
        // put up 'Game Over' banner
        $log('---  GAME OVER!  ---');
        this._gameEndMsg("Game Over! You're out of time!", true);
        this.emitter.trigger('gb:end:timedout', this.board, this.$el.selector);
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
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":12,"./minelayer":13,"./mines-display":14,"./scoreboard":15,"./scorekeeper":16,"./serializer":17,"./square":18,"./theme-styler":19,"./timer":20,"./transcribing-emitter":21,"./transcription-strategy":22}],8:[function(require,module,exports){
"use strict;"

// @usage var BitFlags = new BitFlagFactory(['F_OPEN', 'F_MINED', 'F_FLAGGED', 'F_INDEXED']); bf = new BitFlags;
function BitFlagFactory(args) {

    var binToDec = function(str) { return parseInt(str, 2); },
        decToBin = function(num) { return num.toString(2); },
        buildState = function(arr) { return pad(arr.map(function(param) { return String(+param); }).reverse().join('')); },
        pad = function (str, max) {
          for (var acc=[], max = max || 4, diff = max - str.length; diff > 0; acc[--diff] = '0');
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

var Flippable = function(settings) {
    if (!(this instanceof Flippable))
        return new Flippable(settings);

    var options = { duration: 0, wrapper: 'span' };
    for (var s in settings)
        if (settings.hasOwnProperty(s))
            options[s] = settings[s];

    var nodeNameToTag = function(node) { return "<" + node + " />"; },
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
            return (str = String(str).toLowerCase(), str && !!~tags.indexOf(str)) ? str : 'span';
        };

    return function() {
        this._flipDuration = +options.duration,
        this._flipWrapper = verifyDOMNode(options.wrapper);

        this._flip = function($el, content) {
            if ($el.html() !== content) {
                $el
                    .wrapInner($(nodeNameToTag(this._flipWrapper)))
                    .find(this._flipWrapper)
                    .delay(this._flipDuration)
                    .slideUp(this._flipDuration, function() { $(this).parent().html(content) });
            }
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

Object.defineProperties(Multimap.prototype, {
    get: { value: function(row) { return this._table[row]; }},
    set: { value: function(row, val) { (this._table[row] || (this._table[row] = [])).push(val); }},
    forEach: { value: function(fn) { return [].forEach.call(this.values(), fn); }},
    values: { value: function() {
        var _this = this;
        return Object.keys(this._table)
                     .map(function(row) { return _this._table[row]; })
                     .reduce(function(acc, item) { return acc.concat(item); }, []);
    }},
    clear: { value: function() { this._table = {}; }},
    size: { value: function() { return Object.keys(this._table).length; }}
});

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

var Flippable = require('./lib/flippable');

function MinesDisplay(mines, el) {
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);
    this.$el = $(el);
    this.mines = mines;

    this.$L = this.$el.find('.minecounter').eq(0);
    this.$M = this.$el.find('.minecounter').eq(1);
    this.$R = this.$el.find('.minecounter').eq(2);

    this.render();
}

MinesDisplay.prototype = {
    constructor: MinesDisplay,
    _increment: function(chips) { chips.forEach(function(chip) { this._flip(chip[0], chip[1]); }, this); },
    render: function() {
        var arr = String(this.mines).split('');
        while (arr.length < 3)
            arr.unshift('0');
        this._increment([
            [this.$R, arr[2]],
            [this.$M, arr[1]],
            [this.$L, arr[0]]
        ]);
    }
};

Flippable().call(MinesDisplay.prototype);

module.exports = MinesDisplay;
},{"./lib/flippable":10}],15:[function(require,module,exports){
"use strict;"

var FX_DURATION = require('./constants').Scoreboard.FX_DURATION,
    DIGITS_MAX = require('./constants').Scoreboard.DIGITS,
    OUT_OF_RANGE = require('./constants').Scoreboard.OUT_OF_RANGE,
    Flippable = require('./lib/flippable');

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
        chips.forEach(function(chip) { this._flip(chip[0], chip[1]); }, this);
    },
    update: function(points) {
        if (!points) return;
        var pts = toStringArray(points);
        this._increment([[this.$R, pts[2]], [this.$M, pts[1]], [this.$L, pts[0]]]);
    }
};

Flippable({ duration: FX_DURATION }).call(Scoreboard.prototype);

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
},{"./constants":3,"./lib/flippable":10}],16:[function(require,module,exports){
"use strict;"

var Points = require('./constants').ScoringRules,
    ScoreEventHandlerMissingError = require('./errors').ScoreEventHandlerMissingError;

function Scorekeeper(gameboard) {


  this.callbacks = {
    up: function(pts) {
      this.score += pos(pts);
      this.emitter.trigger("score:change", this.score);
    },
    down: function(pts) {
      this.score = (this.score - neg(pts) <= 0) ? 0 : this.score - neg(pts);
      this.emitter.trigger("score:change", this.score);
    }
  };

  this.finalizers = {
    forOpeningSquares: function(gameboard) {
        var moves = gameboard.userMoves,
            unmined = Math.pow(gameboard.dimensions, 2) - gameboard.mines;
        return 1 - (~~(moves / unmined) * 10);
    },
    forTimePassed: function(gameboard) {
        var total = gameboard.clock.max, elapsed = gameboard.clock.seconds;
        return 100 - ~~(elapsed / total * 100);
    },
    forFewestMoves: function(gameboard) {
        // experimental: sqrt(x^2 - y) * 10
        var dims = Math.pow(gameboard.dimensions, 2);
        return ~~(Math.sqrt(dims - gameboard.userMoves) * Points.USERMOVES_MULTIPLIER);
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
  this.timer = setInterval(this._tick.bind(this), this.nsu);

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
                      this.up(Points.BLANK_SQUARE_PTS);
                  },
        'sq:flag': function(square, cell) {
                    if (square.isMined())
                      this.deferredUp(Points.FLAG_MINED);
                    else
                      this.deferredDown(Points.MISFLAG_UNMINED + (square.getDanger() || 0));
                  },
        'sq:unflag': function(square, cell) {
                    if (square.isMined())
                      this.deferredDown(Points.UNFLAG_MINED);
                    else
                      this.deferredUp(Points.MISUNFLAG_MINED);
                  },
        'gb:start': function(ename, gameboard, $el) { this.endGame = false; },
        'gb:end:win': function(ename, gameboard, $el) { this.endGame = true; },
        'gb:end:over': function(ename, gameboard, $el) { this.endGame = true; },
        'gb:end:timedout': function(ename, gameboard, $el) { this.endGame = true; }
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
                : console.log("<deferred score event: %o> :old => [%o]", event.type, this.score),
                  fn.call(this, event.pts),
                  console.log("...:new => [%o]", this.score);
        else
            return new ScoreEventHandlerMissingError("Scorekeeper could not find function {0}", event.type);

        this.emitter.trigger("score:change", this.score);
    },
    _processFinalizers: function() {
        for (var visitor in this.finalizers) {
            console.log("<finalizer: %o> :old [%o] => :new [%o]... ", visitor, this.score, (this.score += this.finalizers[visitor](this.gameboard)));
            // this.score += visitor(this.gameboard);
        }
        this.final.forEach(function(f) { this.score += f; }, this);
        // final update of the score
        this.emitter.trigger("score:change:final", this.score);
    },
    _tick: function() {
        var currIdx = this._binarySearch({ time: new Date().getTime() }), index = 0;
        while (index < currIdx) {
            var callback = function() { this._processEvent(this.queue[index]); return index += 1; }.bind(this);
            callback();
        }
        return this.queue.splice(0, currIdx);
    },
    _addScoreToQueue: function(type, pts) { return this._enqueue({ time: ((+new Date) + this.nsu), type: type, pts: pts }); },

    up: function(pts) { this.callbacks.up.call(this, pts); },
    down: function(pts) { this.callbacks.down.call(this, pts); },

    deferredUp: function(pts) { this._addScoreToQueue("up", pos(pts)); },
    deferredDown: function(pts) { this._addScoreToQueue("down", neg(pts)); },

    finalUp: function(pts) { this.final.push(pos(pts)); },
    finalDown: function(pts) { this.final.push(neg(pts)); },

    getPendingScoreCount: function() { return this.queue.length; },

    close: function() {
      clearInterval(this.timer);

      console.log("Clearing out remaining queue!");
      this.queue.forEach(function(event) { this._processEvent(event); }, this);

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
},{"./constants":3,"./errors":6}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
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
    unmine: function() { this.state.unset(this.state.F_MINED); },
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
},{"./constants":3,"./lib/bit-flag-factory":8}],19:[function(require,module,exports){
"use strict;"

var $C = require('./constants');

var ThemeStyler = {
	set: function(theme, $el) {

		$el || ($el = $($C.DefaultConfig.board));

		var themeFile = $C.Themes[theme],
			$body = $el.parents("body").length ? $el.parents("body") : $(document.body);

		$body.removeClass().addClass(themeFile);
		/* ,
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
			$styles.after($link);*/
	}
};

module.exports = ThemeStyler;
},{"./constants":3}],20:[function(require,module,exports){
"use strict;"

function Timer(initial, max, isCountdown, emitter) {
    this.isCountdown = isCountdown;
    this.seconds = this.isCountdown ? max : initial;
    this.initial = initial;
    this.max = max;

    this.emitter = emitter;

    this.freeze = false;
}

Timer.prototype = {
    constructor: Timer,
    _renderInitial: function() {
        var arr = this._toMinsSecs(this.seconds);
        this._publish(arr[0] || 0, arr[1] || 0);
    },
    _toMinsSecs: function(secs) {
        var mins = ~~(secs / 60),
            secs = ~~(secs % 60);
        return [mins, secs];
    },
    _countdown: function() {
        var timer = setInterval(function() {
                if (!this.freeze) {
                    if ((this.isCountdown && this.seconds > 0) || (!this.isCountdown && this.seconds < this.max)) {
                        var arr = this._toMinsSecs(this.seconds);
                        this._publish("change", arr[0], arr[1]);
                        this.isCountdown ? this.seconds-- : this.seconds++;
                    } else {
                        clearInterval(timer);
                        this._publish("end", 0, 0);
                    }
                } else
                    clearInterval(timer);
            }.bind(this), 1000);
    },
    _publish: function(event, mins, secs) { this.emitter.trigger("timer:" + event, mins, secs); },
    getMinutes: function() { return +this._toMinsSecs(this.seconds)[0]; },
    getSeconds: function() { return +this._toMinsSecs(this.seconds)[1]; },
    start: function() {
        this.freeze = false;
        var t = this._toMinsSecs(this.seconds);
        this._publish("start", t[0], t[1]);
        this._countdown();
    },
    stop: function() {
        this.freeze = true;
        var t = this._toMinsSecs(this.seconds);
        this._publish("stop", t[0], t[1]);
    },
    reset: function() {
        this.seconds = 0;
        this._publish("reset", 0, 0);
    }
};

module.exports = Timer;
},{}],21:[function(require,module,exports){
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
    var tscript = this._strategy.apply(args);
    tscript && this._transcripts.push(tscript);
};

module.exports = TranscribingEmitter;
},{"./lib/emitter":9,"./transcription-strategy":22}],22:[function(require,module,exports){
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
                    case "gb:end:timedout":
                        // standard Gameboard-based event
                        if (data[1].constructor.name === "Multimap")
                            data[1] = JSON.stringify(data[1]);
                        break;

                    case "score:change":
                    case "score:change:final":
                        data = null;
                        break;
                    case "timer:start":
                    case "timer:stop":
                    case "timer:change":
                    case "timer:reset":
                    case "timer:end":
                        break; // no-op
                    default:
                        data = null;
                        break;
                }
                // prefix array contents with the current timestamp as its key
                data && data.unshift(+new Date);
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

},{}],23:[function(require,module,exports){
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
                // must have at least one mine!
                if (mines < 1) {
                    throw new ValidationError("Invalid mine count: please choose a value between {0} and {1}.", 1, maxPossible);
                    return false;
                }
                // else...
                return true;
            }
        }
};

module.exports = Validators;
},{"./constants":3,"./errors":6}]},{},[1,4,2,8,5,10,9,11,13,15,12,3,6,20,16,17,18,21,19,22,23,7,14])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2ZsaXBwYWJsZS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9sY2dlbmVyYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9tdWx0aW1hcC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVsYXllci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVzLWRpc3BsYXkuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zY29yZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGltZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy90cmFuc2NyaWJpbmctZW1pdHRlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3kuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92YWxpZGF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcllBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBHYW1lYm9hcmQgPSByZXF1aXJlKCcuL2dhbWVib2FyZCcpLFxyXG4gICAgTW9kZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vZGVzLFxyXG4gICAgUHJlc2V0TGV2ZWxzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRMZXZlbHMsXHJcbiAgICBQcmVzZXRTZXR1cHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldFNldHVwcyxcclxuICAgIERpbVZhbGlkYXRvciA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpLkJvYXJkRGltZW5zaW9ucyxcclxuICAgIE1pbmVWYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5NaW5lQ291bnQsXHJcbiAgICBERUZBVUxUX0NPTkZJRyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuRGVmYXVsdENvbmZpZyxcclxuICAgIE1BWF9HUklEX0RJTUVOU0lPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1BWF9HUklEX0RJTUVOU0lPTlMsXHJcbiAgICBNSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTUlORUFCTEVfU1BBQ0VTX01VTFRJUExJRVIsXHJcblxyXG4gICAgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIH5+KE1hdGgucG93KGRpbSwgMikgKiBNSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUik7IH0sXHJcbiAgICBkaXNhYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsLCB1bmRvKSB7XHJcbiAgICAgICAgaWYgKHVuZG8gPT0gbnVsbCkgdW5kbyA9IGZhbHNlO1xyXG4gICAgICAgICRlbFt1bmRvID8gJ3JlbW92ZUNsYXNzJyA6ICdhZGRDbGFzcyddKCdkaXNhYmxlZCcpO1xyXG4gICAgICAgICRlbC5maW5kKFwiaW5wdXRcIikucHJvcCgncmVhZG9ubHknLCAhdW5kbyk7XHJcbiAgICB9LFxyXG4gICAgZW5hYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsKSB7IHJldHVybiBkaXNhYmxlT3B0aW9uKCRlbCwgdHJ1ZSk7IH07XHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgJChkb2N1bWVudC5ib2R5KS5hZGRDbGFzcyhERUZBVUxUX0NPTkZJRy50aGVtZS50b0xvd2VyQ2FzZSgpKTtcclxuXHJcbiAgICB2YXIgJHBvc3NpYmxlTWluZXMgPSAkKFwiI21pbmUtY291bnRcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLFxyXG4gICAgICAgIFBSRVNFVF9QQU5FTF9TRUxFQ1RPUiA9IFwidWwucHJlc2V0ID4gbGk6bm90KDpoYXMobGFiZWxbZm9yJD0nLW1vZGUnXSkpXCIsXHJcbiAgICAgICAgQ1VTVE9NX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5jdXN0b20gPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIjtcclxuXHJcbiAgICAvLyBzZXR0aW5nIGluaXRpYWwgdmFsdWVcclxuICAgICRwb3NzaWJsZU1pbmVzLmh0bWwobWluZWFibGVTcGFjZXMoJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSkpO1xyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKS5odG1sKE1BWF9HUklEX0RJTUVOU0lPTlMgKyBcIiB4IFwiICsgTUFYX0dSSURfRElNRU5TSU9OUyk7XHJcblxyXG4gICAgJChcIiNwcmVzZXQtbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoUFJFU0VUX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChDVVNUT01fUEFORUxfU0VMRUNUT1IpKTsgfSkuY2xpY2soKTtcclxuICAgICQoXCIjY3VzdG9tLW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyBkaXNhYmxlT3B0aW9uKCQoUFJFU0VUX1BBTkVMX1NFTEVDVE9SKSk7ICQoXCIjZGltZW5zaW9uc1wiKS5mb2N1cygpOyB9KTtcclxuXHJcbiAgICAkLmVhY2goJChcImxhYmVsW2Zvcl49J2xldmVsLSddXCIpLCBmdW5jdGlvbihfLCBsYWJlbCkge1xyXG4gICAgICAgIHZhciBsZXZlbCA9ICQobGFiZWwpLmF0dHIoJ2ZvcicpLnN1YnN0cmluZygnbGV2ZWwtJy5sZW5ndGgpLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgIGRpbXMgPSBQcmVzZXRTZXR1cHNbbGV2ZWxdLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gUHJlc2V0U2V0dXBzW2xldmVsXS5taW5lcyxcclxuICAgICAgICAgICAgJGFkdmljZSA9ICQobGFiZWwpLmZpbmQoJy5hZHZpY2UnKTtcclxuICAgICAgICAkYWR2aWNlLmh0bWwoXCIgKFwiICsgZGltcyArIFwiIHggXCIgKyBkaW1zICsgXCIsIFwiICsgbWluZXMgKyBcIiBtaW5lcylcIik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBvbmtleXVwIHdoZW4gY2hvb3NpbmcgZ2FtZWJvYXJkIGRpbWVuc2lvbnMsXHJcbiAgICAvLyBuZWlnaGJvcmluZyBpbnB1dCBzaG91bGQgbWlycm9yIG5ldyB2YWx1ZSxcclxuICAgIC8vIGFuZCB0b3RhbCBwb3NzaWJsZSBtaW5lYWJsZSBzcXVhcmVzIChkaW1lbnNpb25zIF4gMiAtMSlcclxuICAgIC8vIGJlIGZpbGxlZCBpbnRvIGEgPHNwYW4+IGJlbG93LlxyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XHJcbiAgICAgICAgLy8gdXBkYXRlIHRoZSAnbWlycm9yJyA8aW5wdXQ+Li4uXHJcbiAgICAgICAgJCgnI2RpbWVuc2lvbnMtbWlycm9yJykudmFsKCR0aGlzLnZhbCgpKTtcclxuICAgICAgICAvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuICAgICAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCR0aGlzLnZhbCgpKSArICcuJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiZm9ybVwiKS5vbihcInN1Ym1pdFwiLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIG1vZGUgPSAkKFwiW25hbWU9bW9kZS1zZWxlY3RdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIGlmIChtb2RlID09PSBNb2Rlcy5QUkVTRVQpIHtcclxuICAgICAgICAgICAgdmFyIGxldmVsID0gJChcIltuYW1lPXByZXNldC1sZXZlbF06Y2hlY2tlZFwiKS52YWwoKSxcclxuICAgICAgICAgICAgICAgIHNldHVwID0gT2JqZWN0LmtleXMoUHJlc2V0TGV2ZWxzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHBsKSB7IHJldHVybiBQcmVzZXRMZXZlbHNbcGxdID09PSBsZXZlbDsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBvcCgpO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gUHJlc2V0U2V0dXBzW3NldHVwXS5kaW1lbnNpb25zO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9IFByZXNldFNldHVwc1tzZXR1cF0ubWluZXM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gTW9kZXMuQ1VTVE9NLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmlzQ3VzdG9tID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkID0gJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpIHx8ICskKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpLFxyXG4gICAgICAgICAgICAgICAgbSA9ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKSB8fCArJChcIiNtaW5lLWNvdW50XCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gRGltVmFsaWRhdG9yLnZhbGlkYXRlKGQpID8gK2QgOiA5O1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBNaW5lVmFsaWRhdG9yLnZhbGlkYXRlKG0sIG1pbmVhYmxlU3BhY2VzKGdhbWVPcHRpb25zLmRpbWVuc2lvbnMpKSA/IG0gOiAxO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFcnJvcjogJW9cIiwgZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmh0bWwoZS5tZXNzYWdlKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc2V0IHRoZSBkZXNpcmVkIGNvbG9yIHRoZW1lLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLnRoZW1lID0gJChcIiNjb2xvci10aGVtZVwiKS52YWwoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdpbmRvdy5nYW1lYm9hcmQgPSBuZXcgR2FtZWJvYXJkKGdhbWVPcHRpb25zKS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiI2JvYXJkLWNhcmRcIikub24oXCJjbGlja1wiLCBcImEucmVwbGF5XCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHRlbXBvcmFyeSwgYnJ1dGUtZm9yY2UgZml4Li4uXHJcbiAgICAgICAgLy8gVE9ETzogcmVzZXQgZm9ybSBhbmQgdG9nZ2xlIHZpc2liaWxpdHkgb24gdGhlIHNlY3Rpb25zLi4uXHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xyXG4gICAgfSk7XHJcblxyXG59KTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBDb25zb2xlUmVuZGVyZXIgPSB7XHJcblxyXG4gICAgQ09MX1NQQUNJTkc6ICcgICAnLFxyXG4gICAgTUlORURfU1FVQVJFOiAnKicsXHJcbiAgICBCTEFOS19TUVVBUkU6ICcuJyxcclxuICAgIFJFTkRFUkVEX01BUDogJyVvJyxcclxuICAgIERFRkFVTFRfVFJBTlNGT1JNRVI6IGZ1bmN0aW9uKHJvdyl7IHJldHVybiByb3c7IH0sXHJcblxyXG4gICAgX21ha2VUaXRsZTogZnVuY3Rpb24oc3RyKSB7IHJldHVybiBzdHIuc3BsaXQoJycpLmpvaW4oJyAnKS50b1VwcGVyQ2FzZSgpOyB9LFxyXG4gICAgX2Rpc3BsYXlSb3dOdW06IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gXCIgICAgICAgW1wiICsgbnVtICsgXCJdXFxuXCIgfSxcclxuICAgIF90b1N5bWJvbHM6IGZ1bmN0aW9uKHZhbHVlcywgZm4pIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBmbihyb3cpLmpvaW4oX3RoaXMuQ09MX1NQQUNJTkcpLnRvTG93ZXJDYXNlKCkgKyBfdGhpcy5fZGlzcGxheVJvd051bShpZHgpXHJcbiAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfSxcclxuICAgIF92YWxpZGF0ZTogZnVuY3Rpb24odmFsdWVzKSB7XHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVzKSAmJiB2YWx1ZXMubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xyXG4gICAgICAgIGVsc2UgdGhyb3cgXCJObyB2YWx1ZXMgcHJlc2VudC5cIjtcclxuICAgIH0sXHJcbiAgICBfZ2V0UmVuZGVyZWRNYXA6IGZ1bmN0aW9uKHRyYW5zZm9ybWVyKSB7XHJcbiAgICAgICAgdmFyIHZhbHMgPSB0aGlzLl92YWxpZGF0ZSh0aGlzLnZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RvU3ltYm9scyh2YWxzLCB0cmFuc2Zvcm1lcik7XHJcbiAgICB9LFxyXG5cclxuICAgIHRvOiBmdW5jdGlvbihsb2cpIHsgdGhpcy4kbG9nID0gbG9nOyByZXR1cm4gdGhpczsgfSxcclxuICAgIHdpdGhWYWx1ZXM6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIHRoaXMudmFsdWVzID0gdGhpcy5fdmFsaWRhdGUodmFsdWVzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcblxyXG4gICAgdmlld0dhbWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gZnVuY3Rpb24ocm93KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcm93Lm1hcChmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoc3EuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLk1JTkVEX1NRVUFSRSA6IHNxLmdldERhbmdlcigpID09PSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLkJMQU5LX1NRVUFSRSA6IHNxLmdldERhbmdlcigpOyB9KVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuJGxvZyhbIHRoaXMuX21ha2VUaXRsZShcImdhbWVib2FyZFwiKSwgdGhpcy5SRU5ERVJFRF9NQVAgXVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIHRoaXMuX2dldFJlbmRlcmVkTWFwKHRyYW5zZm9ybWVyKSk7XHJcbiAgICB9LFxyXG4gICAgdmlld01pbmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJtaW5lIHBsYWNlbWVudHNcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0aGlzLkRFRkFVTFRfVFJBTlNGT1JNRVIpKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZVJlbmRlcmVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIENvbnN0YW50cyA9IE9iamVjdC5mcmVlemUoe1xyXG5cclxuICAgIFZFUlNJT046ICdiZXRhNScsXHJcblxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcbiAgICBNSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUjogMC4zMyxcclxuICAgIC8vIGZvciBjYWxjdWxhdGluZyBjbG9jaywgZGVmYXVsdHNcclxuICAgIC8vIHRvIDEuMjVzIGZvciBldmVyeSBtaW5lZCBzcXVhcmVcclxuICAgIFRJTUVfQVZHX0FMTE9DX1BFUl9PUEVOX1NRVUFSRTogMS4yNSxcclxuXHJcbiAgICBEZWZhdWx0Q29uZmlnOiB7XHJcbiAgICAgICAgZGltZW5zaW9uczogOSxcclxuICAgICAgICBtaW5lczogMSxcclxuICAgICAgICBib2FyZDogJyNib2FyZCcsXHJcbiAgICAgICAgaXNDb3VudGRvd246IHRydWUsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAgOTAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogMTUwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDIwMCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS8sXHJcblxyXG4gICAgU2NvcmVib2FyZDogeyBESUdJVFM6IDMsIEZYX0RVUkFUSU9OOiA4MDAsIE9VVF9PRl9SQU5HRTogXCJNQVhcIiB9LFxyXG5cclxuICAgIFNjb3JpbmdSdWxlczoge1xyXG4gICAgICAgIERBTkdFUl9JRFhfTVVMVElQTElFUjogMSxcclxuICAgICAgICBCTEFOS19TUVVBUkVfUFRTOiAwLFxyXG4gICAgICAgIEZMQUdfTUlORUQ6IDI1LFxyXG4gICAgICAgIE1JU0ZMQUdfVU5NSU5FRDogMTAsXHJcbiAgICAgICAgVU5GTEFHX01JTkVEOiAyNSxcclxuICAgICAgICBNSVNVTkZMQUdfTUlORUQ6IDEwLFxyXG4gICAgICAgIFVTRVJNT1ZFU19NVUxUSVBMSUVSOiAxMCxcclxuICAgICAgICBNSVNGTEFHR0VEX01VTFRJUExJRVI6IDEwLFxyXG4gICAgICAgIEZMQUdHRURfTUlORVNfTVVMVElQTElFUjogMTBcclxuICAgIH1cclxuXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRmxpcHBhYmxlID0gcmVxdWlyZSgnLi9saWIvZmxpcHBhYmxlJyk7XHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oZWwpIHtcclxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbC5jaGFyQXQoMCkgPT09ICcjJyA/IGVsLnN1YnN0cmluZygxKSA6IGVsKTtcclxuICAgIHRoaXMuJGVsID0gJChlbCk7XHJcblxyXG4gICAgdGhpcy4kbTEgPSB0aGlzLiRlbC5maW5kKCcjbTEnKTtcclxuICAgIHRoaXMuJG0yID0gdGhpcy4kZWwuZmluZCgnI20yJyk7XHJcbiAgICB0aGlzLiRzMSA9IHRoaXMuJGVsLmZpbmQoJyNzMScpO1xyXG4gICAgdGhpcy4kczIgPSB0aGlzLiRlbC5maW5kKCcjczInKTtcclxufVxyXG5cclxuQ291bnRkb3duLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBDb3VudGRvd24sXHJcbiAgICBfaW5jcmVtZW50OiBmdW5jdGlvbihjaGlwcykge1xyXG4gICAgICAgIGNoaXBzLmZvckVhY2goZnVuY3Rpb24oY2hpcCkgeyB0aGlzLl9mbGlwKGNoaXBbMF0sIGNoaXBbMV0pOyB9LCB0aGlzKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKVxyXG4gICAgICAgICAgICAgICAgICAgIGFyci51bnNoaWZ0KCcwJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5faW5jcmVtZW50KFtcclxuICAgICAgICAgICAgW3RoaXMuJHMyLCB0aW1lc1sxXVsxXV0sXHJcbiAgICAgICAgICAgIFt0aGlzLiRzMSwgdGltZXNbMV1bMF1dLFxyXG4gICAgICAgICAgICBbdGhpcy4kbTIsIHRpbWVzWzBdWzFdXSxcclxuICAgICAgICAgICAgW3RoaXMuJG0xLCB0aW1lc1swXVswXV1cclxuICAgICAgICBdKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZsaXBwYWJsZSgpLmNhbGwoQ291bnRkb3duLnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvdW50ZG93bjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcInVzZSBzdHJpY3Q7XCJcbi8vIEVSUk9SUyBBTkQgRVhDRVBUSU9OU1xuXG5mdW5jdGlvbiBNeXN3ZWVwZXJFcnJvcigpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICBSR1hfUkVQTEFDRU1FTlRfVE9LRU5TID0gL1xceyhcXGQrKVxcfS9nLFxuICAgICAgZXh0ZW5kTWVzc2FnZSA9IGZ1bmN0aW9uKHN0ciwgYXJncykge1xuICAgICAgICAgIHJldHVybiAoc3RyIHx8ICcnKS5yZXBsYWNlKFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMsIGZ1bmN0aW9uKF8sIGluZGV4KSB7IHJldHVybiBhcmdzWytpbmRleF0gfHwgJyc7IH0pO1xuICAgICAgfTtcbiAgdGhpcy5tZXNzYWdlID0gZXh0ZW5kTWVzc2FnZShhcmdzWzBdLCBhcmdzLnNsaWNlKDEpKTtcbiAgRXJyb3IuY2FsbCh0aGlzLCB0aGlzLm1lc3NhZ2UpO1xuICAvLyBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBhcmd1bWVudHMuY2FsbGVlKTtcbiAgdGhpcy5zdGFjayA9IEVycm9yKCkuc3RhY2s7XG59XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE15c3dlZXBlckVycm9yO1xuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLmdldFRyYWNlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YWNrLnJlcGxhY2UoL+KGtVxccysvZywgJ1xcbiAgJyk7IH07XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUubmFtZSA9ICdNeXN3ZWVwZXJFcnJvcic7XG5cbi8qICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoKSB7XG4gIE15c3dlZXBlckVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG5cbmZ1bmN0aW9uIFNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yKCkge1xuICBNeXN3ZWVwZXJFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5TY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjtcblNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yLnByb3RvdHlwZS5uYW1lID0gJ1Njb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yJztcblxuXG5tb2R1bGUuZXhwb3J0cy5NeXN3ZWVwZXJFcnJvciA9IE15c3dlZXBlckVycm9yO1xubW9kdWxlLmV4cG9ydHMuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yO1xubW9kdWxlLmV4cG9ydHMuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IgPSBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICBUSU1FX0FWR19BTExPQ19QRVJfT1BFTl9TUVVBUkUgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlRJTUVfQVZHX0FMTE9DX1BFUl9PUEVOX1NRVUFSRSxcclxuICAgIFJHWF9NT0JJTEVfREVWSUNFUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9iaWxlRGV2aWNlUmVnZXgsXHJcbiAgICBWRVJTSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5WRVJTSU9OLFxyXG4gICAgVGltZXIgPSByZXF1aXJlKCcuL3RpbWVyJyksXHJcbiAgICBDb3VudGRvd24gPSByZXF1aXJlKCcuL2NvdW50ZG93bicpLFxyXG4gICAgTWluZXNEaXNwbGF5ID0gcmVxdWlyZSgnLi9taW5lcy1kaXNwbGF5JyksXHJcbiAgICBUcmFuc2NyaWJpbmdFbWl0dGVyID0gcmVxdWlyZSgnLi90cmFuc2NyaWJpbmctZW1pdHRlcicpLFxyXG4gICAgVHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0gcmVxdWlyZSgnLi90cmFuc2NyaXB0aW9uLXN0cmF0ZWd5JyksXHJcbiAgICBUaGVtZVN0eWxlciA9IHJlcXVpcmUoJy4vdGhlbWUtc3R5bGVyJyksXHJcbiAgICBDb25zb2xlUmVuZGVyZXIgPSByZXF1aXJlKCcuL2NvbnNvbGUtcmVuZGVyZXInKSxcclxuICAgIE1pbmVMYXllciA9IHJlcXVpcmUoJy4vbWluZWxheWVyJyksXHJcbiAgICBTY29yZWtlZXBlciA9IHJlcXVpcmUoJy4vc2NvcmVrZWVwZXInKSxcclxuICAgIFNjb3JlYm9hcmQgPSByZXF1aXJlKCcuL3Njb3JlYm9hcmQnKTtcclxuXHJcbi8vIHdyYXBwZXIgYXJvdW5kIGAkbG9nYCwgdG8gdG9nZ2xlIGRldiBtb2RlIGRlYnVnZ2luZ1xyXG52YXIgJGxvZyA9IGZ1bmN0aW9uICRsb2coKSB7IGlmICgkbG9nLmRlYnVnX21vZGUgfHwgZmFsc2UpIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7IH1cclxuXHJcbmZ1bmN0aW9uIEdhbWVib2FyZChvcHRpb25zKSB7XHJcbiAgICAvLyB0aGUgbWFwLCBzZXJ2aW5nIGFzIHRoZSBpbnRlcm5hbCByZXByZXNlbmF0aW9uIG9mIHRoZSBnYW1lYm9hcmRcclxuICAgIHRoaXMuYm9hcmQgPSBuZXcgTXVsdGltYXA7XHJcbiAgICAvLyB0aGUgZGltZW5zaW9ucyBvZiB0aGUgYm9hcmQgd2hlbiByZW5kZXJlZFxyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK29wdGlvbnMuZGltZW5zaW9ucyB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5kaW1lbnNpb25zO1xyXG4gICAgLy8gdGhlIG51bWJlciBvZiBtaW5lcyB0aGUgdXNlciBoYXMgc2VsZWN0ZWRcclxuICAgIHRoaXMubWluZXMgPSArb3B0aW9ucy5taW5lcyB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5taW5lcztcclxuICAgIC8vIHRoZSBET00gZWxlbWVudCBvZiB0aGUgdGFibGUgc2VydmluZyBhcyB0aGUgYm9hcmRcclxuICAgIHRoaXMuJGVsID0gJChvcHRpb25zLmJvYXJkIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmJvYXJkKTtcclxuICAgIC8vIGlzIGN1c3RvbSBvciBwcmVzZXQgZ2FtZT9cclxuICAgIHRoaXMuaXNDdXN0b20gPSBvcHRpb25zLmlzQ3VzdG9tIHx8IGZhbHNlO1xyXG4gICAgLy8gdGhlIGV2ZW50IHRyYW5zY3JpYmVyIGZvciBwbGF5YmFjayBhbmQgcGVyc2lzdGVuY2VcclxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyKFRyYW5zY3JpcHRpb25TdHJhdGVneSk7XHJcbiAgICAvLyBzZWxlY3RpdmVseSBlbmFibGUgZGVidWcgbW9kZSBmb3IgY29uc29sZSB2aXN1YWxpemF0aW9ucyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgdGhpcy5kZWJ1Z19tb2RlID0gb3B0aW9ucy5kZWJ1Z19tb2RlIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRlYnVnX21vZGU7XHJcbiAgICAkbG9nLmRlYnVnX21vZGUgPSB0aGlzLmRlYnVnX21vZGU7XHJcbiAgICAvLyBzcGVjaWZpZXMgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUgb3Igc2tpblxyXG4gICAgdGhpcy50aGVtZSA9IHRoaXMuX3NldENvbG9yVGhlbWUob3B0aW9ucy50aGVtZSB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy50aGVtZSk7XHJcbiAgICAvLyBjb250YWluZXIgZm9yIGZsYXNoIG1lc3NhZ2VzLCBzdWNoIGFzIHdpbi9sb3NzIG9mIGdhbWVcclxuICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKE1lc3NhZ2VPdmVybGF5KTtcclxuICAgIC8vIGNoZWNrIGZvciBkZXNrdG9wIG9yIG1vYmlsZSBwbGF0Zm9ybSAoZm9yIGV2ZW50IGhhbmRsZXJzKVxyXG4gICAgdGhpcy5pc01vYmlsZSA9IHRoaXMuX2NoZWNrRm9yTW9iaWxlKCk7XHJcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHVzZXIgY2xpY2tzIHRvd2FyZHMgdGhlaXIgd2luXHJcbiAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcbiAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgLy8gdGhlIGRpc3BsYXkgb2JqZWN0IGZvciB0aGUgbnVtYmVyIG9mIG1pbmVzXHJcbiAgICB0aGlzLm1pbmVzRGlzcGxheSA9IG5ldyBNaW5lc0Rpc3BsYXkodGhpcy5taW5lcywgXCIjbWluZXMtZGlzcGxheVwiKTtcclxuICAgIC8vIGRpc3BsYXkgdGhlIGN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgZ2FtZTpcclxuICAgICQoXCIudmVyc2lvblwiKS5odG1sKFZFUlNJT04pO1xyXG4gICAgLy8gYWRkIGluIHRoZSBjb3VudGRvd24gY2xvY2suLi5cclxuICAgIHRoaXMuY2xvY2sgPSBuZXcgVGltZXIoMCwgK29wdGlvbnMudGltZXIgfHwgdGhpcy5fZGV0ZXJtaW5lVGltZXIoKSxcclxuICAgICAgICBvcHRpb25zLmlzQ291bnRkb3duIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmlzQ291bnRkb3duLCB0aGlzLmVtaXR0ZXIpO1xyXG4gICAgdGhpcy5jb3VudGRvd24gPSBuZXcgQ291bnRkb3duKFwiI2NvdW50ZG93blwiKTtcclxuICAgIC8vIGNyZWF0ZSB0aGUgc2NvcmVrZWVwaW5nIG9iamVjdFxyXG4gICAgdGhpcy5zY29yZWtlZXBlciA9IG5ldyBTY29yZWtlZXBlcih0aGlzKTtcclxuICAgIC8vIGNyZWF0ZSB0aGUgYWN0dWFsIHNjb3JlYm9hcmQgdmlld1xyXG4gICAgdGhpcy5zY29yZWJvYXJkID0gbmV3IFNjb3JlYm9hcmQoMCwgXCIjc2NvcmUtZGlzcGxheVwiKTtcclxuXHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG4gICAgLy8gdHJpZ2dlciBldmVudCBmb3IgZ2FtZSB0byBiZWdpbi4uLlxyXG4gICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOnN0YXJ0JywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xyXG59XHJcblxyXG5HYW1lYm9hcmQucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEdhbWVib2FyZCxcclxuICAgIC8vIFwiUFJJVkFURVwiIE1FVEhPRFM6XHJcbiAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBwcmVmaWxsIHNxdWFyZXMgdG8gcmVxdWlyZWQgZGltZW5zaW9ucy4uLlxyXG4gICAgICAgIHZhciBkaW1lbnNpb25zID0gdGhpcy5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgIHBvcHVsYXRlUm93ID0gZnVuY3Rpb24ocm93LCBzcXVhcmVzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzcXVhcmVzOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0W2ldID0gbmV3IFNxdWFyZShyb3csIGkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKVxyXG4gICAgICAgICAgICB0aGlzLmJvYXJkLnNldChpLCBwb3B1bGF0ZVJvdyhpLCBkaW1lbnNpb25zKSk7XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSByYW5kb20gcG9zaXRpb25zIG9mIG1pbmVkIHNxdWFyZXMuLi5cclxuICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKGRpbWVuc2lvbnMsIG1pbmVzKTtcclxuXHJcbiAgICAgICAgLy8gcHJlLWNhbGN1bGF0ZSB0aGUgZGFuZ2VyIGluZGV4IG9mIGVhY2ggbm9uLW1pbmVkIHNxdWFyZS4uLlxyXG4gICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcblxyXG4gICAgICAgIC8vIGRpc3BsYXkgb3V0cHV0IGFuZCBnYW1lIHN0cmF0ZWd5IHRvIHRoZSBjb25zb2xlLi4uXHJcbiAgICAgICAgaWYgKHRoaXMuZGVidWdfbW9kZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIC8vIHNldCB0aGUgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICB0aGlzLl9zZXRDb2xvclRoZW1lKHRoaXMudGhlbWUpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIHZhciBsb2NzID0gbmV3IE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucyksIF90aGlzID0gdGhpcztcclxuICAgICAgICBsb2NzLmZvckVhY2goZnVuY3Rpb24obG9jKSB7IF90aGlzLmdldFNxdWFyZUF0KGxvY1swXSwgbG9jWzFdKS5taW5lKCk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcihfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIicgY2xhc3M9Jy1yb3cnPlwiXHJcbiAgICAgICAgICAgICAgICAgKyAgW10uam9pbi5jYWxsKHsgbGVuZ3RoOiBkaW1lbnNpb25zICsgMSB9LCBcIjx0ZD48L3RkPlwiKVxyXG4gICAgICAgICAgICAgICAgICsgIFwiPC90cj5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKGdyaWQpO1xyXG4gICAgfSxcclxuICAgIF9zZXRDb2xvclRoZW1lOiBmdW5jdGlvbih0aGVtZSkge1xyXG4gICAgICAgIFRoZW1lU3R5bGVyLnNldCh0aGVtZSwgdGhpcy4kZWwpO1xyXG4gICAgICAgIHJldHVybiB0aGVtZTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lVGltZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gVElNRV9BVkdfQUxMT0NfUEVSX09QRU5fU1FVQVJFICogKE1hdGgucG93KHRoaXMuZGltZW5zaW9ucywgMikgLSB0aGlzLm1pbmVzKTsgfSxcclxuICAgIF9jaGVja0Zvck1vYmlsZTogZnVuY3Rpb24oKSB7IHJldHVybiBSR1hfTU9CSUxFX0RFVklDRVMudGVzdChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkpOyB9LFxyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc01vYmlsZSkge1xyXG4gICAgICAgICAgICAvLyBmb3IgdG91Y2ggZXZlbnRzOiB0YXAgPT0gY2xpY2ssIGhvbGQgPT0gcmlnaHQgY2xpY2tcclxuICAgICAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub24oe1xyXG4gICAgICAgICAgICAgICAgdGFwOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgaG9sZDogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICAgICAgY2xpY2s6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPOiByZW1vdmUgYWZ0ZXIgZGV2ZWxvcG1lbnQgZW5kcy4uLmZvciBkZWJ1ZyB1c2Ugb25seSFcclxuICAgICAgICAvLyBJTkRJVklEVUFMIFNRVUFSRSBFVkVOVFNcclxuICAgICAgICAvKnRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6ZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiRmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOnVuZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiVW5mbGFnZ2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pOyovXHJcbiAgICAgICAgLy8gR0FNRUJPQVJELVdJREUgRVZFTlRTXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjpzdGFydCcsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiTGV0IHRoZSBnYW1lIGJlZ2luIVwiLCBhcmd1bWVudHMpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91IHdpbiFcIik7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOm92ZXInLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91J3JlIGRlYWQhXCIpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp0aW1lZG91dCcsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgb3V0dGEgdGltZSFcIik7IH0pO1xyXG5cclxuICAgICAgICAvLyAtLS0gVEhFU0UgRVZFTlRTIEFSRSBGT1IgUkVBTCwgVE8gU1RBWSFcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIHdpcmVzIHVwIHRoZSBzY29yZWJvYXJkIHZpZXcgb2JqZWN0IHRvIHRoZSBldmVudHMgcmVjZWl2ZWQgZnJvbSB0aGUgc2NvcmVrZWVwZXJcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3Njb3JlOmNoYW5nZSBzY29yZTpjaGFuZ2U6ZmluYWwnLCBmdW5jdGlvbigpIHsgX3RoaXMuc2NvcmVib2FyZC51cGRhdGUoX3RoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3RpbWVyOnN0YXJ0IHRpbWVyOnN0b3AgdGltZXI6Y2hhbmdlIHRpbWVyOnJlc2V0IHRpbWVyOmVuZCcsIGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHsgX3RoaXMuY291bnRkb3duLnVwZGF0ZShtaW5zLCBzZWNzKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCd0aW1lcjplbmQnLCBmdW5jdGlvbigpIHsgX3RoaXMuX2dhbWVUaW1lZE91dCgpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gYXMgYSBjb3VydGVzeSB0byB0aGUgdXNlciwgdGhlaXIgZmlyc3QgY2xpY2tcclxuICAgICAgICAvLyB3aWxsIG5ldmVyIGJlIG1pbmVkIChjYW4ndCBsb3NlIGdhbWUgb24gZmlyc3QgdXNlciBtb3ZlKVxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpICYmIHRoaXMudXNlck1vdmVzID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2goZnVuY3Rpb24oc3EpIHsgc3EudW5taW5lKCk7IH0pO1xyXG4gICAgICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKHRoaXMuZGltZW5zaW9ucywgdGhpcy5taW5lcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRlYnVnX21vZGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRvQ29uc29sZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fb3BlblNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICBpZiAoIXNxdWFyZS5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwoc3F1YXJlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgJGNlbGwuYWRkQ2xhc3MoJ2tpbGxlci1taW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZVJpZ2h0Q2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBzdG9wIHRoZSBjb250ZXh0bWVudSBmcm9tIHBvcHBpbmcgdXAgb24gZGVza3RvcCBicm93c2Vyc1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKVxyXG4gICAgICAgICAgICB0aGlzLl9mbGFnU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbG9zZVNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICAvLyBoYW5kbGVzIGF1dG9jbGVhcmluZyBvZiBzcGFjZXMgYXJvdW5kIHRoZSBvbmUgY2xpY2tlZFxyXG4gICAgX3JlY3Vyc2l2ZVJldmVhbDogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZCksXHJcbiAgICAgICAgICAgIHJvdyA9IHNvdXJjZS5nZXRSb3coKSxcclxuICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCksXHJcbiAgICAgICAgICAgIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgIW5laWdoYm9yLmlzTWluZWQoKSAmJiAhbmVpZ2hib3IuaXNGbGFnZ2VkKCkgJiYgbmVpZ2hib3IuaXNDbG9zZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX29wZW5TcXVhcmUobmVpZ2hib3IpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgfHwgIW5laWdoYm9yLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIF9vcGVuU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6b3BlblwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2Nsb3NlU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmNsb3NlXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKS5yZW1vdmVDbGFzcygnY2xvc2VkJyk7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6ZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX3VuZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUudW5mbGFnKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6dW5mbGFnXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZ2V0T3BlbmVkU3F1YXJlc0NvdW50OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNPcGVuKCk7IH0pLmxlbmd0aDsgfSxcclxuICAgIF9ldmFsdWF0ZUZvckdhbWVXaW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBub3RNaW5lZCA9IHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkubGVuZ3RoO1xyXG4gICAgICAgIGlmIChub3RNaW5lZCA9PT0gdGhpcy5fZ2V0T3BlbmVkU3F1YXJlc0NvdW50KCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYXNoTXNnOiBmdW5jdGlvbihtc2csIGlzQWxlcnQpIHtcclxuICAgICAgICB0aGlzLmZsYXNoQ29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoaXNBbGVydCA/ICdnYW1lLW92ZXInIDogJ2dhbWUtd2luJylcclxuICAgICAgICAgICAgICAgIC5odG1sKG1zZylcclxuICAgICAgICAgICAgICAgIC5zaG93KCk7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVFbmRNc2c6IGZ1bmN0aW9uKG1zZywgaXNBbGVydCkge1xyXG4gICAgICAgIHZhciBSRVBMQVlfTElOSyA9IFwiPGEgaHJlZj0nIycgY2xhc3M9J3JlcGxheSc+Q2xpY2sgaGVyZSB0byBwbGF5IGFnYWluLi4uPC9hPlwiO1xyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKFwiPHNwYW4+XCIgKyBtc2cgKyBcIjwvc3Bhbj5cIiArIFJFUExBWV9MSU5LLCBpc0FsZXJ0KTtcclxuICAgIH0sXHJcbiAgICBfcHJlcGFyZUZpbmFsUmV2ZWFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIGZvciBhbGwgZmxhZ2dlZCBzcXVhcmVzLCByZW1vdmUgZmxhZyBpY29uXHJcbiAgICAgICAgLy8gYW5kIHJlcGxhY2Ugd2l0aCBvcmlnaW5hbCBkYW5nZXIgaW5kZXggaW5zdGVhZFxyXG4gICAgICAgIC8vIGZvciB3aGVuIGl0J3Mgb3BlbmVkXHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3VuZmxhZ1NxdWFyZShmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIC8vIG9wZW4vcmV2ZWFsIGFsbCBzcXVhcmVzXHJcbiAgICAgICAgdGhpcy4kZWxcclxuICAgICAgICAgICAgLmZpbmQoJy5zcXVhcmUnKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLmNsb2NrLnN0b3AoKTtcclxuICAgICAgICB0aGlzLnNjb3Jla2VlcGVyLmNsb3NlKCk7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVXaW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS13aW4nKTtcclxuICAgICAgICAkbG9nKFwiLS0tICBHQU1FIFdJTiEgIC0tLVwiKTtcclxuICAgICAgICAkbG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICAgICAgdGhpcy5fZ2FtZUVuZE1zZyhcIkdhbWUgT3ZlciEgWW91IHdpbiFcIik7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOmVuZDp3aW4nLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVPdmVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZ2FtZUVuZE1zZyhcIkdhbWUgT3ZlciFcIiwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOmVuZDpvdmVyJywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lVGltZWRPdXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXRpbWVkb3V0Jyk7XHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZ2FtZUVuZE1zZyhcIkdhbWUgT3ZlciEgWW91J3JlIG91dCBvZiB0aW1lIVwiLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOnRpbWVkb3V0JywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHZhciAkY2VsbCA9IHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSxcclxuICAgICAgICAgICAgZ2V0Q29udGVudHMgPSBmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzRmxhZ2dlZCgpKSByZXR1cm4gR2x5cGhzLkZMQUc7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNNaW5lZCgpKSByZXR1cm4gR2x5cGhzLk1JTkU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gISFzcS5nZXREYW5nZXIoKSA/IHNxLmdldERhbmdlcigpIDogJyc7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiBnZXRDb250ZW50cyhzcXVhcmUpIH0pO1xyXG5cclxuICAgICAgICAkY2VsbC5lbXB0eSgpLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcblxyXG4gICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKClcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnc3F1YXJlJylcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnY2VsbCcgKyBzcXVhcmUuZ2V0Q2VsbCgpKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKHNxdWFyZS5nZXRTdGF0ZSgpLmpvaW4oJyAnKSk7XHJcblxyXG4gICAgICAgIC8vIGF0dGFjaCB0aGUgU3F1YXJlIHRvIHRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ3JpZCBjZWxsXHJcbiAgICAgICAgJGNlbGwuZGF0YSgnc3F1YXJlJywgc3F1YXJlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gXCJQVUJMSUNcIiBNRVRIT0RTXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2godGhpcy5fcmVuZGVyU3F1YXJlLCB0aGlzKTtcclxuICAgICAgICAvLyByZXR1cm4gYHRoaXNgLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmUgY2hhaW5lZCB0byBpdHMgaW5pdGlhbGl6YXRpb24gY2FsbFxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIGEgU3F1YXJlIGluc3RhbmNlIGFzIGEgcGFyYW0sIHJldHVybnMgYSBqUXVlcnktd3JhcHBlZCBET00gbm9kZSBvZiBpdHMgY2VsbFxyXG4gICAgZ2V0R3JpZENlbGw6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRlbFxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJyNyb3cnICsgc3F1YXJlLmdldFJvdygpKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ3RkJylcclxuICAgICAgICAgICAgICAgIC5lcShzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgIH0sXHJcbiAgICAvLyB0YWtlcyByb3cgYW5kIGNlbGwgY29vcmRpbmF0ZXMgYXMgcGFyYW1zLCByZXR1cm5zIHRoZSBhc3NvY2lhdGVkIFNxdWFyZSBpbnN0YW5jZVxyXG4gICAgZ2V0U3F1YXJlQXQ6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgIHZhciByb3cgPSB0aGlzLmJvYXJkLmdldChyb3cpO1xyXG4gICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgLnZhbHVlcygpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbCk7IH0sIFtdKVxyXG4gICAgfSxcclxuICAgIC8vIGV4cG9ydCBzZXJpYWxpemVkIHN0YXRlIHRvIHBlcnNpc3QgZ2FtZSBmb3IgbGF0ZXJcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbmVlZCBnYW1lT3B0aW9ucywgbWV0YWRhdGEgb24gZGF0ZXRpbWUvZXRjLiwgc2VyaWFsaXplIGFsbCBzcXVhcmVzJyBzdGF0ZXNcclxuICAgICAgICByZXR1cm4gU2VyaWFsaXplci5leHBvcnQodGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHZhciByZW5kZXJlciA9IENvbnNvbGVSZW5kZXJlci50bygkbG9nKS53aXRoVmFsdWVzKHRoaXMuYm9hcmQudmFsdWVzKCkpO1xyXG4gICAgICAgIHJldHVybiAod2l0aERhbmdlcikgPyByZW5kZXJlci52aWV3R2FtZSgpIDogcmVuZGVyZXIudmlld01pbmVzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVib2FyZDsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbi8vIEB1c2FnZSB2YXIgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWydGX09QRU4nLCAnRl9NSU5FRCcsICdGX0ZMQUdHRUQnLCAnRl9JTkRFWEVEJ10pOyBiZiA9IG5ldyBCaXRGbGFncztcclxuZnVuY3Rpb24gQml0RmxhZ0ZhY3RvcnkoYXJncykge1xyXG5cclxuICAgIHZhciBiaW5Ub0RlYyA9IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gcGFyc2VJbnQoc3RyLCAyKTsgfSxcclxuICAgICAgICBkZWNUb0JpbiA9IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gbnVtLnRvU3RyaW5nKDIpOyB9LFxyXG4gICAgICAgIGJ1aWxkU3RhdGUgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIHBhZChhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7IHJldHVybiBTdHJpbmcoK3BhcmFtKTsgfSkucmV2ZXJzZSgpLmpvaW4oJycpKTsgfSxcclxuICAgICAgICBwYWQgPSBmdW5jdGlvbiAoc3RyLCBtYXgpIHtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXSwgbWF4ID0gbWF4IHx8IDQsIGRpZmYgPSBtYXggLSBzdHIubGVuZ3RoOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpO1xyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuICAgICAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyBfZmxhZ3M6IHRoaXMuX2ZsYWdzIH07IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBFbWl0dGVyLFxyXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIGV2ZW50LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZV0gPSB0aGlzLl9ldmVudHNbZV0gfHwgW107XHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXS5wdXNoKGZuKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIGV2ZW50LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2VdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXS5zcGxpY2UodGhpcy5fZXZlbnRzW2VdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXG5cbnZhciBGbGlwcGFibGUgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGbGlwcGFibGUpKVxuICAgICAgICByZXR1cm4gbmV3IEZsaXBwYWJsZShzZXR0aW5ncyk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHsgZHVyYXRpb246IDAsIHdyYXBwZXI6ICdzcGFuJyB9O1xuICAgIGZvciAodmFyIHMgaW4gc2V0dGluZ3MpXG4gICAgICAgIGlmIChzZXR0aW5ncy5oYXNPd25Qcm9wZXJ0eShzKSlcbiAgICAgICAgICAgIG9wdGlvbnNbc10gPSBzZXR0aW5nc1tzXTtcblxuICAgIHZhciBub2RlTmFtZVRvVGFnID0gZnVuY3Rpb24obm9kZSkgeyByZXR1cm4gXCI8XCIgKyBub2RlICsgXCIgLz5cIjsgfSxcbiAgICAgICAgdmVyaWZ5RE9NTm9kZSA9IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgdmFyIHRhZ3MgPSBcImEsYWJicixhY3JvbnltLGFkZHJlc3MsYXBwbGV0LGFyZWEsYXJ0aWNsZSxhc2lkZSxhdWRpbyxcIlxuICAgICAgICAgICAgICAgICsgXCJiLGJhc2UsYmFzZWZvbnQsYmRpLGJkbyxiZ3NvdW5kLGJpZyxibGluayxibG9ja3F1b3RlLGJvZHksYnIsYnV0dG9uLFwiXG4gICAgICAgICAgICAgICAgKyBcImNhbnZhcyxjYXB0aW9uLGNlbnRlcixjaXRlLGNvZGUsY29sLGNvbGdyb3VwLGNvbnRlbnQsZGF0YSxkYXRhbGlzdCxkZCxcIlxuICAgICAgICAgICAgICAgICsgXCJkZWNvcmF0b3IsZGVsLGRldGFpbHMsZGZuLGRpcixkaXYsZGwsZHQsZWxlbWVudCxlbSxlbWJlZCxmaWVsZHNldCxmaWdjYXB0aW9uLFwiXG4gICAgICAgICAgICAgICAgKyBcImZpZ3VyZSxmb250LGZvb3Rlcixmb3JtLGZyYW1lLGZyYW1lc2V0LGgxLGgyLGgzLGg0LGg1LGg2LGhlYWQsaGVhZGVyLGhncm91cCxocixodG1sLFwiXG4gICAgICAgICAgICAgICAgKyBcImksaWZyYW1lLGltZyxpbnB1dCxpbnMsaXNpbmRleCxrYmQsa2V5Z2VuLGxhYmVsLGxlZ2VuZCxsaSxsaW5rLGxpc3RpbmcsXCJcbiAgICAgICAgICAgICAgICArIFwibWFpbixtYXAsbWFyayxtYXJxdWVlLG1lbnUsbWVudWl0ZW0sbWV0YSxtZXRlcixuYXYsbm9icixub2ZyYW1lcyxub3NjcmlwdCxvYmplY3QsXCJcbiAgICAgICAgICAgICAgICArIFwib2wsb3B0Z3JvdXAsb3B0aW9uLG91dHB1dCxwLHBhcmFtLHBsYWludGV4dCxwcmUscHJvZ3Jlc3MscSxycCxydCxydWJ5LHMsc2FtcCxzY3JpcHQsXCJcbiAgICAgICAgICAgICAgICArIFwic2VjdGlvbixzZWxlY3Qsc2hhZG93LHNtYWxsLHNvdXJjZSxzcGFjZXIsc3BhbixzdHJpa2Usc3Ryb25nLHN0eWxlLHN1YixzdW1tYXJ5LHN1cCxcIlxuICAgICAgICAgICAgICAgICsgXCJ0YWJsZSx0Ym9keSx0ZCx0ZW1wbGF0ZSx0ZXh0YXJlYSx0Zm9vdCx0aCx0aGVhZCx0aW1lLHRpdGxlLHRyLHRyYWNrLHR0LHUsdWwsdmFyLHZpZGVvLHdicix4bXBcIjtcbiAgICAgICAgICAgIHJldHVybiAoc3RyID0gU3RyaW5nKHN0cikudG9Mb3dlckNhc2UoKSwgc3RyICYmICEhfnRhZ3MuaW5kZXhPZihzdHIpKSA/IHN0ciA6ICdzcGFuJztcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fZmxpcER1cmF0aW9uID0gK29wdGlvbnMuZHVyYXRpb24sXG4gICAgICAgIHRoaXMuX2ZsaXBXcmFwcGVyID0gdmVyaWZ5RE9NTm9kZShvcHRpb25zLndyYXBwZXIpO1xuXG4gICAgICAgIHRoaXMuX2ZsaXAgPSBmdW5jdGlvbigkZWwsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIGlmICgkZWwuaHRtbCgpICE9PSBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGVsXG4gICAgICAgICAgICAgICAgICAgIC53cmFwSW5uZXIoJChub2RlTmFtZVRvVGFnKHRoaXMuX2ZsaXBXcmFwcGVyKSkpXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKHRoaXMuX2ZsaXBXcmFwcGVyKVxuICAgICAgICAgICAgICAgICAgICAuZGVsYXkodGhpcy5fZmxpcER1cmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAuc2xpZGVVcCh0aGlzLl9mbGlwRHVyYXRpb24sIGZ1bmN0aW9uKCkgeyAkKHRoaXMpLnBhcmVudCgpLmh0bWwoY29udGVudCkgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGbGlwcGFibGU7IiwiLy8gTGluZWFyIENvbmdydWVudGlhbCBHZW5lcmF0b3I6IHZhcmlhbnQgb2YgYSBMZWhtYW4gR2VuZXJhdG9yXHJcbi8vIGJhc2VkIG9uIExDRyBmb3VuZCBoZXJlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9Qcm90b25rP3BhZ2U9NFxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCl7XHJcbiAgXCJ1c2Ugc3RyaWN0O1wiXHJcbiAgLy8gU2V0IHRvIHZhbHVlcyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTnVtZXJpY2FsX1JlY2lwZXNcclxuICAvLyBtIGlzIGJhc2ljYWxseSBjaG9zZW4gdG8gYmUgbGFyZ2UgKGFzIGl0IGlzIHRoZSBtYXggcGVyaW9kKVxyXG4gIC8vIGFuZCBmb3IgaXRzIHJlbGF0aW9uc2hpcHMgdG8gYSBhbmQgY1xyXG4gIGZ1bmN0aW9uIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcigpIHtcclxuICAgICAgdGhpcy5tID0gNDI5NDk2NzI5NjtcclxuICAgICAgLy8gYSAtIDEgc2hvdWxkIGJlIGRpdmlzaWJsZSBieSBtJ3MgcHJpbWUgZmFjdG9yc1xyXG4gICAgICB0aGlzLmEgPSAxNjY0NTI1O1xyXG4gICAgICAvLyBjIGFuZCBtIHNob3VsZCBiZSBjby1wcmltZVxyXG4gICAgICB0aGlzLmMgPSAxMDEzOTA0MjIzO1xyXG4gICAgICB0aGlzLnNlZWQgPSB2b2lkIDA7XHJcbiAgICAgIHRoaXMueiA9IHZvaWQgMDtcclxuICAgICAgLy8gaW5pdGlhbCBwcmltaW5nIG9mIHRoZSBnZW5lcmF0b3IsIHVudGlsIGxhdGVyIG92ZXJyaWRlblxyXG4gICAgICB0aGlzLnNldFNlZWQoKTtcclxuICB9XHJcbiAgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IsXHJcbiAgICBzZXRTZWVkOiBmdW5jdGlvbih2YWwpIHsgdGhpcy56ID0gdGhpcy5zZWVkID0gdmFsIHx8IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHRoaXMubSk7IH0sXHJcbiAgICBnZXRTZWVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc2VlZDsgfSxcclxuICAgIHJhbmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBkZWZpbmUgdGhlIHJlY3VycmVuY2UgcmVsYXRpb25zaGlwXHJcbiAgICAgIHRoaXMueiA9ICh0aGlzLmEgKiB0aGlzLnogKyB0aGlzLmMpICUgdGhpcy5tO1xyXG4gICAgICAvLyByZXR1cm4gYSBmbG9hdCBpbiBbMCwgMSlcclxuICAgICAgLy8gaWYgeiA9IG0gdGhlbiB6IC8gbSA9IDAgdGhlcmVmb3JlICh6ICUgbSkgLyBtIDwgMSBhbHdheXNcclxuICAgICAgcmV0dXJuIHRoaXMueiAvIHRoaXMubTtcclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTXVsdGltYXAucHJvdG90eXBlLCB7XHJcbiAgICBnZXQ6IHsgdmFsdWU6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfX0sXHJcbiAgICBzZXQ6IHsgdmFsdWU6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH19LFxyXG4gICAgZm9yRWFjaDogeyB2YWx1ZTogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH19LFxyXG4gICAgdmFsdWVzOiB7IHZhbHVlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgfX0sXHJcbiAgICBjbGVhcjogeyB2YWx1ZTogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH19LFxyXG4gICAgc2l6ZTogeyB2YWx1ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9fVxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gcmVxdWlyZSgnLi9saWIvbGNnZW5lcmF0b3InKTtcclxuXHJcbmZ1bmN0aW9uIE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucykge1xyXG4gICAgdGhpcy5nZW5lcmF0b3IgPSBuZXcgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yO1xyXG4gICAgdGhpcy5taW5lcyA9ICttaW5lcyB8fCAwO1xyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK2RpbWVuc2lvbnMgfHwgMDtcclxuXHJcbiAgICB2YXIgcmFuZHMgPSBbXSxcclxuICAgICAgICBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgZ2V0UmFuZG9tTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBfdGhpcy5nZW5lcmF0b3IucmFuZCgpICogKE1hdGgucG93KF90aGlzLmRpbWVuc2lvbnMsIDIpKSB8IDA7IH07XHJcblxyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgIHZhciBybmQgPSBnZXRSYW5kb21OdW1iZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKCF+cmFuZHMuaW5kZXhPZihybmQpKVxyXG4gICAgICAgICAgICByYW5kcy5wdXNoKHJuZCk7XHJcbiAgICAgICAgLy8gLi4ub3RoZXJ3aXNlLCBnaXZlIGl0IGFub3RoZXIgZ28tJ3JvdW5kOlxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5lcysrO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2NhdGlvbnMgPSByYW5kcy5tYXAoZnVuY3Rpb24ocm5kKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucztcclxuICAgICAgICByZXR1cm4gWyByb3csIGNlbGwgXTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmxvY2F0aW9ucztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lTGF5ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRmxpcHBhYmxlID0gcmVxdWlyZSgnLi9saWIvZmxpcHBhYmxlJyk7XHJcblxyXG5mdW5jdGlvbiBNaW5lc0Rpc3BsYXkobWluZXMsIGVsKSB7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG4gICAgdGhpcy5taW5lcyA9IG1pbmVzO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgwKTtcclxuICAgIHRoaXMuJE0gPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgxKTtcclxuICAgIHRoaXMuJFIgPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgyKTtcclxuXHJcbiAgICB0aGlzLnJlbmRlcigpO1xyXG59XHJcblxyXG5NaW5lc0Rpc3BsYXkucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IE1pbmVzRGlzcGxheSxcclxuICAgIF9pbmNyZW1lbnQ6IGZ1bmN0aW9uKGNoaXBzKSB7IGNoaXBzLmZvckVhY2goZnVuY3Rpb24oY2hpcCkgeyB0aGlzLl9mbGlwKGNoaXBbMF0sIGNoaXBbMV0pOyB9LCB0aGlzKTsgfSxcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IFN0cmluZyh0aGlzLm1pbmVzKS5zcGxpdCgnJyk7XHJcbiAgICAgICAgd2hpbGUgKGFyci5sZW5ndGggPCAzKVxyXG4gICAgICAgICAgICBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudChbXHJcbiAgICAgICAgICAgIFt0aGlzLiRSLCBhcnJbMl1dLFxyXG4gICAgICAgICAgICBbdGhpcy4kTSwgYXJyWzFdXSxcclxuICAgICAgICAgICAgW3RoaXMuJEwsIGFyclswXV1cclxuICAgICAgICBdKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZsaXBwYWJsZSgpLmNhbGwoTWluZXNEaXNwbGF5LnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmVzRGlzcGxheTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBGWF9EVVJBVElPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5GWF9EVVJBVElPTixcclxuICAgIERJR0lUU19NQVggPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuRElHSVRTLFxyXG4gICAgT1VUX09GX1JBTkdFID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLk9VVF9PRl9SQU5HRSxcclxuICAgIEZsaXBwYWJsZSA9IHJlcXVpcmUoJy4vbGliL2ZsaXBwYWJsZScpO1xyXG5cclxuZnVuY3Rpb24gU2NvcmVib2FyZChzY29yZSwgZWwpIHtcclxuICAgIHRoaXMuc2NvcmUgPSBzY29yZSB8fCAwO1xyXG4gICAgdGhpcy5pbml0aWFsID0gc2NvcmU7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcjc2MxJyk7XHJcbiAgICB0aGlzLiRNID0gdGhpcy4kZWwuZmluZCgnI3NjMicpO1xyXG4gICAgdGhpcy4kUiA9IHRoaXMuJGVsLmZpbmQoJyNzYzMnKTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmluaXRpYWwpO1xyXG59XHJcblxyXG5TY29yZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTY29yZWJvYXJkLFxyXG4gICAgX2luY3JlbWVudDogZnVuY3Rpb24oY2hpcHMpIHtcclxuICAgICAgICBjaGlwcy5mb3JFYWNoKGZ1bmN0aW9uKGNoaXApIHsgdGhpcy5fZmxpcChjaGlwWzBdLCBjaGlwWzFdKTsgfSwgdGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwb2ludHMpIHtcclxuICAgICAgICBpZiAoIXBvaW50cykgcmV0dXJuO1xyXG4gICAgICAgIHZhciBwdHMgPSB0b1N0cmluZ0FycmF5KHBvaW50cyk7XHJcbiAgICAgICAgdGhpcy5faW5jcmVtZW50KFtbdGhpcy4kUiwgcHRzWzJdXSwgW3RoaXMuJE0sIHB0c1sxXV0sIFt0aGlzLiRMLCBwdHNbMF1dXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5GbGlwcGFibGUoeyBkdXJhdGlvbjogRlhfRFVSQVRJT04gfSkuY2FsbChTY29yZWJvYXJkLnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3JlYm9hcmQ7XHJcblxyXG5mdW5jdGlvbiB0b1N0cmluZ0FycmF5KG4pIHtcclxuICAgIHZhciBudW0gPSBTdHJpbmcobiksXHJcbiAgICAgICAgbGVuID0gbnVtLmxlbmd0aDtcclxuXHJcbiAgICAvLyB0b28gYmlnIGZvciAqdGhpcyogc2NvcmVib2FyZC4uLlxyXG4gICAgaWYgKGxlbiA+IERJR0lUU19NQVgpIHtcclxuICAgICAgICBudW0gPSBPVVRfT0ZfUkFOR0U7XHJcbiAgICAgICAgbGVuID0gT1VUX09GX1JBTkdFLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWyBudW1bbGVuIC0gM10gfHwgXCIwXCIsIG51bVtsZW4gLSAyXSB8fCBcIjBcIiwgbnVtW2xlbiAtIDFdIHx8IFwiMFwiIF07XHJcbn0iLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBQb2ludHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JpbmdSdWxlcyxcclxuICAgIFNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yID0gcmVxdWlyZSgnLi9lcnJvcnMnKS5TY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIFNjb3Jla2VlcGVyKGdhbWVib2FyZCkge1xyXG5cclxuXHJcbiAgdGhpcy5jYWxsYmFja3MgPSB7XHJcbiAgICB1cDogZnVuY3Rpb24ocHRzKSB7XHJcbiAgICAgIHRoaXMuc2NvcmUgKz0gcG9zKHB0cyk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uKHB0cykge1xyXG4gICAgICB0aGlzLnNjb3JlID0gKHRoaXMuc2NvcmUgLSBuZWcocHRzKSA8PSAwKSA/IDAgOiB0aGlzLnNjb3JlIC0gbmVnKHB0cyk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHRoaXMuZmluYWxpemVycyA9IHtcclxuICAgIGZvck9wZW5pbmdTcXVhcmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgbW92ZXMgPSBnYW1lYm9hcmQudXNlck1vdmVzLFxyXG4gICAgICAgICAgICB1bm1pbmVkID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpIC0gZ2FtZWJvYXJkLm1pbmVzO1xyXG4gICAgICAgIHJldHVybiAxIC0gKH5+KG1vdmVzIC8gdW5taW5lZCkgKiAxMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yVGltZVBhc3NlZDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIHRvdGFsID0gZ2FtZWJvYXJkLmNsb2NrLm1heCwgZWxhcHNlZCA9IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzO1xyXG4gICAgICAgIHJldHVybiAxMDAgLSB+fihlbGFwc2VkIC8gdG90YWwgKiAxMDApO1xyXG4gICAgfSxcclxuICAgIGZvckZld2VzdE1vdmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICAvLyBleHBlcmltZW50YWw6IHNxcnQoeF4yIC0geSkgKiAxMFxyXG4gICAgICAgIHZhciBkaW1zID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpO1xyXG4gICAgICAgIHJldHVybiB+fihNYXRoLnNxcnQoZGltcyAtIGdhbWVib2FyZC51c2VyTW92ZXMpICogUG9pbnRzLlVTRVJNT1ZFU19NVUxUSVBMSUVSKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0aGlzLnF1ZXVlID0gW107XHJcbiAgdGhpcy5maW5hbCA9IFtdO1xyXG5cclxuICAvLyBUT0RPOiB3ZWFuIHRoaXMgY2xhc3Mgb2ZmIGRlcGVuZGVuY3kgb24gZ2FtZWJvYXJkXHJcbiAgLy8gc2hvdWxkIG9ubHkgbmVlZCB0byBoYXZlIGN0b3IgaW5qZWN0ZWQgd2l0aCB0aGUgZ2FtZWJvYXJkJ3MgZW1pdHRlclxyXG4gIHRoaXMuZ2FtZWJvYXJkID0gZ2FtZWJvYXJkO1xyXG4gIHRoaXMuZW1pdHRlciA9IGdhbWVib2FyZC5lbWl0dGVyO1xyXG4gIHRoaXMuc2NvcmUgPSAwO1xyXG5cclxuICB0aGlzLm5zdSA9IHRoaXMuX2RldGVybWluZVNpZ25pZmljYW50VW5pdCgpO1xyXG4gIHRoaXMuZW5kR2FtZSA9IGZhbHNlOyAvLyBpZiBnYW1lIGlzIG5vdyBvdmVyLCBmbHVzaCBxdWV1ZXNcclxuICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwodGhpcy5fdGljay5iaW5kKHRoaXMpLCB0aGlzLm5zdSk7XHJcblxyXG4gIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcG9zKHB0cykgeyByZXR1cm4gTWF0aC5hYnMoK3B0cykgfHwgMDsgfVxyXG5mdW5jdGlvbiBuZWcocHRzKSB7IHJldHVybiAtMSAqIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuXHJcblNjb3Jla2VlcGVyLnByb3RvdHlwZSA9IHtcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIEVWRU5UUyA9IHtcclxuICAgICAgICAnc3E6b3Blbic6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy51cChzcXVhcmUuZ2V0RGFuZ2VyKCkgKiBQb2ludHMuREFOR0VSX0lEWF9NVUxUSVBMSUVSKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwKFBvaW50cy5CTEFOS19TUVVBUkVfUFRTKTtcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAnc3E6ZmxhZyc6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZFVwKFBvaW50cy5GTEFHX01JTkVEKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVycmVkRG93bihQb2ludHMuTUlTRkxBR19VTk1JTkVEICsgKHNxdWFyZS5nZXREYW5nZXIoKSB8fCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ3NxOnVuZmxhZyc6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZERvd24oUG9pbnRzLlVORkxBR19NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZFVwKFBvaW50cy5NSVNVTkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdnYjpzdGFydCc6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgfSxcclxuICAgICAgICAnZ2I6ZW5kOndpbic6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9LFxyXG4gICAgICAgICdnYjplbmQ6b3Zlcic6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9LFxyXG4gICAgICAgICdnYjplbmQ6dGltZWRvdXQnOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgdGhpcy5lbmRHYW1lID0gdHJ1ZTsgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZm9yICh2YXIgZXZlbnQgaW4gRVZFTlRTKVxyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbihldmVudCwgRVZFTlRTW2V2ZW50XS5iaW5kKHRoaXMpKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX2JpbmFyeVNlYXJjaDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSA+PiAxKTtcclxuICAgICAgICAgICAgaWYgKHgudGltZSA8IHRoaXMucXVldWVbbWlkXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgaGkgPSBtaWQ7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxvID0gbWlkICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvO1xyXG4gICAgfSxcclxuICAgIF9lbnF1ZXVlOiBmdW5jdGlvbih4KSB7IHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSh0aGlzLl9iaW5hcnlTZWFyY2goeCksIDAsIHgpOyB9LFxyXG4gICAgX3Byb2Nlc3NFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmNhbGxiYWNrc1tldmVudC50eXBlXTtcclxuICAgICAgICBpZiAoZm4gIT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIChmbi5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgPyBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cywgZnVuY3Rpb24oZXJyKSB7IGlmICghZXJyKSByZXR1cm4gdm9pZCAwOyB9KVxyXG4gICAgICAgICAgICAgICAgOiBjb25zb2xlLmxvZyhcIjxkZWZlcnJlZCBzY29yZSBldmVudDogJW8+IDpvbGQgPT4gWyVvXVwiLCBldmVudC50eXBlLCB0aGlzLnNjb3JlKSxcclxuICAgICAgICAgICAgICAgICAgZm4uY2FsbCh0aGlzLCBldmVudC5wdHMpLFxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIi4uLjpuZXcgPT4gWyVvXVwiLCB0aGlzLnNjb3JlKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IoXCJTY29yZWtlZXBlciBjb3VsZCBub3QgZmluZCBmdW5jdGlvbiB7MH1cIiwgZXZlbnQudHlwZSk7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF9wcm9jZXNzRmluYWxpemVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZm9yICh2YXIgdmlzaXRvciBpbiB0aGlzLmZpbmFsaXplcnMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCI8ZmluYWxpemVyOiAlbz4gOm9sZCBbJW9dID0+IDpuZXcgWyVvXS4uLiBcIiwgdmlzaXRvciwgdGhpcy5zY29yZSwgKHRoaXMuc2NvcmUgKz0gdGhpcy5maW5hbGl6ZXJzW3Zpc2l0b3JdKHRoaXMuZ2FtZWJvYXJkKSkpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLnNjb3JlICs9IHZpc2l0b3IodGhpcy5nYW1lYm9hcmQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmZpbmFsLmZvckVhY2goZnVuY3Rpb24oZikgeyB0aGlzLnNjb3JlICs9IGY7IH0sIHRoaXMpO1xyXG4gICAgICAgIC8vIGZpbmFsIHVwZGF0ZSBvZiB0aGUgc2NvcmVcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZTpmaW5hbFwiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBfdGljazogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGN1cnJJZHggPSB0aGlzLl9iaW5hcnlTZWFyY2goeyB0aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSB9KSwgaW5kZXggPSAwO1xyXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGN1cnJJZHgpIHtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7IHRoaXMuX3Byb2Nlc3NFdmVudCh0aGlzLnF1ZXVlW2luZGV4XSk7IHJldHVybiBpbmRleCArPSAxOyB9LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSgwLCBjdXJySWR4KTtcclxuICAgIH0sXHJcbiAgICBfYWRkU2NvcmVUb1F1ZXVlOiBmdW5jdGlvbih0eXBlLCBwdHMpIHsgcmV0dXJuIHRoaXMuX2VucXVldWUoeyB0aW1lOiAoKCtuZXcgRGF0ZSkgKyB0aGlzLm5zdSksIHR5cGU6IHR5cGUsIHB0czogcHRzIH0pOyB9LFxyXG5cclxuICAgIHVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5jYWxsYmFja3MudXAuY2FsbCh0aGlzLCBwdHMpOyB9LFxyXG4gICAgZG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuY2FsbGJhY2tzLmRvd24uY2FsbCh0aGlzLCBwdHMpOyB9LFxyXG5cclxuICAgIGRlZmVycmVkVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJ1cFwiLCBwb3MocHRzKSk7IH0sXHJcbiAgICBkZWZlcnJlZERvd246IGZ1bmN0aW9uKHB0cykgeyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJkb3duXCIsIG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBmaW5hbFVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKHBvcyhwdHMpKTsgfSxcclxuICAgIGZpbmFsRG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuZmluYWwucHVzaChuZWcocHRzKSk7IH0sXHJcblxyXG4gICAgZ2V0UGVuZGluZ1Njb3JlQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5xdWV1ZS5sZW5ndGg7IH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCJDbGVhcmluZyBvdXQgcmVtYWluaW5nIHF1ZXVlIVwiKTtcclxuICAgICAgdGhpcy5xdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IHRoaXMuX3Byb2Nlc3NFdmVudChldmVudCk7IH0sIHRoaXMpO1xyXG5cclxuICAgICAgdGhpcy5fcHJvY2Vzc0ZpbmFsaXplcnMoKTtcclxuXHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkZJTkFMIFNDT1JFOiAlb1wiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcbiAgICAgIHRoaXMucXVldWUubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5maW5hbC5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVrZWVwZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgU2VyaWFsaXplciA9IHtcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgX21ldGE6IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogK25ldyBEYXRlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5zY29yZSxcclxuICAgICAgICAgICAgICAgIHRpbWVyOiBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzOiBnYW1lYm9hcmQuZW1pdHRlci5fdHJhbnNjcmlwdHMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICB1c2VyOiB7fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAkZWw6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBib2FyZDogZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSxcclxuICAgICAgICAgICAgICAgIHNjb3Jla2VlcGVyOiB7IHF1ZXVlOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIucXVldWUsIGZpbmFsOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIuZmluYWwgfSxcclxuICAgICAgICAgICAgICAgIGZsYXNoQ29udGFpbmVyOiBnYW1lYm9hcmQuZmxhc2hDb250YWluZXIuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICB0aGVtZTogZ2FtZWJvYXJkLnRoZW1lLFxyXG4gICAgICAgICAgICAgICAgZGVidWdfbW9kZTogZ2FtZWJvYXJkLmRlYnVnX21vZGUsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBnYW1lYm9hcmQuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIG1pbmVzOiBnYW1lYm9hcmQubWluZXMsXHJcbiAgICAgICAgICAgICAgICB1c2VyTW92ZXM6IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgICAgICBpc01vYmlsZTogZ2FtZWJvYXJkLmlzTW9iaWxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIGltcG9ydDogZnVuY3Rpb24oZXhwb3J0ZWQpIHtcclxuICAgICAgICAvLyAxLiBuZXcgR2FtZWJvYXJkIG9iamVjdCAoZGVmYXVsdHMgaXMgb2spXHJcbiAgICAgICAgLy8gMi4gcmVwbGFjZSBgYm9hcmRgIHdpdGggbmV3IE11bHRpbWFwOlxyXG4gICAgICAgIC8vICAgICAtIGNvdW50IGFycmF5cyBhdCBmaXJzdCBsZXZlbCBpbiBib2FyZCBmb3IgbnVtIHJvd3NcclxuICAgICAgICAvLyAgICAgICAgICBbW1t7XCJyb3dcIjowLFwiY2VsbFwiOjAsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMTAwMFwifSxcImRhbmdlclwiOjB9LFxyXG4gICAgICAgIC8vICAgICAgICAgIHtcInJvd1wiOjAsXCJjZWxsXCI6MixcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIwMDEwXCJ9fV1dXVxyXG4gICAgICAgIC8vICAgICAtIHBhcnNlIGVhY2ggb2JqZWN0IHRvIGNyZWF0ZSBuZXcgU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBfZmxhZ3MpXHJcbiAgICAgICAgLy8gMy4gJGVsID0gJChleHBvcnRlZC4kZWwpXHJcbiAgICAgICAgLy8gNC4gZmxhc2hDb250YWluZXIgPSAkKGV4cG9ydGVkLmZsYXNoQ29udGFpbmVyKVxyXG4gICAgICAgIC8vIDUuIHRoZW1lID0gZXhwb3J0ZWQudGhlbWVcclxuICAgICAgICAvLyA2LiBkZWJ1Z19tb2RlID0gZXhwb3J0ZWQuZGVidWdfbW9kZVxyXG4gICAgICAgIC8vIDcuIGRpbWVuc2lvbnMgPSBleHBvcnRlZC5kaW1lbnNpb25zXHJcbiAgICAgICAgLy8gOC4gbWluZXMgPSBnYW1lYm9hcmQubWluZXNcclxuICAgICAgICAvLyA5LiB1c2VyTW92ZXMgPSBnYW1lYm9hZC51c2VyTW92ZXMsIGFuZCBpc01vYmlsZVxyXG4gICAgICAgIC8vIDEwLiBtYWtlIG5ldyBDb3VudGRvd24gd2l0aCBleHBvcnRlZC5fbWV0YS50aW1lciA9IHNlY29uZHMsIGNsb2NrLnN0YXJ0KClcclxuICAgICAgICAvLyAxMS4gaW5zdGFudGlhdGUgbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIsIGxvYWRpbmcgX21ldGEudHJhbnNjcmlwdHMgaW50byBpdHMgX3RyYW5zY3JpcHRzXHJcbiAgICAgICAgLy8gMTIuIHJlLXJ1biB0aGUgaW50ZXJuYWwgaW5pdCgpIG9wczogX2xvYWRCb2FyZCwgX3JlbmRlckdyaWRcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZXJpYWxpemVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvYml0LWZsYWctZmFjdG9yeScpLFxyXG4gICAgU3ltYm9scyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU3ltYm9scyxcclxuICAgIEZsYWdzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5GbGFncyxcclxuXHJcbiAgICBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbIEZsYWdzLk9QRU4sIEZsYWdzLk1JTkVELCBGbGFncy5GTEFHR0VELCBGbGFncy5JTkRFWEVEIF0pO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBmbGFncykge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBmbGFncyA/IG5ldyBCaXRGbGFncyhmbGFncykgOiBuZXcgQml0RmxhZ3M7XHJcbiAgICB0aGlzLmRhbmdlciA9IChkYW5nZXIgPT0gK2RhbmdlcikgPyArZGFuZ2VyIDogMDtcclxuXHJcbiAgICBpZiAodGhpcy5kYW5nZXIgPiAwKSB0aGlzLmluZGV4KCk7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU3F1YXJlLFxyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyBpZiAoaWR4ID09ICtpZHgpIHsgdGhpcy5kYW5nZXIgPSAraWR4OyB0aGlzLmRhbmdlciA+IDAgJiYgdGhpcy5pbmRleCgpOyB9IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICB1bm1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWEVEKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNGbGFnZ2VkKCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpOyB9LFxyXG4gICAgaXNJbmRleGVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNJbmRleGVkKCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxudmFyIFRoZW1lU3R5bGVyID0ge1xyXG5cdHNldDogZnVuY3Rpb24odGhlbWUsICRlbCkge1xyXG5cclxuXHRcdCRlbCB8fCAoJGVsID0gJCgkQy5EZWZhdWx0Q29uZmlnLmJvYXJkKSk7XHJcblxyXG5cdFx0dmFyIHRoZW1lRmlsZSA9ICRDLlRoZW1lc1t0aGVtZV0sXHJcblx0XHRcdCRib2R5ID0gJGVsLnBhcmVudHMoXCJib2R5XCIpLmxlbmd0aCA/ICRlbC5wYXJlbnRzKFwiYm9keVwiKSA6ICQoZG9jdW1lbnQuYm9keSk7XHJcblxyXG5cdFx0JGJvZHkucmVtb3ZlQ2xhc3MoKS5hZGRDbGFzcyh0aGVtZUZpbGUpO1xyXG5cdFx0LyogLFxyXG5cdFx0XHQkaGVhZCA9ICRlbC5wYXJlbnRzKFwiYm9keVwiKS5zaWJsaW5ncyhcImhlYWRcIiksXHJcblx0XHRcdCRzdHlsZXMgPSAkaGVhZC5maW5kKFwibGlua1wiKSxcclxuXHJcblx0XHRcdGhhc1ByZUV4aXN0aW5nID0gZnVuY3Rpb24oc3R5bGVzaGVldHMpIHtcclxuXHRcdFx0XHRyZXR1cm4gISFzdHlsZXNoZWV0cy5maWx0ZXIoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gISF+JCh0aGlzKS5hdHRyKCdocmVmJykuaW5kZXhPZih0aGVtZUZpbGUpO1xyXG5cdFx0XHRcdH0pLmxlbmd0aFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQvLyBidWlsZCBhIG5ldyA8bGluaz4gdGFnIGZvciB0aGUgZGVzaXJlZCB0aGVtZSBzdHlsZXNoZWV0OlxyXG5cdFx0XHQkbGluayA9ICQoXCI8bGluayAvPlwiLCB7XHJcblx0XHRcdFx0cmVsOiAnc3R5bGVzaGVldCcsXHJcblx0XHRcdFx0dHlwZTogJ3RleHQvY3NzJyxcclxuXHRcdFx0XHRocmVmOiAnY3NzLycgKyB0aGVtZUZpbGUgKyAnLmNzcydcclxuXHRcdFx0fSk7XHJcblx0XHQvLyB1c2luZyAkZWwgYXMgYW5jaG9yIHRvIHRoZSBET00sIGdvIHVwIGFuZFxyXG5cdFx0Ly8gbG9vayBmb3IgbGlnaHQuY3NzIG9yIGRhcmsuY3NzLCBhbmQtLWlmIG5lY2Vzc2FyeS0tc3dhcFxyXG5cdFx0Ly8gaXQgb3V0IGZvciBgdGhlbWVgLlxyXG5cdFx0Ly8gQWRkICRsaW5rIGlmZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3QhXHJcblx0XHRpZiAoIWhhc1ByZUV4aXN0aW5nKCRzdHlsZXMpKVxyXG5cdFx0XHQkc3R5bGVzLmFmdGVyKCRsaW5rKTsqL1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGhlbWVTdHlsZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG5mdW5jdGlvbiBUaW1lcihpbml0aWFsLCBtYXgsIGlzQ291bnRkb3duLCBlbWl0dGVyKSB7XHJcbiAgICB0aGlzLmlzQ291bnRkb3duID0gaXNDb3VudGRvd247XHJcbiAgICB0aGlzLnNlY29uZHMgPSB0aGlzLmlzQ291bnRkb3duID8gbWF4IDogaW5pdGlhbDtcclxuICAgIHRoaXMuaW5pdGlhbCA9IGluaXRpYWw7XHJcbiAgICB0aGlzLm1heCA9IG1heDtcclxuXHJcbiAgICB0aGlzLmVtaXR0ZXIgPSBlbWl0dGVyO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcblRpbWVyLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBUaW1lcixcclxuICAgIF9yZW5kZXJJbml0aWFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgYXJyID0gdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpO1xyXG4gICAgICAgIHRoaXMuX3B1Ymxpc2goYXJyWzBdIHx8IDAsIGFyclsxXSB8fCAwKTtcclxuICAgIH0sXHJcbiAgICBfdG9NaW5zU2VjczogZnVuY3Rpb24oc2Vjcykge1xyXG4gICAgICAgIHZhciBtaW5zID0gfn4oc2VjcyAvIDYwKSxcclxuICAgICAgICAgICAgc2VjcyA9IH5+KHNlY3MgJSA2MCk7XHJcbiAgICAgICAgcmV0dXJuIFttaW5zLCBzZWNzXTtcclxuICAgIH0sXHJcbiAgICBfY291bnRkb3duOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgdGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5mcmVlemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaXNDb3VudGRvd24gJiYgdGhpcy5zZWNvbmRzID4gMCkgfHwgKCF0aGlzLmlzQ291bnRkb3duICYmIHRoaXMuc2Vjb25kcyA8IHRoaXMubWF4KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wdWJsaXNoKFwiY2hhbmdlXCIsIGFyclswXSwgYXJyWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0NvdW50ZG93biA/IHRoaXMuc2Vjb25kcy0tIDogdGhpcy5zZWNvbmRzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3B1Ymxpc2goXCJlbmRcIiwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgMTAwMCk7XHJcbiAgICB9LFxyXG4gICAgX3B1Ymxpc2g6IGZ1bmN0aW9uKGV2ZW50LCBtaW5zLCBzZWNzKSB7IHRoaXMuZW1pdHRlci50cmlnZ2VyKFwidGltZXI6XCIgKyBldmVudCwgbWlucywgc2Vjcyk7IH0sXHJcbiAgICBnZXRNaW51dGVzOiBmdW5jdGlvbigpIHsgcmV0dXJuICt0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcylbMF07IH0sXHJcbiAgICBnZXRTZWNvbmRzOiBmdW5jdGlvbigpIHsgcmV0dXJuICt0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcylbMV07IH0sXHJcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5mcmVlemUgPSBmYWxzZTtcclxuICAgICAgICB2YXIgdCA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICB0aGlzLl9wdWJsaXNoKFwic3RhcnRcIiwgdFswXSwgdFsxXSk7XHJcbiAgICAgICAgdGhpcy5fY291bnRkb3duKCk7XHJcbiAgICB9LFxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5mcmVlemUgPSB0cnVlO1xyXG4gICAgICAgIHZhciB0ID0gdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpO1xyXG4gICAgICAgIHRoaXMuX3B1Ymxpc2goXCJzdG9wXCIsIHRbMF0sIHRbMV0pO1xyXG4gICAgfSxcclxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnNlY29uZHMgPSAwO1xyXG4gICAgICAgIHRoaXMuX3B1Ymxpc2goXCJyZXNldFwiLCAwLCAwKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGltZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vbGliL2VtaXR0ZXInKSxcclxuICAgIFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHJlcXVpcmUoJy4vdHJhbnNjcmlwdGlvbi1zdHJhdGVneScpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNjcmliaW5nRW1pdHRlcihzdHJhdGVneSkge1xyXG4gICAgRW1pdHRlci5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5fdHJhbnNjcmlwdHMgPSBbXTtcclxuICAgIHRoaXMuX3N0cmF0ZWd5ID0gKHN0cmF0ZWd5ICYmIHN0cmF0ZWd5LmFwcGx5KSA/IHN0cmF0ZWd5IDogVHJhbnNjcmlwdGlvblN0cmF0ZWd5O1xyXG59XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW1pdHRlci5wcm90b3R5cGUpO1xyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5fX3RyaWdnZXJfXyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXI7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbigvKiBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAvLyBzZW5kIG9yaWdpbmFsIHBhcmFtcyB0byB0aGUgc3Vic2NyaWJlcnMuLi5cclxuICAgIHRoaXMuX190cmlnZ2VyX18uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAvLyAuLi50aGVuIGFsdGVyIHRoZSBwYXJhbXMgZm9yIHRoZSB0cmFuc2NyaXB0J3MgcmVjb3Jkc1xyXG4gICAgdmFyIHRzY3JpcHQgPSB0aGlzLl9zdHJhdGVneS5hcHBseShhcmdzKTtcclxuICAgIHRzY3JpcHQgJiYgdGhpcy5fdHJhbnNjcmlwdHMucHVzaCh0c2NyaXB0KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNjcmliaW5nRW1pdHRlcjsiLCJcInVzZSBzdHJpY3Q7XCJcblxudmFyIERlZmF1bHRUcmFuc2NyaXB0aW9uU3RyYXRlZ3kgPSB7XG4gICAgICAgIGFwcGx5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBkYXRhWzBdKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChkYXRhWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTpvcGVuXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTpjbG9zZVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6ZmxhZ1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6dW5mbGFnXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTptaW5lXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdGFuZGFyZCBTcXVhcmUtYmFzZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDA6IGV2ZW50IG5hbWUsIDE6IFNxdWFyZSBpbnN0YW5jZSwgMjogalF1ZXJ5LXdyYXBwZWQgRE9NIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiU3F1YXJlXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsxXSA9IEpTT04uc3RyaW5naWZ5KGRhdGFbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbMl0gaW5zdGFuY2VvZiBqUXVlcnkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsyXSA9IGJ1aWxkRE9NU3RyaW5nKGRhdGFbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjpzdGFydFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6ZW5kOndpblwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6ZW5kOm92ZXJcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDp0aW1lZG91dFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RhbmRhcmQgR2FtZWJvYXJkLWJhc2VkIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk11bHRpbWFwXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsxXSA9IEpTT04uc3RyaW5naWZ5KGRhdGFbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNjb3JlOmNoYW5nZVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic2NvcmU6Y2hhbmdlOmZpbmFsXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGltZXI6c3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpbWVyOnN0b3BcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpbWVyOmNoYW5nZVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGltZXI6cmVzZXRcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpbWVyOmVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIG5vLW9wXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBwcmVmaXggYXJyYXkgY29udGVudHMgd2l0aCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgaXRzIGtleVxuICAgICAgICAgICAgICAgIGRhdGEgJiYgZGF0YS51bnNoaWZ0KCtuZXcgRGF0ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IERlZmF1bHRUcmFuc2NyaXB0aW9uU3RyYXRlZ3k7XG5cbi8vIFRha2VzIGEgPHRkPiBET00gbm9kZSwgYW5kIGNvbnZlcnRzIGl0IHRvIGFcbi8vIHN0cmluZyBkZXNjcmlwdG9yLCBlLmcuLCBcInRyI3JvdzAgdGQuY2VsbDAubWluZWQuY2xvc2VkXCIuXG5mdW5jdGlvbiBidWlsZERPTVN0cmluZygkZWwpIHtcbiAgICB2YXIgbm9kZSA9ICRlbCBpbnN0YW5jZW9mIGpRdWVyeSA/ICRlbFswXSA6ICRlbCxcbiAgICAgICAgLy8gc29ydHMgY2xhc3MgbmFtZXMsIHB1dHRpbmcgdGhlIFwiY2VsbFhcIiBjbGFzcyBmaXJzdFxuICAgICAgICBTT1JUX0ZOX0NFTExfRklSU1QgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBpbmNpcGl0KHN0cikgeyByZXR1cm4gc3RyLnN1YnN0cmluZygwLCBcImNlbGxcIi5sZW5ndGgpLnRvTG93ZXJDYXNlKCk7IH07XG4gICAgICAgICAgICByZXR1cm4gKGluY2lwaXQoYSkgPT09IFwiY2VsbFwiIHx8IGluY2lwaXQoYikgPT09IFwiY2VsbFwiIHx8IGEgPiBiKSA/IDEgOiAoYSA8IGIpID8gLTEgOiAwO1xuICAgICAgICB9O1xuICAgIHJldHVybiBub2RlLnBhcmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICsgXCIjXCIgKyBub2RlLnBhcmVudE5vZGUuaWQgKyBcIiBcIlxuICAgICAgICArIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpICsgXCIuXCJcbiAgICAgICAgKyBub2RlLmNsYXNzTmFtZS5zcGxpdCgnICcpXG4gICAgICAgIC5zb3J0KFNPUlRfRk5fQ0VMTF9GSVJTVClcbiAgICAgICAgLmpvaW4oJy4nKTtcbn1cbiIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcclxuICAgIFZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3JzJykuVmFsaWRhdGlvbkVycm9yLFxyXG4gICAgLy8gdmFsaWRhdGlvbiBoZWxwZXIgZm5zXHJcbiAgICBpc051bWVyaWMgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICByZXR1cm4gU3RyaW5nKHZhbCkucmVwbGFjZSgvLC9nLCAnJyksICh2YWwubGVuZ3RoICE9PSAwICYmICFpc05hTigrdmFsKSAmJiBpc0Zpbml0ZSgrdmFsKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIFZhbGlkYXRvcnMgPSB7XHJcbiAgICAgICAgQm9hcmREaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbihkaW0pIHtcclxuICAgICAgICAgICAgICAgIC8vIGlzIG51bWVyaWMgaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmICghaXNOdW1lcmljKGRpbSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgbm90IGEgbnVtYmVyLCBhbmQgYW4gaW52YWxpZCBib2FyZCBkaW1lbnNpb24uXCIsIGRpbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGdyZWF0ZXIgdGhhbiBNQVhfRElNRU5TSU9OUyBjb25zdGFudFxyXG4gICAgICAgICAgICAgICAgaWYgKCEoZGltIDw9ICRDLk1BWF9HUklEX0RJTUVOU0lPTlMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIGdyZWF0ZXIgdGhhbiB0aGUgZ2FtZSdzIG1heGltdW0gZ3JpZCBkaW1lbnNpb25zXCIsICtkaW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UuLi5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBNaW5lQ291bnQ6IHtcclxuICAgICAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uKG1pbmVzLCBtYXhQb3NzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMobWluZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgbnVtYmVyIG9mIG1pbmVzLlwiLCBtaW5lcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGdyZWF0ZXIgdGhhbiBtYXhQb3NzaWJsZSBmb3IgdGhpcyBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAobWluZXMgPiBtYXhQb3NzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcyAoezF9KS5cIiwgK21pbmVzLCBtYXhQb3NzaWJsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gbXVzdCBoYXZlIGF0IGxlYXN0IG9uZSBtaW5lIVxyXG4gICAgICAgICAgICAgICAgaWYgKG1pbmVzIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJJbnZhbGlkIG1pbmUgY291bnQ6IHBsZWFzZSBjaG9vc2UgYSB2YWx1ZSBiZXR3ZWVuIHswfSBhbmQgezF9LlwiLCAxLCBtYXhQb3NzaWJsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvcnM7Il19
;