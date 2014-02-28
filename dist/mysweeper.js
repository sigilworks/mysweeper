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
},{"./constants":3,"./gameboard":6,"./validators":18}],2:[function(require,module,exports){

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
    this.emitter = new TranscribingEmitter;
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
        this.emitter.on('score:change', function() { _this.scoreboard.update(_this.scorekeeper.score); });
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
        var curr_open = this._getOpenedSquaresCount();

        if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
            this._openSquare(square);
            if (!square.getDanger() > 0)
                this._recursiveReveal(square);

        } else if (square.isMined()) {
            $cell.addClass('killer-mine');
            return this._gameOver();
        }

        this._evaluateForGameWin();

        var opened_squares = this._getOpenedSquaresCount() - curr_open;
        $log("Just opened %o squares...telling scorer.\nUser moves: %o.", opened_squares, this.userMoves);
        this.scorekeeper.up(opened_squares);
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
        this.getSquares().forEach(this._renderSquare.bind(this));
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
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":10,"./minelayer":11,"./scoreboard":12,"./scorekeeper":13,"./serializer":14,"./square":15,"./theme-styler":16,"./transcribing-emitter":17}],7:[function(require,module,exports){

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
},{}],8:[function(require,module,exports){

function Emitter() {
    this._events = {};
}

Emitter.prototype = {
    constructor: Emitter,
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

module.exports = Emitter;
},{}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){

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
},{}],11:[function(require,module,exports){

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
},{"./lib/lcgenerator":9}],12:[function(require,module,exports){
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
    _increment: function($chip, newval) {
        var FX_DURATION = 800;

        $chip.wrapInner("<span/>")
             .find("span")
             .slideUp({
                duration: FX_DURATION,
                queue: 'scoreboard',
                done: function() { $(this).parent().html(newval).delay(400, 'scoreboard'); }
             });
    },
    update: function(points) {
        var pts = toStringArray(points);
        this._increment(this.$R, pts[2]);
        this._increment(this.$M, pts[1]);
        this._increment(this.$L, pts[0]);
    }
};

module.exports = Scoreboard;

function toStringArray(num) {
    var num = String(num),
        len = num.length,
        DIGITS_MAX = 3,
        OUT_OF_RANGE = "999";
    // too big for *this* scoreboard...
    if (len > DIGITS_MAX) num = OUT_OF_RANGE, len = OUT_OF_RANGE.length;
    return [ num[len - 3] || "0", num[len - 2] || "0", num[len - 1] || "0" ];
}
},{}],13:[function(require,module,exports){
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
    _sortedInsert: function(x) {
        var lo = 0, hi = this.queue.length;
        while (lo < hi) {
            var mid = ~~((lo + hi) / 2);
            if (x.time < this.queue[mid].time)
                hi = mid;
            else
                lo = mid + 1;
        }
        return lo;
    },
    _enqueue: function(x) { return this.queue.splice(this._sortedInsert(x), 0, x); },
    _processEvent: function(event) {
        var fn = this.callbacks[event.type];
        this.emitter.trigger("score:change", this.score);
        if (fn != null)
            return (fn.length > 1)
                ? fn.call(this, event.pts, function(err) { if (!err) return void 0; })
                : console.log("<score event: %o>: :old [%o]", fn.name, this.score),
                  fn.call(this, event.pts),
                  console.log("...:new => [%o]", this.score);
        else
            return console.log("[Scorekeeper] could not find function " + event.type);
    },
    _processFinalizers: function() {
        for (var visitor in this.finalizers) {
            console.log("<finalizer: %o>: :old [%o] => :new [%o]... ", visitor, this.score, (this.score += this.finalizers[visitor](this.gameboard)));
            // this.score += visitor(this.gameboard);
        }
    },
    _tick: function() {
        var currIdx = this._sortedInsert({ time: new Date().getTime() }), index = 0;
        while (index < currIdx) {
            var _this = this,
                callback = function() { _this._processEvent(_this.queue[index]); return index += 1; };
            callback();
        }
        return this.queue.splice(0, currIdx);
    },
    _updateDisplay: function() {
      // update the scoreboard on the page here...
      console.log(":score => %o  @ [%o]", this.score, new Date);
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
},{}],14:[function(require,module,exports){
var Serializer = {
    export: function(gameboard) {
        return {
            _meta: {
                timestamp: +new Date,
                score: null,
                timer: gameboard.clock.seconds,
                transcripts: gameboard.emitter._transcripts || [],
                user: {}
            },
            options: {
                $el: gameboard.$el.selector,
                board: gameboard.board._table,
                scorekeeper: null,
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
},{}],15:[function(require,module,exports){
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
},{"./constants":3,"./lib/bit-flag-factory":7}],16:[function(require,module,exports){
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
},{"./constants":3}],17:[function(require,module,exports){
var Emitter = require('./lib/emitter'),
    util = require('util');

function TranscribingEmitter() {
    Emitter.call(this);
    this._transcripts = [];
}

TranscribingEmitter.prototype = Object.create(Emitter.prototype);
TranscribingEmitter.prototype.constructor = TranscribingEmitter;

TranscribingEmitter.prototype.__trigger__ = TranscribingEmitter.prototype.trigger;
TranscribingEmitter.prototype.trigger = function(/* data... [varargs] */) {
    var args = [].slice.call(arguments);
    // send original params to the subscribers...
    console.warn("ARGS: %o", args);
    this.__trigger__.apply(this, args);
    // ...then alter the params for the transcript's records
    // args[0] is the event name:
    switch (args[0]) {
        case "sq:open":
        case "sq:close":
        case "sq:flag":
        case "sq:unflag":
        case "sq:mine":
            // standard Square-based event
            // 0: event name, 1: Square instance, 2: jQuery-wrapped DOM element
            if (args[1].constructor.name === "Square")
                args[1] = JSON.stringify(args[1]);
            if (args[2] instanceof jQuery)
                args[2] = buildDOMString(args[2]);
            break;
        case "gb:start":
        case "gb:end:win":
        case "gb:end:over":
            // standard Gameboard-based event
            if (args[1].constructor.name === "Multimap")
                args[1] = JSON.stringify(args[1]);
            break;
    }
    // prefix array contents with the current timestamp as its key
    args.unshift(+new Date);
    this._transcripts.push(args);
};

module.exports = TranscribingEmitter;


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

},{"./lib/emitter":8,"util":23}],18:[function(require,module,exports){
var $C = require('./constants'),

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


/*  -------------------------------------------------------------------------------------------  */
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
},{"./constants":3}],19:[function(require,module,exports){
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
},{}],20:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],21:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],22:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],23:[function(require,module,exports){
var process=require("__browserify_process"),global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"./support/isBuffer":22,"__browserify_process":21,"inherits":20}]},{},[2,1,3,4,5,7,8,9,10,11,12,13,15,16,14,17,19,18,6])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2xjZ2VuZXJhdG9yLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL211bHRpbWFwLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbWluZWxheWVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVib2FyZC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3Njb3Jla2VlcGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2VyaWFsaXplci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3NxdWFyZS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RoZW1lLXN0eWxlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3RyYW5zY3JpYmluZy1lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdmFsaWRhdG9ycy5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL3ZlbmRvci9qcXVlcnkuaGFtbWVyLWZ1bGwuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvdXRpbC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWtEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKSxcclxuICAgIE1vZGVzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2RlcyxcclxuICAgIFByZXNldExldmVscyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0TGV2ZWxzLFxyXG4gICAgUHJlc2V0U2V0dXBzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRTZXR1cHMsXHJcbiAgICBEaW1WYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5Cb2FyZERpbWVuc2lvbnMsXHJcbiAgICBNaW5lVmFsaWRhdG9yID0gcmVxdWlyZSgnLi92YWxpZGF0b3JzJykuTWluZUNvdW50LFxyXG4gICAgVkVSU0lPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuVkVSU0lPTixcclxuICAgIE1BWF9HUklEX0RJTUVOU0lPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1BWF9HUklEX0RJTUVOU0lPTlMsXHJcblxyXG4gICAgbWluZWFibGVTcGFjZXMgPSBmdW5jdGlvbihkaW0pIHsgcmV0dXJuIH5+KE1hdGgucG93KGRpbSwgMikgKiAwLjUpOyB9LFxyXG4gICAgZGlzYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCwgdW5kbykge1xyXG4gICAgICAgIGlmICh1bmRvID09IG51bGwpIHVuZG8gPSBmYWxzZTtcclxuICAgICAgICAkZWxbdW5kbyA/ICdyZW1vdmVDbGFzcycgOiAnYWRkQ2xhc3MnXSgnZGlzYWJsZWQnKTtcclxuICAgICAgICAkZWwuZmluZChcImlucHV0XCIpLnByb3AoJ3JlYWRvbmx5JywgIXVuZG8pO1xyXG4gICAgfSxcclxuICAgIGVuYWJsZU9wdGlvbiA9IGZ1bmN0aW9uKCRlbCkgeyByZXR1cm4gZGlzYWJsZU9wdGlvbigkZWwsIHRydWUpOyB9O1xyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cclxuICAgIHZhciAkcG9zc2libGVNaW5lcyA9ICQoXCIjbWluZS1jb3VudFwiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIiksXHJcbiAgICAgICAgUFJFU0VUX1BBTkVMX1NFTEVDVE9SID0gXCJ1bC5wcmVzZXQgPiBsaTpub3QoOmhhcyhsYWJlbFtmb3IkPSctbW9kZSddKSlcIixcclxuICAgICAgICBDVVNUT01fUEFORUxfU0VMRUNUT1IgPSBcInVsLmN1c3RvbSA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiO1xyXG5cclxuICAgIC8vIHNldHRpbmcgaW5pdGlhbCB2YWx1ZVxyXG4gICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpKSk7XHJcbiAgICAkKFwiI2RpbWVuc2lvbnNcIikuc2libGluZ3MoXCIuYWR2aWNlXCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoTUFYX0dSSURfRElNRU5TSU9OUyArIFwiIHggXCIgKyBNQVhfR1JJRF9ESU1FTlNJT05TKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyB9KS5jbGljaygpO1xyXG4gICAgJChcIiNjdXN0b20tbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgfSk7XHJcblxyXG4gICAgJC5lYWNoKCQoXCJsYWJlbFtmb3JePSdsZXZlbC0nXVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wb3AoKTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICB2YXIgZCA9ICQoXCIjZGltZW5zaW9uc1wiKS52YWwoKSB8fCArJChcIiNkaW1lbnNpb25zXCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKSxcclxuICAgICAgICAgICAgICAgIG0gPSAkKFwiI21pbmUtY291bnRcIikudmFsKCkgfHwgKyQoXCIjbWluZS1jb3VudFwiKS5hdHRyKFwicGxhY2Vob2xkZXJcIik7XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IERpbVZhbGlkYXRvci52YWxpZGF0ZShkKSA/ICtkIDogOTtcclxuICAgICAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gTWluZVZhbGlkYXRvci52YWxpZGF0ZShtLCBtaW5lYWJsZVNwYWNlcyhnYW1lT3B0aW9ucy5kaW1lbnNpb25zKSkgPyBtIDogMTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlOiAlb1wiLCBlKTtcclxuICAgICAgICAgICAgICAgICQoXCIjdmFsaWRhdGlvbi13YXJuaW5nc1wiKS5odG1sKGUubWVzc2FnZSkuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHNldCB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy50aGVtZSA9ICQoXCIjY29sb3ItdGhlbWVcIikudmFsKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZXQgdXAgPGhlYWRlcj4gY29udGVudC4uLlxyXG4gICAgICAgICQoXCIjbWluZXMtZGlzcGxheVwiKS5maW5kKFwic3BhblwiKS5odG1sKGdhbWVPcHRpb25zLm1pbmVzKTtcclxuICAgICAgICAkKFwiLnZlcnNpb25cIikuaHRtbChWRVJTSU9OKTtcclxuXHJcbiAgICAgICAgd2luZG93LmdhbWVib2FyZCA9IG5ldyBHYW1lYm9hcmQoZ2FtZU9wdGlvbnMpLnJlbmRlcigpO1xyXG5cclxuICAgICAgICAkKFwiI3ZhbGlkYXRpb24td2FybmluZ3NcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIjYm9hcmQtY2FyZFwiKS5vbihcImNsaWNrXCIsIFwiYS5yZXBsYXlcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gdGVtcG9yYXJ5LCBicnV0ZS1mb3JjZSBmaXguLi5cclxuICAgICAgICAvLyBUT0RPOiByZXNldCBmb3JtIGFuZCB0b2dnbGUgdmlzaWJpbGl0eSBvbiB0aGUgc2VjdGlvbnMuLi5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIlxyXG52YXIgQ29uc29sZVJlbmRlcmVyID0ge1xyXG5cclxuICAgIENPTF9TUEFDSU5HOiAnICAgJyxcclxuICAgIE1JTkVEX1NRVUFSRTogJyonLFxyXG4gICAgQkxBTktfU1FVQVJFOiAnLicsXHJcbiAgICBSRU5ERVJFRF9NQVA6ICclbycsXHJcbiAgICBERUZBVUxUX1RSQU5TRk9STUVSOiBmdW5jdGlvbihyb3cpeyByZXR1cm4gcm93OyB9LFxyXG5cclxuICAgIF9tYWtlVGl0bGU6IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gc3RyLnNwbGl0KCcnKS5qb2luKCcgJykudG9VcHBlckNhc2UoKTsgfSxcclxuICAgIF9kaXNwbGF5Um93TnVtOiBmdW5jdGlvbihudW0pIHsgcmV0dXJuIFwiICAgICAgIFtcIiArIG51bSArIFwiXVxcblwiIH0sXHJcbiAgICBfdG9TeW1ib2xzOiBmdW5jdGlvbih2YWx1ZXMsIGZuKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIgKz0gZm4ocm93KS5qb2luKF90aGlzLkNPTF9TUEFDSU5HKS50b0xvd2VyQ2FzZSgpICsgX3RoaXMuX2Rpc3BsYXlSb3dOdW0oaWR4KVxyXG4gICAgICAgIH0sICdcXG4nKTtcclxuICAgIH0sXHJcbiAgICBfdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykgJiYgdmFsdWVzLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbiAgICB9LFxyXG4gICAgX2dldFJlbmRlcmVkTWFwOiBmdW5jdGlvbih0cmFuc2Zvcm1lcikge1xyXG4gICAgICAgIHZhciB2YWxzID0gdGhpcy5fdmFsaWRhdGUodGhpcy52YWx1ZXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b1N5bWJvbHModmFscywgdHJhbnNmb3JtZXIpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMuX3ZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHZpZXdHYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5NSU5FRF9TUVVBUkUgOiBzcS5nZXREYW5nZXIoKSA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5CTEFOS19TUVVBUkUgOiBzcS5nZXREYW5nZXIoKTsgfSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJnYW1lYm9hcmRcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0cmFuc2Zvcm1lcikpO1xyXG4gICAgfSxcclxuICAgIHZpZXdNaW5lczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kbG9nKFsgdGhpcy5fbWFrZVRpdGxlKFwibWluZSBwbGFjZW1lbnRzXCIpLCB0aGlzLlJFTkRFUkVEX01BUCBdXHJcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKSxcclxuICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZWRNYXAodGhpcy5ERUZBVUxUX1RSQU5TRk9STUVSKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnNvbGVSZW5kZXJlcjsiLCJcclxudmFyIENvbnN0YW50cyA9IHtcclxuXHJcbiAgICBWRVJTSU9OOiAnYmV0YTQnLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUzogMjUsXHJcblxyXG4gICAgRGVmYXVsdENvbmZpZzoge1xyXG4gICAgICAgIGRpbWVuc2lvbnM6IDksXHJcbiAgICAgICAgbWluZXM6IDEsXHJcbiAgICAgICAgYm9hcmQ6ICcjYm9hcmQnLFxyXG4gICAgICAgIHRpbWVyOiA1MDAsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAzMDAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogNDIwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDU0MCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS8sXHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb25zdGFudHM7IiwiXHJcblxyXG5mdW5jdGlvbiBDb3VudGRvd24oc2Vjb25kcywgZWwpIHtcclxuICAgIHRoaXMuc2Vjb25kcyA9IHNlY29uZHM7XHJcbiAgICB0aGlzLmluaXRpYWwgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsLmNoYXJBdCgwKSA9PT0gJyMnID8gZWwuc3Vic3RyaW5nKDEpIDogZWwpO1xyXG5cclxuICAgIHRoaXMubTEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMScpO1xyXG4gICAgdGhpcy5tMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20yJyk7XHJcbiAgICB0aGlzLnMxID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczEnKTtcclxuICAgIHRoaXMuczIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMicpO1xyXG5cclxuICAgIHRoaXMuZnJlZXplID0gZmFsc2U7XHJcbn1cclxuXHJcbkNvdW50ZG93bi5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogQ291bnRkb3duLFxyXG4gICAgX3JlbmRlckluaXRpYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBhcnIgPSB0aGlzLl90b01pbnNTZWNzKHRoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgdGhpcy5fc2V0RGlzcGxheShhcnJbMF0gfHwgMCwgYXJyWzFdIHx8IDApO1xyXG4gICAgfSxcclxuICAgIF90b01pbnNTZWNzOiBmdW5jdGlvbihzZWNzKSB7XHJcbiAgICAgICAgdmFyIG1pbnMgPSB+fihzZWNzIC8gNjApLFxyXG4gICAgICAgICAgICBzZWNzID0gc2VjcyAlIDYwO1xyXG4gICAgICAgIHJldHVybiBbbWlucywgc2Vjc107XHJcbiAgICB9LFxyXG4gICAgX3NldERpc3BsYXk6IGZ1bmN0aW9uKG1pbnMsIHNlY3MpIHtcclxuICAgICAgICB2YXIgbSA9IFN0cmluZyhtaW5zKSxcclxuICAgICAgICAgICAgcyA9IFN0cmluZyhzZWNzKSxcclxuICAgICAgICAgICAgdGltZXMgPSBbbSwgc10ubWFwKGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcnIgPSBTdHJpbmcoeCkuc3BsaXQoJycpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyci5sZW5ndGggPCAyKSBhcnIudW5zaGlmdCgnMCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5tMS5pbm5lckhUTUwgPSB0aW1lc1swXVswXTtcclxuICAgICAgICB0aGlzLm0yLmlubmVySFRNTCA9IHRpbWVzWzBdWzFdO1xyXG4gICAgICAgIHRoaXMuczEuaW5uZXJIVE1MID0gdGltZXNbMV1bMF07XHJcbiAgICAgICAgdGhpcy5zMi5pbm5lckhUTUwgPSB0aW1lc1sxXVsxXTtcclxuICAgIH0sXHJcbiAgICBfY291bnRkb3duOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5mcmVlemUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuc2Vjb25kcyAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJyID0gX3RoaXMuX3RvTWluc1NlY3MoX3RoaXMuc2Vjb25kcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KGFyclswXSwgYXJyWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2Vjb25kcy0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0RGlzcGxheSgwLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgfSwgMTAwMCk7XHJcbiAgICB9LFxyXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IGZhbHNlOyB0aGlzLl9jb3VudGRvd24oKTsgfSxcclxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyB0aGlzLmZyZWV6ZSA9IHRydWU7IH0sXHJcbiAgICByZXNldDogZnVuY3Rpb24oKSB7IHRoaXMuX3NldERpc3BsYXkoMCwgMCk7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ291bnRkb3duOyIsIlxyXG5mdW5jdGlvbiBEYW5nZXJDYWxjdWxhdG9yKGdhbWVib2FyZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBib2FyZDogZ2FtZWJvYXJkLFxyXG4gICAgICAgIG5laWdoYm9yaG9vZDoge1xyXG4gICAgICAgICAgICAvLyBkaXN0YW5jZSBpbiBzdGVwcyBmcm9tIHRoaXMgc3F1YXJlOlxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgdmVydC4gaG9yei5cclxuICAgICAgICAgICAgTk9SVEg6ICAgICAgWyAgMSwgIDAgXSxcclxuICAgICAgICAgICAgTk9SVEhFQVNUOiAgWyAgMSwgIDEgXSxcclxuICAgICAgICAgICAgRUFTVDogICAgICAgWyAgMCwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEhFQVNUOiAgWyAtMSwgIDEgXSxcclxuICAgICAgICAgICAgU09VVEg6ICAgICAgWyAtMSwgIDAgXSxcclxuICAgICAgICAgICAgU09VVEhXRVNUOiAgWyAtMSwgLTEgXSxcclxuICAgICAgICAgICAgV0VTVDogICAgICAgWyAgMCwgLTEgXSxcclxuICAgICAgICAgICAgTk9SVEhXRVNUOiAgWyAgMSwgLTEgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZm9yU3F1YXJlOiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICAgICAgaWYgKCtyb3cgPj0gMCAmJiArY2VsbCA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTWluZXMgPSAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLm5laWdoYm9yaG9vZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuYm9hcmQuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmIG5laWdoYm9yLmlzTWluZWQoKSkgdG90YWxNaW5lcysrO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdG90YWxNaW5lcyB8fCAnJztcclxuICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERhbmdlckNhbGN1bGF0b3I7IiwidmFyIE11bHRpbWFwID0gcmVxdWlyZSgnLi9saWIvbXVsdGltYXAnKSxcclxuICAgIERhbmdlckNhbGN1bGF0b3IgPSByZXF1aXJlKCcuL2Rhbmdlci1jYWxjdWxhdG9yJyksXHJcbiAgICBTcXVhcmUgPSByZXF1aXJlKCcuL3NxdWFyZScpLFxyXG4gICAgU2VyaWFsaXplciA9IHJlcXVpcmUoJy4vc2VyaWFsaXplcicpLFxyXG4gICAgR2x5cGhzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5HbHlwaHMsXHJcbiAgICBNZXNzYWdlT3ZlcmxheSA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTWVzc2FnZU92ZXJsYXksXHJcbiAgICBERUZBVUxUX0dBTUVfT1BUSU9OUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuRGVmYXVsdENvbmZpZyxcclxuICAgIHJneF9tb2JpbGVfZGV2aWNlcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9iaWxlRGV2aWNlUmVnZXgsXHJcbiAgICBDb3VudGRvd24gPSByZXF1aXJlKCcuL2NvdW50ZG93bicpLFxyXG4gICAgVHJhbnNjcmliaW5nRW1pdHRlciA9IHJlcXVpcmUoJy4vdHJhbnNjcmliaW5nLWVtaXR0ZXInKSxcclxuICAgIFRoZW1lU3R5bGVyID0gcmVxdWlyZSgnLi90aGVtZS1zdHlsZXInKSxcclxuICAgIENvbnNvbGVSZW5kZXJlciA9IHJlcXVpcmUoJy4vY29uc29sZS1yZW5kZXJlcicpLFxyXG4gICAgTWluZUxheWVyID0gcmVxdWlyZSgnLi9taW5lbGF5ZXInKSxcclxuICAgIFNjb3Jla2VlcGVyID0gcmVxdWlyZSgnLi9zY29yZWtlZXBlcicpLFxyXG4gICAgU2NvcmVib2FyZCA9IHJlcXVpcmUoJy4vc2NvcmVib2FyZCcpO1xyXG5cclxuLy8gd3JhcHBlciBhcm91bmQgYCRsb2dgLCB0byB0b2dnbGUgZGV2IG1vZGUgZGVidWdnaW5nXHJcbnZhciAkbG9nID0gZnVuY3Rpb24gJGxvZygpIHsgaWYgKCRsb2cuZGVidWdfbW9kZSB8fCBmYWxzZSkgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfVxyXG5cclxuZnVuY3Rpb24gR2FtZWJvYXJkKG9wdGlvbnMpIHtcclxuICAgIC8vIHRoZSBtYXAsIHNlcnZpbmcgYXMgdGhlIGludGVybmFsIHJlcHJlc2VuYXRpb24gb2YgdGhlIGdhbWVib2FyZFxyXG4gICAgdGhpcy5ib2FyZCA9IG5ldyBNdWx0aW1hcDtcclxuICAgIC8vIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBib2FyZCB3aGVuIHJlbmRlcmVkXHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRpbWVuc2lvbnM7XHJcbiAgICAvLyB0aGUgbnVtYmVyIG9mIG1pbmVzIHRoZSB1c2VyIGhhcyBzZWxlY3RlZFxyXG4gICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLm1pbmVzO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuYm9hcmQpO1xyXG4gICAgLy8gaXMgY3VzdG9tIG9yIHByZXNldCBnYW1lP1xyXG4gICAgdGhpcy5pc0N1c3RvbSA9IG9wdGlvbnMuaXNDdXN0b20gfHwgZmFsc2U7XHJcbiAgICAvLyB0aGUgZXZlbnQgdHJhbnNjcmliZXIgZm9yIHBsYXliYWNrIGFuZCBwZXJzaXN0ZW5jZVxyXG4gICAgdGhpcy5lbWl0dGVyID0gbmV3IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcbiAgICAvLyBzZWxlY3RpdmVseSBlbmFibGUgZGVidWcgbW9kZSBmb3IgY29uc29sZSB2aXN1YWxpemF0aW9ucyBhbmQgbm90aWZpY2F0aW9uc1xyXG4gICAgdGhpcy5kZWJ1Z19tb2RlID0gb3B0aW9ucy5kZWJ1Z19tb2RlIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmRlYnVnX21vZGU7XHJcbiAgICAkbG9nLmRlYnVnX21vZGUgPSB0aGlzLmRlYnVnX21vZGU7XHJcbiAgICAvLyBzcGVjaWZpZXMgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUgb3Igc2tpblxyXG4gICAgdGhpcy50aGVtZSA9IHRoaXMuX3NldENvbG9yVGhlbWUob3B0aW9ucy50aGVtZSB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy50aGVtZSk7XHJcbiAgICAvLyBjb250YWluZXIgZm9yIGZsYXNoIG1lc3NhZ2VzLCBzdWNoIGFzIHdpbi9sb3NzIG9mIGdhbWVcclxuICAgIHRoaXMuZmxhc2hDb250YWluZXIgPSAkKE1lc3NhZ2VPdmVybGF5KTtcclxuICAgIC8vIGNoZWNrIGZvciBkZXNrdG9wIG9yIG1vYmlsZSBwbGF0Zm9ybSAoZm9yIGV2ZW50IGhhbmRsZXJzKVxyXG4gICAgdGhpcy5pc01vYmlsZSA9IHRoaXMuX2NoZWNrRm9yTW9iaWxlKCk7XHJcbiAgICAvLyBrZWVwIHRyYWNrIG9mIHVzZXIgY2xpY2tzIHRvd2FyZHMgdGhlaXIgd2luXHJcbiAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcbiAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgLy8gYWRkIGluIHRoZSBjb3VudGRvd24gY2xvY2suLi5cclxuICAgIHRoaXMuY2xvY2sgPSBuZXcgQ291bnRkb3duKCtvcHRpb25zLnRpbWVyIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRpbWVyLCAnI2NvdW50ZG93bicpO1xyXG4gICAgdGhpcy5jbG9jay5zdGFydCgpO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBzY29yZWtlZXBpbmcgb2JqZWN0XHJcbiAgICB0aGlzLnNjb3Jla2VlcGVyID0gbmV3IFNjb3Jla2VlcGVyKHRoaXMpO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBhY3R1YWwgc2NvcmVib2FyZCB2aWV3XHJcbiAgICB0aGlzLnNjb3JlYm9hcmQgPSBuZXcgU2NvcmVib2FyZCgwLCBcIiNzY29yZS1kaXNwbGF5XCIpO1xyXG5cclxuICAgIC8vIGNyZWF0ZSB0aGUgYm9hcmQgaW4gbWVtb3J5IGFuZCBhc3NpZ24gdmFsdWVzIHRvIHRoZSBzcXVhcmVzXHJcbiAgICB0aGlzLl9sb2FkQm9hcmQoKTtcclxuICAgIC8vIHJlbmRlciB0aGUgSFRNTCB0byBtYXRjaCB0aGUgYm9hcmQgaW4gbWVtb3J5XHJcbiAgICB0aGlzLl9yZW5kZXJHcmlkKCk7XHJcbiAgICAvLyB0cmlnZ2VyIGV2ZW50IGZvciBnYW1lIHRvIGJlZ2luLi4uXHJcbiAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6c3RhcnQnLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbn1cclxuXHJcblxyXG5HYW1lYm9hcmQucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEdhbWVib2FyZCxcclxuICAgIC8vIFwiUFJJVkFURVwiIE1FVEhPRFM6XHJcbiAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBwcmVmaWxsIHNxdWFyZXMgdG8gcmVxdWlyZWQgZGltZW5zaW9ucy4uLlxyXG4gICAgICAgIHZhciBkaW1lbnNpb25zID0gdGhpcy5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgIHBvcHVsYXRlUm93ID0gZnVuY3Rpb24ocm93LCBzcXVhcmVzKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcmV0ID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBzcXVhcmVzOyArK2kpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0W2ldID0gbmV3IFNxdWFyZShyb3csIGkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKVxyXG4gICAgICAgICAgICB0aGlzLmJvYXJkLnNldChpLCBwb3B1bGF0ZVJvdyhpLCBkaW1lbnNpb25zKSk7XHJcblxyXG4gICAgICAgIC8vIGRldGVybWluZSByYW5kb20gcG9zaXRpb25zIG9mIG1pbmVkIHNxdWFyZXMuLi5cclxuICAgICAgICB0aGlzLl9kZXRlcm1pbmVNaW5lTG9jYXRpb25zKGRpbWVuc2lvbnMsIG1pbmVzKTtcclxuXHJcbiAgICAgICAgLy8gcHJlLWNhbGN1bGF0ZSB0aGUgZGFuZ2VyIGluZGV4IG9mIGVhY2ggbm9uLW1pbmVkIHNxdWFyZS4uLlxyXG4gICAgICAgIHRoaXMuX3ByZWNhbGNEYW5nZXJJbmRpY2VzKCk7XHJcblxyXG4gICAgICAgIC8vIGRpc3BsYXkgb3V0cHV0IGFuZCBnYW1lIHN0cmF0ZWd5IHRvIHRoZSBjb25zb2xlLi4uXHJcbiAgICAgICAgaWYgKHRoaXMuZGVidWdfbW9kZSkge1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnRvQ29uc29sZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlckdyaWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICB0aGlzLl9jcmVhdGVIVE1MR3JpZCh0aGlzLmRpbWVuc2lvbnMpO1xyXG4gICAgICAgIC8vIHNldHVwIGV2ZW50IGxpc3RlbmVycyB0byBsaXN0ZW4gZm9yIHVzZXIgY2xpY2tzXHJcbiAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIC8vIHNldCB0aGUgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICB0aGlzLl9zZXRDb2xvclRoZW1lKHRoaXMudGhlbWUpO1xyXG4gICAgfSxcclxuICAgIF9kZXRlcm1pbmVNaW5lTG9jYXRpb25zOiBmdW5jdGlvbihkaW1lbnNpb25zLCBtaW5lcykge1xyXG4gICAgICAgIHZhciBsb2NzID0gbmV3IE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucyksIF90aGlzID0gdGhpcztcclxuICAgICAgICBsb2NzLmZvckVhY2goZnVuY3Rpb24obG9jKSB7IF90aGlzLmdldFNxdWFyZUF0KGxvY1swXSwgbG9jWzFdKS5taW5lKCk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9wcmVjYWxjRGFuZ2VySW5kaWNlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmJvYXJkLnZhbHVlcygpXHJcbiAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkpOyB9LCBbXSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLnNldERhbmdlcihfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSkpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIic+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX3NldENvbG9yVGhlbWU6IGZ1bmN0aW9uKHRoZW1lKSB7XHJcbiAgICAgICAgVGhlbWVTdHlsZXIuc2V0KHRoZW1lLCB0aGlzLiRlbCk7XHJcbiAgICAgICAgcmV0dXJuIHRoZW1lO1xyXG4gICAgfSxcclxuICAgIF9jaGVja0Zvck1vYmlsZTogZnVuY3Rpb24oKSB7IHJldHVybiByZ3hfbW9iaWxlX2RldmljZXMudGVzdChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkpOyB9LFxyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBpZiAodGhpcy5pc01vYmlsZSkge1xyXG4gICAgICAgICAgICAvLyBmb3IgdG91Y2ggZXZlbnRzOiB0YXAgPT0gY2xpY2ssIGhvbGQgPT0gcmlnaHQgY2xpY2tcclxuICAgICAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub24oe1xyXG4gICAgICAgICAgICAgICAgdGFwOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgaG9sZDogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy4kZWwub24oe1xyXG4gICAgICAgICAgICAgICAgY2xpY2s6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0sICd0ZCwgdGQgPiBzcGFuJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPOiByZW1vdmUgYWZ0ZXIgZGV2ZWxvcG1lbnQgZW5kcy4uLmZvciBkZWJ1ZyB1c2Ugb25seSFcclxuICAgICAgICAvLyBJTkRJVklEVUFMIFNRVUFSRSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOm9wZW4nLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIk9wZW5pbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmNsb3NlJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJDbG9zaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpmbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJGbGFnZ2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6dW5mbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJVbmZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgLy8gR0FNRUJPQVJELVdJREUgRVZFTlRTXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjpzdGFydCcsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiTGV0IHRoZSBnYW1lIGJlZ2luIVwiLCBhcmd1bWVudHMpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91IHdpbiFcIik7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOm92ZXInLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkdhbWUgb3ZlciEgWW91J3JlIGRlYWQhXCIpOyB9KTtcclxuXHJcbiAgICAgICAgLy8gLS0tIFRIRVNFIEVWRU5UUyBBUkUgRk9SIFJFQUwsIFRPIFNUQVkhXHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAvLyB3aXJlcyB1cCB0aGUgc2NvcmVib2FyZCB2aWV3IG9iamVjdCB0byB0aGUgZXZlbnRzIHJlY2VpdmVkIGZyb20gdGhlIHNjb3Jla2VlcGVyXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzY29yZTpjaGFuZ2UnLCBmdW5jdGlvbigpIHsgX3RoaXMuc2NvcmVib2FyZC51cGRhdGUoX3RoaXMuc2NvcmVrZWVwZXIuc2NvcmUpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZigpO1xyXG4gICAgICAgIC8vIHR1cm4gb2ZmIHRvdWNoIGV2ZW50cyBhcyB3ZWxsXHJcbiAgICAgICAgdGhpcy4kZWwuaGFtbWVyKCkub2ZmKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETzogYWxzbyBoYW5kbGUgZmlyc3QtY2xpY2stY2FuJ3QtYmUtbWluZSAoaWYgd2UncmUgZm9sbG93aW5nIHRoYXQgcnVsZSlcclxuICAgICAgICAvLyBoZXJlLCBpZiB1c2VyTW92ZXMgPT09IDAuLi4gOm1lc3NhZ2UgPT4gOm11bGxpZ2FuP1xyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcbiAgICAgICAgdmFyIGN1cnJfb3BlbiA9IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc01pbmVkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl9vcGVuU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgIGlmICghc3F1YXJlLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc01pbmVkKCkpIHtcclxuICAgICAgICAgICAgJGNlbGwuYWRkQ2xhc3MoJ2tpbGxlci1taW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcblxyXG4gICAgICAgIHZhciBvcGVuZWRfc3F1YXJlcyA9IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpIC0gY3Vycl9vcGVuO1xyXG4gICAgICAgICRsb2coXCJKdXN0IG9wZW5lZCAlbyBzcXVhcmVzLi4udGVsbGluZyBzY29yZXIuXFxuVXNlciBtb3ZlczogJW8uXCIsIG9wZW5lZF9zcXVhcmVzLCB0aGlzLnVzZXJNb3Zlcyk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci51cChvcGVuZWRfc3F1YXJlcyk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZVJpZ2h0Q2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBzdG9wIHRoZSBjb250ZXh0bWVudSBmcm9tIHBvcHBpbmcgdXAgb24gZGVza3RvcCBicm93c2Vyc1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgIHRoaXMudXNlck1vdmVzKys7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKVxyXG4gICAgICAgICAgICB0aGlzLl9mbGFnU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3VuZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICB0aGlzLl9jbG9zZVNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fZXZhbHVhdGVGb3JHYW1lV2luKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICAvLyBoYW5kbGVzIGF1dG9jbGVhcmluZyBvZiBzcGFjZXMgYXJvdW5kIHRoZSBvbmUgY2xpY2tlZFxyXG4gICAgX3JlY3Vyc2l2ZVJldmVhbDogZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZCksXHJcbiAgICAgICAgICAgIHJvdyA9IHNvdXJjZS5nZXRSb3coKSxcclxuICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCksXHJcbiAgICAgICAgICAgIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgZGlyZWN0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGRpcmVjdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMV0sXHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgIW5laWdoYm9yLmlzTWluZWQoKSAmJiAhbmVpZ2hib3IuaXNGbGFnZ2VkKCkgJiYgbmVpZ2hib3IuaXNDbG9zZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX29wZW5TcXVhcmUobmVpZ2hib3IpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgfHwgIW5laWdoYm9yLmdldERhbmdlcigpID4gMClcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIF9vcGVuU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6b3BlblwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2Nsb3NlU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmNsb3NlXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKS5yZW1vdmVDbGFzcygnY2xvc2VkJyk7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6ZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX3VuZmxhZ1NxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUudW5mbGFnKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6dW5mbGFnXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfZ2V0T3BlbmVkU3F1YXJlc0NvdW50OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNPcGVuKCk7IH0pLmxlbmd0aDsgfSxcclxuICAgIF9ldmFsdWF0ZUZvckdhbWVXaW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBub3RNaW5lZCA9IHRoaXMuZ2V0U3F1YXJlcygpLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gIXNxLmlzTWluZWQoKTsgfSkubGVuZ3RoO1xyXG4gICAgICAgIGlmIChub3RNaW5lZCA9PT0gdGhpcy5fZ2V0T3BlbmVkU3F1YXJlc0NvdW50KCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYXNoTXNnOiBmdW5jdGlvbihtc2csIGlzQWxlcnQpIHtcclxuICAgICAgICB0aGlzLmZsYXNoQ29udGFpbmVyXHJcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoaXNBbGVydCA/ICdnYW1lLW92ZXInIDogJ2dhbWUtd2luJylcclxuICAgICAgICAgICAgICAgIC5odG1sKG1zZylcclxuICAgICAgICAgICAgICAgIC5zaG93KCk7XHJcbiAgICB9LFxyXG4gICAgX3ByZXBhcmVGaW5hbFJldmVhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oZikge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fdW5mbGFnU3F1YXJlKGYsIGZhbHNlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLmNsb2NrLnN0b3AoKTtcclxuICAgICAgICB0aGlzLnNjb3Jla2VlcGVyLmNsb3NlKCk7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVXaW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcbiAgICAgICAgdGhpcy4kZWxcclxuICAgICAgICAgICAgLmZpbmQoJy5zcXVhcmUnKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdvcGVuJyk7XHJcblxyXG4gICAgICAgICRsb2coXCItLS0gIEdBTUUgV0lOISAgLS0tXCIpO1xyXG4gICAgICAgICRsb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgICAgICB0aGlzLl9mbGFzaE1zZygnPHNwYW4+R2FtZSBPdmVyITwvc3Bhbj48YSBocmVmPVwiI1wiIGNsYXNzPVwicmVwbGF5XCI+Q2xpY2sgaGVyZSB0byBwbGF5IGFnYWluLi4uPC9hPicpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjplbmQ6d2luJywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lT3ZlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLW92ZXInKTtcclxuICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG5cclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgJGxvZygnLS0tICBHQU1FIE9WRVIhICAtLS0nKTtcclxuICAgICAgICB0aGlzLl9mbGFzaE1zZygnPHNwYW4+R2FtZSBPdmVyITwvc3Bhbj48YSBocmVmPVwiI1wiIGNsYXNzPVwicmVwbGF5XCI+Q2xpY2sgaGVyZSB0byBwbGF5IGFnYWluLi4uPC9hPicsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjplbmQ6b3ZlcicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfcmVuZGVyU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICB2YXIgJGNlbGwgPSB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSksXHJcbiAgICAgICAgICAgIGdldENvbnRlbnRzID0gZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc0ZsYWdnZWQoKSkgcmV0dXJuIEdseXBocy5GTEFHO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzTWluZWQoKSkgcmV0dXJuIEdseXBocy5NSU5FO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICEhc3EuZ2V0RGFuZ2VyKCkgPyBzcS5nZXREYW5nZXIoKSA6ICcnO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAkZGFuZ2VyU3BhbiA9ICQoJzxzcGFuIC8+JywgeyAnY2xhc3MnOiAnZGFuZ2VyJywgaHRtbDogZ2V0Q29udGVudHMoc3F1YXJlKSB9KTtcclxuXHJcbiAgICAgICAgJGNlbGwuZW1wdHkoKS5hcHBlbmQoJGRhbmdlclNwYW4pO1xyXG5cclxuICAgICAgICAvLyBkZWNvcmF0ZSA8dGQ+IHdpdGggQ1NTIGNsYXNzZXMgYXBwcm9wcmlhdGUgdG8gc3F1YXJlJ3Mgc3RhdGVcclxuICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NxdWFyZScpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2NlbGwnICsgc3F1YXJlLmdldENlbGwoKSlcclxuICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS5qb2luKCcgJykpO1xyXG5cclxuICAgICAgICAvLyBhdHRhY2ggdGhlIFNxdWFyZSB0byB0aGUgZGF0YSBhc3NvY2lhdGVkIHdpdGggdGhlIGdyaWQgY2VsbFxyXG4gICAgICAgICRjZWxsLmRhdGEoJ3NxdWFyZScsIHNxdWFyZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFwiUFVCTElDXCIgTUVUSE9EU1xyXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAvLyByZXR1cm4gYHRoaXNgLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmUgY2hhaW5lZCB0byBpdHMgaW5pdGlhbGl6YXRpb24gY2FsbFxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIGEgU3F1YXJlIGluc3RhbmNlIGFzIGEgcGFyYW0sIHJldHVybnMgYSBqUXVlcnktd3JhcHBlZCBET00gbm9kZSBvZiBpdHMgY2VsbFxyXG4gICAgZ2V0R3JpZENlbGw6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLiRlbFxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJyNyb3cnICsgc3F1YXJlLmdldFJvdygpKVxyXG4gICAgICAgICAgICAgICAgLmZpbmQoJ3RkJylcclxuICAgICAgICAgICAgICAgIC5lcShzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgIH0sXHJcbiAgICAvLyB0YWtlcyByb3cgYW5kIGNlbGwgY29vcmRpbmF0ZXMgYXMgcGFyYW1zLCByZXR1cm5zIHRoZSBhc3NvY2lhdGVkIFNxdWFyZSBpbnN0YW5jZVxyXG4gICAgZ2V0U3F1YXJlQXQ6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgIHZhciByb3cgPSB0aGlzLmJvYXJkLmdldChyb3cpO1xyXG4gICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgLnZhbHVlcygpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbCk7IH0sIFtdKVxyXG4gICAgfSxcclxuICAgIC8vIGV4cG9ydCBzZXJpYWxpemVkIHN0YXRlIHRvIHBlcnNpc3QgZ2FtZSBmb3IgbGF0ZXJcclxuICAgIGV4cG9ydDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbmVlZCBnYW1lT3B0aW9ucywgbWV0YWRhdGEgb24gZGF0ZXRpbWUvZXRjLiwgc2VyaWFsaXplIGFsbCBzcXVhcmVzJyBzdGF0ZXNcclxuICAgICAgICByZXR1cm4gU2VyaWFsaXplci5leHBvcnQodGhpcyk7XHJcbiAgICB9LFxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgIHRvQ29uc29sZTogZnVuY3Rpb24od2l0aERhbmdlcikge1xyXG4gICAgICAgIHZhciByZW5kZXJlciA9IENvbnNvbGVSZW5kZXJlci50bygkbG9nKS53aXRoVmFsdWVzKHRoaXMuYm9hcmQudmFsdWVzKCkpO1xyXG4gICAgICAgIHJldHVybiAod2l0aERhbmdlcikgPyByZW5kZXJlci52aWV3R2FtZSgpIDogcmVuZGVyZXIudmlld01pbmVzKCk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWVib2FyZDsiLCJcclxuLy8gQHVzYWdlIHZhciBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbJ0ZfT1BFTicsICdGX01JTkVEJywgJ0ZfRkxBR0dFRCcsICdGX0lOREVYRUQnXSk7IGJmID0gbmV3IEJpdEZsYWdzO1xyXG5mdW5jdGlvbiBCaXRGbGFnRmFjdG9yeShhcmdzKSB7XHJcblxyXG4gICAgdmFyIGJpblRvRGVjID0gZnVuY3Rpb24oc3RyKSB7IHJldHVybiBwYXJzZUludChzdHIsIDIpOyB9LFxyXG4gICAgICAgIGRlY1RvQmluID0gZnVuY3Rpb24obnVtKSB7IHJldHVybiBudW0udG9TdHJpbmcoMik7IH0sXHJcbiAgICAgICAgYnVpbGRTdGF0ZSA9IGZ1bmN0aW9uKGFycikgeyByZXR1cm4gcGFkKGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHsgcmV0dXJuIFN0cmluZygrcGFyYW0pOyB9KS5yZXZlcnNlKCkuam9pbignJykpOyB9LFxyXG4gICAgICAgIHBhZCA9IGZ1bmN0aW9uIChzdHIsIG1heCkge1xyXG4gICAgICAgICAgbWF4IHx8IChtYXggPSA0IC8qIHRoaXMuREVGQVVMVF9TSVpFLmxlbmd0aCAqLyk7XHJcbiAgICAgICAgICB2YXIgZGlmZiA9IG1heCAtIHN0ci5sZW5ndGg7XHJcbiAgICAgICAgICBmb3IgKHZhciBhY2M9W107IGRpZmYgPiAwOyBhY2NbLS1kaWZmXSA9ICcwJykge31cclxuICAgICAgICAgIHJldHVybiBhY2Muam9pbignJykgKyBzdHI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZCA9IGZ1bmN0aW9uKG5hbWUpIHsgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5oYXModGhpc1tuYW1lXSk7IH0gfSxcclxuICAgICAgICBjcmVhdGVRdWVyeU1ldGhvZE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIGlmICh+bmFtZS5pbmRleE9mKCdfJykpXHJcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHJpbmcobmFtZS5pbmRleE9mKCdfJykgKyAxKTtcclxuICAgICAgICAgICAgcmV0dXJuICdpcycgKyBuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbmFtZS5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTdGF0ZXMgPSBmdW5jdGlvbihhcmdzLCBwcm90bykge1xyXG4gICAgICAgICAgICBpZiAoIWFyZ3MubGVuZ3RoKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBwcm90by5fc3RhdGVzID0gW107XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj1hcmdzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmxhZ05hbWUgPSBTdHJpbmcoYXJnc1tpXSkudG9VcHBlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICBjbHNOYW1lID0gZmxhZ05hbWUudG9Mb3dlckNhc2UoKSxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IE1hdGgucG93KDIsIGkpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kTmFtZSA9IGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZShjbHNOYW1lKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZCA9IGNyZWF0ZVF1ZXJ5TWV0aG9kKGZsYWdOYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBwcm90b1tmbGFnTmFtZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHByb3RvLl9zdGF0ZXNbaV0gPSBjbHNOYW1lO1xyXG4gICAgICAgICAgICAgICAgcHJvdG9bcXVlcnlNZXRob2ROYW1lXSA9IHF1ZXJ5TWV0aG9kO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHByb3RvLkRFRkFVTFRfU1RBVEUgPSBwYWQoJycsIGkpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgZnVuY3Rpb24gQml0RmxhZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5fZmxhZ3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgICA/IGJ1aWxkU3RhdGUoW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKVxyXG4gICAgICAgICAgICA6IHRoaXMuREVGQVVMVF9TVEFURTtcclxuICAgIH1cclxuXHJcbiAgICBCaXRGbGFncy5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgY29uc3RydWN0b3I6IEJpdEZsYWdzLFxyXG4gICAgICAgIGhhczogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gISEoYmluVG9EZWModGhpcy5fZmxhZ3MpICYgZmxhZyk7IH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgfCBmbGFnKSk7IH0sXHJcbiAgICAgICAgdW5zZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIH5mbGFnKSk7IH0sXHJcbiAgICAgICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgX2ZsYWdzOiB0aGlzLl9mbGFncyB9OyB9XHJcbiAgICB9O1xyXG5cclxuICAgIEJpdEZsYWdzLndpdGhEZWZhdWx0cyA9IGZ1bmN0aW9uKGRlZmF1bHRzKSB7IHJldHVybiBuZXcgQml0RmxhZ3MoZGVmYXVsdHMpOyB9O1xyXG5cclxuICAgIHNldFN0YXRlcyhhcmdzLCBCaXRGbGFncy5wcm90b3R5cGUpO1xyXG5cclxuICAgIHJldHVybiBCaXRGbGFncztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBCaXRGbGFnRmFjdG9yeTsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBFbWl0dGVyLFxyXG4gICAgb246IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdIHx8IFtdO1xyXG4gICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0ucHVzaChmbik7XHJcbiAgICB9LFxyXG4gICAgb2ZmOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0uc3BsaWNlKHRoaXMuX2V2ZW50c1tldmVudF0uaW5kZXhPZihmbiksIDEpO1xyXG4gICAgfSxcclxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKGV2ZW50IC8qLCBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgICAgIGlmICh0aGlzLl9ldmVudHNbZXZlbnRdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dGhpcy5fZXZlbnRzW2V2ZW50XS5sZW5ndGg7IGkgPCBsZW47ICsraSlcclxuICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjsiLCIvLyBMaW5lYXIgQ29uZ3J1ZW50aWFsIEdlbmVyYXRvcjogdmFyaWFudCBvZiBhIExlaG1hbiBHZW5lcmF0b3JcclxuLy8gYmFzZWQgb24gTENHIGZvdW5kIGhlcmU6IGh0dHBzOi8vZ2lzdC5naXRodWIuY29tL1Byb3Rvbms/cGFnZT00XHJcbnZhciBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IgPSAoZnVuY3Rpb24oKXtcclxuICAvLyBTZXQgdG8gdmFsdWVzIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9OdW1lcmljYWxfUmVjaXBlc1xyXG4gIC8vIG0gaXMgYmFzaWNhbGx5IGNob3NlbiB0byBiZSBsYXJnZSAoYXMgaXQgaXMgdGhlIG1heCBwZXJpb2QpXHJcbiAgLy8gYW5kIGZvciBpdHMgcmVsYXRpb25zaGlwcyB0byBhIGFuZCBjXHJcbiAgZnVuY3Rpb24gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yKCkge1xyXG4gICAgICB0aGlzLm0gPSA0Mjk0OTY3Mjk2O1xyXG4gICAgICAvLyBhIC0gMSBzaG91bGQgYmUgZGl2aXNpYmxlIGJ5IG0ncyBwcmltZSBmYWN0b3JzXHJcbiAgICAgIHRoaXMuYSA9IDE2NjQ1MjU7XHJcbiAgICAgIC8vIGMgYW5kIG0gc2hvdWxkIGJlIGNvLXByaW1lXHJcbiAgICAgIHRoaXMuYyA9IDEwMTM5MDQyMjM7XHJcbiAgICAgIHRoaXMuc2VlZCA9IHZvaWQgMDtcclxuICAgICAgdGhpcy56ID0gdm9pZCAwO1xyXG4gICAgICAvLyBpbml0aWFsIHByaW1pbmcgb2YgdGhlIGdlbmVyYXRvciwgdW50aWwgbGF0ZXIgb3ZlcnJpZGVuXHJcbiAgICAgIHRoaXMuc2V0U2VlZCgpO1xyXG4gIH1cclxuICBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcixcclxuICAgIHNldFNlZWQ6IGZ1bmN0aW9uKHZhbCkgeyB0aGlzLnogPSB0aGlzLnNlZWQgPSB2YWwgfHwgTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogdGhpcy5tKTsgfSxcclxuICAgIGdldFNlZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zZWVkOyB9LFxyXG4gICAgcmFuZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIGRlZmluZSB0aGUgcmVjdXJyZW5jZSByZWxhdGlvbnNoaXBcclxuICAgICAgdGhpcy56ID0gKHRoaXMuYSAqIHRoaXMueiArIHRoaXMuYykgJSB0aGlzLm07XHJcbiAgICAgIC8vIHJldHVybiBhIGZsb2F0IGluIFswLCAxKVxyXG4gICAgICAvLyBpZiB6ID0gbSB0aGVuIHogLyBtID0gMCB0aGVyZWZvcmUgKHogJSBtKSAvIG0gPCAxIGFsd2F5c1xyXG4gICAgICByZXR1cm4gdGhpcy56IC8gdGhpcy5tO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgcmV0dXJuIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yOyIsIlxyXG5mdW5jdGlvbiBNdWx0aW1hcCgpIHtcclxuICAgIHRoaXMuX3RhYmxlID0gW107XHJcbn1cclxuXHJcbk11bHRpbWFwLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBNdWx0aW1hcCxcclxuICAgIGdldDogZnVuY3Rpb24ocm93KSB7IHJldHVybiB0aGlzLl90YWJsZVtyb3ddOyB9LFxyXG4gICAgc2V0OiBmdW5jdGlvbihyb3csIHZhbCkgeyAodGhpcy5fdGFibGVbcm93XSB8fCAodGhpcy5fdGFibGVbcm93XSA9IFtdKSkucHVzaCh2YWwpOyB9LFxyXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gX3RoaXMuX3RhYmxlW3Jvd107IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCBpdGVtKSB7IHJldHVybiBhY2MuY29uY2F0KGl0ZW0pOyB9LCBbXSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkgeyB0aGlzLl90YWJsZSA9IHt9OyB9LFxyXG4gICAgc2l6ZTogZnVuY3Rpb24oKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSkubGVuZ3RoOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE11bHRpbWFwOyIsIlxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gcmVxdWlyZSgnLi9saWIvbGNnZW5lcmF0b3InKTtcclxuXHJcbmZ1bmN0aW9uIE1pbmVMYXllcihtaW5lcywgZGltZW5zaW9ucykge1xyXG4gICAgdGhpcy5nZW5lcmF0b3IgPSBuZXcgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yO1xyXG4gICAgdGhpcy5taW5lcyA9ICttaW5lcyB8fCAwO1xyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK2RpbWVuc2lvbnMgfHwgMDtcclxuXHJcbiAgICB2YXIgcmFuZHMgPSBbXSxcclxuICAgICAgICBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgZ2V0UmFuZG9tTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBfdGhpcy5nZW5lcmF0b3IucmFuZCgpICogKE1hdGgucG93KF90aGlzLmRpbWVuc2lvbnMsIDIpKSB8IDA7IH07XHJcblxyXG4gICAgZm9yICh2YXIgaT0wOyBpIDwgbWluZXM7ICsraSkge1xyXG4gICAgICAgIHZhciBybmQgPSBnZXRSYW5kb21OdW1iZXIoKTtcclxuXHJcbiAgICAgICAgaWYgKCF+cmFuZHMuaW5kZXhPZihybmQpKVxyXG4gICAgICAgICAgICByYW5kcy5wdXNoKHJuZCk7XHJcbiAgICAgICAgLy8gLi4ub3RoZXJ3aXNlLCBnaXZlIGl0IGFub3RoZXIgZ28tJ3JvdW5kOlxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtaW5lcysrO1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sb2NhdGlvbnMgPSByYW5kcy5tYXAoZnVuY3Rpb24ocm5kKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IH5+KHJuZCAvIGRpbWVuc2lvbnMpLFxyXG4gICAgICAgICAgICBjZWxsID0gcm5kICUgZGltZW5zaW9ucztcclxuICAgICAgICByZXR1cm4gWyByb3csIGNlbGwgXTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmxvY2F0aW9ucztcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaW5lTGF5ZXI7IiwiZnVuY3Rpb24gU2NvcmVib2FyZChzY29yZSwgZWwpIHtcclxuICAgIHRoaXMuc2NvcmUgPSBzY29yZSB8fCAwO1xyXG4gICAgdGhpcy5pbml0aWFsID0gc2NvcmU7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcbiAgICB0aGlzLiRlbCA9ICQoZWwpO1xyXG5cclxuICAgIHRoaXMuJEwgPSB0aGlzLiRlbC5maW5kKCcjc2MxJyk7XHJcbiAgICB0aGlzLiRNID0gdGhpcy4kZWwuZmluZCgnI3NjMicpO1xyXG4gICAgdGhpcy4kUiA9IHRoaXMuJGVsLmZpbmQoJyNzYzMnKTtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmluaXRpYWwpO1xyXG59XHJcblxyXG5TY29yZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTY29yZWJvYXJkLFxyXG4gICAgX2luY3JlbWVudDogZnVuY3Rpb24oJGNoaXAsIG5ld3ZhbCkge1xyXG4gICAgICAgIHZhciBGWF9EVVJBVElPTiA9IDgwMDtcclxuXHJcbiAgICAgICAgJGNoaXAud3JhcElubmVyKFwiPHNwYW4vPlwiKVxyXG4gICAgICAgICAgICAgLmZpbmQoXCJzcGFuXCIpXHJcbiAgICAgICAgICAgICAuc2xpZGVVcCh7XHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogRlhfRFVSQVRJT04sXHJcbiAgICAgICAgICAgICAgICBxdWV1ZTogJ3Njb3JlYm9hcmQnLFxyXG4gICAgICAgICAgICAgICAgZG9uZTogZnVuY3Rpb24oKSB7ICQodGhpcykucGFyZW50KCkuaHRtbChuZXd2YWwpLmRlbGF5KDQwMCwgJ3Njb3JlYm9hcmQnKTsgfVxyXG4gICAgICAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwb2ludHMpIHtcclxuICAgICAgICB2YXIgcHRzID0gdG9TdHJpbmdBcnJheShwb2ludHMpO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudCh0aGlzLiRSLCBwdHNbMl0pO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudCh0aGlzLiRNLCBwdHNbMV0pO1xyXG4gICAgICAgIHRoaXMuX2luY3JlbWVudCh0aGlzLiRMLCBwdHNbMF0pO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTY29yZWJvYXJkO1xyXG5cclxuZnVuY3Rpb24gdG9TdHJpbmdBcnJheShudW0pIHtcclxuICAgIHZhciBudW0gPSBTdHJpbmcobnVtKSxcclxuICAgICAgICBsZW4gPSBudW0ubGVuZ3RoLFxyXG4gICAgICAgIERJR0lUU19NQVggPSAzLFxyXG4gICAgICAgIE9VVF9PRl9SQU5HRSA9IFwiOTk5XCI7XHJcbiAgICAvLyB0b28gYmlnIGZvciAqdGhpcyogc2NvcmVib2FyZC4uLlxyXG4gICAgaWYgKGxlbiA+IERJR0lUU19NQVgpIG51bSA9IE9VVF9PRl9SQU5HRSwgbGVuID0gT1VUX09GX1JBTkdFLmxlbmd0aDtcclxuICAgIHJldHVybiBbIG51bVtsZW4gLSAzXSB8fCBcIjBcIiwgbnVtW2xlbiAtIDJdIHx8IFwiMFwiLCBudW1bbGVuIC0gMV0gfHwgXCIwXCIgXTtcclxufSIsImZ1bmN0aW9uIFNjb3Jla2VlcGVyKGdhbWVib2FyZCkge1xyXG4gIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gIHRoaXMuY2FsbGJhY2tzID0ge1xyXG4gICAgdXA6IGZ1bmN0aW9uIHVwKHB0cykgeyB0aGlzLnNjb3JlICs9IHB0czsgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uIGRvd24ocHRzKSB7IHRoaXMuc2NvcmUgPSAodGhpcy5zY29yZSAtIHB0cyA8PSAwKSA/IDAgOiB0aGlzLnNjb3JlIC0gcHRzOyB9XHJcbiAgfTtcclxuXHJcbiAgdGhpcy5maW5hbGl6ZXJzID0ge1xyXG4gICAgZm9yT3BlbmluZ1NxdWFyZXM6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtb3ZlcyA9IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgIHVubWluZWQgPSBNYXRoLnBvdyhnYW1lYm9hcmQuZGltZW5zaW9ucywgMikgLSBnYW1lYm9hcmQubWluZXM7XHJcbiAgICAgICAgcmV0dXJuIDEgLSAofn4obW92ZXMgLyB1bm1pbmVkKSAqIDEwKTtcclxuICAgIH0sXHJcbiAgICBmb3JUaW1lUGFzc2VkOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgdG90YWwgPSBnYW1lYm9hcmQuY2xvY2suaW5pdGlhbCwgZWxhcHNlZCA9IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzO1xyXG4gICAgICAgIHJldHVybiAxMDAgLSB+fihlbGFwc2VkIC8gdG90YWwgKiAxMDApO1xyXG4gICAgfSxcclxuICAgIGZvckZld2VzdE1vdmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICAvLyBleHBlcmltZW50YWw6IHNxcnQoeF4yIC0geCkgKiAxMFxyXG4gICAgICAgIHZhciBkaW1zID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpO1xyXG4gICAgICAgIHJldHVybiB+fihNYXRoLnNxcnQoZGltcyAtIGdhbWVib2FyZC51c2VyTW92ZXMpICogMTApO1xyXG4gICAgfSxcclxuICAgIGZvckZpbmFsTWlzZmxhZ2dpbmdzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBtaXNmbGFnZ2VkID0gZmxhZ2dlZC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pO1xyXG4gICAgICAgIHJldHVybiAobWlzZmxhZ2dlZC5sZW5ndGggKiAxMCkgfHwgMDtcclxuICAgIH0sXHJcbiAgICBmb3JDb3JyZWN0RmxhZ2dpbmc6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtaW5lcyA9IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBmbGFnZ2VkTWluZXMgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNNaW5lZCgpOyB9KSxcclxuICAgICAgICAgICAgcGN0ID0gfn4oZmxhZ2dlZE1pbmVzLmxlbmd0aCAvIG1pbmVzKTtcclxuICAgICAgICByZXR1cm4gTWF0aC5jZWlsKChtaW5lcyAqIDEwKSAqIHBjdCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgdGhpcy5xdWV1ZSA9IFtdO1xyXG4gIHRoaXMuZmluYWwgPSBbXTtcclxuXHJcbiAgLy8gVE9ETzogd2VhbiB0aGlzIGNsYXNzIG9mZiBkZXBlbmRlbmN5IG9uIGdhbWVib2FyZFxyXG4gIC8vIHNob3VsZCBvbmx5IG5lZWQgdG8gaGF2ZSBjdG9yIGluamVjdGVkIHdpdGggdGhlIGdhbWVib2FyZCdzIGVtaXR0ZXJcclxuICB0aGlzLmdhbWVib2FyZCA9IGdhbWVib2FyZDtcclxuICB0aGlzLmVtaXR0ZXIgPSBnYW1lYm9hcmQuZW1pdHRlcjtcclxuICB0aGlzLnNjb3JlID0gMDtcclxuXHJcbiAgdGhpcy5uc3UgPSB0aGlzLl9kZXRlcm1pbmVTaWduaWZpY2FudFVuaXQoKTtcclxuICB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgLy8gaWYgZ2FtZSBpcyBub3cgb3ZlciwgZmx1c2ggcXVldWVzXHJcbiAgdGhpcy50aW1lciA9IHNldEludGVydmFsKHRoaXMuX3RpY2suYmluZChfdGhpcyksIHRoaXMubnN1KTtcclxuXHJcbiAgY29uc29sZS5sb2coXCJTY29yZWtlZXBlciBpbml0aWFsaXplZC4gIDpzY29yZSA9PiAlbywgOnRpbWVyID0+ICVvXCIsIHRoaXMuc2NvcmUsIHRoaXMudGltZXIpO1xyXG4gIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBvcyhwdHMpIHsgcmV0dXJuIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuZnVuY3Rpb24gbmVnKHB0cykgeyByZXR1cm4gLTEgKiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcblxyXG5TY29yZWtlZXBlci5wcm90b3R5cGUgPSB7XHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOm9wZW4nLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAvLyBjaGVjayBkYW5nZXIgaW5kZXguLi5pZiBub3QgPiAxLCBub3QgYHVwYHMgZm9yIHRoYXQhXHJcblxyXG4gICAgICB9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpjbG9zZScsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge30pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuXHJcbiAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6c3RhcnQnLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgLyogU1RBUlQgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgX3RoaXMuZW5kR2FtZSA9IHRydWU7IC8qIFNUT1AgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDpvdmVyJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IF90aGlzLmVuZEdhbWUgPSB0cnVlOyAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyB9KTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX3NvcnRlZEluc2VydDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSAvIDIpO1xyXG4gICAgICAgICAgICBpZiAoeC50aW1lIDwgdGhpcy5xdWV1ZVttaWRdLnRpbWUpXHJcbiAgICAgICAgICAgICAgICBoaSA9IG1pZDtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbG8gPSBtaWQgKyAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbG87XHJcbiAgICB9LFxyXG4gICAgX2VucXVldWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKHRoaXMuX3NvcnRlZEluc2VydCh4KSwgMCwgeCk7IH0sXHJcbiAgICBfcHJvY2Vzc0V2ZW50OiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50LnR5cGVdO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic2NvcmU6Y2hhbmdlXCIsIHRoaXMuc2NvcmUpO1xyXG4gICAgICAgIGlmIChmbiAhPSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gKGZuLmxlbmd0aCA+IDEpXHJcbiAgICAgICAgICAgICAgICA/IGZuLmNhbGwodGhpcywgZXZlbnQucHRzLCBmdW5jdGlvbihlcnIpIHsgaWYgKCFlcnIpIHJldHVybiB2b2lkIDA7IH0pXHJcbiAgICAgICAgICAgICAgICA6IGNvbnNvbGUubG9nKFwiPHNjb3JlIGV2ZW50OiAlbz46IDpvbGQgWyVvXVwiLCBmbi5uYW1lLCB0aGlzLnNjb3JlKSxcclxuICAgICAgICAgICAgICAgICAgZm4uY2FsbCh0aGlzLCBldmVudC5wdHMpLFxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIi4uLjpuZXcgPT4gWyVvXVwiLCB0aGlzLnNjb3JlKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBjb25zb2xlLmxvZyhcIltTY29yZWtlZXBlcl0gY291bGQgbm90IGZpbmQgZnVuY3Rpb24gXCIgKyBldmVudC50eXBlKTtcclxuICAgIH0sXHJcbiAgICBfcHJvY2Vzc0ZpbmFsaXplcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZvciAodmFyIHZpc2l0b3IgaW4gdGhpcy5maW5hbGl6ZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiPGZpbmFsaXplcjogJW8+OiA6b2xkIFslb10gPT4gOm5ldyBbJW9dLi4uIFwiLCB2aXNpdG9yLCB0aGlzLnNjb3JlLCAodGhpcy5zY29yZSArPSB0aGlzLmZpbmFsaXplcnNbdmlzaXRvcl0odGhpcy5nYW1lYm9hcmQpKSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuc2NvcmUgKz0gdmlzaXRvcih0aGlzLmdhbWVib2FyZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF90aWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3VycklkeCA9IHRoaXMuX3NvcnRlZEluc2VydCh7IHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpIH0pLCBpbmRleCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgY3VycklkeCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChfdGhpcy5xdWV1ZVtpbmRleF0pOyByZXR1cm4gaW5kZXggKz0gMTsgfTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKDAsIGN1cnJJZHgpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVEaXNwbGF5OiBmdW5jdGlvbigpIHtcclxuICAgICAgLy8gdXBkYXRlIHRoZSBzY29yZWJvYXJkIG9uIHRoZSBwYWdlIGhlcmUuLi5cclxuICAgICAgY29uc29sZS5sb2coXCI6c2NvcmUgPT4gJW8gIEAgWyVvXVwiLCB0aGlzLnNjb3JlLCBuZXcgRGF0ZSk7XHJcbiAgICB9LFxyXG4gICAgX2FkZFNjb3JlVG9RdWV1ZTogZnVuY3Rpb24odHlwZSwgcHRzKSB7IHJldHVybiB0aGlzLl9lbnF1ZXVlKHsgdGltZTogKCgrbmV3IERhdGUpICsgdGhpcy5uc3UpLCB0eXBlOiB0eXBlLCBwdHM6IHB0cyB9KTsgfSxcclxuXHJcbiAgICB1cDogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwiUXVldWVpbmcgYHVwYCBzY29yZSBldmVudCBvZiAlb1wiLCBwb3MocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcInVwXCIsIHBvcyhwdHMpKTsgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGBkb3duYCBzY29yZSBldmVudCBvZiAlb1wiLCBuZWcocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcImRvd25cIiwgbmVnKHB0cykpOyB9LFxyXG5cclxuICAgIGZpbmFsVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmZpbmFsLnB1c2gocG9zKHB0cykpOyB9LFxyXG4gICAgZmluYWxEb3duOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBnZXRQZW5kaW5nU2NvcmVDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnF1ZXVlLmxlbmd0aDsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIG91dCByZW1haW5pbmcgcXVldWUhXCIpO1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICB0aGlzLnF1ZXVlLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChldmVudCk7IH0pO1xyXG5cclxuICAgICAgdGhpcy5fcHJvY2Vzc0ZpbmFsaXplcnMoKTtcclxuXHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkZJTkFMIFNDT1JFOiAlb1wiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcbiAgICAgIHRoaXMucXVldWUubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5maW5hbC5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVrZWVwZXI7IiwidmFyIFNlcmlhbGl6ZXIgPSB7XHJcbiAgICBleHBvcnQ6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIF9tZXRhOiB7XHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6ICtuZXcgRGF0ZSxcclxuICAgICAgICAgICAgICAgIHNjb3JlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgdGltZXI6IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHM6IGdhbWVib2FyZC5lbWl0dGVyLl90cmFuc2NyaXB0cyB8fCBbXSxcclxuICAgICAgICAgICAgICAgIHVzZXI6IHt9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICRlbDogZ2FtZWJvYXJkLiRlbC5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIGJvYXJkOiBnYW1lYm9hcmQuYm9hcmQuX3RhYmxlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmVrZWVwZXI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBmbGFzaENvbnRhaW5lcjogZ2FtZWJvYXJkLmZsYXNoQ29udGFpbmVyLnNlbGVjdG9yLFxyXG4gICAgICAgICAgICAgICAgdGhlbWU6IGdhbWVib2FyZC50aGVtZSxcclxuICAgICAgICAgICAgICAgIGRlYnVnX21vZGU6IGdhbWVib2FyZC5kZWJ1Z19tb2RlLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczogZ2FtZWJvYXJkLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBtaW5lczogZ2FtZWJvYXJkLm1pbmVzLFxyXG4gICAgICAgICAgICAgICAgdXNlck1vdmVzOiBnYW1lYm9hcmQudXNlck1vdmVzLFxyXG4gICAgICAgICAgICAgICAgaXNNb2JpbGU6IGdhbWVib2FyZC5pc01vYmlsZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcbiAgICBpbXBvcnQ6IGZ1bmN0aW9uKGV4cG9ydGVkKSB7XHJcbiAgICAgICAgLy8gMS4gbmV3IEdhbWVib2FyZCBvYmplY3QgKGRlZmF1bHRzIGlzIG9rKVxyXG4gICAgICAgIC8vIDIuIHJlcGxhY2UgYGJvYXJkYCB3aXRoIG5ldyBNdWx0aW1hcDpcclxuICAgICAgICAvLyAgICAgLSBjb3VudCBhcnJheXMgYXQgZmlyc3QgbGV2ZWwgaW4gYm9hcmQgZm9yIG51bSByb3dzXHJcbiAgICAgICAgLy8gICAgICAgICAgW1tbe1wicm93XCI6MCxcImNlbGxcIjowLFwic3RhdGVcIjp7XCJfZmxhZ3NcIjpcIjEwMDBcIn0sXCJkYW5nZXJcIjowfSxcclxuICAgICAgICAvLyAgICAgICAgICB7XCJyb3dcIjowLFwiY2VsbFwiOjIsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMDAxMFwifX1dXV1cclxuICAgICAgICAvLyAgICAgLSBwYXJzZSBlYWNoIG9iamVjdCB0byBjcmVhdGUgbmV3IFNxdWFyZShyb3csIGNlbGwsIGRhbmdlciwgX2ZsYWdzKVxyXG4gICAgICAgIC8vIDMuICRlbCA9ICQoZXhwb3J0ZWQuJGVsKVxyXG4gICAgICAgIC8vIDQuIGZsYXNoQ29udGFpbmVyID0gJChleHBvcnRlZC5mbGFzaENvbnRhaW5lcilcclxuICAgICAgICAvLyA1LiB0aGVtZSA9IGV4cG9ydGVkLnRoZW1lXHJcbiAgICAgICAgLy8gNi4gZGVidWdfbW9kZSA9IGV4cG9ydGVkLmRlYnVnX21vZGVcclxuICAgICAgICAvLyA3LiBkaW1lbnNpb25zID0gZXhwb3J0ZWQuZGltZW5zaW9uc1xyXG4gICAgICAgIC8vIDguIG1pbmVzID0gZ2FtZWJvYXJkLm1pbmVzXHJcbiAgICAgICAgLy8gOS4gdXNlck1vdmVzID0gZ2FtZWJvYWQudXNlck1vdmVzLCBhbmQgaXNNb2JpbGVcclxuICAgICAgICAvLyAxMC4gbWFrZSBuZXcgQ291bnRkb3duIHdpdGggZXhwb3J0ZWQuX21ldGEudGltZXIgPSBzZWNvbmRzLCBjbG9jay5zdGFydCgpXHJcbiAgICAgICAgLy8gMTEuIGluc3RhbnRpYXRlIG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyLCBsb2FkaW5nIF9tZXRhLnRyYW5zY3JpcHRzIGludG8gaXRzIF90cmFuc2NyaXB0c1xyXG4gICAgICAgIC8vIDEyLiByZS1ydW4gdGhlIGludGVybmFsIGluaXQoKSBvcHM6IF9sb2FkQm9hcmQsIF9yZW5kZXJHcmlkXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VyaWFsaXplcjsiLCJ2YXIgQml0RmxhZ0ZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9iaXQtZmxhZy1mYWN0b3J5JyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzLFxyXG4gICAgRmxhZ3MgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkZsYWdzLFxyXG5cclxuICAgIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsgRmxhZ3MuT1BFTiwgRmxhZ3MuTUlORUQsIEZsYWdzLkZMQUdHRUQsIEZsYWdzLklOREVYRUQgXSk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIsIGZsYWdzKSB7XHJcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICByZXR1cm4gbmV3IFNxdWFyZShhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5yb3cgPSByb3c7XHJcbiAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgdGhpcy5zdGF0ZSA9IGZsYWdzID8gbmV3IEJpdEZsYWdzKGZsYWdzKSA6IG5ldyBCaXRGbGFncztcclxuICAgIHRoaXMuZGFuZ2VyID0gKGRhbmdlciA9PSArZGFuZ2VyKSA/ICtkYW5nZXIgOiAwO1xyXG5cclxuICAgIGlmICh0aGlzLmRhbmdlciA+IDApIHRoaXMuaW5kZXgoKTtcclxufVxyXG5cclxuU3F1YXJlLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTcXVhcmUsXHJcbiAgICBnZXRSb3c6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yb3c7IH0sXHJcbiAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgIGdldERhbmdlcjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmRhbmdlcjsgfSxcclxuICAgIHNldERhbmdlcjogZnVuY3Rpb24oaWR4KSB7IGlmIChpZHggPT0gK2lkeCkgeyB0aGlzLmRhbmdlciA9ICtpZHg7IHRoaXMuZGFuZ2VyID4gMCAmJiB0aGlzLmluZGV4KCk7IH0gfSxcclxuICAgIGdldFN0YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhTeW1ib2xzKVxyXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gX3RoaXNbICdpcycgKyBrZXkuY2hhckF0KDApICsga2V5LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpIF0oKTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihrZXkpIHsgcmV0dXJuIGtleS50b0xvd2VyQ2FzZSgpOyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIG9wZW46IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICBtaW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0lOREVYRUQpOyB9LFxyXG5cclxuICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuICF0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKTsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKCk7IH0sXHJcbiAgICBpc0luZGV4ZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0luZGV4ZWQoKTsgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyByb3c6IHRoaXMucm93LCBjZWxsOiB0aGlzLmNlbGwsIHN0YXRlOiB0aGlzLnN0YXRlLCBkYW5nZXI6IHRoaXMuZGFuZ2VyIH0gfSxcclxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpXHJcbiAgICAgICAgICAgID8gU3ltYm9scy5NSU5FRCA6IHRoaXMuc3RhdGUuaXNGbGFnZ2VkKClcclxuICAgICAgICAgICAgICAgID8gU3ltYm9scy5GTEFHR0VEIDogdGhpcy5zdGF0ZS5pc09wZW4oKVxyXG4gICAgICAgICAgICAgICAgICAgID8gU3ltYm9scy5PUEVOIDogU3ltYm9scy5DTE9TRUQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNxdWFyZTsiLCJ2YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxudmFyIFRoZW1lU3R5bGVyID0ge1xyXG5cdHNldDogZnVuY3Rpb24odGhlbWUsICRlbCkge1xyXG5cclxuXHRcdCRlbCB8fCAoJGVsID0gJCgkQy5EZWZhdWx0Q29uZmlnLmJvYXJkKSk7XHJcblxyXG5cdFx0dmFyIHRoZW1lRmlsZSA9ICRDLlRoZW1lc1t0aGVtZV0sXHJcblx0XHRcdCRoZWFkID0gJGVsLnBhcmVudHMoXCJib2R5XCIpLnNpYmxpbmdzKFwiaGVhZFwiKSxcclxuXHRcdFx0JHN0eWxlcyA9ICRoZWFkLmZpbmQoXCJsaW5rXCIpLFxyXG5cclxuXHRcdFx0aGFzUHJlRXhpc3RpbmcgPSBmdW5jdGlvbihzdHlsZXNoZWV0cykge1xyXG5cdFx0XHRcdHJldHVybiAhIXN0eWxlc2hlZXRzLmZpbHRlcihmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHJldHVybiAhIX4kKHRoaXMpLmF0dHIoJ2hyZWYnKS5pbmRleE9mKHRoZW1lRmlsZSk7XHJcblx0XHRcdFx0fSkubGVuZ3RoXHJcblx0XHRcdH0sXHJcblx0XHRcdC8vIGJ1aWxkIGEgbmV3IDxsaW5rPiB0YWcgZm9yIHRoZSBkZXNpcmVkIHRoZW1lIHN0eWxlc2hlZXQ6XHJcblx0XHRcdCRsaW5rID0gJChcIjxsaW5rIC8+XCIsIHtcclxuXHRcdFx0XHRyZWw6ICdzdHlsZXNoZWV0JyxcclxuXHRcdFx0XHR0eXBlOiAndGV4dC9jc3MnLFxyXG5cdFx0XHRcdGhyZWY6ICdjc3MvJyArIHRoZW1lRmlsZSArICcuY3NzJ1xyXG5cdFx0XHR9KTtcclxuXHRcdC8vIHVzaW5nICRlbCBhcyBhbmNob3IgdG8gdGhlIERPTSwgZ28gdXAgYW5kXHJcblx0XHQvLyBsb29rIGZvciBsaWdodC5jc3Mgb3IgZGFyay5jc3MsIGFuZC0taWYgbmVjZXNzYXJ5LS1zd2FwXHJcblx0XHQvLyBpdCBvdXQgZm9yIGB0aGVtZWAuXHJcblx0XHQvLyBBZGQgJGxpbmsgaWZmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdCFcclxuXHRcdGlmICghaGFzUHJlRXhpc3RpbmcoJHN0eWxlcykpXHJcblx0XHRcdCRzdHlsZXMuYWZ0ZXIoJGxpbmspO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGhlbWVTdHlsZXI7IiwidmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2xpYi9lbWl0dGVyJyksXHJcbiAgICB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNjcmliaW5nRW1pdHRlcigpIHtcclxuICAgIEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuX3RyYW5zY3JpcHRzID0gW107XHJcbn1cclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSk7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVHJhbnNjcmliaW5nRW1pdHRlcjtcclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLl9fdHJpZ2dlcl9fID0gVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlcjtcclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKC8qIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgIC8vIHNlbmQgb3JpZ2luYWwgcGFyYW1zIHRvIHRoZSBzdWJzY3JpYmVycy4uLlxyXG4gICAgY29uc29sZS53YXJuKFwiQVJHUzogJW9cIiwgYXJncyk7XHJcbiAgICB0aGlzLl9fdHJpZ2dlcl9fLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgLy8gLi4udGhlbiBhbHRlciB0aGUgcGFyYW1zIGZvciB0aGUgdHJhbnNjcmlwdCdzIHJlY29yZHNcclxuICAgIC8vIGFyZ3NbMF0gaXMgdGhlIGV2ZW50IG5hbWU6XHJcbiAgICBzd2l0Y2ggKGFyZ3NbMF0pIHtcclxuICAgICAgICBjYXNlIFwic3E6b3BlblwiOlxyXG4gICAgICAgIGNhc2UgXCJzcTpjbG9zZVwiOlxyXG4gICAgICAgIGNhc2UgXCJzcTpmbGFnXCI6XHJcbiAgICAgICAgY2FzZSBcInNxOnVuZmxhZ1wiOlxyXG4gICAgICAgIGNhc2UgXCJzcTptaW5lXCI6XHJcbiAgICAgICAgICAgIC8vIHN0YW5kYXJkIFNxdWFyZS1iYXNlZCBldmVudFxyXG4gICAgICAgICAgICAvLyAwOiBldmVudCBuYW1lLCAxOiBTcXVhcmUgaW5zdGFuY2UsIDI6IGpRdWVyeS13cmFwcGVkIERPTSBlbGVtZW50XHJcbiAgICAgICAgICAgIGlmIChhcmdzWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiU3F1YXJlXCIpXHJcbiAgICAgICAgICAgICAgICBhcmdzWzFdID0gSlNPTi5zdHJpbmdpZnkoYXJnc1sxXSk7XHJcbiAgICAgICAgICAgIGlmIChhcmdzWzJdIGluc3RhbmNlb2YgalF1ZXJ5KVxyXG4gICAgICAgICAgICAgICAgYXJnc1syXSA9IGJ1aWxkRE9NU3RyaW5nKGFyZ3NbMl0pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwiZ2I6c3RhcnRcIjpcclxuICAgICAgICBjYXNlIFwiZ2I6ZW5kOndpblwiOlxyXG4gICAgICAgIGNhc2UgXCJnYjplbmQ6b3ZlclwiOlxyXG4gICAgICAgICAgICAvLyBzdGFuZGFyZCBHYW1lYm9hcmQtYmFzZWQgZXZlbnRcclxuICAgICAgICAgICAgaWYgKGFyZ3NbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJNdWx0aW1hcFwiKVxyXG4gICAgICAgICAgICAgICAgYXJnc1sxXSA9IEpTT04uc3RyaW5naWZ5KGFyZ3NbMV0pO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIC8vIHByZWZpeCBhcnJheSBjb250ZW50cyB3aXRoIHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBpdHMga2V5XHJcbiAgICBhcmdzLnVuc2hpZnQoK25ldyBEYXRlKTtcclxuICAgIHRoaXMuX3RyYW5zY3JpcHRzLnB1c2goYXJncyk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcblxyXG5cclxuLy8gVGFrZXMgYSA8dGQ+IERPTSBub2RlLCBhbmQgY29udmVydHMgaXQgdG8gYVxyXG4vLyBzdHJpbmcgZGVzY3JpcHRvciwgZS5nLiwgXCJ0ciNyb3cwIHRkLmNlbGwwLm1pbmVkLmNsb3NlZFwiLlxyXG5mdW5jdGlvbiBidWlsZERPTVN0cmluZygkZWwpIHtcclxuICAgIHZhciBub2RlID0gJGVsIGluc3RhbmNlb2YgalF1ZXJ5ID8gJGVsWzBdIDogJGVsLFxyXG4gICAgICAgIC8vIHNvcnRzIGNsYXNzIG5hbWVzLCBwdXR0aW5nIHRoZSBcImNlbGxYXCIgY2xhc3MgZmlyc3RcclxuICAgICAgICBTT1JUX0ZOX0NFTExfRklSU1QgPSBmdW5jdGlvbihhLCBiKSB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGluY2lwaXQoc3RyKSB7IHJldHVybiBzdHIuc3Vic3RyaW5nKDAsIFwiY2VsbFwiLmxlbmd0aCkudG9Mb3dlckNhc2UoKTsgfTtcclxuICAgICAgICAgICAgcmV0dXJuIChpbmNpcGl0KGEpID09PSBcImNlbGxcIiB8fCBpbmNpcGl0KGIpID09PSBcImNlbGxcIiB8fCBhID4gYikgPyAxIDogKGEgPCBiKSA/IC0xIDogMDtcclxuICAgICAgICB9O1xyXG4gICAgcmV0dXJuIG5vZGUucGFyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICArIFwiI1wiICsgbm9kZS5wYXJlbnROb2RlLmlkICsgXCIgXCJcclxuICAgICAgICArIG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpICsgXCIuXCJcclxuICAgICAgICArIG5vZGUuY2xhc3NOYW1lLnNwbGl0KCcgJylcclxuICAgICAgICAuc29ydChTT1JUX0ZOX0NFTExfRklSU1QpXHJcbiAgICAgICAgLmpvaW4oJy4nKTtcclxufVxyXG4iLCJ2YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxyXG5cclxuICAgIC8vIHZhbGlkYXRpb24gaGVscGVyIGZuc1xyXG4gICAgaXNOdW1lcmljID0gZnVuY3Rpb24odmFsKSB7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyh2YWwpLnJlcGxhY2UoLywvZywgJycpLCAodmFsLmxlbmd0aCAhPT0gMCAmJiAhaXNOYU4oK3ZhbCkgJiYgaXNGaW5pdGUoK3ZhbCkpO1xyXG4gICAgfSxcclxuXHJcbiAgICBWYWxpZGF0b3JzID0ge1xyXG4gICAgICAgIEJvYXJkRGltZW5zaW9uczoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24oZGltKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBudW1lcmljIGlucHV0XHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzTnVtZXJpYyhkaW0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgYm9hcmQgZGltZW5zaW9uLlwiLCBkaW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gTUFYX0RJTUVOU0lPTlMgY29uc3RhbnRcclxuICAgICAgICAgICAgICAgIGlmICghKGRpbSA8PSAkQy5NQVhfR1JJRF9ESU1FTlNJT05TKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIGdhbWUncyBtYXhpbXVtIGdyaWQgZGltZW5zaW9uc1wiLCArZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBlbHNlLi4uXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTWluZUNvdW50OiB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbihtaW5lcywgbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibWluZXM6ICVvLCBtYXhQb3NzaWJsZTogJW9cIiwgbWluZXMsIG1heFBvc3NpYmxlKVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMobWluZXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFZhbGlkYXRpb25FcnJvcihcIlVzZXIgZW50ZXJlZCB7MH0sIHdoaWNoIGlzIG5vdCBhIG51bWJlciwgYW5kIGFuIGludmFsaWQgbnVtYmVyIG9mIG1pbmVzLlwiLCBtaW5lcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gaXMgbm90IGdyZWF0ZXIgdGhhbiBtYXhQb3NzaWJsZSBmb3IgdGhpcyBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgICAgICAgICBpZiAobWluZXMgPiBtYXhQb3NzaWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBncmVhdGVyIHRoYW4gdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcyAoezF9KS5cIiwgK21pbmVzLCBtYXhQb3NzaWJsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRvcnM7XHJcblxyXG5cclxuLyogIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gICovXHJcbi8vIEVSUk9SUyBBTkQgRVhDRVBUSU9OU1xyXG5cclxuZnVuY3Rpb24gTXlzd2VlcGVyRXJyb3IoKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcclxuICAgICAgICBSR1hfUkVQTEFDRU1FTlRfVE9LRU5TID0gL1xceyhcXGQrKVxcfS9nLFxyXG4gICAgICAgIGV4dGVuZE1lc3NhZ2UgPSBmdW5jdGlvbihzdHIsIGFyZ3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChzdHIgfHwgJycpLnJlcGxhY2UoUkdYX1JFUExBQ0VNRU5UX1RPS0VOUywgZnVuY3Rpb24oXywgaW5kZXgpIHsgcmV0dXJuIGFyZ3NbK2luZGV4XSB8fCAnJzsgfSk7XHJcbiAgICAgICAgfTtcclxuICB0aGlzLm1lc3NhZ2UgPSBleHRlbmRNZXNzYWdlKGFyZ3NbMF0sIGFyZ3Muc2xpY2UoMSkpO1xyXG4gIHRoaXMubmFtZSA9ICdNeXN3ZWVwZXJFcnJvcic7XHJcbiAgRXJyb3IuY2FsbCh0aGlzLCB0aGlzLm1lc3NhZ2UpO1xyXG59XHJcbk15c3dlZXBlckVycm9yLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xyXG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNeXN3ZWVwZXJFcnJvcjtcclxuXHJcblxyXG5mdW5jdGlvbiBWYWxpZGF0aW9uRXJyb3IoKSB7XHJcbiAgTXlzd2VlcGVyRXJyb3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB0aGlzLm5hbWUgPSAnVmFsaWRhdGlvbkVycm9yJztcclxufVxyXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlID0gbmV3IE15c3dlZXBlckVycm9yKCk7XHJcblZhbGlkYXRpb25FcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBWYWxpZGF0aW9uRXJyb3I7IiwiLyohIGpRdWVyeSBwbHVnaW4gZm9yIEhhbW1lci5KUyAtIHYxLjAuMSAtIDIwMTQtMDItMDNcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogSGFtbWVyLkpTIC0gdjEuMC43ZGV2IC0gMjAxNC0wMi0xOFxyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgSm9yaWsgVGFuZ2VsZGVyIDxqLnRhbmdlbGRlckBnbWFpbC5jb20+O1xyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgKi9cclxuXHJcbihmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbi8qKlxyXG4gKiBIYW1tZXJcclxuICogdXNlIHRoaXMgdG8gY3JlYXRlIGluc3RhbmNlc1xyXG4gKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgb3B0aW9uc1xyXG4gKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbnZhciBIYW1tZXIgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgcmV0dXJuIG5ldyBIYW1tZXIuSW5zdGFuY2UoZWxlbWVudCwgb3B0aW9ucyB8fCB7fSk7XHJcbn07XHJcblxyXG4vLyBkZWZhdWx0IHNldHRpbmdzXHJcbkhhbW1lci5kZWZhdWx0cyA9IHtcclxuICAvLyBhZGQgc3R5bGVzIGFuZCBhdHRyaWJ1dGVzIHRvIHRoZSBlbGVtZW50IHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSBkb2luZ1xyXG4gIC8vIGl0cyBuYXRpdmUgYmVoYXZpb3IuIHRoaXMgZG9lc250IHByZXZlbnQgdGhlIHNjcm9sbGluZywgYnV0IGNhbmNlbHNcclxuICAvLyB0aGUgY29udGV4dG1lbnUsIHRhcCBoaWdobGlnaHRpbmcgZXRjXHJcbiAgLy8gc2V0IHRvIGZhbHNlIHRvIGRpc2FibGUgdGhpc1xyXG4gIHN0b3BfYnJvd3Nlcl9iZWhhdmlvcjoge1xyXG4gICAgLy8gdGhpcyBhbHNvIHRyaWdnZXJzIG9uc2VsZWN0c3RhcnQ9ZmFsc2UgZm9yIElFXHJcbiAgICB1c2VyU2VsZWN0ICAgICAgIDogJ25vbmUnLFxyXG4gICAgLy8gdGhpcyBtYWtlcyB0aGUgZWxlbWVudCBibG9ja2luZyBpbiBJRTEwID4sIHlvdSBjb3VsZCBleHBlcmltZW50IHdpdGggdGhlIHZhbHVlXHJcbiAgICAvLyBzZWUgZm9yIG1vcmUgb3B0aW9ucyB0aGlzIGlzc3VlOyBodHRwczovL2dpdGh1Yi5jb20vRWlnaHRNZWRpYS9oYW1tZXIuanMvaXNzdWVzLzI0MVxyXG4gICAgdG91Y2hBY3Rpb24gICAgICA6ICdub25lJyxcclxuICAgIHRvdWNoQ2FsbG91dCAgICAgOiAnbm9uZScsXHJcbiAgICBjb250ZW50Wm9vbWluZyAgIDogJ25vbmUnLFxyXG4gICAgdXNlckRyYWcgICAgICAgICA6ICdub25lJyxcclxuICAgIHRhcEhpZ2hsaWdodENvbG9yOiAncmdiYSgwLDAsMCwwKSdcclxuICB9XHJcblxyXG4gIC8vXHJcbiAgLy8gbW9yZSBzZXR0aW5ncyBhcmUgZGVmaW5lZCBwZXIgZ2VzdHVyZSBhdCBnZXN0dXJlcy5qc1xyXG4gIC8vXHJcbn07XHJcblxyXG4vLyBkZXRlY3QgdG91Y2hldmVudHNcclxuSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTID0gd2luZG93Lm5hdmlnYXRvci5wb2ludGVyRW5hYmxlZCB8fCB3aW5kb3cubmF2aWdhdG9yLm1zUG9pbnRlckVuYWJsZWQ7XHJcbkhhbW1lci5IQVNfVE9VQ0hFVkVOVFMgPSAoJ29udG91Y2hzdGFydCcgaW4gd2luZG93KTtcclxuXHJcbi8vIGRvbnQgdXNlIG1vdXNlZXZlbnRzIG9uIG1vYmlsZSBkZXZpY2VzXHJcbkhhbW1lci5NT0JJTEVfUkVHRVggPSAvbW9iaWxlfHRhYmxldHxpcChhZHxob25lfG9kKXxhbmRyb2lkfHNpbGsvaTtcclxuSGFtbWVyLk5PX01PVVNFRVZFTlRTID0gSGFtbWVyLkhBU19UT1VDSEVWRU5UUyAmJiB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaChIYW1tZXIuTU9CSUxFX1JFR0VYKTtcclxuXHJcbi8vIGV2ZW50dHlwZXMgcGVyIHRvdWNoZXZlbnQgKHN0YXJ0LCBtb3ZlLCBlbmQpXHJcbi8vIGFyZSBmaWxsZWQgYnkgSGFtbWVyLmV2ZW50LmRldGVybWluZUV2ZW50VHlwZXMgb24gc2V0dXBcclxuSGFtbWVyLkVWRU5UX1RZUEVTID0ge307XHJcblxyXG4vLyBkaXJlY3Rpb24gZGVmaW5lc1xyXG5IYW1tZXIuRElSRUNUSU9OX0RPV04gPSAnZG93bic7XHJcbkhhbW1lci5ESVJFQ1RJT05fTEVGVCA9ICdsZWZ0JztcclxuSGFtbWVyLkRJUkVDVElPTl9VUCA9ICd1cCc7XHJcbkhhbW1lci5ESVJFQ1RJT05fUklHSFQgPSAncmlnaHQnO1xyXG5cclxuLy8gcG9pbnRlciB0eXBlXHJcbkhhbW1lci5QT0lOVEVSX01PVVNFID0gJ21vdXNlJztcclxuSGFtbWVyLlBPSU5URVJfVE9VQ0ggPSAndG91Y2gnO1xyXG5IYW1tZXIuUE9JTlRFUl9QRU4gPSAncGVuJztcclxuXHJcbi8vIGludGVydmFsIGluIHdoaWNoIEhhbW1lciByZWNhbGN1bGF0ZXMgY3VycmVudCB2ZWxvY2l0eSBpbiBtc1xyXG5IYW1tZXIuVVBEQVRFX1ZFTE9DSVRZX0lOVEVSVkFMID0gMjA7XHJcblxyXG4vLyB0b3VjaCBldmVudCBkZWZpbmVzXHJcbkhhbW1lci5FVkVOVF9TVEFSVCA9ICdzdGFydCc7XHJcbkhhbW1lci5FVkVOVF9NT1ZFID0gJ21vdmUnO1xyXG5IYW1tZXIuRVZFTlRfRU5EID0gJ2VuZCc7XHJcblxyXG4vLyBoYW1tZXIgZG9jdW1lbnQgd2hlcmUgdGhlIGJhc2UgZXZlbnRzIGFyZSBhZGRlZCBhdFxyXG5IYW1tZXIuRE9DVU1FTlQgPSB3aW5kb3cuZG9jdW1lbnQ7XHJcblxyXG4vLyBwbHVnaW5zIGFuZCBnZXN0dXJlcyBuYW1lc3BhY2VzXHJcbkhhbW1lci5wbHVnaW5zID0gSGFtbWVyLnBsdWdpbnMgfHwge307XHJcbkhhbW1lci5nZXN0dXJlcyA9IEhhbW1lci5nZXN0dXJlcyB8fCB7fTtcclxuXHJcblxyXG4vLyBpZiB0aGUgd2luZG93IGV2ZW50cyBhcmUgc2V0Li4uXHJcbkhhbW1lci5SRUFEWSA9IGZhbHNlO1xyXG5cclxuLyoqXHJcbiAqIHNldHVwIGV2ZW50cyB0byBkZXRlY3QgZ2VzdHVyZXMgb24gdGhlIGRvY3VtZW50XHJcbiAqL1xyXG5mdW5jdGlvbiBzZXR1cCgpIHtcclxuICBpZihIYW1tZXIuUkVBRFkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIGZpbmQgd2hhdCBldmVudHR5cGVzIHdlIGFkZCBsaXN0ZW5lcnMgdG9cclxuICBIYW1tZXIuZXZlbnQuZGV0ZXJtaW5lRXZlbnRUeXBlcygpO1xyXG5cclxuICAvLyBSZWdpc3RlciBhbGwgZ2VzdHVyZXMgaW5zaWRlIEhhbW1lci5nZXN0dXJlc1xyXG4gIEhhbW1lci51dGlscy5lYWNoKEhhbW1lci5nZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSl7XHJcbiAgICBIYW1tZXIuZGV0ZWN0aW9uLnJlZ2lzdGVyKGdlc3R1cmUpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBBZGQgdG91Y2ggZXZlbnRzIG9uIHRoZSBkb2N1bWVudFxyXG4gIEhhbW1lci5ldmVudC5vblRvdWNoKEhhbW1lci5ET0NVTUVOVCwgSGFtbWVyLkVWRU5UX01PVkUsIEhhbW1lci5kZXRlY3Rpb24uZGV0ZWN0KTtcclxuICBIYW1tZXIuZXZlbnQub25Ub3VjaChIYW1tZXIuRE9DVU1FTlQsIEhhbW1lci5FVkVOVF9FTkQsIEhhbW1lci5kZXRlY3Rpb24uZGV0ZWN0KTtcclxuXHJcbiAgLy8gSGFtbWVyIGlzIHJlYWR5Li4uIVxyXG4gIEhhbW1lci5SRUFEWSA9IHRydWU7XHJcbn1cclxuXHJcbkhhbW1lci51dGlscyA9IHtcclxuICAvKipcclxuICAgKiBleHRlbmQgbWV0aG9kLFxyXG4gICAqIGFsc28gdXNlZCBmb3IgY2xvbmluZyB3aGVuIGRlc3QgaXMgYW4gZW1wdHkgb2JqZWN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZGVzdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIHNyY1xyXG4gICAqIEBwYXJtICB7Qm9vbGVhbn0gIG1lcmdlICAgIGRvIGEgbWVyZ2VcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICBkZXN0XHJcbiAgICovXHJcbiAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQoZGVzdCwgc3JjLCBtZXJnZSkge1xyXG4gICAgZm9yKHZhciBrZXkgaW4gc3JjKSB7XHJcbiAgICAgIGlmKGRlc3Rba2V5XSAhPT0gdW5kZWZpbmVkICYmIG1lcmdlKSB7XHJcbiAgICAgICAgY29udGludWU7XHJcbiAgICAgIH1cclxuICAgICAgZGVzdFtrZXldID0gc3JjW2tleV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVzdDtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZm9yIGVhY2hcclxuICAgKiBAcGFyYW0gb2JqXHJcbiAgICogQHBhcmFtIGl0ZXJhdG9yXHJcbiAgICovXHJcbiAgZWFjaDogZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xyXG4gICAgdmFyIGksIGxlbmd0aDtcclxuICAgIC8vIG5hdGl2ZSBmb3JFYWNoIG9uIGFycmF5c1xyXG4gICAgaWYgKCdmb3JFYWNoJyBpbiBvYmopIHtcclxuICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgLy8gYXJyYXlzXHJcbiAgICBlbHNlIGlmKG9iai5sZW5ndGggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBvYmplY3RzXHJcbiAgICBlbHNlIHtcclxuICAgICAgZm9yIChpIGluIG9iaikge1xyXG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkgJiYgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogZmluZCBpZiBhIG5vZGUgaXMgaW4gdGhlIGdpdmVuIHBhcmVudFxyXG4gICAqIHVzZWQgZm9yIGV2ZW50IGRlbGVnYXRpb24gdHJpY2tzXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIG5vZGVcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgcGFyZW50XHJcbiAgICogQHJldHVybnMge2Jvb2xlYW59ICAgICAgIGhhc19wYXJlbnRcclxuICAgKi9cclxuICBoYXNQYXJlbnQ6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xyXG4gICAgd2hpbGUobm9kZSkge1xyXG4gICAgICBpZihub2RlID09IHBhcmVudCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCB0aGUgY2VudGVyIG9mIGFsbCB0aGUgdG91Y2hlc1xyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHRvdWNoZXNcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICBjZW50ZXJcclxuICAgKi9cclxuICBnZXRDZW50ZXI6IGZ1bmN0aW9uIGdldENlbnRlcih0b3VjaGVzKSB7XHJcbiAgICB2YXIgdmFsdWVzWCA9IFtdLCB2YWx1ZXNZID0gW107XHJcblxyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godG91Y2hlcywgZnVuY3Rpb24odG91Y2gpIHtcclxuICAgICAgLy8gSSBwcmVmZXIgY2xpZW50WCBiZWNhdXNlIGl0IGlnbm9yZSB0aGUgc2Nyb2xsaW5nIHBvc2l0aW9uXHJcbiAgICAgIHZhbHVlc1gucHVzaCh0eXBlb2YgdG91Y2guY2xpZW50WCAhPT0gJ3VuZGVmaW5lZCcgPyB0b3VjaC5jbGllbnRYIDogdG91Y2gucGFnZVggKTtcclxuICAgICAgdmFsdWVzWS5wdXNoKHR5cGVvZiB0b3VjaC5jbGllbnRZICE9PSAndW5kZWZpbmVkJyA/IHRvdWNoLmNsaWVudFkgOiB0b3VjaC5wYWdlWSApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcGFnZVg6ICgoTWF0aC5taW4uYXBwbHkoTWF0aCwgdmFsdWVzWCkgKyBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXNYKSkgLyAyKSxcclxuICAgICAgcGFnZVk6ICgoTWF0aC5taW4uYXBwbHkoTWF0aCwgdmFsdWVzWSkgKyBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXNZKSkgLyAyKVxyXG4gICAgfTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSB2ZWxvY2l0eSBiZXR3ZWVuIHR3byBwb2ludHNcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV90aW1lXHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfeFxyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3lcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgICB2ZWxvY2l0eVxyXG4gICAqL1xyXG4gIGdldFZlbG9jaXR5OiBmdW5jdGlvbiBnZXRWZWxvY2l0eShkZWx0YV90aW1lLCBkZWx0YV94LCBkZWx0YV95KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiBNYXRoLmFicyhkZWx0YV94IC8gZGVsdGFfdGltZSkgfHwgMCxcclxuICAgICAgeTogTWF0aC5hYnMoZGVsdGFfeSAvIGRlbHRhX3RpbWUpIHx8IDBcclxuICAgIH07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgYW5nbGUgYmV0d2VlbiB0d28gY29vcmRpbmF0ZXNcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBhbmdsZVxyXG4gICAqL1xyXG4gIGdldEFuZ2xlOiBmdW5jdGlvbiBnZXRBbmdsZSh0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHkgPSB0b3VjaDIucGFnZVkgLSB0b3VjaDEucGFnZVksXHJcbiAgICAgIHggPSB0b3VjaDIucGFnZVggLSB0b3VjaDEucGFnZVg7XHJcbiAgICByZXR1cm4gTWF0aC5hdGFuMih5LCB4KSAqIDE4MCAvIE1hdGguUEk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGFuZ2xlIHRvIGRpcmVjdGlvbiBkZWZpbmVcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSAgICBkaXJlY3Rpb24gY29uc3RhbnQsIGxpa2UgSGFtbWVyLkRJUkVDVElPTl9MRUZUXHJcbiAgICovXHJcbiAgZ2V0RGlyZWN0aW9uOiBmdW5jdGlvbiBnZXREaXJlY3Rpb24odG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB4ID0gTWF0aC5hYnModG91Y2gxLnBhZ2VYIC0gdG91Y2gyLnBhZ2VYKSxcclxuICAgICAgeSA9IE1hdGguYWJzKHRvdWNoMS5wYWdlWSAtIHRvdWNoMi5wYWdlWSk7XHJcblxyXG4gICAgaWYoeCA+PSB5KSB7XHJcbiAgICAgIHJldHVybiB0b3VjaDEucGFnZVggLSB0b3VjaDIucGFnZVggPiAwID8gSGFtbWVyLkRJUkVDVElPTl9MRUZUIDogSGFtbWVyLkRJUkVDVElPTl9SSUdIVDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICByZXR1cm4gdG91Y2gxLnBhZ2VZIC0gdG91Y2gyLnBhZ2VZID4gMCA/IEhhbW1lci5ESVJFQ1RJT05fVVAgOiBIYW1tZXIuRElSRUNUSU9OX0RPV047XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0d28gdG91Y2hlc1xyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIGRpc3RhbmNlXHJcbiAgICovXHJcbiAgZ2V0RGlzdGFuY2U6IGZ1bmN0aW9uIGdldERpc3RhbmNlKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeCA9IHRvdWNoMi5wYWdlWCAtIHRvdWNoMS5wYWdlWCxcclxuICAgICAgeSA9IHRvdWNoMi5wYWdlWSAtIHRvdWNoMS5wYWdlWTtcclxuICAgIHJldHVybiBNYXRoLnNxcnQoKHggKiB4KSArICh5ICogeSkpO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHNjYWxlIGZhY3RvciBiZXR3ZWVuIHR3byB0b3VjaExpc3RzIChmaW5nZXJzKVxyXG4gICAqIG5vIHNjYWxlIGlzIDEsIGFuZCBnb2VzIGRvd24gdG8gMCB3aGVuIHBpbmNoZWQgdG9nZXRoZXIsIGFuZCBiaWdnZXIgd2hlbiBwaW5jaGVkIG91dFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHN0YXJ0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgZW5kXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgc2NhbGVcclxuICAgKi9cclxuICBnZXRTY2FsZTogZnVuY3Rpb24gZ2V0U2NhbGUoc3RhcnQsIGVuZCkge1xyXG4gICAgLy8gbmVlZCB0d28gZmluZ2Vycy4uLlxyXG4gICAgaWYoc3RhcnQubGVuZ3RoID49IDIgJiYgZW5kLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldERpc3RhbmNlKGVuZFswXSwgZW5kWzFdKSAvXHJcbiAgICAgICAgdGhpcy5nZXREaXN0YW5jZShzdGFydFswXSwgc3RhcnRbMV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDE7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgcm90YXRpb24gZGVncmVlcyBiZXR3ZWVuIHR3byB0b3VjaExpc3RzIChmaW5nZXJzKVxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIHN0YXJ0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgZW5kXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgcm90YXRpb25cclxuICAgKi9cclxuICBnZXRSb3RhdGlvbjogZnVuY3Rpb24gZ2V0Um90YXRpb24oc3RhcnQsIGVuZCkge1xyXG4gICAgLy8gbmVlZCB0d28gZmluZ2Vyc1xyXG4gICAgaWYoc3RhcnQubGVuZ3RoID49IDIgJiYgZW5kLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldEFuZ2xlKGVuZFsxXSwgZW5kWzBdKSAtXHJcbiAgICAgICAgdGhpcy5nZXRBbmdsZShzdGFydFsxXSwgc3RhcnRbMF0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGJvb2xlYW4gaWYgdGhlIGRpcmVjdGlvbiBpcyB2ZXJ0aWNhbFxyXG4gICAqIEBwYXJhbSAgICB7U3RyaW5nfSAgICBkaXJlY3Rpb25cclxuICAgKiBAcmV0dXJucyAge0Jvb2xlYW59ICAgaXNfdmVydGljYWxcclxuICAgKi9cclxuICBpc1ZlcnRpY2FsOiBmdW5jdGlvbiBpc1ZlcnRpY2FsKGRpcmVjdGlvbikge1xyXG4gICAgcmV0dXJuIChkaXJlY3Rpb24gPT0gSGFtbWVyLkRJUkVDVElPTl9VUCB8fCBkaXJlY3Rpb24gPT0gSGFtbWVyLkRJUkVDVElPTl9ET1dOKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc3RvcCBicm93c2VyIGRlZmF1bHQgYmVoYXZpb3Igd2l0aCBjc3MgcHJvcHNcclxuICAgKiBAcGFyYW0gICB7SHRtbEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBjc3NfcHJvcHNcclxuICAgKi9cclxuICBzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcjogZnVuY3Rpb24gc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3IoZWxlbWVudCwgY3NzX3Byb3BzKSB7XHJcbiAgICBpZighY3NzX3Byb3BzIHx8ICFlbGVtZW50IHx8ICFlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB3aXRoIGNzcyBwcm9wZXJ0aWVzIGZvciBtb2Rlcm4gYnJvd3NlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKFsnd2Via2l0JywgJ2todG1sJywgJ21veicsICdNb3onLCAnbXMnLCAnbycsICcnXSwgZnVuY3Rpb24odmVuZG9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGNzc19wcm9wcywgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcclxuICAgICAgICAgIC8vIHZlbmRlciBwcmVmaXggYXQgdGhlIHByb3BlcnR5XHJcbiAgICAgICAgICBpZih2ZW5kb3IpIHtcclxuICAgICAgICAgICAgcHJvcCA9IHZlbmRvciArIHByb3Auc3Vic3RyaW5nKDAsIDEpLnRvVXBwZXJDYXNlKCkgKyBwcm9wLnN1YnN0cmluZygxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIHNldCB0aGUgc3R5bGVcclxuICAgICAgICAgIGlmKHByb3AgaW4gZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlW3Byb3BdID0gdmFsdWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWxzbyB0aGUgZGlzYWJsZSBvbnNlbGVjdHN0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlclNlbGVjdCA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbnNlbGVjdHN0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGFuZCBkaXNhYmxlIG9uZHJhZ3N0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlckRyYWcgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25kcmFnc3RhcnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHJldmVydHMgYWxsIGNoYW5nZXMgbWFkZSBieSAnc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3InXHJcbiAgICogQHBhcmFtICAge0h0bWxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY3NzX3Byb3BzXHJcbiAgICovXHJcbiAgc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yOiBmdW5jdGlvbiBzdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3IoZWxlbWVudCwgY3NzX3Byb3BzKSB7XHJcbiAgICBpZighY3NzX3Byb3BzIHx8ICFlbGVtZW50IHx8ICFlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyB3aXRoIGNzcyBwcm9wZXJ0aWVzIGZvciBtb2Rlcm4gYnJvd3NlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKFsnd2Via2l0JywgJ2todG1sJywgJ21veicsICdNb3onLCAnbXMnLCAnbycsICcnXSwgZnVuY3Rpb24odmVuZG9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGNzc19wcm9wcywgZnVuY3Rpb24odmFsdWUsIHByb3ApIHtcclxuICAgICAgICAgIC8vIHZlbmRlciBwcmVmaXggYXQgdGhlIHByb3BlcnR5XHJcbiAgICAgICAgICBpZih2ZW5kb3IpIHtcclxuICAgICAgICAgICAgcHJvcCA9IHZlbmRvciArIHByb3Auc3Vic3RyaW5nKDAsIDEpLnRvVXBwZXJDYXNlKCkgKyBwcm9wLnN1YnN0cmluZygxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIHJlc2V0IHRoZSBzdHlsZVxyXG4gICAgICAgICAgaWYocHJvcCBpbiBlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGVbcHJvcF0gPSAnJztcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhbHNvIHRoZSBlbmFibGUgb25zZWxlY3RzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJTZWxlY3QgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25zZWxlY3RzdGFydCA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYW5kIGVuYWJsZSBvbmRyYWdzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJEcmFnID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uZHJhZ3N0YXJ0ID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIGNyZWF0ZSBuZXcgaGFtbWVyIGluc3RhbmNlXHJcbiAqIGFsbCBtZXRob2RzIHNob3VsZCByZXR1cm4gdGhlIGluc3RhbmNlIGl0c2VsZiwgc28gaXQgaXMgY2hhaW5hYmxlLlxyXG4gKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgICAgIGVsZW1lbnRcclxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgICAgICBbb3B0aW9ucz17fV1cclxuICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5IYW1tZXIuSW5zdGFuY2UgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyBzZXR1cCBIYW1tZXJKUyB3aW5kb3cgZXZlbnRzIGFuZCByZWdpc3RlciBhbGwgZ2VzdHVyZXNcclxuICAvLyB0aGlzIGFsc28gc2V0cyB1cCB0aGUgZGVmYXVsdCBvcHRpb25zXHJcbiAgc2V0dXAoKTtcclxuXHJcbiAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcclxuXHJcbiAgLy8gc3RhcnQvc3RvcCBkZXRlY3Rpb24gb3B0aW9uXHJcbiAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcclxuXHJcbiAgLy8gbWVyZ2Ugb3B0aW9uc1xyXG4gIHRoaXMub3B0aW9ucyA9IEhhbW1lci51dGlscy5leHRlbmQoXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCBIYW1tZXIuZGVmYXVsdHMpLFxyXG4gICAgb3B0aW9ucyB8fCB7fSk7XHJcblxyXG4gIC8vIGFkZCBzb21lIGNzcyB0byB0aGUgZWxlbWVudCB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gZG9pbmcgaXRzIG5hdGl2ZSBiZWhhdm9pclxyXG4gIGlmKHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpIHtcclxuICAgIEhhbW1lci51dGlscy5zdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpO1xyXG4gIH1cclxuXHJcbiAgLy8gc3RhcnQgZGV0ZWN0aW9uIG9uIHRvdWNoc3RhcnRcclxuICB0aGlzLl9ldmVudFN0YXJ0SGFuZGxlciA9IEhhbW1lci5ldmVudC5vblRvdWNoKGVsZW1lbnQsIEhhbW1lci5FVkVOVF9TVEFSVCwgZnVuY3Rpb24oZXYpIHtcclxuICAgIGlmKHNlbGYuZW5hYmxlZCkge1xyXG4gICAgICBIYW1tZXIuZGV0ZWN0aW9uLnN0YXJ0RGV0ZWN0KHNlbGYsIGV2KTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgLy8ga2VlcCBhIGxpc3Qgb2YgdXNlciBldmVudCBoYW5kbGVycyB3aGljaCBuZWVkcyB0byBiZSByZW1vdmVkIHdoZW4gY2FsbGluZyAnZGlzcG9zZSdcclxuICB0aGlzLl9ldmVudEhhbmRsZXIgPSBbXTtcclxuXHJcbiAgLy8gcmV0dXJuIGluc3RhbmNlXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZSA9IHtcclxuICAvKipcclxuICAgKiBiaW5kIGV2ZW50cyB0byB0aGUgaW5zdGFuY2VcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgIGhhbmRsZXJcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIG9uOiBmdW5jdGlvbiBvbkV2ZW50KGdlc3R1cmUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBnZXN0dXJlcyA9IGdlc3R1cmUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKGdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGdlc3R1cmUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgICAgdGhpcy5fZXZlbnRIYW5kbGVyLnB1c2goeyBnZXN0dXJlOiBnZXN0dXJlLCBoYW5kbGVyOiBoYW5kbGVyIH0pO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdW5iaW5kIGV2ZW50cyB0byB0aGUgaW5zdGFuY2VcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgIGhhbmRsZXJcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIG9mZjogZnVuY3Rpb24gb2ZmRXZlbnQoZ2VzdHVyZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIGdlc3R1cmVzID0gZ2VzdHVyZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZ2VzdHVyZSwgaGFuZGxlciwgZmFsc2UpO1xyXG5cclxuICAgICAgLy8gcmVtb3ZlIHRoZSBldmVudCBoYW5kbGVyIGZyb20gdGhlIGludGVybmFsIGxpc3RcclxuICAgICAgdmFyIGluZGV4ID0gLTE7XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuX2V2ZW50SGFuZGxlciwgZnVuY3Rpb24oZXZlbnRIYW5kbGVyLCBpKSB7XHJcbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSAmJiBldmVudEhhbmRsZXIuZ2VzdHVyZSA9PT0gZ2VzdHVyZSAmJiBldmVudEhhbmRsZXIuaGFuZGxlciA9PT0gaGFuZGxlcikge1xyXG4gICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwgdGhpcyk7XHJcblxyXG4gICAgICBpZiAoaW5kZXggPiAtMSkge1xyXG4gICAgICAgIHRoaXMuX2V2ZW50SGFuZGxlci5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB0cmlnZ2VyIGdlc3R1cmUgZXZlbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgIFtldmVudERhdGFdXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICB0cmlnZ2VyOiBmdW5jdGlvbiB0cmlnZ2VyRXZlbnQoZ2VzdHVyZSwgZXZlbnREYXRhKSB7XHJcbiAgICAvLyBvcHRpb25hbFxyXG4gICAgaWYoIWV2ZW50RGF0YSkge1xyXG4gICAgICBldmVudERhdGEgPSB7fTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBjcmVhdGUgRE9NIGV2ZW50XHJcbiAgICB2YXIgZXZlbnQgPSBIYW1tZXIuRE9DVU1FTlQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XHJcbiAgICBldmVudC5pbml0RXZlbnQoZ2VzdHVyZSwgdHJ1ZSwgdHJ1ZSk7XHJcbiAgICBldmVudC5nZXN0dXJlID0gZXZlbnREYXRhO1xyXG5cclxuICAgIC8vIHRyaWdnZXIgb24gdGhlIHRhcmdldCBpZiBpdCBpcyBpbiB0aGUgaW5zdGFuY2UgZWxlbWVudCxcclxuICAgIC8vIHRoaXMgaXMgZm9yIGV2ZW50IGRlbGVnYXRpb24gdHJpY2tzXHJcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuZWxlbWVudDtcclxuICAgIGlmKEhhbW1lci51dGlscy5oYXNQYXJlbnQoZXZlbnREYXRhLnRhcmdldCwgZWxlbWVudCkpIHtcclxuICAgICAgZWxlbWVudCA9IGV2ZW50RGF0YS50YXJnZXQ7XHJcbiAgICB9XHJcblxyXG4gICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBlbmFibGUgb2YgZGlzYWJsZSBoYW1tZXIuanMgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge0Jvb2xlYW59ICAgc3RhdGVcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIGVuYWJsZTogZnVuY3Rpb24gZW5hYmxlKHN0YXRlKSB7XHJcbiAgICB0aGlzLmVuYWJsZWQgPSBzdGF0ZTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBkaXNwb3NlIHRoaXMgaGFtbWVyIGluc3RhbmNlXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBkaXNwb3NlOiBmdW5jdGlvbiBkaXNwb3NlKCkge1xyXG5cclxuICAgIC8vIHVuZG8gYWxsIGNoYW5nZXMgbWFkZSBieSBzdG9wX2Jyb3dzZXJfYmVoYXZpb3JcclxuICAgIGlmKHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLnN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucy5zdG9wX2Jyb3dzZXJfYmVoYXZpb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHVuYmluZCBhbGwgY3VzdG9tIGV2ZW50IGhhbmRsZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLl9ldmVudEhhbmRsZXIsIGZ1bmN0aW9uKGV2ZW50SGFuZGxlcikge1xyXG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudEhhbmRsZXIuZ2VzdHVyZSwgZXZlbnRIYW5kbGVyLmhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0sIHRoaXMpO1xyXG4gICAgdGhpcy5fZXZlbnRIYW5kbGVyLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgLy8gdW5iaW5kIHRoZSBzdGFydCBldmVudCBsaXN0ZW5lclxyXG4gICAgSGFtbWVyLmV2ZW50LnVuYmluZERvbSh0aGlzLmVsZW1lbnQsIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfU1RBUlRdLCB0aGlzLl9ldmVudFN0YXJ0SGFuZGxlcik7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIHRoaXMgaG9sZHMgdGhlIGxhc3QgbW92ZSBldmVudCxcclxuICogdXNlZCB0byBmaXggZW1wdHkgdG91Y2hlbmQgaXNzdWVcclxuICogc2VlIHRoZSBvblRvdWNoIGV2ZW50IGZvciBhbiBleHBsYW5hdGlvblxyXG4gKiBAdHlwZSB7T2JqZWN0fVxyXG4gKi9cclxudmFyIGxhc3RfbW92ZV9ldmVudCA9IG51bGw7XHJcblxyXG5cclxuLyoqXHJcbiAqIHdoZW4gdGhlIG1vdXNlIGlzIGhvbGQgZG93biwgdGhpcyBpcyB0cnVlXHJcbiAqIEB0eXBlIHtCb29sZWFufVxyXG4gKi9cclxudmFyIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuXHJcblxyXG4vKipcclxuICogd2hlbiB0b3VjaCBldmVudHMgaGF2ZSBiZWVuIGZpcmVkLCB0aGlzIGlzIHRydWVcclxuICogQHR5cGUge0Jvb2xlYW59XHJcbiAqL1xyXG52YXIgdG91Y2hfdHJpZ2dlcmVkID0gZmFsc2U7XHJcblxyXG5cclxuSGFtbWVyLmV2ZW50ID0ge1xyXG4gIC8qKlxyXG4gICAqIHNpbXBsZSBhZGRFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgdHlwZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgYmluZERvbTogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHR5cGVzID0gdHlwZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godHlwZXMsIGZ1bmN0aW9uKHR5cGUpe1xyXG4gICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHNpbXBsZSByZW1vdmVFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgdHlwZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgdW5iaW5kRG9tOiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgdHlwZXMgPSB0eXBlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSl7XHJcbiAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdG91Y2ggZXZlbnRzIHdpdGggbW91c2UgZmFsbGJhY2tcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGUgICAgICAgIGxpa2UgSGFtbWVyLkVWRU5UX01PVkVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIG9uVG91Y2g6IGZ1bmN0aW9uIG9uVG91Y2goZWxlbWVudCwgZXZlbnRUeXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gICAgdmFyIGZuID0gZnVuY3Rpb24gYmluZERvbU9uVG91Y2goZXYpIHtcclxuICAgICAgdmFyIHNvdXJjZUV2ZW50VHlwZSA9IGV2LnR5cGUudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgIC8vIG9ubW91c2V1cCwgYnV0IHdoZW4gdG91Y2hlbmQgaGFzIGJlZW4gZmlyZWQgd2UgZG8gbm90aGluZy5cclxuICAgICAgLy8gdGhpcyBpcyBmb3IgdG91Y2hkZXZpY2VzIHdoaWNoIGFsc28gZmlyZSBhIG1vdXNldXAgb24gdG91Y2hlbmRcclxuICAgICAgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmIHRvdWNoX3RyaWdnZXJlZCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gbW91c2VidXR0b24gbXVzdCBiZSBkb3duIG9yIGEgdG91Y2ggZXZlbnRcclxuICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNoLykgfHwgICAvLyB0b3VjaCBldmVudHMgYXJlIGFsd2F5cyBvbiBzY3JlZW5cclxuICAgICAgICBzb3VyY2VFdmVudFR5cGUubWF0Y2goL3BvaW50ZXJkb3duLykgfHwgLy8gcG9pbnRlcmV2ZW50cyB0b3VjaFxyXG4gICAgICAgIChzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgZXYud2hpY2ggPT09IDEpICAgLy8gbW91c2UgaXMgcHJlc3NlZFxyXG4gICAgICAgICkge1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBtb3VzZSBpc24ndCBwcmVzc2VkXHJcbiAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmICFldi53aGljaCkge1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIC8vIHdlIGFyZSBpbiBhIHRvdWNoIGV2ZW50LCBzZXQgdGhlIHRvdWNoIHRyaWdnZXJlZCBib29sIHRvIHRydWUsXHJcbiAgICAgIC8vIHRoaXMgZm9yIHRoZSBjb25mbGljdHMgdGhhdCBtYXkgb2NjdXIgb24gaW9zIGFuZCBhbmRyb2lkXHJcbiAgICAgIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2h8cG9pbnRlci8pKSB7XHJcbiAgICAgICAgdG91Y2hfdHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY291bnQgdGhlIHRvdGFsIHRvdWNoZXMgb24gdGhlIHNjcmVlblxyXG4gICAgICB2YXIgY291bnRfdG91Y2hlcyA9IDA7XHJcblxyXG4gICAgICAvLyB3aGVuIHRvdWNoIGhhcyBiZWVuIHRyaWdnZXJlZCBpbiB0aGlzIGRldGVjdGlvbiBzZXNzaW9uXHJcbiAgICAgIC8vIGFuZCB3ZSBhcmUgbm93IGhhbmRsaW5nIGEgbW91c2UgZXZlbnQsIHdlIHN0b3AgdGhhdCB0byBwcmV2ZW50IGNvbmZsaWN0c1xyXG4gICAgICBpZihlbmFibGVfZGV0ZWN0KSB7XHJcbiAgICAgICAgLy8gdXBkYXRlIHBvaW50ZXJldmVudFxyXG4gICAgICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyAmJiBldmVudFR5cGUgIT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQudXBkYXRlUG9pbnRlcihldmVudFR5cGUsIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdG91Y2hcclxuICAgICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2gvKSkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IGV2LnRvdWNoZXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBtb3VzZVxyXG4gICAgICAgIGVsc2UgaWYoIXRvdWNoX3RyaWdnZXJlZCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdXAvKSA/IDAgOiAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWYgd2UgYXJlIGluIGEgZW5kIGV2ZW50LCBidXQgd2hlbiB3ZSByZW1vdmUgb25lIHRvdWNoIGFuZFxyXG4gICAgICAgIC8vIHdlIHN0aWxsIGhhdmUgZW5vdWdoLCBzZXQgZXZlbnRUeXBlIHRvIG1vdmVcclxuICAgICAgICBpZihjb3VudF90b3VjaGVzID4gMCAmJiBldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgZXZlbnRUeXBlID0gSGFtbWVyLkVWRU5UX01PVkU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG5vIHRvdWNoZXMsIGZvcmNlIHRoZSBlbmQgZXZlbnRcclxuICAgICAgICBlbHNlIGlmKCFjb3VudF90b3VjaGVzKSB7XHJcbiAgICAgICAgICBldmVudFR5cGUgPSBIYW1tZXIuRVZFTlRfRU5EO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc3RvcmUgdGhlIGxhc3QgbW92ZSBldmVudFxyXG4gICAgICAgIGlmKGNvdW50X3RvdWNoZXMgfHwgbGFzdF9tb3ZlX2V2ZW50ID09PSBudWxsKSB7XHJcbiAgICAgICAgICBsYXN0X21vdmVfZXZlbnQgPSBldjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgdGhlIGhhbmRsZXJcclxuICAgICAgICBoYW5kbGVyLmNhbGwoSGFtbWVyLmRldGVjdGlvbiwgc2VsZi5jb2xsZWN0RXZlbnREYXRhKGVsZW1lbnQsIGV2ZW50VHlwZSwgc2VsZi5nZXRUb3VjaExpc3QobGFzdF9tb3ZlX2V2ZW50LCBldmVudFR5cGUpLCBldikpO1xyXG5cclxuICAgICAgICAvLyByZW1vdmUgcG9pbnRlcmV2ZW50IGZyb20gbGlzdFxyXG4gICAgICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyAmJiBldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAgICAgY291bnRfdG91Y2hlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQudXBkYXRlUG9pbnRlcihldmVudFR5cGUsIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG9uIHRoZSBlbmQgd2UgcmVzZXQgZXZlcnl0aGluZ1xyXG4gICAgICBpZighY291bnRfdG91Y2hlcykge1xyXG4gICAgICAgIGxhc3RfbW92ZV9ldmVudCA9IG51bGw7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG4gICAgICAgIHRvdWNoX3RyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIEhhbW1lci5Qb2ludGVyRXZlbnQucmVzZXQoKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmJpbmREb20oZWxlbWVudCwgSGFtbWVyLkVWRU5UX1RZUEVTW2V2ZW50VHlwZV0sIGZuKTtcclxuXHJcbiAgICAvLyByZXR1cm4gdGhlIGJvdW5kIGZ1bmN0aW9uIHRvIGJlIGFibGUgdG8gdW5iaW5kIGl0IGxhdGVyXHJcbiAgICByZXR1cm4gZm47XHJcbiAgICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogd2UgaGF2ZSBkaWZmZXJlbnQgZXZlbnRzIGZvciBlYWNoIGRldmljZS9icm93c2VyXHJcbiAgICogZGV0ZXJtaW5lIHdoYXQgd2UgbmVlZCBhbmQgc2V0IHRoZW0gaW4gdGhlIEhhbW1lci5FVkVOVF9UWVBFUyBjb25zdGFudFxyXG4gICAqL1xyXG4gIGRldGVybWluZUV2ZW50VHlwZXM6IGZ1bmN0aW9uIGRldGVybWluZUV2ZW50VHlwZXMoKSB7XHJcbiAgICAvLyBkZXRlcm1pbmUgdGhlIGV2ZW50dHlwZSB3ZSB3YW50IHRvIHNldFxyXG4gICAgdmFyIHR5cGVzO1xyXG5cclxuICAgIC8vIHBvaW50ZXJFdmVudHMgbWFnaWNcclxuICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUykge1xyXG4gICAgICB0eXBlcyA9IEhhbW1lci5Qb2ludGVyRXZlbnQuZ2V0RXZlbnRzKCk7XHJcbiAgICB9XHJcbiAgICAvLyBvbiBBbmRyb2lkLCBpT1MsIGJsYWNrYmVycnksIHdpbmRvd3MgbW9iaWxlIHdlIGRvbnQgd2FudCBhbnkgbW91c2VldmVudHNcclxuICAgIGVsc2UgaWYoSGFtbWVyLk5PX01PVVNFRVZFTlRTKSB7XHJcbiAgICAgIHR5cGVzID0gW1xyXG4gICAgICAgICd0b3VjaHN0YXJ0JyxcclxuICAgICAgICAndG91Y2htb3ZlJyxcclxuICAgICAgICAndG91Y2hlbmQgdG91Y2hjYW5jZWwnXTtcclxuICAgIH1cclxuICAgIC8vIGZvciBub24gcG9pbnRlciBldmVudHMgYnJvd3NlcnMgYW5kIG1peGVkIGJyb3dzZXJzLFxyXG4gICAgLy8gbGlrZSBjaHJvbWUgb24gd2luZG93czggdG91Y2ggbGFwdG9wXHJcbiAgICBlbHNlIHtcclxuICAgICAgdHlwZXMgPSBbXHJcbiAgICAgICAgJ3RvdWNoc3RhcnQgbW91c2Vkb3duJyxcclxuICAgICAgICAndG91Y2htb3ZlIG1vdXNlbW92ZScsXHJcbiAgICAgICAgJ3RvdWNoZW5kIHRvdWNoY2FuY2VsIG1vdXNldXAnXTtcclxuICAgIH1cclxuXHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX1NUQVJUXSA9IHR5cGVzWzBdO1xyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9NT1ZFXSA9IHR5cGVzWzFdO1xyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9FTkRdID0gdHlwZXNbMl07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNyZWF0ZSB0b3VjaGxpc3QgZGVwZW5kaW5nIG9uIHRoZSBldmVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgZXZlbnRUeXBlICAgdXNlZCBieSB0aGUgZmFrZW11bHRpdG91Y2ggcGx1Z2luXHJcbiAgICovXHJcbiAgZ2V0VG91Y2hMaXN0OiBmdW5jdGlvbiBnZXRUb3VjaExpc3QoZXYvKiwgZXZlbnRUeXBlKi8pIHtcclxuICAgIC8vIGdldCB0aGUgZmFrZSBwb2ludGVyRXZlbnQgdG91Y2hsaXN0XHJcbiAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMpIHtcclxuICAgICAgcmV0dXJuIEhhbW1lci5Qb2ludGVyRXZlbnQuZ2V0VG91Y2hMaXN0KCk7XHJcbiAgICB9XHJcbiAgICAvLyBnZXQgdGhlIHRvdWNobGlzdFxyXG4gICAgZWxzZSBpZihldi50b3VjaGVzKSB7XHJcbiAgICAgIHJldHVybiBldi50b3VjaGVzO1xyXG4gICAgfVxyXG4gICAgLy8gbWFrZSBmYWtlIHRvdWNobGlzdCBmcm9tIG1vdXNlIHBvc2l0aW9uXHJcbiAgICBlbHNlIHtcclxuICAgICAgZXYuaWRlbnRpZmllciA9IDE7XHJcbiAgICAgIHJldHVybiBbZXZdO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjb2xsZWN0IGV2ZW50IGRhdGEgZm9yIEhhbW1lciBqc1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZSAgICAgICAgbGlrZSBIYW1tZXIuRVZFTlRfTU9WRVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBldmVudERhdGFcclxuICAgKi9cclxuICBjb2xsZWN0RXZlbnREYXRhOiBmdW5jdGlvbiBjb2xsZWN0RXZlbnREYXRhKGVsZW1lbnQsIGV2ZW50VHlwZSwgdG91Y2hlcywgZXYpIHtcclxuICAgIC8vIGZpbmQgb3V0IHBvaW50ZXJUeXBlXHJcbiAgICB2YXIgcG9pbnRlclR5cGUgPSBIYW1tZXIuUE9JTlRFUl9UT1VDSDtcclxuICAgIGlmKGV2LnR5cGUubWF0Y2goL21vdXNlLykgfHwgSGFtbWVyLlBvaW50ZXJFdmVudC5tYXRjaFR5cGUoSGFtbWVyLlBPSU5URVJfTU9VU0UsIGV2KSkge1xyXG4gICAgICBwb2ludGVyVHlwZSA9IEhhbW1lci5QT0lOVEVSX01PVVNFO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNlbnRlciAgICAgOiBIYW1tZXIudXRpbHMuZ2V0Q2VudGVyKHRvdWNoZXMpLFxyXG4gICAgICB0aW1lU3RhbXAgIDogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcbiAgICAgIHRhcmdldCAgICAgOiBldi50YXJnZXQsXHJcbiAgICAgIHRvdWNoZXMgICAgOiB0b3VjaGVzLFxyXG4gICAgICBldmVudFR5cGUgIDogZXZlbnRUeXBlLFxyXG4gICAgICBwb2ludGVyVHlwZTogcG9pbnRlclR5cGUsXHJcbiAgICAgIHNyY0V2ZW50ICAgOiBldixcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBwcmV2ZW50IHRoZSBicm93c2VyIGRlZmF1bHQgYWN0aW9uc1xyXG4gICAgICAgKiBtb3N0bHkgdXNlZCB0byBkaXNhYmxlIHNjcm9sbGluZyBvZiB0aGUgYnJvd3NlclxyXG4gICAgICAgKi9cclxuICAgICAgcHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGlmKHRoaXMuc3JjRXZlbnQucHJldmVudE1hbmlwdWxhdGlvbikge1xyXG4gICAgICAgICAgdGhpcy5zcmNFdmVudC5wcmV2ZW50TWFuaXB1bGF0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLnNyY0V2ZW50LnByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgICB0aGlzLnNyY0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHN0b3AgYnViYmxpbmcgdGhlIGV2ZW50IHVwIHRvIGl0cyBwYXJlbnRzXHJcbiAgICAgICAqL1xyXG4gICAgICBzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuc3JjRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogaW1tZWRpYXRlbHkgc3RvcCBnZXN0dXJlIGRldGVjdGlvblxyXG4gICAgICAgKiBtaWdodCBiZSB1c2VmdWwgYWZ0ZXIgYSBzd2lwZSB3YXMgZGV0ZWN0ZWRcclxuICAgICAgICogQHJldHVybiB7Kn1cclxuICAgICAgICovXHJcbiAgICAgIHN0b3BEZXRlY3Q6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBIYW1tZXIuZGV0ZWN0aW9uLnN0b3BEZXRlY3QoKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG5IYW1tZXIuUG9pbnRlckV2ZW50ID0ge1xyXG4gIC8qKlxyXG4gICAqIGhvbGRzIGFsbCBwb2ludGVyc1xyXG4gICAqIEB0eXBlIHtPYmplY3R9XHJcbiAgICovXHJcbiAgcG9pbnRlcnM6IHt9LFxyXG5cclxuICAvKipcclxuICAgKiBnZXQgYSBsaXN0IG9mIHBvaW50ZXJzXHJcbiAgICogQHJldHVybnMge0FycmF5fSAgICAgdG91Y2hsaXN0XHJcbiAgICovXHJcbiAgZ2V0VG91Y2hMaXN0OiBmdW5jdGlvbigpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciB0b3VjaGxpc3QgPSBbXTtcclxuXHJcbiAgICAvLyB3ZSBjYW4gdXNlIGZvckVhY2ggc2luY2UgcG9pbnRlckV2ZW50cyBvbmx5IGlzIGluIElFMTBcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHNlbGYucG9pbnRlcnMsIGZ1bmN0aW9uKHBvaW50ZXIpe1xyXG4gICAgICB0b3VjaGxpc3QucHVzaChwb2ludGVyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0b3VjaGxpc3Q7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogdXBkYXRlIHRoZSBwb3NpdGlvbiBvZiBhIHBvaW50ZXJcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgIHR5cGUgICAgICAgICAgICAgSGFtbWVyLkVWRU5UX0VORFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgcG9pbnRlckV2ZW50XHJcbiAgICovXHJcbiAgdXBkYXRlUG9pbnRlcjogZnVuY3Rpb24odHlwZSwgcG9pbnRlckV2ZW50KSB7XHJcbiAgICBpZih0eXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgZGVsZXRlIHRoaXMucG9pbnRlcnNbcG9pbnRlckV2ZW50LnBvaW50ZXJJZF07XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcG9pbnRlckV2ZW50LmlkZW50aWZpZXIgPSBwb2ludGVyRXZlbnQucG9pbnRlcklkO1xyXG4gICAgICB0aGlzLnBvaW50ZXJzW3BvaW50ZXJFdmVudC5wb2ludGVySWRdID0gcG9pbnRlckV2ZW50O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnBvaW50ZXJzKS5sZW5ndGg7XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogY2hlY2sgaWYgZXYgbWF0Y2hlcyBwb2ludGVydHlwZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBwb2ludGVyVHlwZSAgICAgSGFtbWVyLlBPSU5URVJfTU9VU0VcclxuICAgKiBAcGFyYW0gICB7UG9pbnRlckV2ZW50fSAgZXZcclxuICAgKi9cclxuICBtYXRjaFR5cGU6IGZ1bmN0aW9uKHBvaW50ZXJUeXBlLCBldikge1xyXG4gICAgaWYoIWV2LnBvaW50ZXJUeXBlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHQgPSBldi5wb2ludGVyVHlwZSxcclxuICAgICAgdHlwZXMgPSB7fTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX01PVVNFXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfTU9VU0UgfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX01PVVNFKTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX1RPVUNIXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfVE9VQ0ggfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX1RPVUNIKTtcclxuICAgIHR5cGVzW0hhbW1lci5QT0lOVEVSX1BFTl0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX1BFTiB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfUEVOKTtcclxuICAgIHJldHVybiB0eXBlc1twb2ludGVyVHlwZV07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCBldmVudHNcclxuICAgKi9cclxuICBnZXRFdmVudHM6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgJ3BvaW50ZXJkb3duIE1TUG9pbnRlckRvd24nLFxyXG4gICAgICAncG9pbnRlcm1vdmUgTVNQb2ludGVyTW92ZScsXHJcbiAgICAgICdwb2ludGVydXAgcG9pbnRlcmNhbmNlbCBNU1BvaW50ZXJVcCBNU1BvaW50ZXJDYW5jZWwnXHJcbiAgICBdO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIHJlc2V0IHRoZSBsaXN0XHJcbiAgICovXHJcbiAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgdGhpcy5wb2ludGVycyA9IHt9O1xyXG4gIH1cclxufTtcclxuXHJcblxyXG5IYW1tZXIuZGV0ZWN0aW9uID0ge1xyXG4gIC8vIGNvbnRhaW5zIGFsbCByZWdpc3RyZWQgSGFtbWVyLmdlc3R1cmVzIGluIHRoZSBjb3JyZWN0IG9yZGVyXHJcbiAgZ2VzdHVyZXM6IFtdLFxyXG5cclxuICAvLyBkYXRhIG9mIHRoZSBjdXJyZW50IEhhbW1lci5nZXN0dXJlIGRldGVjdGlvbiBzZXNzaW9uXHJcbiAgY3VycmVudCA6IG51bGwsXHJcblxyXG4gIC8vIHRoZSBwcmV2aW91cyBIYW1tZXIuZ2VzdHVyZSBzZXNzaW9uIGRhdGFcclxuICAvLyBpcyBhIGZ1bGwgY2xvbmUgb2YgdGhlIHByZXZpb3VzIGdlc3R1cmUuY3VycmVudCBvYmplY3RcclxuICBwcmV2aW91czogbnVsbCxcclxuXHJcbiAgLy8gd2hlbiB0aGlzIGJlY29tZXMgdHJ1ZSwgbm8gZ2VzdHVyZXMgYXJlIGZpcmVkXHJcbiAgc3RvcHBlZCA6IGZhbHNlLFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc3RhcnQgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge0hhbW1lci5JbnN0YW5jZX0gICBpbnN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgICAgICBldmVudERhdGFcclxuICAgKi9cclxuICBzdGFydERldGVjdDogZnVuY3Rpb24gc3RhcnREZXRlY3QoaW5zdCwgZXZlbnREYXRhKSB7XHJcbiAgICAvLyBhbHJlYWR5IGJ1c3kgd2l0aCBhIEhhbW1lci5nZXN0dXJlIGRldGVjdGlvbiBvbiBhbiBlbGVtZW50XHJcbiAgICBpZih0aGlzLmN1cnJlbnQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RvcHBlZCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuY3VycmVudCA9IHtcclxuICAgICAgaW5zdCAgICAgIDogaW5zdCwgLy8gcmVmZXJlbmNlIHRvIEhhbW1lckluc3RhbmNlIHdlJ3JlIHdvcmtpbmcgZm9yXHJcbiAgICAgIHN0YXJ0RXZlbnQ6IEhhbW1lci51dGlscy5leHRlbmQoe30sIGV2ZW50RGF0YSksIC8vIHN0YXJ0IGV2ZW50RGF0YSBmb3IgZGlzdGFuY2VzLCB0aW1pbmcgZXRjXHJcbiAgICAgIGxhc3RFdmVudCA6IGZhbHNlLCAvLyBsYXN0IGV2ZW50RGF0YVxyXG4gICAgICBsYXN0VkV2ZW50OiBmYWxzZSwgLy8gbGFzdCBldmVudERhdGEgZm9yIHZlbG9jaXR5LlxyXG4gICAgICB2ZWxvY2l0eSAgOiBmYWxzZSwgLy8gY3VycmVudCB2ZWxvY2l0eVxyXG4gICAgICBuYW1lICAgICAgOiAnJyAvLyBjdXJyZW50IGdlc3R1cmUgd2UncmUgaW4vZGV0ZWN0ZWQsIGNhbiBiZSAndGFwJywgJ2hvbGQnIGV0Y1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLmRldGVjdChldmVudERhdGEpO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldmVudERhdGFcclxuICAgKi9cclxuICBkZXRlY3Q6IGZ1bmN0aW9uIGRldGVjdChldmVudERhdGEpIHtcclxuICAgIGlmKCF0aGlzLmN1cnJlbnQgfHwgdGhpcy5zdG9wcGVkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRlbmQgZXZlbnQgZGF0YSB3aXRoIGNhbGN1bGF0aW9ucyBhYm91dCBzY2FsZSwgZGlzdGFuY2UgZXRjXHJcbiAgICBldmVudERhdGEgPSB0aGlzLmV4dGVuZEV2ZW50RGF0YShldmVudERhdGEpO1xyXG5cclxuICAgIC8vIGluc3RhbmNlIG9wdGlvbnNcclxuICAgIHZhciBpbnN0X29wdGlvbnMgPSB0aGlzLmN1cnJlbnQuaW5zdC5vcHRpb25zO1xyXG5cclxuICAgIC8vIGNhbGwgSGFtbWVyLmdlc3R1cmUgaGFuZGxlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgLy8gb25seSB3aGVuIHRoZSBpbnN0YW5jZSBvcHRpb25zIGhhdmUgZW5hYmxlZCB0aGlzIGdlc3R1cmVcclxuICAgICAgaWYoIXRoaXMuc3RvcHBlZCAmJiBpbnN0X29wdGlvbnNbZ2VzdHVyZS5uYW1lXSAhPT0gZmFsc2UpIHtcclxuICAgICAgICAvLyBpZiBhIGhhbmRsZXIgcmV0dXJucyBmYWxzZSwgd2Ugc3RvcCB3aXRoIHRoZSBkZXRlY3Rpb25cclxuICAgICAgICBpZihnZXN0dXJlLmhhbmRsZXIuY2FsbChnZXN0dXJlLCBldmVudERhdGEsIHRoaXMuY3VycmVudC5pbnN0KSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHRoaXMuc3RvcERldGVjdCgpO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSwgdGhpcyk7XHJcblxyXG4gICAgLy8gc3RvcmUgYXMgcHJldmlvdXMgZXZlbnQgZXZlbnRcclxuICAgIGlmKHRoaXMuY3VycmVudCkge1xyXG4gICAgICB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ID0gZXZlbnREYXRhO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVuZGV2ZW50LCBidXQgbm90IHRoZSBsYXN0IHRvdWNoLCBzbyBkb250IHN0b3BcclxuICAgIGlmKGV2ZW50RGF0YS5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCAmJiAhZXZlbnREYXRhLnRvdWNoZXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICB0aGlzLnN0b3BEZXRlY3QoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXZlbnREYXRhO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjbGVhciB0aGUgSGFtbWVyLmdlc3R1cmUgdmFyc1xyXG4gICAqIHRoaXMgaXMgY2FsbGVkIG9uIGVuZERldGVjdCwgYnV0IGNhbiBhbHNvIGJlIHVzZWQgd2hlbiBhIGZpbmFsIEhhbW1lci5nZXN0dXJlIGhhcyBiZWVuIGRldGVjdGVkXHJcbiAgICogdG8gc3RvcCBvdGhlciBIYW1tZXIuZ2VzdHVyZXMgZnJvbSBiZWluZyBmaXJlZFxyXG4gICAqL1xyXG4gIHN0b3BEZXRlY3Q6IGZ1bmN0aW9uIHN0b3BEZXRlY3QoKSB7XHJcbiAgICAvLyBjbG9uZSBjdXJyZW50IGRhdGEgdG8gdGhlIHN0b3JlIGFzIHRoZSBwcmV2aW91cyBnZXN0dXJlXHJcbiAgICAvLyB1c2VkIGZvciB0aGUgZG91YmxlIHRhcCBnZXN0dXJlLCBzaW5jZSB0aGlzIGlzIGFuIG90aGVyIGdlc3R1cmUgZGV0ZWN0IHNlc3Npb25cclxuICAgIHRoaXMucHJldmlvdXMgPSBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCB0aGlzLmN1cnJlbnQpO1xyXG5cclxuICAgIC8vIHJlc2V0IHRoZSBjdXJyZW50XHJcbiAgICB0aGlzLmN1cnJlbnQgPSBudWxsO1xyXG5cclxuICAgIC8vIHN0b3BwZWQhXHJcbiAgICB0aGlzLnN0b3BwZWQgPSB0cnVlO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBleHRlbmQgZXZlbnREYXRhIGZvciBIYW1tZXIuZ2VzdHVyZXNcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgIGV2XHJcbiAgICogQHJldHVybnMge09iamVjdH0gICBldlxyXG4gICAqL1xyXG4gIGV4dGVuZEV2ZW50RGF0YTogZnVuY3Rpb24gZXh0ZW5kRXZlbnREYXRhKGV2KSB7XHJcbiAgICB2YXIgc3RhcnRFdiA9IHRoaXMuY3VycmVudC5zdGFydEV2ZW50LFxyXG4gICAgICAgIGxhc3RWRXYgPSB0aGlzLmN1cnJlbnQubGFzdFZFdmVudDtcclxuXHJcbiAgICAvLyBpZiB0aGUgdG91Y2hlcyBjaGFuZ2UsIHNldCB0aGUgbmV3IHRvdWNoZXMgb3ZlciB0aGUgc3RhcnRFdmVudCB0b3VjaGVzXHJcbiAgICAvLyB0aGlzIGJlY2F1c2UgdG91Y2hldmVudHMgZG9uJ3QgaGF2ZSBhbGwgdGhlIHRvdWNoZXMgb24gdG91Y2hzdGFydCwgb3IgdGhlXHJcbiAgICAvLyB1c2VyIG11c3QgcGxhY2UgaGlzIGZpbmdlcnMgYXQgdGhlIEVYQUNUIHNhbWUgdGltZSBvbiB0aGUgc2NyZWVuLCB3aGljaCBpcyBub3QgcmVhbGlzdGljXHJcbiAgICAvLyBidXQsIHNvbWV0aW1lcyBpdCBoYXBwZW5zIHRoYXQgYm90aCBmaW5nZXJzIGFyZSB0b3VjaGluZyBhdCB0aGUgRVhBQ1Qgc2FtZSB0aW1lXHJcbiAgICBpZihzdGFydEV2ICYmIChldi50b3VjaGVzLmxlbmd0aCAhPSBzdGFydEV2LnRvdWNoZXMubGVuZ3RoIHx8IGV2LnRvdWNoZXMgPT09IHN0YXJ0RXYudG91Y2hlcykpIHtcclxuICAgICAgLy8gZXh0ZW5kIDEgbGV2ZWwgZGVlcCB0byBnZXQgdGhlIHRvdWNobGlzdCB3aXRoIHRoZSB0b3VjaCBvYmplY3RzXHJcbiAgICAgIHN0YXJ0RXYudG91Y2hlcyA9IFtdO1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChldi50b3VjaGVzLCBmdW5jdGlvbih0b3VjaCkge1xyXG4gICAgICAgIHN0YXJ0RXYudG91Y2hlcy5wdXNoKEhhbW1lci51dGlscy5leHRlbmQoe30sIHRvdWNoKSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkZWx0YV90aW1lID0gZXYudGltZVN0YW1wIC0gc3RhcnRFdi50aW1lU3RhbXBcclxuICAgICAgLCBkZWx0YV94ID0gZXYuY2VudGVyLnBhZ2VYIC0gc3RhcnRFdi5jZW50ZXIucGFnZVhcclxuICAgICAgLCBkZWx0YV95ID0gZXYuY2VudGVyLnBhZ2VZIC0gc3RhcnRFdi5jZW50ZXIucGFnZVlcclxuICAgICAgLCBpbnRlcmltQW5nbGVcclxuICAgICAgLCBpbnRlcmltRGlyZWN0aW9uXHJcbiAgICAgICwgdmVsb2NpdHkgPSB0aGlzLmN1cnJlbnQudmVsb2NpdHk7XHJcblxyXG4gICAgaWYgKGxhc3RWRXYgIT09IGZhbHNlICYmIGV2LnRpbWVTdGFtcCAtIGxhc3RWRXYudGltZVN0YW1wID4gSGFtbWVyLlVQREFURV9WRUxPQ0lUWV9JTlRFUlZBTCkge1xyXG5cclxuICAgICAgICB2ZWxvY2l0eSA9ICBIYW1tZXIudXRpbHMuZ2V0VmVsb2NpdHkoZXYudGltZVN0YW1wIC0gbGFzdFZFdi50aW1lU3RhbXAsIGV2LmNlbnRlci5wYWdlWCAtIGxhc3RWRXYuY2VudGVyLnBhZ2VYLCBldi5jZW50ZXIucGFnZVkgLSBsYXN0VkV2LmNlbnRlci5wYWdlWSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQgPSBldjtcclxuXHJcbiAgICAgICAgaWYgKHZlbG9jaXR5LnggPiAwICYmIHZlbG9jaXR5LnkgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudC52ZWxvY2l0eSA9IHZlbG9jaXR5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYodGhpcy5jdXJyZW50LnZlbG9jaXR5ID09PSBmYWxzZSkge1xyXG4gICAgICAgIHZlbG9jaXR5ID0gSGFtbWVyLnV0aWxzLmdldFZlbG9jaXR5KGRlbHRhX3RpbWUsIGRlbHRhX3gsIGRlbHRhX3kpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudC52ZWxvY2l0eSA9IHZlbG9jaXR5O1xyXG4gICAgICAgIHRoaXMuY3VycmVudC5sYXN0VkV2ZW50ID0gZXY7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZW5kIGV2ZW50cyAoZS5nLiBkcmFnZW5kKSBkb24ndCBoYXZlIHVzZWZ1bCB2YWx1ZXMgZm9yIGludGVyaW1EaXJlY3Rpb24gJiBpbnRlcmltQW5nbGVcclxuICAgIC8vIGJlY2F1c2UgdGhlIHByZXZpb3VzIGV2ZW50IGhhcyBleGFjdGx5IHRoZSBzYW1lIGNvb3JkaW5hdGVzXHJcbiAgICAvLyBzbyBmb3IgZW5kIGV2ZW50cywgdGFrZSB0aGUgcHJldmlvdXMgdmFsdWVzIG9mIGludGVyaW1EaXJlY3Rpb24gJiBpbnRlcmltQW5nbGVcclxuICAgIC8vIGluc3RlYWQgb2YgcmVjYWxjdWxhdGluZyB0aGVtIGFuZCBnZXR0aW5nIGEgc3B1cmlvdXMgJzAnXHJcbiAgICBpZihldi5ldmVudFR5cGUgPT09ICdlbmQnKSB7XHJcbiAgICAgIGludGVyaW1BbmdsZSA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgdGhpcy5jdXJyZW50Lmxhc3RFdmVudC5pbnRlcmltQW5nbGU7XHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb24gPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIHRoaXMuY3VycmVudC5sYXN0RXZlbnQuaW50ZXJpbURpcmVjdGlvbjtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBpbnRlcmltQW5nbGUgPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIEhhbW1lci51dGlscy5nZXRBbmdsZSh0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmNlbnRlciwgZXYuY2VudGVyKTtcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbiA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgSGFtbWVyLnV0aWxzLmdldERpcmVjdGlvbih0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmNlbnRlciwgZXYuY2VudGVyKTtcclxuICAgIH1cclxuXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKGV2LCB7XHJcbiAgICAgIGRlbHRhVGltZTogZGVsdGFfdGltZSxcclxuXHJcbiAgICAgIGRlbHRhWDogZGVsdGFfeCxcclxuICAgICAgZGVsdGFZOiBkZWx0YV95LFxyXG5cclxuICAgICAgdmVsb2NpdHlYOiB2ZWxvY2l0eS54LFxyXG4gICAgICB2ZWxvY2l0eVk6IHZlbG9jaXR5LnksXHJcblxyXG4gICAgICBkaXN0YW5jZTogSGFtbWVyLnV0aWxzLmdldERpc3RhbmNlKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG5cclxuICAgICAgYW5nbGU6IEhhbW1lci51dGlscy5nZXRBbmdsZShzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuICAgICAgaW50ZXJpbUFuZ2xlOiBpbnRlcmltQW5nbGUsXHJcblxyXG4gICAgICBkaXJlY3Rpb246IEhhbW1lci51dGlscy5nZXREaXJlY3Rpb24oc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb246IGludGVyaW1EaXJlY3Rpb24sXHJcblxyXG4gICAgICBzY2FsZTogSGFtbWVyLnV0aWxzLmdldFNjYWxlKHN0YXJ0RXYudG91Y2hlcywgZXYudG91Y2hlcyksXHJcbiAgICAgIHJvdGF0aW9uOiBIYW1tZXIudXRpbHMuZ2V0Um90YXRpb24oc3RhcnRFdi50b3VjaGVzLCBldi50b3VjaGVzKSxcclxuXHJcbiAgICAgIHN0YXJ0RXZlbnQ6IHN0YXJ0RXZcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBldjtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogcmVnaXN0ZXIgbmV3IGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBnZXN0dXJlIG9iamVjdCwgc2VlIGdlc3R1cmVzLmpzIGZvciBkb2N1bWVudGF0aW9uXHJcbiAgICogQHJldHVybnMge0FycmF5fSAgICAgZ2VzdHVyZXNcclxuICAgKi9cclxuICByZWdpc3RlcjogZnVuY3Rpb24gcmVnaXN0ZXIoZ2VzdHVyZSkge1xyXG4gICAgLy8gYWRkIGFuIGVuYWJsZSBnZXN0dXJlIG9wdGlvbnMgaWYgdGhlcmUgaXMgbm8gZ2l2ZW5cclxuICAgIHZhciBvcHRpb25zID0gZ2VzdHVyZS5kZWZhdWx0cyB8fCB7fTtcclxuICAgIGlmKG9wdGlvbnNbZ2VzdHVyZS5uYW1lXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIG9wdGlvbnNbZ2VzdHVyZS5uYW1lXSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0ZW5kIEhhbW1lciBkZWZhdWx0IG9wdGlvbnMgd2l0aCB0aGUgSGFtbWVyLmdlc3R1cmUgb3B0aW9uc1xyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZChIYW1tZXIuZGVmYXVsdHMsIG9wdGlvbnMsIHRydWUpO1xyXG5cclxuICAgIC8vIHNldCBpdHMgaW5kZXhcclxuICAgIGdlc3R1cmUuaW5kZXggPSBnZXN0dXJlLmluZGV4IHx8IDEwMDA7XHJcblxyXG4gICAgLy8gYWRkIEhhbW1lci5nZXN0dXJlIHRvIHRoZSBsaXN0XHJcbiAgICB0aGlzLmdlc3R1cmVzLnB1c2goZ2VzdHVyZSk7XHJcblxyXG4gICAgLy8gc29ydCB0aGUgbGlzdCBieSBpbmRleFxyXG4gICAgdGhpcy5nZXN0dXJlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgaWYoYS5pbmRleCA8IGIuaW5kZXgpIHsgcmV0dXJuIC0xOyB9XHJcbiAgICAgIGlmKGEuaW5kZXggPiBiLmluZGV4KSB7IHJldHVybiAxOyB9XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuZ2VzdHVyZXM7XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBEcmFnXHJcbiAqIE1vdmUgd2l0aCB4IGZpbmdlcnMgKGRlZmF1bHQgMSkgYXJvdW5kIG9uIHRoZSBwYWdlLiBCbG9ja2luZyB0aGUgc2Nyb2xsaW5nIHdoZW5cclxuICogbW92aW5nIGxlZnQgYW5kIHJpZ2h0IGlzIGEgZ29vZCBwcmFjdGljZS4gV2hlbiBhbGwgdGhlIGRyYWcgZXZlbnRzIGFyZSBibG9ja2luZ1xyXG4gKiB5b3UgZGlzYWJsZSBzY3JvbGxpbmcgb24gdGhhdCBhcmVhLlxyXG4gKiBAZXZlbnRzICBkcmFnLCBkcmFwbGVmdCwgZHJhZ3JpZ2h0LCBkcmFndXAsIGRyYWdkb3duXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuRHJhZyA9IHtcclxuICBuYW1lICAgICA6ICdkcmFnJyxcclxuICBpbmRleCAgICA6IDUwLFxyXG4gIGRlZmF1bHRzIDoge1xyXG4gICAgZHJhZ19taW5fZGlzdGFuY2UgICAgICAgICAgICA6IDEwLFxyXG5cclxuICAgIC8vIFNldCBjb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZSB0byB0cnVlIHRvIG1ha2UgdGhlIHN0YXJ0aW5nIHBvaW50IG9mIHRoZSBkcmFnXHJcbiAgICAvLyBiZSBjYWxjdWxhdGVkIGZyb20gd2hlcmUgdGhlIGRyYWcgd2FzIHRyaWdnZXJlZCwgbm90IGZyb20gd2hlcmUgdGhlIHRvdWNoIHN0YXJ0ZWQuXHJcbiAgICAvLyBVc2VmdWwgdG8gYXZvaWQgYSBqZXJrLXN0YXJ0aW5nIGRyYWcsIHdoaWNoIGNhbiBtYWtlIGZpbmUtYWRqdXN0bWVudHNcclxuICAgIC8vIHRocm91Z2ggZHJhZ2dpbmcgZGlmZmljdWx0LCBhbmQgYmUgdmlzdWFsbHkgdW5hcHBlYWxpbmcuXHJcbiAgICBjb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZTogdHJ1ZSxcclxuXHJcbiAgICAvLyBzZXQgMCBmb3IgdW5saW1pdGVkLCBidXQgdGhpcyBjYW4gY29uZmxpY3Qgd2l0aCB0cmFuc2Zvcm1cclxuICAgIGRyYWdfbWF4X3RvdWNoZXMgICAgICAgICAgICAgOiAxLFxyXG5cclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCBicm93c2VyIGJlaGF2aW9yIHdoZW4gZHJhZ2dpbmcgb2NjdXJzXHJcbiAgICAvLyBiZSBjYXJlZnVsIHdpdGggaXQsIGl0IG1ha2VzIHRoZSBlbGVtZW50IGEgYmxvY2tpbmcgZWxlbWVudFxyXG4gICAgLy8gd2hlbiB5b3UgYXJlIHVzaW5nIHRoZSBkcmFnIGdlc3R1cmUsIGl0IGlzIGEgZ29vZCBwcmFjdGljZSB0byBzZXQgdGhpcyB0cnVlXHJcbiAgICBkcmFnX2Jsb2NrX2hvcml6b250YWwgICAgICAgIDogZmFsc2UsXHJcbiAgICBkcmFnX2Jsb2NrX3ZlcnRpY2FsICAgICAgICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZHJhZ19sb2NrX3RvX2F4aXMga2VlcHMgdGhlIGRyYWcgZ2VzdHVyZSBvbiB0aGUgYXhpcyB0aGF0IGl0IHN0YXJ0ZWQgb24sXHJcbiAgICAvLyBJdCBkaXNhbGxvd3MgdmVydGljYWwgZGlyZWN0aW9ucyBpZiB0aGUgaW5pdGlhbCBkaXJlY3Rpb24gd2FzIGhvcml6b250YWwsIGFuZCB2aWNlIHZlcnNhLlxyXG4gICAgZHJhZ19sb2NrX3RvX2F4aXMgICAgICAgICAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRyYWcgbG9jayBvbmx5IGtpY2tzIGluIHdoZW4gZGlzdGFuY2UgPiBkcmFnX2xvY2tfbWluX2Rpc3RhbmNlXHJcbiAgICAvLyBUaGlzIHdheSwgbG9ja2luZyBvY2N1cnMgb25seSB3aGVuIHRoZSBkaXN0YW5jZSBoYXMgYmVjb21lIGxhcmdlIGVub3VnaCB0byByZWxpYWJseSBkZXRlcm1pbmUgdGhlIGRpcmVjdGlvblxyXG4gICAgZHJhZ19sb2NrX21pbl9kaXN0YW5jZSAgICAgICA6IDI1XHJcbiAgfSxcclxuXHJcbiAgdHJpZ2dlcmVkOiBmYWxzZSxcclxuICBoYW5kbGVyICA6IGZ1bmN0aW9uIGRyYWdHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICAvLyBjdXJyZW50IGdlc3R1cmUgaXNudCBkcmFnLCBidXQgZHJhZ2dlZCBpcyB0cnVlXHJcbiAgICAvLyB0aGlzIG1lYW5zIGFuIG90aGVyIGdlc3R1cmUgaXMgYnVzeS4gbm93IGNhbGwgZHJhZ2VuZFxyXG4gICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lICYmIHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWF4IHRvdWNoZXNcclxuICAgIGlmKGluc3Qub3B0aW9ucy5kcmFnX21heF90b3VjaGVzID4gMCAmJlxyXG4gICAgICBldi50b3VjaGVzLmxlbmd0aCA+IGluc3Qub3B0aW9ucy5kcmFnX21heF90b3VjaGVzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgICAgaWYoZXYuZGlzdGFuY2UgPCBpbnN0Lm9wdGlvbnMuZHJhZ19taW5fZGlzdGFuY2UgJiZcclxuICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2UgYXJlIGRyYWdnaW5nIVxyXG4gICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSkge1xyXG4gICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcbiAgICAgICAgICBpZihpbnN0Lm9wdGlvbnMuY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2UgJiYgZXYuZGlzdGFuY2UgPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIFdoZW4gYSBkcmFnIGlzIHRyaWdnZXJlZCwgc2V0IHRoZSBldmVudCBjZW50ZXIgdG8gZHJhZ19taW5fZGlzdGFuY2UgcGl4ZWxzIGZyb20gdGhlIG9yaWdpbmFsIGV2ZW50IGNlbnRlci5cclxuICAgICAgICAgICAgLy8gV2l0aG91dCB0aGlzIGNvcnJlY3Rpb24sIHRoZSBkcmFnZ2VkIGRpc3RhbmNlIHdvdWxkIGp1bXBzdGFydCBhdCBkcmFnX21pbl9kaXN0YW5jZSBwaXhlbHMgaW5zdGVhZCBvZiBhdCAwLlxyXG4gICAgICAgICAgICAvLyBJdCBtaWdodCBiZSB1c2VmdWwgdG8gc2F2ZSB0aGUgb3JpZ2luYWwgc3RhcnQgcG9pbnQgc29tZXdoZXJlXHJcbiAgICAgICAgICAgIHZhciBmYWN0b3IgPSBNYXRoLmFicyhpbnN0Lm9wdGlvbnMuZHJhZ19taW5fZGlzdGFuY2UgLyBldi5kaXN0YW5jZSk7XHJcbiAgICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5zdGFydEV2ZW50LmNlbnRlci5wYWdlWCArPSBldi5kZWx0YVggKiBmYWN0b3I7XHJcbiAgICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5zdGFydEV2ZW50LmNlbnRlci5wYWdlWSArPSBldi5kZWx0YVkgKiBmYWN0b3I7XHJcblxyXG4gICAgICAgICAgICAvLyByZWNhbGN1bGF0ZSBldmVudCBkYXRhIHVzaW5nIG5ldyBzdGFydCBwb2ludFxyXG4gICAgICAgICAgICBldiA9IEhhbW1lci5kZXRlY3Rpb24uZXh0ZW5kRXZlbnREYXRhKGV2KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGxvY2sgZHJhZyB0byBheGlzP1xyXG4gICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5sYXN0RXZlbnQuZHJhZ19sb2NrZWRfdG9fYXhpcyB8fCAoaW5zdC5vcHRpb25zLmRyYWdfbG9ja190b19heGlzICYmIGluc3Qub3B0aW9ucy5kcmFnX2xvY2tfbWluX2Rpc3RhbmNlIDw9IGV2LmRpc3RhbmNlKSkge1xyXG4gICAgICAgICAgZXYuZHJhZ19sb2NrZWRfdG9fYXhpcyA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsYXN0X2RpcmVjdGlvbiA9IEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5sYXN0RXZlbnQuZGlyZWN0aW9uO1xyXG4gICAgICAgIGlmKGV2LmRyYWdfbG9ja2VkX3RvX2F4aXMgJiYgbGFzdF9kaXJlY3Rpb24gIT09IGV2LmRpcmVjdGlvbikge1xyXG4gICAgICAgICAgLy8ga2VlcCBkaXJlY3Rpb24gb24gdGhlIGF4aXMgdGhhdCB0aGUgZHJhZyBnZXN0dXJlIHN0YXJ0ZWQgb25cclxuICAgICAgICAgIGlmKEhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGxhc3RfZGlyZWN0aW9uKSkge1xyXG4gICAgICAgICAgICBldi5kaXJlY3Rpb24gPSAoZXYuZGVsdGFZIDwgMCkgPyBIYW1tZXIuRElSRUNUSU9OX1VQIDogSGFtbWVyLkRJUkVDVElPTl9ET1dOO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGV2LmRpcmVjdGlvbiA9IChldi5kZWx0YVggPCAwKSA/IEhhbW1lci5ESVJFQ1RJT05fTEVGVCA6IEhhbW1lci5ESVJFQ1RJT05fUklHSFQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBmaXJzdCB0aW1lLCB0cmlnZ2VyIGRyYWdzdGFydCBldmVudFxyXG4gICAgICAgIGlmKCF0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdzdGFydCcsIGV2KTtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgbm9ybWFsIGV2ZW50XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG5cclxuICAgICAgICAvLyBkaXJlY3Rpb24gZXZlbnQsIGxpa2UgZHJhZ2Rvd25cclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgZXYuZGlyZWN0aW9uLCBldik7XHJcblxyXG4gICAgICAgIC8vIGJsb2NrIHRoZSBicm93c2VyIGV2ZW50c1xyXG4gICAgICAgIGlmKChpbnN0Lm9wdGlvbnMuZHJhZ19ibG9ja192ZXJ0aWNhbCAmJiBIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChldi5kaXJlY3Rpb24pKSB8fFxyXG4gICAgICAgICAgKGluc3Qub3B0aW9ucy5kcmFnX2Jsb2NrX2hvcml6b250YWwgJiYgIUhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGV2LmRpcmVjdGlvbikpKSB7XHJcbiAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICAvLyB0cmlnZ2VyIGRyYWdlbmRcclxuICAgICAgICBpZih0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBIb2xkXHJcbiAqIFRvdWNoIHN0YXlzIGF0IHRoZSBzYW1lIHBsYWNlIGZvciB4IHRpbWVcclxuICogQGV2ZW50cyAgaG9sZFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLkhvbGQgPSB7XHJcbiAgbmFtZSAgICA6ICdob2xkJyxcclxuICBpbmRleCAgIDogMTAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIGhvbGRfdGltZW91dCAgOiA1MDAsXHJcbiAgICBob2xkX3RocmVzaG9sZDogMVxyXG4gIH0sXHJcbiAgdGltZXIgICA6IG51bGwsXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIGhvbGRHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIC8vIGNsZWFyIGFueSBydW5uaW5nIHRpbWVyc1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuXHJcbiAgICAgICAgLy8gc2V0IHRoZSBnZXN0dXJlIHNvIHdlIGNhbiBjaGVjayBpbiB0aGUgdGltZW91dCBpZiBpdCBzdGlsbCBpc1xyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG5cclxuICAgICAgICAvLyBzZXQgdGltZXIgYW5kIGlmIGFmdGVyIHRoZSB0aW1lb3V0IGl0IHN0aWxsIGlzIGhvbGQsXHJcbiAgICAgICAgLy8gd2UgdHJpZ2dlciB0aGUgaG9sZCBldmVudFxyXG4gICAgICAgIHRoaXMudGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPT0gJ2hvbGQnKSB7XHJcbiAgICAgICAgICAgIGluc3QudHJpZ2dlcignaG9sZCcsIGV2KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCBpbnN0Lm9wdGlvbnMuaG9sZF90aW1lb3V0KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIC8vIHdoZW4geW91IG1vdmUgb3IgZW5kIHdlIGNsZWFyIHRoZSB0aW1lclxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIGlmKGV2LmRpc3RhbmNlID4gaW5zdC5vcHRpb25zLmhvbGRfdGhyZXNob2xkKSB7XHJcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogUmVsZWFzZVxyXG4gKiBDYWxsZWQgYXMgbGFzdCwgdGVsbHMgdGhlIHVzZXIgaGFzIHJlbGVhc2VkIHRoZSBzY3JlZW5cclxuICogQGV2ZW50cyAgcmVsZWFzZVxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlJlbGVhc2UgPSB7XHJcbiAgbmFtZSAgIDogJ3JlbGVhc2UnLFxyXG4gIGluZGV4ICA6IEluZmluaXR5LFxyXG4gIGhhbmRsZXI6IGZ1bmN0aW9uIHJlbGVhc2VHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFN3aXBlXHJcbiAqIHRyaWdnZXJzIHN3aXBlIGV2ZW50cyB3aGVuIHRoZSBlbmQgdmVsb2NpdHkgaXMgYWJvdmUgdGhlIHRocmVzaG9sZFxyXG4gKiBAZXZlbnRzICBzd2lwZSwgc3dpcGVsZWZ0LCBzd2lwZXJpZ2h0LCBzd2lwZXVwLCBzd2lwZWRvd25cclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Td2lwZSA9IHtcclxuICBuYW1lICAgIDogJ3N3aXBlJyxcclxuICBpbmRleCAgIDogNDAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIC8vIHNldCAwIGZvciB1bmxpbWl0ZWQsIGJ1dCB0aGlzIGNhbiBjb25mbGljdCB3aXRoIHRyYW5zZm9ybVxyXG4gICAgc3dpcGVfbWluX3RvdWNoZXM6IDEsXHJcbiAgICBzd2lwZV9tYXhfdG91Y2hlczogMSxcclxuICAgIHN3aXBlX3ZlbG9jaXR5ICAgOiAwLjdcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiBzd2lwZUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIC8vIG1heCB0b3VjaGVzXHJcbiAgICAgIGlmKGluc3Qub3B0aW9ucy5zd2lwZV9tYXhfdG91Y2hlcyA+IDAgJiZcclxuICAgICAgICBldi50b3VjaGVzLmxlbmd0aCA8IGluc3Qub3B0aW9ucy5zd2lwZV9taW5fdG91Y2hlcyAmJlxyXG4gICAgICAgIGV2LnRvdWNoZXMubGVuZ3RoID4gaW5zdC5vcHRpb25zLnN3aXBlX21heF90b3VjaGVzKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgaWYoZXYudmVsb2NpdHlYID4gaW5zdC5vcHRpb25zLnN3aXBlX3ZlbG9jaXR5IHx8XHJcbiAgICAgICAgZXYudmVsb2NpdHlZID4gaW5zdC5vcHRpb25zLnN3aXBlX3ZlbG9jaXR5KSB7XHJcbiAgICAgICAgLy8gdHJpZ2dlciBzd2lwZSBldmVudHNcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArIGV2LmRpcmVjdGlvbiwgZXYpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRhcC9Eb3VibGVUYXBcclxuICogUXVpY2sgdG91Y2ggYXQgYSBwbGFjZSBvciBkb3VibGUgYXQgdGhlIHNhbWUgcGxhY2VcclxuICogQGV2ZW50cyAgdGFwLCBkb3VibGV0YXBcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5UYXAgPSB7XHJcbiAgbmFtZSAgICA6ICd0YXAnLFxyXG4gIGluZGV4ICAgOiAxMDAsXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIHRhcF9tYXhfdG91Y2h0aW1lIDogMjUwLFxyXG4gICAgdGFwX21heF9kaXN0YW5jZSAgOiAxMCxcclxuICAgIHRhcF9hbHdheXMgICAgICAgIDogdHJ1ZSxcclxuICAgIGRvdWJsZXRhcF9kaXN0YW5jZTogMjAsXHJcbiAgICBkb3VibGV0YXBfaW50ZXJ2YWw6IDMwMFxyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHRhcEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfTU9WRSAmJiAhSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSkge1xyXG4gICAgICAvL1RyYWNrIHRoZSBkaXN0YW5jZSB3ZSd2ZSBtb3ZlZC4gSWYgaXQncyBhYm92ZSB0aGUgbWF4IE9OQ0UsIHJlbWVtYmVyIHRoYXQgKGZpeGVzICM0MDYpLlxyXG4gICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlID0gKGV2LmRpc3RhbmNlID4gaW5zdC5vcHRpb25zLnRhcF9tYXhfZGlzdGFuY2UpO1xyXG4gICAgfSBlbHNlIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EICYmIGV2LnNyY0V2ZW50LnR5cGUgIT0gJ3RvdWNoY2FuY2VsJykge1xyXG4gICAgICAvLyBwcmV2aW91cyBnZXN0dXJlLCBmb3IgdGhlIGRvdWJsZSB0YXAgc2luY2UgdGhlc2UgYXJlIHR3byBkaWZmZXJlbnQgZ2VzdHVyZSBkZXRlY3Rpb25zXHJcbiAgICAgIHZhciBwcmV2ID0gSGFtbWVyLmRldGVjdGlvbi5wcmV2aW91cyxcclxuICAgICAgICBkaWRfZG91YmxldGFwID0gZmFsc2U7XHJcblxyXG4gICAgICAvLyB3aGVuIHRoZSB0b3VjaHRpbWUgaXMgaGlnaGVyIHRoZW4gdGhlIG1heCB0b3VjaCB0aW1lXHJcbiAgICAgIC8vIG9yIHdoZW4gdGhlIG1vdmluZyBkaXN0YW5jZSBpcyB0b28gbXVjaFxyXG4gICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlIHx8IGV2LmRlbHRhVGltZSA+IGluc3Qub3B0aW9ucy50YXBfbWF4X3RvdWNodGltZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gY2hlY2sgaWYgZG91YmxlIHRhcFxyXG4gICAgICBpZihwcmV2ICYmIHByZXYubmFtZSA9PSAndGFwJyAmJlxyXG4gICAgICAgIChldi50aW1lU3RhbXAgLSBwcmV2Lmxhc3RFdmVudC50aW1lU3RhbXApIDwgaW5zdC5vcHRpb25zLmRvdWJsZXRhcF9pbnRlcnZhbCAmJlxyXG4gICAgICAgIGV2LmRpc3RhbmNlIDwgaW5zdC5vcHRpb25zLmRvdWJsZXRhcF9kaXN0YW5jZSkge1xyXG4gICAgICAgIGluc3QudHJpZ2dlcignZG91YmxldGFwJywgZXYpO1xyXG4gICAgICAgIGRpZF9kb3VibGV0YXAgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBkbyBhIHNpbmdsZSB0YXBcclxuICAgICAgaWYoIWRpZF9kb3VibGV0YXAgfHwgaW5zdC5vcHRpb25zLnRhcF9hbHdheXMpIHtcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9ICd0YXAnO1xyXG4gICAgICAgIGluc3QudHJpZ2dlcihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSwgZXYpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRvdWNoXHJcbiAqIENhbGxlZCBhcyBmaXJzdCwgdGVsbHMgdGhlIHVzZXIgaGFzIHRvdWNoZWQgdGhlIHNjcmVlblxyXG4gKiBAZXZlbnRzICB0b3VjaFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRvdWNoID0ge1xyXG4gIG5hbWUgICAgOiAndG91Y2gnLFxyXG4gIGluZGV4ICAgOiAtSW5maW5pdHksXHJcbiAgZGVmYXVsdHM6IHtcclxuICAgIC8vIGNhbGwgcHJldmVudERlZmF1bHQgYXQgdG91Y2hzdGFydCwgYW5kIG1ha2VzIHRoZSBlbGVtZW50IGJsb2NraW5nIGJ5XHJcbiAgICAvLyBkaXNhYmxpbmcgdGhlIHNjcm9sbGluZyBvZiB0aGUgcGFnZSwgYnV0IGl0IGltcHJvdmVzIGdlc3R1cmVzIGxpa2VcclxuICAgIC8vIHRyYW5zZm9ybWluZyBhbmQgZHJhZ2dpbmcuXHJcbiAgICAvLyBiZSBjYXJlZnVsIHdpdGggdXNpbmcgdGhpcywgaXQgY2FuIGJlIHZlcnkgYW5ub3lpbmcgZm9yIHVzZXJzIHRvIGJlIHN0dWNrXHJcbiAgICAvLyBvbiB0aGUgcGFnZVxyXG4gICAgcHJldmVudF9kZWZhdWx0ICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZGlzYWJsZSBtb3VzZSBldmVudHMsIHNvIG9ubHkgdG91Y2ggKG9yIHBlbiEpIGlucHV0IHRyaWdnZXJzIGV2ZW50c1xyXG4gICAgcHJldmVudF9tb3VzZWV2ZW50czogZmFsc2VcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiB0b3VjaEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGluc3Qub3B0aW9ucy5wcmV2ZW50X21vdXNlZXZlbnRzICYmIGV2LnBvaW50ZXJUeXBlID09IEhhbW1lci5QT0lOVEVSX01PVVNFKSB7XHJcbiAgICAgIGV2LnN0b3BEZXRlY3QoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGluc3Qub3B0aW9ucy5wcmV2ZW50X2RlZmF1bHQpIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX1NUQVJUKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFRyYW5zZm9ybVxyXG4gKiBVc2VyIHdhbnQgdG8gc2NhbGUgb3Igcm90YXRlIHdpdGggMiBmaW5nZXJzXHJcbiAqIEBldmVudHMgIHRyYW5zZm9ybSwgcGluY2gsIHBpbmNoaW4sIHBpbmNob3V0LCByb3RhdGVcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5UcmFuc2Zvcm0gPSB7XHJcbiAgbmFtZSAgICAgOiAndHJhbnNmb3JtJyxcclxuICBpbmRleCAgICA6IDQ1LFxyXG4gIGRlZmF1bHRzIDoge1xyXG4gICAgLy8gZmFjdG9yLCBubyBzY2FsZSBpcyAxLCB6b29taW4gaXMgdG8gMCBhbmQgem9vbW91dCB1bnRpbCBoaWdoZXIgdGhlbiAxXHJcbiAgICB0cmFuc2Zvcm1fbWluX3NjYWxlICAgOiAwLjAxLFxyXG4gICAgLy8gcm90YXRpb24gaW4gZGVncmVlc1xyXG4gICAgdHJhbnNmb3JtX21pbl9yb3RhdGlvbjogMSxcclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCBicm93c2VyIGJlaGF2aW9yIHdoZW4gdHdvIHRvdWNoZXMgYXJlIG9uIHRoZSBzY3JlZW5cclxuICAgIC8vIGJ1dCBpdCBtYWtlcyB0aGUgZWxlbWVudCBhIGJsb2NraW5nIGVsZW1lbnRcclxuICAgIC8vIHdoZW4geW91IGFyZSB1c2luZyB0aGUgdHJhbnNmb3JtIGdlc3R1cmUsIGl0IGlzIGEgZ29vZCBwcmFjdGljZSB0byBzZXQgdGhpcyB0cnVlXHJcbiAgICB0cmFuc2Zvcm1fYWx3YXlzX2Jsb2NrOiBmYWxzZVxyXG4gIH0sXHJcbiAgdHJpZ2dlcmVkOiBmYWxzZSxcclxuICBoYW5kbGVyICA6IGZ1bmN0aW9uIHRyYW5zZm9ybUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIC8vIGN1cnJlbnQgZ2VzdHVyZSBpc250IGRyYWcsIGJ1dCBkcmFnZ2VkIGlzIHRydWVcclxuICAgIC8vIHRoaXMgbWVhbnMgYW4gb3RoZXIgZ2VzdHVyZSBpcyBidXN5LiBub3cgY2FsbCBkcmFnZW5kXHJcbiAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUgJiYgdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhdGxlYXN0IG11bHRpdG91Y2hcclxuICAgIGlmKGV2LnRvdWNoZXMubGVuZ3RoIDwgMikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IHdoZW4gdHdvIGZpbmdlcnMgYXJlIG9uIHRoZSBzY3JlZW5cclxuICAgIGlmKGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fYWx3YXlzX2Jsb2NrKSB7XHJcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICB2YXIgc2NhbGVfdGhyZXNob2xkID0gTWF0aC5hYnMoMSAtIGV2LnNjYWxlKTtcclxuICAgICAgICB2YXIgcm90YXRpb25fdGhyZXNob2xkID0gTWF0aC5hYnMoZXYucm90YXRpb24pO1xyXG5cclxuICAgICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICAgIGlmKHNjYWxlX3RocmVzaG9sZCA8IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3NjYWxlICYmXHJcbiAgICAgICAgICByb3RhdGlvbl90aHJlc2hvbGQgPCBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9yb3RhdGlvbikge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gd2UgYXJlIHRyYW5zZm9ybWluZyFcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuXHJcbiAgICAgICAgLy8gZmlyc3QgdGltZSwgdHJpZ2dlciBkcmFnc3RhcnQgZXZlbnRcclxuICAgICAgICBpZighdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnc3RhcnQnLCBldik7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7IC8vIGJhc2ljIHRyYW5zZm9ybSBldmVudFxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHJvdGF0ZSBldmVudFxyXG4gICAgICAgIGlmKHJvdGF0aW9uX3RocmVzaG9sZCA+IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3JvdGF0aW9uKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3JvdGF0ZScsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgcGluY2ggZXZlbnRcclxuICAgICAgICBpZihzY2FsZV90aHJlc2hvbGQgPiBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9zY2FsZSkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdwaW5jaCcsIGV2KTtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncGluY2gnICsgKChldi5zY2FsZSA8IDEpID8gJ2luJyA6ICdvdXQnKSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICAvLyB0cmlnZ2VyIGRyYWdlbmRcclxuICAgICAgICBpZih0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbiAgLy8gQmFzZWQgb2ZmIExvLURhc2gncyBleGNlbGxlbnQgVU1EIHdyYXBwZXIgKHNsaWdodGx5IG1vZGlmaWVkKSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvbG9kYXNoLmpzI0w1NTE1LUw1NTQzXHJcbiAgLy8gc29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zIGxpa2UgdGhlIGZvbGxvd2luZzpcclxuICBpZih0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gZGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGVcclxuICAgIGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIEhhbW1lcjsgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBjaGVjayBmb3IgYGV4cG9ydHNgIGFmdGVyIGBkZWZpbmVgIGluIGNhc2UgYSBidWlsZCBvcHRpbWl6ZXIgYWRkcyBhbiBgZXhwb3J0c2Agb2JqZWN0XHJcbiAgZWxzZSBpZih0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBIYW1tZXI7XHJcbiAgfVxyXG5cclxuICBlbHNlIHtcclxuICAgIHdpbmRvdy5IYW1tZXIgPSBIYW1tZXI7XHJcbiAgfVxyXG5cclxufSkod2luZG93KTtcclxuXHJcbi8qISBqUXVlcnkgcGx1Z2luIGZvciBIYW1tZXIuSlMgLSB2MS4wLjEgLSAyMDE0LTAyLTAzXHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxNCBKb3JpayBUYW5nZWxkZXIgPGoudGFuZ2VsZGVyQGdtYWlsLmNvbT47XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSAqLyhmdW5jdGlvbih3aW5kb3csIHVuZGVmaW5lZCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIHNldHVwKEhhbW1lciwgJCkge1xyXG4gIC8qKlxyXG4gICAqIGJpbmQgZG9tIGV2ZW50c1xyXG4gICAqIHRoaXMgb3ZlcndyaXRlcyBhZGRFdmVudExpc3RlbmVyXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlc1xyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgSGFtbWVyLmV2ZW50LmJpbmREb20gPSBmdW5jdGlvbihlbGVtZW50LCBldmVudFR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICAkKGVsZW1lbnQpLm9uKGV2ZW50VHlwZXMsIGZ1bmN0aW9uKGV2KSB7XHJcbiAgICAgIHZhciBkYXRhID0gZXYub3JpZ2luYWxFdmVudCB8fCBldjtcclxuXHJcbiAgICAgIGlmKGRhdGEucGFnZVggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRhdGEucGFnZVggPSBldi5wYWdlWDtcclxuICAgICAgICBkYXRhLnBhZ2VZID0gZXYucGFnZVk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnRhcmdldCkge1xyXG4gICAgICAgIGRhdGEudGFyZ2V0ID0gZXYudGFyZ2V0O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihkYXRhLndoaWNoID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkYXRhLndoaWNoID0gZGF0YS5idXR0b247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnByZXZlbnREZWZhdWx0KSB7XHJcbiAgICAgICAgZGF0YS5wcmV2ZW50RGVmYXVsdCA9IGV2LnByZXZlbnREZWZhdWx0O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS5zdG9wUHJvcGFnYXRpb24pIHtcclxuICAgICAgICBkYXRhLnN0b3BQcm9wYWdhdGlvbiA9IGV2LnN0b3BQcm9wYWdhdGlvbjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGRhdGEpO1xyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogdGhlIG1ldGhvZHMgYXJlIGNhbGxlZCBieSB0aGUgaW5zdGFuY2UsIGJ1dCB3aXRoIHRoZSBqcXVlcnkgcGx1Z2luXHJcbiAgICogd2UgdXNlIHRoZSBqcXVlcnkgZXZlbnQgbWV0aG9kcyBpbnN0ZWFkLlxyXG4gICAqIEB0aGlzICAgIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZXMsIGhhbmRsZXIpIHtcclxuICAgIHJldHVybiAkKHRoaXMuZWxlbWVudCkub24odHlwZXMsIGhhbmRsZXIpO1xyXG4gIH07XHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbih0eXBlcywgaGFuZGxlcikge1xyXG4gICAgcmV0dXJuICQodGhpcy5lbGVtZW50KS5vZmYodHlwZXMsIGhhbmRsZXIpO1xyXG4gIH07XHJcblxyXG5cclxuICAvKipcclxuICAgKiB0cmlnZ2VyIGV2ZW50c1xyXG4gICAqIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBnZXN0dXJlcyB0byB0cmlnZ2VyIGFuIGV2ZW50IGxpa2UgJ3RhcCdcclxuICAgKiBAdGhpcyAgICB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGdlc3R1cmVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldmVudERhdGFcclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKGdlc3R1cmUsIGV2ZW50RGF0YSkge1xyXG4gICAgdmFyIGVsID0gJCh0aGlzLmVsZW1lbnQpO1xyXG4gICAgaWYoZWwuaGFzKGV2ZW50RGF0YS50YXJnZXQpLmxlbmd0aCkge1xyXG4gICAgICBlbCA9ICQoZXZlbnREYXRhLnRhcmdldCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVsLnRyaWdnZXIoe1xyXG4gICAgICB0eXBlICAgOiBnZXN0dXJlLFxyXG4gICAgICBnZXN0dXJlOiBldmVudERhdGFcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG5cclxuICAvKipcclxuICAgKiBqUXVlcnkgcGx1Z2luXHJcbiAgICogY3JlYXRlIGluc3RhbmNlIG9mIEhhbW1lciBhbmQgd2F0Y2ggZm9yIGdlc3R1cmVzLFxyXG4gICAqIGFuZCB3aGVuIGNhbGxlZCBhZ2FpbiB5b3UgY2FuIGNoYW5nZSB0aGUgb3B0aW9uc1xyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIFtvcHRpb25zPXt9XVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgJC5mbi5oYW1tZXIgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcbiAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgZWwgPSAkKHRoaXMpO1xyXG4gICAgICB2YXIgaW5zdCA9IGVsLmRhdGEoJ2hhbW1lcicpO1xyXG4gICAgICAvLyBzdGFydCBuZXcgaGFtbWVyIGluc3RhbmNlXHJcbiAgICAgIGlmKCFpbnN0KSB7XHJcbiAgICAgICAgZWwuZGF0YSgnaGFtbWVyJywgbmV3IEhhbW1lcih0aGlzLCBvcHRpb25zIHx8IHt9KSk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gY2hhbmdlIHRoZSBvcHRpb25zXHJcbiAgICAgIGVsc2UgaWYoaW5zdCAmJiBvcHRpb25zKSB7XHJcbiAgICAgICAgSGFtbWVyLnV0aWxzLmV4dGVuZChpbnN0Lm9wdGlvbnMsIG9wdGlvbnMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9O1xyXG59XHJcblxyXG4gIC8vIEJhc2VkIG9mZiBMby1EYXNoJ3MgZXhjZWxsZW50IFVNRCB3cmFwcGVyIChzbGlnaHRseSBtb2RpZmllZCkgLSBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL2xvZGFzaC5qcyNMNTUxNS1MNTU0M1xyXG4gIC8vIHNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XHJcbiAgaWYodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIGRlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlXHJcbiAgICBkZWZpbmUoWydoYW1tZXJqcycsICdqcXVlcnknXSwgc2V0dXApO1xyXG5cclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICBzZXR1cCh3aW5kb3cuSGFtbWVyLCB3aW5kb3cualF1ZXJ5IHx8IHdpbmRvdy5aZXB0byk7XHJcbiAgfVxyXG59KSh3aW5kb3cpOyIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsInZhciBwcm9jZXNzPXJlcXVpcmUoXCJfX2Jyb3dzZXJpZnlfcHJvY2Vzc1wiKSxnbG9iYWw9dHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9Oy8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==
;