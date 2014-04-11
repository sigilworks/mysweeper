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
            gameOptions.timer = PresetSetups[setup].timer;
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
},{"./constants":3,"./gameboard":7,"./validators":24}],2:[function(require,module,exports){
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
        return values.reduce(function(str, row, idx) {
            return str += fn(row).join(this.COL_SPACING).toLowerCase() + this._displayRowNum(idx)
        }.bind(this), '\n');
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
        var ctx = this,
            transformer = function(row) {
                return row.map(function(sq) {
                    return (sq.isMined())
                        ? this.MINED_SQUARE : sq.getDanger() === 0
                            ? this.BLANK_SQUARE : sq.getDanger(); }, ctx)
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
        BEGINNER:       { dimensions:  9, mines:  9, timer: 100 },
        INTERMEDIATE:   { dimensions: 12, mines: 21, timer: 300 },
        EXPERT:         { dimensions: 15, mines: 67, timer: 600 }
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

// TODO: refactor to not need the `gameboard` dependency,
//       can just export a map of danger indices
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
                var totalMines = 0,
                    directions = Object.keys(this.neighborhood);

                directions.forEach(function(direction) {
                    var vert = this.neighborhood[direction][0],
                        horiz = this.neighborhood[direction][1],
                        neighbor = this.board.getSquareAt(row + vert, cell + horiz);

                    if (neighbor && neighbor.isMined()) totalMines++;
                }, this);
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
    Scoreboard = require('./scoreboard'),
    _extend = require('./lib/utils')._extend;

// wrapper around `$log`, to toggle dev mode debugging
var $log = function $log() { if ($log.debug_mode || false) console.log.apply(console, arguments); }

function Gameboard(options) {
    // fill in any blanks in the user's game options
    // with our sensible defaults:
    this.settings = _extend(DEFAULT_GAME_OPTIONS, options);
    // fork construction of this Gameboard instance,
    // depending on whether or not it's a new game,
    // or being rehydrated from a previous, persisted game:
    if (!this.settings.isPersisted) {
        // the map, serving as the internal represenation of the gameboard
        this.board = new Multimap;
        // the dimensions of the board when rendered
        this.dimensions = +this.settings.dimensions;
        // the number of mines the user has selected
        this.mines = +this.settings.mines;
        // the DOM element of the table serving as the board
        this.$el = $(this.settings.board);
        // is custom or preset game?
        this.isCustom = this.settings.isCustom || false;
        // the event transcriber for playback and persistence
        this.emitter = new TranscribingEmitter(TranscriptionStrategy);
        // selectively enable debug mode for console visualizations and notifications
        this.debug_mode = this.settings.debug_mode;
        // specifies the desired color theme or skin
        this.theme = this._setColorTheme(this.settings.theme);
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
        // add in the countdown clock...
        this.clock = new Timer(0, +this.settings.timer || this._determineTimer(), this.settings.isCountdown, this.emitter);
        this.countdown = new Countdown("#countdown");
        // create the scorekeeping object
        this.scorekeeper = new Scorekeeper(this);
        // create the actual scoreboard view
        this.scoreboard = new Scoreboard(0, "#score-display");
    } else {
        console.log("RESUMING IMPORTED GAME: %o", this.settings);
        this.import(this.settings);
    }

    // turn on dev logger, if needed
    $log.debug_mode = this.debug_mode;
    // create the board in memory and assign values to the squares
    this._loadBoard();
    // render the HTML to match the board in memory
    this._renderGrid();
    // trigger event for game to begin...
    this.emitter.trigger(this.settings.isPersisted ? 'gb:restart' : 'gb:start', this.board, this.$el.selector);
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
        // display the current version of the game:
        $(".version").html(VERSION);
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
        var locs = new MineLayer(mines, dimensions);
        locs.forEach(function(loc) { this.getSquareAt(loc[0], loc[1]).mine(); }, this);
    },
    _precalcDangerIndices: function() {
        this.board.values()
            .reduce(function(acc, val) { return acc.concat(val.filter(function(sq) { return !sq.isMined(); })); }, [])
            .forEach(function(safe) { safe.setDanger(this.dangerCalc.forSquare(safe.getRow(), safe.getCell())); }, this);
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
        } else
            this.$el.on({
                click: this._handleClick.bind(this),
                contextmenu: this._handleRightClick.bind(this)
            }, 'td, td > span');

        /*  FOR DEV USE ONLY --------------------------------------------------  */
        // INDIVIDUAL SQUARE EVENTS
        /*this.emitter.on('sq:open', function(square, cell) { $log("Opening square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:flag', function(square, cell) { $log("Flagging square at (%o, %o).", square.getRow(), square.getCell()); });
        this.emitter.on('sq:unflag', function(square, cell) { $log("Unflagging square at (%o, %o).", square.getRow(), square.getCell()); });*/
        // GAMEBOARD-WIDE EVENTS
        this.emitter.on('gb:start', function(ename, gameboard, $el) { $log("Let the game begin!", arguments); });
        this.emitter.on('gb:resume', function(ename, gameboard, $el) { $log("Let the game resume!", arguments); });
        this.emitter.on('gb:pause', function(ename, gameboard, $el) { $log("Let the game be paused!", arguments); });
        this.emitter.on('gb:end:win', function(ename, gameboard, $el) { $log("Game over! You win!"); });
        this.emitter.on('gb:end:over', function(ename, gameboard, $el) { $log("Game over! You're dead!"); });
        this.emitter.on('gb:end:timedout', function(ename, gameboard, $el) { $log("Game over! You're outta time!"); });
        /*  ----------------------------------------------------------------------  */

        // wires up the scoreboard view object to the events received from the scorekeeper
        this.emitter.on('score:change score:change:final', function() { this.scoreboard.update(this.scorekeeper.score); }.bind(this));
        this.emitter.on('timer:start timer:stop timer:change timer:reset timer:end', function(mins, secs) { this.countdown.update(mins, secs); }.bind(this));
        this.emitter.on('timer:end', function() { this._gameTimedOut(); }.bind(this));
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
            cell = source.getCell();

        directions.forEach(function(direction) {
            var vert = this.dangerCalc.neighborhood[direction][0],
                horiz = this.dangerCalc.neighborhood[direction][1],
                neighbor = this.getSquareAt(row + vert, cell + horiz);

            if (neighbor && !neighbor.isMined() && !neighbor.isFlagged() && neighbor.isClosed()) {
                this._openSquare(neighbor);

                if (!neighbor.getDanger() || !neighbor.getDanger() > 0)
                    this._recursiveReveal(neighbor);
            }
        }, this);
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
        // for all flagged squares, remove flag icon
        // and replace with original danger index instead
        // for when it's opened
        this.getSquares()
            .filter(function(sq) { return sq.isFlagged(); })
            .forEach(function(f) {
                this.getGridCell(f).find('.danger').html(f.getDanger());
                this._unflagSquare(f, false);
            }, this);
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
    // import persisted game state
    import: function(options) {  return Serializer.import(options).call(this); },
    // export serialized state to persist game for later
    export: function() { return Serializer.export(this); },
    toJSON: function() { return this.board.values().join(', '); },
    toConsole: function(withDanger) {
        var renderer = ConsoleRenderer.to($log).withValues(this.board.values());
        return (withDanger) ? renderer.viewGame() : renderer.viewMines();
    }
};

module.exports = Gameboard;
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":12,"./lib/utils":13,"./minelayer":14,"./mines-display":15,"./scoreboard":16,"./scorekeeper":17,"./serializer":18,"./square":19,"./theme-styler":20,"./timer":21,"./transcribing-emitter":22,"./transcription-strategy":23}],8:[function(require,module,exports){
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
        return Object.keys(this._table)
                     .map(function(row) { return this._table[row]; }, this)
                     .reduce(function(acc, item) { return acc.concat(item); }, []);
    }},
    clear: { value: function() { this._table = {}; }},
    size: { value: function() { return Object.keys(this._table).length; }}
});

module.exports = Multimap;
},{}],13:[function(require,module,exports){
"use strict";

// do a non-destructive merging of any number of
// javascript hashes/objects
function _extend(base, others) {
	if (!others) return base;

	var args = [].slice.call(arguments, 2),
		_copy = function(old, newer) {
			var keys = Object.keys(newer),
				i = keys.length;
			while (i--)
				old[keys[i]] = newer[keys[i]];
			return old;
		},
		ret = _copy({}, base);

	args.concat(others)
		.forEach(function(other) { ret = _copy(ret, other); });

	return ret;
}

module.exports._extend = _extend;
},{}],14:[function(require,module,exports){
"use strict;"

var LinearCongruentialGenerator = require('./lib/lcgenerator');

function MineLayer(mines, dimensions) {
    this.generator = new LinearCongruentialGenerator;
    this.mines = +mines || 0;
    this.dimensions = +dimensions || 0;

    var rands = [],
        getRandomNumber = function() { return this.generator.rand() * (Math.pow(this.dimensions, 2)) | 0; }.bind(this);

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
},{"./lib/lcgenerator":11}],15:[function(require,module,exports){
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
},{"./lib/flippable":10}],16:[function(require,module,exports){
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
},{"./constants":3,"./lib/flippable":10}],17:[function(require,module,exports){
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
        'gb:resume': function(ename, gameboard, $el) { this.endGame = false; },
        'gb:pause': function(ename, gameboard, $el) { this.endGame = true; },
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
},{"./constants":3,"./errors":6}],18:[function(require,module,exports){
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
                isMobile: gameboard.isMobile,
                // this flag alerts Gameboard constructor to
                // alter usual initialization process...
                isPersisted: true
            }
        };
    },
    import: function(exported) {

        // 1. in this context, `this` is the newly-instantiated,
        //    but not-yet-set-up Gameboard instance.
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

/*      this.board = new Multimap;
        this.dimensions = +this.settings.dimensions;
        this.mines = +this.settings.mines;
        this.$el = $(this.settings.board);
        this.isCustom = this.settings.isCustom || false;
        this.emitter = new TranscribingEmitter(TranscriptionStrategy);
        this.debug_mode = this.settings.debug_mode;
        this.theme = this._setColorTheme(this.settings.theme);
        this.flashContainer = $(MessageOverlay);
        this.isMobile = this._checkForMobile();
        this.userMoves = 0;
        this.dangerCalc = new DangerCalculator(this);
        this.minesDisplay = new MinesDisplay(this.mines, "#mines-display");
        this.clock = new Timer(0, +this.settings.timer || this._determineTimer(), this.settings.isCountdown, this.emitter);
        this.countdown = new Countdown("#countdown");
        this.scorekeeper = new Scorekeeper(this);
        this.scoreboard = new Scoreboard(0, "#score-display");
*/
    }
}

