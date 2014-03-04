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

    Scoreboard: { DIGITS: 3, FX_DURATION: 800, OUT_OF_RANGE: "MAX" }

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

// ERRORS AND EXCEPTIONS

function MysweeperError() {
    var args = [].slice.call(arguments),
        RGX_REPLACEMENT_TOKENS = /\{(\d+)\}/g,
        extendMessage = function(str, args) {
            return (str || '').replace(RGX_REPLACEMENT_TOKENS, function(_, index) { return args[+index] || ''; });
        };
  this.message = extendMessage(args[0], args.slice(1));
  this.name = 'MysweeperError';
  Error.call(this, this.message);
}
MysweeperError.prototype = new Error();
MysweeperError.prototype.constructor = MysweeperError;


function ValidationError() {
  MysweeperError.apply(this, arguments);
  this.name = 'ValidationError';
}
ValidationError.prototype = new MysweeperError();
ValidationError.prototype.constructor = ValidationError;

module.exports.MysweeperError = MysweeperError;
module.exports.ValidationError = ValidationError;
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
        var _this = this;
        event.split(/\s+/g).forEach(function(e) {
            _this._events[e] = _this._events[e] || [];
            _this._events[e].push(fn);
        });
    },
    off: function(event, fn) {
        var _this = this;
        event.split(/\s+/g).forEach(function(e) {
            if (_this._events[e] !== false)
                _this._events[e].splice(_this._events[e].indexOf(fn), 1);
        });
    },
    trigger: function(event /*, data... [varargs] */) {
        if (this._events[event] !== false)
            for (var i=0, len=this._events[event].length; i < len; ++i)
                this._events[event][i].apply(this, [].slice.call(arguments, 1));
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
function Scorekeeper(gameboard) {
  var _this = this;

  this.callbacks = {
    up: function up(pts) { this.score += pts; },
    down: function down(pts) { this.score = (this.score - pts <= 0) ? 0 : this.score - pts; }
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
        return ~~(Math.sqrt(dims - gameboard.userMoves) * 10);
    },
    forFinalMisflaggings: function(gameboard) {
        var squares = gameboard.getSquares(),
            flagged = squares.filter(function(sq) { return sq.isFlagged(); }),
            misflagged = flagged.filter(function(sq) { return !sq.isMined(); });
        return (misflagged.length * 10) || 0;
    },
    forCorrectFlagging: function(gameboard) {
        var mines = gameboard.mines,
            squares = gameboard.getSquares(),
            flagged = squares.filter(function(sq) { return sq.isFlagged(); }),
            flaggedMines = squares.filter(function(sq) { return sq.isMined(); }),
            pct = ~~(flaggedMines.length / mines);
        return Math.ceil((mines * 10) * pct);
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
      var _this = this;
      this.emitter.on('sq:open', function(square, cell) {
        // check danger index...if not > 1, not `up`s for that!
        if (square.getDanger() > 0)
          _this.up(square.getDanger());
      });
      this.emitter.on('sq:close', function(square, cell) {});
      this.emitter.on('sq:flag', function(square, cell) {});
      this.emitter.on('sq:unflag', function(square, cell) {});

      this.emitter.on('gb:start', function(ename, gameboard, $el) { /* START THE SCOREKEEPER */ });
      this.emitter.on('gb:end:win', function(ename, gameboard, $el) { _this.endGame = true; /* STOP THE SCOREKEEPER */ });
      this.emitter.on('gb:end:over', function(ename, gameboard, $el) { _this.endGame = true; /* STOP THE SCOREKEEPER */ });
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

    up: function(pts) { console.log("Queueing `up` score event of %o", pos(pts)); this._addScoreToQueue("up", pos(pts)); },
    down: function(pts) { console.log("Queueing `down` score event of %o", neg(pts)); this._addScoreToQueue("down", neg(pts)); },

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
},{}],15:[function(require,module,exports){
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
},{}]},{},[1,2,3,4,5,6,7,9,8,10,12,13,11,14,15,16,19,18,20,21,17])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2xjZ2VuZXJhdG9yLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL211bHRpbWFwLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbWluZWxheWVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVib2FyZC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3Njb3Jla2VlcGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2VyaWFsaXplci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3NxdWFyZS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RoZW1lLXN0eWxlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RyYW5zY3JpYmluZy1lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdHJhbnNjcmlwdGlvbi1zdHJhdGVneS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3ZhbGlkYXRvcnMuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92ZW5kb3IvanF1ZXJ5LmhhbW1lci1mdWxsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcbiAgICBEaW1WYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5Cb2FyZERpbWVuc2lvbnMsXHJcbiAgICBNaW5lVmFsaWRhdG9yID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykuTWluZUNvdW50LFxyXG4gICAgVkVSU0lPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuVkVSU0lPTixcclxuICAgIE1BWF9HUklEX0RJTUVOU0lPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1BWF9HUklEX0RJTUVOU0lPTlMsXHJcblxyXG4gICAgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIH5+KE1hdGgucG93KGRpbSwgMikgKiAwLjUpOyB9LFxyXG4gICAgZGlzYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCwgdW5kbykge1xyXG4gICAgICAgIGlmICh1bmRvID09IG51bGwpIHVuZG8gPSBmYWxzZTtcclxuICAgICAgICAkZWxbdW5kbyA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnXSgnZGlzYWJsZWQnKTtcclxuICAgICAgICAkZWwuZmluZChcImlucHV0XCIpLnByb3AoJ3JlYWRvbmx5JywgIXVuZG8pO1xyXG4gICAgfSxcclxuICAgIGVuYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCkgeyByZXR1cm4gZGlzYWJsZU9wdGlvbigkZWwsIHRydWUpOyB9O1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cclxuICAgIHZhciAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIiksXHJcbiAgICAgICAgUFJFU0VUX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5wcmVzZXQgPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIixcclxuICAgICAgICBDVVNUT01fUEFORUxfU0VMRUNUT1IgPSBcInVsLmN1c3RvbSA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiO1xyXG5cclxuICAgIC8vIHNldHRpbmcgaW5pdGlhbCB2YWx1ZVxyXG4gICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpKSk7XHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoTUFYX0dSSURfRElNRU5TSU9OUyArIFwiIHggXCIgKyBNQVhfR1JJRF9ESU1FTlNJT05TKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyB9KS5jbGljaygpO1xyXG4gICAgJChcIiNjdXN0b20tbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgfSk7XHJcblxyXG4gICAgJC5lYWNoKCQoXCJsYWJlbFtmb3JePSdsZXZlbC0nXVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wb3AoKTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICB2YXIgZCA9ICQoXCIjZGltZW5zaW9uc1wiKS52YWwoKSB8fCArJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSxcclxuICAgICAgICAgICAgICAgIG0gPSAkKFwiI21pbmUtY291bnRcIikudmFsKCkgfHwgKyQoXCIjbWluZS1jb3VudFwiKS5hdHRyKFwicGxhY2Vob2xkZXJcIik7XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IERpbVZhbGlkYXRvci52YWxpZGF0ZShkKSA/ICtkIDogOTtcclxuICAgICAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gTWluZVZhbGlkYXRvci52YWxpZGF0ZShtLCBtaW5lYWJsZVNwYWNlcyhnYW1lT3B0aW9ucy5kaW1lbnNpb25zKSkgPyBtIDogMTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlOiAlb1wiLCBlKTtcclxuICAgICAgICAgICAgICAgICQoXCIjdmFsaWRhdGlvbi13YXJuaW5nc1wiKS5odG1sKGUubWVzc2FnZSkuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNldCB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy50aGVtZSA9ICQoXCIjY29sb3ItdGhlbWVcIikudmFsKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZXQgdXAgPGhlYWRlcj4gY29udGVudC4uLlxyXG4gICAgICAgICQoXCIjbWluZXMtZGlzcGxheVwiKS5maW5kKFwic3BhblwiKS5odG1sKGdhbWVPcHRpb25zLm1pbmVzKTtcclxuICAgICAgICAkKFwiLnZlcnNpb25cIikuaHRtbChWRVJTSU9OKTtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIjYm9hcmQtY2FyZFwiKS5vbihcImNsaWNrXCIsIFwiYS5yZXBsYXlcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gdGVtcG9yYXJ5LCBicnV0ZS1mb3JjZSBmaXguLi5cclxuICAgICAgICAvLyBUT0RPOiByZXNldCBmb3JtIGFuZCB0b2dnbGUgdmlzaWJpbGl0eSBvbiB0aGUgc2VjdGlvbnMuLi5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIlxyXG52YXIgQ29uc29sZVJlbmRlcmVyID0ge1xyXG5cclxuICAgIENPTF9TUEFDSU5HOiAnICAgJyxcclxuICAgIE1JTkVEX1NRVUFSRTogJyonLFxyXG4gICAgQkxBTktfU1FVQVJFOiAnLicsXHJcbiAgICBSRU5ERVJFRF9NQVA6ICclbycsXHJcbiAgICBERUZBVUxUX1RSQU5TRk9STUVSOiBmdW5jdGlvbihyb3cpeyByZXR1cm4gcm93OyB9LFxyXG5cclxuICAgIF9tYWtlVGl0bGU6IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gc3RyLnNwbGl0KCcnKS5qb2luKCcgJykudG9VcHBlckNhc2UoKTsgfSxcclxuICAgIF9kaXNwbGF5Um93TnVtOiBmdW5jdGlvbihudW0pIHsgcmV0dXJuIFwiICAgICAgIFtcIiArIG51bSArIFwiXVxcblwiIH0sXHJcbiAgICBfdG9TeW1ib2xzOiBmdW5jdGlvbih2YWx1ZXMsIGZuKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIgKz0gZm4ocm93KS5qb2luKF90aGlzLkNPTF9TUEFDSU5HKS50b0xvd2VyQ2FzZSgpICsgX3RoaXMuX2Rpc3BsYXlSb3dOdW0oaWR4KVxyXG4gICAgICAgIH0sICdcXG4nKTtcclxuICAgIH0sXHJcbiAgICBfdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykgJiYgdmFsdWVzLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbiAgICB9LFxyXG4gICAgX2dldFJlbmRlcmVkTWFwOiBmdW5jdGlvbih0cmFuc2Zvcm1lcikge1xyXG4gICAgICAgIHZhciB2YWxzID0gdGhpcy5fdmFsaWRhdGUodGhpcy52YWx1ZXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b1N5bWJvbHModmFscywgdHJhbnNmb3JtZXIpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMuX3ZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHZpZXdHYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5NSU5FRF9TUVVBUkUgOiBzcS5nZXREYW5nZXIoKSA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5CTEFOS19TUVVBUkUgOiBzcS5nZXREYW5nZXIoKTsgfSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJnYW1lYm9hcmRcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0cmFuc2Zvcm1lcikpO1xyXG4gICAgfSxcclxuICAgIHZpZXdNaW5lczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kbG9nKFsgdGhpcy5fbWFrZVRpdGxlKFwibWluZSBwbGFjZW1lbnRzXCIpLCB0aGlzLlJFTkRFUkVEX01BUCBdXHJcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKSxcclxuICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZWRNYXAodGhpcy5ERUZBVUxUX1RSQU5TRk9STUVSKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnNvbGVSZW5kZXJlcjsiLCJcclxudmFyIENvbnN0YW50cyA9IHtcclxuXHJcbiAgICBWRVJTSU9OOiAnYmV0YTQnLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcblxyXG4gICAgRGVmYXVsdENvbmZpZzoge1xyXG4gICAgICAgIGRpbWVuc2lvbnM6IDksXHJcbiAgICAgICAgbWluZXM6IDEsXHJcbiAgICAgICAgYm9hcmQ6ICcjYm9hcmQnLFxyXG4gICAgICAgIHRpbWVyOiA1MDAsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAzMDAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogNDIwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDU0MCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS8sXHJcblxyXG4gICAgU2NvcmVib2FyZDogeyBESUdJVFM6IDMsIEZYX0RVUkFUSU9OOiA4MDAsIE9VVF9PRl9SQU5HRTogXCJNQVhcIiB9XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oc2Vjb25kcywgZWwpIHtcclxuICAgIHRoaXMuc2Vjb25kcyA9IHNlY29uZHM7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG5cclxuICAgIHRoaXMubTEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMScpO1xyXG4gICAgdGhpcy5tMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20yJyk7XHJcbiAgICB0aGlzLnMxID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczEnKTtcclxuICAgIHRoaXMuczIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMicpO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcbkNvdW50ZG93bi5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogQ291bnRkb3duLFxyXG4gICAgX3JlbmRlckluaXRpYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fc2V0RGlzcGxheShhcnJbMF0gfHwgMCwgYXJyWzFdIHx8IDApO1xyXG4gICAgfSxcclxuICAgIF90b01pbnNTZWNzOiBmdW5jdGlvbihzZWNzKSB7XHJcbiAgICAgICAgdmFyIG1pbnMgPSB+fihzZWNzIC8gNjApLFxyXG4gICAgICAgICAgICBzZWNzID0gc2VjcyAlIDYwO1xyXG4gICAgICAgIHJldHVybiBbbWlucywgc2Vjc107XHJcbiAgICB9LFxyXG4gICAgX3NldERpc3BsYXk6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKSBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5tMS5pbm5lckhUTUwgPSB0aW1lc1swXVswXTtcclxuICAgICAgICB0aGlzLm0yLmlubmVySFRNTCA9IHRpbWVzWzBdWzFdO1xyXG4gICAgICAgIHRoaXMuczEuaW5uZXJIVE1MID0gdGltZXNbMV1bMF07XHJcbiAgICAgICAgdGhpcy5zMi5pbm5lckhUTUwgPSB0aW1lc1sxXVsxXTtcclxuICAgIH0sXHJcbiAgICBfY291bnRkb3duOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5mcmVlemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Vjb25kcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gX3RoaXMuX3RvTWluc1NlY3MoX3RoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KGFyclswXSwgYXJyWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2Vjb25kcy0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0RGlzcGxheSgwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICB9LFxyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IGZhbHNlOyB0aGlzLl9jb3VudGRvd24oKTsgfSxcclxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IHRydWU7IH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7IHRoaXMuX3NldERpc3BsYXkoMCwgMCk7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ291bnRkb3duOyIsIlxyXG5mdW5jdGlvbiBEYW5nZXJDYWxjdWxhdG9yKGdhbWVib2FyZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBib2FyZDogZ2FtZWJvYXJkLFxyXG4gICAgICAgIG5laWdoYm9yaG9vZDoge1xyXG4gICAgICAgICAgICAvLyBkaXN0YW5jZSBpbiBzdGVwcyBmcm9tIHRoaXMgc3F1YXJlOlxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgdmVydC4gaG9yei5cclxuICAgICAgICAgICAgTk9SVEg6ICAgICAgWyAgMSwgIDAgXSxcclxuICAgICAgICAgICAgTk9SVEhFQVNUOiAgWyAgMSwgIDEgXSxcclxuICAgICAgICAgICAgRUFTVDogICAgICAgWyAgMCwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEhFQVNUOiAgWyAtMSwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEg6ICAgICAgWyAtMSwgIDAgXSxcclxuICAgICAgICAgICAgU09VVEhXRVNUOiAgWyAtMSwgLTEgXSxcclxuICAgICAgICAgICAgV0VTVDogICAgICAgWyAgMCwgLTEgXSxcclxuICAgICAgICAgICAgTk9SVEhXRVNUOiAgWyAgMSwgLTEgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZm9yU3F1YXJlOiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICAgICAgaWYgKCtyb3cgPj0gMCAmJiArY2VsbCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTWluZXMgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLm5laWdoYm9yaG9vZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuYm9hcmQuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLmlzTWluZWQoKSkgdG90YWxNaW5lcysrO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWxNaW5lcyB8fCAnJztcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhbmdlckNhbGN1bGF0b3I7IiwiXG4vLyBFUlJPUlMgQU5EIEVYQ0VQVElPTlNcblxuZnVuY3Rpb24gTXlzd2VlcGVyRXJyb3IoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMgPSAvXFx7KFxcZCspXFx9L2csXG4gICAgICAgIGV4dGVuZE1lc3NhZ2UgPSBmdW5jdGlvbihzdHIsIGFyZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiAoc3RyIHx8ICcnKS5yZXBsYWNlKFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMsIGZ1bmN0aW9uKF8sIGluZGV4KSB7IHJldHVybiBhcmdzWytpbmRleF0gfHwgJyc7IH0pO1xuICAgICAgICB9O1xuICB0aGlzLm1lc3NhZ2UgPSBleHRlbmRNZXNzYWdlKGFyZ3NbMF0sIGFyZ3Muc2xpY2UoMSkpO1xuICB0aGlzLm5hbWUgPSAnTXlzd2VlcGVyRXJyb3InO1xuICBFcnJvci5jYWxsKHRoaXMsIHRoaXMubWVzc2FnZSk7XG59XG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE15c3dlZXBlckVycm9yO1xuXG5cbmZ1bmN0aW9uIFZhbGlkYXRpb25FcnJvcigpIHtcbiAgTXlzd2VlcGVyRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XG59XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yO1xuXG5tb2R1bGUuZXhwb3J0cy5NeXN3ZWVwZXJFcnJvciA9IE15c3dlZXBlckVycm9yO1xubW9kdWxlLmV4cG9ydHMuVmFsaWRhdGlvbkVycm9yID0gVmFsaWRhdGlvbkVycm9yOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICByZ3hfbW9iaWxlX2RldmljZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vYmlsZURldmljZVJlZ2V4LFxyXG4gICAgQ291bnRkb3duID0gcmVxdWlyZSgnLi9jb3VudGRvd24nKSxcclxuICAgIFRyYW5zY3JpYmluZ0VtaXR0ZXIgPSByZXF1aXJlKCcuL3RyYW5zY3JpYmluZy1lbWl0dGVyJyksXHJcbiAgICBUcmFuc2NyaXB0aW9uU3RyYXRlZ3kgPSByZXF1aXJlKCcuL3RyYW5zY3JpcHRpb24tc3RyYXRlZ3knKSxcclxuICAgIFRoZW1lU3R5bGVyID0gcmVxdWlyZSgnLi90aGVtZS1zdHlsZXInKSxcclxuICAgIENvbnNvbGVSZW5kZXJlciA9IHJlcXVpcmUoJy4vY29uc29sZS1yZW5kZXJlcicpLFxyXG4gICAgTWluZUxheWVyID0gcmVxdWlyZSgnLi9taW5lbGF5ZXInKSxcclxuICAgIFNjb3Jla2VlcGVyID0gcmVxdWlyZSgnLi9zY29yZWtlZXBlcicpLFxyXG4gICAgU2NvcmVib2FyZCA9IHJlcXVpcmUoJy4vc2NvcmVib2FyZCcpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG4gICAgLy8gaXMgY3VzdG9tIG9yIHByZXNldCBnYW1lP1xyXG4gICAgdGhpcy5pc0N1c3RvbSA9IG9wdGlvbnMuaXNDdXN0b20gfHwgZmFsc2U7XHJcbiAgICAvLyB0aGUgZXZlbnQgdHJhbnNjcmliZXIgZm9yIHBsYXliYWNrIGFuZCBwZXJzaXN0ZW5jZVxyXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXIoVHJhbnNjcmlwdGlvblN0cmF0ZWd5KTtcclxuICAgIC8vIHNlbGVjdGl2ZWx5IGVuYWJsZSBkZWJ1ZyBtb2RlIGZvciBjb25zb2xlIHZpc3VhbGl6YXRpb25zIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICB0aGlzLmRlYnVnX21vZGUgPSBvcHRpb25zLmRlYnVnX21vZGUgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGVidWdfbW9kZTtcclxuICAgICRsb2cuZGVidWdfbW9kZSA9IHRoaXMuZGVidWdfbW9kZTtcclxuICAgIC8vIHNwZWNpZmllcyB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZSBvciBza2luXHJcbiAgICB0aGlzLnRoZW1lID0gdGhpcy5fc2V0Q29sb3JUaGVtZShvcHRpb25zLnRoZW1lIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRoZW1lKTtcclxuICAgIC8vIGNvbnRhaW5lciBmb3IgZmxhc2ggbWVzc2FnZXMsIHN1Y2ggYXMgd2luL2xvc3Mgb2YgZ2FtZVxyXG4gICAgdGhpcy5mbGFzaENvbnRhaW5lciA9ICQoTWVzc2FnZU92ZXJsYXkpO1xyXG4gICAgLy8gY2hlY2sgZm9yIGRlc2t0b3Agb3IgbW9iaWxlIHBsYXRmb3JtIChmb3IgZXZlbnQgaGFuZGxlcnMpXHJcbiAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBhZGQgaW4gdGhlIGNvdW50ZG93biBjbG9jay4uLlxyXG4gICAgdGhpcy5jbG9jayA9IG5ldyBDb3VudGRvd24oK29wdGlvbnMudGltZXIgfHwgREVGQVVMVF9HQU1FX09QVElPTlMudGltZXIsICcjY291bnRkb3duJyk7XHJcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIHNjb3Jla2VlcGluZyBvYmplY3RcclxuICAgIHRoaXMuc2NvcmVrZWVwZXIgPSBuZXcgU2NvcmVrZWVwZXIodGhpcyk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIGFjdHVhbCBzY29yZWJvYXJkIHZpZXdcclxuICAgIHRoaXMuc2NvcmVib2FyZCA9IG5ldyBTY29yZWJvYXJkKDAsIFwiI3Njb3JlLWRpc3BsYXlcIik7XHJcblxyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIHRyaWdnZXIgZXZlbnQgZm9yIGdhbWUgdG8gYmVnaW4uLi5cclxuICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjpzdGFydCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxufVxyXG5cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogR2FtZWJvYXJkLFxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgLy8gZGlzcGxheSBvdXRwdXQgYW5kIGdhbWUgc3RyYXRlZ3kgdG8gdGhlIGNvbnNvbGUuLi5cclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy50aGVtZSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgdmFyIGxvY3MgPSBuZXcgTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSwgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGxvY3MuZm9yRWFjaChmdW5jdGlvbihsb2MpIHsgX3RoaXMuZ2V0U3F1YXJlQXQobG9jWzBdLCBsb2NbMV0pLm1pbmUoKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuc2V0RGFuZ2VyKF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJz5cIlxyXG4gICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfc2V0Q29sb3JUaGVtZTogZnVuY3Rpb24odGhlbWUpIHtcclxuICAgICAgICBUaGVtZVN0eWxlci5zZXQodGhlbWUsIHRoaXMuJGVsKTtcclxuICAgICAgICByZXR1cm4gdGhlbWU7XHJcbiAgICB9LFxyXG4gICAgX2NoZWNrRm9yTW9iaWxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHJneF9tb2JpbGVfZGV2aWNlcy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7IH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciB0b3VjaCBldmVudHM6IHRhcCA9PSBjbGljaywgaG9sZCA9PSByaWdodCBjbGlja1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vbih7XHJcbiAgICAgICAgICAgICAgICB0YXA6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBob2xkOiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGNvbnRleHRtZW51OiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSBhZnRlciBkZXZlbG9wbWVudCBlbmRzLi4uZm9yIGRlYnVnIHVzZSBvbmx5IVxyXG4gICAgICAgIC8vIElORElWSURVQUwgU1FVQVJFIEVWRU5UU1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6Y2xvc2UnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkNsb3Npbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIlVuZmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICAvLyBHQU1FQk9BUkQtV0lERSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmVnaW4hXCIsIGFyZ3VtZW50cyk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOndpbicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3Ugd2luIVwiKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6b3ZlcicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgZGVhZCFcIik7IH0pO1xyXG5cclxuICAgICAgICAvLyAtLS0gVEhFU0UgRVZFTlRTIEFSRSBGT1IgUkVBTCwgVE8gU1RBWSFcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIHdpcmVzIHVwIHRoZSBzY29yZWJvYXJkIHZpZXcgb2JqZWN0IHRvIHRoZSBldmVudHMgcmVjZWl2ZWQgZnJvbSB0aGUgc2NvcmVrZWVwZXJcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3Njb3JlOmNoYW5nZSBzY29yZTpjaGFuZ2U6ZmluYWwnLCBmdW5jdGlvbigpIHsgX3RoaXMuc2NvcmVib2FyZC51cGRhdGUoX3RoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgaWYgKCFzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCdraWxsZXItbWluZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gc3RvcCB0aGUgY29udGV4dG1lbnUgZnJvbSBwb3BwaW5nIHVwIG9uIGRlc2t0b3AgYnJvd3NlcnNcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgdGhpcy5fZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xvc2VTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgLy8gaGFuZGxlcyBhdXRvY2xlYXJpbmcgb2Ygc3BhY2VzIGFyb3VuZCB0aGUgb25lIGNsaWNrZWRcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpLFxyXG4gICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLl9vcGVuU3F1YXJlKG5laWdoYm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLmdldERhbmdlcigpIHx8ICFuZWlnaGJvci5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfb3BlblNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUub3BlbigpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOm9wZW5cIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9jbG9zZVNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpjbG9zZVwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF91bmZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLnVuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOnVuZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2dldE9wZW5lZFNxdWFyZXNDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzT3BlbigpOyB9KS5sZW5ndGg7IH0sXHJcbiAgICBfZXZhbHVhdGVGb3JHYW1lV2luOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbm90TWluZWQgPSB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pLmxlbmd0aDtcclxuICAgICAgICBpZiAobm90TWluZWQgPT09IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9mbGFzaE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGlzQWxlcnQgPyAnZ2FtZS1vdmVyJyA6ICdnYW1lLXdpbicpXHJcbiAgICAgICAgICAgICAgICAuaHRtbChtc2cpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgfSxcclxuICAgIF9wcmVwYXJlRmluYWxSZXZlYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3VuZmxhZ1NxdWFyZShmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci5jbG9zZSgpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXdpbicpO1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG5cclxuICAgICAgICAkbG9nKFwiLS0tICBHQU1FIFdJTiEgIC0tLVwiKTtcclxuICAgICAgICAkbG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOndpbicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOm92ZXInLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiBHbHlwaHMuRkxBRztcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc01pbmVkKCkpIHJldHVybiBHbHlwaHMuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXNxLmdldERhbmdlcigpID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdjZWxsJyArIHNxdWFyZS5nZXRDZWxsKCkpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYXR0YWNoIHRoZSBTcXVhcmUgdG8gdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBncmlkIGNlbGxcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUsIHRoaXMpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgYSBTcXVhcmUgaW5zdGFuY2UgYXMgYSBwYXJhbSwgcmV0dXJucyBhIGpRdWVyeS13cmFwcGVkIERPTSBub2RlIG9mIGl0cyBjZWxsXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIHJvdyBhbmQgY2VsbCBjb29yZGluYXRlcyBhcyBwYXJhbXMsIHJldHVybnMgdGhlIGFzc29jaWF0ZWQgU3F1YXJlIGluc3RhbmNlXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBuZWVkIGdhbWVPcHRpb25zLCBtZXRhZGF0YSBvbiBkYXRldGltZS9ldGMuLCBzZXJpYWxpemUgYWxsIHNxdWFyZXMnIHN0YXRlc1xyXG4gICAgICAgIHJldHVybiBTZXJpYWxpemVyLmV4cG9ydCh0aGlzKTtcclxuICAgIH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gQ29uc29sZVJlbmRlcmVyLnRvKCRsb2cpLndpdGhWYWx1ZXModGhpcy5ib2FyZC52YWx1ZXMoKSk7XHJcbiAgICAgICAgcmV0dXJuICh3aXRoRGFuZ2VyKSA/IHJlbmRlcmVyLnZpZXdHYW1lKCkgOiByZW5kZXJlci52aWV3TWluZXMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlxyXG4vLyBAdXNhZ2UgdmFyIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsnRl9PUEVOJywgJ0ZfTUlORUQnLCAnRl9GTEFHR0VEJywgJ0ZfSU5ERVhFRCddKTsgYmYgPSBuZXcgQml0RmxhZ3M7XHJcbmZ1bmN0aW9uIEJpdEZsYWdGYWN0b3J5KGFyZ3MpIHtcclxuXHJcbiAgICB2YXIgYmluVG9EZWMgPSBmdW5jdGlvbihzdHIpIHsgcmV0dXJuIHBhcnNlSW50KHN0ciwgMik7IH0sXHJcbiAgICAgICAgZGVjVG9CaW4gPSBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfSxcclxuICAgICAgICBidWlsZFN0YXRlID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBwYWQoYXJyLm1hcChmdW5jdGlvbihwYXJhbSkgeyByZXR1cm4gU3RyaW5nKCtwYXJhbSk7IH0pLnJldmVyc2UoKS5qb2luKCcnKSk7IH0sXHJcbiAgICAgICAgcGFkID0gZnVuY3Rpb24gKHN0ciwgbWF4KSB7XHJcbiAgICAgICAgICBtYXggfHwgKG1heCA9IDQgLyogdGhpcy5ERUZBVUxUX1NJWkUubGVuZ3RoICovKTtcclxuICAgICAgICAgIHZhciBkaWZmID0gbWF4IC0gc3RyLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXTsgZGlmZiA+IDA7IGFjY1stLWRpZmZdID0gJzAnKSB7fVxyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuICAgICAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyBfZmxhZ3M6IHRoaXMuX2ZsYWdzIH07IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlxyXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbn1cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEVtaXR0ZXIsXHJcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICBldmVudC5zcGxpdCgvXFxzKy9nKS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICAgICAgX3RoaXMuX2V2ZW50c1tlXSA9IF90aGlzLl9ldmVudHNbZV0gfHwgW107XHJcbiAgICAgICAgICAgIF90aGlzLl9ldmVudHNbZV0ucHVzaChmbik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgb2ZmOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGV2ZW50LnNwbGl0KC9cXHMrL2cpLmZvckVhY2goZnVuY3Rpb24oZSkge1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuX2V2ZW50c1tlXSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fZXZlbnRzW2VdLnNwbGljZShfdGhpcy5fZXZlbnRzW2VdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiLy8gTGluZWFyIENvbmdydWVudGlhbCBHZW5lcmF0b3I6IHZhcmlhbnQgb2YgYSBMZWhtYW4gR2VuZXJhdG9yXHJcbi8vIGJhc2VkIG9uIExDRyBmb3VuZCBoZXJlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9Qcm90b25rP3BhZ2U9NFxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCl7XHJcbiAgLy8gU2V0IHRvIHZhbHVlcyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTnVtZXJpY2FsX1JlY2lwZXNcclxuICAvLyBtIGlzIGJhc2ljYWxseSBjaG9zZW4gdG8gYmUgbGFyZ2UgKGFzIGl0IGlzIHRoZSBtYXggcGVyaW9kKVxyXG4gIC8vIGFuZCBmb3IgaXRzIHJlbGF0aW9uc2hpcHMgdG8gYSBhbmQgY1xyXG4gIGZ1bmN0aW9uIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcigpIHtcclxuICAgICAgdGhpcy5tID0gNDI5NDk2NzI5NjtcclxuICAgICAgLy8gYSAtIDEgc2hvdWxkIGJlIGRpdmlzaWJsZSBieSBtJ3MgcHJpbWUgZmFjdG9yc1xyXG4gICAgICB0aGlzLmEgPSAxNjY0NTI1O1xyXG4gICAgICAvLyBjIGFuZCBtIHNob3VsZCBiZSBjby1wcmltZVxyXG4gICAgICB0aGlzLmMgPSAxMDEzOTA0MjIzO1xyXG4gICAgICB0aGlzLnNlZWQgPSB2b2lkIDA7XHJcbiAgICAgIHRoaXMueiA9IHZvaWQgMDtcclxuICAgICAgLy8gaW5pdGlhbCBwcmltaW5nIG9mIHRoZSBnZW5lcmF0b3IsIHVudGlsIGxhdGVyIG92ZXJyaWRlblxyXG4gICAgICB0aGlzLnNldFNlZWQoKTtcclxuICB9XHJcbiAgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IsXHJcbiAgICBzZXRTZWVkOiBmdW5jdGlvbih2YWwpIHsgdGhpcy56ID0gdGhpcy5zZWVkID0gdmFsIHx8IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHRoaXMubSk7IH0sXHJcbiAgICBnZXRTZWVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc2VlZDsgfSxcclxuICAgIHJhbmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBkZWZpbmUgdGhlIHJlY3VycmVuY2UgcmVsYXRpb25zaGlwXHJcbiAgICAgIHRoaXMueiA9ICh0aGlzLmEgKiB0aGlzLnogKyB0aGlzLmMpICUgdGhpcy5tO1xyXG4gICAgICAvLyByZXR1cm4gYSBmbG9hdCBpbiBbMCwgMSlcclxuICAgICAgLy8gaWYgeiA9IG0gdGhlbiB6IC8gbSA9IDAgdGhlcmVmb3JlICh6ICUgbSkgLyBtIDwgMSBhbHdheXNcclxuICAgICAgcmV0dXJuIHRoaXMueiAvIHRoaXMubTtcclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjsiLCJcclxuZnVuY3Rpb24gTXVsdGltYXAoKSB7XHJcbiAgICB0aGlzLl90YWJsZSA9IFtdO1xyXG59XHJcblxyXG5NdWx0aW1hcC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogTXVsdGltYXAsXHJcbiAgICBnZXQ6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfSxcclxuICAgIHNldDogZnVuY3Rpb24ocm93LCB2YWwpIHsgKHRoaXMuX3RhYmxlW3Jvd10gfHwgKHRoaXMuX3RhYmxlW3Jvd10gPSBbXSkpLnB1c2godmFsKTsgfSxcclxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGZuKSB7IHJldHVybiBbXS5mb3JFYWNoLmNhbGwodGhpcy52YWx1ZXMoKSwgZm4pOyB9LFxyXG4gICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgfSxcclxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfSxcclxuICAgIHNpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpLmxlbmd0aDsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aW1hcDsiLCJcclxudmFyIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvciA9IHJlcXVpcmUoJy4vbGliL2xjZ2VuZXJhdG9yJyk7XHJcblxyXG5mdW5jdGlvbiBNaW5lTGF5ZXIobWluZXMsIGRpbWVuc2lvbnMpIHtcclxuICAgIHRoaXMuZ2VuZXJhdG9yID0gbmV3IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxuICAgIHRoaXMubWluZXMgPSArbWluZXMgfHwgMDtcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtkaW1lbnNpb25zIHx8IDA7XHJcblxyXG4gICAgdmFyIHJhbmRzID0gW10sXHJcbiAgICAgICAgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgIGdldFJhbmRvbU51bWJlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gX3RoaXMuZ2VuZXJhdG9yLnJhbmQoKSAqIChNYXRoLnBvdyhfdGhpcy5kaW1lbnNpb25zLCAyKSkgfCAwOyB9O1xyXG5cclxuICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICB2YXIgcm5kID0gZ2V0UmFuZG9tTnVtYmVyKCk7XHJcblxyXG4gICAgICAgIGlmICghfnJhbmRzLmluZGV4T2Yocm5kKSlcclxuICAgICAgICAgICAgcmFuZHMucHVzaChybmQpO1xyXG4gICAgICAgIC8vIC4uLm90aGVyd2lzZSwgZ2l2ZSBpdCBhbm90aGVyIGdvLSdyb3VuZDpcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbWluZXMrKztcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9jYXRpb25zID0gcmFuZHMubWFwKGZ1bmN0aW9uKHJuZCkge1xyXG4gICAgICAgIHZhciByb3cgPSB+fihybmQgLyBkaW1lbnNpb25zKSxcclxuICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnM7XHJcbiAgICAgICAgcmV0dXJuIFsgcm93LCBjZWxsIF07XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbnM7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluZUxheWVyOyIsInZhciBGWF9EVVJBVElPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU2NvcmVib2FyZC5GWF9EVVJBVElPTixcclxuICAgIERJR0lUU19NQVggPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlNjb3JlYm9hcmQuRElHSVRTLFxyXG4gICAgT1VUX09GX1JBTkdFID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TY29yZWJvYXJkLk9VVF9PRl9SQU5HRTtcclxuXHJcbmZ1bmN0aW9uIFNjb3JlYm9hcmQoc2NvcmUsIGVsKSB7XHJcbiAgICB0aGlzLnNjb3JlID0gc2NvcmUgfHwgMDtcclxuICAgIHRoaXMuaW5pdGlhbCA9IHNjb3JlO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG4gICAgdGhpcy4kZWwgPSAkKGVsKTtcclxuXHJcbiAgICB0aGlzLiRMID0gdGhpcy4kZWwuZmluZCgnI3NjMScpO1xyXG4gICAgdGhpcy4kTSA9IHRoaXMuJGVsLmZpbmQoJyNzYzInKTtcclxuICAgIHRoaXMuJFIgPSB0aGlzLiRlbC5maW5kKCcjc2MzJyk7XHJcblxyXG4gICAgdGhpcy51cGRhdGUodGhpcy5pbml0aWFsKTtcclxufVxyXG5cclxuU2NvcmVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU2NvcmVib2FyZCxcclxuICAgIF9pbmNyZW1lbnQ6IGZ1bmN0aW9uKGNoaXBzKSB7XHJcblxyXG4gICAgICAgIGNoaXBzLmZvckVhY2goZnVuY3Rpb24oY2hpcCkge1xyXG4gICAgICAgICAgICB2YXIgJGNoaXAgPSBjaGlwWzBdLCBwdHMgPSBjaGlwWzFdO1xyXG5cclxuICAgICAgICAgICAgaWYgKCRjaGlwLmh0bWwoKSAhPT0gcHRzKVxyXG4gICAgICAgICAgICAgICAgJGNoaXBcclxuICAgICAgICAgICAgICAgICAgICAud3JhcElubmVyKFwiPHNwYW4vPlwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKFwic3BhblwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5kZWxheShGWF9EVVJBVElPTilcclxuICAgICAgICAgICAgICAgICAgICAuc2xpZGVVcChGWF9EVVJBVElPTiwgZnVuY3Rpb24oKSB7ICQodGhpcykucGFyZW50KCkuaHRtbChwdHMpIH0pO1xyXG4gICAgICAgIH0sIHRoaXMpO1xyXG4gICAgfSxcclxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocG9pbnRzKSB7XHJcbiAgICAgICAgaWYgKCFwb2ludHMpIHJldHVybjtcclxuICAgICAgICB2YXIgcHRzID0gdG9TdHJpbmdBcnJheShwb2ludHMpO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudChbW3RoaXMuJFIsIHB0c1syXV0sIFt0aGlzLiRNLCBwdHNbMV1dLCBbdGhpcy4kTCwgcHRzWzBdXV0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY29yZWJvYXJkO1xyXG5cclxuZnVuY3Rpb24gdG9TdHJpbmdBcnJheShuKSB7XHJcbiAgICB2YXIgbnVtID0gU3RyaW5nKG4pLFxyXG4gICAgICAgIGxlbiA9IG51bS5sZW5ndGg7XHJcblxyXG4gICAgLy8gdG9vIGJpZyBmb3IgKnRoaXMqIHNjb3JlYm9hcmQuLi5cclxuICAgIGlmIChsZW4gPiBESUdJVFNfTUFYKSB7XHJcbiAgICAgICAgbnVtID0gT1VUX09GX1JBTkdFO1xyXG4gICAgICAgIGxlbiA9IE9VVF9PRl9SQU5HRS5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIFsgbnVtW2xlbiAtIDNdIHx8IFwiMFwiLCBudW1bbGVuIC0gMl0gfHwgXCIwXCIsIG51bVtsZW4gLSAxXSB8fCBcIjBcIiBdO1xyXG59IiwiZnVuY3Rpb24gU2NvcmVrZWVwZXIoZ2FtZWJvYXJkKSB7XHJcbiAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgdGhpcy5jYWxsYmFja3MgPSB7XHJcbiAgICB1cDogZnVuY3Rpb24gdXAocHRzKSB7IHRoaXMuc2NvcmUgKz0gcHRzOyB9LFxyXG4gICAgZG93bjogZnVuY3Rpb24gZG93bihwdHMpIHsgdGhpcy5zY29yZSA9ICh0aGlzLnNjb3JlIC0gcHRzIDw9IDApID8gMCA6IHRoaXMuc2NvcmUgLSBwdHM7IH1cclxuICB9O1xyXG5cclxuICB0aGlzLmZpbmFsaXplcnMgPSB7XHJcbiAgICBmb3JPcGVuaW5nU3F1YXJlczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIG1vdmVzID0gZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgdW5taW5lZCA9IE1hdGgucG93KGdhbWVib2FyZC5kaW1lbnNpb25zLCAyKSAtIGdhbWVib2FyZC5taW5lcztcclxuICAgICAgICByZXR1cm4gMSAtICh+fihtb3ZlcyAvIHVubWluZWQpICogMTApO1xyXG4gICAgfSxcclxuICAgIGZvclRpbWVQYXNzZWQ6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciB0b3RhbCA9IGdhbWVib2FyZC5jbG9jay5pbml0aWFsLCBlbGFwc2VkID0gZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHM7XHJcbiAgICAgICAgcmV0dXJuIDEwMCAtIH5+KGVsYXBzZWQgLyB0b3RhbCAqIDEwMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yRmV3ZXN0TW92ZXM6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIC8vIGV4cGVyaW1lbnRhbDogc3FydCh4XjIgLSB4KSAqIDEwXHJcbiAgICAgICAgdmFyIGRpbXMgPSBNYXRoLnBvdyhnYW1lYm9hcmQuZGltZW5zaW9ucywgMik7XHJcbiAgICAgICAgcmV0dXJuIH5+KE1hdGguc3FydChkaW1zIC0gZ2FtZWJvYXJkLnVzZXJNb3ZlcykgKiAxMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yRmluYWxNaXNmbGFnZ2luZ3M6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBzcXVhcmVzID0gZ2FtZWJvYXJkLmdldFNxdWFyZXMoKSxcclxuICAgICAgICAgICAgZmxhZ2dlZCA9IHNxdWFyZXMuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSksXHJcbiAgICAgICAgICAgIG1pc2ZsYWdnZWQgPSBmbGFnZ2VkLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSk7XHJcbiAgICAgICAgcmV0dXJuIChtaXNmbGFnZ2VkLmxlbmd0aCAqIDEwKSB8fCAwO1xyXG4gICAgfSxcclxuICAgIGZvckNvcnJlY3RGbGFnZ2luZzogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIG1pbmVzID0gZ2FtZWJvYXJkLm1pbmVzLFxyXG4gICAgICAgICAgICBzcXVhcmVzID0gZ2FtZWJvYXJkLmdldFNxdWFyZXMoKSxcclxuICAgICAgICAgICAgZmxhZ2dlZCA9IHNxdWFyZXMuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSksXHJcbiAgICAgICAgICAgIGZsYWdnZWRNaW5lcyA9IHNxdWFyZXMuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc01pbmVkKCk7IH0pLFxyXG4gICAgICAgICAgICBwY3QgPSB+fihmbGFnZ2VkTWluZXMubGVuZ3RoIC8gbWluZXMpO1xyXG4gICAgICAgIHJldHVybiBNYXRoLmNlaWwoKG1pbmVzICogMTApICogcGN0KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICB0aGlzLnF1ZXVlID0gW107XHJcbiAgdGhpcy5maW5hbCA9IFtdO1xyXG5cclxuICAvLyBUT0RPOiB3ZWFuIHRoaXMgY2xhc3Mgb2ZmIGRlcGVuZGVuY3kgb24gZ2FtZWJvYXJkXHJcbiAgLy8gc2hvdWxkIG9ubHkgbmVlZCB0byBoYXZlIGN0b3IgaW5qZWN0ZWQgd2l0aCB0aGUgZ2FtZWJvYXJkJ3MgZW1pdHRlclxyXG4gIHRoaXMuZ2FtZWJvYXJkID0gZ2FtZWJvYXJkO1xyXG4gIHRoaXMuZW1pdHRlciA9IGdhbWVib2FyZC5lbWl0dGVyO1xyXG4gIHRoaXMuc2NvcmUgPSAwO1xyXG5cclxuICB0aGlzLm5zdSA9IHRoaXMuX2RldGVybWluZVNpZ25pZmljYW50VW5pdCgpO1xyXG4gIHRoaXMuZW5kR2FtZSA9IGZhbHNlOyAvLyBpZiBnYW1lIGlzIG5vdyBvdmVyLCBmbHVzaCBxdWV1ZXNcclxuICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwodGhpcy5fdGljay5iaW5kKF90aGlzKSwgdGhpcy5uc3UpO1xyXG5cclxuICBjb25zb2xlLmxvZyhcIlNjb3Jla2VlcGVyIGluaXRpYWxpemVkLiAgOnNjb3JlID0+ICVvLCA6dGltZXIgPT4gJW9cIiwgdGhpcy5zY29yZSwgdGhpcy50aW1lcik7XHJcbiAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwb3MocHRzKSB7IHJldHVybiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcbmZ1bmN0aW9uIG5lZyhwdHMpIHsgcmV0dXJuIC0xICogTWF0aC5hYnMoK3B0cykgfHwgMDsgfVxyXG5cclxuU2NvcmVrZWVwZXIucHJvdG90eXBlID0ge1xyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOm9wZW4nLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAvLyBjaGVjayBkYW5nZXIgaW5kZXguLi5pZiBub3QgPiAxLCBub3QgYHVwYHMgZm9yIHRoYXQhXHJcbiAgICAgICAgaWYgKHNxdWFyZS5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICBfdGhpcy51cChzcXVhcmUuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICB9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpjbG9zZScsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge30pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuXHJcbiAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6c3RhcnQnLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgLyogU1RBUlQgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgX3RoaXMuZW5kR2FtZSA9IHRydWU7IC8qIFNUT1AgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDpvdmVyJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IF90aGlzLmVuZEdhbWUgPSB0cnVlOyAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyB9KTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX2JpbmFyeVNlYXJjaDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSA+PiAxKTtcclxuICAgICAgICAgICAgaWYgKHgudGltZSA8IHRoaXMucXVldWVbbWlkXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgaGkgPSBtaWQ7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxvID0gbWlkICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvO1xyXG4gICAgfSxcclxuICAgIF9lbnF1ZXVlOiBmdW5jdGlvbih4KSB7IHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSh0aGlzLl9iaW5hcnlTZWFyY2goeCksIDAsIHgpOyB9LFxyXG4gICAgX3Byb2Nlc3NFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmNhbGxiYWNrc1tldmVudC50eXBlXTtcclxuICAgICAgICBpZiAoZm4gIT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIChmbi5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgPyBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cywgZnVuY3Rpb24oZXJyKSB7IGlmICghZXJyKSByZXR1cm4gdm9pZCAwOyB9KVxyXG4gICAgICAgICAgICAgICAgOiBjb25zb2xlLmxvZyhcIjxzY29yZSBldmVudDogJW8+OiA6b2xkIFslb11cIiwgZm4ubmFtZSwgdGhpcy5zY29yZSksXHJcbiAgICAgICAgICAgICAgICAgIGZuLmNhbGwodGhpcywgZXZlbnQucHRzKSxcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCIuLi46bmV3ID0+IFslb11cIiwgdGhpcy5zY29yZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coXCJbU2NvcmVrZWVwZXJdIGNvdWxkIG5vdCBmaW5kIGZ1bmN0aW9uIFwiICsgZXZlbnQudHlwZSk7XHJcblxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF9wcm9jZXNzRmluYWxpemVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgZm9yICh2YXIgdmlzaXRvciBpbiB0aGlzLmZpbmFsaXplcnMpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCI8ZmluYWxpemVyOiAlbz46IDpvbGQgWyVvXSA9PiA6bmV3IFslb10uLi4gXCIsIHZpc2l0b3IsIHRoaXMuc2NvcmUsICh0aGlzLnNjb3JlICs9IHRoaXMuZmluYWxpemVyc1t2aXNpdG9yXSh0aGlzLmdhbWVib2FyZCkpKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5zY29yZSArPSB2aXNpdG9yKHRoaXMuZ2FtZWJvYXJkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZmluYWwgdXBkYXRlIG9mIHRoZSBzY29yZVxyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlOmZpbmFsXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgfSxcclxuICAgIF90aWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3VycklkeCA9IHRoaXMuX2JpbmFyeVNlYXJjaCh7IHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpIH0pLCBpbmRleCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgY3VycklkeCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChfdGhpcy5xdWV1ZVtpbmRleF0pOyByZXR1cm4gaW5kZXggKz0gMTsgfTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKDAsIGN1cnJJZHgpO1xyXG4gICAgfSxcclxuICAgIF9hZGRTY29yZVRvUXVldWU6IGZ1bmN0aW9uKHR5cGUsIHB0cykgeyByZXR1cm4gdGhpcy5fZW5xdWV1ZSh7IHRpbWU6ICgoK25ldyBEYXRlKSArIHRoaXMubnN1KSwgdHlwZTogdHlwZSwgcHRzOiBwdHMgfSk7IH0sXHJcblxyXG4gICAgdXA6IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGB1cGAgc2NvcmUgZXZlbnQgb2YgJW9cIiwgcG9zKHB0cykpOyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJ1cFwiLCBwb3MocHRzKSk7IH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbihwdHMpIHsgY29uc29sZS5sb2coXCJRdWV1ZWluZyBgZG93bmAgc2NvcmUgZXZlbnQgb2YgJW9cIiwgbmVnKHB0cykpOyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJkb3duXCIsIG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBmaW5hbFVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKHBvcyhwdHMpKTsgfSxcclxuICAgIGZpbmFsRG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuZmluYWwucHVzaChuZWcocHRzKSk7IH0sXHJcblxyXG4gICAgZ2V0UGVuZGluZ1Njb3JlQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5xdWV1ZS5sZW5ndGg7IH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCJDbGVhcmluZyBvdXQgcmVtYWluaW5nIHF1ZXVlIVwiKTtcclxuICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgdGhpcy5xdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IF90aGlzLl9wcm9jZXNzRXZlbnQoZXZlbnQpOyB9KTtcclxuXHJcbiAgICAgIHRoaXMuX3Byb2Nlc3NGaW5hbGl6ZXJzKCk7XHJcblxyXG4gICAgICBjb25zb2xlLmluZm8oXCJGSU5BTCBTQ09SRTogJW9cIiwgdGhpcy5zY29yZSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG4gICAgICB0aGlzLnF1ZXVlLmxlbmd0aCA9IDA7XHJcbiAgICAgIHRoaXMuZmluYWwubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5zY29yZSA9IDA7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3Jla2VlcGVyOyIsInZhciBTZXJpYWxpemVyID0ge1xyXG4gICAgZXhwb3J0OiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBfbWV0YToge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiArbmV3IERhdGUsXHJcbiAgICAgICAgICAgICAgICBzY29yZTogZ2FtZWJvYXJkLnNjb3Jla2VlcGVyLnNjb3JlLFxyXG4gICAgICAgICAgICAgICAgdGltZXI6IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHM6IGdhbWVib2FyZC5lbWl0dGVyLl90cmFuc2NyaXB0cyB8fCBbXSxcclxuICAgICAgICAgICAgICAgIHVzZXI6IHt9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICRlbDogZ2FtZWJvYXJkLiRlbC5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIGJvYXJkOiBnYW1lYm9hcmQuYm9hcmQuX3RhYmxlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmVrZWVwZXI6IHsgcXVldWU6IGdhbWVib2FyZC5zY29yZWtlZXBlci5xdWV1ZSwgZmluYWw6IGdhbWVib2FyZC5zY29yZWtlZXBlci5maW5hbCB9LFxyXG4gICAgICAgICAgICAgICAgZmxhc2hDb250YWluZXI6IGdhbWVib2FyZC5mbGFzaENvbnRhaW5lci5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIHRoZW1lOiBnYW1lYm9hcmQudGhlbWUsXHJcbiAgICAgICAgICAgICAgICBkZWJ1Z19tb2RlOiBnYW1lYm9hcmQuZGVidWdfbW9kZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdhbWVib2FyZC5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgbWluZXM6IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgICAgIHVzZXJNb3ZlczogZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgICAgIGlzTW9iaWxlOiBnYW1lYm9hcmQuaXNNb2JpbGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG4gICAgaW1wb3J0OiBmdW5jdGlvbihleHBvcnRlZCkge1xyXG4gICAgICAgIC8vIDEuIG5ldyBHYW1lYm9hcmQgb2JqZWN0IChkZWZhdWx0cyBpcyBvaylcclxuICAgICAgICAvLyAyLiByZXBsYWNlIGBib2FyZGAgd2l0aCBuZXcgTXVsdGltYXA6XHJcbiAgICAgICAgLy8gICAgIC0gY291bnQgYXJyYXlzIGF0IGZpcnN0IGxldmVsIGluIGJvYXJkIGZvciBudW0gcm93c1xyXG4gICAgICAgIC8vICAgICAgICAgIFtbW3tcInJvd1wiOjAsXCJjZWxsXCI6MCxcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIxMDAwXCJ9LFwiZGFuZ2VyXCI6MH0sXHJcbiAgICAgICAgLy8gICAgICAgICAge1wicm93XCI6MCxcImNlbGxcIjoyLFwic3RhdGVcIjp7XCJfZmxhZ3NcIjpcIjAwMTBcIn19XV1dXHJcbiAgICAgICAgLy8gICAgIC0gcGFyc2UgZWFjaCBvYmplY3QgdG8gY3JlYXRlIG5ldyBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIsIF9mbGFncylcclxuICAgICAgICAvLyAzLiAkZWwgPSAkKGV4cG9ydGVkLiRlbClcclxuICAgICAgICAvLyA0LiBmbGFzaENvbnRhaW5lciA9ICQoZXhwb3J0ZWQuZmxhc2hDb250YWluZXIpXHJcbiAgICAgICAgLy8gNS4gdGhlbWUgPSBleHBvcnRlZC50aGVtZVxyXG4gICAgICAgIC8vIDYuIGRlYnVnX21vZGUgPSBleHBvcnRlZC5kZWJ1Z19tb2RlXHJcbiAgICAgICAgLy8gNy4gZGltZW5zaW9ucyA9IGV4cG9ydGVkLmRpbWVuc2lvbnNcclxuICAgICAgICAvLyA4LiBtaW5lcyA9IGdhbWVib2FyZC5taW5lc1xyXG4gICAgICAgIC8vIDkuIHVzZXJNb3ZlcyA9IGdhbWVib2FkLnVzZXJNb3ZlcywgYW5kIGlzTW9iaWxlXHJcbiAgICAgICAgLy8gMTAuIG1ha2UgbmV3IENvdW50ZG93biB3aXRoIGV4cG9ydGVkLl9tZXRhLnRpbWVyID0gc2Vjb25kcywgY2xvY2suc3RhcnQoKVxyXG4gICAgICAgIC8vIDExLiBpbnN0YW50aWF0ZSBuZXcgVHJhbnNjcmliaW5nRW1pdHRlciwgbG9hZGluZyBfbWV0YS50cmFuc2NyaXB0cyBpbnRvIGl0cyBfdHJhbnNjcmlwdHNcclxuICAgICAgICAvLyAxMi4gcmUtcnVuIHRoZSBpbnRlcm5hbCBpbml0KCkgb3BzOiBfbG9hZEJvYXJkLCBfcmVuZGVyR3JpZFxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcmlhbGl6ZXI7IiwidmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvYml0LWZsYWctZmFjdG9yeScpLFxyXG4gICAgU3ltYm9scyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU3ltYm9scyxcclxuICAgIEZsYWdzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5GbGFncyxcclxuXHJcbiAgICBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbIEZsYWdzLk9QRU4sIEZsYWdzLk1JTkVELCBGbGFncy5GTEFHR0VELCBGbGFncy5JTkRFWEVEIF0pO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBmbGFncykge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBmbGFncyA/IG5ldyBCaXRGbGFncyhmbGFncykgOiBuZXcgQml0RmxhZ3M7XHJcbiAgICB0aGlzLmRhbmdlciA9IChkYW5nZXIgPT0gK2RhbmdlcikgPyArZGFuZ2VyIDogMDtcclxuXHJcbiAgICBpZiAodGhpcy5kYW5nZXIgPiAwKSB0aGlzLmluZGV4KCk7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU3F1YXJlLFxyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyBpZiAoaWR4ID09ICtpZHgpIHsgdGhpcy5kYW5nZXIgPSAraWR4OyB0aGlzLmRhbmdlciA+IDAgJiYgdGhpcy5pbmRleCgpOyB9IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWEVEKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNGbGFnZ2VkKCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpOyB9LFxyXG4gICAgaXNJbmRleGVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNJbmRleGVkKCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7IiwidmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxuXHJcbnZhciBUaGVtZVN0eWxlciA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKHRoZW1lLCAkZWwpIHtcclxuXHJcblx0XHQkZWwgfHwgKCRlbCA9ICQoJEMuRGVmYXVsdENvbmZpZy5ib2FyZCkpO1xyXG5cclxuXHRcdHZhciB0aGVtZUZpbGUgPSAkQy5UaGVtZXNbdGhlbWVdLFxyXG5cdFx0XHQkaGVhZCA9ICRlbC5wYXJlbnRzKFwiYm9keVwiKS5zaWJsaW5ncyhcImhlYWRcIiksXHJcblx0XHRcdCRzdHlsZXMgPSAkaGVhZC5maW5kKFwibGlua1wiKSxcclxuXHJcblx0XHRcdGhhc1ByZUV4aXN0aW5nID0gZnVuY3Rpb24oc3R5bGVzaGVldHMpIHtcclxuXHRcdFx0XHRyZXR1cm4gISFzdHlsZXNoZWV0cy5maWx0ZXIoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gISF+JCh0aGlzKS5hdHRyKCdocmVmJykuaW5kZXhPZih0aGVtZUZpbGUpO1xyXG5cdFx0XHRcdH0pLmxlbmd0aFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQvLyBidWlsZCBhIG5ldyA8bGluaz4gdGFnIGZvciB0aGUgZGVzaXJlZCB0aGVtZSBzdHlsZXNoZWV0OlxyXG5cdFx0XHQkbGluayA9ICQoXCI8bGluayAvPlwiLCB7XHJcblx0XHRcdFx0cmVsOiAnc3R5bGVzaGVldCcsXHJcblx0XHRcdFx0dHlwZTogJ3RleHQvY3NzJyxcclxuXHRcdFx0XHRocmVmOiAnY3NzLycgKyB0aGVtZUZpbGUgKyAnLmNzcydcclxuXHRcdFx0fSk7XHJcblx0XHQvLyB1c2luZyAkZWwgYXMgYW5jaG9yIHRvIHRoZSBET00sIGdvIHVwIGFuZFxyXG5cdFx0Ly8gbG9vayBmb3IgbGlnaHQuY3NzIG9yIGRhcmsuY3NzLCBhbmQtLWlmIG5lY2Vzc2FyeS0tc3dhcFxyXG5cdFx0Ly8gaXQgb3V0IGZvciBgdGhlbWVgLlxyXG5cdFx0Ly8gQWRkICRsaW5rIGlmZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3QhXHJcblx0XHRpZiAoIWhhc1ByZUV4aXN0aW5nKCRzdHlsZXMpKVxyXG5cdFx0XHQkc3R5bGVzLmFmdGVyKCRsaW5rKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRoZW1lU3R5bGVyOyIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9saWIvZW1pdHRlcicpLFxyXG4gICAgVHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0gcmVxdWlyZSgnLi90cmFuc2NyaXB0aW9uLXN0cmF0ZWd5Jyk7XHJcblxyXG5mdW5jdGlvbiBUcmFuc2NyaWJpbmdFbWl0dGVyKHN0cmF0ZWd5KSB7XHJcbiAgICBFbWl0dGVyLmNhbGwodGhpcyk7XHJcbiAgICB0aGlzLl90cmFuc2NyaXB0cyA9IFtdO1xyXG4gICAgdGhpcy5fc3RyYXRlZ3kgPSAoc3RyYXRlZ3kgJiYgc3RyYXRlZ3kuYXBwbHkpID8gc3RyYXRlZ3kgOiBUcmFuc2NyaXB0aW9uU3RyYXRlZ3k7XHJcbn1cclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSk7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVHJhbnNjcmliaW5nRW1pdHRlcjtcclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLl9fdHJpZ2dlcl9fID0gVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlcjtcclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKC8qIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgIC8vIHNlbmQgb3JpZ2luYWwgcGFyYW1zIHRvIHRoZSBzdWJzY3JpYmVycy4uLlxyXG4gICAgdGhpcy5fX3RyaWdnZXJfXy5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgIC8vIC4uLnRoZW4gYWx0ZXIgdGhlIHBhcmFtcyBmb3IgdGhlIHRyYW5zY3JpcHQncyByZWNvcmRzXHJcbiAgICB0aGlzLl90cmFuc2NyaXB0cy5wdXNoKHRoaXMuX3N0cmF0ZWd5LmFwcGx5KGFyZ3MpKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNjcmliaW5nRW1pdHRlcjsiLCJcbnZhciBEZWZhdWx0VHJhbnNjcmlwdGlvblN0cmF0ZWd5ID0ge1xuICAgICAgICBhcHBseTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVswXSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZGF0YVswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6b3BlblwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6Y2xvc2VcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOmZsYWdcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNxOnVuZmxhZ1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3E6bWluZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc3RhbmRhcmQgU3F1YXJlLWJhc2VkIGV2ZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAwOiBldmVudCBuYW1lLCAxOiBTcXVhcmUgaW5zdGFuY2UsIDI6IGpRdWVyeS13cmFwcGVkIERPTSBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YVsxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIlNxdWFyZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMV0gPSBKU09OLnN0cmluZ2lmeShkYXRhWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzJdIGluc3RhbmNlb2YgalF1ZXJ5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbMl0gPSBidWlsZERPTVN0cmluZyhkYXRhWzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ2I6c3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDp3aW5cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImdiOmVuZDpvdmVyXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzdGFuZGFyZCBHYW1lYm9hcmQtYmFzZWQgZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTXVsdGltYXBcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhWzFdID0gSlNPTi5zdHJpbmdpZnkoZGF0YVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcHJlZml4IGFycmF5IGNvbnRlbnRzIHdpdGggdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGl0cyBrZXlcbiAgICAgICAgICAgICAgICBkYXRhLnVuc2hpZnQoK25ldyBEYXRlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRGVmYXVsdFRyYW5zY3JpcHRpb25TdHJhdGVneTtcblxuLy8gVGFrZXMgYSA8dGQ+IERPTSBub2RlLCBhbmQgY29udmVydHMgaXQgdG8gYVxuLy8gc3RyaW5nIGRlc2NyaXB0b3IsIGUuZy4sIFwidHIjcm93MCB0ZC5jZWxsMC5taW5lZC5jbG9zZWRcIi5cbmZ1bmN0aW9uIGJ1aWxkRE9NU3RyaW5nKCRlbCkge1xuICAgIHZhciBub2RlID0gJGVsIGluc3RhbmNlb2YgalF1ZXJ5ID8gJGVsWzBdIDogJGVsLFxuICAgICAgICAvLyBzb3J0cyBjbGFzcyBuYW1lcywgcHV0dGluZyB0aGUgXCJjZWxsWFwiIGNsYXNzIGZpcnN0XG4gICAgICAgIFNPUlRfRk5fQ0VMTF9GSVJTVCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGluY2lwaXQoc3RyKSB7IHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIFwiY2VsbFwiLmxlbmd0aCkudG9Mb3dlckNhc2UoKTsgfTtcbiAgICAgICAgICAgIHJldHVybiAoaW5jaXBpdChhKSA9PT0gXCJjZWxsXCIgfHwgaW5jaXBpdChiKSA9PT0gXCJjZWxsXCIgfHwgYSA+IGIpID8gMSA6IChhIDwgYikgPyAtMSA6IDA7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgKyBcIiNcIiArIG5vZGUucGFyZW50Tm9kZS5pZCArIFwiIFwiXG4gICAgICAgICsgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBcIi5cIlxuICAgICAgICArIG5vZGUuY2xhc3NOYW1lLnNwbGl0KCcgJylcbiAgICAgICAgLnNvcnQoU09SVF9GTl9DRUxMX0ZJUlNUKVxuICAgICAgICAuam9pbignLicpO1xufVxuIiwidmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcclxuICAgIFZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vZXJyb3JzJykuVmFsaWRhdGlvbkVycm9yLFxyXG4gICAgLy8gdmFsaWRhdGlvbiBoZWxwZXIgZm5zXHJcbiAgICBpc051bWVyaWMgPSBmdW5jdGlvbih2YWwpIHtcclxuICAgICAgICByZXR1cm4gU3RyaW5nKHZhbCkucmVwbGFjZSgvLC9nLCAnJyksICh2YWwubGVuZ3RoICE9PSAwICYmICFpc05hTigrdmFsKSAmJiBpc0Zpbml0ZSgrdmFsKSk7XHJcbiAgICB9LFxyXG5cclxuICAgIFZhbGlkYXRvcnMgPSB7XHJcbiAgICAgICAgQm9hcmREaW1lbnNpb25zOiB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbihkaW0pIHtcclxuICAgICAgICAgICAgICAgIC8vIGlzIG51bWVyaWMgaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmICghaXNOdW1lcmljKGRpbSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgbm90IGEgbnVtYmVyLCBhbmQgYW4gaW52YWxpZCBib2FyZCBkaW1lbnNpb24uXCIsIGRpbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGdyZWF0ZXIgdGhhbiBNQVhfRElNRU5TSU9OUyBjb25zdGFudFxyXG4gICAgICAgICAgICAgICAgaWYgKCEoZGltIDw9ICRDLk1BWF9HUklEX0RJTUVOU0lPTlMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIGdyZWF0ZXIgdGhhbiB0aGUgZ2FtZSdzIG1heGltdW0gZ3JpZCBkaW1lbnNpb25zXCIsICtkaW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UuLi5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBNaW5lQ291bnQ6IHtcclxuICAgICAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uKG1pbmVzLCBtYXhQb3NzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJtaW5lczogJW8sIG1heFBvc3NpYmxlOiAlb1wiLCBtaW5lcywgbWF4UG9zc2libGUpXHJcbiAgICAgICAgICAgICAgICAvLyBpcyBudW1lcmljIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTnVtZXJpYyhtaW5lcykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgbm90IGEgbnVtYmVyLCBhbmQgYW4gaW52YWxpZCBudW1iZXIgb2YgbWluZXMuXCIsIG1pbmVzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgZ3JlYXRlciB0aGFuIG1heFBvc3NpYmxlIGZvciB0aGlzIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICAgICAgICAgIGlmIChtaW5lcyA+IG1heFBvc3NpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIGdyZWF0ZXIgdGhhbiB0aGUgcG9zc2libGUgbnVtYmVyIG9mIG1pbmVzICh7MX0pLlwiLCArbWluZXMsIG1heFBvc3NpYmxlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlLi4uXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmFsaWRhdG9yczsiLCIvKiEgalF1ZXJ5IHBsdWdpbiBmb3IgSGFtbWVyLkpTIC0gdjEuMC4xIC0gMjAxNC0wMi0wM1xyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBIYW1tZXIuSlMgLSB2MS4wLjdkZXYgLSAyMDE0LTAyLTE4XHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxNCBKb3JpayBUYW5nZWxkZXIgPGoudGFuZ2VsZGVyQGdtYWlsLmNvbT47XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSAqL1xyXG5cclxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIEhhbW1lclxyXG4gKiB1c2UgdGhpcyB0byBjcmVhdGUgaW5zdGFuY2VzXHJcbiAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxudmFyIEhhbW1lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICByZXR1cm4gbmV3IEhhbW1lci5JbnN0YW5jZShlbGVtZW50LCBvcHRpb25zIHx8IHt9KTtcclxufTtcclxuXHJcbi8vIGRlZmF1bHQgc2V0dGluZ3NcclxuSGFtbWVyLmRlZmF1bHRzID0ge1xyXG4gIC8vIGFkZCBzdHlsZXMgYW5kIGF0dHJpYnV0ZXMgdG8gdGhlIGVsZW1lbnQgdG8gcHJldmVudCB0aGUgYnJvd3NlciBmcm9tIGRvaW5nXHJcbiAgLy8gaXRzIG5hdGl2ZSBiZWhhdmlvci4gdGhpcyBkb2VzbnQgcHJldmVudCB0aGUgc2Nyb2xsaW5nLCBidXQgY2FuY2Vsc1xyXG4gIC8vIHRoZSBjb250ZXh0bWVudSwgdGFwIGhpZ2hsaWdodGluZyBldGNcclxuICAvLyBzZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0aGlzXHJcbiAgc3RvcF9icm93c2VyX2JlaGF2aW9yOiB7XHJcbiAgICAvLyB0aGlzIGFsc28gdHJpZ2dlcnMgb25zZWxlY3RzdGFydD1mYWxzZSBmb3IgSUVcclxuICAgIHVzZXJTZWxlY3QgICAgICAgOiAnbm9uZScsXHJcbiAgICAvLyB0aGlzIG1ha2VzIHRoZSBlbGVtZW50IGJsb2NraW5nIGluIElFMTAgPiwgeW91IGNvdWxkIGV4cGVyaW1lbnQgd2l0aCB0aGUgdmFsdWVcclxuICAgIC8vIHNlZSBmb3IgbW9yZSBvcHRpb25zIHRoaXMgaXNzdWU7IGh0dHBzOi8vZ2l0aHViLmNvbS9FaWdodE1lZGlhL2hhbW1lci5qcy9pc3N1ZXMvMjQxXHJcbiAgICB0b3VjaEFjdGlvbiAgICAgIDogJ25vbmUnLFxyXG4gICAgdG91Y2hDYWxsb3V0ICAgICA6ICdub25lJyxcclxuICAgIGNvbnRlbnRab29taW5nICAgOiAnbm9uZScsXHJcbiAgICB1c2VyRHJhZyAgICAgICAgIDogJ25vbmUnLFxyXG4gICAgdGFwSGlnaGxpZ2h0Q29sb3I6ICdyZ2JhKDAsMCwwLDApJ1xyXG4gIH1cclxuXHJcbiAgLy9cclxuICAvLyBtb3JlIHNldHRpbmdzIGFyZSBkZWZpbmVkIHBlciBnZXN0dXJlIGF0IGdlc3R1cmVzLmpzXHJcbiAgLy9cclxufTtcclxuXHJcbi8vIGRldGVjdCB0b3VjaGV2ZW50c1xyXG5IYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgPSB3aW5kb3cubmF2aWdhdG9yLnBvaW50ZXJFbmFibGVkIHx8IHdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZDtcclxuSGFtbWVyLkhBU19UT1VDSEVWRU5UUyA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpO1xyXG5cclxuLy8gZG9udCB1c2UgbW91c2VldmVudHMgb24gbW9iaWxlIGRldmljZXNcclxuSGFtbWVyLk1PQklMRV9SRUdFWCA9IC9tb2JpbGV8dGFibGV0fGlwKGFkfGhvbmV8b2QpfGFuZHJvaWR8c2lsay9pO1xyXG5IYW1tZXIuTk9fTU9VU0VFVkVOVFMgPSBIYW1tZXIuSEFTX1RPVUNIRVZFTlRTICYmIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKEhhbW1lci5NT0JJTEVfUkVHRVgpO1xyXG5cclxuLy8gZXZlbnR0eXBlcyBwZXIgdG91Y2hldmVudCAoc3RhcnQsIG1vdmUsIGVuZClcclxuLy8gYXJlIGZpbGxlZCBieSBIYW1tZXIuZXZlbnQuZGV0ZXJtaW5lRXZlbnRUeXBlcyBvbiBzZXR1cFxyXG5IYW1tZXIuRVZFTlRfVFlQRVMgPSB7fTtcclxuXHJcbi8vIGRpcmVjdGlvbiBkZWZpbmVzXHJcbkhhbW1lci5ESVJFQ1RJT05fRE9XTiA9ICdkb3duJztcclxuSGFtbWVyLkRJUkVDVElPTl9MRUZUID0gJ2xlZnQnO1xyXG5IYW1tZXIuRElSRUNUSU9OX1VQID0gJ3VwJztcclxuSGFtbWVyLkRJUkVDVElPTl9SSUdIVCA9ICdyaWdodCc7XHJcblxyXG4vLyBwb2ludGVyIHR5cGVcclxuSGFtbWVyLlBPSU5URVJfTU9VU0UgPSAnbW91c2UnO1xyXG5IYW1tZXIuUE9JTlRFUl9UT1VDSCA9ICd0b3VjaCc7XHJcbkhhbW1lci5QT0lOVEVSX1BFTiA9ICdwZW4nO1xyXG5cclxuLy8gaW50ZXJ2YWwgaW4gd2hpY2ggSGFtbWVyIHJlY2FsY3VsYXRlcyBjdXJyZW50IHZlbG9jaXR5IGluIG1zXHJcbkhhbW1lci5VUERBVEVfVkVMT0NJVFlfSU5URVJWQUwgPSAyMDtcclxuXHJcbi8vIHRvdWNoIGV2ZW50IGRlZmluZXNcclxuSGFtbWVyLkVWRU5UX1NUQVJUID0gJ3N0YXJ0JztcclxuSGFtbWVyLkVWRU5UX01PVkUgPSAnbW92ZSc7XHJcbkhhbW1lci5FVkVOVF9FTkQgPSAnZW5kJztcclxuXHJcbi8vIGhhbW1lciBkb2N1bWVudCB3aGVyZSB0aGUgYmFzZSBldmVudHMgYXJlIGFkZGVkIGF0XHJcbkhhbW1lci5ET0NVTUVOVCA9IHdpbmRvdy5kb2N1bWVudDtcclxuXHJcbi8vIHBsdWdpbnMgYW5kIGdlc3R1cmVzIG5hbWVzcGFjZXNcclxuSGFtbWVyLnBsdWdpbnMgPSBIYW1tZXIucGx1Z2lucyB8fCB7fTtcclxuSGFtbWVyLmdlc3R1cmVzID0gSGFtbWVyLmdlc3R1cmVzIHx8IHt9O1xyXG5cclxuXHJcbi8vIGlmIHRoZSB3aW5kb3cgZXZlbnRzIGFyZSBzZXQuLi5cclxuSGFtbWVyLlJFQURZID0gZmFsc2U7XHJcblxyXG4vKipcclxuICogc2V0dXAgZXZlbnRzIHRvIGRldGVjdCBnZXN0dXJlcyBvbiB0aGUgZG9jdW1lbnRcclxuICovXHJcbmZ1bmN0aW9uIHNldHVwKCkge1xyXG4gIGlmKEhhbW1lci5SRUFEWSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gZmluZCB3aGF0IGV2ZW50dHlwZXMgd2UgYWRkIGxpc3RlbmVycyB0b1xyXG4gIEhhbW1lci5ldmVudC5kZXRlcm1pbmVFdmVudFR5cGVzKCk7XHJcblxyXG4gIC8vIFJlZ2lzdGVyIGFsbCBnZXN0dXJlcyBpbnNpZGUgSGFtbWVyLmdlc3R1cmVzXHJcbiAgSGFtbWVyLnV0aWxzLmVhY2goSGFtbWVyLmdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKXtcclxuICAgIEhhbW1lci5kZXRlY3Rpb24ucmVnaXN0ZXIoZ2VzdHVyZSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIEFkZCB0b3VjaCBldmVudHMgb24gdGhlIGRvY3VtZW50XHJcbiAgSGFtbWVyLmV2ZW50Lm9uVG91Y2goSGFtbWVyLkRPQ1VNRU5ULCBIYW1tZXIuRVZFTlRfTU9WRSwgSGFtbWVyLmRldGVjdGlvbi5kZXRlY3QpO1xyXG4gIEhhbW1lci5ldmVudC5vblRvdWNoKEhhbW1lci5ET0NVTUVOVCwgSGFtbWVyLkVWRU5UX0VORCwgSGFtbWVyLmRldGVjdGlvbi5kZXRlY3QpO1xyXG5cclxuICAvLyBIYW1tZXIgaXMgcmVhZHkuLi4hXHJcbiAgSGFtbWVyLlJFQURZID0gdHJ1ZTtcclxufVxyXG5cclxuSGFtbWVyLnV0aWxzID0ge1xyXG4gIC8qKlxyXG4gICAqIGV4dGVuZCBtZXRob2QsXHJcbiAgICogYWxzbyB1c2VkIGZvciBjbG9uaW5nIHdoZW4gZGVzdCBpcyBhbiBlbXB0eSBvYmplY3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBkZXN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgc3JjXHJcbiAgICogQHBhcm0gIHtCb29sZWFufSAgbWVyZ2UgICAgZG8gYSBtZXJnZVxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIGRlc3RcclxuICAgKi9cclxuICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChkZXN0LCBzcmMsIG1lcmdlKSB7XHJcbiAgICBmb3IodmFyIGtleSBpbiBzcmMpIHtcclxuICAgICAgaWYoZGVzdFtrZXldICE9PSB1bmRlZmluZWQgJiYgbWVyZ2UpIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG4gICAgICBkZXN0W2tleV0gPSBzcmNba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBkZXN0O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBmb3IgZWFjaFxyXG4gICAqIEBwYXJhbSBvYmpcclxuICAgKiBAcGFyYW0gaXRlcmF0b3JcclxuICAgKi9cclxuICBlYWNoOiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XHJcbiAgICB2YXIgaSwgbGVuZ3RoO1xyXG4gICAgLy8gbmF0aXZlIGZvckVhY2ggb24gYXJyYXlzXHJcbiAgICBpZiAoJ2ZvckVhY2gnIGluIG9iaikge1xyXG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICAvLyBhcnJheXNcclxuICAgIGVsc2UgaWYob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIG9iamVjdHNcclxuICAgIGVsc2Uge1xyXG4gICAgICBmb3IgKGkgaW4gb2JqKSB7XHJcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSAmJiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBmaW5kIGlmIGEgbm9kZSBpcyBpbiB0aGUgZ2l2ZW4gcGFyZW50XHJcbiAgICogdXNlZCBmb3IgZXZlbnQgZGVsZWdhdGlvbiB0cmlja3NcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgbm9kZVxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBwYXJlbnRcclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gICAgICAgaGFzX3BhcmVudFxyXG4gICAqL1xyXG4gIGhhc1BhcmVudDogZnVuY3Rpb24obm9kZSwgcGFyZW50KSB7XHJcbiAgICB3aGlsZShub2RlKSB7XHJcbiAgICAgIGlmKG5vZGUgPT0gcGFyZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IHRoZSBjZW50ZXIgb2YgYWxsIHRoZSB0b3VjaGVzXHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgdG91Y2hlc1xyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIGNlbnRlclxyXG4gICAqL1xyXG4gIGdldENlbnRlcjogZnVuY3Rpb24gZ2V0Q2VudGVyKHRvdWNoZXMpIHtcclxuICAgIHZhciB2YWx1ZXNYID0gW10sIHZhbHVlc1kgPSBbXTtcclxuXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0b3VjaGVzLCBmdW5jdGlvbih0b3VjaCkge1xyXG4gICAgICAvLyBJIHByZWZlciBjbGllbnRYIGJlY2F1c2UgaXQgaWdub3JlIHRoZSBzY3JvbGxpbmcgcG9zaXRpb25cclxuICAgICAgdmFsdWVzWC5wdXNoKHR5cGVvZiB0b3VjaC5jbGllbnRYICE9PSAndW5kZWZpbmVkJyA/IHRvdWNoLmNsaWVudFggOiB0b3VjaC5wYWdlWCApO1xyXG4gICAgICB2YWx1ZXNZLnB1c2godHlwZW9mIHRvdWNoLmNsaWVudFkgIT09ICd1bmRlZmluZWQnID8gdG91Y2guY2xpZW50WSA6IHRvdWNoLnBhZ2VZICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBwYWdlWDogKChNYXRoLm1pbi5hcHBseShNYXRoLCB2YWx1ZXNYKSArIE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlc1gpKSAvIDIpLFxyXG4gICAgICBwYWdlWTogKChNYXRoLm1pbi5hcHBseShNYXRoLCB2YWx1ZXNZKSArIE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlc1kpKSAvIDIpXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHZlbG9jaXR5IGJldHdlZW4gdHdvIHBvaW50c1xyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3RpbWVcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV94XHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfeVxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIHZlbG9jaXR5XHJcbiAgICovXHJcbiAgZ2V0VmVsb2NpdHk6IGZ1bmN0aW9uIGdldFZlbG9jaXR5KGRlbHRhX3RpbWUsIGRlbHRhX3gsIGRlbHRhX3kpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IE1hdGguYWJzKGRlbHRhX3ggLyBkZWx0YV90aW1lKSB8fCAwLFxyXG4gICAgICB5OiBNYXRoLmFicyhkZWx0YV95IC8gZGVsdGFfdGltZSkgfHwgMFxyXG4gICAgfTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBhbmdsZSBiZXR3ZWVuIHR3byBjb29yZGluYXRlc1xyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIGFuZ2xlXHJcbiAgICovXHJcbiAgZ2V0QW5nbGU6IGZ1bmN0aW9uIGdldEFuZ2xlKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeSA9IHRvdWNoMi5wYWdlWSAtIHRvdWNoMS5wYWdlWSxcclxuICAgICAgeCA9IHRvdWNoMi5wYWdlWCAtIHRvdWNoMS5wYWdlWDtcclxuICAgIHJldHVybiBNYXRoLmF0YW4yKHksIHgpICogMTgwIC8gTWF0aC5QSTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogYW5nbGUgdG8gZGlyZWN0aW9uIGRlZmluZVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9ICAgIGRpcmVjdGlvbiBjb25zdGFudCwgbGlrZSBIYW1tZXIuRElSRUNUSU9OX0xFRlRcclxuICAgKi9cclxuICBnZXREaXJlY3Rpb246IGZ1bmN0aW9uIGdldERpcmVjdGlvbih0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHggPSBNYXRoLmFicyh0b3VjaDEucGFnZVggLSB0b3VjaDIucGFnZVgpLFxyXG4gICAgICB5ID0gTWF0aC5hYnModG91Y2gxLnBhZ2VZIC0gdG91Y2gyLnBhZ2VZKTtcclxuXHJcbiAgICBpZih4ID49IHkpIHtcclxuICAgICAgcmV0dXJuIHRvdWNoMS5wYWdlWCAtIHRvdWNoMi5wYWdlWCA+IDAgPyBIYW1tZXIuRElSRUNUSU9OX0xFRlQgOiBIYW1tZXIuRElSRUNUSU9OX1JJR0hUO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHJldHVybiB0b3VjaDEucGFnZVkgLSB0b3VjaDIucGFnZVkgPiAwID8gSGFtbWVyLkRJUkVDVElPTl9VUCA6IEhhbW1lci5ESVJFQ1RJT05fRE9XTjtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byB0b3VjaGVzXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgZGlzdGFuY2VcclxuICAgKi9cclxuICBnZXREaXN0YW5jZTogZnVuY3Rpb24gZ2V0RGlzdGFuY2UodG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB4ID0gdG91Y2gyLnBhZ2VYIC0gdG91Y2gxLnBhZ2VYLFxyXG4gICAgICB5ID0gdG91Y2gyLnBhZ2VZIC0gdG91Y2gxLnBhZ2VZO1xyXG4gICAgcmV0dXJuIE1hdGguc3FydCgoeCAqIHgpICsgKHkgKiB5KSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgc2NhbGUgZmFjdG9yIGJldHdlZW4gdHdvIHRvdWNoTGlzdHMgKGZpbmdlcnMpXHJcbiAgICogbm8gc2NhbGUgaXMgMSwgYW5kIGdvZXMgZG93biB0byAwIHdoZW4gcGluY2hlZCB0b2dldGhlciwgYW5kIGJpZ2dlciB3aGVuIHBpbmNoZWQgb3V0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgc3RhcnRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBlbmRcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBzY2FsZVxyXG4gICAqL1xyXG4gIGdldFNjYWxlOiBmdW5jdGlvbiBnZXRTY2FsZShzdGFydCwgZW5kKSB7XHJcbiAgICAvLyBuZWVkIHR3byBmaW5nZXJzLi4uXHJcbiAgICBpZihzdGFydC5sZW5ndGggPj0gMiAmJiBlbmQubGVuZ3RoID49IDIpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGlzdGFuY2UoZW5kWzBdLCBlbmRbMV0pIC9cclxuICAgICAgICB0aGlzLmdldERpc3RhbmNlKHN0YXJ0WzBdLCBzdGFydFsxXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSByb3RhdGlvbiBkZWdyZWVzIGJldHdlZW4gdHdvIHRvdWNoTGlzdHMgKGZpbmdlcnMpXHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgc3RhcnRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBlbmRcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICByb3RhdGlvblxyXG4gICAqL1xyXG4gIGdldFJvdGF0aW9uOiBmdW5jdGlvbiBnZXRSb3RhdGlvbihzdGFydCwgZW5kKSB7XHJcbiAgICAvLyBuZWVkIHR3byBmaW5nZXJzXHJcbiAgICBpZihzdGFydC5sZW5ndGggPj0gMiAmJiBlbmQubGVuZ3RoID49IDIpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0QW5nbGUoZW5kWzFdLCBlbmRbMF0pIC1cclxuICAgICAgICB0aGlzLmdldEFuZ2xlKHN0YXJ0WzFdLCBzdGFydFswXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMDtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogYm9vbGVhbiBpZiB0aGUgZGlyZWN0aW9uIGlzIHZlcnRpY2FsXHJcbiAgICogQHBhcmFtICAgIHtTdHJpbmd9ICAgIGRpcmVjdGlvblxyXG4gICAqIEByZXR1cm5zICB7Qm9vbGVhbn0gICBpc192ZXJ0aWNhbFxyXG4gICAqL1xyXG4gIGlzVmVydGljYWw6IGZ1bmN0aW9uIGlzVmVydGljYWwoZGlyZWN0aW9uKSB7XHJcbiAgICByZXR1cm4gKGRpcmVjdGlvbiA9PSBIYW1tZXIuRElSRUNUSU9OX1VQIHx8IGRpcmVjdGlvbiA9PSBIYW1tZXIuRElSRUNUSU9OX0RPV04pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzdG9wIGJyb3dzZXIgZGVmYXVsdCBiZWhhdmlvciB3aXRoIGNzcyBwcm9wc1xyXG4gICAqIEBwYXJhbSAgIHtIdG1sRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNzc19wcm9wc1xyXG4gICAqL1xyXG4gIHN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yOiBmdW5jdGlvbiBzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcihlbGVtZW50LCBjc3NfcHJvcHMpIHtcclxuICAgIGlmKCFjc3NfcHJvcHMgfHwgIWVsZW1lbnQgfHwgIWVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHdpdGggY3NzIHByb3BlcnRpZXMgZm9yIG1vZGVybiBicm93c2Vyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goWyd3ZWJraXQnLCAna2h0bWwnLCAnbW96JywgJ01veicsICdtcycsICdvJywgJyddLCBmdW5jdGlvbih2ZW5kb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goY3NzX3Byb3BzLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xyXG4gICAgICAgICAgLy8gdmVuZGVyIHByZWZpeCBhdCB0aGUgcHJvcGVydHlcclxuICAgICAgICAgIGlmKHZlbmRvcikge1xyXG4gICAgICAgICAgICBwcm9wID0gdmVuZG9yICsgcHJvcC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gc2V0IHRoZSBzdHlsZVxyXG4gICAgICAgICAgaWYocHJvcCBpbiBlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGVbcHJvcF0gPSB2YWx1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhbHNvIHRoZSBkaXNhYmxlIG9uc2VsZWN0c3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyU2VsZWN0ID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uc2VsZWN0c3RhcnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYW5kIGRpc2FibGUgb25kcmFnc3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyRHJhZyA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbmRyYWdzdGFydCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogcmV2ZXJ0cyBhbGwgY2hhbmdlcyBtYWRlIGJ5ICdzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcidcclxuICAgKiBAcGFyYW0gICB7SHRtbEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBjc3NfcHJvcHNcclxuICAgKi9cclxuICBzdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3I6IGZ1bmN0aW9uIHN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcihlbGVtZW50LCBjc3NfcHJvcHMpIHtcclxuICAgIGlmKCFjc3NfcHJvcHMgfHwgIWVsZW1lbnQgfHwgIWVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHdpdGggY3NzIHByb3BlcnRpZXMgZm9yIG1vZGVybiBicm93c2Vyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goWyd3ZWJraXQnLCAna2h0bWwnLCAnbW96JywgJ01veicsICdtcycsICdvJywgJyddLCBmdW5jdGlvbih2ZW5kb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goY3NzX3Byb3BzLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xyXG4gICAgICAgICAgLy8gdmVuZGVyIHByZWZpeCBhdCB0aGUgcHJvcGVydHlcclxuICAgICAgICAgIGlmKHZlbmRvcikge1xyXG4gICAgICAgICAgICBwcm9wID0gdmVuZG9yICsgcHJvcC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gcmVzZXQgdGhlIHN0eWxlXHJcbiAgICAgICAgICBpZihwcm9wIGluIGVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9ICcnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFsc28gdGhlIGVuYWJsZSBvbnNlbGVjdHN0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlclNlbGVjdCA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbnNlbGVjdHN0YXJ0ID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhbmQgZW5hYmxlIG9uZHJhZ3N0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlckRyYWcgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25kcmFnc3RhcnQgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogY3JlYXRlIG5ldyBoYW1tZXIgaW5zdGFuY2VcclxuICogYWxsIG1ldGhvZHMgc2hvdWxkIHJldHVybiB0aGUgaW5zdGFuY2UgaXRzZWxmLCBzbyBpdCBpcyBjaGFpbmFibGUuXHJcbiAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICAgICAgZWxlbWVudFxyXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgIFtvcHRpb25zPXt9XVxyXG4gKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbkhhbW1lci5JbnN0YW5jZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIHNldHVwIEhhbW1lckpTIHdpbmRvdyBldmVudHMgYW5kIHJlZ2lzdGVyIGFsbCBnZXN0dXJlc1xyXG4gIC8vIHRoaXMgYWxzbyBzZXRzIHVwIHRoZSBkZWZhdWx0IG9wdGlvbnNcclxuICBzZXR1cCgpO1xyXG5cclxuICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xyXG5cclxuICAvLyBzdGFydC9zdG9wIGRldGVjdGlvbiBvcHRpb25cclxuICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xyXG5cclxuICAvLyBtZXJnZSBvcHRpb25zXHJcbiAgdGhpcy5vcHRpb25zID0gSGFtbWVyLnV0aWxzLmV4dGVuZChcclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoe30sIEhhbW1lci5kZWZhdWx0cyksXHJcbiAgICBvcHRpb25zIHx8IHt9KTtcclxuXHJcbiAgLy8gYWRkIHNvbWUgY3NzIHRvIHRoZSBlbGVtZW50IHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSBkb2luZyBpdHMgbmF0aXZlIGJlaGF2b2lyXHJcbiAgaWYodGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcikge1xyXG4gICAgSGFtbWVyLnV0aWxzLnN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcik7XHJcbiAgfVxyXG5cclxuICAvLyBzdGFydCBkZXRlY3Rpb24gb24gdG91Y2hzdGFydFxyXG4gIHRoaXMuX2V2ZW50U3RhcnRIYW5kbGVyID0gSGFtbWVyLmV2ZW50Lm9uVG91Y2goZWxlbWVudCwgSGFtbWVyLkVWRU5UX1NUQVJULCBmdW5jdGlvbihldikge1xyXG4gICAgaWYoc2VsZi5lbmFibGVkKSB7XHJcbiAgICAgIEhhbW1lci5kZXRlY3Rpb24uc3RhcnREZXRlY3Qoc2VsZiwgZXYpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvLyBrZWVwIGEgbGlzdCBvZiB1c2VyIGV2ZW50IGhhbmRsZXJzIHdoaWNoIG5lZWRzIHRvIGJlIHJlbW92ZWQgd2hlbiBjYWxsaW5nICdkaXNwb3NlJ1xyXG4gIHRoaXMuX2V2ZW50SGFuZGxlciA9IFtdO1xyXG5cclxuICAvLyByZXR1cm4gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblxyXG5IYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlID0ge1xyXG4gIC8qKlxyXG4gICAqIGJpbmQgZXZlbnRzIHRvIHRoZSBpbnN0YW5jZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgaGFuZGxlclxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgb246IGZ1bmN0aW9uIG9uRXZlbnQoZ2VzdHVyZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIGdlc3R1cmVzID0gZ2VzdHVyZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZ2VzdHVyZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgICB0aGlzLl9ldmVudEhhbmRsZXIucHVzaCh7IGdlc3R1cmU6IGdlc3R1cmUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB1bmJpbmQgZXZlbnRzIHRvIHRoZSBpbnN0YW5jZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgaGFuZGxlclxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgb2ZmOiBmdW5jdGlvbiBvZmZFdmVudChnZXN0dXJlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgZ2VzdHVyZXMgPSBnZXN0dXJlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChnZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihnZXN0dXJlLCBoYW5kbGVyLCBmYWxzZSk7XHJcblxyXG4gICAgICAvLyByZW1vdmUgdGhlIGV2ZW50IGhhbmRsZXIgZnJvbSB0aGUgaW50ZXJuYWwgbGlzdFxyXG4gICAgICB2YXIgaW5kZXggPSAtMTtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5fZXZlbnRIYW5kbGVyLCBmdW5jdGlvbihldmVudEhhbmRsZXIsIGkpIHtcclxuICAgICAgICBpZiAoaW5kZXggPT09IC0xICYmIGV2ZW50SGFuZGxlci5nZXN0dXJlID09PSBnZXN0dXJlICYmIGV2ZW50SGFuZGxlci5oYW5kbGVyID09PSBoYW5kbGVyKSB7XHJcbiAgICAgICAgICBpbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRIYW5kbGVyLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH1cclxuICAgIH0sIHRoaXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRyaWdnZXIgZ2VzdHVyZSBldmVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgW2V2ZW50RGF0YV1cclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIHRyaWdnZXI6IGZ1bmN0aW9uIHRyaWdnZXJFdmVudChnZXN0dXJlLCBldmVudERhdGEpIHtcclxuICAgIC8vIG9wdGlvbmFsXHJcbiAgICBpZighZXZlbnREYXRhKSB7XHJcbiAgICAgIGV2ZW50RGF0YSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNyZWF0ZSBET00gZXZlbnRcclxuICAgIHZhciBldmVudCA9IEhhbW1lci5ET0NVTUVOVC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcclxuICAgIGV2ZW50LmluaXRFdmVudChnZXN0dXJlLCB0cnVlLCB0cnVlKTtcclxuICAgIGV2ZW50Lmdlc3R1cmUgPSBldmVudERhdGE7XHJcblxyXG4gICAgLy8gdHJpZ2dlciBvbiB0aGUgdGFyZ2V0IGlmIGl0IGlzIGluIHRoZSBpbnN0YW5jZSBlbGVtZW50LFxyXG4gICAgLy8gdGhpcyBpcyBmb3IgZXZlbnQgZGVsZWdhdGlvbiB0cmlja3NcclxuICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xyXG4gICAgaWYoSGFtbWVyLnV0aWxzLmhhc1BhcmVudChldmVudERhdGEudGFyZ2V0LCBlbGVtZW50KSkge1xyXG4gICAgICBlbGVtZW50ID0gZXZlbnREYXRhLnRhcmdldDtcclxuICAgIH1cclxuXHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGVuYWJsZSBvZiBkaXNhYmxlIGhhbW1lci5qcyBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7Qm9vbGVhbn0gICBzdGF0ZVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgZW5hYmxlOiBmdW5jdGlvbiBlbmFibGUoc3RhdGUpIHtcclxuICAgIHRoaXMuZW5hYmxlZCA9IHN0YXRlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGRpc3Bvc2UgdGhpcyBoYW1tZXIgaW5zdGFuY2VcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIGRpc3Bvc2U6IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XHJcblxyXG4gICAgLy8gdW5kbyBhbGwgY2hhbmdlcyBtYWRlIGJ5IHN0b3BfYnJvd3Nlcl9iZWhhdmlvclxyXG4gICAgaWYodGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdW5iaW5kIGFsbCBjdXN0b20gZXZlbnQgaGFuZGxlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuX2V2ZW50SGFuZGxlciwgZnVuY3Rpb24oZXZlbnRIYW5kbGVyKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50SGFuZGxlci5nZXN0dXJlLCBldmVudEhhbmRsZXIuaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIubGVuZ3RoID0gMDtcclxuXHJcbiAgICAvLyB1bmJpbmQgdGhlIHN0YXJ0IGV2ZW50IGxpc3RlbmVyXHJcbiAgICBIYW1tZXIuZXZlbnQudW5iaW5kRG9tKHRoaXMuZWxlbWVudCwgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9TVEFSVF0sIHRoaXMuX2V2ZW50U3RhcnRIYW5kbGVyKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogdGhpcyBob2xkcyB0aGUgbGFzdCBtb3ZlIGV2ZW50LFxyXG4gKiB1c2VkIHRvIGZpeCBlbXB0eSB0b3VjaGVuZCBpc3N1ZVxyXG4gKiBzZWUgdGhlIG9uVG91Y2ggZXZlbnQgZm9yIGFuIGV4cGxhbmF0aW9uXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqL1xyXG52YXIgbGFzdF9tb3ZlX2V2ZW50ID0gbnVsbDtcclxuXHJcblxyXG4vKipcclxuICogd2hlbiB0aGUgbW91c2UgaXMgaG9sZCBkb3duLCB0aGlzIGlzIHRydWVcclxuICogQHR5cGUge0Jvb2xlYW59XHJcbiAqL1xyXG52YXIgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG5cclxuXHJcbi8qKlxyXG4gKiB3aGVuIHRvdWNoIGV2ZW50cyBoYXZlIGJlZW4gZmlyZWQsIHRoaXMgaXMgdHJ1ZVxyXG4gKiBAdHlwZSB7Qm9vbGVhbn1cclxuICovXHJcbnZhciB0b3VjaF90cmlnZ2VyZWQgPSBmYWxzZTtcclxuXHJcblxyXG5IYW1tZXIuZXZlbnQgPSB7XHJcbiAgLyoqXHJcbiAgICogc2ltcGxlIGFkZEV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICB0eXBlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBiaW5kRG9tOiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgdHlwZXMgPSB0eXBlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSl7XHJcbiAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc2ltcGxlIHJlbW92ZUV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICB0eXBlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICB1bmJpbmREb206IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciB0eXBlcyA9IHR5cGUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHR5cGVzLCBmdW5jdGlvbih0eXBlKXtcclxuICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB0b3VjaCBldmVudHMgd2l0aCBtb3VzZSBmYWxsYmFja1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZSAgICAgICAgbGlrZSBIYW1tZXIuRVZFTlRfTU9WRVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgb25Ub3VjaDogZnVuY3Rpb24gb25Ub3VjaChlbGVtZW50LCBldmVudFR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgZm4gPSBmdW5jdGlvbiBiaW5kRG9tT25Ub3VjaChldikge1xyXG4gICAgICB2YXIgc291cmNlRXZlbnRUeXBlID0gZXYudHlwZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgLy8gb25tb3VzZXVwLCBidXQgd2hlbiB0b3VjaGVuZCBoYXMgYmVlbiBmaXJlZCB3ZSBkbyBub3RoaW5nLlxyXG4gICAgICAvLyB0aGlzIGlzIGZvciB0b3VjaGRldmljZXMgd2hpY2ggYWxzbyBmaXJlIGEgbW91c2V1cCBvbiB0b3VjaGVuZFxyXG4gICAgICBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgdG91Y2hfdHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBtb3VzZWJ1dHRvbiBtdXN0IGJlIGRvd24gb3IgYSB0b3VjaCBldmVudFxyXG4gICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2gvKSB8fCAgIC8vIHRvdWNoIGV2ZW50cyBhcmUgYWx3YXlzIG9uIHNjcmVlblxyXG4gICAgICAgIHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvcG9pbnRlcmRvd24vKSB8fCAvLyBwb2ludGVyZXZlbnRzIHRvdWNoXHJcbiAgICAgICAgKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiBldi53aGljaCA9PT0gMSkgICAvLyBtb3VzZSBpcyBwcmVzc2VkXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG1vdXNlIGlzbid0IHByZXNzZWRcclxuICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgIWV2LndoaWNoKSB7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgLy8gd2UgYXJlIGluIGEgdG91Y2ggZXZlbnQsIHNldCB0aGUgdG91Y2ggdHJpZ2dlcmVkIGJvb2wgdG8gdHJ1ZSxcclxuICAgICAgLy8gdGhpcyBmb3IgdGhlIGNvbmZsaWN0cyB0aGF0IG1heSBvY2N1ciBvbiBpb3MgYW5kIGFuZHJvaWRcclxuICAgICAgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaHxwb2ludGVyLykpIHtcclxuICAgICAgICB0b3VjaF90cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjb3VudCB0aGUgdG90YWwgdG91Y2hlcyBvbiB0aGUgc2NyZWVuXHJcbiAgICAgIHZhciBjb3VudF90b3VjaGVzID0gMDtcclxuXHJcbiAgICAgIC8vIHdoZW4gdG91Y2ggaGFzIGJlZW4gdHJpZ2dlcmVkIGluIHRoaXMgZGV0ZWN0aW9uIHNlc3Npb25cclxuICAgICAgLy8gYW5kIHdlIGFyZSBub3cgaGFuZGxpbmcgYSBtb3VzZSBldmVudCwgd2Ugc3RvcCB0aGF0IHRvIHByZXZlbnQgY29uZmxpY3RzXHJcbiAgICAgIGlmKGVuYWJsZV9kZXRlY3QpIHtcclxuICAgICAgICAvLyB1cGRhdGUgcG9pbnRlcmV2ZW50XHJcbiAgICAgICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTICYmIGV2ZW50VHlwZSAhPSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC51cGRhdGVQb2ludGVyKGV2ZW50VHlwZSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0b3VjaFxyXG4gICAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaC8pKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gZXYudG91Y2hlcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG1vdXNlXHJcbiAgICAgICAgZWxzZSBpZighdG91Y2hfdHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gc291cmNlRXZlbnRUeXBlLm1hdGNoKC91cC8pID8gMCA6IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiB3ZSBhcmUgaW4gYSBlbmQgZXZlbnQsIGJ1dCB3aGVuIHdlIHJlbW92ZSBvbmUgdG91Y2ggYW5kXHJcbiAgICAgICAgLy8gd2Ugc3RpbGwgaGF2ZSBlbm91Z2gsIHNldCBldmVudFR5cGUgdG8gbW92ZVxyXG4gICAgICAgIGlmKGNvdW50X3RvdWNoZXMgPiAwICYmIGV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBldmVudFR5cGUgPSBIYW1tZXIuRVZFTlRfTU9WRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbm8gdG91Y2hlcywgZm9yY2UgdGhlIGVuZCBldmVudFxyXG4gICAgICAgIGVsc2UgaWYoIWNvdW50X3RvdWNoZXMpIHtcclxuICAgICAgICAgIGV2ZW50VHlwZSA9IEhhbW1lci5FVkVOVF9FTkQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzdG9yZSB0aGUgbGFzdCBtb3ZlIGV2ZW50XHJcbiAgICAgICAgaWYoY291bnRfdG91Y2hlcyB8fCBsYXN0X21vdmVfZXZlbnQgPT09IG51bGwpIHtcclxuICAgICAgICAgIGxhc3RfbW92ZV9ldmVudCA9IGV2O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciB0aGUgaGFuZGxlclxyXG4gICAgICAgIGhhbmRsZXIuY2FsbChIYW1tZXIuZGV0ZWN0aW9uLCBzZWxmLmNvbGxlY3RFdmVudERhdGEoZWxlbWVudCwgZXZlbnRUeXBlLCBzZWxmLmdldFRvdWNoTGlzdChsYXN0X21vdmVfZXZlbnQsIGV2ZW50VHlwZSksIGV2KSk7XHJcblxyXG4gICAgICAgIC8vIHJlbW92ZSBwb2ludGVyZXZlbnQgZnJvbSBsaXN0XHJcbiAgICAgICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTICYmIGV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC51cGRhdGVQb2ludGVyKGV2ZW50VHlwZSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gb24gdGhlIGVuZCB3ZSByZXNldCBldmVyeXRoaW5nXHJcbiAgICAgIGlmKCFjb3VudF90b3VjaGVzKSB7XHJcbiAgICAgICAgbGFzdF9tb3ZlX2V2ZW50ID0gbnVsbDtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcbiAgICAgICAgdG91Y2hfdHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgSGFtbWVyLlBvaW50ZXJFdmVudC5yZXNldCgpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYmluZERvbShlbGVtZW50LCBIYW1tZXIuRVZFTlRfVFlQRVNbZXZlbnRUeXBlXSwgZm4pO1xyXG5cclxuICAgIC8vIHJldHVybiB0aGUgYm91bmQgZnVuY3Rpb24gdG8gYmUgYWJsZSB0byB1bmJpbmQgaXQgbGF0ZXJcclxuICAgIHJldHVybiBmbjtcclxuICAgIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB3ZSBoYXZlIGRpZmZlcmVudCBldmVudHMgZm9yIGVhY2ggZGV2aWNlL2Jyb3dzZXJcclxuICAgKiBkZXRlcm1pbmUgd2hhdCB3ZSBuZWVkIGFuZCBzZXQgdGhlbSBpbiB0aGUgSGFtbWVyLkVWRU5UX1RZUEVTIGNvbnN0YW50XHJcbiAgICovXHJcbiAgZGV0ZXJtaW5lRXZlbnRUeXBlczogZnVuY3Rpb24gZGV0ZXJtaW5lRXZlbnRUeXBlcygpIHtcclxuICAgIC8vIGRldGVybWluZSB0aGUgZXZlbnR0eXBlIHdlIHdhbnQgdG8gc2V0XHJcbiAgICB2YXIgdHlwZXM7XHJcblxyXG4gICAgLy8gcG9pbnRlckV2ZW50cyBtYWdpY1xyXG4gICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTKSB7XHJcbiAgICAgIHR5cGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC5nZXRFdmVudHMoKTtcclxuICAgIH1cclxuICAgIC8vIG9uIEFuZHJvaWQsIGlPUywgYmxhY2tiZXJyeSwgd2luZG93cyBtb2JpbGUgd2UgZG9udCB3YW50IGFueSBtb3VzZWV2ZW50c1xyXG4gICAgZWxzZSBpZihIYW1tZXIuTk9fTU9VU0VFVkVOVFMpIHtcclxuICAgICAgdHlwZXMgPSBbXHJcbiAgICAgICAgJ3RvdWNoc3RhcnQnLFxyXG4gICAgICAgICd0b3VjaG1vdmUnLFxyXG4gICAgICAgICd0b3VjaGVuZCB0b3VjaGNhbmNlbCddO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yIG5vbiBwb2ludGVyIGV2ZW50cyBicm93c2VycyBhbmQgbWl4ZWQgYnJvd3NlcnMsXHJcbiAgICAvLyBsaWtlIGNocm9tZSBvbiB3aW5kb3dzOCB0b3VjaCBsYXB0b3BcclxuICAgIGVsc2Uge1xyXG4gICAgICB0eXBlcyA9IFtcclxuICAgICAgICAndG91Y2hzdGFydCBtb3VzZWRvd24nLFxyXG4gICAgICAgICd0b3VjaG1vdmUgbW91c2Vtb3ZlJyxcclxuICAgICAgICAndG91Y2hlbmQgdG91Y2hjYW5jZWwgbW91c2V1cCddO1xyXG4gICAgfVxyXG5cclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfU1RBUlRdID0gdHlwZXNbMF07XHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX01PVkVdID0gdHlwZXNbMV07XHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX0VORF0gPSB0eXBlc1syXTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY3JlYXRlIHRvdWNobGlzdCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICBldmVudFR5cGUgICB1c2VkIGJ5IHRoZSBmYWtlbXVsdGl0b3VjaCBwbHVnaW5cclxuICAgKi9cclxuICBnZXRUb3VjaExpc3Q6IGZ1bmN0aW9uIGdldFRvdWNoTGlzdChldi8qLCBldmVudFR5cGUqLykge1xyXG4gICAgLy8gZ2V0IHRoZSBmYWtlIHBvaW50ZXJFdmVudCB0b3VjaGxpc3RcclxuICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUykge1xyXG4gICAgICByZXR1cm4gSGFtbWVyLlBvaW50ZXJFdmVudC5nZXRUb3VjaExpc3QoKTtcclxuICAgIH1cclxuICAgIC8vIGdldCB0aGUgdG91Y2hsaXN0XHJcbiAgICBlbHNlIGlmKGV2LnRvdWNoZXMpIHtcclxuICAgICAgcmV0dXJuIGV2LnRvdWNoZXM7XHJcbiAgICB9XHJcbiAgICAvLyBtYWtlIGZha2UgdG91Y2hsaXN0IGZyb20gbW91c2UgcG9zaXRpb25cclxuICAgIGVsc2Uge1xyXG4gICAgICBldi5pZGVudGlmaWVyID0gMTtcclxuICAgICAgcmV0dXJuIFtldl07XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNvbGxlY3QgZXZlbnQgZGF0YSBmb3IgSGFtbWVyIGpzXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlICAgICAgICBsaWtlIEhhbW1lci5FVkVOVF9NT1ZFXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIGNvbGxlY3RFdmVudERhdGE6IGZ1bmN0aW9uIGNvbGxlY3RFdmVudERhdGEoZWxlbWVudCwgZXZlbnRUeXBlLCB0b3VjaGVzLCBldikge1xyXG4gICAgLy8gZmluZCBvdXQgcG9pbnRlclR5cGVcclxuICAgIHZhciBwb2ludGVyVHlwZSA9IEhhbW1lci5QT0lOVEVSX1RPVUNIO1xyXG4gICAgaWYoZXYudHlwZS5tYXRjaCgvbW91c2UvKSB8fCBIYW1tZXIuUG9pbnRlckV2ZW50Lm1hdGNoVHlwZShIYW1tZXIuUE9JTlRFUl9NT1VTRSwgZXYpKSB7XHJcbiAgICAgIHBvaW50ZXJUeXBlID0gSGFtbWVyLlBPSU5URVJfTU9VU0U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY2VudGVyICAgICA6IEhhbW1lci51dGlscy5nZXRDZW50ZXIodG91Y2hlcyksXHJcbiAgICAgIHRpbWVTdGFtcCAgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuICAgICAgdGFyZ2V0ICAgICA6IGV2LnRhcmdldCxcclxuICAgICAgdG91Y2hlcyAgICA6IHRvdWNoZXMsXHJcbiAgICAgIGV2ZW50VHlwZSAgOiBldmVudFR5cGUsXHJcbiAgICAgIHBvaW50ZXJUeXBlOiBwb2ludGVyVHlwZSxcclxuICAgICAgc3JjRXZlbnQgICA6IGV2LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHByZXZlbnQgdGhlIGJyb3dzZXIgZGVmYXVsdCBhY3Rpb25zXHJcbiAgICAgICAqIG1vc3RseSB1c2VkIHRvIGRpc2FibGUgc2Nyb2xsaW5nIG9mIHRoZSBicm93c2VyXHJcbiAgICAgICAqL1xyXG4gICAgICBwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYodGhpcy5zcmNFdmVudC5wcmV2ZW50TWFuaXB1bGF0aW9uKSB7XHJcbiAgICAgICAgICB0aGlzLnNyY0V2ZW50LnByZXZlbnRNYW5pcHVsYXRpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHRoaXMuc3JjRXZlbnQucHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICAgIHRoaXMuc3JjRXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogc3RvcCBidWJibGluZyB0aGUgZXZlbnQgdXAgdG8gaXRzIHBhcmVudHNcclxuICAgICAgICovXHJcbiAgICAgIHN0b3BQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5zcmNFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBpbW1lZGlhdGVseSBzdG9wIGdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICAgICAqIG1pZ2h0IGJlIHVzZWZ1bCBhZnRlciBhIHN3aXBlIHdhcyBkZXRlY3RlZFxyXG4gICAgICAgKiBAcmV0dXJuIHsqfVxyXG4gICAgICAgKi9cclxuICAgICAgc3RvcERldGVjdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIEhhbW1lci5kZXRlY3Rpb24uc3RvcERldGVjdCgpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbkhhbW1lci5Qb2ludGVyRXZlbnQgPSB7XHJcbiAgLyoqXHJcbiAgICogaG9sZHMgYWxsIHBvaW50ZXJzXHJcbiAgICogQHR5cGUge09iamVjdH1cclxuICAgKi9cclxuICBwb2ludGVyczoge30sXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCBhIGxpc3Qgb2YgcG9pbnRlcnNcclxuICAgKiBAcmV0dXJucyB7QXJyYXl9ICAgICB0b3VjaGxpc3RcclxuICAgKi9cclxuICBnZXRUb3VjaExpc3Q6IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIHRvdWNobGlzdCA9IFtdO1xyXG5cclxuICAgIC8vIHdlIGNhbiB1c2UgZm9yRWFjaCBzaW5jZSBwb2ludGVyRXZlbnRzIG9ubHkgaXMgaW4gSUUxMFxyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goc2VsZi5wb2ludGVycywgZnVuY3Rpb24ocG9pbnRlcil7XHJcbiAgICAgIHRvdWNobGlzdC5wdXNoKHBvaW50ZXIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRvdWNobGlzdDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiB1cGRhdGUgdGhlIHBvc2l0aW9uIG9mIGEgcG9pbnRlclxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgdHlwZSAgICAgICAgICAgICBIYW1tZXIuRVZFTlRfRU5EXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICBwb2ludGVyRXZlbnRcclxuICAgKi9cclxuICB1cGRhdGVQb2ludGVyOiBmdW5jdGlvbih0eXBlLCBwb2ludGVyRXZlbnQpIHtcclxuICAgIGlmKHR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICBkZWxldGUgdGhpcy5wb2ludGVyc1twb2ludGVyRXZlbnQucG9pbnRlcklkXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBwb2ludGVyRXZlbnQuaWRlbnRpZmllciA9IHBvaW50ZXJFdmVudC5wb2ludGVySWQ7XHJcbiAgICAgIHRoaXMucG9pbnRlcnNbcG9pbnRlckV2ZW50LnBvaW50ZXJJZF0gPSBwb2ludGVyRXZlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucG9pbnRlcnMpLmxlbmd0aDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBjaGVjayBpZiBldiBtYXRjaGVzIHBvaW50ZXJ0eXBlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHBvaW50ZXJUeXBlICAgICBIYW1tZXIuUE9JTlRFUl9NT1VTRVxyXG4gICAqIEBwYXJhbSAgIHtQb2ludGVyRXZlbnR9ICBldlxyXG4gICAqL1xyXG4gIG1hdGNoVHlwZTogZnVuY3Rpb24ocG9pbnRlclR5cGUsIGV2KSB7XHJcbiAgICBpZighZXYucG9pbnRlclR5cGUpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwdCA9IGV2LnBvaW50ZXJUeXBlLFxyXG4gICAgICB0eXBlcyA9IHt9O1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfTU9VU0VdID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9NT1VTRSB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfTU9VU0UpO1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfVE9VQ0hdID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9UT1VDSCB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfVE9VQ0gpO1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfUEVOXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfUEVOIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9QRU4pO1xyXG4gICAgcmV0dXJuIHR5cGVzW3BvaW50ZXJUeXBlXTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IGV2ZW50c1xyXG4gICAqL1xyXG4gIGdldEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAncG9pbnRlcmRvd24gTVNQb2ludGVyRG93bicsXHJcbiAgICAgICdwb2ludGVybW92ZSBNU1BvaW50ZXJNb3ZlJyxcclxuICAgICAgJ3BvaW50ZXJ1cCBwb2ludGVyY2FuY2VsIE1TUG9pbnRlclVwIE1TUG9pbnRlckNhbmNlbCdcclxuICAgIF07XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogcmVzZXQgdGhlIGxpc3RcclxuICAgKi9cclxuICByZXNldDogZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnBvaW50ZXJzID0ge307XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbkhhbW1lci5kZXRlY3Rpb24gPSB7XHJcbiAgLy8gY29udGFpbnMgYWxsIHJlZ2lzdHJlZCBIYW1tZXIuZ2VzdHVyZXMgaW4gdGhlIGNvcnJlY3Qgb3JkZXJcclxuICBnZXN0dXJlczogW10sXHJcblxyXG4gIC8vIGRhdGEgb2YgdGhlIGN1cnJlbnQgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uIHNlc3Npb25cclxuICBjdXJyZW50IDogbnVsbCxcclxuXHJcbiAgLy8gdGhlIHByZXZpb3VzIEhhbW1lci5nZXN0dXJlIHNlc3Npb24gZGF0YVxyXG4gIC8vIGlzIGEgZnVsbCBjbG9uZSBvZiB0aGUgcHJldmlvdXMgZ2VzdHVyZS5jdXJyZW50IG9iamVjdFxyXG4gIHByZXZpb3VzOiBudWxsLFxyXG5cclxuICAvLyB3aGVuIHRoaXMgYmVjb21lcyB0cnVlLCBubyBnZXN0dXJlcyBhcmUgZmlyZWRcclxuICBzdG9wcGVkIDogZmFsc2UsXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzdGFydCBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7SGFtbWVyLkluc3RhbmNlfSAgIGluc3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIHN0YXJ0RGV0ZWN0OiBmdW5jdGlvbiBzdGFydERldGVjdChpbnN0LCBldmVudERhdGEpIHtcclxuICAgIC8vIGFscmVhZHkgYnVzeSB3aXRoIGEgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uIG9uIGFuIGVsZW1lbnRcclxuICAgIGlmKHRoaXMuY3VycmVudCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zdG9wcGVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5jdXJyZW50ID0ge1xyXG4gICAgICBpbnN0ICAgICAgOiBpbnN0LCAvLyByZWZlcmVuY2UgdG8gSGFtbWVySW5zdGFuY2Ugd2UncmUgd29ya2luZyBmb3JcclxuICAgICAgc3RhcnRFdmVudDogSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgZXZlbnREYXRhKSwgLy8gc3RhcnQgZXZlbnREYXRhIGZvciBkaXN0YW5jZXMsIHRpbWluZyBldGNcclxuICAgICAgbGFzdEV2ZW50IDogZmFsc2UsIC8vIGxhc3QgZXZlbnREYXRhXHJcbiAgICAgIGxhc3RWRXZlbnQ6IGZhbHNlLCAvLyBsYXN0IGV2ZW50RGF0YSBmb3IgdmVsb2NpdHkuXHJcbiAgICAgIHZlbG9jaXR5ICA6IGZhbHNlLCAvLyBjdXJyZW50IHZlbG9jaXR5XHJcbiAgICAgIG5hbWUgICAgICA6ICcnIC8vIGN1cnJlbnQgZ2VzdHVyZSB3ZSdyZSBpbi9kZXRlY3RlZCwgY2FuIGJlICd0YXAnLCAnaG9sZCcgZXRjXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZGV0ZWN0KGV2ZW50RGF0YSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbW1lci5nZXN0dXJlIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIGRldGVjdDogZnVuY3Rpb24gZGV0ZWN0KGV2ZW50RGF0YSkge1xyXG4gICAgaWYoIXRoaXMuY3VycmVudCB8fCB0aGlzLnN0b3BwZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dGVuZCBldmVudCBkYXRhIHdpdGggY2FsY3VsYXRpb25zIGFib3V0IHNjYWxlLCBkaXN0YW5jZSBldGNcclxuICAgIGV2ZW50RGF0YSA9IHRoaXMuZXh0ZW5kRXZlbnREYXRhKGV2ZW50RGF0YSk7XHJcblxyXG4gICAgLy8gaW5zdGFuY2Ugb3B0aW9uc1xyXG4gICAgdmFyIGluc3Rfb3B0aW9ucyA9IHRoaXMuY3VycmVudC5pbnN0Lm9wdGlvbnM7XHJcblxyXG4gICAgLy8gY2FsbCBIYW1tZXIuZ2VzdHVyZSBoYW5kbGVyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5nZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICAvLyBvbmx5IHdoZW4gdGhlIGluc3RhbmNlIG9wdGlvbnMgaGF2ZSBlbmFibGVkIHRoaXMgZ2VzdHVyZVxyXG4gICAgICBpZighdGhpcy5zdG9wcGVkICYmIGluc3Rfb3B0aW9uc1tnZXN0dXJlLm5hbWVdICE9PSBmYWxzZSkge1xyXG4gICAgICAgIC8vIGlmIGEgaGFuZGxlciByZXR1cm5zIGZhbHNlLCB3ZSBzdG9wIHdpdGggdGhlIGRldGVjdGlvblxyXG4gICAgICAgIGlmKGdlc3R1cmUuaGFuZGxlci5jYWxsKGdlc3R1cmUsIGV2ZW50RGF0YSwgdGhpcy5jdXJyZW50Lmluc3QpID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgdGhpcy5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAvLyBzdG9yZSBhcyBwcmV2aW91cyBldmVudCBldmVudFxyXG4gICAgaWYodGhpcy5jdXJyZW50KSB7XHJcbiAgICAgIHRoaXMuY3VycmVudC5sYXN0RXZlbnQgPSBldmVudERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZW5kZXZlbnQsIGJ1dCBub3QgdGhlIGxhc3QgdG91Y2gsIHNvIGRvbnQgc3RvcFxyXG4gICAgaWYoZXZlbnREYXRhLmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EICYmICFldmVudERhdGEudG91Y2hlcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgIHRoaXMuc3RvcERldGVjdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBldmVudERhdGE7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNsZWFyIHRoZSBIYW1tZXIuZ2VzdHVyZSB2YXJzXHJcbiAgICogdGhpcyBpcyBjYWxsZWQgb24gZW5kRGV0ZWN0LCBidXQgY2FuIGFsc28gYmUgdXNlZCB3aGVuIGEgZmluYWwgSGFtbWVyLmdlc3R1cmUgaGFzIGJlZW4gZGV0ZWN0ZWRcclxuICAgKiB0byBzdG9wIG90aGVyIEhhbW1lci5nZXN0dXJlcyBmcm9tIGJlaW5nIGZpcmVkXHJcbiAgICovXHJcbiAgc3RvcERldGVjdDogZnVuY3Rpb24gc3RvcERldGVjdCgpIHtcclxuICAgIC8vIGNsb25lIGN1cnJlbnQgZGF0YSB0byB0aGUgc3RvcmUgYXMgdGhlIHByZXZpb3VzIGdlc3R1cmVcclxuICAgIC8vIHVzZWQgZm9yIHRoZSBkb3VibGUgdGFwIGdlc3R1cmUsIHNpbmNlIHRoaXMgaXMgYW4gb3RoZXIgZ2VzdHVyZSBkZXRlY3Qgc2Vzc2lvblxyXG4gICAgdGhpcy5wcmV2aW91cyA9IEhhbW1lci51dGlscy5leHRlbmQoe30sIHRoaXMuY3VycmVudCk7XHJcblxyXG4gICAgLy8gcmVzZXQgdGhlIGN1cnJlbnRcclxuICAgIHRoaXMuY3VycmVudCA9IG51bGw7XHJcblxyXG4gICAgLy8gc3RvcHBlZCFcclxuICAgIHRoaXMuc3RvcHBlZCA9IHRydWU7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGV4dGVuZCBldmVudERhdGEgZm9yIEhhbW1lci5nZXN0dXJlc1xyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgZXZcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGV2XHJcbiAgICovXHJcbiAgZXh0ZW5kRXZlbnREYXRhOiBmdW5jdGlvbiBleHRlbmRFdmVudERhdGEoZXYpIHtcclxuICAgIHZhciBzdGFydEV2ID0gdGhpcy5jdXJyZW50LnN0YXJ0RXZlbnQsXHJcbiAgICAgICAgbGFzdFZFdiA9IHRoaXMuY3VycmVudC5sYXN0VkV2ZW50O1xyXG5cclxuICAgIC8vIGlmIHRoZSB0b3VjaGVzIGNoYW5nZSwgc2V0IHRoZSBuZXcgdG91Y2hlcyBvdmVyIHRoZSBzdGFydEV2ZW50IHRvdWNoZXNcclxuICAgIC8vIHRoaXMgYmVjYXVzZSB0b3VjaGV2ZW50cyBkb24ndCBoYXZlIGFsbCB0aGUgdG91Y2hlcyBvbiB0b3VjaHN0YXJ0LCBvciB0aGVcclxuICAgIC8vIHVzZXIgbXVzdCBwbGFjZSBoaXMgZmluZ2VycyBhdCB0aGUgRVhBQ1Qgc2FtZSB0aW1lIG9uIHRoZSBzY3JlZW4sIHdoaWNoIGlzIG5vdCByZWFsaXN0aWNcclxuICAgIC8vIGJ1dCwgc29tZXRpbWVzIGl0IGhhcHBlbnMgdGhhdCBib3RoIGZpbmdlcnMgYXJlIHRvdWNoaW5nIGF0IHRoZSBFWEFDVCBzYW1lIHRpbWVcclxuICAgIGlmKHN0YXJ0RXYgJiYgKGV2LnRvdWNoZXMubGVuZ3RoICE9IHN0YXJ0RXYudG91Y2hlcy5sZW5ndGggfHwgZXYudG91Y2hlcyA9PT0gc3RhcnRFdi50b3VjaGVzKSkge1xyXG4gICAgICAvLyBleHRlbmQgMSBsZXZlbCBkZWVwIHRvIGdldCB0aGUgdG91Y2hsaXN0IHdpdGggdGhlIHRvdWNoIG9iamVjdHNcclxuICAgICAgc3RhcnRFdi50b3VjaGVzID0gW107XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGV2LnRvdWNoZXMsIGZ1bmN0aW9uKHRvdWNoKSB7XHJcbiAgICAgICAgc3RhcnRFdi50b3VjaGVzLnB1c2goSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgdG91Y2gpKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGRlbHRhX3RpbWUgPSBldi50aW1lU3RhbXAgLSBzdGFydEV2LnRpbWVTdGFtcFxyXG4gICAgICAsIGRlbHRhX3ggPSBldi5jZW50ZXIucGFnZVggLSBzdGFydEV2LmNlbnRlci5wYWdlWFxyXG4gICAgICAsIGRlbHRhX3kgPSBldi5jZW50ZXIucGFnZVkgLSBzdGFydEV2LmNlbnRlci5wYWdlWVxyXG4gICAgICAsIGludGVyaW1BbmdsZVxyXG4gICAgICAsIGludGVyaW1EaXJlY3Rpb25cclxuICAgICAgLCB2ZWxvY2l0eSA9IHRoaXMuY3VycmVudC52ZWxvY2l0eTtcclxuXHJcbiAgICBpZiAobGFzdFZFdiAhPT0gZmFsc2UgJiYgZXYudGltZVN0YW1wIC0gbGFzdFZFdi50aW1lU3RhbXAgPiBIYW1tZXIuVVBEQVRFX1ZFTE9DSVRZX0lOVEVSVkFMKSB7XHJcblxyXG4gICAgICAgIHZlbG9jaXR5ID0gIEhhbW1lci51dGlscy5nZXRWZWxvY2l0eShldi50aW1lU3RhbXAgLSBsYXN0VkV2LnRpbWVTdGFtcCwgZXYuY2VudGVyLnBhZ2VYIC0gbGFzdFZFdi5jZW50ZXIucGFnZVgsIGV2LmNlbnRlci5wYWdlWSAtIGxhc3RWRXYuY2VudGVyLnBhZ2VZKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQubGFzdFZFdmVudCA9IGV2O1xyXG5cclxuICAgICAgICBpZiAodmVsb2NpdHkueCA+IDAgJiYgdmVsb2NpdHkueSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50LnZlbG9jaXR5ID0gdmVsb2NpdHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZih0aGlzLmN1cnJlbnQudmVsb2NpdHkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmVsb2NpdHkgPSBIYW1tZXIudXRpbHMuZ2V0VmVsb2NpdHkoZGVsdGFfdGltZSwgZGVsdGFfeCwgZGVsdGFfeSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50LnZlbG9jaXR5ID0gdmVsb2NpdHk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQgPSBldjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBlbmQgZXZlbnRzIChlLmcuIGRyYWdlbmQpIGRvbid0IGhhdmUgdXNlZnVsIHZhbHVlcyBmb3IgaW50ZXJpbURpcmVjdGlvbiAmIGludGVyaW1BbmdsZVxyXG4gICAgLy8gYmVjYXVzZSB0aGUgcHJldmlvdXMgZXZlbnQgaGFzIGV4YWN0bHkgdGhlIHNhbWUgY29vcmRpbmF0ZXNcclxuICAgIC8vIHNvIGZvciBlbmQgZXZlbnRzLCB0YWtlIHRoZSBwcmV2aW91cyB2YWx1ZXMgb2YgaW50ZXJpbURpcmVjdGlvbiAmIGludGVyaW1BbmdsZVxyXG4gICAgLy8gaW5zdGVhZCBvZiByZWNhbGN1bGF0aW5nIHRoZW0gYW5kIGdldHRpbmcgYSBzcHVyaW91cyAnMCdcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PT0gJ2VuZCcpIHtcclxuICAgICAgaW50ZXJpbUFuZ2xlID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiB0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmludGVyaW1BbmdsZTtcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbiA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgdGhpcy5jdXJyZW50Lmxhc3RFdmVudC5pbnRlcmltRGlyZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGludGVyaW1BbmdsZSA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgSGFtbWVyLnV0aWxzLmdldEFuZ2xlKHRoaXMuY3VycmVudC5sYXN0RXZlbnQuY2VudGVyLCBldi5jZW50ZXIpO1xyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiBIYW1tZXIudXRpbHMuZ2V0RGlyZWN0aW9uKHRoaXMuY3VycmVudC5sYXN0RXZlbnQuY2VudGVyLCBldi5jZW50ZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoZXYsIHtcclxuICAgICAgZGVsdGFUaW1lOiBkZWx0YV90aW1lLFxyXG5cclxuICAgICAgZGVsdGFYOiBkZWx0YV94LFxyXG4gICAgICBkZWx0YVk6IGRlbHRhX3ksXHJcblxyXG4gICAgICB2ZWxvY2l0eVg6IHZlbG9jaXR5LngsXHJcbiAgICAgIHZlbG9jaXR5WTogdmVsb2NpdHkueSxcclxuXHJcbiAgICAgIGRpc3RhbmNlOiBIYW1tZXIudXRpbHMuZ2V0RGlzdGFuY2Uoc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcblxyXG4gICAgICBhbmdsZTogSGFtbWVyLnV0aWxzLmdldEFuZ2xlKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG4gICAgICBpbnRlcmltQW5nbGU6IGludGVyaW1BbmdsZSxcclxuXHJcbiAgICAgIGRpcmVjdGlvbjogSGFtbWVyLnV0aWxzLmdldERpcmVjdGlvbihzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbjogaW50ZXJpbURpcmVjdGlvbixcclxuXHJcbiAgICAgIHNjYWxlOiBIYW1tZXIudXRpbHMuZ2V0U2NhbGUoc3RhcnRFdi50b3VjaGVzLCBldi50b3VjaGVzKSxcclxuICAgICAgcm90YXRpb246IEhhbW1lci51dGlscy5nZXRSb3RhdGlvbihzdGFydEV2LnRvdWNoZXMsIGV2LnRvdWNoZXMpLFxyXG5cclxuICAgICAgc3RhcnRFdmVudDogc3RhcnRFdlxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGV2O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiByZWdpc3RlciBuZXcgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGdlc3R1cmUgb2JqZWN0LCBzZWUgZ2VzdHVyZXMuanMgZm9yIGRvY3VtZW50YXRpb25cclxuICAgKiBAcmV0dXJucyB7QXJyYXl9ICAgICBnZXN0dXJlc1xyXG4gICAqL1xyXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbiByZWdpc3RlcihnZXN0dXJlKSB7XHJcbiAgICAvLyBhZGQgYW4gZW5hYmxlIGdlc3R1cmUgb3B0aW9ucyBpZiB0aGVyZSBpcyBubyBnaXZlblxyXG4gICAgdmFyIG9wdGlvbnMgPSBnZXN0dXJlLmRlZmF1bHRzIHx8IHt9O1xyXG4gICAgaWYob3B0aW9uc1tnZXN0dXJlLm5hbWVdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgb3B0aW9uc1tnZXN0dXJlLm5hbWVdID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRlbmQgSGFtbWVyIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBIYW1tZXIuZ2VzdHVyZSBvcHRpb25zXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKEhhbW1lci5kZWZhdWx0cywgb3B0aW9ucywgdHJ1ZSk7XHJcblxyXG4gICAgLy8gc2V0IGl0cyBpbmRleFxyXG4gICAgZ2VzdHVyZS5pbmRleCA9IGdlc3R1cmUuaW5kZXggfHwgMTAwMDtcclxuXHJcbiAgICAvLyBhZGQgSGFtbWVyLmdlc3R1cmUgdG8gdGhlIGxpc3RcclxuICAgIHRoaXMuZ2VzdHVyZXMucHVzaChnZXN0dXJlKTtcclxuXHJcbiAgICAvLyBzb3J0IHRoZSBsaXN0IGJ5IGluZGV4XHJcbiAgICB0aGlzLmdlc3R1cmVzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgICBpZihhLmluZGV4IDwgYi5pbmRleCkgeyByZXR1cm4gLTE7IH1cclxuICAgICAgaWYoYS5pbmRleCA+IGIuaW5kZXgpIHsgcmV0dXJuIDE7IH1cclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5nZXN0dXJlcztcclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIERyYWdcclxuICogTW92ZSB3aXRoIHggZmluZ2VycyAoZGVmYXVsdCAxKSBhcm91bmQgb24gdGhlIHBhZ2UuIEJsb2NraW5nIHRoZSBzY3JvbGxpbmcgd2hlblxyXG4gKiBtb3ZpbmcgbGVmdCBhbmQgcmlnaHQgaXMgYSBnb29kIHByYWN0aWNlLiBXaGVuIGFsbCB0aGUgZHJhZyBldmVudHMgYXJlIGJsb2NraW5nXHJcbiAqIHlvdSBkaXNhYmxlIHNjcm9sbGluZyBvbiB0aGF0IGFyZWEuXHJcbiAqIEBldmVudHMgIGRyYWcsIGRyYXBsZWZ0LCBkcmFncmlnaHQsIGRyYWd1cCwgZHJhZ2Rvd25cclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5EcmFnID0ge1xyXG4gIG5hbWUgICAgIDogJ2RyYWcnLFxyXG4gIGluZGV4ICAgIDogNTAsXHJcbiAgZGVmYXVsdHMgOiB7XHJcbiAgICBkcmFnX21pbl9kaXN0YW5jZSAgICAgICAgICAgIDogMTAsXHJcblxyXG4gICAgLy8gU2V0IGNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlIHRvIHRydWUgdG8gbWFrZSB0aGUgc3RhcnRpbmcgcG9pbnQgb2YgdGhlIGRyYWdcclxuICAgIC8vIGJlIGNhbGN1bGF0ZWQgZnJvbSB3aGVyZSB0aGUgZHJhZyB3YXMgdHJpZ2dlcmVkLCBub3QgZnJvbSB3aGVyZSB0aGUgdG91Y2ggc3RhcnRlZC5cclxuICAgIC8vIFVzZWZ1bCB0byBhdm9pZCBhIGplcmstc3RhcnRpbmcgZHJhZywgd2hpY2ggY2FuIG1ha2UgZmluZS1hZGp1c3RtZW50c1xyXG4gICAgLy8gdGhyb3VnaCBkcmFnZ2luZyBkaWZmaWN1bHQsIGFuZCBiZSB2aXN1YWxseSB1bmFwcGVhbGluZy5cclxuICAgIGNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlOiB0cnVlLFxyXG5cclxuICAgIC8vIHNldCAwIGZvciB1bmxpbWl0ZWQsIGJ1dCB0aGlzIGNhbiBjb25mbGljdCB3aXRoIHRyYW5zZm9ybVxyXG4gICAgZHJhZ19tYXhfdG91Y2hlcyAgICAgICAgICAgICA6IDEsXHJcblxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IGJyb3dzZXIgYmVoYXZpb3Igd2hlbiBkcmFnZ2luZyBvY2N1cnNcclxuICAgIC8vIGJlIGNhcmVmdWwgd2l0aCBpdCwgaXQgbWFrZXMgdGhlIGVsZW1lbnQgYSBibG9ja2luZyBlbGVtZW50XHJcbiAgICAvLyB3aGVuIHlvdSBhcmUgdXNpbmcgdGhlIGRyYWcgZ2VzdHVyZSwgaXQgaXMgYSBnb29kIHByYWN0aWNlIHRvIHNldCB0aGlzIHRydWVcclxuICAgIGRyYWdfYmxvY2tfaG9yaXpvbnRhbCAgICAgICAgOiBmYWxzZSxcclxuICAgIGRyYWdfYmxvY2tfdmVydGljYWwgICAgICAgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkcmFnX2xvY2tfdG9fYXhpcyBrZWVwcyB0aGUgZHJhZyBnZXN0dXJlIG9uIHRoZSBheGlzIHRoYXQgaXQgc3RhcnRlZCBvbixcclxuICAgIC8vIEl0IGRpc2FsbG93cyB2ZXJ0aWNhbCBkaXJlY3Rpb25zIGlmIHRoZSBpbml0aWFsIGRpcmVjdGlvbiB3YXMgaG9yaXpvbnRhbCwgYW5kIHZpY2UgdmVyc2EuXHJcbiAgICBkcmFnX2xvY2tfdG9fYXhpcyAgICAgICAgICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZHJhZyBsb2NrIG9ubHkga2lja3MgaW4gd2hlbiBkaXN0YW5jZSA+IGRyYWdfbG9ja19taW5fZGlzdGFuY2VcclxuICAgIC8vIFRoaXMgd2F5LCBsb2NraW5nIG9jY3VycyBvbmx5IHdoZW4gdGhlIGRpc3RhbmNlIGhhcyBiZWNvbWUgbGFyZ2UgZW5vdWdoIHRvIHJlbGlhYmx5IGRldGVybWluZSB0aGUgZGlyZWN0aW9uXHJcbiAgICBkcmFnX2xvY2tfbWluX2Rpc3RhbmNlICAgICAgIDogMjVcclxuICB9LFxyXG5cclxuICB0cmlnZ2VyZWQ6IGZhbHNlLFxyXG4gIGhhbmRsZXIgIDogZnVuY3Rpb24gZHJhZ0dlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIC8vIGN1cnJlbnQgZ2VzdHVyZSBpc250IGRyYWcsIGJ1dCBkcmFnZ2VkIGlzIHRydWVcclxuICAgIC8vIHRoaXMgbWVhbnMgYW4gb3RoZXIgZ2VzdHVyZSBpcyBidXN5LiBub3cgY2FsbCBkcmFnZW5kXHJcbiAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUgJiYgdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYXggdG91Y2hlc1xyXG4gICAgaWYoaW5zdC5vcHRpb25zLmRyYWdfbWF4X3RvdWNoZXMgPiAwICYmXHJcbiAgICAgIGV2LnRvdWNoZXMubGVuZ3RoID4gaW5zdC5vcHRpb25zLmRyYWdfbWF4X3RvdWNoZXMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgICBpZihldi5kaXN0YW5jZSA8IGluc3Qub3B0aW9ucy5kcmFnX21pbl9kaXN0YW5jZSAmJlxyXG4gICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZSBhcmUgZHJhZ2dpbmchXHJcbiAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lKSB7XHJcbiAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuICAgICAgICAgIGlmKGluc3Qub3B0aW9ucy5jb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZSAmJiBldi5kaXN0YW5jZSA+IDApIHtcclxuICAgICAgICAgICAgLy8gV2hlbiBhIGRyYWcgaXMgdHJpZ2dlcmVkLCBzZXQgdGhlIGV2ZW50IGNlbnRlciB0byBkcmFnX21pbl9kaXN0YW5jZSBwaXhlbHMgZnJvbSB0aGUgb3JpZ2luYWwgZXZlbnQgY2VudGVyLlxyXG4gICAgICAgICAgICAvLyBXaXRob3V0IHRoaXMgY29ycmVjdGlvbiwgdGhlIGRyYWdnZWQgZGlzdGFuY2Ugd291bGQganVtcHN0YXJ0IGF0IGRyYWdfbWluX2Rpc3RhbmNlIHBpeGVscyBpbnN0ZWFkIG9mIGF0IDAuXHJcbiAgICAgICAgICAgIC8vIEl0IG1pZ2h0IGJlIHVzZWZ1bCB0byBzYXZlIHRoZSBvcmlnaW5hbCBzdGFydCBwb2ludCBzb21ld2hlcmVcclxuICAgICAgICAgICAgdmFyIGZhY3RvciA9IE1hdGguYWJzKGluc3Qub3B0aW9ucy5kcmFnX21pbl9kaXN0YW5jZSAvIGV2LmRpc3RhbmNlKTtcclxuICAgICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnN0YXJ0RXZlbnQuY2VudGVyLnBhZ2VYICs9IGV2LmRlbHRhWCAqIGZhY3RvcjtcclxuICAgICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnN0YXJ0RXZlbnQuY2VudGVyLnBhZ2VZICs9IGV2LmRlbHRhWSAqIGZhY3RvcjtcclxuXHJcbiAgICAgICAgICAgIC8vIHJlY2FsY3VsYXRlIGV2ZW50IGRhdGEgdXNpbmcgbmV3IHN0YXJ0IHBvaW50XHJcbiAgICAgICAgICAgIGV2ID0gSGFtbWVyLmRldGVjdGlvbi5leHRlbmRFdmVudERhdGEoZXYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbG9jayBkcmFnIHRvIGF4aXM/XHJcbiAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lmxhc3RFdmVudC5kcmFnX2xvY2tlZF90b19heGlzIHx8IChpbnN0Lm9wdGlvbnMuZHJhZ19sb2NrX3RvX2F4aXMgJiYgaW5zdC5vcHRpb25zLmRyYWdfbG9ja19taW5fZGlzdGFuY2UgPD0gZXYuZGlzdGFuY2UpKSB7XHJcbiAgICAgICAgICBldi5kcmFnX2xvY2tlZF90b19heGlzID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGxhc3RfZGlyZWN0aW9uID0gSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lmxhc3RFdmVudC5kaXJlY3Rpb247XHJcbiAgICAgICAgaWYoZXYuZHJhZ19sb2NrZWRfdG9fYXhpcyAmJiBsYXN0X2RpcmVjdGlvbiAhPT0gZXYuZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAvLyBrZWVwIGRpcmVjdGlvbiBvbiB0aGUgYXhpcyB0aGF0IHRoZSBkcmFnIGdlc3R1cmUgc3RhcnRlZCBvblxyXG4gICAgICAgICAgaWYoSGFtbWVyLnV0aWxzLmlzVmVydGljYWwobGFzdF9kaXJlY3Rpb24pKSB7XHJcbiAgICAgICAgICAgIGV2LmRpcmVjdGlvbiA9IChldi5kZWx0YVkgPCAwKSA/IEhhbW1lci5ESVJFQ1RJT05fVVAgOiBIYW1tZXIuRElSRUNUSU9OX0RPV047XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZXYuZGlyZWN0aW9uID0gKGV2LmRlbHRhWCA8IDApID8gSGFtbWVyLkRJUkVDVElPTl9MRUZUIDogSGFtbWVyLkRJUkVDVElPTl9SSUdIVDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpcnN0IHRpbWUsIHRyaWdnZXIgZHJhZ3N0YXJ0IGV2ZW50XHJcbiAgICAgICAgaWYoIXRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ3N0YXJ0JywgZXYpO1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciBub3JtYWwgZXZlbnRcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcblxyXG4gICAgICAgIC8vIGRpcmVjdGlvbiBldmVudCwgbGlrZSBkcmFnZG93blxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyBldi5kaXJlY3Rpb24sIGV2KTtcclxuXHJcbiAgICAgICAgLy8gYmxvY2sgdGhlIGJyb3dzZXIgZXZlbnRzXHJcbiAgICAgICAgaWYoKGluc3Qub3B0aW9ucy5kcmFnX2Jsb2NrX3ZlcnRpY2FsICYmIEhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGV2LmRpcmVjdGlvbikpIHx8XHJcbiAgICAgICAgICAoaW5zdC5vcHRpb25zLmRyYWdfYmxvY2tfaG9yaXpvbnRhbCAmJiAhSGFtbWVyLnV0aWxzLmlzVmVydGljYWwoZXYuZGlyZWN0aW9uKSkpIHtcclxuICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIC8vIHRyaWdnZXIgZHJhZ2VuZFxyXG4gICAgICAgIGlmKHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhvbGRcclxuICogVG91Y2ggc3RheXMgYXQgdGhlIHNhbWUgcGxhY2UgZm9yIHggdGltZVxyXG4gKiBAZXZlbnRzICBob2xkXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuSG9sZCA9IHtcclxuICBuYW1lICAgIDogJ2hvbGQnLFxyXG4gIGluZGV4ICAgOiAxMCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgaG9sZF90aW1lb3V0ICA6IDUwMCxcclxuICAgIGhvbGRfdGhyZXNob2xkOiAxXHJcbiAgfSxcclxuICB0aW1lciAgIDogbnVsbCxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gaG9sZEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgLy8gY2xlYXIgYW55IHJ1bm5pbmcgdGltZXJzXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgICAvLyBzZXQgdGhlIGdlc3R1cmUgc28gd2UgY2FuIGNoZWNrIGluIHRoZSB0aW1lb3V0IGlmIGl0IHN0aWxsIGlzXHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcblxyXG4gICAgICAgIC8vIHNldCB0aW1lciBhbmQgaWYgYWZ0ZXIgdGhlIHRpbWVvdXQgaXQgc3RpbGwgaXMgaG9sZCxcclxuICAgICAgICAvLyB3ZSB0cmlnZ2VyIHRoZSBob2xkIGV2ZW50XHJcbiAgICAgICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9PSAnaG9sZCcpIHtcclxuICAgICAgICAgICAgaW5zdC50cmlnZ2VyKCdob2xkJywgZXYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIGluc3Qub3B0aW9ucy5ob2xkX3RpbWVvdXQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgLy8gd2hlbiB5b3UgbW92ZSBvciBlbmQgd2UgY2xlYXIgdGhlIHRpbWVyXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgaWYoZXYuZGlzdGFuY2UgPiBpbnN0Lm9wdGlvbnMuaG9sZF90aHJlc2hvbGQpIHtcclxuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWxlYXNlXHJcbiAqIENhbGxlZCBhcyBsYXN0LCB0ZWxscyB0aGUgdXNlciBoYXMgcmVsZWFzZWQgdGhlIHNjcmVlblxyXG4gKiBAZXZlbnRzICByZWxlYXNlXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuUmVsZWFzZSA9IHtcclxuICBuYW1lICAgOiAncmVsZWFzZScsXHJcbiAgaW5kZXggIDogSW5maW5pdHksXHJcbiAgaGFuZGxlcjogZnVuY3Rpb24gcmVsZWFzZUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU3dpcGVcclxuICogdHJpZ2dlcnMgc3dpcGUgZXZlbnRzIHdoZW4gdGhlIGVuZCB2ZWxvY2l0eSBpcyBhYm92ZSB0aGUgdGhyZXNob2xkXHJcbiAqIEBldmVudHMgIHN3aXBlLCBzd2lwZWxlZnQsIHN3aXBlcmlnaHQsIHN3aXBldXAsIHN3aXBlZG93blxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlN3aXBlID0ge1xyXG4gIG5hbWUgICAgOiAnc3dpcGUnLFxyXG4gIGluZGV4ICAgOiA0MCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgLy8gc2V0IDAgZm9yIHVubGltaXRlZCwgYnV0IHRoaXMgY2FuIGNvbmZsaWN0IHdpdGggdHJhbnNmb3JtXHJcbiAgICBzd2lwZV9taW5fdG91Y2hlczogMSxcclxuICAgIHN3aXBlX21heF90b3VjaGVzOiAxLFxyXG4gICAgc3dpcGVfdmVsb2NpdHkgICA6IDAuN1xyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHN3aXBlR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgLy8gbWF4IHRvdWNoZXNcclxuICAgICAgaWYoaW5zdC5vcHRpb25zLnN3aXBlX21heF90b3VjaGVzID4gMCAmJlxyXG4gICAgICAgIGV2LnRvdWNoZXMubGVuZ3RoIDwgaW5zdC5vcHRpb25zLnN3aXBlX21pbl90b3VjaGVzICYmXHJcbiAgICAgICAgZXYudG91Y2hlcy5sZW5ndGggPiBpbnN0Lm9wdGlvbnMuc3dpcGVfbWF4X3RvdWNoZXMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICBpZihldi52ZWxvY2l0eVggPiBpbnN0Lm9wdGlvbnMuc3dpcGVfdmVsb2NpdHkgfHxcclxuICAgICAgICBldi52ZWxvY2l0eVkgPiBpbnN0Lm9wdGlvbnMuc3dpcGVfdmVsb2NpdHkpIHtcclxuICAgICAgICAvLyB0cmlnZ2VyIHN3aXBlIGV2ZW50c1xyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgZXYuZGlyZWN0aW9uLCBldik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVGFwL0RvdWJsZVRhcFxyXG4gKiBRdWljayB0b3VjaCBhdCBhIHBsYWNlIG9yIGRvdWJsZSBhdCB0aGUgc2FtZSBwbGFjZVxyXG4gKiBAZXZlbnRzICB0YXAsIGRvdWJsZXRhcFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRhcCA9IHtcclxuICBuYW1lICAgIDogJ3RhcCcsXHJcbiAgaW5kZXggICA6IDEwMCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgdGFwX21heF90b3VjaHRpbWUgOiAyNTAsXHJcbiAgICB0YXBfbWF4X2Rpc3RhbmNlICA6IDEwLFxyXG4gICAgdGFwX2Fsd2F5cyAgICAgICAgOiB0cnVlLFxyXG4gICAgZG91YmxldGFwX2Rpc3RhbmNlOiAyMCxcclxuICAgIGRvdWJsZXRhcF9pbnRlcnZhbDogMzAwXHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gdGFwR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9NT1ZFICYmICFIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlKSB7XHJcbiAgICAgIC8vVHJhY2sgdGhlIGRpc3RhbmNlIHdlJ3ZlIG1vdmVkLiBJZiBpdCdzIGFib3ZlIHRoZSBtYXggT05DRSwgcmVtZW1iZXIgdGhhdCAoZml4ZXMgIzQwNikuXHJcbiAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UgPSAoZXYuZGlzdGFuY2UgPiBpbnN0Lm9wdGlvbnMudGFwX21heF9kaXN0YW5jZSk7XHJcbiAgICB9IGVsc2UgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQgJiYgZXYuc3JjRXZlbnQudHlwZSAhPSAndG91Y2hjYW5jZWwnKSB7XHJcbiAgICAgIC8vIHByZXZpb3VzIGdlc3R1cmUsIGZvciB0aGUgZG91YmxlIHRhcCBzaW5jZSB0aGVzZSBhcmUgdHdvIGRpZmZlcmVudCBnZXN0dXJlIGRldGVjdGlvbnNcclxuICAgICAgdmFyIHByZXYgPSBIYW1tZXIuZGV0ZWN0aW9uLnByZXZpb3VzLFxyXG4gICAgICAgIGRpZF9kb3VibGV0YXAgPSBmYWxzZTtcclxuXHJcbiAgICAgIC8vIHdoZW4gdGhlIHRvdWNodGltZSBpcyBoaWdoZXIgdGhlbiB0aGUgbWF4IHRvdWNoIHRpbWVcclxuICAgICAgLy8gb3Igd2hlbiB0aGUgbW92aW5nIGRpc3RhbmNlIGlzIHRvbyBtdWNoXHJcbiAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UgfHwgZXYuZGVsdGFUaW1lID4gaW5zdC5vcHRpb25zLnRhcF9tYXhfdG91Y2h0aW1lKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjaGVjayBpZiBkb3VibGUgdGFwXHJcbiAgICAgIGlmKHByZXYgJiYgcHJldi5uYW1lID09ICd0YXAnICYmXHJcbiAgICAgICAgKGV2LnRpbWVTdGFtcCAtIHByZXYubGFzdEV2ZW50LnRpbWVTdGFtcCkgPCBpbnN0Lm9wdGlvbnMuZG91YmxldGFwX2ludGVydmFsICYmXHJcbiAgICAgICAgZXYuZGlzdGFuY2UgPCBpbnN0Lm9wdGlvbnMuZG91YmxldGFwX2Rpc3RhbmNlKSB7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKCdkb3VibGV0YXAnLCBldik7XHJcbiAgICAgICAgZGlkX2RvdWJsZXRhcCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGRvIGEgc2luZ2xlIHRhcFxyXG4gICAgICBpZighZGlkX2RvdWJsZXRhcCB8fCBpbnN0Lm9wdGlvbnMudGFwX2Fsd2F5cykge1xyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gJ3RhcCc7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lLCBldik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVG91Y2hcclxuICogQ2FsbGVkIGFzIGZpcnN0LCB0ZWxscyB0aGUgdXNlciBoYXMgdG91Y2hlZCB0aGUgc2NyZWVuXHJcbiAqIEBldmVudHMgIHRvdWNoXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVG91Y2ggPSB7XHJcbiAgbmFtZSAgICA6ICd0b3VjaCcsXHJcbiAgaW5kZXggICA6IC1JbmZpbml0eSxcclxuICBkZWZhdWx0czoge1xyXG4gICAgLy8gY2FsbCBwcmV2ZW50RGVmYXVsdCBhdCB0b3VjaHN0YXJ0LCBhbmQgbWFrZXMgdGhlIGVsZW1lbnQgYmxvY2tpbmcgYnlcclxuICAgIC8vIGRpc2FibGluZyB0aGUgc2Nyb2xsaW5nIG9mIHRoZSBwYWdlLCBidXQgaXQgaW1wcm92ZXMgZ2VzdHVyZXMgbGlrZVxyXG4gICAgLy8gdHJhbnNmb3JtaW5nIGFuZCBkcmFnZ2luZy5cclxuICAgIC8vIGJlIGNhcmVmdWwgd2l0aCB1c2luZyB0aGlzLCBpdCBjYW4gYmUgdmVyeSBhbm5veWluZyBmb3IgdXNlcnMgdG8gYmUgc3R1Y2tcclxuICAgIC8vIG9uIHRoZSBwYWdlXHJcbiAgICBwcmV2ZW50X2RlZmF1bHQgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkaXNhYmxlIG1vdXNlIGV2ZW50cywgc28gb25seSB0b3VjaCAob3IgcGVuISkgaW5wdXQgdHJpZ2dlcnMgZXZlbnRzXHJcbiAgICBwcmV2ZW50X21vdXNlZXZlbnRzOiBmYWxzZVxyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHRvdWNoR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoaW5zdC5vcHRpb25zLnByZXZlbnRfbW91c2VldmVudHMgJiYgZXYucG9pbnRlclR5cGUgPT0gSGFtbWVyLlBPSU5URVJfTU9VU0UpIHtcclxuICAgICAgZXYuc3RvcERldGVjdCgpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoaW5zdC5vcHRpb25zLnByZXZlbnRfZGVmYXVsdCkge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfU1RBUlQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogVHJhbnNmb3JtXHJcbiAqIFVzZXIgd2FudCB0byBzY2FsZSBvciByb3RhdGUgd2l0aCAyIGZpbmdlcnNcclxuICogQGV2ZW50cyAgdHJhbnNmb3JtLCBwaW5jaCwgcGluY2hpbiwgcGluY2hvdXQsIHJvdGF0ZVxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRyYW5zZm9ybSA9IHtcclxuICBuYW1lICAgICA6ICd0cmFuc2Zvcm0nLFxyXG4gIGluZGV4ICAgIDogNDUsXHJcbiAgZGVmYXVsdHMgOiB7XHJcbiAgICAvLyBmYWN0b3IsIG5vIHNjYWxlIGlzIDEsIHpvb21pbiBpcyB0byAwIGFuZCB6b29tb3V0IHVudGlsIGhpZ2hlciB0aGVuIDFcclxuICAgIHRyYW5zZm9ybV9taW5fc2NhbGUgICA6IDAuMDEsXHJcbiAgICAvLyByb3RhdGlvbiBpbiBkZWdyZWVzXHJcbiAgICB0cmFuc2Zvcm1fbWluX3JvdGF0aW9uOiAxLFxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IGJyb3dzZXIgYmVoYXZpb3Igd2hlbiB0d28gdG91Y2hlcyBhcmUgb24gdGhlIHNjcmVlblxyXG4gICAgLy8gYnV0IGl0IG1ha2VzIHRoZSBlbGVtZW50IGEgYmxvY2tpbmcgZWxlbWVudFxyXG4gICAgLy8gd2hlbiB5b3UgYXJlIHVzaW5nIHRoZSB0cmFuc2Zvcm0gZ2VzdHVyZSwgaXQgaXMgYSBnb29kIHByYWN0aWNlIHRvIHNldCB0aGlzIHRydWVcclxuICAgIHRyYW5zZm9ybV9hbHdheXNfYmxvY2s6IGZhbHNlXHJcbiAgfSxcclxuICB0cmlnZ2VyZWQ6IGZhbHNlLFxyXG4gIGhhbmRsZXIgIDogZnVuY3Rpb24gdHJhbnNmb3JtR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgLy8gY3VycmVudCBnZXN0dXJlIGlzbnQgZHJhZywgYnV0IGRyYWdnZWQgaXMgdHJ1ZVxyXG4gICAgLy8gdGhpcyBtZWFucyBhbiBvdGhlciBnZXN0dXJlIGlzIGJ1c3kuIG5vdyBjYWxsIGRyYWdlbmRcclxuICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSAmJiB0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGF0bGVhc3QgbXVsdGl0b3VjaFxyXG4gICAgaWYoZXYudG91Y2hlcy5sZW5ndGggPCAyKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgd2hlbiB0d28gZmluZ2VycyBhcmUgb24gdGhlIHNjcmVlblxyXG4gICAgaWYoaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9hbHdheXNfYmxvY2spIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIHZhciBzY2FsZV90aHJlc2hvbGQgPSBNYXRoLmFicygxIC0gZXYuc2NhbGUpO1xyXG4gICAgICAgIHZhciByb3RhdGlvbl90aHJlc2hvbGQgPSBNYXRoLmFicyhldi5yb3RhdGlvbik7XHJcblxyXG4gICAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgICAgaWYoc2NhbGVfdGhyZXNob2xkIDwgaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fc2NhbGUgJiZcclxuICAgICAgICAgIHJvdGF0aW9uX3RocmVzaG9sZCA8IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3JvdGF0aW9uKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZSBhcmUgdHJhbnNmb3JtaW5nIVxyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG5cclxuICAgICAgICAvLyBmaXJzdCB0aW1lLCB0cmlnZ2VyIGRyYWdzdGFydCBldmVudFxyXG4gICAgICAgIGlmKCF0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdzdGFydCcsIGV2KTtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTsgLy8gYmFzaWMgdHJhbnNmb3JtIGV2ZW50XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgcm90YXRlIGV2ZW50XHJcbiAgICAgICAgaWYocm90YXRpb25fdGhyZXNob2xkID4gaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fcm90YXRpb24pIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncm90YXRlJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciBwaW5jaCBldmVudFxyXG4gICAgICAgIGlmKHNjYWxlX3RocmVzaG9sZCA+IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3NjYWxlKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3BpbmNoJywgZXYpO1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdwaW5jaCcgKyAoKGV2LnNjYWxlIDwgMSkgPyAnaW4nIDogJ291dCcpLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIC8vIHRyaWdnZXIgZHJhZ2VuZFxyXG4gICAgICAgIGlmKHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuICAvLyBCYXNlZCBvZmYgTG8tRGFzaCdzIGV4Y2VsbGVudCBVTUQgd3JhcHBlciAoc2xpZ2h0bHkgbW9kaWZpZWQpIC0gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9sb2Rhc2guanMjTDU1MTUtTDU1NDNcclxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnMgbGlrZSB0aGUgZm9sbG93aW5nOlxyXG4gIGlmKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZVxyXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gSGFtbWVyOyB9KTtcclxuICB9XHJcblxyXG4gIC8vIGNoZWNrIGZvciBgZXhwb3J0c2AgYWZ0ZXIgYGRlZmluZWAgaW4gY2FzZSBhIGJ1aWxkIG9wdGltaXplciBhZGRzIGFuIGBleHBvcnRzYCBvYmplY3RcclxuICBlbHNlIGlmKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhhbW1lcjtcclxuICB9XHJcblxyXG4gIGVsc2Uge1xyXG4gICAgd2luZG93LkhhbW1lciA9IEhhbW1lcjtcclxuICB9XHJcblxyXG59KSh3aW5kb3cpO1xyXG5cclxuLyohIGpRdWVyeSBwbHVnaW4gZm9yIEhhbW1lci5KUyAtIHYxLjAuMSAtIDIwMTQtMDItMDNcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDE0IEpvcmlrIFRhbmdlbGRlciA8ai50YW5nZWxkZXJAZ21haWwuY29tPjtcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlICovKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gc2V0dXAoSGFtbWVyLCAkKSB7XHJcbiAgLyoqXHJcbiAgICogYmluZCBkb20gZXZlbnRzXHJcbiAgICogdGhpcyBvdmVyd3JpdGVzIGFkZEV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGVzXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBIYW1tZXIuZXZlbnQuYmluZERvbSA9IGZ1bmN0aW9uKGVsZW1lbnQsIGV2ZW50VHlwZXMsIGhhbmRsZXIpIHtcclxuICAgICQoZWxlbWVudCkub24oZXZlbnRUeXBlcywgZnVuY3Rpb24oZXYpIHtcclxuICAgICAgdmFyIGRhdGEgPSBldi5vcmlnaW5hbEV2ZW50IHx8IGV2O1xyXG5cclxuICAgICAgaWYoZGF0YS5wYWdlWCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZGF0YS5wYWdlWCA9IGV2LnBhZ2VYO1xyXG4gICAgICAgIGRhdGEucGFnZVkgPSBldi5wYWdlWTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEudGFyZ2V0KSB7XHJcbiAgICAgICAgZGF0YS50YXJnZXQgPSBldi50YXJnZXQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKGRhdGEud2hpY2ggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRhdGEud2hpY2ggPSBkYXRhLmJ1dHRvbjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEucHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICBkYXRhLnByZXZlbnREZWZhdWx0ID0gZXYucHJldmVudERlZmF1bHQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnN0b3BQcm9wYWdhdGlvbikge1xyXG4gICAgICAgIGRhdGEuc3RvcFByb3BhZ2F0aW9uID0gZXYuc3RvcFByb3BhZ2F0aW9uO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBoYW5kbGVyLmNhbGwodGhpcywgZGF0YSk7XHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiB0aGUgbWV0aG9kcyBhcmUgY2FsbGVkIGJ5IHRoZSBpbnN0YW5jZSwgYnV0IHdpdGggdGhlIGpxdWVyeSBwbHVnaW5cclxuICAgKiB3ZSB1c2UgdGhlIGpxdWVyeSBldmVudCBtZXRob2RzIGluc3RlYWQuXHJcbiAgICogQHRoaXMgICAge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlcywgaGFuZGxlcikge1xyXG4gICAgcmV0dXJuICQodGhpcy5lbGVtZW50KS5vbih0eXBlcywgaGFuZGxlcik7XHJcbiAgfTtcclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICByZXR1cm4gJCh0aGlzLmVsZW1lbnQpLm9mZih0eXBlcywgaGFuZGxlcik7XHJcbiAgfTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRyaWdnZXIgZXZlbnRzXHJcbiAgICogdGhpcyBpcyBjYWxsZWQgYnkgdGhlIGdlc3R1cmVzIHRvIHRyaWdnZXIgYW4gZXZlbnQgbGlrZSAndGFwJ1xyXG4gICAqIEB0aGlzICAgIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2ZW50RGF0YVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24oZ2VzdHVyZSwgZXZlbnREYXRhKSB7XHJcbiAgICB2YXIgZWwgPSAkKHRoaXMuZWxlbWVudCk7XHJcbiAgICBpZihlbC5oYXMoZXZlbnREYXRhLnRhcmdldCkubGVuZ3RoKSB7XHJcbiAgICAgIGVsID0gJChldmVudERhdGEudGFyZ2V0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZWwudHJpZ2dlcih7XHJcbiAgICAgIHR5cGUgICA6IGdlc3R1cmUsXHJcbiAgICAgIGdlc3R1cmU6IGV2ZW50RGF0YVxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGpRdWVyeSBwbHVnaW5cclxuICAgKiBjcmVhdGUgaW5zdGFuY2Ugb2YgSGFtbWVyIGFuZCB3YXRjaCBmb3IgZ2VzdHVyZXMsXHJcbiAgICogYW5kIHdoZW4gY2FsbGVkIGFnYWluIHlvdSBjYW4gY2hhbmdlIHRoZSBvcHRpb25zXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgW29wdGlvbnM9e31dXHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICAkLmZuLmhhbW1lciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBlbCA9ICQodGhpcyk7XHJcbiAgICAgIHZhciBpbnN0ID0gZWwuZGF0YSgnaGFtbWVyJyk7XHJcbiAgICAgIC8vIHN0YXJ0IG5ldyBoYW1tZXIgaW5zdGFuY2VcclxuICAgICAgaWYoIWluc3QpIHtcclxuICAgICAgICBlbC5kYXRhKCdoYW1tZXInLCBuZXcgSGFtbWVyKHRoaXMsIG9wdGlvbnMgfHwge30pKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBjaGFuZ2UgdGhlIG9wdGlvbnNcclxuICAgICAgZWxzZSBpZihpbnN0ICYmIG9wdGlvbnMpIHtcclxuICAgICAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKGluc3Qub3B0aW9ucywgb3B0aW9ucyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH07XHJcbn1cclxuXHJcbiAgLy8gQmFzZWQgb2ZmIExvLURhc2gncyBleGNlbGxlbnQgVU1EIHdyYXBwZXIgKHNsaWdodGx5IG1vZGlmaWVkKSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvbG9kYXNoLmpzI0w1NTE1LUw1NTQzXHJcbiAgLy8gc29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zIGxpa2UgdGhlIGZvbGxvd2luZzpcclxuICBpZih0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gZGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGVcclxuICAgIGRlZmluZShbJ2hhbW1lcmpzJywgJ2pxdWVyeSddLCBzZXR1cCk7XHJcblxyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIHNldHVwKHdpbmRvdy5IYW1tZXIsIHdpbmRvdy5qUXVlcnkgfHwgd2luZG93LlplcHRvKTtcclxuICB9XHJcbn0pKHdpbmRvdyk7Il19
;