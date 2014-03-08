;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gameboard = require('./gameboard'),
    Modes = require('./constants').Modes,
    PresetLevels = require('./constants').PresetLevels,
    PresetSetups = require('./constants').PresetSetups,
    DimValidator = require('./validators').BoardDimensions,
    MineValidator = require('./validators').MineCount,
    VERSION = require('./constants').VERSION,
    MAX_GRID_DIMENSIONS = require('./constants').MAX_GRID_DIMENSIONS,

    mineableSpaces = function(dim) { return ~~(Math.pow(dim, 2) * 0.5); },
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
},{"./constants":3,"./gameboard":7,"./validators":20}],2:[function(require,module,exports){

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

var Constants = {

    VERSION: 'beta4',
    MAX_GRID_DIMENSIONS: 25,

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

};

module.exports = Constants;
},{}],4:[function(require,module,exports){


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
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":11,"./minelayer":12,"./scoreboard":13,"./scorekeeper":14,"./serializer":15,"./square":16,"./theme-styler":17,"./transcribing-emitter":18,"./transcription-strategy":19}],8:[function(require,module,exports){

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
// Linear Congruential Generator: variant of a Lehman Generator
// based on LCG found here: https://gist.github.com/Protonk?page=4
var LinearCongruentialGenerator = (function(){
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
},{}],11:[function(require,module,exports){

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
},{}],12:[function(require,module,exports){

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
},{"./lib/lcgenerator":10}],13:[function(require,module,exports){
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
},{"./constants":3}],14:[function(require,module,exports){
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
},{"./constants":3}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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
},{"./constants":3,"./lib/bit-flag-factory":8}],17:[function(require,module,exports){
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
},{"./constants":3}],18:[function(require,module,exports){
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
},{"./lib/emitter":9,"./transcription-strategy":19}],19:[function(require,module,exports){

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

},{}],20:[function(require,module,exports){
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
},{"./constants":3,"./errors":6}],21:[function(require,module,exports){
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
},{}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvYXBwLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2NvbnNvbGUtcmVuZGVyZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2NvdW50ZG93bi5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9kYW5nZXItY2FsY3VsYXRvci5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9lcnJvcnMuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvZ2FtZWJvYXJkLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9iaXQtZmxhZy1mYWN0b3J5LmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL2xpYi9sY2dlbmVyYXRvci5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9saWIvbXVsdGltYXAuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvbWluZWxheWVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL3Njb3JlYm9hcmQuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvc2VyaWFsaXplci5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy9zcXVhcmUuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL3RyYW5zY3JpYmluZy1lbWl0dGVyLmpzIiwiL1VzZXJzL3RqL3dvcmtzcGFjZS9naXRodWIvbXlzd2VlcGVyL2pzL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3kuanMiLCIvVXNlcnMvdGovd29ya3NwYWNlL2dpdGh1Yi9teXN3ZWVwZXIvanMvdmFsaWRhdG9ycy5qcyIsIi9Vc2Vycy90ai93b3Jrc3BhY2UvZ2l0aHViL215c3dlZXBlci9qcy92ZW5kb3IvanF1ZXJ5LmhhbW1lci1mdWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcbiAgICBEaW1WYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5Cb2FyZERpbWVuc2lvbnMsXHJcbiAgICBNaW5lVmFsaWRhdG9yID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykuTWluZUNvdW50LFxyXG4gICAgVkVSU0lPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuVkVSU0lPTixcclxuICAgIE1BWF9HUklEX0RJTUVOU0lPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1BWF9HUklEX0RJTUVOU0lPTlMsXHJcblxyXG4gICAgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIH5+KE1hdGgucG93KGRpbSwgMikgKiAwLjUpOyB9LFxyXG4gICAgZGlzYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCwgdW5kbykge1xyXG4gICAgICAgIGlmICh1bmRvID09IG51bGwpIHVuZG8gPSBmYWxzZTtcclxuICAgICAgICAkZWxbdW5kbyA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnXSgnZGlzYWJsZWQnKTtcclxuICAgICAgICAkZWwuZmluZChcImlucHV0XCIpLnByb3AoJ3JlYWRvbmx5JywgIXVuZG8pO1xyXG4gICAgfSxcclxuICAgIGVuYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCkgeyByZXR1cm4gZGlzYWJsZU9wdGlvbigkZWwsIHRydWUpOyB9O1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cclxuICAgIHZhciAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIiksXHJcbiAgICAgICAgUFJFU0VUX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5wcmVzZXQgPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIixcclxuICAgICAgICBDVVNUT01fUEFORUxfU0VMRUNUT1IgPSBcInVsLmN1c3RvbSA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiO1xyXG5cclxuICAgIC8vIHNldHRpbmcgaW5pdGlhbCB2YWx1ZVxyXG4gICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpKSk7XHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoTUFYX0dSSURfRElNRU5TSU9OUyArIFwiIHggXCIgKyBNQVhfR1JJRF9ESU1FTlNJT05TKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyB9KS5jbGljaygpO1xyXG4gICAgJChcIiNjdXN0b20tbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgfSk7XHJcblxyXG4gICAgJC5lYWNoKCQoXCJsYWJlbFtmb3JePSdsZXZlbC0nXVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wb3AoKTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICB2YXIgZCA9ICQoXCIjZGltZW5zaW9uc1wiKS52YWwoKSB8fCArJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSxcclxuICAgICAgICAgICAgICAgIG0gPSAkKFwiI21pbmUtY291bnRcIikudmFsKCkgfHwgKyQoXCIjbWluZS1jb3VudFwiKS5hdHRyKFwicGxhY2Vob2xkZXJcIik7XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IERpbVZhbGlkYXRvci52YWxpZGF0ZShkKSA/ICtkIDogOTtcclxuICAgICAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gTWluZVZhbGlkYXRvci52YWxpZGF0ZShtLCBtaW5lYWJsZVNwYWNlcyhnYW1lT3B0aW9ucy5kaW1lbnNpb25zKSkgPyBtIDogMTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlOiAlb1wiLCBlKTtcclxuICAgICAgICAgICAgICAgICQoXCIjdmFsaWRhdGlvbi13YXJuaW5nc1wiKS5odG1sKGUubWVzc2FnZSkuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNldCB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy50aGVtZSA9ICQoXCIjY29sb3ItdGhlbWVcIikudmFsKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZXQgdXAgPGhlYWRlcj4gY29udGVudC4uLlxyXG4gICAgICAgICQoXCIjbWluZXMtZGlzcGxheVwiKS5maW5kKFwic3BhblwiKS5odG1sKGdhbWVPcHRpb25zLm1pbmVzKTtcclxuICAgICAgICAkKFwiLnZlcnNpb25cIikuaHRtbChWRVJTSU9OKTtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIjYm9hcmQtY2FyZFwiKS5vbihcImNsaWNrXCIsIFwiYS5yZXBsYXlcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gdGVtcG9yYXJ5LCBicnV0ZS1mb3JjZSBmaXguLi5cclxuICAgICAgICAvLyBUT0RPOiByZXNldCBmb3JtIGFuZCB0b2dnbGUgdmlzaWJpbGl0eSBvbiB0aGUgc2VjdGlvbnMuLi5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIlxyXG52YXIgQ29uc29sZVJlbmRlcmVyID0ge1xyXG5cclxuICAgIENPTF9TUEFDSU5HOiAnICAgJyxcclxuICAgIE1JTkVEX1NRVUFSRTogJyonLFxyXG4gICAgQkxBTktfU1FVQVJFOiAnLicsXHJcbiAgICBSRU5ERVJFRF9NQVA6ICclbycsXHJcbiAgICBERUZBVUxUX1RSQU5TRk9STUVSOiBmdW5jdGlvbihyb3cpeyByZXR1cm4gcm93OyB9LFxyXG5cclxuICAgIF9tYWtlVGl0bGU6IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gc3RyLnNwbGl0KCcnKS5qb2luKCcgJykudG9VcHBlckNhc2UoKTsgfSxcclxuICAgIF9kaXNwbGF5Um93TnVtOiBmdW5jdGlvbihudW0pIHsgcmV0dXJuIFwiICAgICAgIFtcIiArIG51bSArIFwiXVxcblwiIH0sXHJcbiAgICBfdG9TeW1ib2xzOiBmdW5jdGlvbih2YWx1ZXMsIGZuKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIgKz0gZm4ocm93KS5qb2luKF90aGlzLkNPTF9TUEFDSU5HKS50b0xvd2VyQ2FzZSgpICsgX3RoaXMuX2Rpc3BsYXlSb3dOdW0oaWR4KVxyXG4gICAgICAgIH0sICdcXG4nKTtcclxuICAgIH0sXHJcbiAgICBfdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykgJiYgdmFsdWVzLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbiAgICB9LFxyXG4gICAgX2dldFJlbmRlcmVkTWFwOiBmdW5jdGlvbih0cmFuc2Zvcm1lcikge1xyXG4gICAgICAgIHZhciB2YWxzID0gdGhpcy5fdmFsaWRhdGUodGhpcy52YWx1ZXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b1N5bWJvbHModmFscywgdHJhbnNmb3JtZXIpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMuX3ZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHZpZXdHYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5NSU5FRF9TUVVBUkUgOiBzcS5nZXREYW5nZXIoKSA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5CTEFOS19TUVVBUkUgOiBzcS5nZXREYW5nZXIoKTsgfSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJnYW1lYm9hcmRcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0cmFuc2Zvcm1lcikpO1xyXG4gICAgfSxcclxuICAgIHZpZXdNaW5lczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kbG9nKFsgdGhpcy5fbWFrZVRpdGxlKFwibWluZSBwbGFjZW1lbnRzXCIpLCB0aGlzLlJFTkRFUkVEX01BUCBdXHJcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKSxcclxuICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZWRNYXAodGhpcy5ERUZBVUxUX1RSQU5TRk9STUVSKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnNvbGVSZW5kZXJlcjsiLCJcclxudmFyIENvbnN0YW50cyA9IHtcclxuXHJcbiAgICBWRVJTSU9OOiAnYmV0YTQnLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcblxyXG4gICAgRGVmYXVsdENvbmZpZzoge1xyXG4gICAgICAgIGRpbWVuc2lvbnM6IDksXHJcbiAgICAgICAgbWluZXM6IDEsXHJcbiAgICAgICAgYm9hcmQ6ICcjYm9hcmQnLFxyXG4gICAgICAgIHRpbWVyOiA1MDAsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAzMDAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogNDIwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDU0MCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS8sXHJcblxyXG4gICAgU2NvcmVib2FyZDogeyBESUdJVFM6IDMsIEZYX0RVUkFUSU9OOiA4MDAsIE9VVF9PRl9SQU5HRTogXCJNQVhcIiB9LFxyXG5cclxuICAgIFNjb3JpbmdSdWxlczogeyBcclxuICAgICAgICBEQU5HRVJfSURYX01VTFRJUExJRVI6IDEsIFxyXG4gICAgICAgIEJMQU5LX1NRVUFSRV9QVFM6IDAsIFxyXG4gICAgICAgIEZMQUdfTUlORUQ6IDI1LCBcclxuICAgICAgICBNSVNGTEFHX1VOTUlORUQ6IDEwLCBcclxuICAgICAgICBVTkZMQUdfTUlORUQ6IDI1LCBcclxuICAgICAgICBNSVNVTkZMQUdfTUlORUQ6IDEwLCBcclxuICAgICAgICBVU0VSTU9WRVNfTVVMVElQTElFUjogMTAsXHJcbiAgICAgICAgTUlTRkxBR0dFRF9NVUxUSVBMSUVSOiAxMCxcclxuICAgICAgICBGTEFHR0VEX01JTkVTX01VTFRJUExJRVI6IDEwXHJcbiAgICB9XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oc2Vjb25kcywgZWwpIHtcclxuICAgIHRoaXMuc2Vjb25kcyA9IHNlY29uZHM7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG5cclxuICAgIHRoaXMubTEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMScpO1xyXG4gICAgdGhpcy5tMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20yJyk7XHJcbiAgICB0aGlzLnMxID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczEnKTtcclxuICAgIHRoaXMuczIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMicpO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcbkNvdW50ZG93bi5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogQ291bnRkb3duLFxyXG4gICAgX3JlbmRlckluaXRpYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fc2V0RGlzcGxheShhcnJbMF0gfHwgMCwgYXJyWzFdIHx8IDApO1xyXG4gICAgfSxcclxuICAgIF90b01pbnNTZWNzOiBmdW5jdGlvbihzZWNzKSB7XHJcbiAgICAgICAgdmFyIG1pbnMgPSB+fihzZWNzIC8gNjApLFxyXG4gICAgICAgICAgICBzZWNzID0gc2VjcyAlIDYwO1xyXG4gICAgICAgIHJldHVybiBbbWlucywgc2Vjc107XHJcbiAgICB9LFxyXG4gICAgX3NldERpc3BsYXk6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKSBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5tMS5pbm5lckhUTUwgPSB0aW1lc1swXVswXTtcclxuICAgICAgICB0aGlzLm0yLmlubmVySFRNTCA9IHRpbWVzWzBdWzFdO1xyXG4gICAgICAgIHRoaXMuczEuaW5uZXJIVE1MID0gdGltZXNbMV1bMF07XHJcbiAgICAgICAgdGhpcy5zMi5pbm5lckhUTUwgPSB0aW1lc1sxXVsxXTtcclxuICAgIH0sXHJcbiAgICBfY291bnRkb3duOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5mcmVlemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Vjb25kcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gX3RoaXMuX3RvTWluc1NlY3MoX3RoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KGFyclswXSwgYXJyWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2Vjb25kcy0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0RGlzcGxheSgwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICB9LFxyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IGZhbHNlOyB0aGlzLl9jb3VudGRvd24oKTsgfSxcclxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IHRydWU7IH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7IHRoaXMuc2Vjb25kcyA9IDA7IHRoaXMuX3NldERpc3BsYXkoMCwgMCk7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ291bnRkb3duOyIsIlxyXG5mdW5jdGlvbiBEYW5nZXJDYWxjdWxhdG9yKGdhbWVib2FyZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBib2FyZDogZ2FtZWJvYXJkLFxyXG4gICAgICAgIG5laWdoYm9yaG9vZDoge1xyXG4gICAgICAgICAgICAvLyBkaXN0YW5jZSBpbiBzdGVwcyBmcm9tIHRoaXMgc3F1YXJlOlxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgdmVydC4gaG9yei5cclxuICAgICAgICAgICAgTk9SVEg6ICAgICAgWyAgMSwgIDAgXSxcclxuICAgICAgICAgICAgTk9SVEhFQVNUOiAgWyAgMSwgIDEgXSxcclxuICAgICAgICAgICAgRUFTVDogICAgICAgWyAgMCwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEhFQVNUOiAgWyAtMSwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEg6ICAgICAgWyAtMSwgIDAgXSxcclxuICAgICAgICAgICAgU09VVEhXRVNUOiAgWyAtMSwgLTEgXSxcclxuICAgICAgICAgICAgV0VTVDogICAgICAgWyAgMCwgLTEgXSxcclxuICAgICAgICAgICAgTk9SVEhXRVNUOiAgWyAgMSwgLTEgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZm9yU3F1YXJlOiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICAgICAgaWYgKCtyb3cgPj0gMCAmJiArY2VsbCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTWluZXMgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLm5laWdoYm9yaG9vZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuYm9hcmQuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLmlzTWluZWQoKSkgdG90YWxNaW5lcysrO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWxNaW5lcyB8fCAnJztcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhbmdlckNhbGN1bGF0b3I7IiwiXG4vLyBFUlJPUlMgQU5EIEVYQ0VQVElPTlNcblxuZnVuY3Rpb24gTXlzd2VlcGVyRXJyb3IoKSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgUkdYX1JFUExBQ0VNRU5UX1RPS0VOUyA9IC9cXHsoXFxkKylcXH0vZyxcbiAgICAgIGV4dGVuZE1lc3NhZ2UgPSBmdW5jdGlvbihzdHIsIGFyZ3MpIHtcbiAgICAgICAgICByZXR1cm4gKHN0ciB8fCAnJykucmVwbGFjZShSR1hfUkVQTEFDRU1FTlRfVE9LRU5TLCBmdW5jdGlvbihfLCBpbmRleCkgeyByZXR1cm4gYXJnc1sraW5kZXhdIHx8ICcnOyB9KTtcbiAgICAgIH07XG4gIHRoaXMubWVzc2FnZSA9IGV4dGVuZE1lc3NhZ2UoYXJnc1swXSwgYXJncy5zbGljZSgxKSk7XG4gIEVycm9yLmNhbGwodGhpcywgdGhpcy5tZXNzYWdlKTtcbiAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgYXJndW1lbnRzLmNhbGxlZSk7XG4gIHRoaXMuc3RhY2sgPSBFcnJvcigpLnN0YWNrO1xufVxuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNeXN3ZWVwZXJFcnJvcjtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5nZXRUcmFjZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGFjay5yZXBsYWNlKC/ihrVcXHMrL2csICdcXG4gICcpOyB9O1xuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnTXlzd2VlcGVyRXJyb3InO1xuXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcigpIHtcbiAgTXlzd2VlcGVyRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUgPSBuZXcgTXlzd2VlcGVyRXJyb3IoKTtcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9yJztcblxubW9kdWxlLmV4cG9ydHMuTXlzd2VlcGVyRXJyb3IgPSBNeXN3ZWVwZXJFcnJvcjtcbm1vZHVsZS5leHBvcnRzLlZhbGlkYXRpb25FcnJvciA9IFZhbGlkYXRpb25FcnJvcjtcblxuXG4vKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgKi9cbiIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICByZ3hfbW9iaWxlX2RldmljZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vYmlsZURldmljZVJlZ2V4LFxyXG4gICAgQ291bnRkb3duID0gcmVxdWlyZSgnLi9jb3VudGRvd24nKSxcclxuICAgIFRyYW5zY3JpYmluZ0VtaXR0ZXIgPSByZXF1aXJlKCcuL3RyYW5zY3JpYmluZy1lbWl0dGVyJyksXHJcbiAgICBUcmFuc2NyaXB0aW9uU3RyYXRlZ3kgPSByZXF1aXJlKCcuL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3knKSxcclxuICAgIFRoZW1lU3R5bGVyID0gcmVxdWlyZSgnLi90aGVtZS1zdHlsZXInKSxcclxuICAgIENvbnNvbGVSZW5kZXJlciA9IHJlcXVpcmUoJy4vY29uc29sZS1yZW5kZXJlcicpLFxyXG4gICAgTWluZUxheWVyID0gcmVxdWlyZSgnLi9taW5lbGF5ZXInKSxcclxuICAgIFNjb3Jla2VlcGVyID0gcmVxdWlyZSgnLi9zY29yZWtlZXBlcicpLFxyXG4gICAgU2NvcmVib2FyZCA9IHJlcXVpcmUoJy4vc2NvcmVib2FyZCcpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG4gICAgLy8gaXMgY3VzdG9tIG9yIHByZXNldCBnYW1lP1xyXG4gICAgdGhpcy5pc0N1c3RvbSA9IG9wdGlvbnMuaXNDdXN0b20gfHwgZmFsc2U7XHJcbiAgICAvLyB0aGUgZXZlbnQgdHJhbnNjcmliZXIgZm9yIHBsYXliYWNrIGFuZCBwZXJzaXN0ZW5jZVxyXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIoVHJhbnNjcmlwdGlvblN0cmF0ZWd5KTtcclxuICAgIC8vIHNlbGVjdGl2ZWx5IGVuYWJsZSBkZWJ1ZyBtb2RlIGZvciBjb25zb2xlIHZpc3VhbGl6YXRpb25zIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICB0aGlzLmRlYnVnX21vZGUgPSBvcHRpb25zLmRlYnVnX21vZGUgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGVidWdfbW9kZTtcclxuICAgICRsb2cuZGVidWdfbW9kZSA9IHRoaXMuZGVidWdfbW9kZTtcclxuICAgIC8vIHNwZWNpZmllcyB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZSBvciBza2luXHJcbiAgICB0aGlzLnRoZW1lID0gdGhpcy5fc2V0Q29sb3JUaGVtZShvcHRpb25zLnRoZW1lIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRoZW1lKTtcclxuICAgIC8vIGNvbnRhaW5lciBmb3IgZmxhc2ggbWVzc2FnZXMsIHN1Y2ggYXMgd2luL2xvc3Mgb2YgZ2FtZVxyXG4gICAgdGhpcy5mbGFzaENvbnRhaW5lciA9ICQoTWVzc2FnZU92ZXJsYXkpO1xyXG4gICAgLy8gY2hlY2sgZm9yIGRlc2t0b3Agb3IgbW9iaWxlIHBsYXRmb3JtIChmb3IgZXZlbnQgaGFuZGxlcnMpXHJcbiAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBhZGQgaW4gdGhlIGNvdW50ZG93biBjbG9jay4uLlxyXG4gICAgdGhpcy5jbG9jayA9IG5ldyBDb3VudGRvd24oK29wdGlvbnMudGltZXIgfHwgREVGQVVMVF9HQU1FX09QVElPTlMudGltZXIsICcjY291bnRkb3duJyk7XHJcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIHNjb3Jla2VlcGluZyBvYmplY3RcclxuICAgIHRoaXMuc2NvcmVrZWVwZXIgPSBuZXcgU2NvcmVrZWVwZXIodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGFjdHVhbCBzY29yZWJvYXJkIHZpZXdcclxuICAgIHRoaXMuc2NvcmVib2FyZCA9IG5ldyBTY29yZWJvYXJkKDAsIFwiI3Njb3JlLWRpc3BsYXlcIik7XHJcblxyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIHRyaWdnZXIgZXZlbnQgZm9yIGdhbWUgdG8gYmVnaW4uLi5cclxuICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjpzdGFydCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxufVxyXG5cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogR2FtZWJvYXJkLFxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgLy8gZGlzcGxheSBvdXRwdXQgYW5kIGdhbWUgc3RyYXRlZ3kgdG8gdGhlIGNvbnNvbGUuLi5cclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy50aGVtZSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgdmFyIGxvY3MgPSBuZXcgTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSwgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGxvY3MuZm9yRWFjaChmdW5jdGlvbihsb2MpIHsgX3RoaXMuZ2V0U3F1YXJlQXQobG9jWzBdLCBsb2NbMV0pLm1pbmUoKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuc2V0RGFuZ2VyKF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJz5cIlxyXG4gICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfc2V0Q29sb3JUaGVtZTogZnVuY3Rpb24odGhlbWUpIHtcclxuICAgICAgICBUaGVtZVN0eWxlci5zZXQodGhlbWUsIHRoaXMuJGVsKTtcclxuICAgICAgICByZXR1cm4gdGhlbWU7XHJcbiAgICB9LFxyXG4gICAgX2NoZWNrRm9yTW9iaWxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHJneF9tb2JpbGVfZGV2aWNlcy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7IH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciB0b3VjaCBldmVudHM6IHRhcCA9PSBjbGljaywgaG9sZCA9PSByaWdodCBjbGlja1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vbih7XHJcbiAgICAgICAgICAgICAgICB0YXA6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBob2xkOiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGNvbnRleHRtZW51OiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSBhZnRlciBkZXZlbG9wbWVudCBlbmRzLi4uZm9yIGRlYnVnIHVzZSBvbmx5IVxyXG4gICAgICAgIC8vIElORElWSURVQUwgU1FVQVJFIEVWRU5UU1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6Y2xvc2UnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkNsb3Npbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIlVuZmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICAvLyBHQU1FQk9BUkQtV0lERSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmVnaW4hXCIsIGFyZ3VtZW50cyk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOndpbicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3Ugd2luIVwiKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6b3ZlcicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgZGVhZCFcIik7IH0pO1xyXG5cclxuICAgICAgICAvLyAtLS0gVEhFU0UgRVZFTlRTIEFSRSBGT1IgUkVBTCwgVE8gU1RBWSFcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIHdpcmVzIHVwIHRoZSBzY29yZWJvYXJkIHZpZXcgb2JqZWN0IHRvIHRoZSBldmVudHMgcmVjZWl2ZWQgZnJvbSB0aGUgc2NvcmVrZWVwZXJcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3Njb3JlOmNoYW5nZSBzY29yZTpjaGFuZ2U6ZmluYWwnLCBmdW5jdGlvbigpIHsgX3RoaXMuc2NvcmVib2FyZC51cGRhdGUoX3RoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgaWYgKCFzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCdraWxsZXItbWluZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gc3RvcCB0aGUgY29udGV4dG1lbnUgZnJvbSBwb3BwaW5nIHVwIG9uIGRlc2t0b3AgYnJvd3NlcnNcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgdGhpcy5fZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xvc2VTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgLy8gaGFuZGxlcyBhdXRvY2xlYXJpbmcgb2Ygc3BhY2VzIGFyb3VuZCB0aGUgb25lIGNsaWNrZWRcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpLFxyXG4gICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLl9vcGVuU3F1YXJlKG5laWdoYm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLmdldERhbmdlcigpIHx8ICFuZWlnaGJvci5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfb3BlblNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUub3BlbigpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOm9wZW5cIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9jbG9zZVNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpjbG9zZVwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF91bmZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLnVuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOnVuZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2dldE9wZW5lZFNxdWFyZXNDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzT3BlbigpOyB9KS5sZW5ndGg7IH0sXHJcbiAgICBfZXZhbHVhdGVGb3JHYW1lV2luOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbm90TWluZWQgPSB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pLmxlbmd0aDtcclxuICAgICAgICBpZiAobm90TWluZWQgPT09IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9mbGFzaE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGlzQWxlcnQgPyAnZ2FtZS1vdmVyJyA6ICdnYW1lLXdpbicpXHJcbiAgICAgICAgICAgICAgICAuaHRtbChtc2cpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgfSxcclxuICAgIF9wcmVwYXJlRmluYWxSZXZlYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3VuZmxhZ1NxdWFyZShmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci5jbG9zZSgpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXdpbicpO1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG5cclxuICAgICAgICAkbG9nKFwiLS0tICBHQU1FIFdJTiEgIC0tLVwiKTtcclxuICAgICAgICAkbG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOndpbicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOm92ZXInLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiBHbHlwaHMuRkxBRztcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc01pbmVkKCkpIHJldHVybiBHbHlwaHMuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXNxLmdldERhbmdlcigpID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdjZWxsJyArIHNxdWFyZS5nZXRDZWxsKCkpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYXR0YWNoIHRoZSBTcXVhcmUgdG8gdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBncmlkIGNlbGxcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUsIHRoaXMpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgYSBTcXVhcmUgaW5zdGFuY2UgYXMgYSBwYXJhbSwgcmV0dXJucyBhIGpRdWVyeS13cmFwcGVkIERPTSBub2RlIG9mIGl0cyBjZWxsXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIHJvdyBhbmQgY2VsbCBjb29yZGluYXRlcyBhcyBwYXJhbXMsIHJldHVybnMgdGhlIGFzc29jaWF0ZWQgU3F1YXJlIGluc3RhbmNlXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBuZWVkIGdhbWVPcHRpb25zLCBtZXRhZGF0YSBvbiBkYXRldGltZS9ldGMuLCBzZXJpYWxpemUgYWxsIHNxdWFyZXMnIHN0YXRlc1xyXG4gICAgICAgIHJldHVybiBTZXJpYWxpemVyLmV4cG9ydCh0aGlzKTtcclxuICAgIH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gQ29uc29sZVJlbmRlcmVyLnRvKCRsb2cpLndpdGhWYWx1ZXModGhpcy5ib2FyZC52YWx1ZXMoKSk7XHJcbiAgICAgICAgcmV0dXJuICh3aXRoRGFuZ2VyKSA/IHJlbmRlcmVyLnZpZXdHYW1lKCkgOiByZW5kZXJlci52aWV3TWluZXMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlxyXG4vLyBAdXNhZ2UgdmFyIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsnRl9PUEVOJywgJ0ZfTUlORUQnLCAnRl9GTEFHR0VEJywgJ0ZfSU5ERVhFRCddKTsgYmYgPSBuZXcgQml0RmxhZ3M7XHJcbmZ1bmN0aW9uIEJpdEZsYWdGYWN0b3J5KGFyZ3MpIHtcclxuXHJcbiAgICB2YXIgYmluVG9EZWMgPSBmdW5jdGlvbihzdHIpIHsgcmV0dXJuIHBhcnNlSW50KHN0ciwgMik7IH0sXHJcbiAgICAgICAgZGVjVG9CaW4gPSBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfSxcclxuICAgICAgICBidWlsZFN0YXRlID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBwYWQoYXJyLm1hcChmdW5jdGlvbihwYXJhbSkgeyByZXR1cm4gU3RyaW5nKCtwYXJhbSk7IH0pLnJldmVyc2UoKS5qb2luKCcnKSk7IH0sXHJcbiAgICAgICAgcGFkID0gZnVuY3Rpb24gKHN0ciwgbWF4KSB7XHJcbiAgICAgICAgICBtYXggfHwgKG1heCA9IDQgLyogdGhpcy5ERUZBVUxUX1NJWkUubGVuZ3RoICovKTtcclxuICAgICAgICAgIHZhciBkaWZmID0gbWF4IC0gc3RyLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXTsgZGlmZiA+IDA7IGFjY1stLWRpZmZdID0gJzAnKSB7fVxyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuICAgICAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyBfZmxhZ3M6IHRoaXMuX2ZsYWdzIH07IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlxyXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbn1cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEVtaXR0ZXIsXHJcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgZXZlbnQuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tlXSA9IHRoaXMuX2V2ZW50c1tlXSB8fCBbXTtcclxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2VdLnB1c2goZm4pO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgZXZlbnQuc3BsaXQoL1xccysvZykuZm9yRWFjaChmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmVudHNbZV0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2VdLnNwbGljZSh0aGlzLl9ldmVudHNbZV0uaW5kZXhPZihmbiksIDEpO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50IC8qLCBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgICAgIGlmICh0aGlzLl9ldmVudHNbZXZlbnRdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dGhpcy5fZXZlbnRzW2V2ZW50XS5sZW5ndGg7IGkgPCBsZW47ICsraSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjsiLCIvLyBMaW5lYXIgQ29uZ3J1ZW50aWFsIEdlbmVyYXRvcjogdmFyaWFudCBvZiBhIExlaG1hbiBHZW5lcmF0b3JcclxuLy8gYmFzZWQgb24gTENHIGZvdW5kIGhlcmU6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1Byb3Rvbms/cGFnZT00XHJcbnZhciBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IgPSAoZnVuY3Rpb24oKXtcclxuICAvLyBTZXQgdG8gdmFsdWVzIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OdW1lcmljYWxfUmVjaXBlc1xyXG4gIC8vIG0gaXMgYmFzaWNhbGx5IGNob3NlbiB0byBiZSBsYXJnZSAoYXMgaXQgaXMgdGhlIG1heCBwZXJpb2QpXHJcbiAgLy8gYW5kIGZvciBpdHMgcmVsYXRpb25zaGlwcyB0byBhIGFuZCBjXHJcbiAgZnVuY3Rpb24gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yKCkge1xyXG4gICAgICB0aGlzLm0gPSA0Mjk0OTY3Mjk2O1xyXG4gICAgICAvLyBhIC0gMSBzaG91bGQgYmUgZGl2aXNpYmxlIGJ5IG0ncyBwcmltZSBmYWN0b3JzXHJcbiAgICAgIHRoaXMuYSA9IDE2NjQ1MjU7XHJcbiAgICAgIC8vIGMgYW5kIG0gc2hvdWxkIGJlIGNvLXByaW1lXHJcbiAgICAgIHRoaXMuYyA9IDEwMTM5MDQyMjM7XHJcbiAgICAgIHRoaXMuc2VlZCA9IHZvaWQgMDtcclxuICAgICAgdGhpcy56ID0gdm9pZCAwO1xyXG4gICAgICAvLyBpbml0aWFsIHByaW1pbmcgb2YgdGhlIGdlbmVyYXRvciwgdW50aWwgbGF0ZXIgb3ZlcnJpZGVuXHJcbiAgICAgIHRoaXMuc2V0U2VlZCgpO1xyXG4gIH1cclxuICBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcixcclxuICAgIHNldFNlZWQ6IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnogPSB0aGlzLnNlZWQgPSB2YWwgfHwgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogdGhpcy5tKTsgfSxcclxuICAgIGdldFNlZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zZWVkOyB9LFxyXG4gICAgcmFuZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIGRlZmluZSB0aGUgcmVjdXJyZW5jZSByZWxhdGlvbnNoaXBcclxuICAgICAgdGhpcy56ID0gKHRoaXMuYSAqIHRoaXMueiArIHRoaXMuYykgJSB0aGlzLm07XHJcbiAgICAgIC8vIHJldHVybiBhIGZsb2F0IGluIFswLCAxKVxyXG4gICAgICAvLyBpZiB6ID0gbSB0aGVuIHogLyBtID0gMCB0aGVyZWZvcmUgKHogJSBtKSAvIG0gPCAxIGFsd2F5c1xyXG4gICAgICByZXR1cm4gdGhpcy56IC8gdGhpcy5tO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgcmV0dXJuIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yOyIsIlxyXG5mdW5jdGlvbiBNdWx0aW1hcCgpIHtcclxuICAgIHRoaXMuX3RhYmxlID0gW107XHJcbn1cclxuXHJcbk11bHRpbWFwLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBNdWx0aW1hcCxcclxuICAgIGdldDogZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbihyb3csIHZhbCkgeyAodGhpcy5fdGFibGVbcm93XSB8fCAodGhpcy5fdGFibGVbcm93XSA9IFtdKSkucHVzaCh2YWwpOyB9LFxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gX3RoaXMuX3RhYmxlW3Jvd107IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKSB7IHJldHVybiBhY2MuY29uY2F0KGl0ZW0pOyB9LCBbXSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkgeyB0aGlzLl90YWJsZSA9IHt9OyB9LFxyXG4gICAgc2l6ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE11bHRpbWFwOyIsIlxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gcmVxdWlyZSgnLi9saWIvbGNnZW5lcmF0b3InKTtcclxuXHJcbmZ1bmN0aW9uIE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucykge1xyXG4gICAgdGhpcy5nZW5lcmF0b3IgPSBuZXcgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yO1xyXG4gICAgdGhpcy5taW5lcyA9ICttaW5lcyB8fCAwO1xyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK2RpbWVuc2lvbnMgfHwgMDtcclxuXHJcbiAgICB2YXIgcmFuZHMgPSBbXSxcclxuICAgICAgICBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgZ2V0UmFuZG9tTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBfdGhpcy5nZW5lcmF0b3IucmFuZCgpICogKE1hdGgucG93KF90aGlzLmRpbWVuc2lvbnMsIDIpKSB8IDA7IH07XHJcblxyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgIHZhciBybmQgPSBnZXRSYW5kb21OdW1iZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKCF+cmFuZHMuaW5kZXhPZihybmQpKVxyXG4gICAgICAgICAgICByYW5kcy5wdXNoKHJuZCk7XHJcbiAgICAgICAgLy8gLi4ub3RoZXJ3aXNlLCBnaXZlIGl0IGFub3RoZXIgZ28tJ3JvdW5kOlxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5lcysrO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2NhdGlvbnMgPSByYW5kcy5tYXAoZnVuY3Rpb24ocm5kKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucztcclxuICAgICAgICByZXR1cm4gWyByb3csIGNlbGwgXTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmxvY2F0aW9ucztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lTGF5ZXI7IiwidmFyIEZYX0RVUkFUSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLkZYX0RVUkFUSU9OLFxyXG4gICAgRElHSVRTX01BWCA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5ESUdJVFMsXHJcbiAgICBPVVRfT0ZfUkFOR0UgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuT1VUX09GX1JBTkdFO1xyXG5cclxuZnVuY3Rpb24gU2NvcmVib2FyZChzY29yZSwgZWwpIHtcclxuICAgIHRoaXMuc2NvcmUgPSBzY29yZSB8fCAwO1xyXG4gICAgdGhpcy5pbml0aWFsID0gc2NvcmU7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcjc2MxJyk7XHJcbiAgICB0aGlzLiRNID0gdGhpcy4kZWwuZmluZCgnI3NjMicpO1xyXG4gICAgdGhpcy4kUiA9IHRoaXMuJGVsLmZpbmQoJyNzYzMnKTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmluaXRpYWwpO1xyXG59XHJcblxyXG5TY29yZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTY29yZWJvYXJkLFxyXG4gICAgX2luY3JlbWVudDogZnVuY3Rpb24oY2hpcHMpIHtcclxuXHJcbiAgICAgICAgY2hpcHMuZm9yRWFjaChmdW5jdGlvbihjaGlwKSB7XHJcbiAgICAgICAgICAgIHZhciAkY2hpcCA9IGNoaXBbMF0sIHB0cyA9IGNoaXBbMV07XHJcblxyXG4gICAgICAgICAgICBpZiAoJGNoaXAuaHRtbCgpICE9PSBwdHMpXHJcbiAgICAgICAgICAgICAgICAkY2hpcFxyXG4gICAgICAgICAgICAgICAgICAgIC53cmFwSW5uZXIoXCI8c3Bhbi8+XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmQoXCJzcGFuXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgLmRlbGF5KEZYX0RVUkFUSU9OKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zbGlkZVVwKEZYX0RVUkFUSU9OLCBmdW5jdGlvbigpIHsgJCh0aGlzKS5wYXJlbnQoKS5odG1sKHB0cykgfSk7XHJcbiAgICAgICAgfSwgdGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwb2ludHMpIHtcclxuICAgICAgICBpZiAoIXBvaW50cykgcmV0dXJuO1xyXG4gICAgICAgIHZhciBwdHMgPSB0b1N0cmluZ0FycmF5KHBvaW50cyk7XHJcbiAgICAgICAgdGhpcy5faW5jcmVtZW50KFtbdGhpcy4kUiwgcHRzWzJdXSwgW3RoaXMuJE0sIHB0c1sxXV0sIFt0aGlzLiRMLCBwdHNbMF1dXSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3JlYm9hcmQ7XHJcblxyXG5mdW5jdGlvbiB0b1N0cmluZ0FycmF5KG4pIHtcclxuICAgIHZhciBudW0gPSBTdHJpbmcobiksXHJcbiAgICAgICAgbGVuID0gbnVtLmxlbmd0aDtcclxuXHJcbiAgICAvLyB0b28gYmlnIGZvciAqdGhpcyogc2NvcmVib2FyZC4uLlxyXG4gICAgaWYgKGxlbiA+IERJR0lUU19NQVgpIHtcclxuICAgICAgICBudW0gPSBPVVRfT0ZfUkFOR0U7XHJcbiAgICAgICAgbGVuID0gT1VUX09GX1JBTkdFLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gWyBudW1bbGVuIC0gM10gfHwgXCIwXCIsIG51bVtsZW4gLSAyXSB8fCBcIjBcIiwgbnVtW2xlbiAtIDFdIHx8IFwiMFwiIF07XHJcbn0iLCJ2YXIgUG9pbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yaW5nUnVsZXM7XHJcblxyXG5mdW5jdGlvbiBTY29yZWtlZXBlcihnYW1lYm9hcmQpIHtcclxuICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICB0aGlzLmNhbGxiYWNrcyA9IHtcclxuICAgIHVwOiBmdW5jdGlvbiB1cChwdHMpIHsgXHJcbiAgICAgIHRoaXMuc2NvcmUgKz0gcG9zKHB0cyk7IFxyXG4gICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNjb3JlOmNoYW5nZVwiLCB0aGlzLnNjb3JlKTsgfS5iaW5kKHRoaXMpLFxyXG4gICAgZG93bjogZnVuY3Rpb24gZG93bihwdHMpIHsgXHJcbiAgICAgIHRoaXMuc2NvcmUgPSAodGhpcy5zY29yZSAtIG5lZyhwdHMpIDw9IDApID8gMCA6IHRoaXMuc2NvcmUgLSBuZWcocHRzKTsgXHJcbiAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpOyB9LmJpbmQodGhpcylcclxuICB9O1xyXG5cclxuICB0aGlzLmZpbmFsaXplcnMgPSB7XHJcbiAgICBmb3JPcGVuaW5nU3F1YXJlczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIG1vdmVzID0gZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgdW5taW5lZCA9IE1hdGgucG93KGdhbWVib2FyZC5kaW1lbnNpb25zLCAyKSAtIGdhbWVib2FyZC5taW5lcztcclxuICAgICAgICByZXR1cm4gMSAtICh+fihtb3ZlcyAvIHVubWluZWQpICogMTApO1xyXG4gICAgfSxcclxuICAgIGZvclRpbWVQYXNzZWQ6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciB0b3RhbCA9IGdhbWVib2FyZC5jbG9jay5pbml0aWFsLCBlbGFwc2VkID0gZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHM7XHJcbiAgICAgICAgcmV0dXJuIDEwMCAtIH5+KGVsYXBzZWQgLyB0b3RhbCAqIDEwMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yRmV3ZXN0TW92ZXM6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIC8vIGV4cGVyaW1lbnRhbDogc3FydCh4XjIgLSB4KSAqIDEwXHJcbiAgICAgICAgdmFyIGRpbXMgPSBNYXRoLnBvdyhnYW1lYm9hcmQuZGltZW5zaW9ucywgMik7XHJcbiAgICAgICAgcmV0dXJuIH5+KE1hdGguc3FydChkaW1zIC0gZ2FtZWJvYXJkLnVzZXJNb3ZlcykgKiBQb2ludHMuVVNFUk1PVkVTX01VTFRJUExJRVIpO1xyXG4gICAgfSxcclxuICAgIGZvckZpbmFsTWlzZmxhZ2dpbmdzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBtaXNmbGFnZ2VkID0gZmxhZ2dlZC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pO1xyXG4gICAgICAgIHJldHVybiAobWlzZmxhZ2dlZC5sZW5ndGggKiBQb2ludHMuTUlTRkxBR0dFRF9NVUxUSVBMSUVSKSB8fCAwO1xyXG4gICAgfSxcclxuICAgIGZvckNvcnJlY3RGbGFnZ2luZzogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIG1pbmVzID0gZ2FtZWJvYXJkLm1pbmVzLFxyXG4gICAgICAgICAgICBzcXVhcmVzID0gZ2FtZWJvYXJkLmdldFNxdWFyZXMoKSxcclxuICAgICAgICAgICAgZmxhZ2dlZCA9IHNxdWFyZXMuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSksXHJcbiAgICAgICAgICAgIGZsYWdnZWRNaW5lcyA9IHNxdWFyZXMuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc01pbmVkKCk7IH0pLFxyXG4gICAgICAgICAgICBwY3QgPSB+fihmbGFnZ2VkTWluZXMubGVuZ3RoIC8gbWluZXMpO1xyXG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwoKG1pbmVzICogUG9pbnRzLkZMQUdHRURfTUlORVNfTVVMVElQTElFUikgKiBwY3QpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHRoaXMucXVldWUgPSBbXTtcclxuICB0aGlzLmZpbmFsID0gW107XHJcblxyXG4gIC8vIFRPRE86IHdlYW4gdGhpcyBjbGFzcyBvZmYgZGVwZW5kZW5jeSBvbiBnYW1lYm9hcmRcclxuICAvLyBzaG91bGQgb25seSBuZWVkIHRvIGhhdmUgY3RvciBpbmplY3RlZCB3aXRoIHRoZSBnYW1lYm9hcmQncyBlbWl0dGVyXHJcbiAgdGhpcy5nYW1lYm9hcmQgPSBnYW1lYm9hcmQ7XHJcbiAgdGhpcy5lbWl0dGVyID0gZ2FtZWJvYXJkLmVtaXR0ZXI7XHJcbiAgdGhpcy5zY29yZSA9IDA7XHJcblxyXG4gIHRoaXMubnN1ID0gdGhpcy5fZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0KCk7XHJcbiAgdGhpcy5lbmRHYW1lID0gZmFsc2U7IC8vIGlmIGdhbWUgaXMgbm93IG92ZXIsIGZsdXNoIHF1ZXVlc1xyXG4gIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCh0aGlzLl90aWNrLmJpbmQoX3RoaXMpLCB0aGlzLm5zdSk7XHJcblxyXG4gIGNvbnNvbGUubG9nKFwiU2NvcmVrZWVwZXIgaW5pdGlhbGl6ZWQuICA6c2NvcmUgPT4gJW8sIDp0aW1lciA9PiAlb1wiLCB0aGlzLnNjb3JlLCB0aGlzLnRpbWVyKTtcclxuICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBvcyhwdHMpIHsgcmV0dXJuIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuZnVuY3Rpb24gbmVnKHB0cykgeyByZXR1cm4gLTEgKiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcblxyXG5TY29yZWtlZXBlci5wcm90b3R5cGUgPSB7XHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBFVkVOVFMgPSB7XHJcbiAgICAgICAgJ3NxOm9wZW4nOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXAoc3F1YXJlLmdldERhbmdlcigpICogUG9pbnRzLkRBTkdFUl9JRFhfTVVMVElQTElFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy51cChQb2ludHMuQkxBTktfU1FVQVJFX1BUUylcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAnc3E6Y2xvc2UnOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9LCAvLyAuLi5pcyB0aGlzIGV2ZW4gcG9zc2libGU/XHJcbiAgICAgICAgJ3NxOmZsYWcnOiBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWRVcChQb2ludHMuRkxBR19NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZERvd24oUG9pbnRzLk1JU0ZMQUdfVU5NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ3NxOnVuZmxhZyc6IGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcXVhcmUuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZERvd24oUG9pbnRzLlVORkxBR19NSU5FRCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlcnJlZFVwKFBvaW50cy5NSVNVTkZMQUdfTUlORUQpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgICAgICAnZ2I6c3RhcnQnOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW5kR2FtZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgLyogU1RBUlQgVEhFIFNDT1JFS0VFUEVSICovIFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ2diOmVuZDp3aW4nOiBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZEdhbWUgPSB0cnVlOyBcclxuICAgICAgICAgICAgICAgICAgICAgIC8qIFNUT1AgVEhFIFNDT1JFS0VFUEVSICovIFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgJ2diOmVuZDpvdmVyJzogZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmRHYW1lID0gdHJ1ZTsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmb3IgKHZhciBldmVudCBpbiBFVkVOVFMpIFxyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbihldmVudCwgRVZFTlRTW2V2ZW50XS5iaW5kKHRoaXMpKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX2JpbmFyeVNlYXJjaDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSA+PiAxKTtcclxuICAgICAgICAgICAgaWYgKHgudGltZSA8IHRoaXMucXVldWVbbWlkXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgaGkgPSBtaWQ7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxvID0gbWlkICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvO1xyXG4gICAgfSxcclxuICAgIF9lbnF1ZXVlOiBmdW5jdGlvbih4KSB7IHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSh0aGlzLl9iaW5hcnlTZWFyY2goeCksIDAsIHgpOyB9LFxyXG4gICAgX3Byb2Nlc3NFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmNhbGxiYWNrc1tldmVudC50eXBlXTtcclxuICAgICAgICBpZiAoZm4gIT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIChmbi5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgPyBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cywgZnVuY3Rpb24oZXJyKSB7IGlmICghZXJyKSByZXR1cm4gdm9pZCAwOyB9KVxyXG4gICAgICAgICAgICAgICAgOiBjb25zb2xlLmxvZyhcIjxzY29yZSBldmVudDogJW8+OiA6b2xkIFslb11cIiwgZm4ubmFtZSwgdGhpcy5zY29yZSksXHJcbiAgICAgICAgICAgICAgICAgIGZuLmNhbGwodGhpcywgZXZlbnQucHRzKSxcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCIuLi46bmV3ID0+IFslb11cIiwgdGhpcy5zY29yZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coXCJbU2NvcmVrZWVwZXJdIGNvdWxkIG5vdCBmaW5kIGZ1bmN0aW9uIFwiICsgZXZlbnQudHlwZSk7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF9wcm9jZXNzRmluYWxpemVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZm9yICh2YXIgdmlzaXRvciBpbiB0aGlzLmZpbmFsaXplcnMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCI8ZmluYWxpemVyOiAlbz46IDpvbGQgWyVvXSA9PiA6bmV3IFslb10uLi4gXCIsIHZpc2l0b3IsIHRoaXMuc2NvcmUsICh0aGlzLnNjb3JlICs9IHRoaXMuZmluYWxpemVyc1t2aXNpdG9yXSh0aGlzLmdhbWVib2FyZCkpKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5zY29yZSArPSB2aXNpdG9yKHRoaXMuZ2FtZWJvYXJkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5maW5hbC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHsgdGhpcy5zY29yZSArPSBmOyB9LCB0aGlzKTtcclxuICAgICAgICAvLyBmaW5hbCB1cGRhdGUgb2YgdGhlIHNjb3JlXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzY29yZTpjaGFuZ2U6ZmluYWxcIiwgdGhpcy5zY29yZSk7XHJcbiAgICB9LFxyXG4gICAgX3RpY2s6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBjdXJySWR4ID0gdGhpcy5fYmluYXJ5U2VhcmNoKHsgdGltZTogbmV3IERhdGUoKS5nZXRUaW1lKCkgfSksIGluZGV4ID0gMDtcclxuICAgICAgICB3aGlsZSAoaW5kZXggPCBjdXJySWR4KSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkgeyBfdGhpcy5fcHJvY2Vzc0V2ZW50KF90aGlzLnF1ZXVlW2luZGV4XSk7IHJldHVybiBpbmRleCArPSAxOyB9O1xyXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5xdWV1ZS5zcGxpY2UoMCwgY3VycklkeCk7XHJcbiAgICB9LFxyXG4gICAgX2FkZFNjb3JlVG9RdWV1ZTogZnVuY3Rpb24odHlwZSwgcHRzKSB7IHJldHVybiB0aGlzLl9lbnF1ZXVlKHsgdGltZTogKCgrbmV3IERhdGUpICsgdGhpcy5uc3UpLCB0eXBlOiB0eXBlLCBwdHM6IHB0cyB9KTsgfSxcclxuXHJcbiAgICB1cDogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwidXA6ICVvXCIsIHB0cyk7IHRoaXMuY2FsbGJhY2tzLnVwKHB0cyk7IH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbihwdHMpIHsgY29uc29sZS5sb2coXCJkb3duOiAlb1wiLCBwdHMpOyB0aGlzLmNhbGxiYWNrcy5kb3duKHB0cyk7IH0sXHJcblxyXG4gICAgZGVmZXJyZWRVcDogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwiUXVldWVpbmcgYHVwYCBzY29yZSBldmVudCBvZiAlb1wiLCBwb3MocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcInVwXCIsIHBvcyhwdHMpKTsgfSxcclxuICAgIGRlZmVycmVkRG93bjogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwiUXVldWVpbmcgYGRvd25gIHNjb3JlIGV2ZW50IG9mICVvXCIsIG5lZyhwdHMpKTsgdGhpcy5fYWRkU2NvcmVUb1F1ZXVlKFwiZG93blwiLCBuZWcocHRzKSk7IH0sXHJcblxyXG4gICAgZmluYWxVcDogZnVuY3Rpb24ocHRzKSB7IHRoaXMuZmluYWwucHVzaChwb3MocHRzKSk7IH0sXHJcbiAgICBmaW5hbERvd246IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmZpbmFsLnB1c2gobmVnKHB0cykpOyB9LFxyXG5cclxuICAgIGdldFBlbmRpbmdTY29yZUNvdW50OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucXVldWUubGVuZ3RoOyB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKFwiQ2xlYXJpbmcgb3V0IHJlbWFpbmluZyBxdWV1ZSFcIik7XHJcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgIHRoaXMucXVldWUuZm9yRWFjaChmdW5jdGlvbihldmVudCkgeyBfdGhpcy5fcHJvY2Vzc0V2ZW50KGV2ZW50KTsgfSk7XHJcblxyXG4gICAgICB0aGlzLl9wcm9jZXNzRmluYWxpemVycygpO1xyXG5cclxuICAgICAgY29uc29sZS5pbmZvKFwiRklOQUwgU0NPUkU6ICVvXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcclxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnRpbWVyKTtcclxuICAgICAgdGhpcy5xdWV1ZS5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLmZpbmFsLmxlbmd0aCA9IDA7XHJcbiAgICAgIHRoaXMuc2NvcmUgPSAwO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY29yZWtlZXBlcjsiLCJ2YXIgU2VyaWFsaXplciA9IHtcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgX21ldGE6IHtcclxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogK25ldyBEYXRlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5zY29yZSxcclxuICAgICAgICAgICAgICAgIHRpbWVyOiBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzOiBnYW1lYm9hcmQuZW1pdHRlci5fdHJhbnNjcmlwdHMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICB1c2VyOiB7fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAkZWw6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBib2FyZDogZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSxcclxuICAgICAgICAgICAgICAgIHNjb3Jla2VlcGVyOiB7IHF1ZXVlOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIucXVldWUsIGZpbmFsOiBnYW1lYm9hcmQuc2NvcmVrZWVwZXIuZmluYWwgfSxcclxuICAgICAgICAgICAgICAgIGZsYXNoQ29udGFpbmVyOiBnYW1lYm9hcmQuZmxhc2hDb250YWluZXIuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICB0aGVtZTogZ2FtZWJvYXJkLnRoZW1lLFxyXG4gICAgICAgICAgICAgICAgZGVidWdfbW9kZTogZ2FtZWJvYXJkLmRlYnVnX21vZGUsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zOiBnYW1lYm9hcmQuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgICAgIG1pbmVzOiBnYW1lYm9hcmQubWluZXMsXHJcbiAgICAgICAgICAgICAgICB1c2VyTW92ZXM6IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgICAgICBpc01vYmlsZTogZ2FtZWJvYXJkLmlzTW9iaWxlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfSxcclxuICAgIGltcG9ydDogZnVuY3Rpb24oZXhwb3J0ZWQpIHtcclxuICAgICAgICAvLyAxLiBuZXcgR2FtZWJvYXJkIG9iamVjdCAoZGVmYXVsdHMgaXMgb2spXHJcbiAgICAgICAgLy8gMi4gcmVwbGFjZSBgYm9hcmRgIHdpdGggbmV3IE11bHRpbWFwOlxyXG4gICAgICAgIC8vICAgICAtIGNvdW50IGFycmF5cyBhdCBmaXJzdCBsZXZlbCBpbiBib2FyZCBmb3IgbnVtIHJvd3NcclxuICAgICAgICAvLyAgICAgICAgICBbW1t7XCJyb3dcIjowLFwiY2VsbFwiOjAsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMTAwMFwifSxcImRhbmdlclwiOjB9LFxyXG4gICAgICAgIC8vICAgICAgICAgIHtcInJvd1wiOjAsXCJjZWxsXCI6MixcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIwMDEwXCJ9fV1dXVxyXG4gICAgICAgIC8vICAgICAtIHBhcnNlIGVhY2ggb2JqZWN0IHRvIGNyZWF0ZSBuZXcgU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBfZmxhZ3MpXHJcbiAgICAgICAgLy8gMy4gJGVsID0gJChleHBvcnRlZC4kZWwpXHJcbiAgICAgICAgLy8gNC4gZmxhc2hDb250YWluZXIgPSAkKGV4cG9ydGVkLmZsYXNoQ29udGFpbmVyKVxyXG4gICAgICAgIC8vIDUuIHRoZW1lID0gZXhwb3J0ZWQudGhlbWVcclxuICAgICAgICAvLyA2LiBkZWJ1Z19tb2RlID0gZXhwb3J0ZWQuZGVidWdfbW9kZVxyXG4gICAgICAgIC8vIDcuIGRpbWVuc2lvbnMgPSBleHBvcnRlZC5kaW1lbnNpb25zXHJcbiAgICAgICAgLy8gOC4gbWluZXMgPSBnYW1lYm9hcmQubWluZXNcclxuICAgICAgICAvLyA5LiB1c2VyTW92ZXMgPSBnYW1lYm9hZC51c2VyTW92ZXMsIGFuZCBpc01vYmlsZVxyXG4gICAgICAgIC8vIDEwLiBtYWtlIG5ldyBDb3VudGRvd24gd2l0aCBleHBvcnRlZC5fbWV0YS50aW1lciA9IHNlY29uZHMsIGNsb2NrLnN0YXJ0KClcclxuICAgICAgICAvLyAxMS4gaW5zdGFudGlhdGUgbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIsIGxvYWRpbmcgX21ldGEudHJhbnNjcmlwdHMgaW50byBpdHMgX3RyYW5zY3JpcHRzXHJcbiAgICAgICAgLy8gMTIuIHJlLXJ1biB0aGUgaW50ZXJuYWwgaW5pdCgpIG9wczogX2xvYWRCb2FyZCwgX3JlbmRlckdyaWRcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZXJpYWxpemVyOyIsInZhciBCaXRGbGFnRmFjdG9yeSA9IHJlcXVpcmUoJy4vbGliL2JpdC1mbGFnLWZhY3RvcnknKSxcclxuICAgIFN5bWJvbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlN5bWJvbHMsXHJcbiAgICBGbGFncyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuRmxhZ3MsXHJcblxyXG4gICAgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWyBGbGFncy5PUEVOLCBGbGFncy5NSU5FRCwgRmxhZ3MuRkxBR0dFRCwgRmxhZ3MuSU5ERVhFRCBdKTtcclxuXHJcbmZ1bmN0aW9uIFNxdWFyZShyb3csIGNlbGwsIGRhbmdlciwgZmxhZ3MpIHtcclxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcXVhcmUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgU3F1YXJlKGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XHJcbiAgICB0aGlzLnN0YXRlID0gZmxhZ3MgPyBuZXcgQml0RmxhZ3MoZmxhZ3MpIDogbmV3IEJpdEZsYWdzO1xyXG4gICAgdGhpcy5kYW5nZXIgPSAoZGFuZ2VyID09ICtkYW5nZXIpID8gK2RhbmdlciA6IDA7XHJcblxyXG4gICAgaWYgKHRoaXMuZGFuZ2VyID4gMCkgdGhpcy5pbmRleCgpO1xyXG59XHJcblxyXG5TcXVhcmUucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IFNxdWFyZSxcclxuICAgIGdldFJvdzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJvdzsgfSxcclxuICAgIGdldENlbGw6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5jZWxsOyB9LFxyXG4gICAgZ2V0RGFuZ2VyOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZGFuZ2VyOyB9LFxyXG4gICAgc2V0RGFuZ2VyOiBmdW5jdGlvbihpZHgpIHsgaWYgKGlkeCA9PSAraWR4KSB7IHRoaXMuZGFuZ2VyID0gK2lkeDsgdGhpcy5kYW5nZXIgPiAwICYmIHRoaXMuaW5kZXgoKTsgfSB9LFxyXG4gICAgZ2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKFN5bWJvbHMpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBfdGhpc1sgJ2lzJyArIGtleS5jaGFyQXQoMCkgKyBrZXkuc3Vic3RyaW5nKDEpLnRvTG93ZXJDYXNlKCkgXSgpOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4ga2V5LnRvTG93ZXJDYXNlKCk7IH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgb3BlbjogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICB1bmZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfTUlORUQpOyB9LFxyXG4gICAgaW5kZXg6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfSU5ERVhFRCk7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gIXRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKTsgfSxcclxuICAgIGlzSW5kZXhlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzSW5kZXhlZCgpOyB9LFxyXG5cclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IHJvdzogdGhpcy5yb3csIGNlbGw6IHRoaXMuY2VsbCwgc3RhdGU6IHRoaXMuc3RhdGUsIGRhbmdlcjogdGhpcy5kYW5nZXIgfSB9LFxyXG4gICAgdG9TdHJpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKClcclxuICAgICAgICAgICAgPyBTeW1ib2xzLk1JTkVEIDogdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKVxyXG4gICAgICAgICAgICAgICAgPyBTeW1ib2xzLkZMQUdHRUQgOiB0aGlzLnN0YXRlLmlzT3BlbigpXHJcbiAgICAgICAgICAgICAgICAgICAgPyBTeW1ib2xzLk9QRU4gOiBTeW1ib2xzLkNMT1NFRDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3F1YXJlOyIsInZhciAkQyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XHJcblxyXG52YXIgVGhlbWVTdHlsZXIgPSB7XHJcblx0c2V0OiBmdW5jdGlvbih0aGVtZSwgJGVsKSB7XHJcblxyXG5cdFx0JGVsIHx8ICgkZWwgPSAkKCRDLkRlZmF1bHRDb25maWcuYm9hcmQpKTtcclxuXHJcblx0XHR2YXIgdGhlbWVGaWxlID0gJEMuVGhlbWVzW3RoZW1lXSxcclxuXHRcdFx0JGhlYWQgPSAkZWwucGFyZW50cyhcImJvZHlcIikuc2libGluZ3MoXCJoZWFkXCIpLFxyXG5cdFx0XHQkc3R5bGVzID0gJGhlYWQuZmluZChcImxpbmtcIiksXHJcblxyXG5cdFx0XHRoYXNQcmVFeGlzdGluZyA9IGZ1bmN0aW9uKHN0eWxlc2hlZXRzKSB7XHJcblx0XHRcdFx0cmV0dXJuICEhc3R5bGVzaGVldHMuZmlsdGVyKGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuICEhfiQodGhpcykuYXR0cignaHJlZicpLmluZGV4T2YodGhlbWVGaWxlKTtcclxuXHRcdFx0XHR9KS5sZW5ndGhcclxuXHRcdFx0fSxcclxuXHRcdFx0Ly8gYnVpbGQgYSBuZXcgPGxpbms+IHRhZyBmb3IgdGhlIGRlc2lyZWQgdGhlbWUgc3R5bGVzaGVldDpcclxuXHRcdFx0JGxpbmsgPSAkKFwiPGxpbmsgLz5cIiwge1xyXG5cdFx0XHRcdHJlbDogJ3N0eWxlc2hlZXQnLFxyXG5cdFx0XHRcdHR5cGU6ICd0ZXh0L2NzcycsXHJcblx0XHRcdFx0aHJlZjogJ2Nzcy8nICsgdGhlbWVGaWxlICsgJy5jc3MnXHJcblx0XHRcdH0pO1xyXG5cdFx0Ly8gdXNpbmcgJGVsIGFzIGFuY2hvciB0byB0aGUgRE9NLCBnbyB1cCBhbmRcclxuXHRcdC8vIGxvb2sgZm9yIGxpZ2h0LmNzcyBvciBkYXJrLmNzcywgYW5kLS1pZiBuZWNlc3NhcnktLXN3YXBcclxuXHRcdC8vIGl0IG91dCBmb3IgYHRoZW1lYC5cclxuXHRcdC8vIEFkZCAkbGluayBpZmYgaXQgZG9lc24ndCBhbHJlYWR5IGV4aXN0IVxyXG5cdFx0aWYgKCFoYXNQcmVFeGlzdGluZygkc3R5bGVzKSlcclxuXHRcdFx0JHN0eWxlcy5hZnRlcigkbGluayk7XHJcblx0fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUaGVtZVN0eWxlcjsiLCJ2YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vbGliL2VtaXR0ZXInKSxcclxuICAgIFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHJlcXVpcmUoJy4vdHJhbnNjcmlwdGlvbi1zdHJhdGVneScpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNjcmliaW5nRW1pdHRlcihzdHJhdGVneSkge1xyXG4gICAgRW1pdHRlci5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5fdHJhbnNjcmlwdHMgPSBbXTtcclxuICAgIHRoaXMuX3N0cmF0ZWd5ID0gKHN0cmF0ZWd5ICYmIHN0cmF0ZWd5LmFwcGx5KSA/IHN0cmF0ZWd5IDogVHJhbnNjcmlwdGlvblN0cmF0ZWd5O1xyXG59XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW1pdHRlci5wcm90b3R5cGUpO1xyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5fX3RyaWdnZXJfXyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXI7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbigvKiBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAvLyBzZW5kIG9yaWdpbmFsIHBhcmFtcyB0byB0aGUgc3Vic2NyaWJlcnMuLi5cclxuICAgIHRoaXMuX190cmlnZ2VyX18uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAvLyAuLi50aGVuIGFsdGVyIHRoZSBwYXJhbXMgZm9yIHRoZSB0cmFuc2NyaXB0J3MgcmVjb3Jkc1xyXG4gICAgdGhpcy5fdHJhbnNjcmlwdHMucHVzaCh0aGlzLl9zdHJhdGVneS5hcHBseShhcmdzKSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7IiwiXG52YXIgRGVmYXVsdFRyYW5zY3JpcHRpb25TdHJhdGVneSA9IHtcbiAgICAgICAgYXBwbHk6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGFbMF0pIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGRhdGFbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOm9wZW5cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOmNsb3NlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTpmbGFnXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzcTp1bmZsYWdcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOm1pbmVcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHN0YW5kYXJkIFNxdWFyZS1iYXNlZCBldmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMDogZXZlbnQgbmFtZSwgMTogU3F1YXJlIGluc3RhbmNlLCAyOiBqUXVlcnktd3JhcHBlZCBET00gZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJTcXVhcmVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzFdID0gSlNPTi5zdHJpbmdpZnkoZGF0YVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsyXSBpbnN0YW5jZW9mIGpRdWVyeSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzJdID0gYnVpbGRET01TdHJpbmcoZGF0YVsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOnN0YXJ0XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjplbmQ6d2luXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJnYjplbmQ6b3ZlclwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RhbmRhcmQgR2FtZWJvYXJkLWJhc2VkIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIk11bHRpbWFwXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVsxXSA9IEpTT04uc3RyaW5naWZ5KGRhdGFbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIHByZWZpeCBhcnJheSBjb250ZW50cyB3aXRoIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBpdHMga2V5XG4gICAgICAgICAgICAgICAgZGF0YS51bnNoaWZ0KCtuZXcgRGF0ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IERlZmF1bHRUcmFuc2NyaXB0aW9uU3RyYXRlZ3k7XG5cbi8vIFRha2VzIGEgPHRkPiBET00gbm9kZSwgYW5kIGNvbnZlcnRzIGl0IHRvIGFcbi8vIHN0cmluZyBkZXNjcmlwdG9yLCBlLmcuLCBcInRyI3JvdzAgdGQuY2VsbDAubWluZWQuY2xvc2VkXCIuXG5mdW5jdGlvbiBidWlsZERPTVN0cmluZygkZWwpIHtcbiAgICB2YXIgbm9kZSA9ICRlbCBpbnN0YW5jZW9mIGpRdWVyeSA/ICRlbFswXSA6ICRlbCxcbiAgICAgICAgLy8gc29ydHMgY2xhc3MgbmFtZXMsIHB1dHRpbmcgdGhlIFwiY2VsbFhcIiBjbGFzcyBmaXJzdFxuICAgICAgICBTT1JUX0ZOX0NFTExfRklSU1QgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBpbmNpcGl0KHN0cikgeyByZXR1cm4gc3RyLnN1YnN0cmluZygwLCBcImNlbGxcIi5sZW5ndGgpLnRvTG93ZXJDYXNlKCk7IH07XG4gICAgICAgICAgICByZXR1cm4gKGluY2lwaXQoYSkgPT09IFwiY2VsbFwiIHx8IGluY2lwaXQoYikgPT09IFwiY2VsbFwiIHx8IGEgPiBiKSA/IDEgOiAoYSA8IGIpID8gLTEgOiAwO1xuICAgICAgICB9O1xuICAgIHJldHVybiBub2RlLnBhcmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICsgXCIjXCIgKyBub2RlLnBhcmVudE5vZGUuaWQgKyBcIiBcIlxuICAgICAgICArIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpICsgXCIuXCJcbiAgICAgICAgKyBub2RlLmNsYXNzTmFtZS5zcGxpdCgnICcpXG4gICAgICAgIC5zb3J0KFNPUlRfRk5fQ0VMTF9GSVJTVClcbiAgICAgICAgLmpvaW4oJy4nKTtcbn1cbiIsInZhciAkQyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyksXHJcbiAgICBWYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL2Vycm9ycycpLlZhbGlkYXRpb25FcnJvcixcclxuICAgIC8vIHZhbGlkYXRpb24gaGVscGVyIGZuc1xyXG4gICAgaXNOdW1lcmljID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyh2YWwpLnJlcGxhY2UoLywvZywgJycpLCAodmFsLmxlbmd0aCAhPT0gMCAmJiAhaXNOYU4oK3ZhbCkgJiYgaXNGaW5pdGUoK3ZhbCkpO1xyXG4gICAgfSxcclxuXHJcbiAgICBWYWxpZGF0b3JzID0ge1xyXG4gICAgICAgIEJvYXJkRGltZW5zaW9uczoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24oZGltKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBudW1lcmljIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTnVtZXJpYyhkaW0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgYm9hcmQgZGltZW5zaW9uLlwiLCBkaW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gTUFYX0RJTUVOU0lPTlMgY29uc3RhbnRcclxuICAgICAgICAgICAgICAgIGlmICghKGRpbSA8PSAkQy5NQVhfR1JJRF9ESU1FTlNJT05TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIGdhbWUncyBtYXhpbXVtIGdyaWQgZGltZW5zaW9uc1wiLCArZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlLi4uXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTWluZUNvdW50OiB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbihtaW5lcywgbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibWluZXM6ICVvLCBtYXhQb3NzaWJsZTogJW9cIiwgbWluZXMsIG1heFBvc3NpYmxlKVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMobWluZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgbnVtYmVyIG9mIG1pbmVzLlwiLCBtaW5lcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGdyZWF0ZXIgdGhhbiBtYXhQb3NzaWJsZSBmb3IgdGhpcyBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAobWluZXMgPiBtYXhQb3NzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcyAoezF9KS5cIiwgK21pbmVzLCBtYXhQb3NzaWJsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvcnM7IiwiLyohIGpRdWVyeSBwbHVnaW4gZm9yIEhhbW1lci5KUyAtIHYxLjAuMSAtIDIwMTQtMDItMDNcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogSGFtbWVyLkpTIC0gdjEuMC43ZGV2IC0gMjAxNC0wMi0xOFxyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgSm9yaWsgVGFuZ2VsZGVyIDxqLnRhbmdlbGRlckBnbWFpbC5jb20+O1xyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgKi9cclxuXHJcbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBIYW1tZXJcclxuICogdXNlIHRoaXMgdG8gY3JlYXRlIGluc3RhbmNlc1xyXG4gKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbnZhciBIYW1tZXIgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgcmV0dXJuIG5ldyBIYW1tZXIuSW5zdGFuY2UoZWxlbWVudCwgb3B0aW9ucyB8fCB7fSk7XHJcbn07XHJcblxyXG4vLyBkZWZhdWx0IHNldHRpbmdzXHJcbkhhbW1lci5kZWZhdWx0cyA9IHtcclxuICAvLyBhZGQgc3R5bGVzIGFuZCBhdHRyaWJ1dGVzIHRvIHRoZSBlbGVtZW50IHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSBkb2luZ1xyXG4gIC8vIGl0cyBuYXRpdmUgYmVoYXZpb3IuIHRoaXMgZG9lc250IHByZXZlbnQgdGhlIHNjcm9sbGluZywgYnV0IGNhbmNlbHNcclxuICAvLyB0aGUgY29udGV4dG1lbnUsIHRhcCBoaWdobGlnaHRpbmcgZXRjXHJcbiAgLy8gc2V0IHRvIGZhbHNlIHRvIGRpc2FibGUgdGhpc1xyXG4gIHN0b3BfYnJvd3Nlcl9iZWhhdmlvcjoge1xyXG4gICAgLy8gdGhpcyBhbHNvIHRyaWdnZXJzIG9uc2VsZWN0c3RhcnQ9ZmFsc2UgZm9yIElFXHJcbiAgICB1c2VyU2VsZWN0ICAgICAgIDogJ25vbmUnLFxyXG4gICAgLy8gdGhpcyBtYWtlcyB0aGUgZWxlbWVudCBibG9ja2luZyBpbiBJRTEwID4sIHlvdSBjb3VsZCBleHBlcmltZW50IHdpdGggdGhlIHZhbHVlXHJcbiAgICAvLyBzZWUgZm9yIG1vcmUgb3B0aW9ucyB0aGlzIGlzc3VlOyBodHRwczovL2dpdGh1Yi5jb20vRWlnaHRNZWRpYS9oYW1tZXIuanMvaXNzdWVzLzI0MVxyXG4gICAgdG91Y2hBY3Rpb24gICAgICA6ICdub25lJyxcclxuICAgIHRvdWNoQ2FsbG91dCAgICAgOiAnbm9uZScsXHJcbiAgICBjb250ZW50Wm9vbWluZyAgIDogJ25vbmUnLFxyXG4gICAgdXNlckRyYWcgICAgICAgICA6ICdub25lJyxcclxuICAgIHRhcEhpZ2hsaWdodENvbG9yOiAncmdiYSgwLDAsMCwwKSdcclxuICB9XHJcblxyXG4gIC8vXHJcbiAgLy8gbW9yZSBzZXR0aW5ncyBhcmUgZGVmaW5lZCBwZXIgZ2VzdHVyZSBhdCBnZXN0dXJlcy5qc1xyXG4gIC8vXHJcbn07XHJcblxyXG4vLyBkZXRlY3QgdG91Y2hldmVudHNcclxuSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTID0gd2luZG93Lm5hdmlnYXRvci5wb2ludGVyRW5hYmxlZCB8fCB3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQ7XHJcbkhhbW1lci5IQVNfVE9VQ0hFVkVOVFMgPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KTtcclxuXHJcbi8vIGRvbnQgdXNlIG1vdXNlZXZlbnRzIG9uIG1vYmlsZSBkZXZpY2VzXHJcbkhhbW1lci5NT0JJTEVfUkVHRVggPSAvbW9iaWxlfHRhYmxldHxpcChhZHxob25lfG9kKXxhbmRyb2lkfHNpbGsvaTtcclxuSGFtbWVyLk5PX01PVVNFRVZFTlRTID0gSGFtbWVyLkhBU19UT1VDSEVWRU5UUyAmJiB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaChIYW1tZXIuTU9CSUxFX1JFR0VYKTtcclxuXHJcbi8vIGV2ZW50dHlwZXMgcGVyIHRvdWNoZXZlbnQgKHN0YXJ0LCBtb3ZlLCBlbmQpXHJcbi8vIGFyZSBmaWxsZWQgYnkgSGFtbWVyLmV2ZW50LmRldGVybWluZUV2ZW50VHlwZXMgb24gc2V0dXBcclxuSGFtbWVyLkVWRU5UX1RZUEVTID0ge307XHJcblxyXG4vLyBkaXJlY3Rpb24gZGVmaW5lc1xyXG5IYW1tZXIuRElSRUNUSU9OX0RPV04gPSAnZG93bic7XHJcbkhhbW1lci5ESVJFQ1RJT05fTEVGVCA9ICdsZWZ0JztcclxuSGFtbWVyLkRJUkVDVElPTl9VUCA9ICd1cCc7XHJcbkhhbW1lci5ESVJFQ1RJT05fUklHSFQgPSAncmlnaHQnO1xyXG5cclxuLy8gcG9pbnRlciB0eXBlXHJcbkhhbW1lci5QT0lOVEVSX01PVVNFID0gJ21vdXNlJztcclxuSGFtbWVyLlBPSU5URVJfVE9VQ0ggPSAndG91Y2gnO1xyXG5IYW1tZXIuUE9JTlRFUl9QRU4gPSAncGVuJztcclxuXHJcbi8vIGludGVydmFsIGluIHdoaWNoIEhhbW1lciByZWNhbGN1bGF0ZXMgY3VycmVudCB2ZWxvY2l0eSBpbiBtc1xyXG5IYW1tZXIuVVBEQVRFX1ZFTE9DSVRZX0lOVEVSVkFMID0gMjA7XHJcblxyXG4vLyB0b3VjaCBldmVudCBkZWZpbmVzXHJcbkhhbW1lci5FVkVOVF9TVEFSVCA9ICdzdGFydCc7XHJcbkhhbW1lci5FVkVOVF9NT1ZFID0gJ21vdmUnO1xyXG5IYW1tZXIuRVZFTlRfRU5EID0gJ2VuZCc7XHJcblxyXG4vLyBoYW1tZXIgZG9jdW1lbnQgd2hlcmUgdGhlIGJhc2UgZXZlbnRzIGFyZSBhZGRlZCBhdFxyXG5IYW1tZXIuRE9DVU1FTlQgPSB3aW5kb3cuZG9jdW1lbnQ7XHJcblxyXG4vLyBwbHVnaW5zIGFuZCBnZXN0dXJlcyBuYW1lc3BhY2VzXHJcbkhhbW1lci5wbHVnaW5zID0gSGFtbWVyLnBsdWdpbnMgfHwge307XHJcbkhhbW1lci5nZXN0dXJlcyA9IEhhbW1lci5nZXN0dXJlcyB8fCB7fTtcclxuXHJcblxyXG4vLyBpZiB0aGUgd2luZG93IGV2ZW50cyBhcmUgc2V0Li4uXHJcbkhhbW1lci5SRUFEWSA9IGZhbHNlO1xyXG5cclxuLyoqXHJcbiAqIHNldHVwIGV2ZW50cyB0byBkZXRlY3QgZ2VzdHVyZXMgb24gdGhlIGRvY3VtZW50XHJcbiAqL1xyXG5mdW5jdGlvbiBzZXR1cCgpIHtcclxuICBpZihIYW1tZXIuUkVBRFkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIGZpbmQgd2hhdCBldmVudHR5cGVzIHdlIGFkZCBsaXN0ZW5lcnMgdG9cclxuICBIYW1tZXIuZXZlbnQuZGV0ZXJtaW5lRXZlbnRUeXBlcygpO1xyXG5cclxuICAvLyBSZWdpc3RlciBhbGwgZ2VzdHVyZXMgaW5zaWRlIEhhbW1lci5nZXN0dXJlc1xyXG4gIEhhbW1lci51dGlscy5lYWNoKEhhbW1lci5nZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSl7XHJcbiAgICBIYW1tZXIuZGV0ZWN0aW9uLnJlZ2lzdGVyKGdlc3R1cmUpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBBZGQgdG91Y2ggZXZlbnRzIG9uIHRoZSBkb2N1bWVudFxyXG4gIEhhbW1lci5ldmVudC5vblRvdWNoKEhhbW1lci5ET0NVTUVOVCwgSGFtbWVyLkVWRU5UX01PVkUsIEhhbW1lci5kZXRlY3Rpb24uZGV0ZWN0KTtcclxuICBIYW1tZXIuZXZlbnQub25Ub3VjaChIYW1tZXIuRE9DVU1FTlQsIEhhbW1lci5FVkVOVF9FTkQsIEhhbW1lci5kZXRlY3Rpb24uZGV0ZWN0KTtcclxuXHJcbiAgLy8gSGFtbWVyIGlzIHJlYWR5Li4uIVxyXG4gIEhhbW1lci5SRUFEWSA9IHRydWU7XHJcbn1cclxuXHJcbkhhbW1lci51dGlscyA9IHtcclxuICAvKipcclxuICAgKiBleHRlbmQgbWV0aG9kLFxyXG4gICAqIGFsc28gdXNlZCBmb3IgY2xvbmluZyB3aGVuIGRlc3QgaXMgYW4gZW1wdHkgb2JqZWN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZGVzdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIHNyY1xyXG4gICAqIEBwYXJtICB7Qm9vbGVhbn0gIG1lcmdlICAgIGRvIGEgbWVyZ2VcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICBkZXN0XHJcbiAgICovXHJcbiAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjLCBtZXJnZSkge1xyXG4gICAgZm9yKHZhciBrZXkgaW4gc3JjKSB7XHJcbiAgICAgIGlmKGRlc3Rba2V5XSAhPT0gdW5kZWZpbmVkICYmIG1lcmdlKSB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgZGVzdFtrZXldID0gc3JjW2tleV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVzdDtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZm9yIGVhY2hcclxuICAgKiBAcGFyYW0gb2JqXHJcbiAgICogQHBhcmFtIGl0ZXJhdG9yXHJcbiAgICovXHJcbiAgZWFjaDogZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xyXG4gICAgdmFyIGksIGxlbmd0aDtcclxuICAgIC8vIG5hdGl2ZSBmb3JFYWNoIG9uIGFycmF5c1xyXG4gICAgaWYgKCdmb3JFYWNoJyBpbiBvYmopIHtcclxuICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgLy8gYXJyYXlzXHJcbiAgICBlbHNlIGlmKG9iai5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBvYmplY3RzXHJcbiAgICBlbHNlIHtcclxuICAgICAgZm9yIChpIGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkgJiYgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogZmluZCBpZiBhIG5vZGUgaXMgaW4gdGhlIGdpdmVuIHBhcmVudFxyXG4gICAqIHVzZWQgZm9yIGV2ZW50IGRlbGVnYXRpb24gdHJpY2tzXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIG5vZGVcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgcGFyZW50XHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59ICAgICAgIGhhc19wYXJlbnRcclxuICAgKi9cclxuICBoYXNQYXJlbnQ6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xyXG4gICAgd2hpbGUobm9kZSkge1xyXG4gICAgICBpZihub2RlID09IHBhcmVudCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCB0aGUgY2VudGVyIG9mIGFsbCB0aGUgdG91Y2hlc1xyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHRvdWNoZXNcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICBjZW50ZXJcclxuICAgKi9cclxuICBnZXRDZW50ZXI6IGZ1bmN0aW9uIGdldENlbnRlcih0b3VjaGVzKSB7XHJcbiAgICB2YXIgdmFsdWVzWCA9IFtdLCB2YWx1ZXNZID0gW107XHJcblxyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godG91Y2hlcywgZnVuY3Rpb24odG91Y2gpIHtcclxuICAgICAgLy8gSSBwcmVmZXIgY2xpZW50WCBiZWNhdXNlIGl0IGlnbm9yZSB0aGUgc2Nyb2xsaW5nIHBvc2l0aW9uXHJcbiAgICAgIHZhbHVlc1gucHVzaCh0eXBlb2YgdG91Y2guY2xpZW50WCAhPT0gJ3VuZGVmaW5lZCcgPyB0b3VjaC5jbGllbnRYIDogdG91Y2gucGFnZVggKTtcclxuICAgICAgdmFsdWVzWS5wdXNoKHR5cGVvZiB0b3VjaC5jbGllbnRZICE9PSAndW5kZWZpbmVkJyA/IHRvdWNoLmNsaWVudFkgOiB0b3VjaC5wYWdlWSApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGFnZVg6ICgoTWF0aC5taW4uYXBwbHkoTWF0aCwgdmFsdWVzWCkgKyBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXNYKSkgLyAyKSxcclxuICAgICAgcGFnZVk6ICgoTWF0aC5taW4uYXBwbHkoTWF0aCwgdmFsdWVzWSkgKyBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXNZKSkgLyAyKVxyXG4gICAgfTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSB2ZWxvY2l0eSBiZXR3ZWVuIHR3byBwb2ludHNcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV90aW1lXHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfeFxyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3lcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICB2ZWxvY2l0eVxyXG4gICAqL1xyXG4gIGdldFZlbG9jaXR5OiBmdW5jdGlvbiBnZXRWZWxvY2l0eShkZWx0YV90aW1lLCBkZWx0YV94LCBkZWx0YV95KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiBNYXRoLmFicyhkZWx0YV94IC8gZGVsdGFfdGltZSkgfHwgMCxcclxuICAgICAgeTogTWF0aC5hYnMoZGVsdGFfeSAvIGRlbHRhX3RpbWUpIHx8IDBcclxuICAgIH07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgYW5nbGUgYmV0d2VlbiB0d28gY29vcmRpbmF0ZXNcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBhbmdsZVxyXG4gICAqL1xyXG4gIGdldEFuZ2xlOiBmdW5jdGlvbiBnZXRBbmdsZSh0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHkgPSB0b3VjaDIucGFnZVkgLSB0b3VjaDEucGFnZVksXHJcbiAgICAgIHggPSB0b3VjaDIucGFnZVggLSB0b3VjaDEucGFnZVg7XHJcbiAgICByZXR1cm4gTWF0aC5hdGFuMih5LCB4KSAqIDE4MCAvIE1hdGguUEk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGFuZ2xlIHRvIGRpcmVjdGlvbiBkZWZpbmVcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAgICBkaXJlY3Rpb24gY29uc3RhbnQsIGxpa2UgSGFtbWVyLkRJUkVDVElPTl9MRUZUXHJcbiAgICovXHJcbiAgZ2V0RGlyZWN0aW9uOiBmdW5jdGlvbiBnZXREaXJlY3Rpb24odG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB4ID0gTWF0aC5hYnModG91Y2gxLnBhZ2VYIC0gdG91Y2gyLnBhZ2VYKSxcclxuICAgICAgeSA9IE1hdGguYWJzKHRvdWNoMS5wYWdlWSAtIHRvdWNoMi5wYWdlWSk7XHJcblxyXG4gICAgaWYoeCA+PSB5KSB7XHJcbiAgICAgIHJldHVybiB0b3VjaDEucGFnZVggLSB0b3VjaDIucGFnZVggPiAwID8gSGFtbWVyLkRJUkVDVElPTl9MRUZUIDogSGFtbWVyLkRJUkVDVElPTl9SSUdIVDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICByZXR1cm4gdG91Y2gxLnBhZ2VZIC0gdG91Y2gyLnBhZ2VZID4gMCA/IEhhbW1lci5ESVJFQ1RJT05fVVAgOiBIYW1tZXIuRElSRUNUSU9OX0RPV047XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0d28gdG91Y2hlc1xyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIGRpc3RhbmNlXHJcbiAgICovXHJcbiAgZ2V0RGlzdGFuY2U6IGZ1bmN0aW9uIGdldERpc3RhbmNlKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeCA9IHRvdWNoMi5wYWdlWCAtIHRvdWNoMS5wYWdlWCxcclxuICAgICAgeSA9IHRvdWNoMi5wYWdlWSAtIHRvdWNoMS5wYWdlWTtcclxuICAgIHJldHVybiBNYXRoLnNxcnQoKHggKiB4KSArICh5ICogeSkpO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHNjYWxlIGZhY3RvciBiZXR3ZWVuIHR3byB0b3VjaExpc3RzIChmaW5nZXJzKVxyXG4gICAqIG5vIHNjYWxlIGlzIDEsIGFuZCBnb2VzIGRvd24gdG8gMCB3aGVuIHBpbmNoZWQgdG9nZXRoZXIsIGFuZCBiaWdnZXIgd2hlbiBwaW5jaGVkIG91dFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHN0YXJ0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgZW5kXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgc2NhbGVcclxuICAgKi9cclxuICBnZXRTY2FsZTogZnVuY3Rpb24gZ2V0U2NhbGUoc3RhcnQsIGVuZCkge1xyXG4gICAgLy8gbmVlZCB0d28gZmluZ2Vycy4uLlxyXG4gICAgaWYoc3RhcnQubGVuZ3RoID49IDIgJiYgZW5kLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldERpc3RhbmNlKGVuZFswXSwgZW5kWzFdKSAvXHJcbiAgICAgICAgdGhpcy5nZXREaXN0YW5jZShzdGFydFswXSwgc3RhcnRbMV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDE7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgcm90YXRpb24gZGVncmVlcyBiZXR3ZWVuIHR3byB0b3VjaExpc3RzIChmaW5nZXJzKVxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHN0YXJ0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgZW5kXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgcm90YXRpb25cclxuICAgKi9cclxuICBnZXRSb3RhdGlvbjogZnVuY3Rpb24gZ2V0Um90YXRpb24oc3RhcnQsIGVuZCkge1xyXG4gICAgLy8gbmVlZCB0d28gZmluZ2Vyc1xyXG4gICAgaWYoc3RhcnQubGVuZ3RoID49IDIgJiYgZW5kLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldEFuZ2xlKGVuZFsxXSwgZW5kWzBdKSAtXHJcbiAgICAgICAgdGhpcy5nZXRBbmdsZShzdGFydFsxXSwgc3RhcnRbMF0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGJvb2xlYW4gaWYgdGhlIGRpcmVjdGlvbiBpcyB2ZXJ0aWNhbFxyXG4gICAqIEBwYXJhbSAgICB7U3RyaW5nfSAgICBkaXJlY3Rpb25cclxuICAgKiBAcmV0dXJucyAge0Jvb2xlYW59ICAgaXNfdmVydGljYWxcclxuICAgKi9cclxuICBpc1ZlcnRpY2FsOiBmdW5jdGlvbiBpc1ZlcnRpY2FsKGRpcmVjdGlvbikge1xyXG4gICAgcmV0dXJuIChkaXJlY3Rpb24gPT0gSGFtbWVyLkRJUkVDVElPTl9VUCB8fCBkaXJlY3Rpb24gPT0gSGFtbWVyLkRJUkVDVElPTl9ET1dOKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc3RvcCBicm93c2VyIGRlZmF1bHQgYmVoYXZpb3Igd2l0aCBjc3MgcHJvcHNcclxuICAgKiBAcGFyYW0gICB7SHRtbEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBjc3NfcHJvcHNcclxuICAgKi9cclxuICBzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcjogZnVuY3Rpb24gc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3IoZWxlbWVudCwgY3NzX3Byb3BzKSB7XHJcbiAgICBpZighY3NzX3Byb3BzIHx8ICFlbGVtZW50IHx8ICFlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB3aXRoIGNzcyBwcm9wZXJ0aWVzIGZvciBtb2Rlcm4gYnJvd3NlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKFsnd2Via2l0JywgJ2todG1sJywgJ21veicsICdNb3onLCAnbXMnLCAnbycsICcnXSwgZnVuY3Rpb24odmVuZG9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGNzc19wcm9wcywgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcclxuICAgICAgICAgIC8vIHZlbmRlciBwcmVmaXggYXQgdGhlIHByb3BlcnR5XHJcbiAgICAgICAgICBpZih2ZW5kb3IpIHtcclxuICAgICAgICAgICAgcHJvcCA9IHZlbmRvciArIHByb3Auc3Vic3RyaW5nKDAsIDEpLnRvVXBwZXJDYXNlKCkgKyBwcm9wLnN1YnN0cmluZygxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIHNldCB0aGUgc3R5bGVcclxuICAgICAgICAgIGlmKHByb3AgaW4gZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlW3Byb3BdID0gdmFsdWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWxzbyB0aGUgZGlzYWJsZSBvbnNlbGVjdHN0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlclNlbGVjdCA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbnNlbGVjdHN0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGFuZCBkaXNhYmxlIG9uZHJhZ3N0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlckRyYWcgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25kcmFnc3RhcnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHJldmVydHMgYWxsIGNoYW5nZXMgbWFkZSBieSAnc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3InXHJcbiAgICogQHBhcmFtICAge0h0bWxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY3NzX3Byb3BzXHJcbiAgICovXHJcbiAgc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yOiBmdW5jdGlvbiBzdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3IoZWxlbWVudCwgY3NzX3Byb3BzKSB7XHJcbiAgICBpZighY3NzX3Byb3BzIHx8ICFlbGVtZW50IHx8ICFlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB3aXRoIGNzcyBwcm9wZXJ0aWVzIGZvciBtb2Rlcm4gYnJvd3NlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKFsnd2Via2l0JywgJ2todG1sJywgJ21veicsICdNb3onLCAnbXMnLCAnbycsICcnXSwgZnVuY3Rpb24odmVuZG9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGNzc19wcm9wcywgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcclxuICAgICAgICAgIC8vIHZlbmRlciBwcmVmaXggYXQgdGhlIHByb3BlcnR5XHJcbiAgICAgICAgICBpZih2ZW5kb3IpIHtcclxuICAgICAgICAgICAgcHJvcCA9IHZlbmRvciArIHByb3Auc3Vic3RyaW5nKDAsIDEpLnRvVXBwZXJDYXNlKCkgKyBwcm9wLnN1YnN0cmluZygxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIHJlc2V0IHRoZSBzdHlsZVxyXG4gICAgICAgICAgaWYocHJvcCBpbiBlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGVbcHJvcF0gPSAnJztcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhbHNvIHRoZSBlbmFibGUgb25zZWxlY3RzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJTZWxlY3QgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25zZWxlY3RzdGFydCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYW5kIGVuYWJsZSBvbmRyYWdzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJEcmFnID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uZHJhZ3N0YXJ0ID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBuZXcgaGFtbWVyIGluc3RhbmNlXHJcbiAqIGFsbCBtZXRob2RzIHNob3VsZCByZXR1cm4gdGhlIGluc3RhbmNlIGl0c2VsZiwgc28gaXQgaXMgY2hhaW5hYmxlLlxyXG4gKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgICAgIGVsZW1lbnRcclxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgICAgICBbb3B0aW9ucz17fV1cclxuICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5IYW1tZXIuSW5zdGFuY2UgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyBzZXR1cCBIYW1tZXJKUyB3aW5kb3cgZXZlbnRzIGFuZCByZWdpc3RlciBhbGwgZ2VzdHVyZXNcclxuICAvLyB0aGlzIGFsc28gc2V0cyB1cCB0aGUgZGVmYXVsdCBvcHRpb25zXHJcbiAgc2V0dXAoKTtcclxuXHJcbiAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcclxuXHJcbiAgLy8gc3RhcnQvc3RvcCBkZXRlY3Rpb24gb3B0aW9uXHJcbiAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcclxuXHJcbiAgLy8gbWVyZ2Ugb3B0aW9uc1xyXG4gIHRoaXMub3B0aW9ucyA9IEhhbW1lci51dGlscy5leHRlbmQoXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCBIYW1tZXIuZGVmYXVsdHMpLFxyXG4gICAgb3B0aW9ucyB8fCB7fSk7XHJcblxyXG4gIC8vIGFkZCBzb21lIGNzcyB0byB0aGUgZWxlbWVudCB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gZG9pbmcgaXRzIG5hdGl2ZSBiZWhhdm9pclxyXG4gIGlmKHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpIHtcclxuICAgIEhhbW1lci51dGlscy5zdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpO1xyXG4gIH1cclxuXHJcbiAgLy8gc3RhcnQgZGV0ZWN0aW9uIG9uIHRvdWNoc3RhcnRcclxuICB0aGlzLl9ldmVudFN0YXJ0SGFuZGxlciA9IEhhbW1lci5ldmVudC5vblRvdWNoKGVsZW1lbnQsIEhhbW1lci5FVkVOVF9TVEFSVCwgZnVuY3Rpb24oZXYpIHtcclxuICAgIGlmKHNlbGYuZW5hYmxlZCkge1xyXG4gICAgICBIYW1tZXIuZGV0ZWN0aW9uLnN0YXJ0RGV0ZWN0KHNlbGYsIGV2KTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8ga2VlcCBhIGxpc3Qgb2YgdXNlciBldmVudCBoYW5kbGVycyB3aGljaCBuZWVkcyB0byBiZSByZW1vdmVkIHdoZW4gY2FsbGluZyAnZGlzcG9zZSdcclxuICB0aGlzLl9ldmVudEhhbmRsZXIgPSBbXTtcclxuXHJcbiAgLy8gcmV0dXJuIGluc3RhbmNlXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZSA9IHtcclxuICAvKipcclxuICAgKiBiaW5kIGV2ZW50cyB0byB0aGUgaW5zdGFuY2VcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgIGhhbmRsZXJcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIG9uOiBmdW5jdGlvbiBvbkV2ZW50KGdlc3R1cmUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBnZXN0dXJlcyA9IGdlc3R1cmUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKGdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGdlc3R1cmUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgICAgdGhpcy5fZXZlbnRIYW5kbGVyLnB1c2goeyBnZXN0dXJlOiBnZXN0dXJlLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdW5iaW5kIGV2ZW50cyB0byB0aGUgaW5zdGFuY2VcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgIGhhbmRsZXJcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIG9mZjogZnVuY3Rpb24gb2ZmRXZlbnQoZ2VzdHVyZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIGdlc3R1cmVzID0gZ2VzdHVyZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZ2VzdHVyZSwgaGFuZGxlciwgZmFsc2UpO1xyXG5cclxuICAgICAgLy8gcmVtb3ZlIHRoZSBldmVudCBoYW5kbGVyIGZyb20gdGhlIGludGVybmFsIGxpc3RcclxuICAgICAgdmFyIGluZGV4ID0gLTE7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuX2V2ZW50SGFuZGxlciwgZnVuY3Rpb24oZXZlbnRIYW5kbGVyLCBpKSB7XHJcbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSAmJiBldmVudEhhbmRsZXIuZ2VzdHVyZSA9PT0gZ2VzdHVyZSAmJiBldmVudEhhbmRsZXIuaGFuZGxlciA9PT0gaGFuZGxlcikge1xyXG4gICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwgdGhpcyk7XHJcblxyXG4gICAgICBpZiAoaW5kZXggPiAtMSkge1xyXG4gICAgICAgIHRoaXMuX2V2ZW50SGFuZGxlci5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB0cmlnZ2VyIGdlc3R1cmUgZXZlbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgIFtldmVudERhdGFdXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICB0cmlnZ2VyOiBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQoZ2VzdHVyZSwgZXZlbnREYXRhKSB7XHJcbiAgICAvLyBvcHRpb25hbFxyXG4gICAgaWYoIWV2ZW50RGF0YSkge1xyXG4gICAgICBldmVudERhdGEgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjcmVhdGUgRE9NIGV2ZW50XHJcbiAgICB2YXIgZXZlbnQgPSBIYW1tZXIuRE9DVU1FTlQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XHJcbiAgICBldmVudC5pbml0RXZlbnQoZ2VzdHVyZSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICBldmVudC5nZXN0dXJlID0gZXZlbnREYXRhO1xyXG5cclxuICAgIC8vIHRyaWdnZXIgb24gdGhlIHRhcmdldCBpZiBpdCBpcyBpbiB0aGUgaW5zdGFuY2UgZWxlbWVudCxcclxuICAgIC8vIHRoaXMgaXMgZm9yIGV2ZW50IGRlbGVnYXRpb24gdHJpY2tzXHJcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcclxuICAgIGlmKEhhbW1lci51dGlscy5oYXNQYXJlbnQoZXZlbnREYXRhLnRhcmdldCwgZWxlbWVudCkpIHtcclxuICAgICAgZWxlbWVudCA9IGV2ZW50RGF0YS50YXJnZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBlbmFibGUgb2YgZGlzYWJsZSBoYW1tZXIuanMgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge0Jvb2xlYW59ICAgc3RhdGVcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIGVuYWJsZTogZnVuY3Rpb24gZW5hYmxlKHN0YXRlKSB7XHJcbiAgICB0aGlzLmVuYWJsZWQgPSBzdGF0ZTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBkaXNwb3NlIHRoaXMgaGFtbWVyIGluc3RhbmNlXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBkaXNwb3NlOiBmdW5jdGlvbiBkaXNwb3NlKCkge1xyXG5cclxuICAgIC8vIHVuZG8gYWxsIGNoYW5nZXMgbWFkZSBieSBzdG9wX2Jyb3dzZXJfYmVoYXZpb3JcclxuICAgIGlmKHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLnN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHVuYmluZCBhbGwgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLl9ldmVudEhhbmRsZXIsIGZ1bmN0aW9uKGV2ZW50SGFuZGxlcikge1xyXG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudEhhbmRsZXIuZ2VzdHVyZSwgZXZlbnRIYW5kbGVyLmhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0sIHRoaXMpO1xyXG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgLy8gdW5iaW5kIHRoZSBzdGFydCBldmVudCBsaXN0ZW5lclxyXG4gICAgSGFtbWVyLmV2ZW50LnVuYmluZERvbSh0aGlzLmVsZW1lbnQsIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfU1RBUlRdLCB0aGlzLl9ldmVudFN0YXJ0SGFuZGxlcik7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIHRoaXMgaG9sZHMgdGhlIGxhc3QgbW92ZSBldmVudCxcclxuICogdXNlZCB0byBmaXggZW1wdHkgdG91Y2hlbmQgaXNzdWVcclxuICogc2VlIHRoZSBvblRvdWNoIGV2ZW50IGZvciBhbiBleHBsYW5hdGlvblxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKi9cclxudmFyIGxhc3RfbW92ZV9ldmVudCA9IG51bGw7XHJcblxyXG5cclxuLyoqXHJcbiAqIHdoZW4gdGhlIG1vdXNlIGlzIGhvbGQgZG93biwgdGhpcyBpcyB0cnVlXHJcbiAqIEB0eXBlIHtCb29sZWFufVxyXG4gKi9cclxudmFyIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuXHJcblxyXG4vKipcclxuICogd2hlbiB0b3VjaCBldmVudHMgaGF2ZSBiZWVuIGZpcmVkLCB0aGlzIGlzIHRydWVcclxuICogQHR5cGUge0Jvb2xlYW59XHJcbiAqL1xyXG52YXIgdG91Y2hfdHJpZ2dlcmVkID0gZmFsc2U7XHJcblxyXG5cclxuSGFtbWVyLmV2ZW50ID0ge1xyXG4gIC8qKlxyXG4gICAqIHNpbXBsZSBhZGRFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgdHlwZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgYmluZERvbTogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHR5cGVzID0gdHlwZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godHlwZXMsIGZ1bmN0aW9uKHR5cGUpe1xyXG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHNpbXBsZSByZW1vdmVFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgdHlwZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgdW5iaW5kRG9tOiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgdHlwZXMgPSB0eXBlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSl7XHJcbiAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdG91Y2ggZXZlbnRzIHdpdGggbW91c2UgZmFsbGJhY2tcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGUgICAgICAgIGxpa2UgSGFtbWVyLkVWRU5UX01PVkVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIG9uVG91Y2g6IGZ1bmN0aW9uIG9uVG91Y2goZWxlbWVudCwgZXZlbnRUeXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIGZuID0gZnVuY3Rpb24gYmluZERvbU9uVG91Y2goZXYpIHtcclxuICAgICAgdmFyIHNvdXJjZUV2ZW50VHlwZSA9IGV2LnR5cGUudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgIC8vIG9ubW91c2V1cCwgYnV0IHdoZW4gdG91Y2hlbmQgaGFzIGJlZW4gZmlyZWQgd2UgZG8gbm90aGluZy5cclxuICAgICAgLy8gdGhpcyBpcyBmb3IgdG91Y2hkZXZpY2VzIHdoaWNoIGFsc28gZmlyZSBhIG1vdXNldXAgb24gdG91Y2hlbmRcclxuICAgICAgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmIHRvdWNoX3RyaWdnZXJlZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gbW91c2VidXR0b24gbXVzdCBiZSBkb3duIG9yIGEgdG91Y2ggZXZlbnRcclxuICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNoLykgfHwgICAvLyB0b3VjaCBldmVudHMgYXJlIGFsd2F5cyBvbiBzY3JlZW5cclxuICAgICAgICBzb3VyY2VFdmVudFR5cGUubWF0Y2goL3BvaW50ZXJkb3duLykgfHwgLy8gcG9pbnRlcmV2ZW50cyB0b3VjaFxyXG4gICAgICAgIChzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgZXYud2hpY2ggPT09IDEpICAgLy8gbW91c2UgaXMgcHJlc3NlZFxyXG4gICAgICAgICkge1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBtb3VzZSBpc24ndCBwcmVzc2VkXHJcbiAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmICFldi53aGljaCkge1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIC8vIHdlIGFyZSBpbiBhIHRvdWNoIGV2ZW50LCBzZXQgdGhlIHRvdWNoIHRyaWdnZXJlZCBib29sIHRvIHRydWUsXHJcbiAgICAgIC8vIHRoaXMgZm9yIHRoZSBjb25mbGljdHMgdGhhdCBtYXkgb2NjdXIgb24gaW9zIGFuZCBhbmRyb2lkXHJcbiAgICAgIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2h8cG9pbnRlci8pKSB7XHJcbiAgICAgICAgdG91Y2hfdHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY291bnQgdGhlIHRvdGFsIHRvdWNoZXMgb24gdGhlIHNjcmVlblxyXG4gICAgICB2YXIgY291bnRfdG91Y2hlcyA9IDA7XHJcblxyXG4gICAgICAvLyB3aGVuIHRvdWNoIGhhcyBiZWVuIHRyaWdnZXJlZCBpbiB0aGlzIGRldGVjdGlvbiBzZXNzaW9uXHJcbiAgICAgIC8vIGFuZCB3ZSBhcmUgbm93IGhhbmRsaW5nIGEgbW91c2UgZXZlbnQsIHdlIHN0b3AgdGhhdCB0byBwcmV2ZW50IGNvbmZsaWN0c1xyXG4gICAgICBpZihlbmFibGVfZGV0ZWN0KSB7XHJcbiAgICAgICAgLy8gdXBkYXRlIHBvaW50ZXJldmVudFxyXG4gICAgICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyAmJiBldmVudFR5cGUgIT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQudXBkYXRlUG9pbnRlcihldmVudFR5cGUsIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdG91Y2hcclxuICAgICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2gvKSkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IGV2LnRvdWNoZXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBtb3VzZVxyXG4gICAgICAgIGVsc2UgaWYoIXRvdWNoX3RyaWdnZXJlZCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdXAvKSA/IDAgOiAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgd2UgYXJlIGluIGEgZW5kIGV2ZW50LCBidXQgd2hlbiB3ZSByZW1vdmUgb25lIHRvdWNoIGFuZFxyXG4gICAgICAgIC8vIHdlIHN0aWxsIGhhdmUgZW5vdWdoLCBzZXQgZXZlbnRUeXBlIHRvIG1vdmVcclxuICAgICAgICBpZihjb3VudF90b3VjaGVzID4gMCAmJiBldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgZXZlbnRUeXBlID0gSGFtbWVyLkVWRU5UX01PVkU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG5vIHRvdWNoZXMsIGZvcmNlIHRoZSBlbmQgZXZlbnRcclxuICAgICAgICBlbHNlIGlmKCFjb3VudF90b3VjaGVzKSB7XHJcbiAgICAgICAgICBldmVudFR5cGUgPSBIYW1tZXIuRVZFTlRfRU5EO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3RvcmUgdGhlIGxhc3QgbW92ZSBldmVudFxyXG4gICAgICAgIGlmKGNvdW50X3RvdWNoZXMgfHwgbGFzdF9tb3ZlX2V2ZW50ID09PSBudWxsKSB7XHJcbiAgICAgICAgICBsYXN0X21vdmVfZXZlbnQgPSBldjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgdGhlIGhhbmRsZXJcclxuICAgICAgICBoYW5kbGVyLmNhbGwoSGFtbWVyLmRldGVjdGlvbiwgc2VsZi5jb2xsZWN0RXZlbnREYXRhKGVsZW1lbnQsIGV2ZW50VHlwZSwgc2VsZi5nZXRUb3VjaExpc3QobGFzdF9tb3ZlX2V2ZW50LCBldmVudFR5cGUpLCBldikpO1xyXG5cclxuICAgICAgICAvLyByZW1vdmUgcG9pbnRlcmV2ZW50IGZyb20gbGlzdFxyXG4gICAgICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyAmJiBldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQudXBkYXRlUG9pbnRlcihldmVudFR5cGUsIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG9uIHRoZSBlbmQgd2UgcmVzZXQgZXZlcnl0aGluZ1xyXG4gICAgICBpZighY291bnRfdG91Y2hlcykge1xyXG4gICAgICAgIGxhc3RfbW92ZV9ldmVudCA9IG51bGw7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG4gICAgICAgIHRvdWNoX3RyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIEhhbW1lci5Qb2ludGVyRXZlbnQucmVzZXQoKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmJpbmREb20oZWxlbWVudCwgSGFtbWVyLkVWRU5UX1RZUEVTW2V2ZW50VHlwZV0sIGZuKTtcclxuXHJcbiAgICAvLyByZXR1cm4gdGhlIGJvdW5kIGZ1bmN0aW9uIHRvIGJlIGFibGUgdG8gdW5iaW5kIGl0IGxhdGVyXHJcbiAgICByZXR1cm4gZm47XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogd2UgaGF2ZSBkaWZmZXJlbnQgZXZlbnRzIGZvciBlYWNoIGRldmljZS9icm93c2VyXHJcbiAgICogZGV0ZXJtaW5lIHdoYXQgd2UgbmVlZCBhbmQgc2V0IHRoZW0gaW4gdGhlIEhhbW1lci5FVkVOVF9UWVBFUyBjb25zdGFudFxyXG4gICAqL1xyXG4gIGRldGVybWluZUV2ZW50VHlwZXM6IGZ1bmN0aW9uIGRldGVybWluZUV2ZW50VHlwZXMoKSB7XHJcbiAgICAvLyBkZXRlcm1pbmUgdGhlIGV2ZW50dHlwZSB3ZSB3YW50IHRvIHNldFxyXG4gICAgdmFyIHR5cGVzO1xyXG5cclxuICAgIC8vIHBvaW50ZXJFdmVudHMgbWFnaWNcclxuICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUykge1xyXG4gICAgICB0eXBlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQuZ2V0RXZlbnRzKCk7XHJcbiAgICB9XHJcbiAgICAvLyBvbiBBbmRyb2lkLCBpT1MsIGJsYWNrYmVycnksIHdpbmRvd3MgbW9iaWxlIHdlIGRvbnQgd2FudCBhbnkgbW91c2VldmVudHNcclxuICAgIGVsc2UgaWYoSGFtbWVyLk5PX01PVVNFRVZFTlRTKSB7XHJcbiAgICAgIHR5cGVzID0gW1xyXG4gICAgICAgICd0b3VjaHN0YXJ0JyxcclxuICAgICAgICAndG91Y2htb3ZlJyxcclxuICAgICAgICAndG91Y2hlbmQgdG91Y2hjYW5jZWwnXTtcclxuICAgIH1cclxuICAgIC8vIGZvciBub24gcG9pbnRlciBldmVudHMgYnJvd3NlcnMgYW5kIG1peGVkIGJyb3dzZXJzLFxyXG4gICAgLy8gbGlrZSBjaHJvbWUgb24gd2luZG93czggdG91Y2ggbGFwdG9wXHJcbiAgICBlbHNlIHtcclxuICAgICAgdHlwZXMgPSBbXHJcbiAgICAgICAgJ3RvdWNoc3RhcnQgbW91c2Vkb3duJyxcclxuICAgICAgICAndG91Y2htb3ZlIG1vdXNlbW92ZScsXHJcbiAgICAgICAgJ3RvdWNoZW5kIHRvdWNoY2FuY2VsIG1vdXNldXAnXTtcclxuICAgIH1cclxuXHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX1NUQVJUXSA9IHR5cGVzWzBdO1xyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9NT1ZFXSA9IHR5cGVzWzFdO1xyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9FTkRdID0gdHlwZXNbMl07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNyZWF0ZSB0b3VjaGxpc3QgZGVwZW5kaW5nIG9uIHRoZSBldmVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgZXZlbnRUeXBlICAgdXNlZCBieSB0aGUgZmFrZW11bHRpdG91Y2ggcGx1Z2luXHJcbiAgICovXHJcbiAgZ2V0VG91Y2hMaXN0OiBmdW5jdGlvbiBnZXRUb3VjaExpc3QoZXYvKiwgZXZlbnRUeXBlKi8pIHtcclxuICAgIC8vIGdldCB0aGUgZmFrZSBwb2ludGVyRXZlbnQgdG91Y2hsaXN0XHJcbiAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMpIHtcclxuICAgICAgcmV0dXJuIEhhbW1lci5Qb2ludGVyRXZlbnQuZ2V0VG91Y2hMaXN0KCk7XHJcbiAgICB9XHJcbiAgICAvLyBnZXQgdGhlIHRvdWNobGlzdFxyXG4gICAgZWxzZSBpZihldi50b3VjaGVzKSB7XHJcbiAgICAgIHJldHVybiBldi50b3VjaGVzO1xyXG4gICAgfVxyXG4gICAgLy8gbWFrZSBmYWtlIHRvdWNobGlzdCBmcm9tIG1vdXNlIHBvc2l0aW9uXHJcbiAgICBlbHNlIHtcclxuICAgICAgZXYuaWRlbnRpZmllciA9IDE7XHJcbiAgICAgIHJldHVybiBbZXZdO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjb2xsZWN0IGV2ZW50IGRhdGEgZm9yIEhhbW1lciBqc1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZSAgICAgICAgbGlrZSBIYW1tZXIuRVZFTlRfTU9WRVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBldmVudERhdGFcclxuICAgKi9cclxuICBjb2xsZWN0RXZlbnREYXRhOiBmdW5jdGlvbiBjb2xsZWN0RXZlbnREYXRhKGVsZW1lbnQsIGV2ZW50VHlwZSwgdG91Y2hlcywgZXYpIHtcclxuICAgIC8vIGZpbmQgb3V0IHBvaW50ZXJUeXBlXHJcbiAgICB2YXIgcG9pbnRlclR5cGUgPSBIYW1tZXIuUE9JTlRFUl9UT1VDSDtcclxuICAgIGlmKGV2LnR5cGUubWF0Y2goL21vdXNlLykgfHwgSGFtbWVyLlBvaW50ZXJFdmVudC5tYXRjaFR5cGUoSGFtbWVyLlBPSU5URVJfTU9VU0UsIGV2KSkge1xyXG4gICAgICBwb2ludGVyVHlwZSA9IEhhbW1lci5QT0lOVEVSX01PVVNFO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNlbnRlciAgICAgOiBIYW1tZXIudXRpbHMuZ2V0Q2VudGVyKHRvdWNoZXMpLFxyXG4gICAgICB0aW1lU3RhbXAgIDogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcbiAgICAgIHRhcmdldCAgICAgOiBldi50YXJnZXQsXHJcbiAgICAgIHRvdWNoZXMgICAgOiB0b3VjaGVzLFxyXG4gICAgICBldmVudFR5cGUgIDogZXZlbnRUeXBlLFxyXG4gICAgICBwb2ludGVyVHlwZTogcG9pbnRlclR5cGUsXHJcbiAgICAgIHNyY0V2ZW50ICAgOiBldixcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBwcmV2ZW50IHRoZSBicm93c2VyIGRlZmF1bHQgYWN0aW9uc1xyXG4gICAgICAgKiBtb3N0bHkgdXNlZCB0byBkaXNhYmxlIHNjcm9sbGluZyBvZiB0aGUgYnJvd3NlclxyXG4gICAgICAgKi9cclxuICAgICAgcHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmKHRoaXMuc3JjRXZlbnQucHJldmVudE1hbmlwdWxhdGlvbikge1xyXG4gICAgICAgICAgdGhpcy5zcmNFdmVudC5wcmV2ZW50TWFuaXB1bGF0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLnNyY0V2ZW50LnByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgICB0aGlzLnNyY0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHN0b3AgYnViYmxpbmcgdGhlIGV2ZW50IHVwIHRvIGl0cyBwYXJlbnRzXHJcbiAgICAgICAqL1xyXG4gICAgICBzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuc3JjRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogaW1tZWRpYXRlbHkgc3RvcCBnZXN0dXJlIGRldGVjdGlvblxyXG4gICAgICAgKiBtaWdodCBiZSB1c2VmdWwgYWZ0ZXIgYSBzd2lwZSB3YXMgZGV0ZWN0ZWRcclxuICAgICAgICogQHJldHVybiB7Kn1cclxuICAgICAgICovXHJcbiAgICAgIHN0b3BEZXRlY3Q6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBIYW1tZXIuZGV0ZWN0aW9uLnN0b3BEZXRlY3QoKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG5IYW1tZXIuUG9pbnRlckV2ZW50ID0ge1xyXG4gIC8qKlxyXG4gICAqIGhvbGRzIGFsbCBwb2ludGVyc1xyXG4gICAqIEB0eXBlIHtPYmplY3R9XHJcbiAgICovXHJcbiAgcG9pbnRlcnM6IHt9LFxyXG5cclxuICAvKipcclxuICAgKiBnZXQgYSBsaXN0IG9mIHBvaW50ZXJzXHJcbiAgICogQHJldHVybnMge0FycmF5fSAgICAgdG91Y2hsaXN0XHJcbiAgICovXHJcbiAgZ2V0VG91Y2hMaXN0OiBmdW5jdGlvbigpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciB0b3VjaGxpc3QgPSBbXTtcclxuXHJcbiAgICAvLyB3ZSBjYW4gdXNlIGZvckVhY2ggc2luY2UgcG9pbnRlckV2ZW50cyBvbmx5IGlzIGluIElFMTBcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHNlbGYucG9pbnRlcnMsIGZ1bmN0aW9uKHBvaW50ZXIpe1xyXG4gICAgICB0b3VjaGxpc3QucHVzaChwb2ludGVyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0b3VjaGxpc3Q7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogdXBkYXRlIHRoZSBwb3NpdGlvbiBvZiBhIHBvaW50ZXJcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgIHR5cGUgICAgICAgICAgICAgSGFtbWVyLkVWRU5UX0VORFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgcG9pbnRlckV2ZW50XHJcbiAgICovXHJcbiAgdXBkYXRlUG9pbnRlcjogZnVuY3Rpb24odHlwZSwgcG9pbnRlckV2ZW50KSB7XHJcbiAgICBpZih0eXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgZGVsZXRlIHRoaXMucG9pbnRlcnNbcG9pbnRlckV2ZW50LnBvaW50ZXJJZF07XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcG9pbnRlckV2ZW50LmlkZW50aWZpZXIgPSBwb2ludGVyRXZlbnQucG9pbnRlcklkO1xyXG4gICAgICB0aGlzLnBvaW50ZXJzW3BvaW50ZXJFdmVudC5wb2ludGVySWRdID0gcG9pbnRlckV2ZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnBvaW50ZXJzKS5sZW5ndGg7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogY2hlY2sgaWYgZXYgbWF0Y2hlcyBwb2ludGVydHlwZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBwb2ludGVyVHlwZSAgICAgSGFtbWVyLlBPSU5URVJfTU9VU0VcclxuICAgKiBAcGFyYW0gICB7UG9pbnRlckV2ZW50fSAgZXZcclxuICAgKi9cclxuICBtYXRjaFR5cGU6IGZ1bmN0aW9uKHBvaW50ZXJUeXBlLCBldikge1xyXG4gICAgaWYoIWV2LnBvaW50ZXJUeXBlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHQgPSBldi5wb2ludGVyVHlwZSxcclxuICAgICAgdHlwZXMgPSB7fTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX01PVVNFXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfTU9VU0UgfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX01PVVNFKTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX1RPVUNIXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfVE9VQ0ggfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX1RPVUNIKTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX1BFTl0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX1BFTiB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfUEVOKTtcclxuICAgIHJldHVybiB0eXBlc1twb2ludGVyVHlwZV07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCBldmVudHNcclxuICAgKi9cclxuICBnZXRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgJ3BvaW50ZXJkb3duIE1TUG9pbnRlckRvd24nLFxyXG4gICAgICAncG9pbnRlcm1vdmUgTVNQb2ludGVyTW92ZScsXHJcbiAgICAgICdwb2ludGVydXAgcG9pbnRlcmNhbmNlbCBNU1BvaW50ZXJVcCBNU1BvaW50ZXJDYW5jZWwnXHJcbiAgICBdO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIHJlc2V0IHRoZSBsaXN0XHJcbiAgICovXHJcbiAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5wb2ludGVycyA9IHt9O1xyXG4gIH1cclxufTtcclxuXHJcblxyXG5IYW1tZXIuZGV0ZWN0aW9uID0ge1xyXG4gIC8vIGNvbnRhaW5zIGFsbCByZWdpc3RyZWQgSGFtbWVyLmdlc3R1cmVzIGluIHRoZSBjb3JyZWN0IG9yZGVyXHJcbiAgZ2VzdHVyZXM6IFtdLFxyXG5cclxuICAvLyBkYXRhIG9mIHRoZSBjdXJyZW50IEhhbW1lci5nZXN0dXJlIGRldGVjdGlvbiBzZXNzaW9uXHJcbiAgY3VycmVudCA6IG51bGwsXHJcblxyXG4gIC8vIHRoZSBwcmV2aW91cyBIYW1tZXIuZ2VzdHVyZSBzZXNzaW9uIGRhdGFcclxuICAvLyBpcyBhIGZ1bGwgY2xvbmUgb2YgdGhlIHByZXZpb3VzIGdlc3R1cmUuY3VycmVudCBvYmplY3RcclxuICBwcmV2aW91czogbnVsbCxcclxuXHJcbiAgLy8gd2hlbiB0aGlzIGJlY29tZXMgdHJ1ZSwgbm8gZ2VzdHVyZXMgYXJlIGZpcmVkXHJcbiAgc3RvcHBlZCA6IGZhbHNlLFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc3RhcnQgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge0hhbW1lci5JbnN0YW5jZX0gICBpbnN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgICAgICBldmVudERhdGFcclxuICAgKi9cclxuICBzdGFydERldGVjdDogZnVuY3Rpb24gc3RhcnREZXRlY3QoaW5zdCwgZXZlbnREYXRhKSB7XHJcbiAgICAvLyBhbHJlYWR5IGJ1c3kgd2l0aCBhIEhhbW1lci5nZXN0dXJlIGRldGVjdGlvbiBvbiBhbiBlbGVtZW50XHJcbiAgICBpZih0aGlzLmN1cnJlbnQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RvcHBlZCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuY3VycmVudCA9IHtcclxuICAgICAgaW5zdCAgICAgIDogaW5zdCwgLy8gcmVmZXJlbmNlIHRvIEhhbW1lckluc3RhbmNlIHdlJ3JlIHdvcmtpbmcgZm9yXHJcbiAgICAgIHN0YXJ0RXZlbnQ6IEhhbW1lci51dGlscy5leHRlbmQoe30sIGV2ZW50RGF0YSksIC8vIHN0YXJ0IGV2ZW50RGF0YSBmb3IgZGlzdGFuY2VzLCB0aW1pbmcgZXRjXHJcbiAgICAgIGxhc3RFdmVudCA6IGZhbHNlLCAvLyBsYXN0IGV2ZW50RGF0YVxyXG4gICAgICBsYXN0VkV2ZW50OiBmYWxzZSwgLy8gbGFzdCBldmVudERhdGEgZm9yIHZlbG9jaXR5LlxyXG4gICAgICB2ZWxvY2l0eSAgOiBmYWxzZSwgLy8gY3VycmVudCB2ZWxvY2l0eVxyXG4gICAgICBuYW1lICAgICAgOiAnJyAvLyBjdXJyZW50IGdlc3R1cmUgd2UncmUgaW4vZGV0ZWN0ZWQsIGNhbiBiZSAndGFwJywgJ2hvbGQnIGV0Y1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmRldGVjdChldmVudERhdGEpO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldmVudERhdGFcclxuICAgKi9cclxuICBkZXRlY3Q6IGZ1bmN0aW9uIGRldGVjdChldmVudERhdGEpIHtcclxuICAgIGlmKCF0aGlzLmN1cnJlbnQgfHwgdGhpcy5zdG9wcGVkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRlbmQgZXZlbnQgZGF0YSB3aXRoIGNhbGN1bGF0aW9ucyBhYm91dCBzY2FsZSwgZGlzdGFuY2UgZXRjXHJcbiAgICBldmVudERhdGEgPSB0aGlzLmV4dGVuZEV2ZW50RGF0YShldmVudERhdGEpO1xyXG5cclxuICAgIC8vIGluc3RhbmNlIG9wdGlvbnNcclxuICAgIHZhciBpbnN0X29wdGlvbnMgPSB0aGlzLmN1cnJlbnQuaW5zdC5vcHRpb25zO1xyXG5cclxuICAgIC8vIGNhbGwgSGFtbWVyLmdlc3R1cmUgaGFuZGxlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgLy8gb25seSB3aGVuIHRoZSBpbnN0YW5jZSBvcHRpb25zIGhhdmUgZW5hYmxlZCB0aGlzIGdlc3R1cmVcclxuICAgICAgaWYoIXRoaXMuc3RvcHBlZCAmJiBpbnN0X29wdGlvbnNbZ2VzdHVyZS5uYW1lXSAhPT0gZmFsc2UpIHtcclxuICAgICAgICAvLyBpZiBhIGhhbmRsZXIgcmV0dXJucyBmYWxzZSwgd2Ugc3RvcCB3aXRoIHRoZSBkZXRlY3Rpb25cclxuICAgICAgICBpZihnZXN0dXJlLmhhbmRsZXIuY2FsbChnZXN0dXJlLCBldmVudERhdGEsIHRoaXMuY3VycmVudC5pbnN0KSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHRoaXMuc3RvcERldGVjdCgpO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSwgdGhpcyk7XHJcblxyXG4gICAgLy8gc3RvcmUgYXMgcHJldmlvdXMgZXZlbnQgZXZlbnRcclxuICAgIGlmKHRoaXMuY3VycmVudCkge1xyXG4gICAgICB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ID0gZXZlbnREYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVuZGV2ZW50LCBidXQgbm90IHRoZSBsYXN0IHRvdWNoLCBzbyBkb250IHN0b3BcclxuICAgIGlmKGV2ZW50RGF0YS5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCAmJiAhZXZlbnREYXRhLnRvdWNoZXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICB0aGlzLnN0b3BEZXRlY3QoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXZlbnREYXRhO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjbGVhciB0aGUgSGFtbWVyLmdlc3R1cmUgdmFyc1xyXG4gICAqIHRoaXMgaXMgY2FsbGVkIG9uIGVuZERldGVjdCwgYnV0IGNhbiBhbHNvIGJlIHVzZWQgd2hlbiBhIGZpbmFsIEhhbW1lci5nZXN0dXJlIGhhcyBiZWVuIGRldGVjdGVkXHJcbiAgICogdG8gc3RvcCBvdGhlciBIYW1tZXIuZ2VzdHVyZXMgZnJvbSBiZWluZyBmaXJlZFxyXG4gICAqL1xyXG4gIHN0b3BEZXRlY3Q6IGZ1bmN0aW9uIHN0b3BEZXRlY3QoKSB7XHJcbiAgICAvLyBjbG9uZSBjdXJyZW50IGRhdGEgdG8gdGhlIHN0b3JlIGFzIHRoZSBwcmV2aW91cyBnZXN0dXJlXHJcbiAgICAvLyB1c2VkIGZvciB0aGUgZG91YmxlIHRhcCBnZXN0dXJlLCBzaW5jZSB0aGlzIGlzIGFuIG90aGVyIGdlc3R1cmUgZGV0ZWN0IHNlc3Npb25cclxuICAgIHRoaXMucHJldmlvdXMgPSBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCB0aGlzLmN1cnJlbnQpO1xyXG5cclxuICAgIC8vIHJlc2V0IHRoZSBjdXJyZW50XHJcbiAgICB0aGlzLmN1cnJlbnQgPSBudWxsO1xyXG5cclxuICAgIC8vIHN0b3BwZWQhXHJcbiAgICB0aGlzLnN0b3BwZWQgPSB0cnVlO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBleHRlbmQgZXZlbnREYXRhIGZvciBIYW1tZXIuZ2VzdHVyZXNcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgIGV2XHJcbiAgICogQHJldHVybnMge09iamVjdH0gICBldlxyXG4gICAqL1xyXG4gIGV4dGVuZEV2ZW50RGF0YTogZnVuY3Rpb24gZXh0ZW5kRXZlbnREYXRhKGV2KSB7XHJcbiAgICB2YXIgc3RhcnRFdiA9IHRoaXMuY3VycmVudC5zdGFydEV2ZW50LFxyXG4gICAgICAgIGxhc3RWRXYgPSB0aGlzLmN1cnJlbnQubGFzdFZFdmVudDtcclxuXHJcbiAgICAvLyBpZiB0aGUgdG91Y2hlcyBjaGFuZ2UsIHNldCB0aGUgbmV3IHRvdWNoZXMgb3ZlciB0aGUgc3RhcnRFdmVudCB0b3VjaGVzXHJcbiAgICAvLyB0aGlzIGJlY2F1c2UgdG91Y2hldmVudHMgZG9uJ3QgaGF2ZSBhbGwgdGhlIHRvdWNoZXMgb24gdG91Y2hzdGFydCwgb3IgdGhlXHJcbiAgICAvLyB1c2VyIG11c3QgcGxhY2UgaGlzIGZpbmdlcnMgYXQgdGhlIEVYQUNUIHNhbWUgdGltZSBvbiB0aGUgc2NyZWVuLCB3aGljaCBpcyBub3QgcmVhbGlzdGljXHJcbiAgICAvLyBidXQsIHNvbWV0aW1lcyBpdCBoYXBwZW5zIHRoYXQgYm90aCBmaW5nZXJzIGFyZSB0b3VjaGluZyBhdCB0aGUgRVhBQ1Qgc2FtZSB0aW1lXHJcbiAgICBpZihzdGFydEV2ICYmIChldi50b3VjaGVzLmxlbmd0aCAhPSBzdGFydEV2LnRvdWNoZXMubGVuZ3RoIHx8IGV2LnRvdWNoZXMgPT09IHN0YXJ0RXYudG91Y2hlcykpIHtcclxuICAgICAgLy8gZXh0ZW5kIDEgbGV2ZWwgZGVlcCB0byBnZXQgdGhlIHRvdWNobGlzdCB3aXRoIHRoZSB0b3VjaCBvYmplY3RzXHJcbiAgICAgIHN0YXJ0RXYudG91Y2hlcyA9IFtdO1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChldi50b3VjaGVzLCBmdW5jdGlvbih0b3VjaCkge1xyXG4gICAgICAgIHN0YXJ0RXYudG91Y2hlcy5wdXNoKEhhbW1lci51dGlscy5leHRlbmQoe30sIHRvdWNoKSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkZWx0YV90aW1lID0gZXYudGltZVN0YW1wIC0gc3RhcnRFdi50aW1lU3RhbXBcclxuICAgICAgLCBkZWx0YV94ID0gZXYuY2VudGVyLnBhZ2VYIC0gc3RhcnRFdi5jZW50ZXIucGFnZVhcclxuICAgICAgLCBkZWx0YV95ID0gZXYuY2VudGVyLnBhZ2VZIC0gc3RhcnRFdi5jZW50ZXIucGFnZVlcclxuICAgICAgLCBpbnRlcmltQW5nbGVcclxuICAgICAgLCBpbnRlcmltRGlyZWN0aW9uXHJcbiAgICAgICwgdmVsb2NpdHkgPSB0aGlzLmN1cnJlbnQudmVsb2NpdHk7XHJcblxyXG4gICAgaWYgKGxhc3RWRXYgIT09IGZhbHNlICYmIGV2LnRpbWVTdGFtcCAtIGxhc3RWRXYudGltZVN0YW1wID4gSGFtbWVyLlVQREFURV9WRUxPQ0lUWV9JTlRFUlZBTCkge1xyXG5cclxuICAgICAgICB2ZWxvY2l0eSA9ICBIYW1tZXIudXRpbHMuZ2V0VmVsb2NpdHkoZXYudGltZVN0YW1wIC0gbGFzdFZFdi50aW1lU3RhbXAsIGV2LmNlbnRlci5wYWdlWCAtIGxhc3RWRXYuY2VudGVyLnBhZ2VYLCBldi5jZW50ZXIucGFnZVkgLSBsYXN0VkV2LmNlbnRlci5wYWdlWSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQgPSBldjtcclxuXHJcbiAgICAgICAgaWYgKHZlbG9jaXR5LnggPiAwICYmIHZlbG9jaXR5LnkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudC52ZWxvY2l0eSA9IHZlbG9jaXR5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYodGhpcy5jdXJyZW50LnZlbG9jaXR5ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZlbG9jaXR5ID0gSGFtbWVyLnV0aWxzLmdldFZlbG9jaXR5KGRlbHRhX3RpbWUsIGRlbHRhX3gsIGRlbHRhX3kpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudC52ZWxvY2l0eSA9IHZlbG9jaXR5O1xyXG4gICAgICAgIHRoaXMuY3VycmVudC5sYXN0VkV2ZW50ID0gZXY7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZW5kIGV2ZW50cyAoZS5nLiBkcmFnZW5kKSBkb24ndCBoYXZlIHVzZWZ1bCB2YWx1ZXMgZm9yIGludGVyaW1EaXJlY3Rpb24gJiBpbnRlcmltQW5nbGVcclxuICAgIC8vIGJlY2F1c2UgdGhlIHByZXZpb3VzIGV2ZW50IGhhcyBleGFjdGx5IHRoZSBzYW1lIGNvb3JkaW5hdGVzXHJcbiAgICAvLyBzbyBmb3IgZW5kIGV2ZW50cywgdGFrZSB0aGUgcHJldmlvdXMgdmFsdWVzIG9mIGludGVyaW1EaXJlY3Rpb24gJiBpbnRlcmltQW5nbGVcclxuICAgIC8vIGluc3RlYWQgb2YgcmVjYWxjdWxhdGluZyB0aGVtIGFuZCBnZXR0aW5nIGEgc3B1cmlvdXMgJzAnXHJcbiAgICBpZihldi5ldmVudFR5cGUgPT09ICdlbmQnKSB7XHJcbiAgICAgIGludGVyaW1BbmdsZSA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgdGhpcy5jdXJyZW50Lmxhc3RFdmVudC5pbnRlcmltQW5nbGU7XHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb24gPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIHRoaXMuY3VycmVudC5sYXN0RXZlbnQuaW50ZXJpbURpcmVjdGlvbjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBpbnRlcmltQW5nbGUgPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIEhhbW1lci51dGlscy5nZXRBbmdsZSh0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmNlbnRlciwgZXYuY2VudGVyKTtcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbiA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgSGFtbWVyLnV0aWxzLmdldERpcmVjdGlvbih0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmNlbnRlciwgZXYuY2VudGVyKTtcclxuICAgIH1cclxuXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKGV2LCB7XHJcbiAgICAgIGRlbHRhVGltZTogZGVsdGFfdGltZSxcclxuXHJcbiAgICAgIGRlbHRhWDogZGVsdGFfeCxcclxuICAgICAgZGVsdGFZOiBkZWx0YV95LFxyXG5cclxuICAgICAgdmVsb2NpdHlYOiB2ZWxvY2l0eS54LFxyXG4gICAgICB2ZWxvY2l0eVk6IHZlbG9jaXR5LnksXHJcblxyXG4gICAgICBkaXN0YW5jZTogSGFtbWVyLnV0aWxzLmdldERpc3RhbmNlKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG5cclxuICAgICAgYW5nbGU6IEhhbW1lci51dGlscy5nZXRBbmdsZShzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuICAgICAgaW50ZXJpbUFuZ2xlOiBpbnRlcmltQW5nbGUsXHJcblxyXG4gICAgICBkaXJlY3Rpb246IEhhbW1lci51dGlscy5nZXREaXJlY3Rpb24oc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb246IGludGVyaW1EaXJlY3Rpb24sXHJcblxyXG4gICAgICBzY2FsZTogSGFtbWVyLnV0aWxzLmdldFNjYWxlKHN0YXJ0RXYudG91Y2hlcywgZXYudG91Y2hlcyksXHJcbiAgICAgIHJvdGF0aW9uOiBIYW1tZXIudXRpbHMuZ2V0Um90YXRpb24oc3RhcnRFdi50b3VjaGVzLCBldi50b3VjaGVzKSxcclxuXHJcbiAgICAgIHN0YXJ0RXZlbnQ6IHN0YXJ0RXZcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBldjtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogcmVnaXN0ZXIgbmV3IGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBnZXN0dXJlIG9iamVjdCwgc2VlIGdlc3R1cmVzLmpzIGZvciBkb2N1bWVudGF0aW9uXHJcbiAgICogQHJldHVybnMge0FycmF5fSAgICAgZ2VzdHVyZXNcclxuICAgKi9cclxuICByZWdpc3RlcjogZnVuY3Rpb24gcmVnaXN0ZXIoZ2VzdHVyZSkge1xyXG4gICAgLy8gYWRkIGFuIGVuYWJsZSBnZXN0dXJlIG9wdGlvbnMgaWYgdGhlcmUgaXMgbm8gZ2l2ZW5cclxuICAgIHZhciBvcHRpb25zID0gZ2VzdHVyZS5kZWZhdWx0cyB8fCB7fTtcclxuICAgIGlmKG9wdGlvbnNbZ2VzdHVyZS5uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG9wdGlvbnNbZ2VzdHVyZS5uYW1lXSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0ZW5kIEhhbW1lciBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgSGFtbWVyLmdlc3R1cmUgb3B0aW9uc1xyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZChIYW1tZXIuZGVmYXVsdHMsIG9wdGlvbnMsIHRydWUpO1xyXG5cclxuICAgIC8vIHNldCBpdHMgaW5kZXhcclxuICAgIGdlc3R1cmUuaW5kZXggPSBnZXN0dXJlLmluZGV4IHx8IDEwMDA7XHJcblxyXG4gICAgLy8gYWRkIEhhbW1lci5nZXN0dXJlIHRvIHRoZSBsaXN0XHJcbiAgICB0aGlzLmdlc3R1cmVzLnB1c2goZ2VzdHVyZSk7XHJcblxyXG4gICAgLy8gc29ydCB0aGUgbGlzdCBieSBpbmRleFxyXG4gICAgdGhpcy5nZXN0dXJlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgaWYoYS5pbmRleCA8IGIuaW5kZXgpIHsgcmV0dXJuIC0xOyB9XHJcbiAgICAgIGlmKGEuaW5kZXggPiBiLmluZGV4KSB7IHJldHVybiAxOyB9XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZ2VzdHVyZXM7XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBEcmFnXHJcbiAqIE1vdmUgd2l0aCB4IGZpbmdlcnMgKGRlZmF1bHQgMSkgYXJvdW5kIG9uIHRoZSBwYWdlLiBCbG9ja2luZyB0aGUgc2Nyb2xsaW5nIHdoZW5cclxuICogbW92aW5nIGxlZnQgYW5kIHJpZ2h0IGlzIGEgZ29vZCBwcmFjdGljZS4gV2hlbiBhbGwgdGhlIGRyYWcgZXZlbnRzIGFyZSBibG9ja2luZ1xyXG4gKiB5b3UgZGlzYWJsZSBzY3JvbGxpbmcgb24gdGhhdCBhcmVhLlxyXG4gKiBAZXZlbnRzICBkcmFnLCBkcmFwbGVmdCwgZHJhZ3JpZ2h0LCBkcmFndXAsIGRyYWdkb3duXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuRHJhZyA9IHtcclxuICBuYW1lICAgICA6ICdkcmFnJyxcclxuICBpbmRleCAgICA6IDUwLFxyXG4gIGRlZmF1bHRzIDoge1xyXG4gICAgZHJhZ19taW5fZGlzdGFuY2UgICAgICAgICAgICA6IDEwLFxyXG5cclxuICAgIC8vIFNldCBjb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZSB0byB0cnVlIHRvIG1ha2UgdGhlIHN0YXJ0aW5nIHBvaW50IG9mIHRoZSBkcmFnXHJcbiAgICAvLyBiZSBjYWxjdWxhdGVkIGZyb20gd2hlcmUgdGhlIGRyYWcgd2FzIHRyaWdnZXJlZCwgbm90IGZyb20gd2hlcmUgdGhlIHRvdWNoIHN0YXJ0ZWQuXHJcbiAgICAvLyBVc2VmdWwgdG8gYXZvaWQgYSBqZXJrLXN0YXJ0aW5nIGRyYWcsIHdoaWNoIGNhbiBtYWtlIGZpbmUtYWRqdXN0bWVudHNcclxuICAgIC8vIHRocm91Z2ggZHJhZ2dpbmcgZGlmZmljdWx0LCBhbmQgYmUgdmlzdWFsbHkgdW5hcHBlYWxpbmcuXHJcbiAgICBjb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZTogdHJ1ZSxcclxuXHJcbiAgICAvLyBzZXQgMCBmb3IgdW5saW1pdGVkLCBidXQgdGhpcyBjYW4gY29uZmxpY3Qgd2l0aCB0cmFuc2Zvcm1cclxuICAgIGRyYWdfbWF4X3RvdWNoZXMgICAgICAgICAgICAgOiAxLFxyXG5cclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCBicm93c2VyIGJlaGF2aW9yIHdoZW4gZHJhZ2dpbmcgb2NjdXJzXHJcbiAgICAvLyBiZSBjYXJlZnVsIHdpdGggaXQsIGl0IG1ha2VzIHRoZSBlbGVtZW50IGEgYmxvY2tpbmcgZWxlbWVudFxyXG4gICAgLy8gd2hlbiB5b3UgYXJlIHVzaW5nIHRoZSBkcmFnIGdlc3R1cmUsIGl0IGlzIGEgZ29vZCBwcmFjdGljZSB0byBzZXQgdGhpcyB0cnVlXHJcbiAgICBkcmFnX2Jsb2NrX2hvcml6b250YWwgICAgICAgIDogZmFsc2UsXHJcbiAgICBkcmFnX2Jsb2NrX3ZlcnRpY2FsICAgICAgICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZHJhZ19sb2NrX3RvX2F4aXMga2VlcHMgdGhlIGRyYWcgZ2VzdHVyZSBvbiB0aGUgYXhpcyB0aGF0IGl0IHN0YXJ0ZWQgb24sXHJcbiAgICAvLyBJdCBkaXNhbGxvd3MgdmVydGljYWwgZGlyZWN0aW9ucyBpZiB0aGUgaW5pdGlhbCBkaXJlY3Rpb24gd2FzIGhvcml6b250YWwsIGFuZCB2aWNlIHZlcnNhLlxyXG4gICAgZHJhZ19sb2NrX3RvX2F4aXMgICAgICAgICAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRyYWcgbG9jayBvbmx5IGtpY2tzIGluIHdoZW4gZGlzdGFuY2UgPiBkcmFnX2xvY2tfbWluX2Rpc3RhbmNlXHJcbiAgICAvLyBUaGlzIHdheSwgbG9ja2luZyBvY2N1cnMgb25seSB3aGVuIHRoZSBkaXN0YW5jZSBoYXMgYmVjb21lIGxhcmdlIGVub3VnaCB0byByZWxpYWJseSBkZXRlcm1pbmUgdGhlIGRpcmVjdGlvblxyXG4gICAgZHJhZ19sb2NrX21pbl9kaXN0YW5jZSAgICAgICA6IDI1XHJcbiAgfSxcclxuXHJcbiAgdHJpZ2dlcmVkOiBmYWxzZSxcclxuICBoYW5kbGVyICA6IGZ1bmN0aW9uIGRyYWdHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICAvLyBjdXJyZW50IGdlc3R1cmUgaXNudCBkcmFnLCBidXQgZHJhZ2dlZCBpcyB0cnVlXHJcbiAgICAvLyB0aGlzIG1lYW5zIGFuIG90aGVyIGdlc3R1cmUgaXMgYnVzeS4gbm93IGNhbGwgZHJhZ2VuZFxyXG4gICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lICYmIHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWF4IHRvdWNoZXNcclxuICAgIGlmKGluc3Qub3B0aW9ucy5kcmFnX21heF90b3VjaGVzID4gMCAmJlxyXG4gICAgICBldi50b3VjaGVzLmxlbmd0aCA+IGluc3Qub3B0aW9ucy5kcmFnX21heF90b3VjaGVzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgICAgaWYoZXYuZGlzdGFuY2UgPCBpbnN0Lm9wdGlvbnMuZHJhZ19taW5fZGlzdGFuY2UgJiZcclxuICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2UgYXJlIGRyYWdnaW5nIVxyXG4gICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSkge1xyXG4gICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcbiAgICAgICAgICBpZihpbnN0Lm9wdGlvbnMuY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2UgJiYgZXYuZGlzdGFuY2UgPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gYSBkcmFnIGlzIHRyaWdnZXJlZCwgc2V0IHRoZSBldmVudCBjZW50ZXIgdG8gZHJhZ19taW5fZGlzdGFuY2UgcGl4ZWxzIGZyb20gdGhlIG9yaWdpbmFsIGV2ZW50IGNlbnRlci5cclxuICAgICAgICAgICAgLy8gV2l0aG91dCB0aGlzIGNvcnJlY3Rpb24sIHRoZSBkcmFnZ2VkIGRpc3RhbmNlIHdvdWxkIGp1bXBzdGFydCBhdCBkcmFnX21pbl9kaXN0YW5jZSBwaXhlbHMgaW5zdGVhZCBvZiBhdCAwLlxyXG4gICAgICAgICAgICAvLyBJdCBtaWdodCBiZSB1c2VmdWwgdG8gc2F2ZSB0aGUgb3JpZ2luYWwgc3RhcnQgcG9pbnQgc29tZXdoZXJlXHJcbiAgICAgICAgICAgIHZhciBmYWN0b3IgPSBNYXRoLmFicyhpbnN0Lm9wdGlvbnMuZHJhZ19taW5fZGlzdGFuY2UgLyBldi5kaXN0YW5jZSk7XHJcbiAgICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5zdGFydEV2ZW50LmNlbnRlci5wYWdlWCArPSBldi5kZWx0YVggKiBmYWN0b3I7XHJcbiAgICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5zdGFydEV2ZW50LmNlbnRlci5wYWdlWSArPSBldi5kZWx0YVkgKiBmYWN0b3I7XHJcblxyXG4gICAgICAgICAgICAvLyByZWNhbGN1bGF0ZSBldmVudCBkYXRhIHVzaW5nIG5ldyBzdGFydCBwb2ludFxyXG4gICAgICAgICAgICBldiA9IEhhbW1lci5kZXRlY3Rpb24uZXh0ZW5kRXZlbnREYXRhKGV2KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGxvY2sgZHJhZyB0byBheGlzP1xyXG4gICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5sYXN0RXZlbnQuZHJhZ19sb2NrZWRfdG9fYXhpcyB8fCAoaW5zdC5vcHRpb25zLmRyYWdfbG9ja190b19heGlzICYmIGluc3Qub3B0aW9ucy5kcmFnX2xvY2tfbWluX2Rpc3RhbmNlIDw9IGV2LmRpc3RhbmNlKSkge1xyXG4gICAgICAgICAgZXYuZHJhZ19sb2NrZWRfdG9fYXhpcyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsYXN0X2RpcmVjdGlvbiA9IEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5sYXN0RXZlbnQuZGlyZWN0aW9uO1xyXG4gICAgICAgIGlmKGV2LmRyYWdfbG9ja2VkX3RvX2F4aXMgJiYgbGFzdF9kaXJlY3Rpb24gIT09IGV2LmRpcmVjdGlvbikge1xyXG4gICAgICAgICAgLy8ga2VlcCBkaXJlY3Rpb24gb24gdGhlIGF4aXMgdGhhdCB0aGUgZHJhZyBnZXN0dXJlIHN0YXJ0ZWQgb25cclxuICAgICAgICAgIGlmKEhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGxhc3RfZGlyZWN0aW9uKSkge1xyXG4gICAgICAgICAgICBldi5kaXJlY3Rpb24gPSAoZXYuZGVsdGFZIDwgMCkgPyBIYW1tZXIuRElSRUNUSU9OX1VQIDogSGFtbWVyLkRJUkVDVElPTl9ET1dOO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGV2LmRpcmVjdGlvbiA9IChldi5kZWx0YVggPCAwKSA/IEhhbW1lci5ESVJFQ1RJT05fTEVGVCA6IEhhbW1lci5ESVJFQ1RJT05fUklHSFQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmaXJzdCB0aW1lLCB0cmlnZ2VyIGRyYWdzdGFydCBldmVudFxyXG4gICAgICAgIGlmKCF0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdzdGFydCcsIGV2KTtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgbm9ybWFsIGV2ZW50XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG5cclxuICAgICAgICAvLyBkaXJlY3Rpb24gZXZlbnQsIGxpa2UgZHJhZ2Rvd25cclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgZXYuZGlyZWN0aW9uLCBldik7XHJcblxyXG4gICAgICAgIC8vIGJsb2NrIHRoZSBicm93c2VyIGV2ZW50c1xyXG4gICAgICAgIGlmKChpbnN0Lm9wdGlvbnMuZHJhZ19ibG9ja192ZXJ0aWNhbCAmJiBIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChldi5kaXJlY3Rpb24pKSB8fFxyXG4gICAgICAgICAgKGluc3Qub3B0aW9ucy5kcmFnX2Jsb2NrX2hvcml6b250YWwgJiYgIUhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGV2LmRpcmVjdGlvbikpKSB7XHJcbiAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICAvLyB0cmlnZ2VyIGRyYWdlbmRcclxuICAgICAgICBpZih0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBIb2xkXHJcbiAqIFRvdWNoIHN0YXlzIGF0IHRoZSBzYW1lIHBsYWNlIGZvciB4IHRpbWVcclxuICogQGV2ZW50cyAgaG9sZFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLkhvbGQgPSB7XHJcbiAgbmFtZSAgICA6ICdob2xkJyxcclxuICBpbmRleCAgIDogMTAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIGhvbGRfdGltZW91dCAgOiA1MDAsXHJcbiAgICBob2xkX3RocmVzaG9sZDogMVxyXG4gIH0sXHJcbiAgdGltZXIgICA6IG51bGwsXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIGhvbGRHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIC8vIGNsZWFyIGFueSBydW5uaW5nIHRpbWVyc1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuXHJcbiAgICAgICAgLy8gc2V0IHRoZSBnZXN0dXJlIHNvIHdlIGNhbiBjaGVjayBpbiB0aGUgdGltZW91dCBpZiBpdCBzdGlsbCBpc1xyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG5cclxuICAgICAgICAvLyBzZXQgdGltZXIgYW5kIGlmIGFmdGVyIHRoZSB0aW1lb3V0IGl0IHN0aWxsIGlzIGhvbGQsXHJcbiAgICAgICAgLy8gd2UgdHJpZ2dlciB0aGUgaG9sZCBldmVudFxyXG4gICAgICAgIHRoaXMudGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPT0gJ2hvbGQnKSB7XHJcbiAgICAgICAgICAgIGluc3QudHJpZ2dlcignaG9sZCcsIGV2KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBpbnN0Lm9wdGlvbnMuaG9sZF90aW1lb3V0KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIC8vIHdoZW4geW91IG1vdmUgb3IgZW5kIHdlIGNsZWFyIHRoZSB0aW1lclxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIGlmKGV2LmRpc3RhbmNlID4gaW5zdC5vcHRpb25zLmhvbGRfdGhyZXNob2xkKSB7XHJcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUmVsZWFzZVxyXG4gKiBDYWxsZWQgYXMgbGFzdCwgdGVsbHMgdGhlIHVzZXIgaGFzIHJlbGVhc2VkIHRoZSBzY3JlZW5cclxuICogQGV2ZW50cyAgcmVsZWFzZVxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlJlbGVhc2UgPSB7XHJcbiAgbmFtZSAgIDogJ3JlbGVhc2UnLFxyXG4gIGluZGV4ICA6IEluZmluaXR5LFxyXG4gIGhhbmRsZXI6IGZ1bmN0aW9uIHJlbGVhc2VHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFN3aXBlXHJcbiAqIHRyaWdnZXJzIHN3aXBlIGV2ZW50cyB3aGVuIHRoZSBlbmQgdmVsb2NpdHkgaXMgYWJvdmUgdGhlIHRocmVzaG9sZFxyXG4gKiBAZXZlbnRzICBzd2lwZSwgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0LCBzd2lwZXVwLCBzd2lwZWRvd25cclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Td2lwZSA9IHtcclxuICBuYW1lICAgIDogJ3N3aXBlJyxcclxuICBpbmRleCAgIDogNDAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIC8vIHNldCAwIGZvciB1bmxpbWl0ZWQsIGJ1dCB0aGlzIGNhbiBjb25mbGljdCB3aXRoIHRyYW5zZm9ybVxyXG4gICAgc3dpcGVfbWluX3RvdWNoZXM6IDEsXHJcbiAgICBzd2lwZV9tYXhfdG91Y2hlczogMSxcclxuICAgIHN3aXBlX3ZlbG9jaXR5ICAgOiAwLjdcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiBzd2lwZUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIC8vIG1heCB0b3VjaGVzXHJcbiAgICAgIGlmKGluc3Qub3B0aW9ucy5zd2lwZV9tYXhfdG91Y2hlcyA+IDAgJiZcclxuICAgICAgICBldi50b3VjaGVzLmxlbmd0aCA8IGluc3Qub3B0aW9ucy5zd2lwZV9taW5fdG91Y2hlcyAmJlxyXG4gICAgICAgIGV2LnRvdWNoZXMubGVuZ3RoID4gaW5zdC5vcHRpb25zLnN3aXBlX21heF90b3VjaGVzKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgaWYoZXYudmVsb2NpdHlYID4gaW5zdC5vcHRpb25zLnN3aXBlX3ZlbG9jaXR5IHx8XHJcbiAgICAgICAgZXYudmVsb2NpdHlZID4gaW5zdC5vcHRpb25zLnN3aXBlX3ZlbG9jaXR5KSB7XHJcbiAgICAgICAgLy8gdHJpZ2dlciBzd2lwZSBldmVudHNcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArIGV2LmRpcmVjdGlvbiwgZXYpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRhcC9Eb3VibGVUYXBcclxuICogUXVpY2sgdG91Y2ggYXQgYSBwbGFjZSBvciBkb3VibGUgYXQgdGhlIHNhbWUgcGxhY2VcclxuICogQGV2ZW50cyAgdGFwLCBkb3VibGV0YXBcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5UYXAgPSB7XHJcbiAgbmFtZSAgICA6ICd0YXAnLFxyXG4gIGluZGV4ICAgOiAxMDAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIHRhcF9tYXhfdG91Y2h0aW1lIDogMjUwLFxyXG4gICAgdGFwX21heF9kaXN0YW5jZSAgOiAxMCxcclxuICAgIHRhcF9hbHdheXMgICAgICAgIDogdHJ1ZSxcclxuICAgIGRvdWJsZXRhcF9kaXN0YW5jZTogMjAsXHJcbiAgICBkb3VibGV0YXBfaW50ZXJ2YWw6IDMwMFxyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHRhcEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfTU9WRSAmJiAhSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSkge1xyXG4gICAgICAvL1RyYWNrIHRoZSBkaXN0YW5jZSB3ZSd2ZSBtb3ZlZC4gSWYgaXQncyBhYm92ZSB0aGUgbWF4IE9OQ0UsIHJlbWVtYmVyIHRoYXQgKGZpeGVzICM0MDYpLlxyXG4gICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlID0gKGV2LmRpc3RhbmNlID4gaW5zdC5vcHRpb25zLnRhcF9tYXhfZGlzdGFuY2UpO1xyXG4gICAgfSBlbHNlIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EICYmIGV2LnNyY0V2ZW50LnR5cGUgIT0gJ3RvdWNoY2FuY2VsJykge1xyXG4gICAgICAvLyBwcmV2aW91cyBnZXN0dXJlLCBmb3IgdGhlIGRvdWJsZSB0YXAgc2luY2UgdGhlc2UgYXJlIHR3byBkaWZmZXJlbnQgZ2VzdHVyZSBkZXRlY3Rpb25zXHJcbiAgICAgIHZhciBwcmV2ID0gSGFtbWVyLmRldGVjdGlvbi5wcmV2aW91cyxcclxuICAgICAgICBkaWRfZG91YmxldGFwID0gZmFsc2U7XHJcblxyXG4gICAgICAvLyB3aGVuIHRoZSB0b3VjaHRpbWUgaXMgaGlnaGVyIHRoZW4gdGhlIG1heCB0b3VjaCB0aW1lXHJcbiAgICAgIC8vIG9yIHdoZW4gdGhlIG1vdmluZyBkaXN0YW5jZSBpcyB0b28gbXVjaFxyXG4gICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlIHx8IGV2LmRlbHRhVGltZSA+IGluc3Qub3B0aW9ucy50YXBfbWF4X3RvdWNodGltZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY2hlY2sgaWYgZG91YmxlIHRhcFxyXG4gICAgICBpZihwcmV2ICYmIHByZXYubmFtZSA9PSAndGFwJyAmJlxyXG4gICAgICAgIChldi50aW1lU3RhbXAgLSBwcmV2Lmxhc3RFdmVudC50aW1lU3RhbXApIDwgaW5zdC5vcHRpb25zLmRvdWJsZXRhcF9pbnRlcnZhbCAmJlxyXG4gICAgICAgIGV2LmRpc3RhbmNlIDwgaW5zdC5vcHRpb25zLmRvdWJsZXRhcF9kaXN0YW5jZSkge1xyXG4gICAgICAgIGluc3QudHJpZ2dlcignZG91YmxldGFwJywgZXYpO1xyXG4gICAgICAgIGRpZF9kb3VibGV0YXAgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBkbyBhIHNpbmdsZSB0YXBcclxuICAgICAgaWYoIWRpZF9kb3VibGV0YXAgfHwgaW5zdC5vcHRpb25zLnRhcF9hbHdheXMpIHtcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9ICd0YXAnO1xyXG4gICAgICAgIGluc3QudHJpZ2dlcihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSwgZXYpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRvdWNoXHJcbiAqIENhbGxlZCBhcyBmaXJzdCwgdGVsbHMgdGhlIHVzZXIgaGFzIHRvdWNoZWQgdGhlIHNjcmVlblxyXG4gKiBAZXZlbnRzICB0b3VjaFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRvdWNoID0ge1xyXG4gIG5hbWUgICAgOiAndG91Y2gnLFxyXG4gIGluZGV4ICAgOiAtSW5maW5pdHksXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIC8vIGNhbGwgcHJldmVudERlZmF1bHQgYXQgdG91Y2hzdGFydCwgYW5kIG1ha2VzIHRoZSBlbGVtZW50IGJsb2NraW5nIGJ5XHJcbiAgICAvLyBkaXNhYmxpbmcgdGhlIHNjcm9sbGluZyBvZiB0aGUgcGFnZSwgYnV0IGl0IGltcHJvdmVzIGdlc3R1cmVzIGxpa2VcclxuICAgIC8vIHRyYW5zZm9ybWluZyBhbmQgZHJhZ2dpbmcuXHJcbiAgICAvLyBiZSBjYXJlZnVsIHdpdGggdXNpbmcgdGhpcywgaXQgY2FuIGJlIHZlcnkgYW5ub3lpbmcgZm9yIHVzZXJzIHRvIGJlIHN0dWNrXHJcbiAgICAvLyBvbiB0aGUgcGFnZVxyXG4gICAgcHJldmVudF9kZWZhdWx0ICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZGlzYWJsZSBtb3VzZSBldmVudHMsIHNvIG9ubHkgdG91Y2ggKG9yIHBlbiEpIGlucHV0IHRyaWdnZXJzIGV2ZW50c1xyXG4gICAgcHJldmVudF9tb3VzZWV2ZW50czogZmFsc2VcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiB0b3VjaEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGluc3Qub3B0aW9ucy5wcmV2ZW50X21vdXNlZXZlbnRzICYmIGV2LnBvaW50ZXJUeXBlID09IEhhbW1lci5QT0lOVEVSX01PVVNFKSB7XHJcbiAgICAgIGV2LnN0b3BEZXRlY3QoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGluc3Qub3B0aW9ucy5wcmV2ZW50X2RlZmF1bHQpIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX1NUQVJUKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFRyYW5zZm9ybVxyXG4gKiBVc2VyIHdhbnQgdG8gc2NhbGUgb3Igcm90YXRlIHdpdGggMiBmaW5nZXJzXHJcbiAqIEBldmVudHMgIHRyYW5zZm9ybSwgcGluY2gsIHBpbmNoaW4sIHBpbmNob3V0LCByb3RhdGVcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5UcmFuc2Zvcm0gPSB7XHJcbiAgbmFtZSAgICAgOiAndHJhbnNmb3JtJyxcclxuICBpbmRleCAgICA6IDQ1LFxyXG4gIGRlZmF1bHRzIDoge1xyXG4gICAgLy8gZmFjdG9yLCBubyBzY2FsZSBpcyAxLCB6b29taW4gaXMgdG8gMCBhbmQgem9vbW91dCB1bnRpbCBoaWdoZXIgdGhlbiAxXHJcbiAgICB0cmFuc2Zvcm1fbWluX3NjYWxlICAgOiAwLjAxLFxyXG4gICAgLy8gcm90YXRpb24gaW4gZGVncmVlc1xyXG4gICAgdHJhbnNmb3JtX21pbl9yb3RhdGlvbjogMSxcclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCBicm93c2VyIGJlaGF2aW9yIHdoZW4gdHdvIHRvdWNoZXMgYXJlIG9uIHRoZSBzY3JlZW5cclxuICAgIC8vIGJ1dCBpdCBtYWtlcyB0aGUgZWxlbWVudCBhIGJsb2NraW5nIGVsZW1lbnRcclxuICAgIC8vIHdoZW4geW91IGFyZSB1c2luZyB0aGUgdHJhbnNmb3JtIGdlc3R1cmUsIGl0IGlzIGEgZ29vZCBwcmFjdGljZSB0byBzZXQgdGhpcyB0cnVlXHJcbiAgICB0cmFuc2Zvcm1fYWx3YXlzX2Jsb2NrOiBmYWxzZVxyXG4gIH0sXHJcbiAgdHJpZ2dlcmVkOiBmYWxzZSxcclxuICBoYW5kbGVyICA6IGZ1bmN0aW9uIHRyYW5zZm9ybUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIC8vIGN1cnJlbnQgZ2VzdHVyZSBpc250IGRyYWcsIGJ1dCBkcmFnZ2VkIGlzIHRydWVcclxuICAgIC8vIHRoaXMgbWVhbnMgYW4gb3RoZXIgZ2VzdHVyZSBpcyBidXN5LiBub3cgY2FsbCBkcmFnZW5kXHJcbiAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUgJiYgdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhdGxlYXN0IG11bHRpdG91Y2hcclxuICAgIGlmKGV2LnRvdWNoZXMubGVuZ3RoIDwgMikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IHdoZW4gdHdvIGZpbmdlcnMgYXJlIG9uIHRoZSBzY3JlZW5cclxuICAgIGlmKGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fYWx3YXlzX2Jsb2NrKSB7XHJcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICB2YXIgc2NhbGVfdGhyZXNob2xkID0gTWF0aC5hYnMoMSAtIGV2LnNjYWxlKTtcclxuICAgICAgICB2YXIgcm90YXRpb25fdGhyZXNob2xkID0gTWF0aC5hYnMoZXYucm90YXRpb24pO1xyXG5cclxuICAgICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICAgIGlmKHNjYWxlX3RocmVzaG9sZCA8IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3NjYWxlICYmXHJcbiAgICAgICAgICByb3RhdGlvbl90aHJlc2hvbGQgPCBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9yb3RhdGlvbikge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2UgYXJlIHRyYW5zZm9ybWluZyFcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuXHJcbiAgICAgICAgLy8gZmlyc3QgdGltZSwgdHJpZ2dlciBkcmFnc3RhcnQgZXZlbnRcclxuICAgICAgICBpZighdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnc3RhcnQnLCBldik7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7IC8vIGJhc2ljIHRyYW5zZm9ybSBldmVudFxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHJvdGF0ZSBldmVudFxyXG4gICAgICAgIGlmKHJvdGF0aW9uX3RocmVzaG9sZCA+IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3JvdGF0aW9uKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3JvdGF0ZScsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgcGluY2ggZXZlbnRcclxuICAgICAgICBpZihzY2FsZV90aHJlc2hvbGQgPiBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9zY2FsZSkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdwaW5jaCcsIGV2KTtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncGluY2gnICsgKChldi5zY2FsZSA8IDEpID8gJ2luJyA6ICdvdXQnKSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICAvLyB0cmlnZ2VyIGRyYWdlbmRcclxuICAgICAgICBpZih0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbiAgLy8gQmFzZWQgb2ZmIExvLURhc2gncyBleGNlbGxlbnQgVU1EIHdyYXBwZXIgKHNsaWdodGx5IG1vZGlmaWVkKSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvbG9kYXNoLmpzI0w1NTE1LUw1NTQzXHJcbiAgLy8gc29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zIGxpa2UgdGhlIGZvbGxvd2luZzpcclxuICBpZih0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gZGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGVcclxuICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIEhhbW1lcjsgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBjaGVjayBmb3IgYGV4cG9ydHNgIGFmdGVyIGBkZWZpbmVgIGluIGNhc2UgYSBidWlsZCBvcHRpbWl6ZXIgYWRkcyBhbiBgZXhwb3J0c2Agb2JqZWN0XHJcbiAgZWxzZSBpZih0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIYW1tZXI7XHJcbiAgfVxyXG5cclxuICBlbHNlIHtcclxuICAgIHdpbmRvdy5IYW1tZXIgPSBIYW1tZXI7XHJcbiAgfVxyXG5cclxufSkod2luZG93KTtcclxuXHJcbi8qISBqUXVlcnkgcGx1Z2luIGZvciBIYW1tZXIuSlMgLSB2MS4wLjEgLSAyMDE0LTAyLTAzXHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxNCBKb3JpayBUYW5nZWxkZXIgPGoudGFuZ2VsZGVyQGdtYWlsLmNvbT47XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSAqLyhmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIHNldHVwKEhhbW1lciwgJCkge1xyXG4gIC8qKlxyXG4gICAqIGJpbmQgZG9tIGV2ZW50c1xyXG4gICAqIHRoaXMgb3ZlcndyaXRlcyBhZGRFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlc1xyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgSGFtbWVyLmV2ZW50LmJpbmREb20gPSBmdW5jdGlvbihlbGVtZW50LCBldmVudFR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICAkKGVsZW1lbnQpLm9uKGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGV2KSB7XHJcbiAgICAgIHZhciBkYXRhID0gZXYub3JpZ2luYWxFdmVudCB8fCBldjtcclxuXHJcbiAgICAgIGlmKGRhdGEucGFnZVggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRhdGEucGFnZVggPSBldi5wYWdlWDtcclxuICAgICAgICBkYXRhLnBhZ2VZID0gZXYucGFnZVk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnRhcmdldCkge1xyXG4gICAgICAgIGRhdGEudGFyZ2V0ID0gZXYudGFyZ2V0O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihkYXRhLndoaWNoID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkYXRhLndoaWNoID0gZGF0YS5idXR0b247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgZGF0YS5wcmV2ZW50RGVmYXVsdCA9IGV2LnByZXZlbnREZWZhdWx0O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS5zdG9wUHJvcGFnYXRpb24pIHtcclxuICAgICAgICBkYXRhLnN0b3BQcm9wYWdhdGlvbiA9IGV2LnN0b3BQcm9wYWdhdGlvbjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGRhdGEpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogdGhlIG1ldGhvZHMgYXJlIGNhbGxlZCBieSB0aGUgaW5zdGFuY2UsIGJ1dCB3aXRoIHRoZSBqcXVlcnkgcGx1Z2luXHJcbiAgICogd2UgdXNlIHRoZSBqcXVlcnkgZXZlbnQgbWV0aG9kcyBpbnN0ZWFkLlxyXG4gICAqIEB0aGlzICAgIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZXMsIGhhbmRsZXIpIHtcclxuICAgIHJldHVybiAkKHRoaXMuZWxlbWVudCkub24odHlwZXMsIGhhbmRsZXIpO1xyXG4gIH07XHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlcywgaGFuZGxlcikge1xyXG4gICAgcmV0dXJuICQodGhpcy5lbGVtZW50KS5vZmYodHlwZXMsIGhhbmRsZXIpO1xyXG4gIH07XHJcblxyXG5cclxuICAvKipcclxuICAgKiB0cmlnZ2VyIGV2ZW50c1xyXG4gICAqIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBnZXN0dXJlcyB0byB0cmlnZ2VyIGFuIGV2ZW50IGxpa2UgJ3RhcCdcclxuICAgKiBAdGhpcyAgICB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldmVudERhdGFcclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGdlc3R1cmUsIGV2ZW50RGF0YSkge1xyXG4gICAgdmFyIGVsID0gJCh0aGlzLmVsZW1lbnQpO1xyXG4gICAgaWYoZWwuaGFzKGV2ZW50RGF0YS50YXJnZXQpLmxlbmd0aCkge1xyXG4gICAgICBlbCA9ICQoZXZlbnREYXRhLnRhcmdldCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVsLnRyaWdnZXIoe1xyXG4gICAgICB0eXBlICAgOiBnZXN0dXJlLFxyXG4gICAgICBnZXN0dXJlOiBldmVudERhdGFcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuICAvKipcclxuICAgKiBqUXVlcnkgcGx1Z2luXHJcbiAgICogY3JlYXRlIGluc3RhbmNlIG9mIEhhbW1lciBhbmQgd2F0Y2ggZm9yIGdlc3R1cmVzLFxyXG4gICAqIGFuZCB3aGVuIGNhbGxlZCBhZ2FpbiB5b3UgY2FuIGNoYW5nZSB0aGUgb3B0aW9uc1xyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIFtvcHRpb25zPXt9XVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgJC5mbi5oYW1tZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZWwgPSAkKHRoaXMpO1xyXG4gICAgICB2YXIgaW5zdCA9IGVsLmRhdGEoJ2hhbW1lcicpO1xyXG4gICAgICAvLyBzdGFydCBuZXcgaGFtbWVyIGluc3RhbmNlXHJcbiAgICAgIGlmKCFpbnN0KSB7XHJcbiAgICAgICAgZWwuZGF0YSgnaGFtbWVyJywgbmV3IEhhbW1lcih0aGlzLCBvcHRpb25zIHx8IHt9KSk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gY2hhbmdlIHRoZSBvcHRpb25zXHJcbiAgICAgIGVsc2UgaWYoaW5zdCAmJiBvcHRpb25zKSB7XHJcbiAgICAgICAgSGFtbWVyLnV0aWxzLmV4dGVuZChpbnN0Lm9wdGlvbnMsIG9wdGlvbnMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9O1xyXG59XHJcblxyXG4gIC8vIEJhc2VkIG9mZiBMby1EYXNoJ3MgZXhjZWxsZW50IFVNRCB3cmFwcGVyIChzbGlnaHRseSBtb2RpZmllZCkgLSBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL2xvZGFzaC5qcyNMNTUxNS1MNTU0M1xyXG4gIC8vIHNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XHJcbiAgaWYodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIGRlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlXHJcbiAgICBkZWZpbmUoWydoYW1tZXJqcycsICdqcXVlcnknXSwgc2V0dXApO1xyXG5cclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICBzZXR1cCh3aW5kb3cuSGFtbWVyLCB3aW5kb3cualF1ZXJ5IHx8IHdpbmRvdy5aZXB0byk7XHJcbiAgfVxyXG59KSh3aW5kb3cpOyJdfQ==
;