module.exports = Serializer;
},{}],19:[function(require,module,exports){
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
        return Object.keys(Symbols)
                     .filter(function(key) { return this[ 'is' + key.charAt(0) + key.substring(1).toLowerCase() ](); }, this)
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
},{"./constants":3,"./lib/bit-flag-factory":8}],20:[function(require,module,exports){
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
},{"./constants":3}],21:[function(require,module,exports){
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
},{}],22:[function(require,module,exports){
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
},{"./lib/emitter":9,"./transcription-strategy":23}],23:[function(require,module,exports){
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
                    case "gb:resume":
                    case "gb:pause":
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

},{}],24:[function(require,module,exports){
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
},{"./constants":3,"./errors":6}]},{},[1,2,3,4,5,6,7,8,9,10,12,13,14,15,17,18,19,20,21,11,16,24,23,22])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2ZsaXBwYWJsZS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9sY2dlbmVyYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9tdWx0aW1hcC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi91dGlscy5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVsYXllci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVzLWRpc3BsYXkuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zY29yZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGltZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy90cmFuc2NyaWJpbmctZW1pdHRlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3kuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92YWxpZGF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcbiAgICBEaW1WYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5Cb2FyZERpbWVuc2lvbnMsXHJcbiAgICBNaW5lVmFsaWRhdG9yID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykuTWluZUNvdW50LFxyXG4gICAgREVGQVVMVF9DT05GSUcgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICBNQVhfR1JJRF9ESU1FTlNJT05TID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5NQVhfR1JJRF9ESU1FTlNJT05TLFxyXG4gICAgTUlORUFCTEVfU1BBQ0VTX01VTFRJUExJRVIgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSLFxyXG5cclxuICAgIG1pbmVhYmxlU3BhY2VzID0gZnVuY3Rpb24oZGltKSB7IHJldHVybiB+fihNYXRoLnBvdyhkaW0sIDIpICogTUlORUFCTEVfU1BBQ0VTX01VTFRJUExJRVIpOyB9LFxyXG4gICAgZGlzYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCwgdW5kbykge1xyXG4gICAgICAgIGlmICh1bmRvID09IG51bGwpIHVuZG8gPSBmYWxzZTtcclxuICAgICAgICAkZWxbdW5kbyA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnXSgnZGlzYWJsZWQnKTtcclxuICAgICAgICAkZWwuZmluZChcImlucHV0XCIpLnByb3AoJ3JlYWRvbmx5JywgIXVuZG8pO1xyXG4gICAgfSxcclxuICAgIGVuYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCkgeyByZXR1cm4gZGlzYWJsZU9wdGlvbigkZWwsIHRydWUpOyB9O1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cclxuICAgICQoZG9jdW1lbnQuYm9keSkuYWRkQ2xhc3MoREVGQVVMVF9DT05GSUcudGhlbWUudG9Mb3dlckNhc2UoKSk7XHJcblxyXG4gICAgdmFyICRwb3NzaWJsZU1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKSxcclxuICAgICAgICBQUkVTRVRfUEFORUxfU0VMRUNUT1IgPSBcInVsLnByZXNldCA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiLFxyXG4gICAgICAgIENVU1RPTV9QQU5FTF9TRUxFQ1RPUiA9IFwidWwuY3VzdG9tID4gbGk6bm90KDpoYXMobGFiZWxbZm9yJD0nLW1vZGUnXSkpXCI7XHJcblxyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIikuaHRtbChNQVhfR1JJRF9ESU1FTlNJT05TICsgXCIgeCBcIiArIE1BWF9HUklEX0RJTUVOU0lPTlMpO1xyXG5cclxuICAgICQoXCIjcHJlc2V0LW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKFBSRVNFVF9QQU5FTF9TRUxFQ1RPUikpOyBkaXNhYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IH0pLmNsaWNrKCk7XHJcbiAgICAkKFwiI2N1c3RvbS1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChDVVNUT01fUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKFBSRVNFVF9QQU5FTF9TRUxFQ1RPUikpOyAkKFwiI2RpbWVuc2lvbnNcIikuZm9jdXMoKTsgfSk7XHJcblxyXG4gICAgJC5lYWNoKCQoXCJsYWJlbFtmb3JePSdsZXZlbC0nXVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wb3AoKTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy50aW1lciA9IFByZXNldFNldHVwc1tzZXR1cF0udGltZXI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gTW9kZXMuQ1VTVE9NLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmlzQ3VzdG9tID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkID0gJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpIHx8ICskKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpLFxyXG4gICAgICAgICAgICAgICAgbSA9ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKSB8fCArJChcIiNtaW5lLWNvdW50XCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gRGltVmFsaWRhdG9yLnZhbGlkYXRlKGQpID8gK2QgOiA5O1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBNaW5lVmFsaWRhdG9yLnZhbGlkYXRlKG0sIG1pbmVhYmxlU3BhY2VzKGdhbWVPcHRpb25zLmRpbWVuc2lvbnMpKSA/IG0gOiAxO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJFcnJvcjogJW9cIiwgZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmh0bWwoZS5tZXNzYWdlKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc2V0IHRoZSBkZXNpcmVkIGNvbG9yIHRoZW1lLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLnRoZW1lID0gJChcIiNjb2xvci10aGVtZVwiKS52YWwoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHdpbmRvdy5nYW1lYm9hcmQgPSBuZXcgR2FtZWJvYXJkKGdhbWVPcHRpb25zKS5yZW5kZXIoKTtcclxuXHJcbiAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNib2FyZC1jYXJkXCIpLmZhZGVJbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiI2JvYXJkLWNhcmRcIikub24oXCJjbGlja1wiLCBcImEucmVwbGF5XCIsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHRlbXBvcmFyeSwgYnJ1dGUtZm9yY2UgZml4Li4uXHJcbiAgICAgICAgLy8gVE9ETzogcmVzZXQgZm9ybSBhbmQgdG9nZ2xlIHZpc2liaWxpdHkgb24gdGhlIHNlY3Rpb25zLi4uXHJcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xyXG4gICAgfSk7XHJcblxyXG59KTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBDb25zb2xlUmVuZGVyZXIgPSB7XHJcblxyXG4gICAgQ09MX1NQQUNJTkc6ICcgICAnLFxyXG4gICAgTUlORURfU1FVQVJFOiAnKicsXHJcbiAgICBCTEFOS19TUVVBUkU6ICcuJyxcclxuICAgIFJFTkRFUkVEX01BUDogJyVvJyxcclxuICAgIERFRkFVTFRfVFJBTlNGT1JNRVI6IGZ1bmN0aW9uKHJvdyl7IHJldHVybiByb3c7IH0sXHJcblxyXG4gICAgX21ha2VUaXRsZTogZnVuY3Rpb24oc3RyKSB7IHJldHVybiBzdHIuc3BsaXQoJycpLmpvaW4oJyAnKS50b1VwcGVyQ2FzZSgpOyB9LFxyXG4gICAgX2Rpc3BsYXlSb3dOdW06IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gXCIgICAgICAgW1wiICsgbnVtICsgXCJdXFxuXCIgfSxcclxuICAgIF90b1N5bWJvbHM6IGZ1bmN0aW9uKHZhbHVlcywgZm4pIHtcclxuICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIgKz0gZm4ocm93KS5qb2luKHRoaXMuQ09MX1NQQUNJTkcpLnRvTG93ZXJDYXNlKCkgKyB0aGlzLl9kaXNwbGF5Um93TnVtKGlkeClcclxuICAgICAgICB9LmJpbmQodGhpcyksICdcXG4nKTtcclxuICAgIH0sXHJcbiAgICBfdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykgJiYgdmFsdWVzLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbiAgICB9LFxyXG4gICAgX2dldFJlbmRlcmVkTWFwOiBmdW5jdGlvbih0cmFuc2Zvcm1lcikge1xyXG4gICAgICAgIHZhciB2YWxzID0gdGhpcy5fdmFsaWRhdGUodGhpcy52YWx1ZXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b1N5bWJvbHModmFscywgdHJhbnNmb3JtZXIpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMuX3ZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHZpZXdHYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3R4ID0gdGhpcyxcclxuICAgICAgICAgICAgdHJhbnNmb3JtZXIgPSBmdW5jdGlvbihyb3cpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiByb3cubWFwKGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChzcS5pc01pbmVkKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gdGhpcy5NSU5FRF9TUVVBUkUgOiBzcS5nZXREYW5nZXIoKSA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyB0aGlzLkJMQU5LX1NRVUFSRSA6IHNxLmdldERhbmdlcigpOyB9LCBjdHgpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgdGhpcy4kbG9nKFsgdGhpcy5fbWFrZVRpdGxlKFwiZ2FtZWJvYXJkXCIpLCB0aGlzLlJFTkRFUkVEX01BUCBdXHJcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKSxcclxuICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZWRNYXAodHJhbnNmb3JtZXIpKTtcclxuICAgIH0sXHJcbiAgICB2aWV3TWluZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGxvZyhbIHRoaXMuX21ha2VUaXRsZShcIm1pbmUgcGxhY2VtZW50c1wiKSwgdGhpcy5SRU5ERVJFRF9NQVAgXVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIHRoaXMuX2dldFJlbmRlcmVkTWFwKHRoaXMuREVGQVVMVF9UUkFOU0ZPUk1FUikpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zb2xlUmVuZGVyZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgQ29uc3RhbnRzID0gT2JqZWN0LmZyZWV6ZSh7XHJcblxyXG4gICAgVkVSU0lPTjogJ2JldGE1JyxcclxuXHJcbiAgICBNQVhfR1JJRF9ESU1FTlNJT05TOiAyNSxcclxuICAgIE1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSOiAwLjMzLFxyXG4gICAgLy8gZm9yIGNhbGN1bGF0aW5nIGNsb2NrLCBkZWZhdWx0c1xyXG4gICAgLy8gdG8gMS4yNXMgZm9yIGV2ZXJ5IG1pbmVkIHNxdWFyZVxyXG4gICAgVElNRV9BVkdfQUxMT0NfUEVSX09QRU5fU1FVQVJFOiAxLjI1LFxyXG5cclxuICAgIERlZmF1bHRDb25maWc6IHtcclxuICAgICAgICBkaW1lbnNpb25zOiA5LFxyXG4gICAgICAgIG1pbmVzOiAxLFxyXG4gICAgICAgIGJvYXJkOiAnI2JvYXJkJyxcclxuICAgICAgICBpc0NvdW50ZG93bjogdHJ1ZSxcclxuICAgICAgICBkZWJ1Z19tb2RlOiB0cnVlLCAvKmZhbHNlKi9cclxuICAgICAgICB0aGVtZTogJ0xJR0hUJ1xyXG4gICAgfSxcclxuXHJcbiAgICBTeW1ib2xzOiB7IENMT1NFRDogJ3gnLCBPUEVOOiAnXycsIEZMQUdHRUQ6ICdmJywgTUlORUQ6ICcqJyB9LFxyXG5cclxuICAgIEZsYWdzOiAgeyBPUEVOOiAnRl9PUEVOJywgTUlORUQ6ICdGX01JTkVEJywgRkxBR0dFRDogJ0ZfRkxBR0dFRCcsIElOREVYRUQ6ICdGX0lOREVYRUQnIH0sXHJcblxyXG4gICAgR2x5cGhzOiB7IEZMQUc6ICd4JywgTUlORTogJ8OEJyB9LFxyXG5cclxuICAgIE1vZGVzOiB7IFBSRVNFVDogXCJQXCIsIENVU1RPTTogXCJDXCIgfSxcclxuXHJcbiAgICBQcmVzZXRMZXZlbHM6IHsgQkVHSU5ORVI6IFwiQlwiLCBJTlRFUk1FRElBVEU6IFwiSVwiLCBFWFBFUlQ6IFwiRVwiIH0sXHJcblxyXG4gICAgUHJlc2V0U2V0dXBzOiB7XHJcbiAgICAgICAgQkVHSU5ORVI6ICAgICAgIHsgZGltZW5zaW9uczogIDksIG1pbmVzOiAgOSwgdGltZXI6IDEwMCB9LFxyXG4gICAgICAgIElOVEVSTUVESUFURTogICB7IGRpbWVuc2lvbnM6IDEyLCBtaW5lczogMjEsIHRpbWVyOiAzMDAgfSxcclxuICAgICAgICBFWFBFUlQ6ICAgICAgICAgeyBkaW1lbnNpb25zOiAxNSwgbWluZXM6IDY3LCB0aW1lcjogNjAwIH1cclxuICAgIH0sXHJcblxyXG4gICAgVGhlbWVzOiB7IExJR0hUOiAnbGlnaHQnLCBEQVJLOiAnZGFyaycgfSxcclxuXHJcbiAgICBNZXNzYWdlT3ZlcmxheTogJyNmbGFzaCcsXHJcblxyXG4gICAgTW9iaWxlRGV2aWNlUmVnZXg6IC9hbmRyb2lkfHdlYm9zfGlwaG9uZXxpcGFkfGlwb2R8YmxhY2tiZXJyeXxpZW1vYmlsZXxvcGVyYSBtaW5pLyxcclxuXHJcbiAgICBTY29yZWJvYXJkOiB7IERJR0lUUzogMywgRlhfRFVSQVRJT046IDgwMCwgT1VUX09GX1JBTkdFOiBcIk1BWFwiIH0sXHJcblxyXG4gICAgU2NvcmluZ1J1bGVzOiB7XHJcbiAgICAgICAgREFOR0VSX0lEWF9NVUxUSVBMSUVSOiAxLFxyXG4gICAgICAgIEJMQU5LX1NRVUFSRV9QVFM6IDAsXHJcbiAgICAgICAgRkxBR19NSU5FRDogMjUsXHJcbiAgICAgICAgTUlTRkxBR19VTk1JTkVEOiAxMCxcclxuICAgICAgICBVTkZMQUdfTUlORUQ6IDI1LFxyXG4gICAgICAgIE1JU1VORkxBR19NSU5FRDogMTAsXHJcbiAgICAgICAgVVNFUk1PVkVTX01VTFRJUExJRVI6IDEwLFxyXG4gICAgICAgIE1JU0ZMQUdHRURfTVVMVElQTElFUjogMTAsXHJcbiAgICAgICAgRkxBR0dFRF9NSU5FU19NVUxUSVBMSUVSOiAxMFxyXG4gICAgfVxyXG5cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnN0YW50czsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBGbGlwcGFibGUgPSByZXF1aXJlKCcuL2xpYi9mbGlwcGFibGUnKTtcclxuXHJcbmZ1bmN0aW9uIENvdW50ZG93bihlbCkge1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG4gICAgdGhpcy4kZWwgPSAkKGVsKTtcclxuXHJcbiAgICB0aGlzLiRtMSA9IHRoaXMuJGVsLmZpbmQoJyNtMScpO1xyXG4gICAgdGhpcy4kbTIgPSB0aGlzLiRlbC5maW5kKCcjbTInKTtcclxuICAgIHRoaXMuJHMxID0gdGhpcy4kZWwuZmluZCgnI3MxJyk7XHJcbiAgICB0aGlzLiRzMiA9IHRoaXMuJGVsLmZpbmQoJyNzMicpO1xyXG59XHJcblxyXG5Db3VudGRvd24ucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IENvdW50ZG93bixcclxuICAgIF9pbmNyZW1lbnQ6IGZ1bmN0aW9uKGNoaXBzKSB7XHJcbiAgICAgICAgY2hpcHMuZm9yRWFjaChmdW5jdGlvbihjaGlwKSB7IHRoaXMuX2ZsaXAoY2hpcFswXSwgY2hpcFsxXSk7IH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24obWlucywgc2Vjcykge1xyXG4gICAgICAgIHZhciBtID0gU3RyaW5nKG1pbnMpLFxyXG4gICAgICAgICAgICBzID0gU3RyaW5nKHNlY3MpLFxyXG4gICAgICAgICAgICB0aW1lcyA9IFttLCBzXS5tYXAoZnVuY3Rpb24oeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyciA9IFN0cmluZyh4KS5zcGxpdCgnJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJyLmxlbmd0aCA8IDIpXHJcbiAgICAgICAgICAgICAgICAgICAgYXJyLnVuc2hpZnQoJzAnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcnI7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICB0aGlzLl9pbmNyZW1lbnQoW1xyXG4gICAgICAgICAgICBbdGhpcy4kczIsIHRpbWVzWzFdWzFdXSxcclxuICAgICAgICAgICAgW3RoaXMuJHMxLCB0aW1lc1sxXVswXV0sXHJcbiAgICAgICAgICAgIFt0aGlzLiRtMiwgdGltZXNbMF1bMV1dLFxyXG4gICAgICAgICAgICBbdGhpcy4kbTEsIHRpbWVzWzBdWzBdXVxyXG4gICAgICAgIF0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuRmxpcHBhYmxlKCkuY2FsbChDb3VudGRvd24ucHJvdG90eXBlKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ291bnRkb3duOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuLy8gVE9ETzogcmVmYWN0b3IgdG8gbm90IG5lZWQgdGhlIGBnYW1lYm9hcmRgIGRlcGVuZGVuY3ksXHJcbi8vICAgICAgIGNhbiBqdXN0IGV4cG9ydCBhIG1hcCBvZiBkYW5nZXIgaW5kaWNlc1xyXG5mdW5jdGlvbiBEYW5nZXJDYWxjdWxhdG9yKGdhbWVib2FyZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBib2FyZDogZ2FtZWJvYXJkLFxyXG4gICAgICAgIG5laWdoYm9yaG9vZDoge1xyXG4gICAgICAgICAgICAvLyBkaXN0YW5jZSBpbiBzdGVwcyBmcm9tIHRoaXMgc3F1YXJlOlxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgdmVydC4gaG9yei5cclxuICAgICAgICAgICAgTk9SVEg6ICAgICAgWyAgMSwgIDAgXSxcclxuICAgICAgICAgICAgTk9SVEhFQVNUOiAgWyAgMSwgIDEgXSxcclxuICAgICAgICAgICAgRUFTVDogICAgICAgWyAgMCwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEhFQVNUOiAgWyAtMSwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEg6ICAgICAgWyAtMSwgIDAgXSxcclxuICAgICAgICAgICAgU09VVEhXRVNUOiAgWyAtMSwgLTEgXSxcclxuICAgICAgICAgICAgV0VTVDogICAgICAgWyAgMCwgLTEgXSxcclxuICAgICAgICAgICAgTk9SVEhXRVNUOiAgWyAgMSwgLTEgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZm9yU3F1YXJlOiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICAgICAgaWYgKCtyb3cgPj0gMCAmJiArY2VsbCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSB0aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3JpeiA9IHRoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9yID0gdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcInVzZSBzdHJpY3Q7XCJcbi8vIEVSUk9SUyBBTkQgRVhDRVBUSU9OU1xuXG5mdW5jdGlvbiBNeXN3ZWVwZXJFcnJvcigpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICBSR1hfUkVQTEFDRU1FTlRfVE9LRU5TID0gL1xceyhcXGQrKVxcfS9nLFxuICAgICAgZXh0ZW5kTWVzc2FnZSA9IGZ1bmN0aW9uKHN0ciwgYXJncykge1xuICAgICAgICAgIHJldHVybiAoc3RyIHx8ICcnKS5yZXBsYWNlKFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMsIGZ1bmN0aW9uKF8sIGluZGV4KSB7IHJldHVybiBhcmdzWytpbmRleF0gfHwgJyc7IH0pO1xuICAgICAgfTtcbiAgdGhpcy5tZXNzYWdlID0gZXh0ZW5kTWVzc2FnZShhcmdzWzBdLCBhcmdzLnNsaWNlKDEpKTtcbiAgRXJyb3IuY2FsbCh0aGlzLCB0aGlzLm1lc3NhZ2UpO1xuICAvLyBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBhcmd1bWVudHMuY2FsbGVlKTtcbiAgdGhpcy5zdGFjayA9IEVycm9yKCkuc3RhY2s7XG59XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE15c3dlZXBlckVycm9yO1xuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLmdldFRyYWNlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YWNrLnJlcGxhY2UoL+KGtVxccysvZywgJ1xcbiAgJyk7IH07XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUubmFtZSA9ICdNeXN3ZWVwZXJFcnJvcic7XG5cbi8qICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAqL1xuXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoKSB7XG4gIE15c3dlZXBlckVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG5cbmZ1bmN0aW9uIFNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yKCkge1xuICBNeXN3ZWVwZXJFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5TY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjtcblNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yLnByb3RvdHlwZS5uYW1lID0gJ1Njb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yJztcblxuXG5tb2R1bGUuZXhwb3J0cy5NeXN3ZWVwZXJFcnJvciA9IE15c3dlZXBlckVycm9yO1xubW9kdWxlLmV4cG9ydHMuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yO1xubW9kdWxlLmV4cG9ydHMuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IgPSBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICBUSU1FX0FWR19BTExPQ19QRVJfT1BFTl9TUVVBUkUgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlRJTUVfQVZHX0FMTE9DX1BFUl9PUEVOX1NRVUFSRSxcclxuICAgIFJHWF9NT0JJTEVfREVWSUNFUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9iaWxlRGV2aWNlUmVnZXgsXHJcbiAgICBWRVJTSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5WRVJTSU9OLFxyXG4gICAgVGltZXIgPSByZXF1aXJlKCcuL3RpbWVyJyksXHJcbiAgICBDb3VudGRvd24gPSByZXF1aXJlKCcuL2NvdW50ZG93bicpLFxyXG4gICAgTWluZXNEaXNwbGF5ID0gcmVxdWlyZSgnLi9taW5lcy1kaXNwbGF5JyksXHJcbiAgICBUcmFuc2NyaWJpbmdFbWl0dGVyID0gcmVxdWlyZSgnLi90cmFuc2NyaWJpbmctZW1pdHRlcicpLFxyXG4gICAgVHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0gcmVxdWlyZSgnLi90cmFuc2NyaXB0aW9uLXN0cmF0ZWd5JyksXHJcbiAgICBUaGVtZVN0eWxlciA9IHJlcXVpcmUoJy4vdGhlbWUtc3R5bGVyJyksXHJcbiAgICBDb25zb2xlUmVuZGVyZXIgPSByZXF1aXJlKCcuL2NvbnNvbGUtcmVuZGVyZXInKSxcclxuICAgIE1pbmVMYXllciA9IHJlcXVpcmUoJy4vbWluZWxheWVyJyksXHJcbiAgICBTY29yZWtlZXBlciA9IHJlcXVpcmUoJy4vc2NvcmVrZWVwZXInKSxcclxuICAgIFNjb3JlYm9hcmQgPSByZXF1aXJlKCcuL3Njb3JlYm9hcmQnKSxcclxuICAgIF9leHRlbmQgPSByZXF1aXJlKCcuL2xpYi91dGlscycpLl9leHRlbmQ7XHJcblxyXG4vLyB3cmFwcGVyIGFyb3VuZCBgJGxvZ2AsIHRvIHRvZ2dsZSBkZXYgbW9kZSBkZWJ1Z2dpbmdcclxudmFyICRsb2cgPSBmdW5jdGlvbiAkbG9nKCkgeyBpZiAoJGxvZy5kZWJ1Z19tb2RlIHx8IGZhbHNlKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9XHJcblxyXG5mdW5jdGlvbiBHYW1lYm9hcmQob3B0aW9ucykge1xyXG4gICAgLy8gZmlsbCBpbiBhbnkgYmxhbmtzIGluIHRoZSB1c2VyJ3MgZ2FtZSBvcHRpb25zXHJcbiAgICAvLyB3aXRoIG91ciBzZW5zaWJsZSBkZWZhdWx0czpcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBfZXh0ZW5kKERFRkFVTFRfR0FNRV9PUFRJT05TLCBvcHRpb25zKTtcclxuICAgIC8vIGZvcmsgY29uc3RydWN0aW9uIG9mIHRoaXMgR2FtZWJvYXJkIGluc3RhbmNlLFxyXG4gICAgLy8gZGVwZW5kaW5nIG9uIHdoZXRoZXIgb3Igbm90IGl0J3MgYSBuZXcgZ2FtZSxcclxuICAgIC8vIG9yIGJlaW5nIHJlaHlkcmF0ZWQgZnJvbSBhIHByZXZpb3VzLCBwZXJzaXN0ZWQgZ2FtZTpcclxuICAgIGlmICghdGhpcy5zZXR0aW5ncy5pc1BlcnNpc3RlZCkge1xyXG4gICAgICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgICAgIHRoaXMuYm9hcmQgPSBuZXcgTXVsdGltYXA7XHJcbiAgICAgICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMgPSArdGhpcy5zZXR0aW5ncy5kaW1lbnNpb25zO1xyXG4gICAgICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICAgICAgdGhpcy5taW5lcyA9ICt0aGlzLnNldHRpbmdzLm1pbmVzO1xyXG4gICAgICAgIC8vIHRoZSBET00gZWxlbWVudCBvZiB0aGUgdGFibGUgc2VydmluZyBhcyB0aGUgYm9hcmRcclxuICAgICAgICB0aGlzLiRlbCA9ICQodGhpcy5zZXR0aW5ncy5ib2FyZCk7XHJcbiAgICAgICAgLy8gaXMgY3VzdG9tIG9yIHByZXNldCBnYW1lP1xyXG4gICAgICAgIHRoaXMuaXNDdXN0b20gPSB0aGlzLnNldHRpbmdzLmlzQ3VzdG9tIHx8IGZhbHNlO1xyXG4gICAgICAgIC8vIHRoZSBldmVudCB0cmFuc2NyaWJlciBmb3IgcGxheWJhY2sgYW5kIHBlcnNpc3RlbmNlXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIoVHJhbnNjcmlwdGlvblN0cmF0ZWd5KTtcclxuICAgICAgICAvLyBzZWxlY3RpdmVseSBlbmFibGUgZGVidWcgbW9kZSBmb3IgY29uc29sZSB2aXN1YWxpemF0aW9ucyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgICAgIHRoaXMuZGVidWdfbW9kZSA9IHRoaXMuc2V0dGluZ3MuZGVidWdfbW9kZTtcclxuICAgICAgICAvLyBzcGVjaWZpZXMgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUgb3Igc2tpblxyXG4gICAgICAgIHRoaXMudGhlbWUgPSB0aGlzLl9zZXRDb2xvclRoZW1lKHRoaXMuc2V0dGluZ3MudGhlbWUpO1xyXG4gICAgICAgIC8vIGNvbnRhaW5lciBmb3IgZmxhc2ggbWVzc2FnZXMsIHN1Y2ggYXMgd2luL2xvc3Mgb2YgZ2FtZVxyXG4gICAgICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKE1lc3NhZ2VPdmVybGF5KTtcclxuICAgICAgICAvLyBjaGVjayBmb3IgZGVza3RvcCBvciBtb2JpbGUgcGxhdGZvcm0gKGZvciBldmVudCBoYW5kbGVycylcclxuICAgICAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgICAgICAvLyBrZWVwIHRyYWNrIG9mIHVzZXIgY2xpY2tzIHRvd2FyZHMgdGhlaXIgd2luXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMgPSAwO1xyXG4gICAgICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgICAgIC8vIHRoZSBkaXNwbGF5IG9iamVjdCBmb3IgdGhlIG51bWJlciBvZiBtaW5lc1xyXG4gICAgICAgIHRoaXMubWluZXNEaXNwbGF5ID0gbmV3IE1pbmVzRGlzcGxheSh0aGlzLm1pbmVzLCBcIiNtaW5lcy1kaXNwbGF5XCIpO1xyXG4gICAgICAgIC8vIGFkZCBpbiB0aGUgY291bnRkb3duIGNsb2NrLi4uXHJcbiAgICAgICAgdGhpcy5jbG9jayA9IG5ldyBUaW1lcigwLCArdGhpcy5zZXR0aW5ncy50aW1lciB8fCB0aGlzLl9kZXRlcm1pbmVUaW1lcigpLCB0aGlzLnNldHRpbmdzLmlzQ291bnRkb3duLCB0aGlzLmVtaXR0ZXIpO1xyXG4gICAgICAgIHRoaXMuY291bnRkb3duID0gbmV3IENvdW50ZG93bihcIiNjb3VudGRvd25cIik7XHJcbiAgICAgICAgLy8gY3JlYXRlIHRoZSBzY29yZWtlZXBpbmcgb2JqZWN0XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlciA9IG5ldyBTY29yZWtlZXBlcih0aGlzKTtcclxuICAgICAgICAvLyBjcmVhdGUgdGhlIGFjdHVhbCBzY29yZWJvYXJkIHZpZXdcclxuICAgICAgICB0aGlzLnNjb3JlYm9hcmQgPSBuZXcgU2NvcmVib2FyZCgwLCBcIiNzY29yZS1kaXNwbGF5XCIpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlJFU1VNSU5HIElNUE9SVEVEIEdBTUU6ICVvXCIsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIHRoaXMuaW1wb3J0KHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHR1cm4gb24gZGV2IGxvZ2dlciwgaWYgbmVlZGVkXHJcbiAgICAkbG9nLmRlYnVnX21vZGUgPSB0aGlzLmRlYnVnX21vZGU7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG4gICAgLy8gdHJpZ2dlciBldmVudCBmb3IgZ2FtZSB0byBiZWdpbi4uLlxyXG4gICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIodGhpcy5zZXR0aW5ncy5pc1BlcnNpc3RlZCA/ICdnYjpyZXN0YXJ0JyA6ICdnYjpzdGFydCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcclxufVxyXG5cclxuR2FtZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBHYW1lYm9hcmQsXHJcbiAgICAvLyBcIlBSSVZBVEVcIiBNRVRIT0RTOlxyXG4gICAgX2xvYWRCb2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcHJlZmlsbCBzcXVhcmVzIHRvIHJlcXVpcmVkIGRpbWVuc2lvbnMuLi5cclxuICAgICAgICB2YXIgZGltZW5zaW9ucyA9IHRoaXMuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSB0aGlzLm1pbmVzLFxyXG4gICAgICAgICAgICBwb3B1bGF0ZVJvdyA9IGZ1bmN0aW9uKHJvdywgc3F1YXJlcykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc3F1YXJlczsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IG5ldyBTcXVhcmUocm93LCBpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSlcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgcG9wdWxhdGVSb3coaSwgZGltZW5zaW9ucykpO1xyXG4gICAgICAgIC8vIGRldGVybWluZSByYW5kb20gcG9zaXRpb25zIG9mIG1pbmVkIHNxdWFyZXMuLi5cclxuICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKGRpbWVuc2lvbnMsIG1pbmVzKTtcclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuICAgICAgICAvLyBkaXNwbGF5IHRoZSBjdXJyZW50IHZlcnNpb24gb2YgdGhlIGdhbWU6XHJcbiAgICAgICAgJChcIi52ZXJzaW9uXCIpLmh0bWwoVkVSU0lPTik7XHJcbiAgICAgICAgLy8gZGlzcGxheSBvdXRwdXQgYW5kIGdhbWUgc3RyYXRlZ3kgdG8gdGhlIGNvbnNvbGUuLi5cclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy50aGVtZSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgdmFyIGxvY3MgPSBuZXcgTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKTtcclxuICAgICAgICBsb2NzLmZvckVhY2goZnVuY3Rpb24obG9jKSB7IHRoaXMuZ2V0U3F1YXJlQXQobG9jWzBdLCBsb2NbMV0pLm1pbmUoKTsgfSwgdGhpcyk7XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcih0aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJyBjbGFzcz0nLXJvdyc+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX3NldENvbG9yVGhlbWU6IGZ1bmN0aW9uKHRoZW1lKSB7XHJcbiAgICAgICAgVGhlbWVTdHlsZXIuc2V0KHRoZW1lLCB0aGlzLiRlbCk7XHJcbiAgICAgICAgcmV0dXJuIHRoZW1lO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVUaW1lcjogZnVuY3Rpb24oKSB7IHJldHVybiBUSU1FX0FWR19BTExPQ19QRVJfT1BFTl9TUVVBUkUgKiAoTWF0aC5wb3codGhpcy5kaW1lbnNpb25zLCAyKSAtIHRoaXMubWluZXMpOyB9LFxyXG4gICAgX2NoZWNrRm9yTW9iaWxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIFJHWF9NT0JJTEVfREVWSUNFUy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7IH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciB0b3VjaCBldmVudHM6IHRhcCA9PSBjbGljaywgaG9sZCA9PSByaWdodCBjbGlja1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vbih7XHJcbiAgICAgICAgICAgICAgICB0YXA6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBob2xkOiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICAgICAgY2xpY2s6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcblxyXG4gICAgICAgIC8qICBGT1IgREVWIFVTRSBPTkxZIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAqL1xyXG4gICAgICAgIC8vIElORElWSURVQUwgU1FVQVJFIEVWRU5UU1xyXG4gICAgICAgIC8qdGhpcy5lbWl0dGVyLm9uKCdzcTpvcGVuJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJPcGVuaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpmbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJGbGFnZ2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6dW5mbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJVbmZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7Ki9cclxuICAgICAgICAvLyBHQU1FQk9BUkQtV0lERSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmVnaW4hXCIsIGFyZ3VtZW50cyk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6cmVzdW1lJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgcmVzdW1lIVwiLCBhcmd1bWVudHMpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnBhdXNlJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmUgcGF1c2VkIVwiLCBhcmd1bWVudHMpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91IHdpbiFcIik7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOm92ZXInLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91J3JlIGRlYWQhXCIpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp0aW1lZG91dCcsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgb3V0dGEgdGltZSFcIik7IH0pO1xyXG4gICAgICAgIC8qICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAqL1xyXG5cclxuICAgICAgICAvLyB3aXJlcyB1cCB0aGUgc2NvcmVib2FyZCB2aWV3IG9iamVjdCB0byB0aGUgZXZlbnRzIHJlY2VpdmVkIGZyb20gdGhlIHNjb3Jla2VlcGVyXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzY29yZTpjaGFuZ2Ugc2NvcmU6Y2hhbmdlOmZpbmFsJywgZnVuY3Rpb24oKSB7IHRoaXMuc2NvcmVib2FyZC51cGRhdGUodGhpcy5zY29yZWtlZXBlci5zY29yZSk7IH0uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCd0aW1lcjpzdGFydCB0aW1lcjpzdG9wIHRpbWVyOmNoYW5nZSB0aW1lcjpyZXNldCB0aW1lcjplbmQnLCBmdW5jdGlvbihtaW5zLCBzZWNzKSB7IHRoaXMuY291bnRkb3duLnVwZGF0ZShtaW5zLCBzZWNzKTsgfS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3RpbWVyOmVuZCcsIGZ1bmN0aW9uKCkgeyB0aGlzLl9nYW1lVGltZWRPdXQoKTsgfS5iaW5kKHRoaXMpKTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gYXMgYSBjb3VydGVzeSB0byB0aGUgdXNlciwgdGhlaXIgZmlyc3QgY2xpY2tcclxuICAgICAgICAvLyB3aWxsIG5ldmVyIGJlIG1pbmVkIChjYW4ndCBsb3NlIGdhbWUgb24gZmlyc3QgdXNlciBtb3ZlKVxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpICYmIHRoaXMudXNlck1vdmVzID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2goZnVuY3Rpb24oc3EpIHsgc3EudW5taW5lKCk7IH0pO1xyXG4gICAgICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKHRoaXMuZGltZW5zaW9ucywgdGhpcy5taW5lcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRlYnVnX21vZGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRvQ29uc29sZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fb3BlblNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICBpZiAoIXNxdWFyZS5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwoc3F1YXJlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgJGNlbGwuYWRkQ2xhc3MoJ2tpbGxlci1taW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZVJpZ2h0Q2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBzdG9wIHRoZSBjb250ZXh0bWVudSBmcm9tIHBvcHBpbmcgdXAgb24gZGVza3RvcCBicm93c2Vyc1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKVxyXG4gICAgICAgICAgICB0aGlzLl9mbGFnU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbG9zZVNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICAvLyBoYW5kbGVzIGF1dG9jbGVhcmluZyBvZiBzcGFjZXMgYXJvdW5kIHRoZSBvbmUgY2xpY2tlZFxyXG4gICAgX3JlY3Vyc2l2ZVJldmVhbDogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZCksXHJcbiAgICAgICAgICAgIHJvdyA9IHNvdXJjZS5nZXRSb3coKSxcclxuICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCk7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSB0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICBob3JpeiA9IHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUobmVpZ2hib3IpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgfHwgIW5laWdoYm9yLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwobmVpZ2hib3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9LFxyXG4gICAgX29wZW5TcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpvcGVuXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfY2xvc2VTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6Y2xvc2VcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9mbGFnU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5mbGFnKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLnJlbW92ZUNsYXNzKCdjbG9zZWQnKTtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpmbGFnXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfdW5mbGFnU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS51bmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTp1bmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9nZXRPcGVuZWRTcXVhcmVzQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5nZXRTcXVhcmVzKCkuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc09wZW4oKTsgfSkubGVuZ3RoOyB9LFxyXG4gICAgX2V2YWx1YXRlRm9yR2FtZVdpbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG5vdE1pbmVkID0gdGhpcy5nZXRTcXVhcmVzKCkuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKG5vdE1pbmVkID09PSB0aGlzLl9nZXRPcGVuZWRTcXVhcmVzQ291bnQoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVXaW4oKTtcclxuICAgIH0sXHJcbiAgICBfZmxhc2hNc2c6IGZ1bmN0aW9uKG1zZywgaXNBbGVydCkge1xyXG4gICAgICAgIHRoaXMuZmxhc2hDb250YWluZXJcclxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhpc0FsZXJ0ID8gJ2dhbWUtb3ZlcicgOiAnZ2FtZS13aW4nKVxyXG4gICAgICAgICAgICAgICAgLmh0bWwobXNnKVxyXG4gICAgICAgICAgICAgICAgLnNob3coKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZUVuZE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdmFyIFJFUExBWV9MSU5LID0gXCI8YSBocmVmPScjJyBjbGFzcz0ncmVwbGF5Jz5DbGljayBoZXJlIHRvIHBsYXkgYWdhaW4uLi48L2E+XCI7XHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coXCI8c3Bhbj5cIiArIG1zZyArIFwiPC9zcGFuPlwiICsgUkVQTEFZX0xJTkssIGlzQWxlcnQpO1xyXG4gICAgfSxcclxuICAgIF9wcmVwYXJlRmluYWxSZXZlYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGZvciBhbGwgZmxhZ2dlZCBzcXVhcmVzLCByZW1vdmUgZmxhZyBpY29uXHJcbiAgICAgICAgLy8gYW5kIHJlcGxhY2Ugd2l0aCBvcmlnaW5hbCBkYW5nZXIgaW5kZXggaW5zdGVhZFxyXG4gICAgICAgIC8vIGZvciB3aGVuIGl0J3Mgb3BlbmVkXHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoZiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci5jbG9zZSgpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgJGxvZyhcIi0tLSAgR0FNRSBXSU4hICAtLS1cIik7XHJcbiAgICAgICAgJGxvZyhcIlVzZXIgbW92ZXM6ICVvXCIsIHRoaXMudXNlck1vdmVzKVxyXG4gICAgICAgIHRoaXMuX2dhbWVFbmRNc2coXCJHYW1lIE92ZXIhIFlvdSB3aW4hXCIpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjplbmQ6d2luJywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lT3ZlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtb3ZlcicpO1xyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICAkbG9nKCctLS0gIEdBTUUgT1ZFUiEgIC0tLScpO1xyXG4gICAgICAgIHRoaXMuX2dhbWVFbmRNc2coXCJHYW1lIE92ZXIhXCIsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjplbmQ6b3ZlcicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZVRpbWVkT3V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS10aW1lZG91dCcpO1xyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICAkbG9nKCctLS0gIEdBTUUgT1ZFUiEgIC0tLScpO1xyXG4gICAgICAgIHRoaXMuX2dhbWVFbmRNc2coXCJHYW1lIE92ZXIhIFlvdSdyZSBvdXQgb2YgdGltZSFcIiwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOmVuZDp0aW1lZG91dCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICB2YXIgJGNlbGwgPSB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSksXHJcbiAgICAgICAgICAgIGdldENvbnRlbnRzID0gZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc0ZsYWdnZWQoKSkgcmV0dXJuIEdseXBocy5GTEFHO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzTWluZWQoKSkgcmV0dXJuIEdseXBocy5NSU5FO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICEhc3EuZ2V0RGFuZ2VyKCkgPyBzcS5nZXREYW5nZXIoKSA6ICcnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAkZGFuZ2VyU3BhbiA9ICQoJzxzcGFuIC8+JywgeyAnY2xhc3MnOiAnZGFuZ2VyJywgaHRtbDogZ2V0Q29udGVudHMoc3F1YXJlKSB9KTtcclxuXHJcbiAgICAgICAgJGNlbGwuZW1wdHkoKS5hcHBlbmQoJGRhbmdlclNwYW4pO1xyXG5cclxuICAgICAgICAvLyBkZWNvcmF0ZSA8dGQ+IHdpdGggQ1NTIGNsYXNzZXMgYXBwcm9wcmlhdGUgdG8gc3F1YXJlJ3Mgc3RhdGVcclxuICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NxdWFyZScpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2NlbGwnICsgc3F1YXJlLmdldENlbGwoKSlcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS5qb2luKCcgJykpO1xyXG5cclxuICAgICAgICAvLyBhdHRhY2ggdGhlIFNxdWFyZSB0byB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIGdyaWQgY2VsbFxyXG4gICAgICAgICRjZWxsLmRhdGEoJ3NxdWFyZScsIHNxdWFyZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFwiUFVCTElDXCIgTUVUSE9EU1xyXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZSwgdGhpcyk7XHJcbiAgICAgICAgLy8gcmV0dXJuIGB0aGlzYCwgc28gdGhpcyBtZXRob2QgY2FuIGJlIGNoYWluZWQgdG8gaXRzIGluaXRpYWxpemF0aW9uIGNhbGxcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICAvLyB0YWtlcyBhIFNxdWFyZSBpbnN0YW5jZSBhcyBhIHBhcmFtLCByZXR1cm5zIGEgalF1ZXJ5LXdyYXBwZWQgRE9NIG5vZGUgb2YgaXRzIGNlbGxcclxuICAgIGdldEdyaWRDZWxsOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgIC5maW5kKCd0ZCcpXHJcbiAgICAgICAgICAgICAgICAuZXEoc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgcm93IGFuZCBjZWxsIGNvb3JkaW5hdGVzIGFzIHBhcmFtcywgcmV0dXJucyB0aGUgYXNzb2NpYXRlZCBTcXVhcmUgaW5zdGFuY2VcclxuICAgIGdldFNxdWFyZUF0OiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICB2YXIgcm93ID0gdGhpcy5ib2FyZC5nZXQocm93KTtcclxuICAgICAgICByZXR1cm4gKHJvdyAmJiByb3dbMF0gJiYgcm93WzBdW2NlbGxdKSA/IHJvd1swXVtjZWxsXSA6IG51bGw7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmRcclxuICAgICAgICAgICAgICAgIC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwpOyB9LCBbXSlcclxuICAgIH0sXHJcbiAgICAvLyBpbXBvcnQgcGVyc2lzdGVkIGdhbWUgc3RhdGVcclxuICAgIGltcG9ydDogZnVuY3Rpb24ob3B0aW9ucykgeyAgcmV0dXJuIFNlcmlhbGl6ZXIuaW1wb3J0KG9wdGlvbnMpLmNhbGwodGhpcyk7IH0sXHJcbiAgICAvLyBleHBvcnQgc2VyaWFsaXplZCBzdGF0ZSB0byBwZXJzaXN0IGdhbWUgZm9yIGxhdGVyXHJcbiAgICBleHBvcnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gU2VyaWFsaXplci5leHBvcnQodGhpcyk7IH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gQ29uc29sZVJlbmRlcmVyLnRvKCRsb2cpLndpdGhWYWx1ZXModGhpcy5ib2FyZC52YWx1ZXMoKSk7XHJcbiAgICAgICAgcmV0dXJuICh3aXRoRGFuZ2VyKSA/IHJlbmRlcmVyLnZpZXdHYW1lKCkgOiByZW5kZXJlci52aWV3TWluZXMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuLy8gQHVzYWdlIHZhciBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbJ0ZfT1BFTicsICdGX01JTkVEJywgJ0ZfRkxBR0dFRCcsICdGX0lOREVYRUQnXSk7IGJmID0gbmV3IEJpdEZsYWdzO1xyXG5mdW5jdGlvbiBCaXRGbGFnRmFjdG9yeShhcmdzKSB7XHJcblxyXG4gICAgdmFyIGJpblRvRGVjID0gZnVuY3Rpb24oc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9LFxyXG4gICAgICAgIGRlY1RvQmluID0gZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0udG9TdHJpbmcoMik7IH0sXHJcbiAgICAgICAgYnVpbGRTdGF0ZSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5yZXZlcnNlKCkuam9pbignJykpOyB9LFxyXG4gICAgICAgIHBhZCA9IGZ1bmN0aW9uIChzdHIsIG1heCkge1xyXG4gICAgICAgICAgZm9yICh2YXIgYWNjPVtdLCBtYXggPSBtYXggfHwgNCwgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7IGRpZmYgPiAwOyBhY2NbLS1kaWZmXSA9ICcwJyk7XHJcbiAgICAgICAgICByZXR1cm4gYWNjLmpvaW4oJycpICsgc3RyO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlUXVlcnlNZXRob2QgPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuaGFzKHRoaXNbbmFtZV0pOyB9IH0sXHJcbiAgICAgICAgY3JlYXRlUXVlcnlNZXRob2ROYW1lID0gZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICBpZiAofm5hbWUuaW5kZXhPZignXycpKVxyXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKG5hbWUuaW5kZXhPZignXycpICsgMSk7XHJcbiAgICAgICAgICAgIHJldHVybiAnaXMnICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0U3RhdGVzID0gZnVuY3Rpb24oYXJncywgcHJvdG8pIHtcclxuICAgICAgICAgICAgaWYgKCFhcmdzLmxlbmd0aCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgcHJvdG8uX3N0YXRlcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49YXJncy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZsYWdOYW1lID0gU3RyaW5nKGFyZ3NbaV0pLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgY2xzTmFtZSA9IGZsYWdOYW1lLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLnBvdygyLCBpKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZE5hbWUgPSBjcmVhdGVRdWVyeU1ldGhvZE5hbWUoY2xzTmFtZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2QgPSBjcmVhdGVRdWVyeU1ldGhvZChmbGFnTmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcHJvdG9bZmxhZ05hbWVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBwcm90by5fc3RhdGVzW2ldID0gY2xzTmFtZTtcclxuICAgICAgICAgICAgICAgIHByb3RvW3F1ZXJ5TWV0aG9kTmFtZV0gPSBxdWVyeU1ldGhvZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBwcm90by5ERUZBVUxUX1NUQVRFID0gcGFkKCcnLCBpKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIEJpdEZsYWdzKCkge1xyXG4gICAgICAgIHRoaXMuX2ZsYWdzID0gYXJndW1lbnRzLmxlbmd0aCA+IDBcclxuICAgICAgICAgICAgPyBidWlsZFN0YXRlKFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcclxuICAgICAgICAgICAgOiB0aGlzLkRFRkFVTFRfU1RBVEU7XHJcbiAgICB9XHJcblxyXG4gICAgQml0RmxhZ3MucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yOiBCaXRGbGFncyxcclxuICAgICAgICBoYXM6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuICEhKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIGZsYWcpOyB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpIHwgZmxhZykpOyB9LFxyXG4gICAgICAgIHVuc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiB+ZmxhZykpOyB9LFxyXG4gICAgICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IF9mbGFnczogdGhpcy5fZmxhZ3MgfTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBCaXRGbGFncy53aXRoRGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykgeyByZXR1cm4gbmV3IEJpdEZsYWdzKGRlZmF1bHRzKTsgfTtcclxuXHJcbiAgICBzZXRTdGF0ZXMoYXJncywgQml0RmxhZ3MucHJvdG90eXBlKTtcclxuXHJcbiAgICByZXR1cm4gQml0RmxhZ3M7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQml0RmxhZ0ZhY3Rvcnk7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbn1cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEVtaXR0ZXIsXHJcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgZXZlbnQuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXSA9IHRoaXMuX2V2ZW50c1tlXSB8fCBbXTtcclxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2VdLnB1c2goZm4pO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgZXZlbnQuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmVudHNbZV0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2VdLnNwbGljZSh0aGlzLl9ldmVudHNbZV0uaW5kZXhPZihmbiksIDEpO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50IC8qLCBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgICAgIGlmICh0aGlzLl9ldmVudHNbZXZlbnRdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dGhpcy5fZXZlbnRzW2V2ZW50XS5sZW5ndGg7IGkgPCBsZW47ICsraSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjsiLCJcInVzZSBzdHJpY3Q7XCJcblxudmFyIEZsaXBwYWJsZSA9IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEZsaXBwYWJsZSkpXG4gICAgICAgIHJldHVybiBuZXcgRmxpcHBhYmxlKHNldHRpbmdzKTtcblxuICAgIHZhciBvcHRpb25zID0geyBkdXJhdGlvbjogMCwgd3JhcHBlcjogJ3NwYW4nIH07XG4gICAgZm9yICh2YXIgcyBpbiBzZXR0aW5ncylcbiAgICAgICAgaWYgKHNldHRpbmdzLmhhc093blByb3BlcnR5KHMpKVxuICAgICAgICAgICAgb3B0aW9uc1tzXSA9IHNldHRpbmdzW3NdO1xuXG4gICAgdmFyIG5vZGVOYW1lVG9UYWcgPSBmdW5jdGlvbihub2RlKSB7IHJldHVybiBcIjxcIiArIG5vZGUgKyBcIiAvPlwiOyB9LFxuICAgICAgICB2ZXJpZnlET01Ob2RlID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICB2YXIgdGFncyA9IFwiYSxhYmJyLGFjcm9ueW0sYWRkcmVzcyxhcHBsZXQsYXJlYSxhcnRpY2xlLGFzaWRlLGF1ZGlvLFwiXG4gICAgICAgICAgICAgICAgKyBcImIsYmFzZSxiYXNlZm9udCxiZGksYmRvLGJnc291bmQsYmlnLGJsaW5rLGJsb2NrcXVvdGUsYm9keSxicixidXR0b24sXCJcbiAgICAgICAgICAgICAgICArIFwiY2FudmFzLGNhcHRpb24sY2VudGVyLGNpdGUsY29kZSxjb2wsY29sZ3JvdXAsY29udGVudCxkYXRhLGRhdGFsaXN0LGRkLFwiXG4gICAgICAgICAgICAgICAgKyBcImRlY29yYXRvcixkZWwsZGV0YWlscyxkZm4sZGlyLGRpdixkbCxkdCxlbGVtZW50LGVtLGVtYmVkLGZpZWxkc2V0LGZpZ2NhcHRpb24sXCJcbiAgICAgICAgICAgICAgICArIFwiZmlndXJlLGZvbnQsZm9vdGVyLGZvcm0sZnJhbWUsZnJhbWVzZXQsaDEsaDIsaDMsaDQsaDUsaDYsaGVhZCxoZWFkZXIsaGdyb3VwLGhyLGh0bWwsXCJcbiAgICAgICAgICAgICAgICArIFwiaSxpZnJhbWUsaW1nLGlucHV0LGlucyxpc2luZGV4LGtiZCxrZXlnZW4sbGFiZWwsbGVnZW5kLGxpLGxpbmssbGlzdGluZyxcIlxuICAgICAgICAgICAgICAgICsgXCJtYWluLG1hcCxtYXJrLG1hcnF1ZWUsbWVudSxtZW51aXRlbSxtZXRhLG1ldGVyLG5hdixub2JyLG5vZnJhbWVzLG5vc2NyaXB0LG9iamVjdCxcIlxuICAgICAgICAgICAgICAgICsgXCJvbCxvcHRncm91cCxvcHRpb24sb3V0cHV0LHAscGFyYW0scGxhaW50ZXh0LHByZSxwcm9ncmVzcyxxLHJwLHJ0LHJ1YnkscyxzYW1wLHNjcmlwdCxcIlxuICAgICAgICAgICAgICAgICsgXCJzZWN0aW9uLHNlbGVjdCxzaGFkb3csc21hbGwsc291cmNlLHNwYWNlcixzcGFuLHN0cmlrZSxzdHJvbmcsc3R5bGUsc3ViLHN1bW1hcnksc3VwLFwiXG4gICAgICAgICAgICAgICAgKyBcInRhYmxlLHRib2R5LHRkLHRlbXBsYXRlLHRleHRhcmVhLHRmb290LHRoLHRoZWFkLHRpbWUsdGl0bGUsdHIsdHJhY2ssdHQsdSx1bCx2YXIsdmlkZW8sd2JyLHhtcFwiO1xuICAgICAgICAgICAgcmV0dXJuIChzdHIgPSBTdHJpbmcoc3RyKS50b0xvd2VyQ2FzZSgpLCBzdHIgJiYgISF+dGFncy5pbmRleE9mKHN0cikpID8gc3RyIDogJ3NwYW4nO1xuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9mbGlwRHVyYXRpb24gPSArb3B0aW9ucy5kdXJhdGlvbixcbiAgICAgICAgdGhpcy5fZmxpcFdyYXBwZXIgPSB2ZXJpZnlET01Ob2RlKG9wdGlvbnMud3JhcHBlcik7XG5cbiAgICAgICAgdGhpcy5fZmxpcCA9IGZ1bmN0aW9uKCRlbCwgY29udGVudCkge1xuICAgICAgICAgICAgaWYgKCRlbC5odG1sKCkgIT09IGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkZWxcbiAgICAgICAgICAgICAgICAgICAgLndyYXBJbm5lcigkKG5vZGVOYW1lVG9UYWcodGhpcy5fZmxpcFdyYXBwZXIpKSlcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQodGhpcy5fZmxpcFdyYXBwZXIpXG4gICAgICAgICAgICAgICAgICAgIC5kZWxheSh0aGlzLl9mbGlwRHVyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgIC5zbGlkZVVwKHRoaXMuX2ZsaXBEdXJhdGlvbiwgZnVuY3Rpb24oKSB7ICQodGhpcykucGFyZW50KCkuaHRtbChjb250ZW50KSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZsaXBwYWJsZTsiLCIvLyBMaW5lYXIgQ29uZ3J1ZW50aWFsIEdlbmVyYXRvcjogdmFyaWFudCBvZiBhIExlaG1hbiBHZW5lcmF0b3JcclxuLy8gYmFzZWQgb24gTENHIGZvdW5kIGhlcmU6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1Byb3Rvbms/cGFnZT00XHJcbnZhciBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IgPSAoZnVuY3Rpb24oKXtcclxuICBcInVzZSBzdHJpY3Q7XCJcclxuICAvLyBTZXQgdG8gdmFsdWVzIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OdW1lcmljYWxfUmVjaXBlc1xyXG4gIC8vIG0gaXMgYmFzaWNhbGx5IGNob3NlbiB0byBiZSBsYXJnZSAoYXMgaXQgaXMgdGhlIG1heCBwZXJpb2QpXHJcbiAgLy8gYW5kIGZvciBpdHMgcmVsYXRpb25zaGlwcyB0byBhIGFuZCBjXHJcbiAgZnVuY3Rpb24gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yKCkge1xyXG4gICAgICB0aGlzLm0gPSA0Mjk0OTY3Mjk2O1xyXG4gICAgICAvLyBhIC0gMSBzaG91bGQgYmUgZGl2aXNpYmxlIGJ5IG0ncyBwcmltZSBmYWN0b3JzXHJcbiAgICAgIHRoaXMuYSA9IDE2NjQ1MjU7XHJcbiAgICAgIC8vIGMgYW5kIG0gc2hvdWxkIGJlIGNvLXByaW1lXHJcbiAgICAgIHRoaXMuYyA9IDEwMTM5MDQyMjM7XHJcbiAgICAgIHRoaXMuc2VlZCA9IHZvaWQgMDtcclxuICAgICAgdGhpcy56ID0gdm9pZCAwO1xyXG4gICAgICAvLyBpbml0aWFsIHByaW1pbmcgb2YgdGhlIGdlbmVyYXRvciwgdW50aWwgbGF0ZXIgb3ZlcnJpZGVuXHJcbiAgICAgIHRoaXMuc2V0U2VlZCgpO1xyXG4gIH1cclxuICBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcixcclxuICAgIHNldFNlZWQ6IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnogPSB0aGlzLnNlZWQgPSB2YWwgfHwgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogdGhpcy5tKTsgfSxcclxuICAgIGdldFNlZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zZWVkOyB9LFxyXG4gICAgcmFuZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIGRlZmluZSB0aGUgcmVjdXJyZW5jZSByZWxhdGlvbnNoaXBcclxuICAgICAgdGhpcy56ID0gKHRoaXMuYSAqIHRoaXMueiArIHRoaXMuYykgJSB0aGlzLm07XHJcbiAgICAgIC8vIHJldHVybiBhIGZsb2F0IGluIFswLCAxKVxyXG4gICAgICAvLyBpZiB6ID0gbSB0aGVuIHogLyBtID0gMCB0aGVyZWZvcmUgKHogJSBtKSAvIG0gPCAxIGFsd2F5c1xyXG4gICAgICByZXR1cm4gdGhpcy56IC8gdGhpcy5tO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgcmV0dXJuIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuZnVuY3Rpb24gTXVsdGltYXAoKSB7XHJcbiAgICB0aGlzLl90YWJsZSA9IFtdO1xyXG59XHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhNdWx0aW1hcC5wcm90b3R5cGUsIHtcclxuICAgIGdldDogeyB2YWx1ZTogZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9fSxcclxuICAgIHNldDogeyB2YWx1ZTogZnVuY3Rpb24ocm93LCB2YWwpIHsgKHRoaXMuX3RhYmxlW3Jvd10gfHwgKHRoaXMuX3RhYmxlW3Jvd10gPSBbXSkpLnB1c2godmFsKTsgfX0sXHJcbiAgICBmb3JFYWNoOiB7IHZhbHVlOiBmdW5jdGlvbihmbikgeyByZXR1cm4gW10uZm9yRWFjaC5jYWxsKHRoaXMudmFsdWVzKCksIGZuKTsgfX0sXHJcbiAgICB2YWx1ZXM6IHsgdmFsdWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sIHRoaXMpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKSB7IHJldHVybiBhY2MuY29uY2F0KGl0ZW0pOyB9LCBbXSk7XHJcbiAgICB9fSxcclxuICAgIGNsZWFyOiB7IHZhbHVlOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfX0sXHJcbiAgICBzaXplOiB7IHZhbHVlOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH19XHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aW1hcDsiLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8vIGRvIGEgbm9uLWRlc3RydWN0aXZlIG1lcmdpbmcgb2YgYW55IG51bWJlciBvZlxyXG4vLyBqYXZhc2NyaXB0IGhhc2hlcy9vYmplY3RzXHJcbmZ1bmN0aW9uIF9leHRlbmQoYmFzZSwgb3RoZXJzKSB7XHJcblx0aWYgKCFvdGhlcnMpIHJldHVybiBiYXNlO1xyXG5cclxuXHR2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSxcclxuXHRcdF9jb3B5ID0gZnVuY3Rpb24ob2xkLCBuZXdlcikge1xyXG5cdFx0XHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG5ld2VyKSxcclxuXHRcdFx0XHRpID0ga2V5cy5sZW5ndGg7XHJcblx0XHRcdHdoaWxlIChpLS0pXHJcblx0XHRcdFx0b2xkW2tleXNbaV1dID0gbmV3ZXJba2V5c1tpXV07XHJcblx0XHRcdHJldHVybiBvbGQ7XHJcblx0XHR9LFxyXG5cdFx0cmV0ID0gX2NvcHkoe30sIGJhc2UpO1xyXG5cclxuXHRhcmdzLmNvbmNhdChvdGhlcnMpXHJcblx0XHQuZm9yRWFjaChmdW5jdGlvbihvdGhlcikgeyByZXQgPSBfY29weShyZXQsIG90aGVyKTsgfSk7XHJcblxyXG5cdHJldHVybiByZXQ7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzLl9leHRlbmQgPSBfZXh0ZW5kOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvciA9IHJlcXVpcmUoJy4vbGliL2xjZ2VuZXJhdG9yJyk7XHJcblxyXG5mdW5jdGlvbiBNaW5lTGF5ZXIobWluZXMsIGRpbWVuc2lvbnMpIHtcclxuICAgIHRoaXMuZ2VuZXJhdG9yID0gbmV3IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxuICAgIHRoaXMubWluZXMgPSArbWluZXMgfHwgMDtcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtkaW1lbnNpb25zIHx8IDA7XHJcblxyXG4gICAgdmFyIHJhbmRzID0gW10sXHJcbiAgICAgICAgZ2V0UmFuZG9tTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdlbmVyYXRvci5yYW5kKCkgKiAoTWF0aC5wb3codGhpcy5kaW1lbnNpb25zLCAyKSkgfCAwOyB9LmJpbmQodGhpcyk7XHJcblxyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgIHZhciBybmQgPSBnZXRSYW5kb21OdW1iZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKCF+cmFuZHMuaW5kZXhPZihybmQpKVxyXG4gICAgICAgICAgICByYW5kcy5wdXNoKHJuZCk7XHJcbiAgICAgICAgLy8gLi4ub3RoZXJ3aXNlLCBnaXZlIGl0IGFub3RoZXIgZ28tJ3JvdW5kOlxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5lcysrO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2NhdGlvbnMgPSByYW5kcy5tYXAoZnVuY3Rpb24ocm5kKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucztcclxuICAgICAgICByZXR1cm4gWyByb3csIGNlbGwgXTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmxvY2F0aW9ucztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lTGF5ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRmxpcHBhYmxlID0gcmVxdWlyZSgnLi9saWIvZmxpcHBhYmxlJyk7XHJcblxyXG5mdW5jdGlvbiBNaW5lc0Rpc3BsYXkobWluZXMsIGVsKSB7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG4gICAgdGhpcy5taW5lcyA9IG1pbmVzO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgwKTtcclxuICAgIHRoaXMuJE0gPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgxKTtcclxuICAgIHRoaXMuJFIgPSB0aGlzLiRlbC5maW5kKCcubWluZWNvdW50ZXInKS5lcSgyKTtcclxuXHJcbiAgICB0aGlzLnJlbmRlcigpO1xyXG59XHJcblxyXG5NaW5lc0Rpc3BsYXkucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IE1pbmVzRGlzcGxheSxcclxuICAgIF9pbmNyZW1lbnQ6IGZ1bmN0aW9uKGNoaXBzKSB7IGNoaXBzLmZvckVhY2goZnVuY3Rpb24oY2hpcCkgeyB0aGlzLl9mbGlwKGNoaXBbMF0sIGNoaXBbMV0pOyB9LCB0aGlzKTsgfSxcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IFN0cmluZyh0aGlzLm1pbmVzKS5zcGxpdCgnJyk7XHJcbiAgICAgICAgd2hpbGUgKGFyci5sZW5ndGggPCAzKVxyXG4gICAgICAgICAgICBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudChbXHJcbiAgICAgICAgICAgIFt0aGlzLiRSLCBhcnJbMl1dLFxyXG4gICAgICAgICAgICBbdGhpcy4kTSwgYXJyWzFdXSxcclxuICAgICAgICAgICAgW3RoaXMuJEwsIGFyclswXV1cclxuICAgICAgICBdKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZsaXBwYWJsZSgpLmNhbGwoTWluZXNEaXNwbGF5LnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmVzRGlzcGxheTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBGWF9EVVJBVElPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5GWF9EVVJBVElPTixcclxuICAgIERJR0lUU19NQVggPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuRElHSVRTLFxyXG4gICAgT1VUX09GX1JBTkdFID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLk9VVF9PRl9SQU5HRSxcclxuICAgIEZsaXBwYWJsZSA9IHJlcXVpcmUoJy4vbGliL2ZsaXBwYWJsZScpO1xyXG5cclxuZnVuY3Rpb24gU2NvcmVib2FyZChzY29yZSwgZWwpIHtcclxuICAgIHRoaXMuc2NvcmUgPSBzY29yZSB8fCAwO1xyXG4gICAgdGhpcy5pbml0aWFsID0gc2NvcmU7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcjc2MxJyk7XHJcbiAgICB0aGlzLiRNID0gdGhpcy4kZWwuZmluZCgnI3NjMicpO1xyXG4gICAgdGhpcy4kUiA9IHRoaXMuJGVsLmZpbmQoJyNzYzMnKTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmluaXRpYWwpO1xyXG59XHJcblxyXG5TY29yZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTY29yZWJvYXJkLFxyXG4gICAgX2luY3JlbWVudDogZnVuY3Rpb24oY2hpcHMpIHtcclxuICAgICAgICBjaGlwcy5mb3JFYWNoKGZ1bmN0aW9uKGNoaXApIHsgdGhpcy5fZmxpcChjaGlwWzBdLCBjaGlwWzFdKTsgfSwgdGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwb2ludHMpIHtcclxuICAgICAgICBpZiAoIXBvaW50cykgcmV0dXJuO1xyXG4gICAgICAgIHZhciBwdHMgPSB0b1N0cmluZ0FycmF5KHBvaW50cyk7XHJcbiAgICAgICAgdGhpcy5faW5jcmVtZW50KFtbdGhpcy4kUiwgcHRzWzJdXSwgW3RoaXMuJE0sIHB0c1sxXV0sIFt0aGlzLiRMLCBwdHNbMF1dXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5GbGlwcGFibGUoeyBkdXJhdGlvbjogRlhfRFVSQVRJT04gfSkuY2FsbChTY29yZWJvYXJkLnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3JlYm9hcmQ7XHJcblxyXG5mdW5jdGlvbiB0b1N0cmluZ0FycmF5KG4pIHtcclxuICAgIHZhciBudW0gPSBTdHJpbmcobiksXHJcbiAgICAgICAgbGVuID0gbnVtLmxlbmd0aDtcclxuXHJcbiAgICAvLyB0b28gYmlnIGZvciAqdGhpcyogc2NvcmVib2FyZC4uLlxyXG4gICAgaWYgKGxlbiA+IERJR0lUU19NQVgpIHtcclxuICAgICAgICBudW0gPSBPVVRfT0ZfUkFOR0U7XHJcbiAgICAgICAgbGVuID0gT1VUX09GX1JBTkdFLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWyBudW1bbGVuIC0gM10gfHwgXCIwXCIsIG51bVtsZW4gLSAyXSB8fCBcIjBcIiwgbnVtW2xlbiAtIDFdIHx8IFwiMFwiIF07XHJcbn0iLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBQb2ludHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JpbmdSdWxlcyxcclxuICAgIFNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yID0gcmVxdWlyZSgnLi9lcnJvcnMnKS5TY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcjtcclxuXHJcbmZ1bmN0aW9uIFNjb3Jla2VlcGVyKGdhbWVib2FyZCkge1xyXG5cclxuXHJcbiAgdGhpcy5jYWxsYmFja3MgPSB7XHJcbiAgICB1cDogZnVuY3Rpb24ocHRzKSB7XHJcbiAgICAgIHRoaXMuc2NvcmUgKz0gcG9zKHB0cyk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uKHB0cykge1xyXG4gICAgICB0aGlzLnNjb3JlID0gKHRoaXMuc2NvcmUgLSBuZWcocHRzKSA8PSAwKSA/IDAgOiB0aGlzLnNjb3JlIC0gbmVnKHB0cyk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHRoaXMuZmluYWxpemVycyA9IHtcclxuICAgIGZvck9wZW5pbmdTcXVhcmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgbW92ZXMgPSBnYW1lYm9hcmQudXNlck1vdmVzLFxyXG4gICAgICAgICAgICB1bm1pbmVkID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpIC0gZ2FtZWJvYXJkLm1pbmVzO1xyXG4gICAgICAgIHJldHVybiAxIC0gKH5+KG1vdmVzIC8gdW5taW5lZCkgKiAxMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yVGltZVBhc3NlZDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIHRvdGFsID0gZ2FtZWJvYXJkLmNsb2NrLm1heCwgZWxhcHNlZCA9IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzO1xyXG4gICAgICAgIHJldHVybiAxMDAgLSB+fihlbGFwc2VkIC8gdG90YWwgKiAxMDApO1xyXG4gICAgfSxcclxuICAgIGZvckZld2VzdE1vdmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICAvLyBleHBlcmltZW50YWw6IHNxcnQoeF4yIC0geSkgKiAxMFxyXG4gICAgICAgIHZhciBkaW1zID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpO1xyXG4gICAgICAgIHJldHVybiB+fihNYXRoLnNxcnQoZGltcyAtIGdhbWVib2FyZC51c2VyTW92ZXMpICogUG9pbnRzLlVTRVJNT1ZFU19NVUxUSVBMSUVSKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0aGlzLnF1ZXVlID0gW107XHJcbiAgdGhpcy5maW5hbCA9IFtdO1xyXG5cclxuICAvLyBUT0RPOiB3ZWFuIHRoaXMgY2xhc3Mgb2ZmIGRlcGVuZGVuY3kgb24gZ2FtZWJvYXJkXHJcbiAgLy8gc2hvdWxkIG9ubHkgbmVlZCB0byBoYXZlIGN0b3IgaW5qZWN0ZWQgd2l0aCB0aGUgZ2FtZWJvYXJkJ3MgZW1pdHRlclxyXG4gIHRoaXMuZ2FtZWJvYXJkID0gZ2FtZWJvYXJkO1xyXG4gIHRoaXMuZW1pdHRlciA9IGdhbWVib2FyZC5lbWl0dGVyO1xyXG4gIHRoaXMuc2NvcmUgPSAwO1xyXG5cclxuICB0aGlzLm5zdSA9IHRoaXMuX2RldGVybWluZVNpZ25pZmljYW50VW5pdCgpO1xyXG4gIHRoaXMuZW5kR2FtZSA9IGZhbHNlOyAvLyBpZiBnYW1lIGlzIG5vdyBvdmVyLCBmbHVzaCBxdWV1ZXNcclxuICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwodGhpcy5fdGljay5iaW5kKHRoaXMpLCB0aGlzLm5zdSk7XHJcblxyXG4gIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcG9zKHB0cykgeyByZXR1cm4gTWF0aC5hYnMoK3B0cykgfHwgMDsgfVxyXG5mdW5jdGlvbiBuZWcocHRzKSB7IHJldHVybiAtMSAqIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuXHJcblNjb3Jla2VlcGVyLnByb3RvdHlwZSA9IHtcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIEVWRU5UUyA9IHtcclxuICAgICAgICAnc3E6b3Blbic6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy51cChzcXVhcmUuZ2V0RGFuZ2VyKCkgKiBQb2ludHMuREFOR0VSX0lEWF9NVUxUSVBMSUVSKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwKFBvaW50cy5CTEFOS19TUVVBUkVfUFRTKTtcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAnc3E6ZmxhZyc6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZFVwKFBvaW50cy5GTEFHX01JTkVEKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVycmVkRG93bihQb2ludHMuTUlTRkxBR19VTk1JTkVEICsgKHNxdWFyZS5nZXREYW5nZXIoKSB8fCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ3NxOnVuZmxhZyc6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZERvd24oUG9pbnRzLlVORkxBR19NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZFVwKFBvaW50cy5NSVNVTkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdnYjpzdGFydCc6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgfSxcclxuICAgICAgICAnZ2I6cmVzdW1lJzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IHRoaXMuZW5kR2FtZSA9IGZhbHNlOyB9LFxyXG4gICAgICAgICdnYjpwYXVzZSc6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9LFxyXG4gICAgICAgICdnYjplbmQ6d2luJzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IHRoaXMuZW5kR2FtZSA9IHRydWU7IH0sXHJcbiAgICAgICAgJ2diOmVuZDpvdmVyJzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IHRoaXMuZW5kR2FtZSA9IHRydWU7IH0sXHJcbiAgICAgICAgJ2diOmVuZDp0aW1lZG91dCc6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmb3IgKHZhciBldmVudCBpbiBFVkVOVFMpXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKGV2ZW50LCBFVkVOVFNbZXZlbnRdLmJpbmQodGhpcykpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVTaWduaWZpY2FudFVuaXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBpc0N1c3RvbSA9IHRoaXMuZ2FtZWJvYXJkLmlzQ3VzdG9tLFxyXG4gICAgICAgICAgICBzID0gdGhpcy5nYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgU0VDT05EUyA9IDEwMDAsIC8vIG1pbGxpc2Vjb25kc1xyXG4gICAgICAgICAgICBnZXRNYXhUaW1lID0gZnVuY3Rpb24odGltZSkgeyByZXR1cm4gTWF0aC5tYXgodGltZSwgMSAqIFNFQ09ORFMpIH07XHJcblxyXG4gICAgICAgIGlmIChzIC8gMTAwID49IDEpXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRNYXhUaW1lKH5+KHMgLyAyNTAgKiBTRUNPTkRTKSk7XHJcbiAgICAgICAgZWxzZSBpZiAocyAvIDEwID49IDEpXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRNYXhUaW1lKDUgKiBTRUNPTkRTKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiAxICogU0VDT05EUztcclxuICAgIH0sXHJcbiAgICBfYmluYXJ5U2VhcmNoOiBmdW5jdGlvbih4KSB7XHJcbiAgICAgICAgdmFyIGxvID0gMCwgaGkgPSB0aGlzLnF1ZXVlLmxlbmd0aDtcclxuICAgICAgICB3aGlsZSAobG8gPCBoaSkge1xyXG4gICAgICAgICAgICB2YXIgbWlkID0gfn4oKGxvICsgaGkpID4+IDEpO1xyXG4gICAgICAgICAgICBpZiAoeC50aW1lIDwgdGhpcy5xdWV1ZVttaWRdLnRpbWUpXHJcbiAgICAgICAgICAgICAgICBoaSA9IG1pZDtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbG8gPSBtaWQgKyAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbG87XHJcbiAgICB9LFxyXG4gICAgX2VucXVldWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKHRoaXMuX2JpbmFyeVNlYXJjaCh4KSwgMCwgeCk7IH0sXHJcbiAgICBfcHJvY2Vzc0V2ZW50OiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50LnR5cGVdO1xyXG4gICAgICAgIGlmIChmbiAhPSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gKGZuLmxlbmd0aCA+IDEpXHJcbiAgICAgICAgICAgICAgICA/IGZuLmNhbGwodGhpcywgZXZlbnQucHRzLCBmdW5jdGlvbihlcnIpIHsgaWYgKCFlcnIpIHJldHVybiB2b2lkIDA7IH0pXHJcbiAgICAgICAgICAgICAgICA6IGNvbnNvbGUubG9nKFwiPGRlZmVycmVkIHNjb3JlIGV2ZW50OiAlbz4gOm9sZCA9PiBbJW9dXCIsIGV2ZW50LnR5cGUsIHRoaXMuc2NvcmUpLFxyXG4gICAgICAgICAgICAgICAgICBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cyksXHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiLi4uOm5ldyA9PiBbJW9dXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcihcIlNjb3Jla2VlcGVyIGNvdWxkIG5vdCBmaW5kIGZ1bmN0aW9uIHswfVwiLCBldmVudC50eXBlKTtcclxuXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzY29yZTpjaGFuZ2VcIiwgdGhpcy5zY29yZSk7XHJcbiAgICB9LFxyXG4gICAgX3Byb2Nlc3NGaW5hbGl6ZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBmb3IgKHZhciB2aXNpdG9yIGluIHRoaXMuZmluYWxpemVycykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIjxmaW5hbGl6ZXI6ICVvPiA6b2xkIFslb10gPT4gOm5ldyBbJW9dLi4uIFwiLCB2aXNpdG9yLCB0aGlzLnNjb3JlLCAodGhpcy5zY29yZSArPSB0aGlzLmZpbmFsaXplcnNbdmlzaXRvcl0odGhpcy5nYW1lYm9hcmQpKSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuc2NvcmUgKz0gdmlzaXRvcih0aGlzLmdhbWVib2FyZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZmluYWwuZm9yRWFjaChmdW5jdGlvbihmKSB7IHRoaXMuc2NvcmUgKz0gZjsgfSwgdGhpcyk7XHJcbiAgICAgICAgLy8gZmluYWwgdXBkYXRlIG9mIHRoZSBzY29yZVxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlOmZpbmFsXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF90aWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3VycklkeCA9IHRoaXMuX2JpbmFyeVNlYXJjaCh7IHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpIH0pLCBpbmRleCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgY3VycklkeCkge1xyXG4gICAgICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHsgdGhpcy5fcHJvY2Vzc0V2ZW50KHRoaXMucXVldWVbaW5kZXhdKTsgcmV0dXJuIGluZGV4ICs9IDE7IH0uYmluZCh0aGlzKTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKDAsIGN1cnJJZHgpO1xyXG4gICAgfSxcclxuICAgIF9hZGRTY29yZVRvUXVldWU6IGZ1bmN0aW9uKHR5cGUsIHB0cykgeyByZXR1cm4gdGhpcy5fZW5xdWV1ZSh7IHRpbWU6ICgoK25ldyBEYXRlKSArIHRoaXMubnN1KSwgdHlwZTogdHlwZSwgcHRzOiBwdHMgfSk7IH0sXHJcblxyXG4gICAgdXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmNhbGxiYWNrcy51cC5jYWxsKHRoaXMsIHB0cyk7IH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5jYWxsYmFja3MuZG93bi5jYWxsKHRoaXMsIHB0cyk7IH0sXHJcblxyXG4gICAgZGVmZXJyZWRVcDogZnVuY3Rpb24ocHRzKSB7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcInVwXCIsIHBvcyhwdHMpKTsgfSxcclxuICAgIGRlZmVycmVkRG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcImRvd25cIiwgbmVnKHB0cykpOyB9LFxyXG5cclxuICAgIGZpbmFsVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmZpbmFsLnB1c2gocG9zKHB0cykpOyB9LFxyXG4gICAgZmluYWxEb3duOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBnZXRQZW5kaW5nU2NvcmVDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnF1ZXVlLmxlbmd0aDsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIG91dCByZW1haW5pbmcgcXVldWUhXCIpO1xyXG4gICAgICB0aGlzLnF1ZXVlLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgdGhpcy5fcHJvY2Vzc0V2ZW50KGV2ZW50KTsgfSwgdGhpcyk7XHJcblxyXG4gICAgICB0aGlzLl9wcm9jZXNzRmluYWxpemVycygpO1xyXG5cclxuICAgICAgY29uc29sZS5pbmZvKFwiRklOQUwgU0NPUkU6ICVvXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcclxuICAgICAgdGhpcy5xdWV1ZS5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLmZpbmFsLmxlbmd0aCA9IDA7XHJcbiAgICAgIHRoaXMuc2NvcmUgPSAwO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY29yZWtlZXBlcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBTZXJpYWxpemVyID0ge1xyXG4gICAgZXhwb3J0OiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBfbWV0YToge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiArbmV3IERhdGUsXHJcbiAgICAgICAgICAgICAgICBzY29yZTogZ2FtZWJvYXJkLnNjb3Jla2VlcGVyLnNjb3JlLFxyXG4gICAgICAgICAgICAgICAgdGltZXI6IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHM6IGdhbWVib2FyZC5lbWl0dGVyLl90cmFuc2NyaXB0cyB8fCBbXSxcclxuICAgICAgICAgICAgICAgIHVzZXI6IHt9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICRlbDogZ2FtZWJvYXJkLiRlbC5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIGJvYXJkOiBnYW1lYm9hcmQuYm9hcmQuX3RhYmxlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmVrZWVwZXI6IHsgcXVldWU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5xdWV1ZSwgZmluYWw6IGdhbWVib2FyZC5zY29yZWtlZXBlci5maW5hbCB9LFxyXG4gICAgICAgICAgICAgICAgZmxhc2hDb250YWluZXI6IGdhbWVib2FyZC5mbGFzaENvbnRhaW5lci5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIHRoZW1lOiBnYW1lYm9hcmQudGhlbWUsXHJcbiAgICAgICAgICAgICAgICBkZWJ1Z19tb2RlOiBnYW1lYm9hcmQuZGVidWdfbW9kZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdhbWVib2FyZC5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgbWluZXM6IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgICAgIHVzZXJNb3ZlczogZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgICAgIGlzTW9iaWxlOiBnYW1lYm9hcmQuaXNNb2JpbGUsXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGZsYWcgYWxlcnRzIEdhbWVib2FyZCBjb25zdHJ1Y3RvciB0b1xyXG4gICAgICAgICAgICAgICAgLy8gYWx0ZXIgdXN1YWwgaW5pdGlhbGl6YXRpb24gcHJvY2Vzcy4uLlxyXG4gICAgICAgICAgICAgICAgaXNQZXJzaXN0ZWQ6IHRydWVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG4gICAgaW1wb3J0OiBmdW5jdGlvbihleHBvcnRlZCkge1xyXG5cclxuICAgICAgICAvLyAxLiBpbiB0aGlzIGNvbnRleHQsIGB0aGlzYCBpcyB0aGUgbmV3bHktaW5zdGFudGlhdGVkLFxyXG4gICAgICAgIC8vICAgIGJ1dCBub3QteWV0LXNldC11cCBHYW1lYm9hcmQgaW5zdGFuY2UuXHJcbiAgICAgICAgLy8gMi4gcmVwbGFjZSBgYm9hcmRgIHdpdGggbmV3IE11bHRpbWFwOlxyXG4gICAgICAgIC8vICAgICAtIGNvdW50IGFycmF5cyBhdCBmaXJzdCBsZXZlbCBpbiBib2FyZCBmb3IgbnVtIHJvd3NcclxuICAgICAgICAvLyAgICAgICAgICBbW1t7XCJyb3dcIjowLFwiY2VsbFwiOjAsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMTAwMFwifSxcImRhbmdlclwiOjB9LFxyXG4gICAgICAgIC8vICAgICAgICAgIHtcInJvd1wiOjAsXCJjZWxsXCI6MixcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIwMDEwXCJ9fV1dXVxyXG4gICAgICAgIC8vICAgICAtIHBhcnNlIGVhY2ggb2JqZWN0IHRvIGNyZWF0ZSBuZXcgU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBfZmxhZ3MpXHJcbiAgICAgICAgLy8gMy4gJGVsID0gJChleHBvcnRlZC4kZWwpXHJcbiAgICAgICAgLy8gNC4gZmxhc2hDb250YWluZXIgPSAkKGV4cG9ydGVkLmZsYXNoQ29udGFpbmVyKVxyXG4gICAgICAgIC8vIDUuIHRoZW1lID0gZXhwb3J0ZWQudGhlbWVcclxuICAgICAgICAvLyA2LiBkZWJ1Z19tb2RlID0gZXhwb3J0ZWQuZGVidWdfbW9kZVxyXG4gICAgICAgIC8vIDcuIGRpbWVuc2lvbnMgPSBleHBvcnRlZC5kaW1lbnNpb25zXHJcbiAgICAgICAgLy8gOC4gbWluZXMgPSBnYW1lYm9hcmQubWluZXNcclxuICAgICAgICAvLyA5LiB1c2VyTW92ZXMgPSBnYW1lYm9hZC51c2VyTW92ZXMsIGFuZCBpc01vYmlsZVxyXG4gICAgICAgIC8vIDEwLiBtYWtlIG5ldyBDb3VudGRvd24gd2l0aCBleHBvcnRlZC5fbWV0YS50aW1lciA9IHNlY29uZHMsIGNsb2NrLnN0YXJ0KClcclxuICAgICAgICAvLyAxMS4gaW5zdGFudGlhdGUgbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIsIGxvYWRpbmcgX21ldGEudHJhbnNjcmlwdHMgaW50byBpdHMgX3RyYW5zY3JpcHRzXHJcbiAgICAgICAgLy8gMTIuIHJlLXJ1biB0aGUgaW50ZXJuYWwgaW5pdCgpIG9wczogX2xvYWRCb2FyZCwgX3JlbmRlckdyaWRcclxuXHJcbi8qICAgICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMgPSArdGhpcy5zZXR0aW5ncy5kaW1lbnNpb25zO1xyXG4gICAgICAgIHRoaXMubWluZXMgPSArdGhpcy5zZXR0aW5ncy5taW5lcztcclxuICAgICAgICB0aGlzLiRlbCA9ICQodGhpcy5zZXR0aW5ncy5ib2FyZCk7XHJcbiAgICAgICAgdGhpcy5pc0N1c3RvbSA9IHRoaXMuc2V0dGluZ3MuaXNDdXN0b20gfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIoVHJhbnNjcmlwdGlvblN0cmF0ZWd5KTtcclxuICAgICAgICB0aGlzLmRlYnVnX21vZGUgPSB0aGlzLnNldHRpbmdzLmRlYnVnX21vZGU7XHJcbiAgICAgICAgdGhpcy50aGVtZSA9IHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy5zZXR0aW5ncy50aGVtZSk7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lciA9ICQoTWVzc2FnZU92ZXJsYXkpO1xyXG4gICAgICAgIHRoaXMuaXNNb2JpbGUgPSB0aGlzLl9jaGVja0Zvck1vYmlsZSgpO1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgICAgICB0aGlzLmRhbmdlckNhbGMgPSBuZXcgRGFuZ2VyQ2FsY3VsYXRvcih0aGlzKTtcclxuICAgICAgICB0aGlzLm1pbmVzRGlzcGxheSA9IG5ldyBNaW5lc0Rpc3BsYXkodGhpcy5taW5lcywgXCIjbWluZXMtZGlzcGxheVwiKTtcclxuICAgICAgICB0aGlzLmNsb2NrID0gbmV3IFRpbWVyKDAsICt0aGlzLnNldHRpbmdzLnRpbWVyIHx8IHRoaXMuX2RldGVybWluZVRpbWVyKCksIHRoaXMuc2V0dGluZ3MuaXNDb3VudGRvd24sIHRoaXMuZW1pdHRlcik7XHJcbiAgICAgICAgdGhpcy5jb3VudGRvd24gPSBuZXcgQ291bnRkb3duKFwiI2NvdW50ZG93blwiKTtcclxuICAgICAgICB0aGlzLnNjb3Jla2VlcGVyID0gbmV3IFNjb3Jla2VlcGVyKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuc2NvcmVib2FyZCA9IG5ldyBTY29yZWJvYXJkKDAsIFwiI3Njb3JlLWRpc3BsYXlcIik7XHJcbiovXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VyaWFsaXplcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBCaXRGbGFnRmFjdG9yeSA9IHJlcXVpcmUoJy4vbGliL2JpdC1mbGFnLWZhY3RvcnknKSxcclxuICAgIFN5bWJvbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlN5bWJvbHMsXHJcbiAgICBGbGFncyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuRmxhZ3MsXHJcblxyXG4gICAgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWyBGbGFncy5PUEVOLCBGbGFncy5NSU5FRCwgRmxhZ3MuRkxBR0dFRCwgRmxhZ3MuSU5ERVhFRCBdKTtcclxuXHJcbmZ1bmN0aW9uIFNxdWFyZShyb3csIGNlbGwsIGRhbmdlciwgZmxhZ3MpIHtcclxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcXVhcmUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgU3F1YXJlKGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XHJcbiAgICB0aGlzLnN0YXRlID0gZmxhZ3MgPyBuZXcgQml0RmxhZ3MoZmxhZ3MpIDogbmV3IEJpdEZsYWdzO1xyXG4gICAgdGhpcy5kYW5nZXIgPSAoZGFuZ2VyID09ICtkYW5nZXIpID8gK2RhbmdlciA6IDA7XHJcblxyXG4gICAgaWYgKHRoaXMuZGFuZ2VyID4gMCkgdGhpcy5pbmRleCgpO1xyXG59XHJcblxyXG5TcXVhcmUucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IFNxdWFyZSxcclxuICAgIGdldFJvdzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJvdzsgfSxcclxuICAgIGdldENlbGw6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jZWxsOyB9LFxyXG4gICAgZ2V0RGFuZ2VyOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZGFuZ2VyOyB9LFxyXG4gICAgc2V0RGFuZ2VyOiBmdW5jdGlvbihpZHgpIHsgaWYgKGlkeCA9PSAraWR4KSB7IHRoaXMuZGFuZ2VyID0gK2lkeDsgdGhpcy5kYW5nZXIgPiAwICYmIHRoaXMuaW5kZXgoKTsgfSB9LFxyXG4gICAgZ2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhTeW1ib2xzKVxyXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gdGhpc1sgJ2lzJyArIGtleS5jaGFyQXQoMCkgKyBrZXkuc3Vic3RyaW5nKDEpLnRvTG93ZXJDYXNlKCkgXSgpOyB9LCB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4ga2V5LnRvTG93ZXJDYXNlKCk7IH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICB1bmZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfTUlORUQpOyB9LFxyXG4gICAgdW5taW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfTUlORUQpOyB9LFxyXG4gICAgaW5kZXg6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfSU5ERVhFRCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gIXRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKTsgfSxcclxuICAgIGlzSW5kZXhlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzSW5kZXhlZCgpOyB9LFxyXG5cclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IHJvdzogdGhpcy5yb3csIGNlbGw6IHRoaXMuY2VsbCwgc3RhdGU6IHRoaXMuc3RhdGUsIGRhbmdlcjogdGhpcy5kYW5nZXIgfSB9LFxyXG4gICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKClcclxuICAgICAgICAgICAgPyBTeW1ib2xzLk1JTkVEIDogdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKVxyXG4gICAgICAgICAgICAgICAgPyBTeW1ib2xzLkZMQUdHRUQgOiB0aGlzLnN0YXRlLmlzT3BlbigpXHJcbiAgICAgICAgICAgICAgICAgICAgPyBTeW1ib2xzLk9QRU4gOiBTeW1ib2xzLkNMT1NFRDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3F1YXJlOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxuXHJcbnZhciBUaGVtZVN0eWxlciA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKHRoZW1lLCAkZWwpIHtcclxuXHJcblx0XHQkZWwgfHwgKCRlbCA9ICQoJEMuRGVmYXVsdENvbmZpZy5ib2FyZCkpO1xyXG5cclxuXHRcdHZhciB0aGVtZUZpbGUgPSAkQy5UaGVtZXNbdGhlbWVdLFxyXG5cdFx0XHQkYm9keSA9ICRlbC5wYXJlbnRzKFwiYm9keVwiKS5sZW5ndGggPyAkZWwucGFyZW50cyhcImJvZHlcIikgOiAkKGRvY3VtZW50LmJvZHkpO1xyXG5cclxuXHRcdCRib2R5LnJlbW92ZUNsYXNzKCkuYWRkQ2xhc3ModGhlbWVGaWxlKTtcclxuXHRcdC8qICxcclxuXHRcdFx0JGhlYWQgPSAkZWwucGFyZW50cyhcImJvZHlcIikuc2libGluZ3MoXCJoZWFkXCIpLFxyXG5cdFx0XHQkc3R5bGVzID0gJGhlYWQuZmluZChcImxpbmtcIiksXHJcblxyXG5cdFx0XHRoYXNQcmVFeGlzdGluZyA9IGZ1bmN0aW9uKHN0eWxlc2hlZXRzKSB7XHJcblx0XHRcdFx0cmV0dXJuICEhc3R5bGVzaGVldHMuZmlsdGVyKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICEhfiQodGhpcykuYXR0cignaHJlZicpLmluZGV4T2YodGhlbWVGaWxlKTtcclxuXHRcdFx0XHR9KS5sZW5ndGhcclxuXHRcdFx0fSxcclxuXHRcdFx0Ly8gYnVpbGQgYSBuZXcgPGxpbms+IHRhZyBmb3IgdGhlIGRlc2lyZWQgdGhlbWUgc3R5bGVzaGVldDpcclxuXHRcdFx0JGxpbmsgPSAkKFwiPGxpbmsgLz5cIiwge1xyXG5cdFx0XHRcdHJlbDogJ3N0eWxlc2hlZXQnLFxyXG5cdFx0XHRcdHR5cGU6ICd0ZXh0L2NzcycsXHJcblx0XHRcdFx0aHJlZjogJ2Nzcy8nICsgdGhlbWVGaWxlICsgJy5jc3MnXHJcblx0XHRcdH0pO1xyXG5cdFx0Ly8gdXNpbmcgJGVsIGFzIGFuY2hvciB0byB0aGUgRE9NLCBnbyB1cCBhbmRcclxuXHRcdC8vIGxvb2sgZm9yIGxpZ2h0LmNzcyBvciBkYXJrLmNzcywgYW5kLS1pZiBuZWNlc3NhcnktLXN3YXBcclxuXHRcdC8vIGl0IG91dCBmb3IgYHRoZW1lYC5cclxuXHRcdC8vIEFkZCAkbGluayBpZmYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0IVxyXG5cdFx0aWYgKCFoYXNQcmVFeGlzdGluZygkc3R5bGVzKSlcclxuXHRcdFx0JHN0eWxlcy5hZnRlcigkbGluayk7Ki9cclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRoZW1lU3R5bGVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuZnVuY3Rpb24gVGltZXIoaW5pdGlhbCwgbWF4LCBpc0NvdW50ZG93biwgZW1pdHRlcikge1xyXG4gICAgdGhpcy5pc0NvdW50ZG93biA9IGlzQ291bnRkb3duO1xyXG4gICAgdGhpcy5zZWNvbmRzID0gdGhpcy5pc0NvdW50ZG93biA/IG1heCA6IGluaXRpYWw7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBpbml0aWFsO1xyXG4gICAgdGhpcy5tYXggPSBtYXg7XHJcblxyXG4gICAgdGhpcy5lbWl0dGVyID0gZW1pdHRlcjtcclxuXHJcbiAgICB0aGlzLmZyZWV6ZSA9IGZhbHNlO1xyXG59XHJcblxyXG5UaW1lci5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogVGltZXIsXHJcbiAgICBfcmVuZGVySW5pdGlhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICB0aGlzLl9wdWJsaXNoKGFyclswXSB8fCAwLCBhcnJbMV0gfHwgMCk7XHJcbiAgICB9LFxyXG4gICAgX3RvTWluc1NlY3M6IGZ1bmN0aW9uKHNlY3MpIHtcclxuICAgICAgICB2YXIgbWlucyA9IH5+KHNlY3MgLyA2MCksXHJcbiAgICAgICAgICAgIHNlY3MgPSB+fihzZWNzICUgNjApO1xyXG4gICAgICAgIHJldHVybiBbbWlucywgc2Vjc107XHJcbiAgICB9LFxyXG4gICAgX2NvdW50ZG93bjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIHRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZnJlZXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0aGlzLmlzQ291bnRkb3duICYmIHRoaXMuc2Vjb25kcyA+IDApIHx8ICghdGhpcy5pc0NvdW50ZG93biAmJiB0aGlzLnNlY29uZHMgPCB0aGlzLm1heCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHVibGlzaChcImNoYW5nZVwiLCBhcnJbMF0sIGFyclsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNDb3VudGRvd24gPyB0aGlzLnNlY29uZHMtLSA6IHRoaXMuc2Vjb25kcysrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wdWJsaXNoKFwiZW5kXCIsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcyksIDEwMDApO1xyXG4gICAgfSxcclxuICAgIF9wdWJsaXNoOiBmdW5jdGlvbihldmVudCwgbWlucywgc2VjcykgeyB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInRpbWVyOlwiICsgZXZlbnQsIG1pbnMsIHNlY3MpOyB9LFxyXG4gICAgZ2V0TWludXRlczogZnVuY3Rpb24oKSB7IHJldHVybiArdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpWzBdOyB9LFxyXG4gICAgZ2V0U2Vjb25kczogZnVuY3Rpb24oKSB7IHJldHVybiArdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpWzFdOyB9LFxyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIHQgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fcHVibGlzaChcInN0YXJ0XCIsIHRbMF0sIHRbMV0pO1xyXG4gICAgICAgIHRoaXMuX2NvdW50ZG93bigpO1xyXG4gICAgfSxcclxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZnJlZXplID0gdHJ1ZTtcclxuICAgICAgICB2YXIgdCA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICB0aGlzLl9wdWJsaXNoKFwic3RvcFwiLCB0WzBdLCB0WzFdKTtcclxuICAgIH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5zZWNvbmRzID0gMDtcclxuICAgICAgICB0aGlzLl9wdWJsaXNoKFwicmVzZXRcIiwgMCwgMCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2xpYi9lbWl0dGVyJyksXHJcbiAgICBUcmFuc2NyaXB0aW9uU3RyYXRlZ3kgPSByZXF1aXJlKCcuL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3knKTtcclxuXHJcbmZ1bmN0aW9uIFRyYW5zY3JpYmluZ0VtaXR0ZXIoc3RyYXRlZ3kpIHtcclxuICAgIEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuX3RyYW5zY3JpcHRzID0gW107XHJcbiAgICB0aGlzLl9zdHJhdGVneSA9IChzdHJhdGVneSAmJiBzdHJhdGVneS5hcHBseSkgPyBzdHJhdGVneSA6IFRyYW5zY3JpcHRpb25TdHJhdGVneTtcclxufVxyXG5cclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVtaXR0ZXIucHJvdG90eXBlKTtcclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUcmFuc2NyaWJpbmdFbWl0dGVyO1xyXG5cclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUuX190cmlnZ2VyX18gPSBUcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS50cmlnZ2VyO1xyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24oLyogZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xyXG4gICAgLy8gc2VuZCBvcmlnaW5hbCBwYXJhbXMgdG8gdGhlIHN1YnNjcmliZXJzLi4uXHJcbiAgICB0aGlzLl9fdHJpZ2dlcl9fLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgLy8gLi4udGhlbiBhbHRlciB0aGUgcGFyYW1zIGZvciB0aGUgdHJhbnNjcmlwdCdzIHJlY29yZHNcclxuICAgIHZhciB0c2NyaXB0ID0gdGhpcy5fc3RyYXRlZ3kuYXBwbHkoYXJncyk7XHJcbiAgICB0c2NyaXB0ICYmIHRoaXMuX3RyYW5zY3JpcHRzLnB1c2godHNjcmlwdCk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXG5cbnZhciBEZWZhdWx0VHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0ge1xuICAgICAgICBhcHBseTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVswXSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZGF0YVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6b3BlblwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6Y2xvc2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOmZsYWdcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOnVuZmxhZ1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6bWluZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RhbmRhcmQgU3F1YXJlLWJhc2VkIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAwOiBldmVudCBuYW1lLCAxOiBTcXVhcmUgaW5zdGFuY2UsIDI6IGpRdWVyeS13cmFwcGVkIERPTSBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIlNxdWFyZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMV0gPSBKU09OLnN0cmluZ2lmeShkYXRhWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzJdIGluc3RhbmNlb2YgalF1ZXJ5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMl0gPSBidWlsZERPTVN0cmluZyhkYXRhWzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6c3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOnJlc3VtZVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6cGF1c2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDp3aW5cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDpvdmVyXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjplbmQ6dGltZWRvdXRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0YW5kYXJkIEdhbWVib2FyZC1iYXNlZCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJNdWx0aW1hcFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMV0gPSBKU09OLnN0cmluZ2lmeShkYXRhWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzY29yZTpjaGFuZ2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNjb3JlOmNoYW5nZTpmaW5hbFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpbWVyOnN0YXJ0XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1lcjpzdG9wXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1lcjpjaGFuZ2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpbWVyOnJlc2V0XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1lcjplbmRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBuby1vcFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcHJlZml4IGFycmF5IGNvbnRlbnRzIHdpdGggdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGl0cyBrZXlcbiAgICAgICAgICAgICAgICBkYXRhICYmIGRhdGEudW5zaGlmdCgrbmV3IERhdGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBEZWZhdWx0VHJhbnNjcmlwdGlvblN0cmF0ZWd5O1xuXG4vLyBUYWtlcyBhIDx0ZD4gRE9NIG5vZGUsIGFuZCBjb252ZXJ0cyBpdCB0byBhXG4vLyBzdHJpbmcgZGVzY3JpcHRvciwgZS5nLiwgXCJ0ciNyb3cwIHRkLmNlbGwwLm1pbmVkLmNsb3NlZFwiLlxuZnVuY3Rpb24gYnVpbGRET01TdHJpbmcoJGVsKSB7XG4gICAgdmFyIG5vZGUgPSAkZWwgaW5zdGFuY2VvZiBqUXVlcnkgPyAkZWxbMF0gOiAkZWwsXG4gICAgICAgIC8vIHNvcnRzIGNsYXNzIG5hbWVzLCBwdXR0aW5nIHRoZSBcImNlbGxYXCIgY2xhc3MgZmlyc3RcbiAgICAgICAgU09SVF9GTl9DRUxMX0ZJUlNUID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgZnVuY3Rpb24gaW5jaXBpdChzdHIpIHsgcmV0dXJuIHN0ci5zdWJzdHJpbmcoMCwgXCJjZWxsXCIubGVuZ3RoKS50b0xvd2VyQ2FzZSgpOyB9O1xuICAgICAgICAgICAgcmV0dXJuIChpbmNpcGl0KGEpID09PSBcImNlbGxcIiB8fCBpbmNpcGl0KGIpID09PSBcImNlbGxcIiB8fCBhID4gYikgPyAxIDogKGEgPCBiKSA/IC0xIDogMDtcbiAgICAgICAgfTtcbiAgICByZXR1cm4gbm9kZS5wYXJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgICArIFwiI1wiICsgbm9kZS5wYXJlbnROb2RlLmlkICsgXCIgXCJcbiAgICAgICAgKyBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSArIFwiLlwiXG4gICAgICAgICsgbm9kZS5jbGFzc05hbWUuc3BsaXQoJyAnKVxuICAgICAgICAuc29ydChTT1JUX0ZOX0NFTExfRklSU1QpXG4gICAgICAgIC5qb2luKCcuJyk7XG59XG4iLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciAkQyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyksXHJcbiAgICBWYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9ycycpLlZhbGlkYXRpb25FcnJvcixcclxuICAgIC8vIHZhbGlkYXRpb24gaGVscGVyIGZuc1xyXG4gICAgaXNOdW1lcmljID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyh2YWwpLnJlcGxhY2UoLywvZywgJycpLCAodmFsLmxlbmd0aCAhPT0gMCAmJiAhaXNOYU4oK3ZhbCkgJiYgaXNGaW5pdGUoK3ZhbCkpO1xyXG4gICAgfSxcclxuXHJcbiAgICBWYWxpZGF0b3JzID0ge1xyXG4gICAgICAgIEJvYXJkRGltZW5zaW9uczoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24oZGltKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBudW1lcmljIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTnVtZXJpYyhkaW0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgYm9hcmQgZGltZW5zaW9uLlwiLCBkaW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gTUFYX0RJTUVOU0lPTlMgY29uc3RhbnRcclxuICAgICAgICAgICAgICAgIGlmICghKGRpbSA8PSAkQy5NQVhfR1JJRF9ESU1FTlNJT05TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIGdhbWUncyBtYXhpbXVtIGdyaWQgZGltZW5zaW9uc1wiLCArZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlLi4uXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTWluZUNvdW50OiB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbihtaW5lcywgbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgIC8vIGlzIG51bWVyaWMgaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmICghaXNOdW1lcmljKG1pbmVzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIG51bWJlciBvZiBtaW5lcy5cIiwgbWluZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gbWF4UG9zc2libGUgZm9yIHRoaXMgY29uZmlndXJhdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKG1pbmVzID4gbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMgKHsxfSkuXCIsICttaW5lcywgbWF4UG9zc2libGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIG11c3QgaGF2ZSBhdCBsZWFzdCBvbmUgbWluZSFcclxuICAgICAgICAgICAgICAgIGlmIChtaW5lcyA8IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiSW52YWxpZCBtaW5lIGNvdW50OiBwbGVhc2UgY2hvb3NlIGEgdmFsdWUgYmV0d2VlbiB7MH0gYW5kIHsxfS5cIiwgMSwgbWF4UG9zc2libGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UuLi5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JzOyJdfQ==
;