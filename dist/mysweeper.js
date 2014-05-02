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
        var dims = $(this).val();
        // update the 'mirror' <input>...
        $('#dimensions-mirror').val(dims);
        // ...and the possible number of mines.
        $possibleMines.html(mineableSpaces(dims) + '.');
    });

    $("form").on("submit", function() {

        var mode = $("[name=mode-select]:checked").val(),
            gameOptions = {};

        if (mode === Modes.PRESET) {
            var level = $("[name=preset-level]:checked").val(),
                preset;

            for (var p in PresetLevels)
                if (PresetLevels[p] === level)
                    preset = PresetSetups[p];

            gameOptions.dimensions = preset.dimensions;
            gameOptions.mines = preset.mines;
            gameOptions.timer = preset.timer;
            gameOptions.isCustom = false;
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

    to: function(log) { this.$log = log; return this; },
    withValues: function(values) {
        this.values = validate(values);
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
        this.$log([ makeTitle("gameboard"), this.RENDERED_MAP ]
            .join('\n'),
            getRenderedMap(transformer, this.values));
    },
    viewMines: function() {
        this.$log([ makeTitle("mine placements"), this.RENDERED_MAP ]
            .join('\n'),
            getRenderedMap(this.DEFAULT_TRANSFORMER, this.values));
    }
};

function makeTitle(str) { return str.split('').join(' ').toUpperCase(); }
function displayRowNum(num) { return "       [" + num + "]\n" }
function toSymbols(values, fn) {
    return values.reduce(function(str, row, idx) {
        return str += fn(row).join(ConsoleRenderer.COL_SPACING).toLowerCase() + displayRowNum(idx)
    }.bind(this), '\n');
}
function validate(values) {
    if (Array.isArray(values) && values.length)
        return values;
    else throw "No values present.";
}
function getRenderedMap(transformer, values) {
    var vals = validate(values);
    return toSymbols(vals, transformer);
}

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
},{"./constants":3,"./errors":6}]},{},[2,3,5,6,7,1,8,9,10,11,4,12,14,15,17,19,18,20,21,13,24,16,23,22])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2ZsaXBwYWJsZS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9sY2dlbmVyYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9tdWx0aW1hcC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi91dGlscy5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVsYXllci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL21pbmVzLWRpc3BsYXkuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zY29yZWJvYXJkLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGltZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy90cmFuc2NyaWJpbmctZW1pdHRlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3kuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92YWxpZGF0b3JzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIEdhbWVib2FyZCA9IHJlcXVpcmUoJy4vZ2FtZWJvYXJkJyksXHJcbiAgICBNb2RlcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9kZXMsXHJcbiAgICBQcmVzZXRMZXZlbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldExldmVscyxcclxuICAgIFByZXNldFNldHVwcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0U2V0dXBzLFxyXG4gICAgRGltVmFsaWRhdG9yID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykuQm9hcmREaW1lbnNpb25zLFxyXG4gICAgTWluZVZhbGlkYXRvciA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpLk1pbmVDb3VudCxcclxuICAgIERFRkFVTFRfQ09ORklHID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5EZWZhdWx0Q29uZmlnLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTUFYX0dSSURfRElNRU5TSU9OUyxcclxuICAgIE1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5NSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUixcclxuXHJcbiAgICBtaW5lYWJsZVNwYWNlcyA9IGZ1bmN0aW9uKGRpbSkgeyByZXR1cm4gfn4oTWF0aC5wb3coZGltLCAyKSAqIE1JTkVBQkxFX1NQQUNFU19NVUxUSVBMSUVSKTsgfSxcclxuICAgIGRpc2FibGVPcHRpb24gPSBmdW5jdGlvbigkZWwsIHVuZG8pIHtcclxuICAgICAgICBpZiAodW5kbyA9PSBudWxsKSB1bmRvID0gZmFsc2U7XHJcbiAgICAgICAgJGVsW3VuZG8gPyAncmVtb3ZlQ2xhc3MnIDogJ2FkZENsYXNzJ10oJ2Rpc2FibGVkJyk7XHJcbiAgICAgICAgJGVsLmZpbmQoXCJpbnB1dFwiKS5wcm9wKCdyZWFkb25seScsICF1bmRvKTtcclxuICAgIH0sXHJcbiAgICBlbmFibGVPcHRpb24gPSBmdW5jdGlvbigkZWwpIHsgcmV0dXJuIGRpc2FibGVPcHRpb24oJGVsLCB0cnVlKTsgfTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICAkKGRvY3VtZW50LmJvZHkpLmFkZENsYXNzKERFRkFVTFRfQ09ORklHLnRoZW1lLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgIHZhciAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIiksXHJcbiAgICAgICAgUFJFU0VUX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5wcmVzZXQgPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIixcclxuICAgICAgICBDVVNUT01fUEFORUxfU0VMRUNUT1IgPSBcInVsLmN1c3RvbSA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiO1xyXG5cclxuICAgIC8vIHNldHRpbmcgaW5pdGlhbCB2YWx1ZVxyXG4gICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpKSk7XHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoTUFYX0dSSURfRElNRU5TSU9OUyArIFwiIHggXCIgKyBNQVhfR1JJRF9ESU1FTlNJT05TKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyB9KS5jbGljaygpO1xyXG4gICAgJChcIiNjdXN0b20tbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgJChcIiNkaW1lbnNpb25zXCIpLmZvY3VzKCk7IH0pO1xyXG5cclxuICAgICQuZWFjaCgkKFwibGFiZWxbZm9yXj0nbGV2ZWwtJ11cIiksIGZ1bmN0aW9uKF8sIGxhYmVsKSB7XHJcbiAgICAgICAgdmFyIGxldmVsID0gJChsYWJlbCkuYXR0cignZm9yJykuc3Vic3RyaW5nKCdsZXZlbC0nLmxlbmd0aCkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgZGltcyA9IFByZXNldFNldHVwc1tsZXZlbF0uZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSBQcmVzZXRTZXR1cHNbbGV2ZWxdLm1pbmVzLFxyXG4gICAgICAgICAgICAkYWR2aWNlID0gJChsYWJlbCkuZmluZCgnLmFkdmljZScpO1xyXG4gICAgICAgICRhZHZpY2UuaHRtbChcIiAoXCIgKyBkaW1zICsgXCIgeCBcIiArIGRpbXMgKyBcIiwgXCIgKyBtaW5lcyArIFwiIG1pbmVzKVwiKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIG9ua2V5dXAgd2hlbiBjaG9vc2luZyBnYW1lYm9hcmQgZGltZW5zaW9ucyxcclxuICAgIC8vIG5laWdoYm9yaW5nIGlucHV0IHNob3VsZCBtaXJyb3IgbmV3IHZhbHVlLFxyXG4gICAgLy8gYW5kIHRvdGFsIHBvc3NpYmxlIG1pbmVhYmxlIHNxdWFyZXMgKGRpbWVuc2lvbnMgXiAyIC0xKVxyXG4gICAgLy8gYmUgZmlsbGVkIGludG8gYSA8c3Bhbj4gYmVsb3cuXHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikub24oJ2tleXVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGRpbXMgPSAkKHRoaXMpLnZhbCgpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbChkaW1zKTtcclxuICAgICAgICAvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuICAgICAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKGRpbXMpICsgJy4nKTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCJmb3JtXCIpLm9uKFwic3VibWl0XCIsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgbW9kZSA9ICQoXCJbbmFtZT1tb2RlLXNlbGVjdF06Y2hlY2tlZFwiKS52YWwoKSxcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMgPSB7fTtcclxuXHJcbiAgICAgICAgaWYgKG1vZGUgPT09IE1vZGVzLlBSRVNFVCkge1xyXG4gICAgICAgICAgICB2YXIgbGV2ZWwgPSAkKFwiW25hbWU9cHJlc2V0LWxldmVsXTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICAgICAgcHJlc2V0O1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBQcmVzZXRMZXZlbHMpXHJcbiAgICAgICAgICAgICAgICBpZiAoUHJlc2V0TGV2ZWxzW3BdID09PSBsZXZlbClcclxuICAgICAgICAgICAgICAgICAgICBwcmVzZXQgPSBQcmVzZXRTZXR1cHNbcF07XHJcblxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gcHJlc2V0LmRpbWVuc2lvbnM7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gcHJlc2V0Lm1pbmVzO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy50aW1lciA9IHByZXNldC50aW1lcjtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBNb2Rlcy5DVVNUT00uLi5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdmFyIGQgPSAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCkgfHwgKyQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIiksXHJcbiAgICAgICAgICAgICAgICBtID0gJChcIiNtaW5lLWNvdW50XCIpLnZhbCgpIHx8ICskKFwiI21pbmUtY291bnRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGdhbWVPcHRpb25zLmRpbWVuc2lvbnMgPSBEaW1WYWxpZGF0b3IudmFsaWRhdGUoZCkgPyArZCA6IDk7XHJcbiAgICAgICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9IE1pbmVWYWxpZGF0b3IudmFsaWRhdGUobSwgbWluZWFibGVTcGFjZXMoZ2FtZU9wdGlvbnMuZGltZW5zaW9ucykpID8gbSA6IDE7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkVycm9yOiAlb1wiLCBlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaHRtbChlLm1lc3NhZ2UpLnNob3coKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzZXQgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMudGhlbWUgPSAkKFwiI2NvbG9yLXRoZW1lXCIpLnZhbCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIjYm9hcmQtY2FyZFwiKS5vbihcImNsaWNrXCIsIFwiYS5yZXBsYXlcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gdGVtcG9yYXJ5LCBicnV0ZS1mb3JjZSBmaXguLi5cclxuICAgICAgICAvLyBUT0RPOiByZXNldCBmb3JtIGFuZCB0b2dnbGUgdmlzaWJpbGl0eSBvbiB0aGUgc2VjdGlvbnMuLi5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIENvbnNvbGVSZW5kZXJlciA9IHtcclxuXHJcbiAgICBDT0xfU1BBQ0lORzogJyAgICcsXHJcbiAgICBNSU5FRF9TUVVBUkU6ICcqJyxcclxuICAgIEJMQU5LX1NRVUFSRTogJy4nLFxyXG4gICAgUkVOREVSRURfTUFQOiAnJW8nLFxyXG4gICAgREVGQVVMVF9UUkFOU0ZPUk1FUjogZnVuY3Rpb24ocm93KXsgcmV0dXJuIHJvdzsgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgdmlld0dhbWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBjdHggPSB0aGlzLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyB0aGlzLk1JTkVEX1NRVUFSRSA6IHNxLmdldERhbmdlcigpID09PSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IHRoaXMuQkxBTktfU1FVQVJFIDogc3EuZ2V0RGFuZ2VyKCk7IH0sIGN0eClcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB0aGlzLiRsb2coWyBtYWtlVGl0bGUoXCJnYW1lYm9hcmRcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICBnZXRSZW5kZXJlZE1hcCh0cmFuc2Zvcm1lciwgdGhpcy52YWx1ZXMpKTtcclxuICAgIH0sXHJcbiAgICB2aWV3TWluZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGxvZyhbIG1ha2VUaXRsZShcIm1pbmUgcGxhY2VtZW50c1wiKSwgdGhpcy5SRU5ERVJFRF9NQVAgXVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIGdldFJlbmRlcmVkTWFwKHRoaXMuREVGQVVMVF9UUkFOU0ZPUk1FUiwgdGhpcy52YWx1ZXMpKTtcclxuICAgIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIG1ha2VUaXRsZShzdHIpIHsgcmV0dXJuIHN0ci5zcGxpdCgnJykuam9pbignICcpLnRvVXBwZXJDYXNlKCk7IH1cclxuZnVuY3Rpb24gZGlzcGxheVJvd051bShudW0pIHsgcmV0dXJuIFwiICAgICAgIFtcIiArIG51bSArIFwiXVxcblwiIH1cclxuZnVuY3Rpb24gdG9TeW1ib2xzKHZhbHVlcywgZm4pIHtcclxuICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICByZXR1cm4gc3RyICs9IGZuKHJvdykuam9pbihDb25zb2xlUmVuZGVyZXIuQ09MX1NQQUNJTkcpLnRvTG93ZXJDYXNlKCkgKyBkaXNwbGF5Um93TnVtKGlkeClcclxuICAgIH0uYmluZCh0aGlzKSwgJ1xcbicpO1xyXG59XHJcbmZ1bmN0aW9uIHZhbGlkYXRlKHZhbHVlcykge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVzKSAmJiB2YWx1ZXMubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbn1cclxuZnVuY3Rpb24gZ2V0UmVuZGVyZWRNYXAodHJhbnNmb3JtZXIsIHZhbHVlcykge1xyXG4gICAgdmFyIHZhbHMgPSB2YWxpZGF0ZSh2YWx1ZXMpO1xyXG4gICAgcmV0dXJuIHRvU3ltYm9scyh2YWxzLCB0cmFuc2Zvcm1lcik7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZVJlbmRlcmVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIENvbnN0YW50cyA9IE9iamVjdC5mcmVlemUoe1xyXG5cclxuICAgIFZFUlNJT046ICdiZXRhNScsXHJcblxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcbiAgICBNSU5FQUJMRV9TUEFDRVNfTVVMVElQTElFUjogMC4zMyxcclxuICAgIC8vIGZvciBjYWxjdWxhdGluZyBjbG9jaywgZGVmYXVsdHNcclxuICAgIC8vIHRvIDEuMjVzIGZvciBldmVyeSBtaW5lZCBzcXVhcmVcclxuICAgIFRJTUVfQVZHX0FMTE9DX1BFUl9PUEVOX1NRVUFSRTogMS4yNSxcclxuXHJcbiAgICBEZWZhdWx0Q29uZmlnOiB7XHJcbiAgICAgICAgZGltZW5zaW9uczogOSxcclxuICAgICAgICBtaW5lczogMSxcclxuICAgICAgICBib2FyZDogJyNib2FyZCcsXHJcbiAgICAgICAgaXNDb3VudGRvd246IHRydWUsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAxMDAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogMzAwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDYwMCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS8sXHJcblxyXG4gICAgU2NvcmVib2FyZDogeyBESUdJVFM6IDMsIEZYX0RVUkFUSU9OOiA4MDAsIE9VVF9PRl9SQU5HRTogXCJNQVhcIiB9LFxyXG5cclxuICAgIFNjb3JpbmdSdWxlczoge1xyXG4gICAgICAgIERBTkdFUl9JRFhfTVVMVElQTElFUjogMSxcclxuICAgICAgICBCTEFOS19TUVVBUkVfUFRTOiAwLFxyXG4gICAgICAgIEZMQUdfTUlORUQ6IDI1LFxyXG4gICAgICAgIE1JU0ZMQUdfVU5NSU5FRDogMTAsXHJcbiAgICAgICAgVU5GTEFHX01JTkVEOiAyNSxcclxuICAgICAgICBNSVNVTkZMQUdfTUlORUQ6IDEwLFxyXG4gICAgICAgIFVTRVJNT1ZFU19NVUxUSVBMSUVSOiAxMCxcclxuICAgICAgICBNSVNGTEFHR0VEX01VTFRJUExJRVI6IDEwLFxyXG4gICAgICAgIEZMQUdHRURfTUlORVNfTVVMVElQTElFUjogMTBcclxuICAgIH1cclxuXHJcbn0pO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRmxpcHBhYmxlID0gcmVxdWlyZSgnLi9saWIvZmxpcHBhYmxlJyk7XHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oZWwpIHtcclxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbC5jaGFyQXQoMCkgPT09ICcjJyA/IGVsLnN1YnN0cmluZygxKSA6IGVsKTtcclxuICAgIHRoaXMuJGVsID0gJChlbCk7XHJcblxyXG4gICAgdGhpcy4kbTEgPSB0aGlzLiRlbC5maW5kKCcjbTEnKTtcclxuICAgIHRoaXMuJG0yID0gdGhpcy4kZWwuZmluZCgnI20yJyk7XHJcbiAgICB0aGlzLiRzMSA9IHRoaXMuJGVsLmZpbmQoJyNzMScpO1xyXG4gICAgdGhpcy4kczIgPSB0aGlzLiRlbC5maW5kKCcjczInKTtcclxufVxyXG5cclxuQ291bnRkb3duLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBDb3VudGRvd24sXHJcbiAgICBfaW5jcmVtZW50OiBmdW5jdGlvbihjaGlwcykge1xyXG4gICAgICAgIGNoaXBzLmZvckVhY2goZnVuY3Rpb24oY2hpcCkgeyB0aGlzLl9mbGlwKGNoaXBbMF0sIGNoaXBbMV0pOyB9LCB0aGlzKTtcclxuICAgIH0sXHJcbiAgICB1cGRhdGU6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKVxyXG4gICAgICAgICAgICAgICAgICAgIGFyci51bnNoaWZ0KCcwJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5faW5jcmVtZW50KFtcclxuICAgICAgICAgICAgW3RoaXMuJHMyLCB0aW1lc1sxXVsxXV0sXHJcbiAgICAgICAgICAgIFt0aGlzLiRzMSwgdGltZXNbMV1bMF1dLFxyXG4gICAgICAgICAgICBbdGhpcy4kbTIsIHRpbWVzWzBdWzFdXSxcclxuICAgICAgICAgICAgW3RoaXMuJG0xLCB0aW1lc1swXVswXV1cclxuICAgICAgICBdKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZsaXBwYWJsZSgpLmNhbGwoQ291bnRkb3duLnByb3RvdHlwZSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvdW50ZG93bjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbi8vIFRPRE86IHJlZmFjdG9yIHRvIG5vdCBuZWVkIHRoZSBgZ2FtZWJvYXJkYCBkZXBlbmRlbmN5LFxyXG4vLyAgICAgICBjYW4ganVzdCBleHBvcnQgYSBtYXAgb2YgZGFuZ2VyIGluZGljZXNcclxuZnVuY3Rpb24gRGFuZ2VyQ2FsY3VsYXRvcihnYW1lYm9hcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYm9hcmQ6IGdhbWVib2FyZCxcclxuICAgICAgICBuZWlnaGJvcmhvb2Q6IHtcclxuICAgICAgICAgICAgLy8gZGlzdGFuY2UgaW4gc3RlcHMgZnJvbSB0aGlzIHNxdWFyZTpcclxuICAgICAgICAgICAgLy8gICAgICAgICAgIHZlcnQuIGhvcnouXHJcbiAgICAgICAgICAgIE5PUlRIOiAgICAgIFsgIDEsICAwIF0sXHJcbiAgICAgICAgICAgIE5PUlRIRUFTVDogIFsgIDEsICAxIF0sXHJcbiAgICAgICAgICAgIEVBU1Q6ICAgICAgIFsgIDAsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIRUFTVDogIFsgLTEsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIOiAgICAgIFsgLTEsICAwIF0sXHJcbiAgICAgICAgICAgIFNPVVRIV0VTVDogIFsgLTEsIC0xIF0sXHJcbiAgICAgICAgICAgIFdFU1Q6ICAgICAgIFsgIDAsIC0xIF0sXHJcbiAgICAgICAgICAgIE5PUlRIV0VTVDogIFsgIDEsIC0xIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvclNxdWFyZTogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgICAgIGlmICgrcm93ID49IDAgJiYgK2NlbGwgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsTWluZXMgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLm5laWdoYm9yaG9vZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0ID0gdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSB0aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvciA9IHRoaXMuYm9hcmQuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLmlzTWluZWQoKSkgdG90YWxNaW5lcysrO1xyXG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWxNaW5lcyB8fCAnJztcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhbmdlckNhbGN1bGF0b3I7IiwiXCJ1c2Ugc3RyaWN0O1wiXG4vLyBFUlJPUlMgQU5EIEVYQ0VQVElPTlNcblxuZnVuY3Rpb24gTXlzd2VlcGVyRXJyb3IoKSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgUkdYX1JFUExBQ0VNRU5UX1RPS0VOUyA9IC9cXHsoXFxkKylcXH0vZyxcbiAgICAgIGV4dGVuZE1lc3NhZ2UgPSBmdW5jdGlvbihzdHIsIGFyZ3MpIHtcbiAgICAgICAgICByZXR1cm4gKHN0ciB8fCAnJykucmVwbGFjZShSR1hfUkVQTEFDRU1FTlRfVE9LRU5TLCBmdW5jdGlvbihfLCBpbmRleCkgeyByZXR1cm4gYXJnc1sraW5kZXhdIHx8ICcnOyB9KTtcbiAgICAgIH07XG4gIHRoaXMubWVzc2FnZSA9IGV4dGVuZE1lc3NhZ2UoYXJnc1swXSwgYXJncy5zbGljZSgxKSk7XG4gIEVycm9yLmNhbGwodGhpcywgdGhpcy5tZXNzYWdlKTtcbiAgLy8gRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgYXJndW1lbnRzLmNhbGxlZSk7XG4gIHRoaXMuc3RhY2sgPSBFcnJvcigpLnN0YWNrO1xufVxuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNeXN3ZWVwZXJFcnJvcjtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5nZXRUcmFjZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGFjay5yZXBsYWNlKC/ihrVcXHMrL2csICdcXG4gICcpOyB9O1xuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnTXlzd2VlcGVyRXJyb3InO1xuXG4vKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgKi9cblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKCkge1xuICBNeXN3ZWVwZXJFcnJvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IG5ldyBNeXN3ZWVwZXJFcnJvcigpO1xuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFZhbGlkYXRpb25FcnJvcjtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUubmFtZSA9ICdWYWxpZGF0aW9uRXJyb3InO1xuXG5mdW5jdGlvbiBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcigpIHtcbiAgTXlzd2VlcGVyRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yLnByb3RvdHlwZSA9IG5ldyBNeXN3ZWVwZXJFcnJvcigpO1xuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3I7XG5TY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvci5wcm90b3R5cGUubmFtZSA9ICdTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvcic7XG5cblxubW9kdWxlLmV4cG9ydHMuTXlzd2VlcGVyRXJyb3IgPSBNeXN3ZWVwZXJFcnJvcjtcbm1vZHVsZS5leHBvcnRzLlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcbm1vZHVsZS5leHBvcnRzLlNjb3JlRXZlbnRIYW5kbGVyTWlzc2luZ0Vycm9yID0gU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3I7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgTXVsdGltYXAgPSByZXF1aXJlKCcuL2xpYi9tdWx0aW1hcCcpLFxyXG4gICAgRGFuZ2VyQ2FsY3VsYXRvciA9IHJlcXVpcmUoJy4vZGFuZ2VyLWNhbGN1bGF0b3InKSxcclxuICAgIFNxdWFyZSA9IHJlcXVpcmUoJy4vc3F1YXJlJyksXHJcbiAgICBTZXJpYWxpemVyID0gcmVxdWlyZSgnLi9zZXJpYWxpemVyJyksXHJcbiAgICBHbHlwaHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkdseXBocyxcclxuICAgIE1lc3NhZ2VPdmVybGF5ID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5NZXNzYWdlT3ZlcmxheSxcclxuICAgIERFRkFVTFRfR0FNRV9PUFRJT05TID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5EZWZhdWx0Q29uZmlnLFxyXG4gICAgVElNRV9BVkdfQUxMT0NfUEVSX09QRU5fU1FVQVJFID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5USU1FX0FWR19BTExPQ19QRVJfT1BFTl9TUVVBUkUsXHJcbiAgICBSR1hfTU9CSUxFX0RFVklDRVMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vYmlsZURldmljZVJlZ2V4LFxyXG4gICAgVkVSU0lPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuVkVSU0lPTixcclxuICAgIFRpbWVyID0gcmVxdWlyZSgnLi90aW1lcicpLFxyXG4gICAgQ291bnRkb3duID0gcmVxdWlyZSgnLi9jb3VudGRvd24nKSxcclxuICAgIE1pbmVzRGlzcGxheSA9IHJlcXVpcmUoJy4vbWluZXMtZGlzcGxheScpLFxyXG4gICAgVHJhbnNjcmliaW5nRW1pdHRlciA9IHJlcXVpcmUoJy4vdHJhbnNjcmliaW5nLWVtaXR0ZXInKSxcclxuICAgIFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHJlcXVpcmUoJy4vdHJhbnNjcmlwdGlvbi1zdHJhdGVneScpLFxyXG4gICAgVGhlbWVTdHlsZXIgPSByZXF1aXJlKCcuL3RoZW1lLXN0eWxlcicpLFxyXG4gICAgQ29uc29sZVJlbmRlcmVyID0gcmVxdWlyZSgnLi9jb25zb2xlLXJlbmRlcmVyJyksXHJcbiAgICBNaW5lTGF5ZXIgPSByZXF1aXJlKCcuL21pbmVsYXllcicpLFxyXG4gICAgU2NvcmVrZWVwZXIgPSByZXF1aXJlKCcuL3Njb3Jla2VlcGVyJyksXHJcbiAgICBTY29yZWJvYXJkID0gcmVxdWlyZSgnLi9zY29yZWJvYXJkJyksXHJcbiAgICBfZXh0ZW5kID0gcmVxdWlyZSgnLi9saWIvdXRpbHMnKS5fZXh0ZW5kO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIGZpbGwgaW4gYW55IGJsYW5rcyBpbiB0aGUgdXNlcidzIGdhbWUgb3B0aW9uc1xyXG4gICAgLy8gd2l0aCBvdXIgc2Vuc2libGUgZGVmYXVsdHM6XHJcbiAgICB0aGlzLnNldHRpbmdzID0gX2V4dGVuZChERUZBVUxUX0dBTUVfT1BUSU9OUywgb3B0aW9ucyk7XHJcbiAgICAvLyBmb3JrIGNvbnN0cnVjdGlvbiBvZiB0aGlzIEdhbWVib2FyZCBpbnN0YW5jZSxcclxuICAgIC8vIGRlcGVuZGluZyBvbiB3aGV0aGVyIG9yIG5vdCBpdCdzIGEgbmV3IGdhbWUsXHJcbiAgICAvLyBvciBiZWluZyByZWh5ZHJhdGVkIGZyb20gYSBwcmV2aW91cywgcGVyc2lzdGVkIGdhbWU6XHJcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3MuaXNQZXJzaXN0ZWQpIHtcclxuICAgICAgICAvLyB0aGUgbWFwLCBzZXJ2aW5nIGFzIHRoZSBpbnRlcm5hbCByZXByZXNlbmF0aW9uIG9mIHRoZSBnYW1lYm9hcmRcclxuICAgICAgICB0aGlzLmJvYXJkID0gbmV3IE11bHRpbWFwO1xyXG4gICAgICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICAgICAgdGhpcy5kaW1lbnNpb25zID0gK3RoaXMuc2V0dGluZ3MuZGltZW5zaW9ucztcclxuICAgICAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgICAgIHRoaXMubWluZXMgPSArdGhpcy5zZXR0aW5ncy5taW5lcztcclxuICAgICAgICAvLyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIHRhYmxlIHNlcnZpbmcgYXMgdGhlIGJvYXJkXHJcbiAgICAgICAgdGhpcy4kZWwgPSAkKHRoaXMuc2V0dGluZ3MuYm9hcmQpO1xyXG4gICAgICAgIC8vIGlzIGN1c3RvbSBvciBwcmVzZXQgZ2FtZT9cclxuICAgICAgICB0aGlzLmlzQ3VzdG9tID0gdGhpcy5zZXR0aW5ncy5pc0N1c3RvbSB8fCBmYWxzZTtcclxuICAgICAgICAvLyB0aGUgZXZlbnQgdHJhbnNjcmliZXIgZm9yIHBsYXliYWNrIGFuZCBwZXJzaXN0ZW5jZVxyXG4gICAgICAgIHRoaXMuZW1pdHRlciA9IG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyKFRyYW5zY3JpcHRpb25TdHJhdGVneSk7XHJcbiAgICAgICAgLy8gc2VsZWN0aXZlbHkgZW5hYmxlIGRlYnVnIG1vZGUgZm9yIGNvbnNvbGUgdmlzdWFsaXphdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgICAgICB0aGlzLmRlYnVnX21vZGUgPSB0aGlzLnNldHRpbmdzLmRlYnVnX21vZGU7XHJcbiAgICAgICAgLy8gc3BlY2lmaWVzIHRoZSBkZXNpcmVkIGNvbG9yIHRoZW1lIG9yIHNraW5cclxuICAgICAgICB0aGlzLnRoZW1lID0gdGhpcy5fc2V0Q29sb3JUaGVtZSh0aGlzLnNldHRpbmdzLnRoZW1lKTtcclxuICAgICAgICAvLyBjb250YWluZXIgZm9yIGZsYXNoIG1lc3NhZ2VzLCBzdWNoIGFzIHdpbi9sb3NzIG9mIGdhbWVcclxuICAgICAgICB0aGlzLmZsYXNoQ29udGFpbmVyID0gJChNZXNzYWdlT3ZlcmxheSk7XHJcbiAgICAgICAgLy8gY2hlY2sgZm9yIGRlc2t0b3Agb3IgbW9iaWxlIHBsYXRmb3JtIChmb3IgZXZlbnQgaGFuZGxlcnMpXHJcbiAgICAgICAgdGhpcy5pc01vYmlsZSA9IHRoaXMuX2NoZWNrRm9yTW9iaWxlKCk7XHJcbiAgICAgICAgLy8ga2VlcCB0cmFjayBvZiB1c2VyIGNsaWNrcyB0b3dhcmRzIHRoZWlyIHdpblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgICAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgICAgICB0aGlzLmRhbmdlckNhbGMgPSBuZXcgRGFuZ2VyQ2FsY3VsYXRvcih0aGlzKTtcclxuICAgICAgICAvLyB0aGUgZGlzcGxheSBvYmplY3QgZm9yIHRoZSBudW1iZXIgb2YgbWluZXNcclxuICAgICAgICB0aGlzLm1pbmVzRGlzcGxheSA9IG5ldyBNaW5lc0Rpc3BsYXkodGhpcy5taW5lcywgXCIjbWluZXMtZGlzcGxheVwiKTtcclxuICAgICAgICAvLyBhZGQgaW4gdGhlIGNvdW50ZG93biBjbG9jay4uLlxyXG4gICAgICAgIHRoaXMuY2xvY2sgPSBuZXcgVGltZXIoMCwgK3RoaXMuc2V0dGluZ3MudGltZXIgfHwgdGhpcy5fZGV0ZXJtaW5lVGltZXIoKSwgdGhpcy5zZXR0aW5ncy5pc0NvdW50ZG93biwgdGhpcy5lbWl0dGVyKTtcclxuICAgICAgICB0aGlzLmNvdW50ZG93biA9IG5ldyBDb3VudGRvd24oXCIjY291bnRkb3duXCIpO1xyXG4gICAgICAgIC8vIGNyZWF0ZSB0aGUgc2NvcmVrZWVwaW5nIG9iamVjdFxyXG4gICAgICAgIHRoaXMuc2NvcmVrZWVwZXIgPSBuZXcgU2NvcmVrZWVwZXIodGhpcyk7XHJcbiAgICAgICAgLy8gY3JlYXRlIHRoZSBhY3R1YWwgc2NvcmVib2FyZCB2aWV3XHJcbiAgICAgICAgdGhpcy5zY29yZWJvYXJkID0gbmV3IFNjb3JlYm9hcmQoMCwgXCIjc2NvcmUtZGlzcGxheVwiKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJSRVNVTUlORyBJTVBPUlRFRCBHQU1FOiAlb1wiLCB0aGlzLnNldHRpbmdzKTtcclxuICAgICAgICB0aGlzLmltcG9ydCh0aGlzLnNldHRpbmdzKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB0dXJuIG9uIGRldiBsb2dnZXIsIGlmIG5lZWRlZFxyXG4gICAgJGxvZy5kZWJ1Z19tb2RlID0gdGhpcy5kZWJ1Z19tb2RlO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIHRyaWdnZXIgZXZlbnQgZm9yIGdhbWUgdG8gYmVnaW4uLi5cclxuICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKHRoaXMuc2V0dGluZ3MuaXNQZXJzaXN0ZWQgPyAnZ2I6cmVzdGFydCcgOiAnZ2I6c3RhcnQnLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XHJcbn1cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogR2FtZWJvYXJkLFxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcbiAgICAgICAgLy8gcHJlLWNhbGN1bGF0ZSB0aGUgZGFuZ2VyIGluZGV4IG9mIGVhY2ggbm9uLW1pbmVkIHNxdWFyZS4uLlxyXG4gICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcbiAgICAgICAgLy8gZGlzcGxheSB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIHRoZSBnYW1lOlxyXG4gICAgICAgICQoXCIudmVyc2lvblwiKS5odG1sKFZFUlNJT04pO1xyXG4gICAgICAgIC8vIGRpc3BsYXkgb3V0cHV0IGFuZCBnYW1lIHN0cmF0ZWd5IHRvIHRoZSBjb25zb2xlLi4uXHJcbiAgICAgICAgaWYgKHRoaXMuZGVidWdfbW9kZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIC8vIHNldCB0aGUgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICB0aGlzLl9zZXRDb2xvclRoZW1lKHRoaXMudGhlbWUpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIHZhciBsb2NzID0gbmV3IE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucyk7XHJcbiAgICAgICAgbG9jcy5mb3JFYWNoKGZ1bmN0aW9uKGxvYykgeyB0aGlzLmdldFNxdWFyZUF0KGxvY1swXSwgbG9jWzFdKS5taW5lKCk7IH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pKTsgfSwgW10pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNhZmUpIHsgc2FmZS5zZXREYW5nZXIodGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9LCB0aGlzKTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIicgY2xhc3M9Jy1yb3cnPlwiXHJcbiAgICAgICAgICAgICAgICAgKyAgW10uam9pbi5jYWxsKHsgbGVuZ3RoOiBkaW1lbnNpb25zICsgMSB9LCBcIjx0ZD48L3RkPlwiKVxyXG4gICAgICAgICAgICAgICAgICsgIFwiPC90cj5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKGdyaWQpO1xyXG4gICAgfSxcclxuICAgIF9zZXRDb2xvclRoZW1lOiBmdW5jdGlvbih0aGVtZSkge1xyXG4gICAgICAgIFRoZW1lU3R5bGVyLnNldCh0aGVtZSwgdGhpcy4kZWwpO1xyXG4gICAgICAgIHJldHVybiB0aGVtZTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lVGltZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gVElNRV9BVkdfQUxMT0NfUEVSX09QRU5fU1FVQVJFICogKE1hdGgucG93KHRoaXMuZGltZW5zaW9ucywgMikgLSB0aGlzLm1pbmVzKTsgfSxcclxuICAgIF9jaGVja0Zvck1vYmlsZTogZnVuY3Rpb24oKSB7IHJldHVybiBSR1hfTU9CSUxFX0RFVklDRVMudGVzdChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkpOyB9LFxyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc01vYmlsZSkge1xyXG4gICAgICAgICAgICAvLyBmb3IgdG91Y2ggZXZlbnRzOiB0YXAgPT0gY2xpY2ssIGhvbGQgPT0gcmlnaHQgY2xpY2tcclxuICAgICAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub24oe1xyXG4gICAgICAgICAgICAgICAgdGFwOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgaG9sZDogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKHtcclxuICAgICAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgICAgICB9LCAndGQsIHRkID4gc3BhbicpO1xyXG5cclxuICAgICAgICAvKiAgRk9SIERFViBVU0UgT05MWSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgKi9cclxuICAgICAgICAvLyBJTkRJVklEVUFMIFNRVUFSRSBFVkVOVFNcclxuICAgICAgICAvKnRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6ZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiRmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOnVuZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiVW5mbGFnZ2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pOyovXHJcbiAgICAgICAgLy8gR0FNRUJPQVJELVdJREUgRVZFTlRTXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjpzdGFydCcsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiTGV0IHRoZSBnYW1lIGJlZ2luIVwiLCBhcmd1bWVudHMpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnJlc3VtZScsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiTGV0IHRoZSBnYW1lIHJlc3VtZSFcIiwgYXJndW1lbnRzKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjpwYXVzZScsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiTGV0IHRoZSBnYW1lIGJlIHBhdXNlZCFcIiwgYXJndW1lbnRzKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6d2luJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJHYW1lIG92ZXIhIFlvdSB3aW4hXCIpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDpvdmVyJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJHYW1lIG92ZXIhIFlvdSdyZSBkZWFkIVwiKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6dGltZWRvdXQnLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91J3JlIG91dHRhIHRpbWUhXCIpOyB9KTtcclxuICAgICAgICAvKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgKi9cclxuXHJcbiAgICAgICAgLy8gd2lyZXMgdXAgdGhlIHNjb3JlYm9hcmQgdmlldyBvYmplY3QgdG8gdGhlIGV2ZW50cyByZWNlaXZlZCBmcm9tIHRoZSBzY29yZWtlZXBlclxyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc2NvcmU6Y2hhbmdlIHNjb3JlOmNoYW5nZTpmaW5hbCcsIGZ1bmN0aW9uKCkgeyB0aGlzLnNjb3JlYm9hcmQudXBkYXRlKHRoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9LmJpbmQodGhpcykpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbigndGltZXI6c3RhcnQgdGltZXI6c3RvcCB0aW1lcjpjaGFuZ2UgdGltZXI6cmVzZXQgdGltZXI6ZW5kJywgZnVuY3Rpb24obWlucywgc2VjcykgeyB0aGlzLmNvdW50ZG93bi51cGRhdGUobWlucywgc2Vjcyk7IH0uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCd0aW1lcjplbmQnLCBmdW5jdGlvbigpIHsgdGhpcy5fZ2FtZVRpbWVkT3V0KCk7IH0uYmluZCh0aGlzKSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcclxuICAgICAgICAvLyB0dXJuIG9mZiB0b3VjaCBldmVudHMgYXMgd2VsbFxyXG4gICAgICAgIHRoaXMuJGVsLmhhbW1lcigpLm9mZigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KSxcclxuICAgICAgICAgICAgJGNlbGwgPSAkdGFyZ2V0LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc3BhbicgPyAkdGFyZ2V0LnBhcmVudCgpIDogJHRhcmdldCxcclxuICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgIC8vIGFzIGEgY291cnRlc3kgdG8gdGhlIHVzZXIsIHRoZWlyIGZpcnN0IGNsaWNrXHJcbiAgICAgICAgLy8gd2lsbCBuZXZlciBiZSBtaW5lZCAoY2FuJ3QgbG9zZSBnYW1lIG9uIGZpcnN0IHVzZXIgbW92ZSlcclxuICAgICAgICBpZiAoc3F1YXJlLmlzTWluZWQoKSAmJiB0aGlzLnVzZXJNb3ZlcyA9PT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHNxKSB7IHNxLnVubWluZSgpOyB9KTtcclxuICAgICAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyh0aGlzLmRpbWVuc2lvbnMsIHRoaXMubWluZXMpO1xyXG4gICAgICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRvQ29uc29sZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b0NvbnNvbGUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgaWYgKCFzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCdraWxsZXItbWluZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gc3RvcCB0aGUgY29udGV4dG1lbnUgZnJvbSBwb3BwaW5nIHVwIG9uIGRlc2t0b3AgYnJvd3NlcnNcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgdGhpcy5fZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xvc2VTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgLy8gaGFuZGxlcyBhdXRvY2xlYXJpbmcgb2Ygc3BhY2VzIGFyb3VuZCB0aGUgb25lIGNsaWNrZWRcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSB0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvciA9IHRoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmICFuZWlnaGJvci5pc0ZsYWdnZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9vcGVuU3F1YXJlKG5laWdoYm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLmdldERhbmdlcigpIHx8ICFuZWlnaGJvci5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIF9vcGVuU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6b3BlblwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2Nsb3NlU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmNsb3NlXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKS5yZW1vdmVDbGFzcygnY2xvc2VkJyk7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6ZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX3VuZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUudW5mbGFnKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6dW5mbGFnXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZ2V0T3BlbmVkU3F1YXJlc0NvdW50OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNPcGVuKCk7IH0pLmxlbmd0aDsgfSxcclxuICAgIF9ldmFsdWF0ZUZvckdhbWVXaW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBub3RNaW5lZCA9IHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkubGVuZ3RoO1xyXG4gICAgICAgIGlmIChub3RNaW5lZCA9PT0gdGhpcy5fZ2V0T3BlbmVkU3F1YXJlc0NvdW50KCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYXNoTXNnOiBmdW5jdGlvbihtc2csIGlzQWxlcnQpIHtcclxuICAgICAgICB0aGlzLmZsYXNoQ29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoaXNBbGVydCA/ICdnYW1lLW92ZXInIDogJ2dhbWUtd2luJylcclxuICAgICAgICAgICAgICAgIC5odG1sKG1zZylcclxuICAgICAgICAgICAgICAgIC5zaG93KCk7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVFbmRNc2c6IGZ1bmN0aW9uKG1zZywgaXNBbGVydCkge1xyXG4gICAgICAgIHZhciBSRVBMQVlfTElOSyA9IFwiPGEgaHJlZj0nIycgY2xhc3M9J3JlcGxheSc+Q2xpY2sgaGVyZSB0byBwbGF5IGFnYWluLi4uPC9hPlwiO1xyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKFwiPHNwYW4+XCIgKyBtc2cgKyBcIjwvc3Bhbj5cIiArIFJFUExBWV9MSU5LLCBpc0FsZXJ0KTtcclxuICAgIH0sXHJcbiAgICBfcHJlcGFyZUZpbmFsUmV2ZWFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBmb3IgYWxsIGZsYWdnZWQgc3F1YXJlcywgcmVtb3ZlIGZsYWcgaWNvblxyXG4gICAgICAgIC8vIGFuZCByZXBsYWNlIHdpdGggb3JpZ2luYWwgZGFuZ2VyIGluZGV4IGluc3RlYWRcclxuICAgICAgICAvLyBmb3Igd2hlbiBpdCdzIG9wZW5lZFxyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihmKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fdW5mbGFnU3F1YXJlKGYsIGZhbHNlKTtcclxuICAgICAgICAgICAgfSwgdGhpcyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICB0aGlzLl9yZW1vdmVFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIHRoaXMuY2xvY2suc3RvcCgpO1xyXG4gICAgICAgIHRoaXMuc2NvcmVrZWVwZXIuY2xvc2UoKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZVdpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXdpbicpO1xyXG4gICAgICAgICRsb2coXCItLS0gIEdBTUUgV0lOISAgLS0tXCIpO1xyXG4gICAgICAgICRsb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgICAgICB0aGlzLl9nYW1lRW5kTXNnKFwiR2FtZSBPdmVyISBZb3Ugd2luIVwiKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOndpbicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLW92ZXInKTtcclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgJGxvZygnLS0tICBHQU1FIE9WRVIhICAtLS0nKTtcclxuICAgICAgICB0aGlzLl9nYW1lRW5kTXNnKFwiR2FtZSBPdmVyIVwiLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOm92ZXInLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVUaW1lZE91dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtdGltZWRvdXQnKTtcclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgJGxvZygnLS0tICBHQU1FIE9WRVIhICAtLS0nKTtcclxuICAgICAgICB0aGlzLl9nYW1lRW5kTXNnKFwiR2FtZSBPdmVyISBZb3UncmUgb3V0IG9mIHRpbWUhXCIsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjplbmQ6dGltZWRvdXQnLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiBHbHlwaHMuRkxBRztcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc01pbmVkKCkpIHJldHVybiBHbHlwaHMuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXNxLmdldERhbmdlcigpID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdjZWxsJyArIHNxdWFyZS5nZXRDZWxsKCkpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYXR0YWNoIHRoZSBTcXVhcmUgdG8gdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBncmlkIGNlbGxcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUsIHRoaXMpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgYSBTcXVhcmUgaW5zdGFuY2UgYXMgYSBwYXJhbSwgcmV0dXJucyBhIGpRdWVyeS13cmFwcGVkIERPTSBub2RlIG9mIGl0cyBjZWxsXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIHJvdyBhbmQgY2VsbCBjb29yZGluYXRlcyBhcyBwYXJhbXMsIHJldHVybnMgdGhlIGFzc29jaWF0ZWQgU3F1YXJlIGluc3RhbmNlXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gaW1wb3J0IHBlcnNpc3RlZCBnYW1lIHN0YXRlXHJcbiAgICBpbXBvcnQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHsgIHJldHVybiBTZXJpYWxpemVyLmltcG9ydChvcHRpb25zKS5jYWxsKHRoaXMpOyB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHsgcmV0dXJuIFNlcmlhbGl6ZXIuZXhwb3J0KHRoaXMpOyB9LFxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHZhciByZW5kZXJlciA9IENvbnNvbGVSZW5kZXJlci50bygkbG9nKS53aXRoVmFsdWVzKHRoaXMuYm9hcmQudmFsdWVzKCkpO1xyXG4gICAgICAgIHJldHVybiAod2l0aERhbmdlcikgPyByZW5kZXJlci52aWV3R2FtZSgpIDogcmVuZGVyZXIudmlld01pbmVzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVib2FyZDsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbi8vIEB1c2FnZSB2YXIgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWydGX09QRU4nLCAnRl9NSU5FRCcsICdGX0ZMQUdHRUQnLCAnRl9JTkRFWEVEJ10pOyBiZiA9IG5ldyBCaXRGbGFncztcclxuZnVuY3Rpb24gQml0RmxhZ0ZhY3RvcnkoYXJncykge1xyXG5cclxuICAgIHZhciBiaW5Ub0RlYyA9IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gcGFyc2VJbnQoc3RyLCAyKTsgfSxcclxuICAgICAgICBkZWNUb0JpbiA9IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gbnVtLnRvU3RyaW5nKDIpOyB9LFxyXG4gICAgICAgIGJ1aWxkU3RhdGUgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIHBhZChhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7IHJldHVybiBTdHJpbmcoK3BhcmFtKTsgfSkucmV2ZXJzZSgpLmpvaW4oJycpKTsgfSxcclxuICAgICAgICBwYWQgPSBmdW5jdGlvbiAoc3RyLCBtYXgpIHtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXSwgbWF4ID0gbWF4IHx8IDQsIGRpZmYgPSBtYXggLSBzdHIubGVuZ3RoOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpO1xyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuICAgICAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyBfZmxhZ3M6IHRoaXMuX2ZsYWdzIH07IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBFbWl0dGVyLFxyXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIGV2ZW50LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZV0gPSB0aGlzLl9ldmVudHNbZV0gfHwgW107XHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXS5wdXNoKGZuKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIGV2ZW50LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2VdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXS5zcGxpY2UodGhpcy5fZXZlbnRzW2VdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgICAgICB9LCB0aGlzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXG5cbnZhciBGbGlwcGFibGUgPSBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBGbGlwcGFibGUpKVxuICAgICAgICByZXR1cm4gbmV3IEZsaXBwYWJsZShzZXR0aW5ncyk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IHsgZHVyYXRpb246IDAsIHdyYXBwZXI6ICdzcGFuJyB9O1xuICAgIGZvciAodmFyIHMgaW4gc2V0dGluZ3MpXG4gICAgICAgIGlmIChzZXR0aW5ncy5oYXNPd25Qcm9wZXJ0eShzKSlcbiAgICAgICAgICAgIG9wdGlvbnNbc10gPSBzZXR0aW5nc1tzXTtcblxuICAgIHZhciBub2RlTmFtZVRvVGFnID0gZnVuY3Rpb24obm9kZSkgeyByZXR1cm4gXCI8XCIgKyBub2RlICsgXCIgLz5cIjsgfSxcbiAgICAgICAgdmVyaWZ5RE9NTm9kZSA9IGZ1bmN0aW9uKHN0cikge1xuICAgICAgICAgICAgdmFyIHRhZ3MgPSBcImEsYWJicixhY3JvbnltLGFkZHJlc3MsYXBwbGV0LGFyZWEsYXJ0aWNsZSxhc2lkZSxhdWRpbyxcIlxuICAgICAgICAgICAgICAgICsgXCJiLGJhc2UsYmFzZWZvbnQsYmRpLGJkbyxiZ3NvdW5kLGJpZyxibGluayxibG9ja3F1b3RlLGJvZHksYnIsYnV0dG9uLFwiXG4gICAgICAgICAgICAgICAgKyBcImNhbnZhcyxjYXB0aW9uLGNlbnRlcixjaXRlLGNvZGUsY29sLGNvbGdyb3VwLGNvbnRlbnQsZGF0YSxkYXRhbGlzdCxkZCxcIlxuICAgICAgICAgICAgICAgICsgXCJkZWNvcmF0b3IsZGVsLGRldGFpbHMsZGZuLGRpcixkaXYsZGwsZHQsZWxlbWVudCxlbSxlbWJlZCxmaWVsZHNldCxmaWdjYXB0aW9uLFwiXG4gICAgICAgICAgICAgICAgKyBcImZpZ3VyZSxmb250LGZvb3Rlcixmb3JtLGZyYW1lLGZyYW1lc2V0LGgxLGgyLGgzLGg0LGg1LGg2LGhlYWQsaGVhZGVyLGhncm91cCxocixodG1sLFwiXG4gICAgICAgICAgICAgICAgKyBcImksaWZyYW1lLGltZyxpbnB1dCxpbnMsaXNpbmRleCxrYmQsa2V5Z2VuLGxhYmVsLGxlZ2VuZCxsaSxsaW5rLGxpc3RpbmcsXCJcbiAgICAgICAgICAgICAgICArIFwibWFpbixtYXAsbWFyayxtYXJxdWVlLG1lbnUsbWVudWl0ZW0sbWV0YSxtZXRlcixuYXYsbm9icixub2ZyYW1lcyxub3NjcmlwdCxvYmplY3QsXCJcbiAgICAgICAgICAgICAgICArIFwib2wsb3B0Z3JvdXAsb3B0aW9uLG91dHB1dCxwLHBhcmFtLHBsYWludGV4dCxwcmUscHJvZ3Jlc3MscSxycCxydCxydWJ5LHMsc2FtcCxzY3JpcHQsXCJcbiAgICAgICAgICAgICAgICArIFwic2VjdGlvbixzZWxlY3Qsc2hhZG93LHNtYWxsLHNvdXJjZSxzcGFjZXIsc3BhbixzdHJpa2Usc3Ryb25nLHN0eWxlLHN1YixzdW1tYXJ5LHN1cCxcIlxuICAgICAgICAgICAgICAgICsgXCJ0YWJsZSx0Ym9keSx0ZCx0ZW1wbGF0ZSx0ZXh0YXJlYSx0Zm9vdCx0aCx0aGVhZCx0aW1lLHRpdGxlLHRyLHRyYWNrLHR0LHUsdWwsdmFyLHZpZGVvLHdicix4bXBcIjtcbiAgICAgICAgICAgIHJldHVybiAoc3RyID0gU3RyaW5nKHN0cikudG9Mb3dlckNhc2UoKSwgc3RyICYmICEhfnRhZ3MuaW5kZXhPZihzdHIpKSA/IHN0ciA6ICdzcGFuJztcbiAgICAgICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5fZmxpcER1cmF0aW9uID0gK29wdGlvbnMuZHVyYXRpb24sXG4gICAgICAgIHRoaXMuX2ZsaXBXcmFwcGVyID0gdmVyaWZ5RE9NTm9kZShvcHRpb25zLndyYXBwZXIpO1xuXG4gICAgICAgIHRoaXMuX2ZsaXAgPSBmdW5jdGlvbigkZWwsIGNvbnRlbnQpIHtcbiAgICAgICAgICAgIGlmICgkZWwuaHRtbCgpICE9PSBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGVsXG4gICAgICAgICAgICAgICAgICAgIC53cmFwSW5uZXIoJChub2RlTmFtZVRvVGFnKHRoaXMuX2ZsaXBXcmFwcGVyKSkpXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKHRoaXMuX2ZsaXBXcmFwcGVyKVxuICAgICAgICAgICAgICAgICAgICAuZGVsYXkodGhpcy5fZmxpcER1cmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAuc2xpZGVVcCh0aGlzLl9mbGlwRHVyYXRpb24sIGZ1bmN0aW9uKCkgeyAkKHRoaXMpLnBhcmVudCgpLmh0bWwoY29udGVudCkgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGbGlwcGFibGU7IiwiLy8gTGluZWFyIENvbmdydWVudGlhbCBHZW5lcmF0b3I6IHZhcmlhbnQgb2YgYSBMZWhtYW4gR2VuZXJhdG9yXHJcbi8vIGJhc2VkIG9uIExDRyBmb3VuZCBoZXJlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9Qcm90b25rP3BhZ2U9NFxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCl7XHJcbiAgXCJ1c2Ugc3RyaWN0O1wiXHJcbiAgLy8gU2V0IHRvIHZhbHVlcyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTnVtZXJpY2FsX1JlY2lwZXNcclxuICAvLyBtIGlzIGJhc2ljYWxseSBjaG9zZW4gdG8gYmUgbGFyZ2UgKGFzIGl0IGlzIHRoZSBtYXggcGVyaW9kKVxyXG4gIC8vIGFuZCBmb3IgaXRzIHJlbGF0aW9uc2hpcHMgdG8gYSBhbmQgY1xyXG4gIGZ1bmN0aW9uIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcigpIHtcclxuICAgICAgdGhpcy5tID0gNDI5NDk2NzI5NjtcclxuICAgICAgLy8gYSAtIDEgc2hvdWxkIGJlIGRpdmlzaWJsZSBieSBtJ3MgcHJpbWUgZmFjdG9yc1xyXG4gICAgICB0aGlzLmEgPSAxNjY0NTI1O1xyXG4gICAgICAvLyBjIGFuZCBtIHNob3VsZCBiZSBjby1wcmltZVxyXG4gICAgICB0aGlzLmMgPSAxMDEzOTA0MjIzO1xyXG4gICAgICB0aGlzLnNlZWQgPSB2b2lkIDA7XHJcbiAgICAgIHRoaXMueiA9IHZvaWQgMDtcclxuICAgICAgLy8gaW5pdGlhbCBwcmltaW5nIG9mIHRoZSBnZW5lcmF0b3IsIHVudGlsIGxhdGVyIG92ZXJyaWRlblxyXG4gICAgICB0aGlzLnNldFNlZWQoKTtcclxuICB9XHJcbiAgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IsXHJcbiAgICBzZXRTZWVkOiBmdW5jdGlvbih2YWwpIHsgdGhpcy56ID0gdGhpcy5zZWVkID0gdmFsIHx8IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHRoaXMubSk7IH0sXHJcbiAgICBnZXRTZWVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc2VlZDsgfSxcclxuICAgIHJhbmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBkZWZpbmUgdGhlIHJlY3VycmVuY2UgcmVsYXRpb25zaGlwXHJcbiAgICAgIHRoaXMueiA9ICh0aGlzLmEgKiB0aGlzLnogKyB0aGlzLmMpICUgdGhpcy5tO1xyXG4gICAgICAvLyByZXR1cm4gYSBmbG9hdCBpbiBbMCwgMSlcclxuICAgICAgLy8gaWYgeiA9IG0gdGhlbiB6IC8gbSA9IDAgdGhlcmVmb3JlICh6ICUgbSkgLyBtIDwgMSBhbHdheXNcclxuICAgICAgcmV0dXJuIHRoaXMueiAvIHRoaXMubTtcclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTXVsdGltYXAucHJvdG90eXBlLCB7XHJcbiAgICBnZXQ6IHsgdmFsdWU6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfX0sXHJcbiAgICBzZXQ6IHsgdmFsdWU6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH19LFxyXG4gICAgZm9yRWFjaDogeyB2YWx1ZTogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH19LFxyXG4gICAgdmFsdWVzOiB7IHZhbHVlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9LCB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgfX0sXHJcbiAgICBjbGVhcjogeyB2YWx1ZTogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH19LFxyXG4gICAgc2l6ZTogeyB2YWx1ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9fVxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG4vLyBkbyBhIG5vbi1kZXN0cnVjdGl2ZSBtZXJnaW5nIG9mIGFueSBudW1iZXIgb2ZcclxuLy8gamF2YXNjcmlwdCBoYXNoZXMvb2JqZWN0c1xyXG5mdW5jdGlvbiBfZXh0ZW5kKGJhc2UsIG90aGVycykge1xyXG5cdGlmICghb3RoZXJzKSByZXR1cm4gYmFzZTtcclxuXHJcblx0dmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXHJcblx0XHRfY29weSA9IGZ1bmN0aW9uKG9sZCwgbmV3ZXIpIHtcclxuXHRcdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhuZXdlciksXHJcblx0XHRcdFx0aSA9IGtleXMubGVuZ3RoO1xyXG5cdFx0XHR3aGlsZSAoaS0tKVxyXG5cdFx0XHRcdG9sZFtrZXlzW2ldXSA9IG5ld2VyW2tleXNbaV1dO1xyXG5cdFx0XHRyZXR1cm4gb2xkO1xyXG5cdFx0fSxcclxuXHRcdHJldCA9IF9jb3B5KHt9LCBiYXNlKTtcclxuXHJcblx0YXJncy5jb25jYXQob3RoZXJzKVxyXG5cdFx0LmZvckVhY2goZnVuY3Rpb24ob3RoZXIpIHsgcmV0ID0gX2NvcHkocmV0LCBvdGhlcik7IH0pO1xyXG5cclxuXHRyZXR1cm4gcmV0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cy5fZXh0ZW5kID0gX2V4dGVuZDsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IgPSByZXF1aXJlKCcuL2xpYi9sY2dlbmVyYXRvcicpO1xyXG5cclxuZnVuY3Rpb24gTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSB7XHJcbiAgICB0aGlzLmdlbmVyYXRvciA9IG5ldyBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbiAgICB0aGlzLm1pbmVzID0gK21pbmVzIHx8IDA7XHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArZGltZW5zaW9ucyB8fCAwO1xyXG5cclxuICAgIHZhciByYW5kcyA9IFtdLFxyXG4gICAgICAgIGdldFJhbmRvbU51bWJlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5nZW5lcmF0b3IucmFuZCgpICogKE1hdGgucG93KHRoaXMuZGltZW5zaW9ucywgMikpIHwgMDsgfS5iaW5kKHRoaXMpO1xyXG5cclxuICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICB2YXIgcm5kID0gZ2V0UmFuZG9tTnVtYmVyKCk7XHJcblxyXG4gICAgICAgIGlmICghfnJhbmRzLmluZGV4T2Yocm5kKSlcclxuICAgICAgICAgICAgcmFuZHMucHVzaChybmQpO1xyXG4gICAgICAgIC8vIC4uLm90aGVyd2lzZSwgZ2l2ZSBpdCBhbm90aGVyIGdvLSdyb3VuZDpcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbWluZXMrKztcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9jYXRpb25zID0gcmFuZHMubWFwKGZ1bmN0aW9uKHJuZCkge1xyXG4gICAgICAgIHZhciByb3cgPSB+fihybmQgLyBkaW1lbnNpb25zKSxcclxuICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnM7XHJcbiAgICAgICAgcmV0dXJuIFsgcm93LCBjZWxsIF07XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbnM7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluZUxheWVyOyIsIlwidXNlIHN0cmljdDtcIlxyXG5cclxudmFyIEZsaXBwYWJsZSA9IHJlcXVpcmUoJy4vbGliL2ZsaXBwYWJsZScpO1xyXG5cclxuZnVuY3Rpb24gTWluZXNEaXNwbGF5KG1pbmVzLCBlbCkge1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG4gICAgdGhpcy4kZWwgPSAkKGVsKTtcclxuICAgIHRoaXMubWluZXMgPSBtaW5lcztcclxuXHJcbiAgICB0aGlzLiRMID0gdGhpcy4kZWwuZmluZCgnLm1pbmVjb3VudGVyJykuZXEoMCk7XHJcbiAgICB0aGlzLiRNID0gdGhpcy4kZWwuZmluZCgnLm1pbmVjb3VudGVyJykuZXEoMSk7XHJcbiAgICB0aGlzLiRSID0gdGhpcy4kZWwuZmluZCgnLm1pbmVjb3VudGVyJykuZXEoMik7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoKTtcclxufVxyXG5cclxuTWluZXNEaXNwbGF5LnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBNaW5lc0Rpc3BsYXksXHJcbiAgICBfaW5jcmVtZW50OiBmdW5jdGlvbihjaGlwcykgeyBjaGlwcy5mb3JFYWNoKGZ1bmN0aW9uKGNoaXApIHsgdGhpcy5fZmxpcChjaGlwWzBdLCBjaGlwWzFdKTsgfSwgdGhpcyk7IH0sXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSBTdHJpbmcodGhpcy5taW5lcykuc3BsaXQoJycpO1xyXG4gICAgICAgIHdoaWxlIChhcnIubGVuZ3RoIDwgMylcclxuICAgICAgICAgICAgYXJyLnVuc2hpZnQoJzAnKTtcclxuICAgICAgICB0aGlzLl9pbmNyZW1lbnQoW1xyXG4gICAgICAgICAgICBbdGhpcy4kUiwgYXJyWzJdXSxcclxuICAgICAgICAgICAgW3RoaXMuJE0sIGFyclsxXV0sXHJcbiAgICAgICAgICAgIFt0aGlzLiRMLCBhcnJbMF1dXHJcbiAgICAgICAgXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5GbGlwcGFibGUoKS5jYWxsKE1pbmVzRGlzcGxheS5wcm90b3R5cGUpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lc0Rpc3BsYXk7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgRlhfRFVSQVRJT04gPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuRlhfRFVSQVRJT04sXHJcbiAgICBESUdJVFNfTUFYID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLkRJR0lUUyxcclxuICAgIE9VVF9PRl9SQU5HRSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5PVVRfT0ZfUkFOR0UsXHJcbiAgICBGbGlwcGFibGUgPSByZXF1aXJlKCcuL2xpYi9mbGlwcGFibGUnKTtcclxuXHJcbmZ1bmN0aW9uIFNjb3JlYm9hcmQoc2NvcmUsIGVsKSB7XHJcbiAgICB0aGlzLnNjb3JlID0gc2NvcmUgfHwgMDtcclxuICAgIHRoaXMuaW5pdGlhbCA9IHNjb3JlO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG4gICAgdGhpcy4kZWwgPSAkKGVsKTtcclxuXHJcbiAgICB0aGlzLiRMID0gdGhpcy4kZWwuZmluZCgnI3NjMScpO1xyXG4gICAgdGhpcy4kTSA9IHRoaXMuJGVsLmZpbmQoJyNzYzInKTtcclxuICAgIHRoaXMuJFIgPSB0aGlzLiRlbC5maW5kKCcjc2MzJyk7XHJcblxyXG4gICAgdGhpcy51cGRhdGUodGhpcy5pbml0aWFsKTtcclxufVxyXG5cclxuU2NvcmVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU2NvcmVib2FyZCxcclxuICAgIF9pbmNyZW1lbnQ6IGZ1bmN0aW9uKGNoaXBzKSB7XHJcbiAgICAgICAgY2hpcHMuZm9yRWFjaChmdW5jdGlvbihjaGlwKSB7IHRoaXMuX2ZsaXAoY2hpcFswXSwgY2hpcFsxXSk7IH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocG9pbnRzKSB7XHJcbiAgICAgICAgaWYgKCFwb2ludHMpIHJldHVybjtcclxuICAgICAgICB2YXIgcHRzID0gdG9TdHJpbmdBcnJheShwb2ludHMpO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudChbW3RoaXMuJFIsIHB0c1syXV0sIFt0aGlzLiRNLCBwdHNbMV1dLCBbdGhpcy4kTCwgcHRzWzBdXV0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxuRmxpcHBhYmxlKHsgZHVyYXRpb246IEZYX0RVUkFUSU9OIH0pLmNhbGwoU2NvcmVib2FyZC5wcm90b3R5cGUpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY29yZWJvYXJkO1xyXG5cclxuZnVuY3Rpb24gdG9TdHJpbmdBcnJheShuKSB7XHJcbiAgICB2YXIgbnVtID0gU3RyaW5nKG4pLFxyXG4gICAgICAgIGxlbiA9IG51bS5sZW5ndGg7XHJcblxyXG4gICAgLy8gdG9vIGJpZyBmb3IgKnRoaXMqIHNjb3JlYm9hcmQuLi5cclxuICAgIGlmIChsZW4gPiBESUdJVFNfTUFYKSB7XHJcbiAgICAgICAgbnVtID0gT1VUX09GX1JBTkdFO1xyXG4gICAgICAgIGxlbiA9IE9VVF9PRl9SQU5HRS5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsgbnVtW2xlbiAtIDNdIHx8IFwiMFwiLCBudW1bbGVuIC0gMl0gfHwgXCIwXCIsIG51bVtsZW4gLSAxXSB8fCBcIjBcIiBdO1xyXG59IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgUG9pbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yaW5nUnVsZXMsXHJcbiAgICBTY29yZUV2ZW50SGFuZGxlck1pc3NpbmdFcnJvciA9IHJlcXVpcmUoJy4vZXJyb3JzJykuU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3I7XHJcblxyXG5mdW5jdGlvbiBTY29yZWtlZXBlcihnYW1lYm9hcmQpIHtcclxuXHJcblxyXG4gIHRoaXMuY2FsbGJhY2tzID0ge1xyXG4gICAgdXA6IGZ1bmN0aW9uKHB0cykge1xyXG4gICAgICB0aGlzLnNjb3JlICs9IHBvcyhwdHMpO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZVwiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbihwdHMpIHtcclxuICAgICAgdGhpcy5zY29yZSA9ICh0aGlzLnNjb3JlIC0gbmVnKHB0cykgPD0gMCkgPyAwIDogdGhpcy5zY29yZSAtIG5lZyhwdHMpO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZVwiLCB0aGlzLnNjb3JlKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0aGlzLmZpbmFsaXplcnMgPSB7XHJcbiAgICBmb3JPcGVuaW5nU3F1YXJlczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIG1vdmVzID0gZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgdW5taW5lZCA9IE1hdGgucG93KGdhbWVib2FyZC5kaW1lbnNpb25zLCAyKSAtIGdhbWVib2FyZC5taW5lcztcclxuICAgICAgICByZXR1cm4gMSAtICh+fihtb3ZlcyAvIHVubWluZWQpICogMTApO1xyXG4gICAgfSxcclxuICAgIGZvclRpbWVQYXNzZWQ6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciB0b3RhbCA9IGdhbWVib2FyZC5jbG9jay5tYXgsIGVsYXBzZWQgPSBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcztcclxuICAgICAgICByZXR1cm4gMTAwIC0gfn4oZWxhcHNlZCAvIHRvdGFsICogMTAwKTtcclxuICAgIH0sXHJcbiAgICBmb3JGZXdlc3RNb3ZlczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgLy8gZXhwZXJpbWVudGFsOiBzcXJ0KHheMiAtIHkpICogMTBcclxuICAgICAgICB2YXIgZGltcyA9IE1hdGgucG93KGdhbWVib2FyZC5kaW1lbnNpb25zLCAyKTtcclxuICAgICAgICByZXR1cm4gfn4oTWF0aC5zcXJ0KGRpbXMgLSBnYW1lYm9hcmQudXNlck1vdmVzKSAqIFBvaW50cy5VU0VSTU9WRVNfTVVMVElQTElFUik7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgdGhpcy5xdWV1ZSA9IFtdO1xyXG4gIHRoaXMuZmluYWwgPSBbXTtcclxuXHJcbiAgLy8gVE9ETzogd2VhbiB0aGlzIGNsYXNzIG9mZiBkZXBlbmRlbmN5IG9uIGdhbWVib2FyZFxyXG4gIC8vIHNob3VsZCBvbmx5IG5lZWQgdG8gaGF2ZSBjdG9yIGluamVjdGVkIHdpdGggdGhlIGdhbWVib2FyZCdzIGVtaXR0ZXJcclxuICB0aGlzLmdhbWVib2FyZCA9IGdhbWVib2FyZDtcclxuICB0aGlzLmVtaXR0ZXIgPSBnYW1lYm9hcmQuZW1pdHRlcjtcclxuICB0aGlzLnNjb3JlID0gMDtcclxuXHJcbiAgdGhpcy5uc3UgPSB0aGlzLl9kZXRlcm1pbmVTaWduaWZpY2FudFVuaXQoKTtcclxuICB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgLy8gaWYgZ2FtZSBpcyBub3cgb3ZlciwgZmx1c2ggcXVldWVzXHJcbiAgdGhpcy50aW1lciA9IHNldEludGVydmFsKHRoaXMuX3RpY2suYmluZCh0aGlzKSwgdGhpcy5uc3UpO1xyXG5cclxuICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBvcyhwdHMpIHsgcmV0dXJuIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuZnVuY3Rpb24gbmVnKHB0cykgeyByZXR1cm4gLTEgKiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcblxyXG5TY29yZWtlZXBlci5wcm90b3R5cGUgPSB7XHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBFVkVOVFMgPSB7XHJcbiAgICAgICAgJ3NxOm9wZW4nOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXAoc3F1YXJlLmdldERhbmdlcigpICogUG9pbnRzLkRBTkdFUl9JRFhfTVVMVElQTElFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy51cChQb2ludHMuQkxBTktfU1FVQVJFX1BUUyk7XHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ3NxOmZsYWcnOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWRVcChQb2ludHMuRkxBR19NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZERvd24oUG9pbnRzLk1JU0ZMQUdfVU5NSU5FRCArIChzcXVhcmUuZ2V0RGFuZ2VyKCkgfHwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICdzcTp1bmZsYWcnOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWREb3duKFBvaW50cy5VTkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWRVcChQb2ludHMuTUlTVU5GTEFHX01JTkVEKTtcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAnZ2I6c3RhcnQnOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgdGhpcy5lbmRHYW1lID0gZmFsc2U7IH0sXHJcbiAgICAgICAgJ2diOnJlc3VtZSc6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgfSxcclxuICAgICAgICAnZ2I6cGF1c2UnOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgdGhpcy5lbmRHYW1lID0gdHJ1ZTsgfSxcclxuICAgICAgICAnZ2I6ZW5kOndpbic6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9LFxyXG4gICAgICAgICdnYjplbmQ6b3Zlcic6IGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyB0aGlzLmVuZEdhbWUgPSB0cnVlOyB9LFxyXG4gICAgICAgICdnYjplbmQ6dGltZWRvdXQnOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgdGhpcy5lbmRHYW1lID0gdHJ1ZTsgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZm9yICh2YXIgZXZlbnQgaW4gRVZFTlRTKVxyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbihldmVudCwgRVZFTlRTW2V2ZW50XS5iaW5kKHRoaXMpKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX2JpbmFyeVNlYXJjaDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSA+PiAxKTtcclxuICAgICAgICAgICAgaWYgKHgudGltZSA8IHRoaXMucXVldWVbbWlkXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgaGkgPSBtaWQ7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxvID0gbWlkICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvO1xyXG4gICAgfSxcclxuICAgIF9lbnF1ZXVlOiBmdW5jdGlvbih4KSB7IHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSh0aGlzLl9iaW5hcnlTZWFyY2goeCksIDAsIHgpOyB9LFxyXG4gICAgX3Byb2Nlc3NFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmNhbGxiYWNrc1tldmVudC50eXBlXTtcclxuICAgICAgICBpZiAoZm4gIT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIChmbi5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgPyBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cywgZnVuY3Rpb24oZXJyKSB7IGlmICghZXJyKSByZXR1cm4gdm9pZCAwOyB9KVxyXG4gICAgICAgICAgICAgICAgOiBjb25zb2xlLmxvZyhcIjxkZWZlcnJlZCBzY29yZSBldmVudDogJW8+IDpvbGQgPT4gWyVvXVwiLCBldmVudC50eXBlLCB0aGlzLnNjb3JlKSxcclxuICAgICAgICAgICAgICAgICAgZm4uY2FsbCh0aGlzLCBldmVudC5wdHMpLFxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIi4uLjpuZXcgPT4gWyVvXVwiLCB0aGlzLnNjb3JlKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU2NvcmVFdmVudEhhbmRsZXJNaXNzaW5nRXJyb3IoXCJTY29yZWtlZXBlciBjb3VsZCBub3QgZmluZCBmdW5jdGlvbiB7MH1cIiwgZXZlbnQudHlwZSk7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF9wcm9jZXNzRmluYWxpemVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZm9yICh2YXIgdmlzaXRvciBpbiB0aGlzLmZpbmFsaXplcnMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCI8ZmluYWxpemVyOiAlbz4gOm9sZCBbJW9dID0+IDpuZXcgWyVvXS4uLiBcIiwgdmlzaXRvciwgdGhpcy5zY29yZSwgKHRoaXMuc2NvcmUgKz0gdGhpcy5maW5hbGl6ZXJzW3Zpc2l0b3JdKHRoaXMuZ2FtZWJvYXJkKSkpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLnNjb3JlICs9IHZpc2l0b3IodGhpcy5nYW1lYm9hcmQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmZpbmFsLmZvckVhY2goZnVuY3Rpb24oZikgeyB0aGlzLnNjb3JlICs9IGY7IH0sIHRoaXMpO1xyXG4gICAgICAgIC8vIGZpbmFsIHVwZGF0ZSBvZiB0aGUgc2NvcmVcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZTpmaW5hbFwiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBfdGljazogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGN1cnJJZHggPSB0aGlzLl9iaW5hcnlTZWFyY2goeyB0aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSB9KSwgaW5kZXggPSAwO1xyXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGN1cnJJZHgpIHtcclxuICAgICAgICAgICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7IHRoaXMuX3Byb2Nlc3NFdmVudCh0aGlzLnF1ZXVlW2luZGV4XSk7IHJldHVybiBpbmRleCArPSAxOyB9LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSgwLCBjdXJySWR4KTtcclxuICAgIH0sXHJcbiAgICBfYWRkU2NvcmVUb1F1ZXVlOiBmdW5jdGlvbih0eXBlLCBwdHMpIHsgcmV0dXJuIHRoaXMuX2VucXVldWUoeyB0aW1lOiAoKCtuZXcgRGF0ZSkgKyB0aGlzLm5zdSksIHR5cGU6IHR5cGUsIHB0czogcHRzIH0pOyB9LFxyXG5cclxuICAgIHVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5jYWxsYmFja3MudXAuY2FsbCh0aGlzLCBwdHMpOyB9LFxyXG4gICAgZG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuY2FsbGJhY2tzLmRvd24uY2FsbCh0aGlzLCBwdHMpOyB9LFxyXG5cclxuICAgIGRlZmVycmVkVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJ1cFwiLCBwb3MocHRzKSk7IH0sXHJcbiAgICBkZWZlcnJlZERvd246IGZ1bmN0aW9uKHB0cykgeyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJkb3duXCIsIG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBmaW5hbFVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKHBvcyhwdHMpKTsgfSxcclxuICAgIGZpbmFsRG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuZmluYWwucHVzaChuZWcocHRzKSk7IH0sXHJcblxyXG4gICAgZ2V0UGVuZGluZ1Njb3JlQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5xdWV1ZS5sZW5ndGg7IH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCJDbGVhcmluZyBvdXQgcmVtYWluaW5nIHF1ZXVlIVwiKTtcclxuICAgICAgdGhpcy5xdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IHRoaXMuX3Byb2Nlc3NFdmVudChldmVudCk7IH0sIHRoaXMpO1xyXG5cclxuICAgICAgdGhpcy5fcHJvY2Vzc0ZpbmFsaXplcnMoKTtcclxuXHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkZJTkFMIFNDT1JFOiAlb1wiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcbiAgICAgIHRoaXMucXVldWUubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5maW5hbC5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVrZWVwZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgU2VyaWFsaXplciA9IHtcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgX21ldGE6IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogK25ldyBEYXRlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5zY29yZSxcclxuICAgICAgICAgICAgICAgIHRpbWVyOiBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzOiBnYW1lYm9hcmQuZW1pdHRlci5fdHJhbnNjcmlwdHMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICB1c2VyOiB7fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAkZWw6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBib2FyZDogZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSxcclxuICAgICAgICAgICAgICAgIHNjb3Jla2VlcGVyOiB7IHF1ZXVlOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIucXVldWUsIGZpbmFsOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIuZmluYWwgfSxcclxuICAgICAgICAgICAgICAgIGZsYXNoQ29udGFpbmVyOiBnYW1lYm9hcmQuZmxhc2hDb250YWluZXIuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICB0aGVtZTogZ2FtZWJvYXJkLnRoZW1lLFxyXG4gICAgICAgICAgICAgICAgZGVidWdfbW9kZTogZ2FtZWJvYXJkLmRlYnVnX21vZGUsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBnYW1lYm9hcmQuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIG1pbmVzOiBnYW1lYm9hcmQubWluZXMsXHJcbiAgICAgICAgICAgICAgICB1c2VyTW92ZXM6IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgICAgICBpc01vYmlsZTogZ2FtZWJvYXJkLmlzTW9iaWxlLFxyXG4gICAgICAgICAgICAgICAgLy8gdGhpcyBmbGFnIGFsZXJ0cyBHYW1lYm9hcmQgY29uc3RydWN0b3IgdG9cclxuICAgICAgICAgICAgICAgIC8vIGFsdGVyIHVzdWFsIGluaXRpYWxpemF0aW9uIHByb2Nlc3MuLi5cclxuICAgICAgICAgICAgICAgIGlzUGVyc2lzdGVkOiB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIGltcG9ydDogZnVuY3Rpb24oZXhwb3J0ZWQpIHtcclxuXHJcbiAgICAgICAgLy8gMS4gaW4gdGhpcyBjb250ZXh0LCBgdGhpc2AgaXMgdGhlIG5ld2x5LWluc3RhbnRpYXRlZCxcclxuICAgICAgICAvLyAgICBidXQgbm90LXlldC1zZXQtdXAgR2FtZWJvYXJkIGluc3RhbmNlLlxyXG4gICAgICAgIC8vIDIuIHJlcGxhY2UgYGJvYXJkYCB3aXRoIG5ldyBNdWx0aW1hcDpcclxuICAgICAgICAvLyAgICAgLSBjb3VudCBhcnJheXMgYXQgZmlyc3QgbGV2ZWwgaW4gYm9hcmQgZm9yIG51bSByb3dzXHJcbiAgICAgICAgLy8gICAgICAgICAgW1tbe1wicm93XCI6MCxcImNlbGxcIjowLFwic3RhdGVcIjp7XCJfZmxhZ3NcIjpcIjEwMDBcIn0sXCJkYW5nZXJcIjowfSxcclxuICAgICAgICAvLyAgICAgICAgICB7XCJyb3dcIjowLFwiY2VsbFwiOjIsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMDAxMFwifX1dXV1cclxuICAgICAgICAvLyAgICAgLSBwYXJzZSBlYWNoIG9iamVjdCB0byBjcmVhdGUgbmV3IFNxdWFyZShyb3csIGNlbGwsIGRhbmdlciwgX2ZsYWdzKVxyXG4gICAgICAgIC8vIDMuICRlbCA9ICQoZXhwb3J0ZWQuJGVsKVxyXG4gICAgICAgIC8vIDQuIGZsYXNoQ29udGFpbmVyID0gJChleHBvcnRlZC5mbGFzaENvbnRhaW5lcilcclxuICAgICAgICAvLyA1LiB0aGVtZSA9IGV4cG9ydGVkLnRoZW1lXHJcbiAgICAgICAgLy8gNi4gZGVidWdfbW9kZSA9IGV4cG9ydGVkLmRlYnVnX21vZGVcclxuICAgICAgICAvLyA3LiBkaW1lbnNpb25zID0gZXhwb3J0ZWQuZGltZW5zaW9uc1xyXG4gICAgICAgIC8vIDguIG1pbmVzID0gZ2FtZWJvYXJkLm1pbmVzXHJcbiAgICAgICAgLy8gOS4gdXNlck1vdmVzID0gZ2FtZWJvYWQudXNlck1vdmVzLCBhbmQgaXNNb2JpbGVcclxuICAgICAgICAvLyAxMC4gbWFrZSBuZXcgQ291bnRkb3duIHdpdGggZXhwb3J0ZWQuX21ldGEudGltZXIgPSBzZWNvbmRzLCBjbG9jay5zdGFydCgpXHJcbiAgICAgICAgLy8gMTEuIGluc3RhbnRpYXRlIG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyLCBsb2FkaW5nIF9tZXRhLnRyYW5zY3JpcHRzIGludG8gaXRzIF90cmFuc2NyaXB0c1xyXG4gICAgICAgIC8vIDEyLiByZS1ydW4gdGhlIGludGVybmFsIGluaXQoKSBvcHM6IF9sb2FkQm9hcmQsIF9yZW5kZXJHcmlkXHJcblxyXG4vKiAgICAgIHRoaXMuYm9hcmQgPSBuZXcgTXVsdGltYXA7XHJcbiAgICAgICAgdGhpcy5kaW1lbnNpb25zID0gK3RoaXMuc2V0dGluZ3MuZGltZW5zaW9ucztcclxuICAgICAgICB0aGlzLm1pbmVzID0gK3RoaXMuc2V0dGluZ3MubWluZXM7XHJcbiAgICAgICAgdGhpcy4kZWwgPSAkKHRoaXMuc2V0dGluZ3MuYm9hcmQpO1xyXG4gICAgICAgIHRoaXMuaXNDdXN0b20gPSB0aGlzLnNldHRpbmdzLmlzQ3VzdG9tIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlciA9IG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyKFRyYW5zY3JpcHRpb25TdHJhdGVneSk7XHJcbiAgICAgICAgdGhpcy5kZWJ1Z19tb2RlID0gdGhpcy5zZXR0aW5ncy5kZWJ1Z19tb2RlO1xyXG4gICAgICAgIHRoaXMudGhlbWUgPSB0aGlzLl9zZXRDb2xvclRoZW1lKHRoaXMuc2V0dGluZ3MudGhlbWUpO1xyXG4gICAgICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKE1lc3NhZ2VPdmVybGF5KTtcclxuICAgICAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcbiAgICAgICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAgICAgdGhpcy5taW5lc0Rpc3BsYXkgPSBuZXcgTWluZXNEaXNwbGF5KHRoaXMubWluZXMsIFwiI21pbmVzLWRpc3BsYXlcIik7XHJcbiAgICAgICAgdGhpcy5jbG9jayA9IG5ldyBUaW1lcigwLCArdGhpcy5zZXR0aW5ncy50aW1lciB8fCB0aGlzLl9kZXRlcm1pbmVUaW1lcigpLCB0aGlzLnNldHRpbmdzLmlzQ291bnRkb3duLCB0aGlzLmVtaXR0ZXIpO1xyXG4gICAgICAgIHRoaXMuY291bnRkb3duID0gbmV3IENvdW50ZG93bihcIiNjb3VudGRvd25cIik7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlciA9IG5ldyBTY29yZWtlZXBlcih0aGlzKTtcclxuICAgICAgICB0aGlzLnNjb3JlYm9hcmQgPSBuZXcgU2NvcmVib2FyZCgwLCBcIiNzY29yZS1kaXNwbGF5XCIpO1xyXG4qL1xyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcmlhbGl6ZXI7IiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgQml0RmxhZ0ZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9iaXQtZmxhZy1mYWN0b3J5JyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzLFxyXG4gICAgRmxhZ3MgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkZsYWdzLFxyXG5cclxuICAgIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsgRmxhZ3MuT1BFTiwgRmxhZ3MuTUlORUQsIEZsYWdzLkZMQUdHRUQsIEZsYWdzLklOREVYRUQgXSk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIsIGZsYWdzKSB7XHJcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICByZXR1cm4gbmV3IFNxdWFyZShhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5yb3cgPSByb3c7XHJcbiAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgdGhpcy5zdGF0ZSA9IGZsYWdzID8gbmV3IEJpdEZsYWdzKGZsYWdzKSA6IG5ldyBCaXRGbGFncztcclxuICAgIHRoaXMuZGFuZ2VyID0gKGRhbmdlciA9PSArZGFuZ2VyKSA/ICtkYW5nZXIgOiAwO1xyXG5cclxuICAgIGlmICh0aGlzLmRhbmdlciA+IDApIHRoaXMuaW5kZXgoKTtcclxufVxyXG5cclxuU3F1YXJlLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTcXVhcmUsXHJcbiAgICBnZXRSb3c6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yb3c7IH0sXHJcbiAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgIGdldERhbmdlcjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmRhbmdlcjsgfSxcclxuICAgIHNldERhbmdlcjogZnVuY3Rpb24oaWR4KSB7IGlmIChpZHggPT0gK2lkeCkgeyB0aGlzLmRhbmdlciA9ICtpZHg7IHRoaXMuZGFuZ2VyID4gMCAmJiB0aGlzLmluZGV4KCk7IH0gfSxcclxuICAgIGdldFN0YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHRoaXNbICdpcycgKyBrZXkuY2hhckF0KDApICsga2V5LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpIF0oKTsgfSwgdGhpcylcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihrZXkpIHsgcmV0dXJuIGtleS50b0xvd2VyQ2FzZSgpOyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIG9wZW46IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICBtaW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX01JTkVEKTsgfSxcclxuICAgIHVubWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0lOREVYRUQpOyB9LFxyXG5cclxuICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuICF0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKTsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKCk7IH0sXHJcbiAgICBpc0luZGV4ZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0luZGV4ZWQoKTsgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyByb3c6IHRoaXMucm93LCBjZWxsOiB0aGlzLmNlbGwsIHN0YXRlOiB0aGlzLnN0YXRlLCBkYW5nZXI6IHRoaXMuZGFuZ2VyIH0gfSxcclxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpXHJcbiAgICAgICAgICAgID8gU3ltYm9scy5NSU5FRCA6IHRoaXMuc3RhdGUuaXNGbGFnZ2VkKClcclxuICAgICAgICAgICAgICAgID8gU3ltYm9scy5GTEFHR0VEIDogdGhpcy5zdGF0ZS5pc09wZW4oKVxyXG4gICAgICAgICAgICAgICAgICAgID8gU3ltYm9scy5PUEVOIDogU3ltYm9scy5DTE9TRUQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNxdWFyZTsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciAkQyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XHJcblxyXG52YXIgVGhlbWVTdHlsZXIgPSB7XHJcblx0c2V0OiBmdW5jdGlvbih0aGVtZSwgJGVsKSB7XHJcblxyXG5cdFx0JGVsIHx8ICgkZWwgPSAkKCRDLkRlZmF1bHRDb25maWcuYm9hcmQpKTtcclxuXHJcblx0XHR2YXIgdGhlbWVGaWxlID0gJEMuVGhlbWVzW3RoZW1lXSxcclxuXHRcdFx0JGJvZHkgPSAkZWwucGFyZW50cyhcImJvZHlcIikubGVuZ3RoID8gJGVsLnBhcmVudHMoXCJib2R5XCIpIDogJChkb2N1bWVudC5ib2R5KTtcclxuXHJcblx0XHQkYm9keS5yZW1vdmVDbGFzcygpLmFkZENsYXNzKHRoZW1lRmlsZSk7XHJcblx0XHQvKiAsXHJcblx0XHRcdCRoZWFkID0gJGVsLnBhcmVudHMoXCJib2R5XCIpLnNpYmxpbmdzKFwiaGVhZFwiKSxcclxuXHRcdFx0JHN0eWxlcyA9ICRoZWFkLmZpbmQoXCJsaW5rXCIpLFxyXG5cclxuXHRcdFx0aGFzUHJlRXhpc3RpbmcgPSBmdW5jdGlvbihzdHlsZXNoZWV0cykge1xyXG5cdFx0XHRcdHJldHVybiAhIXN0eWxlc2hlZXRzLmZpbHRlcihmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHJldHVybiAhIX4kKHRoaXMpLmF0dHIoJ2hyZWYnKS5pbmRleE9mKHRoZW1lRmlsZSk7XHJcblx0XHRcdFx0fSkubGVuZ3RoXHJcblx0XHRcdH0sXHJcblx0XHRcdC8vIGJ1aWxkIGEgbmV3IDxsaW5rPiB0YWcgZm9yIHRoZSBkZXNpcmVkIHRoZW1lIHN0eWxlc2hlZXQ6XHJcblx0XHRcdCRsaW5rID0gJChcIjxsaW5rIC8+XCIsIHtcclxuXHRcdFx0XHRyZWw6ICdzdHlsZXNoZWV0JyxcclxuXHRcdFx0XHR0eXBlOiAndGV4dC9jc3MnLFxyXG5cdFx0XHRcdGhyZWY6ICdjc3MvJyArIHRoZW1lRmlsZSArICcuY3NzJ1xyXG5cdFx0XHR9KTtcclxuXHRcdC8vIHVzaW5nICRlbCBhcyBhbmNob3IgdG8gdGhlIERPTSwgZ28gdXAgYW5kXHJcblx0XHQvLyBsb29rIGZvciBsaWdodC5jc3Mgb3IgZGFyay5jc3MsIGFuZC0taWYgbmVjZXNzYXJ5LS1zd2FwXHJcblx0XHQvLyBpdCBvdXQgZm9yIGB0aGVtZWAuXHJcblx0XHQvLyBBZGQgJGxpbmsgaWZmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdCFcclxuXHRcdGlmICghaGFzUHJlRXhpc3RpbmcoJHN0eWxlcykpXHJcblx0XHRcdCRzdHlsZXMuYWZ0ZXIoJGxpbmspOyovXHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaGVtZVN0eWxlcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbmZ1bmN0aW9uIFRpbWVyKGluaXRpYWwsIG1heCwgaXNDb3VudGRvd24sIGVtaXR0ZXIpIHtcclxuICAgIHRoaXMuaXNDb3VudGRvd24gPSBpc0NvdW50ZG93bjtcclxuICAgIHRoaXMuc2Vjb25kcyA9IHRoaXMuaXNDb3VudGRvd24gPyBtYXggOiBpbml0aWFsO1xyXG4gICAgdGhpcy5pbml0aWFsID0gaW5pdGlhbDtcclxuICAgIHRoaXMubWF4ID0gbWF4O1xyXG5cclxuICAgIHRoaXMuZW1pdHRlciA9IGVtaXR0ZXI7XHJcblxyXG4gICAgdGhpcy5mcmVlemUgPSBmYWxzZTtcclxufVxyXG5cclxuVGltZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IFRpbWVyLFxyXG4gICAgX3JlbmRlckluaXRpYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fcHVibGlzaChhcnJbMF0gfHwgMCwgYXJyWzFdIHx8IDApO1xyXG4gICAgfSxcclxuICAgIF90b01pbnNTZWNzOiBmdW5jdGlvbihzZWNzKSB7XHJcbiAgICAgICAgdmFyIG1pbnMgPSB+fihzZWNzIC8gNjApLFxyXG4gICAgICAgICAgICBzZWNzID0gfn4oc2VjcyAlIDYwKTtcclxuICAgICAgICByZXR1cm4gW21pbnMsIHNlY3NdO1xyXG4gICAgfSxcclxuICAgIF9jb3VudGRvd246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmZyZWV6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgodGhpcy5pc0NvdW50ZG93biAmJiB0aGlzLnNlY29uZHMgPiAwKSB8fCAoIXRoaXMuaXNDb3VudGRvd24gJiYgdGhpcy5zZWNvbmRzIDwgdGhpcy5tYXgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3B1Ymxpc2goXCJjaGFuZ2VcIiwgYXJyWzBdLCBhcnJbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQ291bnRkb3duID8gdGhpcy5zZWNvbmRzLS0gOiB0aGlzLnNlY29uZHMrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fcHVibGlzaChcImVuZFwiLCAwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpLCAxMDAwKTtcclxuICAgIH0sXHJcbiAgICBfcHVibGlzaDogZnVuY3Rpb24oZXZlbnQsIG1pbnMsIHNlY3MpIHsgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJ0aW1lcjpcIiArIGV2ZW50LCBtaW5zLCBzZWNzKTsgfSxcclxuICAgIGdldE1pbnV0ZXM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gK3RoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKVswXTsgfSxcclxuICAgIGdldFNlY29uZHM6IGZ1bmN0aW9uKCkgeyByZXR1cm4gK3RoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKVsxXTsgfSxcclxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmZyZWV6ZSA9IGZhbHNlO1xyXG4gICAgICAgIHZhciB0ID0gdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpO1xyXG4gICAgICAgIHRoaXMuX3B1Ymxpc2goXCJzdGFydFwiLCB0WzBdLCB0WzFdKTtcclxuICAgICAgICB0aGlzLl9jb3VudGRvd24oKTtcclxuICAgIH0sXHJcbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmZyZWV6ZSA9IHRydWU7XHJcbiAgICAgICAgdmFyIHQgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fcHVibGlzaChcInN0b3BcIiwgdFswXSwgdFsxXSk7XHJcbiAgICB9LFxyXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuc2Vjb25kcyA9IDA7XHJcbiAgICAgICAgdGhpcy5fcHVibGlzaChcInJlc2V0XCIsIDAsIDApO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaW1lcjsiLCJcInVzZSBzdHJpY3Q7XCJcclxuXHJcbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9saWIvZW1pdHRlcicpLFxyXG4gICAgVHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0gcmVxdWlyZSgnLi90cmFuc2NyaXB0aW9uLXN0cmF0ZWd5Jyk7XHJcblxyXG5mdW5jdGlvbiBUcmFuc2NyaWJpbmdFbWl0dGVyKHN0cmF0ZWd5KSB7XHJcbiAgICBFbWl0dGVyLmNhbGwodGhpcyk7XHJcbiAgICB0aGlzLl90cmFuc2NyaXB0cyA9IFtdO1xyXG4gICAgdGhpcy5fc3RyYXRlZ3kgPSAoc3RyYXRlZ3kgJiYgc3RyYXRlZ3kuYXBwbHkpID8gc3RyYXRlZ3kgOiBUcmFuc2NyaXB0aW9uU3RyYXRlZ3k7XHJcbn1cclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSk7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVHJhbnNjcmliaW5nRW1pdHRlcjtcclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLl9fdHJpZ2dlcl9fID0gVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlcjtcclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKC8qIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgIC8vIHNlbmQgb3JpZ2luYWwgcGFyYW1zIHRvIHRoZSBzdWJzY3JpYmVycy4uLlxyXG4gICAgdGhpcy5fX3RyaWdnZXJfXy5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgIC8vIC4uLnRoZW4gYWx0ZXIgdGhlIHBhcmFtcyBmb3IgdGhlIHRyYW5zY3JpcHQncyByZWNvcmRzXHJcbiAgICB2YXIgdHNjcmlwdCA9IHRoaXMuX3N0cmF0ZWd5LmFwcGx5KGFyZ3MpO1xyXG4gICAgdHNjcmlwdCAmJiB0aGlzLl90cmFuc2NyaXB0cy5wdXNoKHRzY3JpcHQpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2NyaWJpbmdFbWl0dGVyOyIsIlwidXNlIHN0cmljdDtcIlxuXG52YXIgRGVmYXVsdFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHtcbiAgICAgICAgYXBwbHk6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGFbMF0pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGRhdGFbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOm9wZW5cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOmNsb3NlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTpmbGFnXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTp1bmZsYWdcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOm1pbmVcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0YW5kYXJkIFNxdWFyZS1iYXNlZCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMDogZXZlbnQgbmFtZSwgMTogU3F1YXJlIGluc3RhbmNlLCAyOiBqUXVlcnktd3JhcHBlZCBET00gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJTcXVhcmVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzFdID0gSlNPTi5zdHJpbmdpZnkoZGF0YVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsyXSBpbnN0YW5jZW9mIGpRdWVyeSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzJdID0gYnVpbGRET01TdHJpbmcoZGF0YVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOnN0YXJ0XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjpyZXN1bWVcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOnBhdXNlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjplbmQ6d2luXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjplbmQ6b3ZlclwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6ZW5kOnRpbWVkb3V0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdGFuZGFyZCBHYW1lYm9hcmQtYmFzZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTXVsdGltYXBcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzFdID0gSlNPTi5zdHJpbmdpZnkoZGF0YVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic2NvcmU6Y2hhbmdlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzY29yZTpjaGFuZ2U6ZmluYWxcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1lcjpzdGFydFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGltZXI6c3RvcFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGltZXI6Y2hhbmdlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aW1lcjpyZXNldFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGltZXI6ZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gbm8tb3BcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHByZWZpeCBhcnJheSBjb250ZW50cyB3aXRoIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBpdHMga2V5XG4gICAgICAgICAgICAgICAgZGF0YSAmJiBkYXRhLnVuc2hpZnQoK25ldyBEYXRlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRGVmYXVsdFRyYW5zY3JpcHRpb25TdHJhdGVneTtcblxuLy8gVGFrZXMgYSA8dGQ+IERPTSBub2RlLCBhbmQgY29udmVydHMgaXQgdG8gYVxuLy8gc3RyaW5nIGRlc2NyaXB0b3IsIGUuZy4sIFwidHIjcm93MCB0ZC5jZWxsMC5taW5lZC5jbG9zZWRcIi5cbmZ1bmN0aW9uIGJ1aWxkRE9NU3RyaW5nKCRlbCkge1xuICAgIHZhciBub2RlID0gJGVsIGluc3RhbmNlb2YgalF1ZXJ5ID8gJGVsWzBdIDogJGVsLFxuICAgICAgICAvLyBzb3J0cyBjbGFzcyBuYW1lcywgcHV0dGluZyB0aGUgXCJjZWxsWFwiIGNsYXNzIGZpcnN0XG4gICAgICAgIFNPUlRfRk5fQ0VMTF9GSVJTVCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGluY2lwaXQoc3RyKSB7IHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIFwiY2VsbFwiLmxlbmd0aCkudG9Mb3dlckNhc2UoKTsgfTtcbiAgICAgICAgICAgIHJldHVybiAoaW5jaXBpdChhKSA9PT0gXCJjZWxsXCIgfHwgaW5jaXBpdChiKSA9PT0gXCJjZWxsXCIgfHwgYSA+IGIpID8gMSA6IChhIDwgYikgPyAtMSA6IDA7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgKyBcIiNcIiArIG5vZGUucGFyZW50Tm9kZS5pZCArIFwiIFwiXG4gICAgICAgICsgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBcIi5cIlxuICAgICAgICArIG5vZGUuY2xhc3NOYW1lLnNwbGl0KCcgJylcbiAgICAgICAgLnNvcnQoU09SVF9GTl9DRUxMX0ZJUlNUKVxuICAgICAgICAuam9pbignLicpO1xufVxuIiwiXCJ1c2Ugc3RyaWN0O1wiXHJcblxyXG52YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG4gICAgVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi9lcnJvcnMnKS5WYWxpZGF0aW9uRXJyb3IsXHJcbiAgICAvLyB2YWxpZGF0aW9uIGhlbHBlciBmbnNcclxuICAgIGlzTnVtZXJpYyA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgIHJldHVybiBTdHJpbmcodmFsKS5yZXBsYWNlKC8sL2csICcnKSwgKHZhbC5sZW5ndGggIT09IDAgJiYgIWlzTmFOKCt2YWwpICYmIGlzRmluaXRlKCt2YWwpKTtcclxuICAgIH0sXHJcblxyXG4gICAgVmFsaWRhdG9ycyA9IHtcclxuICAgICAgICBCb2FyZERpbWVuc2lvbnM6IHtcclxuICAgICAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGRpbSkge1xyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMoZGltKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIGJvYXJkIGRpbWVuc2lvbi5cIiwgZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgZ3JlYXRlciB0aGFuIE1BWF9ESU1FTlNJT05TIGNvbnN0YW50XHJcbiAgICAgICAgICAgICAgICBpZiAoIShkaW0gPD0gJEMuTUFYX0dSSURfRElNRU5TSU9OUykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBnYW1lJ3MgbWF4aW11bSBncmlkIGRpbWVuc2lvbnNcIiwgK2RpbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIE1pbmVDb3VudDoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24obWluZXMsIG1heFBvc3NpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBudW1lcmljIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTnVtZXJpYyhtaW5lcykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgbm90IGEgbnVtYmVyLCBhbmQgYW4gaW52YWxpZCBudW1iZXIgb2YgbWluZXMuXCIsIG1pbmVzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgZ3JlYXRlciB0aGFuIG1heFBvc3NpYmxlIGZvciB0aGlzIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICAgICAgICAgIGlmIChtaW5lcyA+IG1heFBvc3NpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIGdyZWF0ZXIgdGhhbiB0aGUgcG9zc2libGUgbnVtYmVyIG9mIG1pbmVzICh7MX0pLlwiLCArbWluZXMsIG1heFBvc3NpYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBtdXN0IGhhdmUgYXQgbGVhc3Qgb25lIG1pbmUhXHJcbiAgICAgICAgICAgICAgICBpZiAobWluZXMgPCAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIkludmFsaWQgbWluZSBjb3VudDogcGxlYXNlIGNob29zZSBhIHZhbHVlIGJldHdlZW4gezB9IGFuZCB7MX0uXCIsIDEsIG1heFBvc3NpYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlLi4uXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdG9yczsiXX0=
;