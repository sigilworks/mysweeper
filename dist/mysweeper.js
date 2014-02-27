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
},{"./constants":3,"./gameboard":6,"./validators":17}],2:[function(require,module,exports){

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
    Scorekeeper = require('./scorekeeper');

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
},{"./console-renderer":2,"./constants":3,"./countdown":4,"./danger-calculator":5,"./lib/multimap":10,"./minelayer":11,"./scorekeeper":12,"./serializer":13,"./square":14,"./theme-styler":15,"./transcribing-emitter":16}],7:[function(require,module,exports){

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
        if (fn != null)
            return (fn.length > 1)
                ? fn.call(this, event.pts, function(err) { if (!err) return void 0; })
                : console.log("<score event: %o>: :old [%o]", fn.name, this.score), fn.call(this, event.pts), console.log("...:new => [%o]", this.score);
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
},{}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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
},{"./constants":3,"./lib/bit-flag-factory":7}],15:[function(require,module,exports){
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
},{"./constants":3}],16:[function(require,module,exports){
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
    this.__trigger__.apply(this, args);
    console.debug("[TE] => %o", args)
    // ...then alter the params for the transcript's records
    if (args.length === 3) {

        // standard Square-based event
        // 0: event name, 1: Square instance, 2: jQuery-wrapped DOM element
        if (args[1].constructor.name === "Square")
            args[1] = JSON.stringify(args[1]);
        if (args[2] instanceof jQuery)
            args[2] = buildDOMString(args[2]);

        // standard Gameboard-based event
        if (args[1].constructor.name === "Multimap")
            args[1] = JSON.stringify(args[1]);
    }
    args.unshift(+new Date);
    this._transcripts.push(args);
};

function buildDOMString($el) {
    var node = $el instanceof jQuery ? $el[0] : $el,
        SORT_FN_CELL_FIRST = function(a,b) { return (a === 'cell' || b ==='cell' || a > b) ? 1 : (a < b) ? -1 : 0; };
    return node.parentNode.tagName.toLowerCase()
        + "#" + node.parentNode.id + " "
        + node.tagName.toLowerCase() + "."
        + node.className.split(' ')
        .sort(SORT_FN_CELL_FIRST)
        .join('.');
}

module.exports = TranscribingEmitter;
},{"./lib/emitter":8,"util":22}],17:[function(require,module,exports){
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
},{"./constants":3}],18:[function(require,module,exports){
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
},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],22:[function(require,module,exports){
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

},{"./support/isBuffer":21,"__browserify_process":20,"inherits":19}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18,14])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2xjZ2VuZXJhdG9yLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL211bHRpbWFwLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbWluZWxheWVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdHJhbnNjcmliaW5nLWVtaXR0ZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92YWxpZGF0b3JzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdmVuZG9yL2pxdWVyeS5oYW1tZXItZnVsbC5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5a0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbInZhciBHYW1lYm9hcmQgPSByZXF1aXJlKCcuL2dhbWVib2FyZCcpLFxyXG4gICAgTW9kZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vZGVzLFxyXG4gICAgUHJlc2V0TGV2ZWxzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5QcmVzZXRMZXZlbHMsXHJcbiAgICBQcmVzZXRTZXR1cHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldFNldHVwcyxcclxuICAgIERpbVZhbGlkYXRvciA9IHJlcXVpcmUoJy4vdmFsaWRhdG9ycycpLkJvYXJkRGltZW5zaW9ucyxcclxuICAgIE1pbmVWYWxpZGF0b3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRvcnMnKS5NaW5lQ291bnQsXHJcbiAgICBWRVJTSU9OID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5WRVJTSU9OLFxyXG4gICAgTUFYX0dSSURfRElNRU5TSU9OUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTUFYX0dSSURfRElNRU5TSU9OUyxcclxuXHJcbiAgICBtaW5lYWJsZVNwYWNlcyA9IGZ1bmN0aW9uKGRpbSkgeyByZXR1cm4gfn4oTWF0aC5wb3coZGltLCAyKSAqIDAuNSk7IH0sXHJcbiAgICBkaXNhYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsLCB1bmRvKSB7XHJcbiAgICAgICAgaWYgKHVuZG8gPT0gbnVsbCkgdW5kbyA9IGZhbHNlO1xyXG4gICAgICAgICRlbFt1bmRvID8gJ3JlbW92ZUNsYXNzJyA6ICdhZGRDbGFzcyddKCdkaXNhYmxlZCcpO1xyXG4gICAgICAgICRlbC5maW5kKFwiaW5wdXRcIikucHJvcCgncmVhZG9ubHknLCAhdW5kbyk7XHJcbiAgICB9LFxyXG4gICAgZW5hYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsKSB7IHJldHVybiBkaXNhYmxlT3B0aW9uKCRlbCwgdHJ1ZSk7IH07XHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgdmFyICRwb3NzaWJsZU1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKSxcclxuICAgICAgICBQUkVTRVRfUEFORUxfU0VMRUNUT1IgPSBcInVsLnByZXNldCA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiLFxyXG4gICAgICAgIENVU1RPTV9QQU5FTF9TRUxFQ1RPUiA9IFwidWwuY3VzdG9tID4gbGk6bm90KDpoYXMobGFiZWxbZm9yJD0nLW1vZGUnXSkpXCI7XHJcblxyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5zaWJsaW5ncyhcIi5hZHZpY2VcIikuZmluZChcInNwYW5cIikuaHRtbChNQVhfR1JJRF9ESU1FTlNJT05TICsgXCIgeCBcIiArIE1BWF9HUklEX0RJTUVOU0lPTlMpO1xyXG5cclxuICAgICQoXCIjcHJlc2V0LW1vZGVcIikub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7IGVuYWJsZU9wdGlvbigkKFBSRVNFVF9QQU5FTF9TRUxFQ1RPUikpOyBkaXNhYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IH0pLmNsaWNrKCk7XHJcbiAgICAkKFwiI2N1c3RvbS1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChDVVNUT01fUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKFBSRVNFVF9QQU5FTF9TRUxFQ1RPUikpOyB9KTtcclxuXHJcbiAgICAkLmVhY2goJChcImxhYmVsW2Zvcl49J2xldmVsLSddXCIpLCBmdW5jdGlvbihfLCBsYWJlbCkge1xyXG4gICAgICAgIHZhciBsZXZlbCA9ICQobGFiZWwpLmF0dHIoJ2ZvcicpLnN1YnN0cmluZygnbGV2ZWwtJy5sZW5ndGgpLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgIGRpbXMgPSBQcmVzZXRTZXR1cHNbbGV2ZWxdLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gUHJlc2V0U2V0dXBzW2xldmVsXS5taW5lcyxcclxuICAgICAgICAgICAgJGFkdmljZSA9ICQobGFiZWwpLmZpbmQoJy5hZHZpY2UnKTtcclxuICAgICAgICAkYWR2aWNlLmh0bWwoXCIgKFwiICsgZGltcyArIFwiIHggXCIgKyBkaW1zICsgXCIsIFwiICsgbWluZXMgKyBcIiBtaW5lcylcIik7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBvbmtleXVwIHdoZW4gY2hvb3NpbmcgZ2FtZWJvYXJkIGRpbWVuc2lvbnMsXHJcbiAgICAvLyBuZWlnaGJvcmluZyBpbnB1dCBzaG91bGQgbWlycm9yIG5ldyB2YWx1ZSxcclxuICAgIC8vIGFuZCB0b3RhbCBwb3NzaWJsZSBtaW5lYWJsZSBzcXVhcmVzIChkaW1lbnNpb25zIF4gMiAtMSlcclxuICAgIC8vIGJlIGZpbGxlZCBpbnRvIGEgPHNwYW4+IGJlbG93LlxyXG4gICAgJChcIiNkaW1lbnNpb25zXCIpLm9uKCdrZXl1cCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XHJcbiAgICAgICAgLy8gdXBkYXRlIHRoZSAnbWlycm9yJyA8aW5wdXQ+Li4uXHJcbiAgICAgICAgJCgnI2RpbWVuc2lvbnMtbWlycm9yJykudmFsKCR0aGlzLnZhbCgpKTtcclxuICAgICAgICAvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuICAgICAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCR0aGlzLnZhbCgpKSArICcuJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkKFwiZm9ybVwiKS5vbihcInN1Ym1pdFwiLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgdmFyIG1vZGUgPSAkKFwiW25hbWU9bW9kZS1zZWxlY3RdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zID0ge307XHJcblxyXG4gICAgICAgIGlmIChtb2RlID09PSBNb2Rlcy5QUkVTRVQpIHtcclxuICAgICAgICAgICAgdmFyIGxldmVsID0gJChcIltuYW1lPXByZXNldC1sZXZlbF06Y2hlY2tlZFwiKS52YWwoKSxcclxuICAgICAgICAgICAgICAgIHNldHVwID0gT2JqZWN0LmtleXMoUHJlc2V0TGV2ZWxzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHBsKSB7IHJldHVybiBQcmVzZXRMZXZlbHNbcGxdID09PSBsZXZlbDsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnBvcCgpO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gUHJlc2V0U2V0dXBzW3NldHVwXS5kaW1lbnNpb25zO1xyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5taW5lcyA9IFByZXNldFNldHVwc1tzZXR1cF0ubWluZXM7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gTW9kZXMuQ1VTVE9NLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmlzQ3VzdG9tID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBkID0gJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpIHx8ICskKFwiI2RpbWVuc2lvbnNcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpLFxyXG4gICAgICAgICAgICAgICAgbSA9ICQoXCIjbWluZS1jb3VudFwiKS52YWwoKSB8fCArJChcIiNtaW5lLWNvdW50XCIpLmF0dHIoXCJwbGFjZWhvbGRlclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBnYW1lT3B0aW9ucy5kaW1lbnNpb25zID0gRGltVmFsaWRhdG9yLnZhbGlkYXRlKGQpID8gK2QgOiA5O1xyXG4gICAgICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBNaW5lVmFsaWRhdG9yLnZhbGlkYXRlKG0sIG1pbmVhYmxlU3BhY2VzKGdhbWVPcHRpb25zLmRpbWVuc2lvbnMpKSA/IG0gOiAxO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImU6ICVvXCIsIGUpO1xyXG4gICAgICAgICAgICAgICAgJChcIiN2YWxpZGF0aW9uLXdhcm5pbmdzXCIpLmh0bWwoZS5tZXNzYWdlKS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc2V0IHRoZSBkZXNpcmVkIGNvbG9yIHRoZW1lLi4uXHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLnRoZW1lID0gJChcIiNjb2xvci10aGVtZVwiKS52YWwoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHNldCB1cCA8aGVhZGVyPiBjb250ZW50Li4uXHJcbiAgICAgICAgJChcIiNtaW5lcy1kaXNwbGF5XCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoZ2FtZU9wdGlvbnMubWluZXMpO1xyXG4gICAgICAgICQoXCIudmVyc2lvblwiKS5odG1sKFZFUlNJT04pO1xyXG5cclxuICAgICAgICB3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZChnYW1lT3B0aW9ucykucmVuZGVyKCk7XHJcblxyXG4gICAgICAgICQoXCIjdmFsaWRhdGlvbi13YXJuaW5nc1wiKS5oaWRlKCk7XHJcbiAgICAgICAgJChcIiNvcHRpb25zLWNhcmRcIikuaGlkZSgpO1xyXG4gICAgICAgICQoXCIjYm9hcmQtY2FyZFwiKS5mYWRlSW4oKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcIiNib2FyZC1jYXJkXCIpLm9uKFwiY2xpY2tcIiwgXCJhLnJlcGxheVwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyB0ZW1wb3JhcnksIGJydXRlLWZvcmNlIGZpeC4uLlxyXG4gICAgICAgIC8vIFRPRE86IHJlc2V0IGZvcm0gYW5kIHRvZ2dsZSB2aXNpYmlsaXR5IG9uIHRoZSBzZWN0aW9ucy4uLlxyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcclxuICAgIH0pO1xyXG5cclxufSk7IiwiXHJcbnZhciBDb25zb2xlUmVuZGVyZXIgPSB7XHJcblxyXG4gICAgQ09MX1NQQUNJTkc6ICcgICAnLFxyXG4gICAgTUlORURfU1FVQVJFOiAnKicsXHJcbiAgICBCTEFOS19TUVVBUkU6ICcuJyxcclxuICAgIFJFTkRFUkVEX01BUDogJyVvJyxcclxuICAgIERFRkFVTFRfVFJBTlNGT1JNRVI6IGZ1bmN0aW9uKHJvdyl7IHJldHVybiByb3c7IH0sXHJcblxyXG4gICAgX21ha2VUaXRsZTogZnVuY3Rpb24oc3RyKSB7IHJldHVybiBzdHIuc3BsaXQoJycpLmpvaW4oJyAnKS50b1VwcGVyQ2FzZSgpOyB9LFxyXG4gICAgX2Rpc3BsYXlSb3dOdW06IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gXCIgICAgICAgW1wiICsgbnVtICsgXCJdXFxuXCIgfSxcclxuICAgIF90b1N5bWJvbHM6IGZ1bmN0aW9uKHZhbHVlcywgZm4pIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKHN0ciwgcm93LCBpZHgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBmbihyb3cpLmpvaW4oX3RoaXMuQ09MX1NQQUNJTkcpLnRvTG93ZXJDYXNlKCkgKyBfdGhpcy5fZGlzcGxheVJvd051bShpZHgpXHJcbiAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfSxcclxuICAgIF92YWxpZGF0ZTogZnVuY3Rpb24odmFsdWVzKSB7XHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWVzKSAmJiB2YWx1ZXMubGVuZ3RoKVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xyXG4gICAgICAgIGVsc2UgdGhyb3cgXCJObyB2YWx1ZXMgcHJlc2VudC5cIjtcclxuICAgIH0sXHJcbiAgICBfZ2V0UmVuZGVyZWRNYXA6IGZ1bmN0aW9uKHRyYW5zZm9ybWVyKSB7XHJcbiAgICAgICAgdmFyIHZhbHMgPSB0aGlzLl92YWxpZGF0ZSh0aGlzLnZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RvU3ltYm9scyh2YWxzLCB0cmFuc2Zvcm1lcik7XHJcbiAgICB9LFxyXG5cclxuICAgIHRvOiBmdW5jdGlvbihsb2cpIHsgdGhpcy4kbG9nID0gbG9nOyByZXR1cm4gdGhpczsgfSxcclxuICAgIHdpdGhWYWx1ZXM6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIHRoaXMudmFsdWVzID0gdGhpcy5fdmFsaWRhdGUodmFsdWVzKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcblxyXG4gICAgdmlld0dhbWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyID0gZnVuY3Rpb24ocm93KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcm93Lm1hcChmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoc3EuaXNNaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLk1JTkVEX1NRVUFSRSA6IHNxLmdldERhbmdlcigpID09PSAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IF90aGlzLkJMQU5LX1NRVUFSRSA6IHNxLmdldERhbmdlcigpOyB9KVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMuJGxvZyhbIHRoaXMuX21ha2VUaXRsZShcImdhbWVib2FyZFwiKSwgdGhpcy5SRU5ERVJFRF9NQVAgXVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyksXHJcbiAgICAgICAgICAgIHRoaXMuX2dldFJlbmRlcmVkTWFwKHRyYW5zZm9ybWVyKSk7XHJcbiAgICB9LFxyXG4gICAgdmlld01pbmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJtaW5lIHBsYWNlbWVudHNcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0aGlzLkRFRkFVTFRfVFJBTlNGT1JNRVIpKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc29sZVJlbmRlcmVyOyIsIlxyXG52YXIgQ29uc3RhbnRzID0ge1xyXG5cclxuICAgIFZFUlNJT046ICdiZXRhNCcsXHJcbiAgICBNQVhfR1JJRF9ESU1FTlNJT05TOiAyNSxcclxuXHJcbiAgICBEZWZhdWx0Q29uZmlnOiB7XHJcbiAgICAgICAgZGltZW5zaW9uczogOSxcclxuICAgICAgICBtaW5lczogMSxcclxuICAgICAgICBib2FyZDogJyNib2FyZCcsXHJcbiAgICAgICAgdGltZXI6IDUwMCxcclxuICAgICAgICBkZWJ1Z19tb2RlOiB0cnVlLCAvKmZhbHNlKi9cclxuICAgICAgICB0aGVtZTogJ0xJR0hUJ1xyXG4gICAgfSxcclxuXHJcbiAgICBTeW1ib2xzOiB7IENMT1NFRDogJ3gnLCBPUEVOOiAnXycsIEZMQUdHRUQ6ICdmJywgTUlORUQ6ICcqJyB9LFxyXG5cclxuICAgIEZsYWdzOiAgeyBPUEVOOiAnRl9PUEVOJywgTUlORUQ6ICdGX01JTkVEJywgRkxBR0dFRDogJ0ZfRkxBR0dFRCcsIElOREVYRUQ6ICdGX0lOREVYRUQnIH0sXHJcblxyXG4gICAgR2x5cGhzOiB7IEZMQUc6ICd4JywgTUlORTogJ8OEJyB9LFxyXG5cclxuICAgIE1vZGVzOiB7IFBSRVNFVDogXCJQXCIsIENVU1RPTTogXCJDXCIgfSxcclxuXHJcbiAgICBQcmVzZXRMZXZlbHM6IHsgQkVHSU5ORVI6IFwiQlwiLCBJTlRFUk1FRElBVEU6IFwiSVwiLCBFWFBFUlQ6IFwiRVwiIH0sXHJcblxyXG4gICAgUHJlc2V0U2V0dXBzOiB7XHJcbiAgICAgICAgQkVHSU5ORVI6ICAgICAgIHsgZGltZW5zaW9uczogIDksIG1pbmVzOiAgOSwgdGltZXI6IDMwMCB9LFxyXG4gICAgICAgIElOVEVSTUVESUFURTogICB7IGRpbWVuc2lvbnM6IDEyLCBtaW5lczogMjEsIHRpbWVyOiA0MjAgfSxcclxuICAgICAgICBFWFBFUlQ6ICAgICAgICAgeyBkaW1lbnNpb25zOiAxNSwgbWluZXM6IDY3LCB0aW1lcjogNTQwIH1cclxuICAgIH0sXHJcblxyXG4gICAgVGhlbWVzOiB7IExJR0hUOiAnbGlnaHQnLCBEQVJLOiAnZGFyaycgfSxcclxuXHJcbiAgICBNZXNzYWdlT3ZlcmxheTogJyNmbGFzaCcsXHJcblxyXG4gICAgTW9iaWxlRGV2aWNlUmVnZXg6IC9hbmRyb2lkfHdlYm9zfGlwaG9uZXxpcGFkfGlwb2R8YmxhY2tiZXJyeXxpZW1vYmlsZXxvcGVyYSBtaW5pLyxcclxuXHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnN0YW50czsiLCJcclxuXHJcbmZ1bmN0aW9uIENvdW50ZG93bihzZWNvbmRzLCBlbCkge1xyXG4gICAgdGhpcy5zZWNvbmRzID0gc2Vjb25kcztcclxuICAgIHRoaXMuaW5pdGlhbCA9IHNlY29uZHM7XHJcbiAgICB0aGlzLmVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWwuY2hhckF0KDApID09PSAnIycgPyBlbC5zdWJzdHJpbmcoMSkgOiBlbCk7XHJcblxyXG4gICAgdGhpcy5tMSA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI20xJyk7XHJcbiAgICB0aGlzLm0yID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjbTInKTtcclxuICAgIHRoaXMuczEgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNzMScpO1xyXG4gICAgdGhpcy5zMiA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3MyJyk7XHJcblxyXG4gICAgdGhpcy5mcmVlemUgPSBmYWxzZTtcclxufVxyXG5cclxuQ291bnRkb3duLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBDb3VudGRvd24sXHJcbiAgICBfcmVuZGVySW5pdGlhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IHRoaXMuX3RvTWluc1NlY3ModGhpcy5zZWNvbmRzKTtcclxuICAgICAgICB0aGlzLl9zZXREaXNwbGF5KGFyclswXSB8fCAwLCBhcnJbMV0gfHwgMCk7XHJcbiAgICB9LFxyXG4gICAgX3RvTWluc1NlY3M6IGZ1bmN0aW9uKHNlY3MpIHtcclxuICAgICAgICB2YXIgbWlucyA9IH5+KHNlY3MgLyA2MCksXHJcbiAgICAgICAgICAgIHNlY3MgPSBzZWNzICUgNjA7XHJcbiAgICAgICAgcmV0dXJuIFttaW5zLCBzZWNzXTtcclxuICAgIH0sXHJcbiAgICBfc2V0RGlzcGxheTogZnVuY3Rpb24obWlucywgc2Vjcykge1xyXG4gICAgICAgIHZhciBtID0gU3RyaW5nKG1pbnMpLFxyXG4gICAgICAgICAgICBzID0gU3RyaW5nKHNlY3MpLFxyXG4gICAgICAgICAgICB0aW1lcyA9IFttLCBzXS5tYXAoZnVuY3Rpb24oeCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyciA9IFN0cmluZyh4KS5zcGxpdCgnJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJyLmxlbmd0aCA8IDIpIGFyci51bnNoaWZ0KCcwJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLm0xLmlubmVySFRNTCA9IHRpbWVzWzBdWzBdO1xyXG4gICAgICAgIHRoaXMubTIuaW5uZXJIVE1MID0gdGltZXNbMF1bMV07XHJcbiAgICAgICAgdGhpcy5zMS5pbm5lckhUTUwgPSB0aW1lc1sxXVswXTtcclxuICAgICAgICB0aGlzLnMyLmlubmVySFRNTCA9IHRpbWVzWzFdWzFdO1xyXG4gICAgfSxcclxuICAgIF9jb3VudGRvd246IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgIHRpbWVyID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIV90aGlzLmZyZWV6ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zZWNvbmRzICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcnIgPSBfdGhpcy5fdG9NaW5zU2VjcyhfdGhpcy5zZWNvbmRzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldERpc3BsYXkoYXJyWzBdLCBhcnJbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5zZWNvbmRzLS07XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9zZXREaXNwbGF5KDAsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGltZXIpO1xyXG4gICAgICAgICAgICB9LCAxMDAwKTtcclxuICAgIH0sXHJcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7IHRoaXMuZnJlZXplID0gZmFsc2U7IHRoaXMuX2NvdW50ZG93bigpOyB9LFxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7IHRoaXMuZnJlZXplID0gdHJ1ZTsgfSxcclxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHsgdGhpcy5fc2V0RGlzcGxheSgwLCAwKTsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb3VudGRvd247IiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJ2YXIgTXVsdGltYXAgPSByZXF1aXJlKCcuL2xpYi9tdWx0aW1hcCcpLFxyXG4gICAgRGFuZ2VyQ2FsY3VsYXRvciA9IHJlcXVpcmUoJy4vZGFuZ2VyLWNhbGN1bGF0b3InKSxcclxuICAgIFNxdWFyZSA9IHJlcXVpcmUoJy4vc3F1YXJlJyksXHJcbiAgICBTZXJpYWxpemVyID0gcmVxdWlyZSgnLi9zZXJpYWxpemVyJyksXHJcbiAgICBHbHlwaHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkdseXBocyxcclxuICAgIE1lc3NhZ2VPdmVybGF5ID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5NZXNzYWdlT3ZlcmxheSxcclxuICAgIERFRkFVTFRfR0FNRV9PUFRJT05TID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5EZWZhdWx0Q29uZmlnLFxyXG4gICAgcmd4X21vYmlsZV9kZXZpY2VzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5Nb2JpbGVEZXZpY2VSZWdleCxcclxuICAgIENvdW50ZG93biA9IHJlcXVpcmUoJy4vY291bnRkb3duJyksXHJcbiAgICBUcmFuc2NyaWJpbmdFbWl0dGVyID0gcmVxdWlyZSgnLi90cmFuc2NyaWJpbmctZW1pdHRlcicpLFxyXG4gICAgVGhlbWVTdHlsZXIgPSByZXF1aXJlKCcuL3RoZW1lLXN0eWxlcicpLFxyXG4gICAgQ29uc29sZVJlbmRlcmVyID0gcmVxdWlyZSgnLi9jb25zb2xlLXJlbmRlcmVyJyksXHJcbiAgICBNaW5lTGF5ZXIgPSByZXF1aXJlKCcuL21pbmVsYXllcicpLFxyXG4gICAgU2NvcmVrZWVwZXIgPSByZXF1aXJlKCcuL3Njb3Jla2VlcGVyJyk7XHJcblxyXG4vLyB3cmFwcGVyIGFyb3VuZCBgJGxvZ2AsIHRvIHRvZ2dsZSBkZXYgbW9kZSBkZWJ1Z2dpbmdcclxudmFyICRsb2cgPSBmdW5jdGlvbiAkbG9nKCkgeyBpZiAoJGxvZy5kZWJ1Z19tb2RlIHx8IGZhbHNlKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9XHJcblxyXG5mdW5jdGlvbiBHYW1lYm9hcmQob3B0aW9ucykge1xyXG4gICAgLy8gdGhlIG1hcCwgc2VydmluZyBhcyB0aGUgaW50ZXJuYWwgcmVwcmVzZW5hdGlvbiBvZiB0aGUgZ2FtZWJvYXJkXHJcbiAgICB0aGlzLmJvYXJkID0gbmV3IE11bHRpbWFwO1xyXG4gICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtvcHRpb25zLmRpbWVuc2lvbnMgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGltZW5zaW9ucztcclxuICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICB0aGlzLm1pbmVzID0gK29wdGlvbnMubWluZXMgfHwgREVGQVVMVF9HQU1FX09QVElPTlMubWluZXM7XHJcbiAgICAvLyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIHRhYmxlIHNlcnZpbmcgYXMgdGhlIGJvYXJkXHJcbiAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5ib2FyZCB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5ib2FyZCk7XHJcbiAgICAvLyBpcyBjdXN0b20gb3IgcHJlc2V0IGdhbWU/XHJcbiAgICB0aGlzLmlzQ3VzdG9tID0gb3B0aW9ucy5pc0N1c3RvbSB8fCBmYWxzZTtcclxuICAgIC8vIHRoZSBldmVudCB0cmFuc2NyaWJlciBmb3IgcGxheWJhY2sgYW5kIHBlcnNpc3RlbmNlXHJcbiAgICB0aGlzLmVtaXR0ZXIgPSBuZXcgVHJhbnNjcmliaW5nRW1pdHRlcjtcclxuICAgIC8vIHNlbGVjdGl2ZWx5IGVuYWJsZSBkZWJ1ZyBtb2RlIGZvciBjb25zb2xlIHZpc3VhbGl6YXRpb25zIGFuZCBub3RpZmljYXRpb25zXHJcbiAgICB0aGlzLmRlYnVnX21vZGUgPSBvcHRpb25zLmRlYnVnX21vZGUgfHwgREVGQVVMVF9HQU1FX09QVElPTlMuZGVidWdfbW9kZTtcclxuICAgICRsb2cuZGVidWdfbW9kZSA9IHRoaXMuZGVidWdfbW9kZTtcclxuICAgIC8vIHNwZWNpZmllcyB0aGUgZGVzaXJlZCBjb2xvciB0aGVtZSBvciBza2luXHJcbiAgICB0aGlzLnRoZW1lID0gdGhpcy5fc2V0Q29sb3JUaGVtZShvcHRpb25zLnRoZW1lIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLnRoZW1lKTtcclxuICAgIC8vIGNvbnRhaW5lciBmb3IgZmxhc2ggbWVzc2FnZXMsIHN1Y2ggYXMgd2luL2xvc3Mgb2YgZ2FtZVxyXG4gICAgdGhpcy5mbGFzaENvbnRhaW5lciA9ICQoTWVzc2FnZU92ZXJsYXkpO1xyXG4gICAgLy8gY2hlY2sgZm9yIGRlc2t0b3Agb3IgbW9iaWxlIHBsYXRmb3JtIChmb3IgZXZlbnQgaGFuZGxlcnMpXHJcbiAgICB0aGlzLmlzTW9iaWxlID0gdGhpcy5fY2hlY2tGb3JNb2JpbGUoKTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxuICAgIC8vIHRoZSBvYmplY3QgdGhhdCBjYWxjdWxhdGVzIHRoZSBudW1iZXIgb2Ygc3Vycm91bmRpbmcgbWluZXMgYXQgYW55IHNxdWFyZVxyXG4gICAgdGhpcy5kYW5nZXJDYWxjID0gbmV3IERhbmdlckNhbGN1bGF0b3IodGhpcyk7XHJcbiAgICAvLyBhZGQgaW4gdGhlIGNvdW50ZG93biBjbG9jay4uLlxyXG4gICAgdGhpcy5jbG9jayA9IG5ldyBDb3VudGRvd24oK29wdGlvbnMudGltZXIgfHwgREVGQVVMVF9HQU1FX09QVElPTlMudGltZXIsICcjY291bnRkb3duJyk7XHJcbiAgICB0aGlzLmNsb2NrLnN0YXJ0KCk7XHJcbiAgICAvLyBjcmVhdGUgdGhlIHNjb3Jla2VlcGluZyBvYmplY3RcclxuICAgIHRoaXMuc2NvcmVrZWVwZXIgPSBuZXcgU2NvcmVrZWVwZXIodGhpcyk7XHJcblxyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIHRyaWdnZXIgZXZlbnQgZm9yIGdhbWUgdG8gYmVnaW4uLi5cclxuICAgIHRoaXMuZW1pdHRlci50cmlnZ2VyKCdnYjpzdGFydCcsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxufVxyXG5cclxuXHJcbkdhbWVib2FyZC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogR2FtZWJvYXJkLFxyXG4gICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgIF9sb2FkQm9hcmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHByZWZpbGwgc3F1YXJlcyB0byByZXF1aXJlZCBkaW1lbnNpb25zLi4uXHJcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgIG1pbmVzID0gdGhpcy5taW5lcyxcclxuICAgICAgICAgICAgcG9wdWxhdGVSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIHBvcHVsYXRlUm93KGksIGRpbWVuc2lvbnMpKTtcclxuXHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIHJhbmRvbSBwb3NpdGlvbnMgb2YgbWluZWQgc3F1YXJlcy4uLlxyXG4gICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAvLyBwcmUtY2FsY3VsYXRlIHRoZSBkYW5nZXIgaW5kZXggb2YgZWFjaCBub24tbWluZWQgc3F1YXJlLi4uXHJcbiAgICAgICAgdGhpcy5fcHJlY2FsY0RhbmdlckluZGljZXMoKTtcclxuXHJcbiAgICAgICAgLy8gZGlzcGxheSBvdXRwdXQgYW5kIGdhbWUgc3RyYXRlZ3kgdG8gdGhlIGNvbnNvbGUuLi5cclxuICAgICAgICBpZiAodGhpcy5kZWJ1Z19tb2RlKSB7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKCk7XHJcbiAgICAgICAgICAgIHRoaXMudG9Db25zb2xlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gbGF5b3V0IHRoZSBIVE1MIDx0YWJsZT4gcm93cy4uLlxyXG4gICAgICAgIHRoaXMuX2NyZWF0ZUhUTUxHcmlkKHRoaXMuZGltZW5zaW9ucyk7XHJcbiAgICAgICAgLy8gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBjb2xvciB0aGVtZS4uLlxyXG4gICAgICAgIHRoaXMuX3NldENvbG9yVGhlbWUodGhpcy50aGVtZSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgdmFyIGxvY3MgPSBuZXcgTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSwgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGxvY3MuZm9yRWFjaChmdW5jdGlvbihsb2MpIHsgX3RoaXMuZ2V0U3F1YXJlQXQobG9jWzBdLCBsb2NbMV0pLm1pbmUoKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihzYWZlKSB7IHNhZmUuc2V0RGFuZ2VyKF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9jcmVhdGVIVE1MR3JpZDogZnVuY3Rpb24oZGltZW5zaW9ucykge1xyXG4gICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKSB7XHJcbiAgICAgICAgICAgIGdyaWQgKz0gXCI8dHIgaWQ9J3Jvd1wiICsgaSArIFwiJz5cIlxyXG4gICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICArICBcIjwvdHI+XCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgIH0sXHJcbiAgICBfc2V0Q29sb3JUaGVtZTogZnVuY3Rpb24odGhlbWUpIHtcclxuICAgICAgICBUaGVtZVN0eWxlci5zZXQodGhlbWUsIHRoaXMuJGVsKTtcclxuICAgICAgICByZXR1cm4gdGhlbWU7XHJcbiAgICB9LFxyXG4gICAgX2NoZWNrRm9yTW9iaWxlOiBmdW5jdGlvbigpIHsgcmV0dXJuIHJneF9tb2JpbGVfZGV2aWNlcy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSk7IH0sXHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmlzTW9iaWxlKSB7XHJcbiAgICAgICAgICAgIC8vIGZvciB0b3VjaCBldmVudHM6IHRhcCA9PSBjbGljaywgaG9sZCA9PSByaWdodCBjbGlja1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vbih7XHJcbiAgICAgICAgICAgICAgICB0YXA6IHRoaXMuX2hhbmRsZUNsaWNrLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBob2xkOiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgICAgICBjbGljazogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGNvbnRleHRtZW51OiB0aGlzLl9oYW5kbGVSaWdodENsaWNrLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSBhZnRlciBkZXZlbG9wbWVudCBlbmRzLi4uZm9yIGRlYnVnIHVzZSBvbmx5IVxyXG4gICAgICAgIC8vIElORElWSURVQUwgU1FVQVJFIEVWRU5UU1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6b3BlbicsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiT3BlbmluZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6Y2xvc2UnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkNsb3Npbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIkZsYWdnaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHsgJGxvZyhcIlVuZmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICAvLyBHQU1FQk9BUkQtV0lERSBFVkVOVFNcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJMZXQgdGhlIGdhbWUgYmVnaW4hXCIsIGFyZ3VtZW50cyk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6ZW5kOndpbicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3Ugd2luIVwiKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6b3ZlcicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyAkbG9nKFwiR2FtZSBvdmVyISBZb3UncmUgZGVhZCFcIik7IH0pO1xyXG4gICAgfSxcclxuICAgIF9yZW1vdmVFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kZWwub2ZmKCk7XHJcbiAgICAgICAgLy8gdHVybiBvZmYgdG91Y2ggZXZlbnRzIGFzIHdlbGxcclxuICAgICAgICB0aGlzLiRlbC5oYW1tZXIoKS5vZmYoKTtcclxuICAgIH0sXHJcbiAgICBfaGFuZGxlQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICAvLyBUT0RPOiBhbHNvIGhhbmRsZSBmaXJzdC1jbGljay1jYW4ndC1iZS1taW5lIChpZiB3ZSdyZSBmb2xsb3dpbmcgdGhhdCBydWxlKVxyXG4gICAgICAgIC8vIGhlcmUsIGlmIHVzZXJNb3ZlcyA9PT0gMC4uLiA6bWVzc2FnZSA9PiA6bXVsbGlnYW4/XHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuICAgICAgICB2YXIgY3Vycl9vcGVuID0gdGhpcy5fZ2V0T3BlbmVkU3F1YXJlc0NvdW50KCk7XHJcblxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSAmJiAhc3F1YXJlLmlzTWluZWQoKSAmJiAhc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX29wZW5TcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgaWYgKCFzcXVhcmUuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKHNxdWFyZSk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSkge1xyXG4gICAgICAgICAgICAkY2VsbC5hZGRDbGFzcygna2lsbGVyLW1pbmUnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVPdmVyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9ldmFsdWF0ZUZvckdhbWVXaW4oKTtcclxuXHJcbiAgICAgICAgdmFyIG9wZW5lZF9zcXVhcmVzID0gdGhpcy5fZ2V0T3BlbmVkU3F1YXJlc0NvdW50KCkgLSBjdXJyX29wZW47XHJcbiAgICAgICAgJGxvZyhcIkp1c3Qgb3BlbmVkICVvIHNxdWFyZXMuLi50ZWxsaW5nIHNjb3Jlci5cXG5Vc2VyIG1vdmVzOiAlby5cIiwgb3BlbmVkX3NxdWFyZXMsIHRoaXMudXNlck1vdmVzKTtcclxuICAgICAgICB0aGlzLnNjb3Jla2VlcGVyLnVwKG9wZW5lZF9zcXVhcmVzKTtcclxuICAgIH0sXHJcbiAgICBfaGFuZGxlUmlnaHRDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KSxcclxuICAgICAgICAgICAgJGNlbGwgPSAkdGFyZ2V0LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc3BhbicgPyAkdGFyZ2V0LnBhcmVudCgpIDogJHRhcmdldCxcclxuICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgIC8vIHN0b3AgdGhlIGNvbnRleHRtZW51IGZyb20gcG9wcGluZyB1cCBvbiBkZXNrdG9wIGJyb3dzZXJzXHJcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpXHJcbiAgICAgICAgICAgIHRoaXMuX2ZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBlbHNlIGlmIChzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fdW5mbGFnU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgIHRoaXMuX2Nsb3NlU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9ldmFsdWF0ZUZvckdhbWVXaW4oKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSxcclxuICAgIC8vIGhhbmRsZXMgYXV0b2NsZWFyaW5nIG9mIHNwYWNlcyBhcm91bmQgdGhlIG9uZSBjbGlja2VkXHJcbiAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAvLyBiYXNlZCBvbiBgc291cmNlYCBzcXVhcmUsIHdhbGsgYW5kIHJlY3Vyc2l2ZWx5IHJldmVhbCBjb25uZWN0ZWQgc3BhY2VzXHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kKSxcclxuICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICBjZWxsID0gc291cmNlLmdldENlbGwoKSxcclxuICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmICFuZWlnaGJvci5pc0ZsYWdnZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fb3BlblNxdWFyZShuZWlnaGJvcik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFuZWlnaGJvci5nZXREYW5nZXIoKSB8fCAhbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9yZWN1cnNpdmVSZXZlYWwobmVpZ2hib3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LFxyXG4gICAgX29wZW5TcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpvcGVuXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfY2xvc2VTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmNsb3NlKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgZmlyZUV2ZW50ICYmIHRoaXMuZW1pdHRlci50cmlnZ2VyKFwic3E6Y2xvc2VcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9mbGFnU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS5mbGFnKCk7XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgZmlyZUV2ZW50ID0gKGZpcmVFdmVudCA9PSBudWxsKSA/IHRydWUgOiBmaXJlRXZlbnQ7XHJcbiAgICAgICAgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLnJlbW92ZUNsYXNzKCdjbG9zZWQnKTtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpmbGFnXCIsIHNxdWFyZSwgdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpKTtcclxuICAgIH0sXHJcbiAgICBfdW5mbGFnU3F1YXJlOiBmdW5jdGlvbihzcXVhcmUsIGZpcmVFdmVudCkge1xyXG4gICAgICAgIHNxdWFyZS51bmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTp1bmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9nZXRPcGVuZWRTcXVhcmVzQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5nZXRTcXVhcmVzKCkuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc09wZW4oKTsgfSkubGVuZ3RoOyB9LFxyXG4gICAgX2V2YWx1YXRlRm9yR2FtZVdpbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIG5vdE1pbmVkID0gdGhpcy5nZXRTcXVhcmVzKCkuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KS5sZW5ndGg7XHJcbiAgICAgICAgaWYgKG5vdE1pbmVkID09PSB0aGlzLl9nZXRPcGVuZWRTcXVhcmVzQ291bnQoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVXaW4oKTtcclxuICAgIH0sXHJcbiAgICBfZmxhc2hNc2c6IGZ1bmN0aW9uKG1zZywgaXNBbGVydCkge1xyXG4gICAgICAgIHRoaXMuZmxhc2hDb250YWluZXJcclxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhpc0FsZXJ0ID8gJ2dhbWUtb3ZlcicgOiAnZ2FtZS13aW4nKVxyXG4gICAgICAgICAgICAgICAgLmh0bWwobXNnKVxyXG4gICAgICAgICAgICAgICAgLnNob3coKTtcclxuICAgIH0sXHJcbiAgICBfcHJlcGFyZUZpbmFsUmV2ZWFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpXHJcbiAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KVxyXG4gICAgICAgICAgICAuZm9yRWFjaChmdW5jdGlvbihmKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5nZXRHcmlkQ2VsbChmKS5maW5kKCcuZGFuZ2VyJykuaHRtbChmLmdldERhbmdlcigpKTtcclxuICAgICAgICAgICAgICAgIF90aGlzLl91bmZsYWdTcXVhcmUoZiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLl9yZW1vdmVFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIHRoaXMuY2xvY2suc3RvcCgpO1xyXG4gICAgICAgIHRoaXMuc2NvcmVrZWVwZXIuY2xvc2UoKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZVdpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS13aW4nKTtcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgJGxvZyhcIi0tLSAgR0FNRSBXSU4hICAtLS1cIik7XHJcbiAgICAgICAgJGxvZyhcIlVzZXIgbW92ZXM6ICVvXCIsIHRoaXMudXNlck1vdmVzKVxyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKCc8c3Bhbj5HYW1lIE92ZXIhPC9zcGFuPjxhIGhyZWY9XCIjXCIgY2xhc3M9XCJyZXBsYXlcIj5DbGljayBoZXJlIHRvIHBsYXkgYWdhaW4uLi48L2E+Jyk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOmVuZDp3aW4nLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX2dhbWVPdmVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLl9wcmVwYXJlRmluYWxSZXZlYWwoKTtcclxuXHJcbiAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtb3ZlcicpO1xyXG4gICAgICAgIC8vIG9wZW4vcmV2ZWFsIGFsbCBzcXVhcmVzXHJcbiAgICAgICAgdGhpcy4kZWxcclxuICAgICAgICAgICAgLmZpbmQoJy5zcXVhcmUnKVxyXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCBmbGFnZ2VkJylcclxuICAgICAgICAgICAgLmFkZENsYXNzKCdvcGVuJyk7XHJcblxyXG4gICAgICAgIC8vIHB1dCB1cCAnR2FtZSBPdmVyJyBiYW5uZXJcclxuICAgICAgICAkbG9nKCctLS0gIEdBTUUgT1ZFUiEgIC0tLScpO1xyXG4gICAgICAgIHRoaXMuX2ZsYXNoTXNnKCc8c3Bhbj5HYW1lIE92ZXIhPC9zcGFuPjxhIGhyZWY9XCIjXCIgY2xhc3M9XCJyZXBsYXlcIj5DbGljayBoZXJlIHRvIHBsYXkgYWdhaW4uLi48L2E+JywgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOmVuZDpvdmVyJywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHZhciAkY2VsbCA9IHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSxcclxuICAgICAgICAgICAgZ2V0Q29udGVudHMgPSBmdW5jdGlvbihzcSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNxLmlzRmxhZ2dlZCgpKSByZXR1cm4gR2x5cGhzLkZMQUc7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNNaW5lZCgpKSByZXR1cm4gR2x5cGhzLk1JTkU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gISFzcS5nZXREYW5nZXIoKSA/IHNxLmdldERhbmdlcigpIDogJyc7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiBnZXRDb250ZW50cyhzcXVhcmUpIH0pO1xyXG5cclxuICAgICAgICAkY2VsbC5lbXB0eSgpLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcblxyXG4gICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKClcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnc3F1YXJlJylcclxuICAgICAgICAgICAgIC5hZGRDbGFzcygnY2VsbCcgKyBzcXVhcmUuZ2V0Q2VsbCgpKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKHNxdWFyZS5nZXRTdGF0ZSgpLmpvaW4oJyAnKSk7XHJcblxyXG4gICAgICAgIC8vIGF0dGFjaCB0aGUgU3F1YXJlIHRvIHRoZSBkYXRhIGFzc29jaWF0ZWQgd2l0aCB0aGUgZ3JpZCBjZWxsXHJcbiAgICAgICAgJGNlbGwuZGF0YSgnc3F1YXJlJywgc3F1YXJlKTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gXCJQVUJMSUNcIiBNRVRIT0RTXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpLmZvckVhY2godGhpcy5fcmVuZGVyU3F1YXJlLmJpbmQodGhpcykpO1xyXG4gICAgICAgIC8vIHJldHVybiBgdGhpc2AsIHNvIHRoaXMgbWV0aG9kIGNhbiBiZSBjaGFpbmVkIHRvIGl0cyBpbml0aWFsaXphdGlvbiBjYWxsXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgYSBTcXVhcmUgaW5zdGFuY2UgYXMgYSBwYXJhbSwgcmV0dXJucyBhIGpRdWVyeS13cmFwcGVkIERPTSBub2RlIG9mIGl0cyBjZWxsXHJcbiAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuJGVsXHJcbiAgICAgICAgICAgICAgICAuZmluZCgnI3JvdycgKyBzcXVhcmUuZ2V0Um93KCkpXHJcbiAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgLmVxKHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgfSxcclxuICAgIC8vIHRha2VzIHJvdyBhbmQgY2VsbCBjb29yZGluYXRlcyBhcyBwYXJhbXMsIHJldHVybnMgdGhlIGFzc29jaWF0ZWQgU3F1YXJlIGluc3RhbmNlXHJcbiAgICBnZXRTcXVhcmVBdDogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgcmV0dXJuIChyb3cgJiYgcm93WzBdICYmIHJvd1swXVtjZWxsXSkgPyByb3dbMF1bY2VsbF0gOiBudWxsO1xyXG4gICAgfSxcclxuICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmJvYXJkXHJcbiAgICAgICAgICAgICAgICAudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICB9LFxyXG4gICAgLy8gZXhwb3J0IHNlcmlhbGl6ZWQgc3RhdGUgdG8gcGVyc2lzdCBnYW1lIGZvciBsYXRlclxyXG4gICAgZXhwb3J0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBuZWVkIGdhbWVPcHRpb25zLCBtZXRhZGF0YSBvbiBkYXRldGltZS9ldGMuLCBzZXJpYWxpemUgYWxsIHNxdWFyZXMnIHN0YXRlc1xyXG4gICAgICAgIHJldHVybiBTZXJpYWxpemVyLmV4cG9ydCh0aGlzKTtcclxuICAgIH0sXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gQ29uc29sZVJlbmRlcmVyLnRvKCRsb2cpLndpdGhWYWx1ZXModGhpcy5ib2FyZC52YWx1ZXMoKSk7XHJcbiAgICAgICAgcmV0dXJuICh3aXRoRGFuZ2VyKSA/IHJlbmRlcmVyLnZpZXdHYW1lKCkgOiByZW5kZXJlci52aWV3TWluZXMoKTtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR2FtZWJvYXJkOyIsIlxyXG4vLyBAdXNhZ2UgdmFyIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsnRl9PUEVOJywgJ0ZfTUlORUQnLCAnRl9GTEFHR0VEJywgJ0ZfSU5ERVhFRCddKTsgYmYgPSBuZXcgQml0RmxhZ3M7XHJcbmZ1bmN0aW9uIEJpdEZsYWdGYWN0b3J5KGFyZ3MpIHtcclxuXHJcbiAgICB2YXIgYmluVG9EZWMgPSBmdW5jdGlvbihzdHIpIHsgcmV0dXJuIHBhcnNlSW50KHN0ciwgMik7IH0sXHJcbiAgICAgICAgZGVjVG9CaW4gPSBmdW5jdGlvbihudW0pIHsgcmV0dXJuIG51bS50b1N0cmluZygyKTsgfSxcclxuICAgICAgICBidWlsZFN0YXRlID0gZnVuY3Rpb24oYXJyKSB7IHJldHVybiBwYWQoYXJyLm1hcChmdW5jdGlvbihwYXJhbSkgeyByZXR1cm4gU3RyaW5nKCtwYXJhbSk7IH0pLnJldmVyc2UoKS5qb2luKCcnKSk7IH0sXHJcbiAgICAgICAgcGFkID0gZnVuY3Rpb24gKHN0ciwgbWF4KSB7XHJcbiAgICAgICAgICBtYXggfHwgKG1heCA9IDQgLyogdGhpcy5ERUZBVUxUX1NJWkUubGVuZ3RoICovKTtcclxuICAgICAgICAgIHZhciBkaWZmID0gbWF4IC0gc3RyLmxlbmd0aDtcclxuICAgICAgICAgIGZvciAodmFyIGFjYz1bXTsgZGlmZiA+IDA7IGFjY1stLWRpZmZdID0gJzAnKSB7fVxyXG4gICAgICAgICAgcmV0dXJuIGFjYy5qb2luKCcnKSArIHN0cjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmhhcyh0aGlzW25hbWVdKTsgfSB9LFxyXG4gICAgICAgIGNyZWF0ZVF1ZXJ5TWV0aG9kTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgaWYgKH5uYW1lLmluZGV4T2YoJ18nKSlcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cmluZyhuYW1lLmluZGV4T2YoJ18nKSArIDEpO1xyXG4gICAgICAgICAgICByZXR1cm4gJ2lzJyArIG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFN0YXRlcyA9IGZ1bmN0aW9uKGFyZ3MsIHByb3RvKSB7XHJcbiAgICAgICAgICAgIGlmICghYXJncy5sZW5ndGgpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHByb3RvLl9zdGF0ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPWFyZ3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmbGFnTmFtZSA9IFN0cmluZyhhcmdzW2ldKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsc05hbWUgPSBmbGFnTmFtZS50b0xvd2VyQ2FzZSgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gTWF0aC5wb3coMiwgaSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2ROYW1lID0gY3JlYXRlUXVlcnlNZXRob2ROYW1lKGNsc05hbWUpLFxyXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5TWV0aG9kID0gY3JlYXRlUXVlcnlNZXRob2QoZmxhZ05hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIHByb3RvW2ZsYWdOYW1lXSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgcHJvdG8uX3N0YXRlc1tpXSA9IGNsc05hbWU7XHJcbiAgICAgICAgICAgICAgICBwcm90b1txdWVyeU1ldGhvZE5hbWVdID0gcXVlcnlNZXRob2Q7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcHJvdG8uREVGQVVMVF9TVEFURSA9IHBhZCgnJywgaSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBCaXRGbGFncygpIHtcclxuICAgICAgICB0aGlzLl9mbGFncyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgID8gYnVpbGRTdGF0ZShbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpXHJcbiAgICAgICAgICAgIDogdGhpcy5ERUZBVUxUX1NUQVRFO1xyXG4gICAgfVxyXG5cclxuICAgIEJpdEZsYWdzLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcjogQml0RmxhZ3MsXHJcbiAgICAgICAgaGFzOiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiAhIShiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiBmbGFnKTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuIHRoaXMuX2ZsYWdzID0gcGFkKGRlY1RvQmluKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSB8IGZsYWcpKTsgfSxcclxuICAgICAgICB1bnNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpICYgfmZsYWcpKTsgfSxcclxuICAgICAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyBfZmxhZ3M6IHRoaXMuX2ZsYWdzIH07IH1cclxuICAgIH07XHJcblxyXG4gICAgQml0RmxhZ3Mud2l0aERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHsgcmV0dXJuIG5ldyBCaXRGbGFncyhkZWZhdWx0cyk7IH07XHJcblxyXG4gICAgc2V0U3RhdGVzKGFyZ3MsIEJpdEZsYWdzLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcmV0dXJuIEJpdEZsYWdzO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEJpdEZsYWdGYWN0b3J5OyIsIlxyXG5mdW5jdGlvbiBFbWl0dGVyKCkge1xyXG4gICAgdGhpcy5fZXZlbnRzID0ge307XHJcbn1cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IEVtaXR0ZXIsXHJcbiAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XSA9IHRoaXMuX2V2ZW50c1tldmVudF0gfHwgW107XHJcbiAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XS5wdXNoKGZuKTtcclxuICAgIH0sXHJcbiAgICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xyXG4gICAgICAgIGlmICh0aGlzLl9ldmVudHNbZXZlbnRdICE9PSBmYWxzZSlcclxuICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XS5zcGxpY2UodGhpcy5fZXZlbnRzW2V2ZW50XS5pbmRleE9mKGZuKSwgMSk7XHJcbiAgICB9LFxyXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24oZXZlbnQgLyosIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj10aGlzLl9ldmVudHNbZXZlbnRdLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XVtpXS5hcHBseSh0aGlzLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyOyIsIi8vIExpbmVhciBDb25ncnVlbnRpYWwgR2VuZXJhdG9yOiB2YXJpYW50IG9mIGEgTGVobWFuIEdlbmVyYXRvclxyXG4vLyBiYXNlZCBvbiBMQ0cgZm91bmQgaGVyZTogaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vUHJvdG9uaz9wYWdlPTRcclxudmFyIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvciA9IChmdW5jdGlvbigpe1xyXG4gIC8vIFNldCB0byB2YWx1ZXMgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL051bWVyaWNhbF9SZWNpcGVzXHJcbiAgLy8gbSBpcyBiYXNpY2FsbHkgY2hvc2VuIHRvIGJlIGxhcmdlIChhcyBpdCBpcyB0aGUgbWF4IHBlcmlvZClcclxuICAvLyBhbmQgZm9yIGl0cyByZWxhdGlvbnNoaXBzIHRvIGEgYW5kIGNcclxuICBmdW5jdGlvbiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IoKSB7XHJcbiAgICAgIHRoaXMubSA9IDQyOTQ5NjcyOTY7XHJcbiAgICAgIC8vIGEgLSAxIHNob3VsZCBiZSBkaXZpc2libGUgYnkgbSdzIHByaW1lIGZhY3RvcnNcclxuICAgICAgdGhpcy5hID0gMTY2NDUyNTtcclxuICAgICAgLy8gYyBhbmQgbSBzaG91bGQgYmUgY28tcHJpbWVcclxuICAgICAgdGhpcy5jID0gMTAxMzkwNDIyMztcclxuICAgICAgdGhpcy5zZWVkID0gdm9pZCAwO1xyXG4gICAgICB0aGlzLnogPSB2b2lkIDA7XHJcbiAgICAgIC8vIGluaXRpYWwgcHJpbWluZyBvZiB0aGUgZ2VuZXJhdG9yLCB1bnRpbCBsYXRlciBvdmVycmlkZW5cclxuICAgICAgdGhpcy5zZXRTZWVkKCk7XHJcbiAgfVxyXG4gIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvci5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLFxyXG4gICAgc2V0U2VlZDogZnVuY3Rpb24odmFsKSB7IHRoaXMueiA9IHRoaXMuc2VlZCA9IHZhbCB8fCBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiB0aGlzLm0pOyB9LFxyXG4gICAgZ2V0U2VlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnNlZWQ7IH0sXHJcbiAgICByYW5kOiBmdW5jdGlvbigpIHtcclxuICAgICAgLy8gZGVmaW5lIHRoZSByZWN1cnJlbmNlIHJlbGF0aW9uc2hpcFxyXG4gICAgICB0aGlzLnogPSAodGhpcy5hICogdGhpcy56ICsgdGhpcy5jKSAlIHRoaXMubTtcclxuICAgICAgLy8gcmV0dXJuIGEgZmxvYXQgaW4gWzAsIDEpXHJcbiAgICAgIC8vIGlmIHogPSBtIHRoZW4geiAvIG0gPSAwIHRoZXJlZm9yZSAoeiAlIG0pIC8gbSA8IDEgYWx3YXlzXHJcbiAgICAgIHJldHVybiB0aGlzLnogLyB0aGlzLm07XHJcbiAgICB9XHJcbiAgfTtcclxuICByZXR1cm4gTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yO1xyXG59KSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7IiwiXHJcbmZ1bmN0aW9uIE11bHRpbWFwKCkge1xyXG4gICAgdGhpcy5fdGFibGUgPSBbXTtcclxufVxyXG5cclxuTXVsdGltYXAucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IE11bHRpbWFwLFxyXG4gICAgZ2V0OiBmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihmbikgeyByZXR1cm4gW10uZm9yRWFjaC5jYWxsKHRoaXMudmFsdWVzKCksIGZuKTsgfSxcclxuICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiBfdGhpcy5fdGFibGVbcm93XTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH0sXHJcbiAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTXVsdGltYXA7IiwiXHJcbnZhciBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IgPSByZXF1aXJlKCcuL2xpYi9sY2dlbmVyYXRvcicpO1xyXG5cclxuZnVuY3Rpb24gTWluZUxheWVyKG1pbmVzLCBkaW1lbnNpb25zKSB7XHJcbiAgICB0aGlzLmdlbmVyYXRvciA9IG5ldyBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbiAgICB0aGlzLm1pbmVzID0gK21pbmVzIHx8IDA7XHJcbiAgICB0aGlzLmRpbWVuc2lvbnMgPSArZGltZW5zaW9ucyB8fCAwO1xyXG5cclxuICAgIHZhciByYW5kcyA9IFtdLFxyXG4gICAgICAgIF90aGlzID0gdGhpcyxcclxuICAgICAgICBnZXRSYW5kb21OdW1iZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIF90aGlzLmdlbmVyYXRvci5yYW5kKCkgKiAoTWF0aC5wb3coX3RoaXMuZGltZW5zaW9ucywgMikpIHwgMDsgfTtcclxuXHJcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBtaW5lczsgKytpKSB7XHJcbiAgICAgICAgdmFyIHJuZCA9IGdldFJhbmRvbU51bWJlcigpO1xyXG5cclxuICAgICAgICBpZiAoIX5yYW5kcy5pbmRleE9mKHJuZCkpXHJcbiAgICAgICAgICAgIHJhbmRzLnB1c2gocm5kKTtcclxuICAgICAgICAvLyAuLi5vdGhlcndpc2UsIGdpdmUgaXQgYW5vdGhlciBnby0ncm91bmQ6XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG1pbmVzKys7XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmxvY2F0aW9ucyA9IHJhbmRzLm1hcChmdW5jdGlvbihybmQpIHtcclxuICAgICAgICB2YXIgcm93ID0gfn4ocm5kIC8gZGltZW5zaW9ucyksXHJcbiAgICAgICAgICAgIGNlbGwgPSBybmQgJSBkaW1lbnNpb25zO1xyXG4gICAgICAgIHJldHVybiBbIHJvdywgY2VsbCBdO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMubG9jYXRpb25zO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1pbmVMYXllcjsiLCJmdW5jdGlvbiBTY29yZWtlZXBlcihnYW1lYm9hcmQpIHtcclxuICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICB0aGlzLmNhbGxiYWNrcyA9IHtcclxuICAgIHVwOiBmdW5jdGlvbiB1cChwdHMpIHsgdGhpcy5zY29yZSArPSBwdHM7IH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbiBkb3duKHB0cykgeyB0aGlzLnNjb3JlID0gKHRoaXMuc2NvcmUgLSBwdHMgPD0gMCkgPyAwIDogdGhpcy5zY29yZSAtIHB0czsgfVxyXG4gIH07XHJcblxyXG4gIHRoaXMuZmluYWxpemVycyA9IHtcclxuICAgIGZvck9wZW5pbmdTcXVhcmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgbW92ZXMgPSBnYW1lYm9hcmQudXNlck1vdmVzLFxyXG4gICAgICAgICAgICB1bm1pbmVkID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpIC0gZ2FtZWJvYXJkLm1pbmVzO1xyXG4gICAgICAgIHJldHVybiAxIC0gKH5+KG1vdmVzIC8gdW5taW5lZCkgKiAxMCk7XHJcbiAgICB9LFxyXG4gICAgZm9yVGltZVBhc3NlZDogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIHRvdGFsID0gZ2FtZWJvYXJkLmNsb2NrLmluaXRpYWwsIGVsYXBzZWQgPSBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcztcclxuICAgICAgICByZXR1cm4gMTAwIC0gfn4oZWxhcHNlZCAvIHRvdGFsICogMTAwKTtcclxuICAgIH0sXHJcbiAgICBmb3JGZXdlc3RNb3ZlczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgLy8gZXhwZXJpbWVudGFsOiBzcXJ0KHheMiAtIHgpICogMTBcclxuICAgICAgICB2YXIgZGltcyA9IE1hdGgucG93KGdhbWVib2FyZC5kaW1lbnNpb25zLCAyKTtcclxuICAgICAgICByZXR1cm4gfn4oTWF0aC5zcXJ0KGRpbXMgLSBnYW1lYm9hcmQudXNlck1vdmVzKSAqIDEwKTtcclxuICAgIH0sXHJcbiAgICBmb3JGaW5hbE1pc2ZsYWdnaW5nczogZnVuY3Rpb24oZ2FtZWJvYXJkKSB7XHJcbiAgICAgICAgdmFyIHNxdWFyZXMgPSBnYW1lYm9hcmQuZ2V0U3F1YXJlcygpLFxyXG4gICAgICAgICAgICBmbGFnZ2VkID0gc3F1YXJlcy5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KSxcclxuICAgICAgICAgICAgbWlzZmxhZ2dlZCA9IGZsYWdnZWQuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KTtcclxuICAgICAgICByZXR1cm4gKG1pc2ZsYWdnZWQubGVuZ3RoICogMTApIHx8IDA7XHJcbiAgICB9LFxyXG4gICAgZm9yQ29ycmVjdEZsYWdnaW5nOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgbWluZXMgPSBnYW1lYm9hcmQubWluZXMsXHJcbiAgICAgICAgICAgIHNxdWFyZXMgPSBnYW1lYm9hcmQuZ2V0U3F1YXJlcygpLFxyXG4gICAgICAgICAgICBmbGFnZ2VkID0gc3F1YXJlcy5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzRmxhZ2dlZCgpOyB9KSxcclxuICAgICAgICAgICAgZmxhZ2dlZE1pbmVzID0gc3F1YXJlcy5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzTWluZWQoKTsgfSksXHJcbiAgICAgICAgICAgIHBjdCA9IH5+KGZsYWdnZWRNaW5lcy5sZW5ndGggLyBtaW5lcyk7XHJcbiAgICAgICAgcmV0dXJuIE1hdGguY2VpbCgobWluZXMgKiAxMCkgKiBwY3QpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHRoaXMucXVldWUgPSBbXTtcclxuICB0aGlzLmZpbmFsID0gW107XHJcblxyXG4gIC8vIFRPRE86IHdlYW4gdGhpcyBjbGFzcyBvZmYgZGVwZW5kZW5jeSBvbiBnYW1lYm9hcmRcclxuICAvLyBzaG91bGQgb25seSBuZWVkIHRvIGhhdmUgY3RvciBpbmplY3RlZCB3aXRoIHRoZSBnYW1lYm9hcmQncyBlbWl0dGVyXHJcbiAgdGhpcy5nYW1lYm9hcmQgPSBnYW1lYm9hcmQ7XHJcbiAgdGhpcy5lbWl0dGVyID0gZ2FtZWJvYXJkLmVtaXR0ZXI7XHJcbiAgdGhpcy5zY29yZSA9IDA7XHJcblxyXG4gIHRoaXMubnN1ID0gdGhpcy5fZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0KCk7XHJcbiAgdGhpcy5lbmRHYW1lID0gZmFsc2U7IC8vIGlmIGdhbWUgaXMgbm93IG92ZXIsIGZsdXNoIHF1ZXVlc1xyXG4gIHRoaXMudGltZXIgPSBzZXRJbnRlcnZhbCh0aGlzLl90aWNrLmJpbmQoX3RoaXMpLCB0aGlzLm5zdSk7XHJcblxyXG4gIGNvbnNvbGUubG9nKFwiU2NvcmVrZWVwZXIgaW5pdGlhbGl6ZWQuICA6c2NvcmUgPT4gJW8sIDp0aW1lciA9PiAlb1wiLCB0aGlzLnNjb3JlLCB0aGlzLnRpbWVyKTtcclxuICB0aGlzLl9zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBwb3MocHRzKSB7IHJldHVybiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcbmZ1bmN0aW9uIG5lZyhwdHMpIHsgcmV0dXJuIC0xICogTWF0aC5hYnMoK3B0cykgfHwgMDsgfVxyXG5cclxuU2NvcmVrZWVwZXIucHJvdG90eXBlID0ge1xyXG4gICAgX3NldHVwRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpvcGVuJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7XHJcbiAgICAgICAgLy8gY2hlY2sgZGFuZ2VyIGluZGV4Li4uaWYgbm90ID4gMSwgbm90IGB1cGBzIGZvciB0aGF0IVxyXG5cclxuICAgICAgfSk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6Y2xvc2UnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpmbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7fSk7XHJcbiAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6dW5mbGFnJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7fSk7XHJcblxyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOnN0YXJ0JywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IC8qIFNUQVJUIFRIRSBTQ09SRUtFRVBFUiAqLyB9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6d2luJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IF90aGlzLmVuZEdhbWUgPSB0cnVlOyAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyB9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6b3ZlcicsIGZ1bmN0aW9uKGVuYW1lLCBnYW1lYm9hcmQsICRlbCkgeyBfdGhpcy5lbmRHYW1lID0gdHJ1ZTsgLyogU1RPUCBUSEUgU0NPUkVLRUVQRVIgKi8gfSk7XHJcbiAgICB9LFxyXG4gICAgX2RldGVybWluZVNpZ25pZmljYW50VW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGlzQ3VzdG9tID0gdGhpcy5nYW1lYm9hcmQuaXNDdXN0b20sXHJcbiAgICAgICAgICAgIHMgPSB0aGlzLmdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICBTRUNPTkRTID0gMTAwMCwgLy8gbWlsbGlzZWNvbmRzXHJcbiAgICAgICAgICAgIGdldE1heFRpbWUgPSBmdW5jdGlvbih0aW1lKSB7IHJldHVybiBNYXRoLm1heCh0aW1lLCAxICogU0VDT05EUykgfTtcclxuXHJcbiAgICAgICAgaWYgKHMgLyAxMDAgPj0gMSlcclxuICAgICAgICAgICAgcmV0dXJuIGdldE1heFRpbWUofn4ocyAvIDI1MCAqIFNFQ09ORFMpKTtcclxuICAgICAgICBlbHNlIGlmIChzIC8gMTAgPj0gMSlcclxuICAgICAgICAgICAgcmV0dXJuIGdldE1heFRpbWUoNSAqIFNFQ09ORFMpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIDEgKiBTRUNPTkRTO1xyXG4gICAgfSxcclxuICAgIF9zb3J0ZWRJbnNlcnQ6IGZ1bmN0aW9uKHgpIHtcclxuICAgICAgICB2YXIgbG8gPSAwLCBoaSA9IHRoaXMucXVldWUubGVuZ3RoO1xyXG4gICAgICAgIHdoaWxlIChsbyA8IGhpKSB7XHJcbiAgICAgICAgICAgIHZhciBtaWQgPSB+figobG8gKyBoaSkgLyAyKTtcclxuICAgICAgICAgICAgaWYgKHgudGltZSA8IHRoaXMucXVldWVbbWlkXS50aW1lKVxyXG4gICAgICAgICAgICAgICAgaGkgPSBtaWQ7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxvID0gbWlkICsgMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGxvO1xyXG4gICAgfSxcclxuICAgIF9lbnF1ZXVlOiBmdW5jdGlvbih4KSB7IHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSh0aGlzLl9zb3J0ZWRJbnNlcnQoeCksIDAsIHgpOyB9LFxyXG4gICAgX3Byb2Nlc3NFdmVudDogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmNhbGxiYWNrc1tldmVudC50eXBlXTtcclxuICAgICAgICBpZiAoZm4gIT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIChmbi5sZW5ndGggPiAxKVxyXG4gICAgICAgICAgICAgICAgPyBmbi5jYWxsKHRoaXMsIGV2ZW50LnB0cywgZnVuY3Rpb24oZXJyKSB7IGlmICghZXJyKSByZXR1cm4gdm9pZCAwOyB9KVxyXG4gICAgICAgICAgICAgICAgOiBjb25zb2xlLmxvZyhcIjxzY29yZSBldmVudDogJW8+OiA6b2xkIFslb11cIiwgZm4ubmFtZSwgdGhpcy5zY29yZSksIGZuLmNhbGwodGhpcywgZXZlbnQucHRzKSwgY29uc29sZS5sb2coXCIuLi46bmV3ID0+IFslb11cIiwgdGhpcy5zY29yZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gY29uc29sZS5sb2coXCJbU2NvcmVrZWVwZXJdIGNvdWxkIG5vdCBmaW5kIGZ1bmN0aW9uIFwiICsgZXZlbnQudHlwZSk7XHJcbiAgICB9LFxyXG4gICAgX3Byb2Nlc3NGaW5hbGl6ZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICBmb3IgKHZhciB2aXNpdG9yIGluIHRoaXMuZmluYWxpemVycykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIjxmaW5hbGl6ZXI6ICVvPjogOm9sZCBbJW9dID0+IDpuZXcgWyVvXS4uLiBcIiwgdmlzaXRvciwgdGhpcy5zY29yZSwgKHRoaXMuc2NvcmUgKz0gdGhpcy5maW5hbGl6ZXJzW3Zpc2l0b3JdKHRoaXMuZ2FtZWJvYXJkKSkpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLnNjb3JlICs9IHZpc2l0b3IodGhpcy5nYW1lYm9hcmQpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfdGljazogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIGN1cnJJZHggPSB0aGlzLl9zb3J0ZWRJbnNlcnQoeyB0aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSB9KSwgaW5kZXggPSAwO1xyXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGN1cnJJZHgpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7IF90aGlzLl9wcm9jZXNzRXZlbnQoX3RoaXMucXVldWVbaW5kZXhdKTsgcmV0dXJuIGluZGV4ICs9IDE7IH07XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnF1ZXVlLnNwbGljZSgwLCBjdXJySWR4KTtcclxuICAgIH0sXHJcbiAgICBfdXBkYXRlRGlzcGxheTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vIHVwZGF0ZSB0aGUgc2NvcmVib2FyZCBvbiB0aGUgcGFnZSBoZXJlLi4uXHJcbiAgICAgIGNvbnNvbGUubG9nKFwiOnNjb3JlID0+ICVvICBAIFslb11cIiwgdGhpcy5zY29yZSwgbmV3IERhdGUpO1xyXG4gICAgfSxcclxuICAgIF9hZGRTY29yZVRvUXVldWU6IGZ1bmN0aW9uKHR5cGUsIHB0cykgeyByZXR1cm4gdGhpcy5fZW5xdWV1ZSh7IHRpbWU6ICgoK25ldyBEYXRlKSArIHRoaXMubnN1KSwgdHlwZTogdHlwZSwgcHRzOiBwdHMgfSk7IH0sXHJcblxyXG4gICAgdXA6IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGB1cGAgc2NvcmUgZXZlbnQgb2YgJW9cIiwgcG9zKHB0cykpOyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJ1cFwiLCBwb3MocHRzKSk7IH0sXHJcbiAgICBkb3duOiBmdW5jdGlvbihwdHMpIHsgY29uc29sZS5sb2coXCJRdWV1ZWluZyBgZG93bmAgc2NvcmUgZXZlbnQgb2YgJW9cIiwgbmVnKHB0cykpOyB0aGlzLl9hZGRTY29yZVRvUXVldWUoXCJkb3duXCIsIG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBmaW5hbFVwOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKHBvcyhwdHMpKTsgfSxcclxuICAgIGZpbmFsRG93bjogZnVuY3Rpb24ocHRzKSB7IHRoaXMuZmluYWwucHVzaChuZWcocHRzKSk7IH0sXHJcblxyXG4gICAgZ2V0UGVuZGluZ1Njb3JlQ291bnQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5xdWV1ZS5sZW5ndGg7IH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coXCJDbGVhcmluZyBvdXQgcmVtYWluaW5nIHF1ZXVlIVwiKTtcclxuICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgdGhpcy5xdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7IF90aGlzLl9wcm9jZXNzRXZlbnQoZXZlbnQpOyB9KTtcclxuXHJcbiAgICAgIHRoaXMuX3Byb2Nlc3NGaW5hbGl6ZXJzKCk7XHJcblxyXG4gICAgICBjb25zb2xlLmluZm8oXCJGSU5BTCBTQ09SRTogJW9cIiwgdGhpcy5zY29yZSk7XHJcbiAgICB9LFxyXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpO1xyXG4gICAgICB0aGlzLnF1ZXVlLmxlbmd0aCA9IDA7XHJcbiAgICAgIHRoaXMuZmluYWwubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5zY29yZSA9IDA7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNjb3Jla2VlcGVyOyIsInZhciBTZXJpYWxpemVyID0ge1xyXG4gICAgZXhwb3J0OiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBfbWV0YToge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiArbmV3IERhdGUsXHJcbiAgICAgICAgICAgICAgICBzY29yZTogbnVsbCxcclxuICAgICAgICAgICAgICAgIHRpbWVyOiBnYW1lYm9hcmQuY2xvY2suc2Vjb25kcyxcclxuICAgICAgICAgICAgICAgIHRyYW5zY3JpcHRzOiBnYW1lYm9hcmQuZW1pdHRlci5fdHJhbnNjcmlwdHMgfHwgW10sXHJcbiAgICAgICAgICAgICAgICB1c2VyOiB7fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgICAkZWw6IGdhbWVib2FyZC4kZWwuc2VsZWN0b3IsXHJcbiAgICAgICAgICAgICAgICBib2FyZDogZ2FtZWJvYXJkLmJvYXJkLl90YWJsZSxcclxuICAgICAgICAgICAgICAgIHNjb3Jla2VlcGVyOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgZmxhc2hDb250YWluZXI6IGdhbWVib2FyZC5mbGFzaENvbnRhaW5lci5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIHRoZW1lOiBnYW1lYm9hcmQudGhlbWUsXHJcbiAgICAgICAgICAgICAgICBkZWJ1Z19tb2RlOiBnYW1lYm9hcmQuZGVidWdfbW9kZSxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnM6IGdhbWVib2FyZC5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgbWluZXM6IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgICAgIHVzZXJNb3ZlczogZ2FtZWJvYXJkLnVzZXJNb3ZlcyxcclxuICAgICAgICAgICAgICAgIGlzTW9iaWxlOiBnYW1lYm9hcmQuaXNNb2JpbGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG4gICAgaW1wb3J0OiBmdW5jdGlvbihleHBvcnRlZCkge1xyXG4gICAgICAgIC8vIDEuIG5ldyBHYW1lYm9hcmQgb2JqZWN0IChkZWZhdWx0cyBpcyBvaylcclxuICAgICAgICAvLyAyLiByZXBsYWNlIGBib2FyZGAgd2l0aCBuZXcgTXVsdGltYXA6XHJcbiAgICAgICAgLy8gICAgIC0gY291bnQgYXJyYXlzIGF0IGZpcnN0IGxldmVsIGluIGJvYXJkIGZvciBudW0gcm93c1xyXG4gICAgICAgIC8vICAgICAgICAgIFtbW3tcInJvd1wiOjAsXCJjZWxsXCI6MCxcInN0YXRlXCI6e1wiX2ZsYWdzXCI6XCIxMDAwXCJ9LFwiZGFuZ2VyXCI6MH0sXHJcbiAgICAgICAgLy8gICAgICAgICAge1wicm93XCI6MCxcImNlbGxcIjoyLFwic3RhdGVcIjp7XCJfZmxhZ3NcIjpcIjAwMTBcIn19XV1dXHJcbiAgICAgICAgLy8gICAgIC0gcGFyc2UgZWFjaCBvYmplY3QgdG8gY3JlYXRlIG5ldyBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIsIF9mbGFncylcclxuICAgICAgICAvLyAzLiAkZWwgPSAkKGV4cG9ydGVkLiRlbClcclxuICAgICAgICAvLyA0LiBmbGFzaENvbnRhaW5lciA9ICQoZXhwb3J0ZWQuZmxhc2hDb250YWluZXIpXHJcbiAgICAgICAgLy8gNS4gdGhlbWUgPSBleHBvcnRlZC50aGVtZVxyXG4gICAgICAgIC8vIDYuIGRlYnVnX21vZGUgPSBleHBvcnRlZC5kZWJ1Z19tb2RlXHJcbiAgICAgICAgLy8gNy4gZGltZW5zaW9ucyA9IGV4cG9ydGVkLmRpbWVuc2lvbnNcclxuICAgICAgICAvLyA4LiBtaW5lcyA9IGdhbWVib2FyZC5taW5lc1xyXG4gICAgICAgIC8vIDkuIHVzZXJNb3ZlcyA9IGdhbWVib2FkLnVzZXJNb3ZlcywgYW5kIGlzTW9iaWxlXHJcbiAgICAgICAgLy8gMTAuIG1ha2UgbmV3IENvdW50ZG93biB3aXRoIGV4cG9ydGVkLl9tZXRhLnRpbWVyID0gc2Vjb25kcywgY2xvY2suc3RhcnQoKVxyXG4gICAgICAgIC8vIDExLiBpbnN0YW50aWF0ZSBuZXcgVHJhbnNjcmliaW5nRW1pdHRlciwgbG9hZGluZyBfbWV0YS50cmFuc2NyaXB0cyBpbnRvIGl0cyBfdHJhbnNjcmlwdHNcclxuICAgICAgICAvLyAxMi4gcmUtcnVuIHRoZSBpbnRlcm5hbCBpbml0KCkgb3BzOiBfbG9hZEJvYXJkLCBfcmVuZGVyR3JpZFxyXG4gICAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlcmlhbGl6ZXI7IiwidmFyIEJpdEZsYWdGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvYml0LWZsYWctZmFjdG9yeScpLFxyXG4gICAgU3ltYm9scyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuU3ltYm9scyxcclxuICAgIEZsYWdzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5GbGFncyxcclxuXHJcbiAgICBCaXRGbGFncyA9IG5ldyBCaXRGbGFnRmFjdG9yeShbIEZsYWdzLk9QRU4sIEZsYWdzLk1JTkVELCBGbGFncy5GTEFHR0VELCBGbGFncy5JTkRFWEVEIF0pO1xyXG5cclxuZnVuY3Rpb24gU3F1YXJlKHJvdywgY2VsbCwgZGFuZ2VyLCBmbGFncykge1xyXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNxdWFyZSkpXHJcbiAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgIHRoaXMucm93ID0gcm93O1xyXG4gICAgdGhpcy5jZWxsID0gY2VsbDtcclxuICAgIHRoaXMuc3RhdGUgPSBmbGFncyA/IG5ldyBCaXRGbGFncyhmbGFncykgOiBuZXcgQml0RmxhZ3M7XHJcbiAgICB0aGlzLmRhbmdlciA9IChkYW5nZXIgPT0gK2RhbmdlcikgPyArZGFuZ2VyIDogMDtcclxuXHJcbiAgICBpZiAodGhpcy5kYW5nZXIgPiAwKSB0aGlzLmluZGV4KCk7XHJcbn1cclxuXHJcblNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogU3F1YXJlLFxyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBzZXREYW5nZXI6IGZ1bmN0aW9uKGlkeCkgeyBpZiAoaWR4ID09ICtpZHgpIHsgdGhpcy5kYW5nZXIgPSAraWR4OyB0aGlzLmRhbmdlciA+IDAgJiYgdGhpcy5pbmRleCgpOyB9IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoU3ltYm9scylcclxuICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHsgcmV0dXJuIF90aGlzWyAnaXMnICsga2V5LmNoYXJBdCgwKSArIGtleS5zdWJzdHJpbmcoMSkudG9Mb3dlckNhc2UoKSBdKCk7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBrZXkudG9Mb3dlckNhc2UoKTsgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX09QRU4pOyB9LFxyXG4gICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9GTEFHR0VEKTsgfSxcclxuICAgIHVuZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUudW5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgbWluZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9NSU5FRCk7IH0sXHJcbiAgICBpbmRleDogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUuc2V0KHRoaXMuc3RhdGUuRl9JTkRFWEVEKTsgfSxcclxuXHJcbiAgICBpc0Nsb3NlZDogZnVuY3Rpb24oKSB7IHJldHVybiAhdGhpcy5zdGF0ZS5pc09wZW4oKTsgfSxcclxuICAgIGlzT3BlbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNGbGFnZ2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNGbGFnZ2VkKCk7IH0sXHJcbiAgICBpc01pbmVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpOyB9LFxyXG4gICAgaXNJbmRleGVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNJbmRleGVkKCk7IH0sXHJcblxyXG4gICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHsgcm93OiB0aGlzLnJvdywgY2VsbDogdGhpcy5jZWxsLCBzdGF0ZTogdGhpcy5zdGF0ZSwgZGFuZ2VyOiB0aGlzLmRhbmdlciB9IH0sXHJcbiAgICB0b1N0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlLmlzTWluZWQoKVxyXG4gICAgICAgICAgICA/IFN5bWJvbHMuTUlORUQgOiB0aGlzLnN0YXRlLmlzRmxhZ2dlZCgpXHJcbiAgICAgICAgICAgICAgICA/IFN5bWJvbHMuRkxBR0dFRCA6IHRoaXMuc3RhdGUuaXNPcGVuKClcclxuICAgICAgICAgICAgICAgICAgICA/IFN5bWJvbHMuT1BFTiA6IFN5bWJvbHMuQ0xPU0VEO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTcXVhcmU7IiwidmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcclxuXHJcbnZhciBUaGVtZVN0eWxlciA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKHRoZW1lLCAkZWwpIHtcclxuXHJcblx0XHQkZWwgfHwgKCRlbCA9ICQoJEMuRGVmYXVsdENvbmZpZy5ib2FyZCkpO1xyXG5cclxuXHRcdHZhciB0aGVtZUZpbGUgPSAkQy5UaGVtZXNbdGhlbWVdLFxyXG5cdFx0XHQkaGVhZCA9ICRlbC5wYXJlbnRzKFwiYm9keVwiKS5zaWJsaW5ncyhcImhlYWRcIiksXHJcblx0XHRcdCRzdHlsZXMgPSAkaGVhZC5maW5kKFwibGlua1wiKSxcclxuXHJcblx0XHRcdGhhc1ByZUV4aXN0aW5nID0gZnVuY3Rpb24oc3R5bGVzaGVldHMpIHtcclxuXHRcdFx0XHRyZXR1cm4gISFzdHlsZXNoZWV0cy5maWx0ZXIoZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gISF+JCh0aGlzKS5hdHRyKCdocmVmJykuaW5kZXhPZih0aGVtZUZpbGUpO1xyXG5cdFx0XHRcdH0pLmxlbmd0aFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQvLyBidWlsZCBhIG5ldyA8bGluaz4gdGFnIGZvciB0aGUgZGVzaXJlZCB0aGVtZSBzdHlsZXNoZWV0OlxyXG5cdFx0XHQkbGluayA9ICQoXCI8bGluayAvPlwiLCB7XHJcblx0XHRcdFx0cmVsOiAnc3R5bGVzaGVldCcsXHJcblx0XHRcdFx0dHlwZTogJ3RleHQvY3NzJyxcclxuXHRcdFx0XHRocmVmOiAnY3NzLycgKyB0aGVtZUZpbGUgKyAnLmNzcydcclxuXHRcdFx0fSk7XHJcblx0XHQvLyB1c2luZyAkZWwgYXMgYW5jaG9yIHRvIHRoZSBET00sIGdvIHVwIGFuZFxyXG5cdFx0Ly8gbG9vayBmb3IgbGlnaHQuY3NzIG9yIGRhcmsuY3NzLCBhbmQtLWlmIG5lY2Vzc2FyeS0tc3dhcFxyXG5cdFx0Ly8gaXQgb3V0IGZvciBgdGhlbWVgLlxyXG5cdFx0Ly8gQWRkICRsaW5rIGlmZiBpdCBkb2Vzbid0IGFscmVhZHkgZXhpc3QhXHJcblx0XHRpZiAoIWhhc1ByZUV4aXN0aW5nKCRzdHlsZXMpKVxyXG5cdFx0XHQkc3R5bGVzLmFmdGVyKCRsaW5rKTtcclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRoZW1lU3R5bGVyOyIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9saWIvZW1pdHRlcicpLFxyXG4gICAgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcclxuXHJcbmZ1bmN0aW9uIFRyYW5zY3JpYmluZ0VtaXR0ZXIoKSB7XHJcbiAgICBFbWl0dGVyLmNhbGwodGhpcyk7XHJcbiAgICB0aGlzLl90cmFuc2NyaXB0cyA9IFtdO1xyXG59XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRW1pdHRlci5wcm90b3R5cGUpO1xyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7XHJcblxyXG5UcmFuc2NyaWJpbmdFbWl0dGVyLnByb3RvdHlwZS5fX3RyaWdnZXJfXyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXI7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbigvKiBkYXRhLi4uIFt2YXJhcmdzXSAqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XHJcbiAgICAvLyBzZW5kIG9yaWdpbmFsIHBhcmFtcyB0byB0aGUgc3Vic2NyaWJlcnMuLi5cclxuICAgIHRoaXMuX190cmlnZ2VyX18uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICBjb25zb2xlLmRlYnVnKFwiW1RFXSA9PiAlb1wiLCBhcmdzKVxyXG4gICAgLy8gLi4udGhlbiBhbHRlciB0aGUgcGFyYW1zIGZvciB0aGUgdHJhbnNjcmlwdCdzIHJlY29yZHNcclxuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMykge1xyXG5cclxuICAgICAgICAvLyBzdGFuZGFyZCBTcXVhcmUtYmFzZWQgZXZlbnRcclxuICAgICAgICAvLyAwOiBldmVudCBuYW1lLCAxOiBTcXVhcmUgaW5zdGFuY2UsIDI6IGpRdWVyeS13cmFwcGVkIERPTSBlbGVtZW50XHJcbiAgICAgICAgaWYgKGFyZ3NbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJTcXVhcmVcIilcclxuICAgICAgICAgICAgYXJnc1sxXSA9IEpTT04uc3RyaW5naWZ5KGFyZ3NbMV0pO1xyXG4gICAgICAgIGlmIChhcmdzWzJdIGluc3RhbmNlb2YgalF1ZXJ5KVxyXG4gICAgICAgICAgICBhcmdzWzJdID0gYnVpbGRET01TdHJpbmcoYXJnc1syXSk7XHJcblxyXG4gICAgICAgIC8vIHN0YW5kYXJkIEdhbWVib2FyZC1iYXNlZCBldmVudFxyXG4gICAgICAgIGlmIChhcmdzWzFdLmNvbnN0cnVjdG9yLm5hbWUgPT09IFwiTXVsdGltYXBcIilcclxuICAgICAgICAgICAgYXJnc1sxXSA9IEpTT04uc3RyaW5naWZ5KGFyZ3NbMV0pO1xyXG4gICAgfVxyXG4gICAgYXJncy51bnNoaWZ0KCtuZXcgRGF0ZSk7XHJcbiAgICB0aGlzLl90cmFuc2NyaXB0cy5wdXNoKGFyZ3MpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYnVpbGRET01TdHJpbmcoJGVsKSB7XHJcbiAgICB2YXIgbm9kZSA9ICRlbCBpbnN0YW5jZW9mIGpRdWVyeSA/ICRlbFswXSA6ICRlbCxcclxuICAgICAgICBTT1JUX0ZOX0NFTExfRklSU1QgPSBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIChhID09PSAnY2VsbCcgfHwgYiA9PT0nY2VsbCcgfHwgYSA+IGIpID8gMSA6IChhIDwgYikgPyAtMSA6IDA7IH07XHJcbiAgICByZXR1cm4gbm9kZS5wYXJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICsgXCIjXCIgKyBub2RlLnBhcmVudE5vZGUuaWQgKyBcIiBcIlxyXG4gICAgICAgICsgbm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyBcIi5cIlxyXG4gICAgICAgICsgbm9kZS5jbGFzc05hbWUuc3BsaXQoJyAnKVxyXG4gICAgICAgIC5zb3J0KFNPUlRfRk5fQ0VMTF9GSVJTVClcclxuICAgICAgICAuam9pbignLicpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zY3JpYmluZ0VtaXR0ZXI7IiwidmFyICRDID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcclxuXHJcbiAgICAvLyB2YWxpZGF0aW9uIGhlbHBlciBmbnNcclxuICAgIGlzTnVtZXJpYyA9IGZ1bmN0aW9uKHZhbCkge1xyXG4gICAgICAgIHJldHVybiBTdHJpbmcodmFsKS5yZXBsYWNlKC8sL2csICcnKSwgKHZhbC5sZW5ndGggIT09IDAgJiYgIWlzTmFOKCt2YWwpICYmIGlzRmluaXRlKCt2YWwpKTtcclxuICAgIH0sXHJcblxyXG4gICAgVmFsaWRhdG9ycyA9IHtcclxuICAgICAgICBCb2FyZERpbWVuc2lvbnM6IHtcclxuICAgICAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uKGRpbSkge1xyXG4gICAgICAgICAgICAgICAgLy8gaXMgbnVtZXJpYyBpbnB1dFxyXG4gICAgICAgICAgICAgICAgaWYgKCFpc051bWVyaWMoZGltKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIGJvYXJkIGRpbWVuc2lvbi5cIiwgZGltKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBpcyBub3QgZ3JlYXRlciB0aGFuIE1BWF9ESU1FTlNJT05TIGNvbnN0YW50XHJcbiAgICAgICAgICAgICAgICBpZiAoIShkaW0gPD0gJEMuTUFYX0dSSURfRElNRU5TSU9OUykpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBnYW1lJ3MgbWF4aW11bSBncmlkIGRpbWVuc2lvbnNcIiwgK2RpbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZWxzZS4uLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIE1pbmVDb3VudDoge1xyXG4gICAgICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24obWluZXMsIG1heFBvc3NpYmxlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pbmVzOiAlbywgbWF4UG9zc2libGU6ICVvXCIsIG1pbmVzLCBtYXhQb3NzaWJsZSlcclxuICAgICAgICAgICAgICAgIC8vIGlzIG51bWVyaWMgaW5wdXRcclxuICAgICAgICAgICAgICAgIGlmICghaXNOdW1lcmljKG1pbmVzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBWYWxpZGF0aW9uRXJyb3IoXCJVc2VyIGVudGVyZWQgezB9LCB3aGljaCBpcyBub3QgYSBudW1iZXIsIGFuZCBhbiBpbnZhbGlkIG51bWJlciBvZiBtaW5lcy5cIiwgbWluZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGlzIG5vdCBncmVhdGVyIHRoYW4gbWF4UG9zc2libGUgZm9yIHRoaXMgY29uZmlndXJhdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKG1pbmVzID4gbWF4UG9zc2libGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVmFsaWRhdGlvbkVycm9yKFwiVXNlciBlbnRlcmVkIHswfSwgd2hpY2ggaXMgZ3JlYXRlciB0aGFuIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMgKHsxfSkuXCIsICttaW5lcywgbWF4UG9zc2libGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIC8vIGVsc2UuLi5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0b3JzO1xyXG5cclxuXHJcbi8qICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICAqL1xyXG4vLyBFUlJPUlMgQU5EIEVYQ0VQVElPTlNcclxuXHJcbmZ1bmN0aW9uIE15c3dlZXBlckVycm9yKCkge1xyXG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXHJcbiAgICAgICAgUkdYX1JFUExBQ0VNRU5UX1RPS0VOUyA9IC9cXHsoXFxkKylcXH0vZyxcclxuICAgICAgICBleHRlbmRNZXNzYWdlID0gZnVuY3Rpb24oc3RyLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAoc3RyIHx8ICcnKS5yZXBsYWNlKFJHWF9SRVBMQUNFTUVOVF9UT0tFTlMsIGZ1bmN0aW9uKF8sIGluZGV4KSB7IHJldHVybiBhcmdzWytpbmRleF0gfHwgJyc7IH0pO1xyXG4gICAgICAgIH07XHJcbiAgdGhpcy5tZXNzYWdlID0gZXh0ZW5kTWVzc2FnZShhcmdzWzBdLCBhcmdzLnNsaWNlKDEpKTtcclxuICB0aGlzLm5hbWUgPSAnTXlzd2VlcGVyRXJyb3InO1xyXG4gIEVycm9yLmNhbGwodGhpcywgdGhpcy5tZXNzYWdlKTtcclxufVxyXG5NeXN3ZWVwZXJFcnJvci5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcclxuTXlzd2VlcGVyRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTXlzd2VlcGVyRXJyb3I7XHJcblxyXG5cclxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKCkge1xyXG4gIE15c3dlZXBlckVycm9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgdGhpcy5uYW1lID0gJ1ZhbGlkYXRpb25FcnJvcic7XHJcbn1cclxuVmFsaWRhdGlvbkVycm9yLnByb3RvdHlwZSA9IG5ldyBNeXN3ZWVwZXJFcnJvcigpO1xyXG5WYWxpZGF0aW9uRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVmFsaWRhdGlvbkVycm9yOyIsIi8qISBqUXVlcnkgcGx1Z2luIGZvciBIYW1tZXIuSlMgLSB2MS4wLjEgLSAyMDE0LTAyLTAzXHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIEhhbW1lci5KUyAtIHYxLjAuN2RldiAtIDIwMTQtMDItMThcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDE0IEpvcmlrIFRhbmdlbGRlciA8ai50YW5nZWxkZXJAZ21haWwuY29tPjtcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlICovXHJcblxyXG4oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4vKipcclxuICogSGFtbWVyXHJcbiAqIHVzZSB0aGlzIHRvIGNyZWF0ZSBpbnN0YW5jZXNcclxuICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICogQHBhcmFtICAge09iamVjdH0gICAgICAgIG9wdGlvbnNcclxuICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG52YXIgSGFtbWVyID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xyXG4gIHJldHVybiBuZXcgSGFtbWVyLkluc3RhbmNlKGVsZW1lbnQsIG9wdGlvbnMgfHwge30pO1xyXG59O1xyXG5cclxuLy8gZGVmYXVsdCBzZXR0aW5nc1xyXG5IYW1tZXIuZGVmYXVsdHMgPSB7XHJcbiAgLy8gYWRkIHN0eWxlcyBhbmQgYXR0cmlidXRlcyB0byB0aGUgZWxlbWVudCB0byBwcmV2ZW50IHRoZSBicm93c2VyIGZyb20gZG9pbmdcclxuICAvLyBpdHMgbmF0aXZlIGJlaGF2aW9yLiB0aGlzIGRvZXNudCBwcmV2ZW50IHRoZSBzY3JvbGxpbmcsIGJ1dCBjYW5jZWxzXHJcbiAgLy8gdGhlIGNvbnRleHRtZW51LCB0YXAgaGlnaGxpZ2h0aW5nIGV0Y1xyXG4gIC8vIHNldCB0byBmYWxzZSB0byBkaXNhYmxlIHRoaXNcclxuICBzdG9wX2Jyb3dzZXJfYmVoYXZpb3I6IHtcclxuICAgIC8vIHRoaXMgYWxzbyB0cmlnZ2VycyBvbnNlbGVjdHN0YXJ0PWZhbHNlIGZvciBJRVxyXG4gICAgdXNlclNlbGVjdCAgICAgICA6ICdub25lJyxcclxuICAgIC8vIHRoaXMgbWFrZXMgdGhlIGVsZW1lbnQgYmxvY2tpbmcgaW4gSUUxMCA+LCB5b3UgY291bGQgZXhwZXJpbWVudCB3aXRoIHRoZSB2YWx1ZVxyXG4gICAgLy8gc2VlIGZvciBtb3JlIG9wdGlvbnMgdGhpcyBpc3N1ZTsgaHR0cHM6Ly9naXRodWIuY29tL0VpZ2h0TWVkaWEvaGFtbWVyLmpzL2lzc3Vlcy8yNDFcclxuICAgIHRvdWNoQWN0aW9uICAgICAgOiAnbm9uZScsXHJcbiAgICB0b3VjaENhbGxvdXQgICAgIDogJ25vbmUnLFxyXG4gICAgY29udGVudFpvb21pbmcgICA6ICdub25lJyxcclxuICAgIHVzZXJEcmFnICAgICAgICAgOiAnbm9uZScsXHJcbiAgICB0YXBIaWdobGlnaHRDb2xvcjogJ3JnYmEoMCwwLDAsMCknXHJcbiAgfVxyXG5cclxuICAvL1xyXG4gIC8vIG1vcmUgc2V0dGluZ3MgYXJlIGRlZmluZWQgcGVyIGdlc3R1cmUgYXQgZ2VzdHVyZXMuanNcclxuICAvL1xyXG59O1xyXG5cclxuLy8gZGV0ZWN0IHRvdWNoZXZlbnRzXHJcbkhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUyA9IHdpbmRvdy5uYXZpZ2F0b3IucG9pbnRlckVuYWJsZWQgfHwgd2luZG93Lm5hdmlnYXRvci5tc1BvaW50ZXJFbmFibGVkO1xyXG5IYW1tZXIuSEFTX1RPVUNIRVZFTlRTID0gKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdyk7XHJcblxyXG4vLyBkb250IHVzZSBtb3VzZWV2ZW50cyBvbiBtb2JpbGUgZGV2aWNlc1xyXG5IYW1tZXIuTU9CSUxFX1JFR0VYID0gL21vYmlsZXx0YWJsZXR8aXAoYWR8aG9uZXxvZCl8YW5kcm9pZHxzaWxrL2k7XHJcbkhhbW1lci5OT19NT1VTRUVWRU5UUyA9IEhhbW1lci5IQVNfVE9VQ0hFVkVOVFMgJiYgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQubWF0Y2goSGFtbWVyLk1PQklMRV9SRUdFWCk7XHJcblxyXG4vLyBldmVudHR5cGVzIHBlciB0b3VjaGV2ZW50IChzdGFydCwgbW92ZSwgZW5kKVxyXG4vLyBhcmUgZmlsbGVkIGJ5IEhhbW1lci5ldmVudC5kZXRlcm1pbmVFdmVudFR5cGVzIG9uIHNldHVwXHJcbkhhbW1lci5FVkVOVF9UWVBFUyA9IHt9O1xyXG5cclxuLy8gZGlyZWN0aW9uIGRlZmluZXNcclxuSGFtbWVyLkRJUkVDVElPTl9ET1dOID0gJ2Rvd24nO1xyXG5IYW1tZXIuRElSRUNUSU9OX0xFRlQgPSAnbGVmdCc7XHJcbkhhbW1lci5ESVJFQ1RJT05fVVAgPSAndXAnO1xyXG5IYW1tZXIuRElSRUNUSU9OX1JJR0hUID0gJ3JpZ2h0JztcclxuXHJcbi8vIHBvaW50ZXIgdHlwZVxyXG5IYW1tZXIuUE9JTlRFUl9NT1VTRSA9ICdtb3VzZSc7XHJcbkhhbW1lci5QT0lOVEVSX1RPVUNIID0gJ3RvdWNoJztcclxuSGFtbWVyLlBPSU5URVJfUEVOID0gJ3Blbic7XHJcblxyXG4vLyBpbnRlcnZhbCBpbiB3aGljaCBIYW1tZXIgcmVjYWxjdWxhdGVzIGN1cnJlbnQgdmVsb2NpdHkgaW4gbXNcclxuSGFtbWVyLlVQREFURV9WRUxPQ0lUWV9JTlRFUlZBTCA9IDIwO1xyXG5cclxuLy8gdG91Y2ggZXZlbnQgZGVmaW5lc1xyXG5IYW1tZXIuRVZFTlRfU1RBUlQgPSAnc3RhcnQnO1xyXG5IYW1tZXIuRVZFTlRfTU9WRSA9ICdtb3ZlJztcclxuSGFtbWVyLkVWRU5UX0VORCA9ICdlbmQnO1xyXG5cclxuLy8gaGFtbWVyIGRvY3VtZW50IHdoZXJlIHRoZSBiYXNlIGV2ZW50cyBhcmUgYWRkZWQgYXRcclxuSGFtbWVyLkRPQ1VNRU5UID0gd2luZG93LmRvY3VtZW50O1xyXG5cclxuLy8gcGx1Z2lucyBhbmQgZ2VzdHVyZXMgbmFtZXNwYWNlc1xyXG5IYW1tZXIucGx1Z2lucyA9IEhhbW1lci5wbHVnaW5zIHx8IHt9O1xyXG5IYW1tZXIuZ2VzdHVyZXMgPSBIYW1tZXIuZ2VzdHVyZXMgfHwge307XHJcblxyXG5cclxuLy8gaWYgdGhlIHdpbmRvdyBldmVudHMgYXJlIHNldC4uLlxyXG5IYW1tZXIuUkVBRFkgPSBmYWxzZTtcclxuXHJcbi8qKlxyXG4gKiBzZXR1cCBldmVudHMgdG8gZGV0ZWN0IGdlc3R1cmVzIG9uIHRoZSBkb2N1bWVudFxyXG4gKi9cclxuZnVuY3Rpb24gc2V0dXAoKSB7XHJcbiAgaWYoSGFtbWVyLlJFQURZKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHdoYXQgZXZlbnR0eXBlcyB3ZSBhZGQgbGlzdGVuZXJzIHRvXHJcbiAgSGFtbWVyLmV2ZW50LmRldGVybWluZUV2ZW50VHlwZXMoKTtcclxuXHJcbiAgLy8gUmVnaXN0ZXIgYWxsIGdlc3R1cmVzIGluc2lkZSBIYW1tZXIuZ2VzdHVyZXNcclxuICBIYW1tZXIudXRpbHMuZWFjaChIYW1tZXIuZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpe1xyXG4gICAgSGFtbWVyLmRldGVjdGlvbi5yZWdpc3RlcihnZXN0dXJlKTtcclxuICB9KTtcclxuXHJcbiAgLy8gQWRkIHRvdWNoIGV2ZW50cyBvbiB0aGUgZG9jdW1lbnRcclxuICBIYW1tZXIuZXZlbnQub25Ub3VjaChIYW1tZXIuRE9DVU1FTlQsIEhhbW1lci5FVkVOVF9NT1ZFLCBIYW1tZXIuZGV0ZWN0aW9uLmRldGVjdCk7XHJcbiAgSGFtbWVyLmV2ZW50Lm9uVG91Y2goSGFtbWVyLkRPQ1VNRU5ULCBIYW1tZXIuRVZFTlRfRU5ELCBIYW1tZXIuZGV0ZWN0aW9uLmRldGVjdCk7XHJcblxyXG4gIC8vIEhhbW1lciBpcyByZWFkeS4uLiFcclxuICBIYW1tZXIuUkVBRFkgPSB0cnVlO1xyXG59XHJcblxyXG5IYW1tZXIudXRpbHMgPSB7XHJcbiAgLyoqXHJcbiAgICogZXh0ZW5kIG1ldGhvZCxcclxuICAgKiBhbHNvIHVzZWQgZm9yIGNsb25pbmcgd2hlbiBkZXN0IGlzIGFuIGVtcHR5IG9iamVjdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGRlc3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBzcmNcclxuICAgKiBAcGFybSAge0Jvb2xlYW59ICBtZXJnZSAgICBkbyBhIG1lcmdlXHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgZGVzdFxyXG4gICAqL1xyXG4gIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKGRlc3QsIHNyYywgbWVyZ2UpIHtcclxuICAgIGZvcih2YXIga2V5IGluIHNyYykge1xyXG4gICAgICBpZihkZXN0W2tleV0gIT09IHVuZGVmaW5lZCAmJiBtZXJnZSkge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGRlc3Rba2V5XSA9IHNyY1trZXldO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlc3Q7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGZvciBlYWNoXHJcbiAgICogQHBhcmFtIG9ialxyXG4gICAqIEBwYXJhbSBpdGVyYXRvclxyXG4gICAqL1xyXG4gIGVhY2g6IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcclxuICAgIHZhciBpLCBsZW5ndGg7XHJcbiAgICAvLyBuYXRpdmUgZm9yRWFjaCBvbiBhcnJheXNcclxuICAgIGlmICgnZm9yRWFjaCcgaW4gb2JqKSB7XHJcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcclxuICAgIH1cclxuICAgIC8vIGFycmF5c1xyXG4gICAgZWxzZSBpZihvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gb2JqZWN0c1xyXG4gICAgZWxzZSB7XHJcbiAgICAgIGZvciAoaSBpbiBvYmopIHtcclxuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGkpICYmIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIGZpbmQgaWYgYSBub2RlIGlzIGluIHRoZSBnaXZlbiBwYXJlbnRcclxuICAgKiB1c2VkIGZvciBldmVudCBkZWxlZ2F0aW9uIHRyaWNrc1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBub2RlXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIHBhcmVudFxyXG4gICAqIEByZXR1cm5zIHtib29sZWFufSAgICAgICBoYXNfcGFyZW50XHJcbiAgICovXHJcbiAgaGFzUGFyZW50OiBmdW5jdGlvbihub2RlLCBwYXJlbnQpIHtcclxuICAgIHdoaWxlKG5vZGUpIHtcclxuICAgICAgaWYobm9kZSA9PSBwYXJlbnQpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBnZXQgdGhlIGNlbnRlciBvZiBhbGwgdGhlIHRvdWNoZXNcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICB0b3VjaGVzXHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgY2VudGVyXHJcbiAgICovXHJcbiAgZ2V0Q2VudGVyOiBmdW5jdGlvbiBnZXRDZW50ZXIodG91Y2hlcykge1xyXG4gICAgdmFyIHZhbHVlc1ggPSBbXSwgdmFsdWVzWSA9IFtdO1xyXG5cclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRvdWNoZXMsIGZ1bmN0aW9uKHRvdWNoKSB7XHJcbiAgICAgIC8vIEkgcHJlZmVyIGNsaWVudFggYmVjYXVzZSBpdCBpZ25vcmUgdGhlIHNjcm9sbGluZyBwb3NpdGlvblxyXG4gICAgICB2YWx1ZXNYLnB1c2godHlwZW9mIHRvdWNoLmNsaWVudFggIT09ICd1bmRlZmluZWQnID8gdG91Y2guY2xpZW50WCA6IHRvdWNoLnBhZ2VYICk7XHJcbiAgICAgIHZhbHVlc1kucHVzaCh0eXBlb2YgdG91Y2guY2xpZW50WSAhPT0gJ3VuZGVmaW5lZCcgPyB0b3VjaC5jbGllbnRZIDogdG91Y2gucGFnZVkgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHBhZ2VYOiAoKE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlc1gpICsgTWF0aC5tYXguYXBwbHkoTWF0aCwgdmFsdWVzWCkpIC8gMiksXHJcbiAgICAgIHBhZ2VZOiAoKE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlc1kpICsgTWF0aC5tYXguYXBwbHkoTWF0aCwgdmFsdWVzWSkpIC8gMilcclxuICAgIH07XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgdmVsb2NpdHkgYmV0d2VlbiB0d28gcG9pbnRzXHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfdGltZVxyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3hcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV95XHJcbiAgICogQHJldHVybnMge09iamVjdH0gICAgdmVsb2NpdHlcclxuICAgKi9cclxuICBnZXRWZWxvY2l0eTogZnVuY3Rpb24gZ2V0VmVsb2NpdHkoZGVsdGFfdGltZSwgZGVsdGFfeCwgZGVsdGFfeSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogTWF0aC5hYnMoZGVsdGFfeCAvIGRlbHRhX3RpbWUpIHx8IDAsXHJcbiAgICAgIHk6IE1hdGguYWJzKGRlbHRhX3kgLyBkZWx0YV90aW1lKSB8fCAwXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIGFuZ2xlIGJldHdlZW4gdHdvIGNvb3JkaW5hdGVzXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgYW5nbGVcclxuICAgKi9cclxuICBnZXRBbmdsZTogZnVuY3Rpb24gZ2V0QW5nbGUodG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB5ID0gdG91Y2gyLnBhZ2VZIC0gdG91Y2gxLnBhZ2VZLFxyXG4gICAgICB4ID0gdG91Y2gyLnBhZ2VYIC0gdG91Y2gxLnBhZ2VYO1xyXG4gICAgcmV0dXJuIE1hdGguYXRhbjIoeSwgeCkgKiAxODAgLyBNYXRoLlBJO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBhbmdsZSB0byBkaXJlY3Rpb24gZGVmaW5lXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge1N0cmluZ30gICAgZGlyZWN0aW9uIGNvbnN0YW50LCBsaWtlIEhhbW1lci5ESVJFQ1RJT05fTEVGVFxyXG4gICAqL1xyXG4gIGdldERpcmVjdGlvbjogZnVuY3Rpb24gZ2V0RGlyZWN0aW9uKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeCA9IE1hdGguYWJzKHRvdWNoMS5wYWdlWCAtIHRvdWNoMi5wYWdlWCksXHJcbiAgICAgIHkgPSBNYXRoLmFicyh0b3VjaDEucGFnZVkgLSB0b3VjaDIucGFnZVkpO1xyXG5cclxuICAgIGlmKHggPj0geSkge1xyXG4gICAgICByZXR1cm4gdG91Y2gxLnBhZ2VYIC0gdG91Y2gyLnBhZ2VYID4gMCA/IEhhbW1lci5ESVJFQ1RJT05fTEVGVCA6IEhhbW1lci5ESVJFQ1RJT05fUklHSFQ7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgcmV0dXJuIHRvdWNoMS5wYWdlWSAtIHRvdWNoMi5wYWdlWSA+IDAgPyBIYW1tZXIuRElSRUNUSU9OX1VQIDogSGFtbWVyLkRJUkVDVElPTl9ET1dOO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gdHdvIHRvdWNoZXNcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDFcclxuICAgKiBAcGFyYW0gICB7VG91Y2h9ICAgICB0b3VjaDJcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBkaXN0YW5jZVxyXG4gICAqL1xyXG4gIGdldERpc3RhbmNlOiBmdW5jdGlvbiBnZXREaXN0YW5jZSh0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHggPSB0b3VjaDIucGFnZVggLSB0b3VjaDEucGFnZVgsXHJcbiAgICAgIHkgPSB0b3VjaDIucGFnZVkgLSB0b3VjaDEucGFnZVk7XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KCh4ICogeCkgKyAoeSAqIHkpKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBzY2FsZSBmYWN0b3IgYmV0d2VlbiB0d28gdG91Y2hMaXN0cyAoZmluZ2VycylcclxuICAgKiBubyBzY2FsZSBpcyAxLCBhbmQgZ29lcyBkb3duIHRvIDAgd2hlbiBwaW5jaGVkIHRvZ2V0aGVyLCBhbmQgYmlnZ2VyIHdoZW4gcGluY2hlZCBvdXRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBzdGFydFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGVuZFxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIHNjYWxlXHJcbiAgICovXHJcbiAgZ2V0U2NhbGU6IGZ1bmN0aW9uIGdldFNjYWxlKHN0YXJ0LCBlbmQpIHtcclxuICAgIC8vIG5lZWQgdHdvIGZpbmdlcnMuLi5cclxuICAgIGlmKHN0YXJ0Lmxlbmd0aCA+PSAyICYmIGVuZC5sZW5ndGggPj0gMikge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXREaXN0YW5jZShlbmRbMF0sIGVuZFsxXSkgL1xyXG4gICAgICAgIHRoaXMuZ2V0RGlzdGFuY2Uoc3RhcnRbMF0sIHN0YXJ0WzFdKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHJvdGF0aW9uIGRlZ3JlZXMgYmV0d2VlbiB0d28gdG91Y2hMaXN0cyAoZmluZ2VycylcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBzdGFydFxyXG4gICAqIEBwYXJhbSAgIHtBcnJheX0gICAgIGVuZFxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIHJvdGF0aW9uXHJcbiAgICovXHJcbiAgZ2V0Um90YXRpb246IGZ1bmN0aW9uIGdldFJvdGF0aW9uKHN0YXJ0LCBlbmQpIHtcclxuICAgIC8vIG5lZWQgdHdvIGZpbmdlcnNcclxuICAgIGlmKHN0YXJ0Lmxlbmd0aCA+PSAyICYmIGVuZC5sZW5ndGggPj0gMikge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXRBbmdsZShlbmRbMV0sIGVuZFswXSkgLVxyXG4gICAgICAgIHRoaXMuZ2V0QW5nbGUoc3RhcnRbMV0sIHN0YXJ0WzBdKTtcclxuICAgIH1cclxuICAgIHJldHVybiAwO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBib29sZWFuIGlmIHRoZSBkaXJlY3Rpb24gaXMgdmVydGljYWxcclxuICAgKiBAcGFyYW0gICAge1N0cmluZ30gICAgZGlyZWN0aW9uXHJcbiAgICogQHJldHVybnMgIHtCb29sZWFufSAgIGlzX3ZlcnRpY2FsXHJcbiAgICovXHJcbiAgaXNWZXJ0aWNhbDogZnVuY3Rpb24gaXNWZXJ0aWNhbChkaXJlY3Rpb24pIHtcclxuICAgIHJldHVybiAoZGlyZWN0aW9uID09IEhhbW1lci5ESVJFQ1RJT05fVVAgfHwgZGlyZWN0aW9uID09IEhhbW1lci5ESVJFQ1RJT05fRE9XTik7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHN0b3AgYnJvd3NlciBkZWZhdWx0IGJlaGF2aW9yIHdpdGggY3NzIHByb3BzXHJcbiAgICogQHBhcmFtICAge0h0bWxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgY3NzX3Byb3BzXHJcbiAgICovXHJcbiAgc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3I6IGZ1bmN0aW9uIHN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yKGVsZW1lbnQsIGNzc19wcm9wcykge1xyXG4gICAgaWYoIWNzc19wcm9wcyB8fCAhZWxlbWVudCB8fCAhZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2l0aCBjc3MgcHJvcGVydGllcyBmb3IgbW9kZXJuIGJyb3dzZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChbJ3dlYmtpdCcsICdraHRtbCcsICdtb3onLCAnTW96JywgJ21zJywgJ28nLCAnJ10sIGZ1bmN0aW9uKHZlbmRvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChjc3NfcHJvcHMsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XHJcbiAgICAgICAgICAvLyB2ZW5kZXIgcHJlZml4IGF0IHRoZSBwcm9wZXJ0eVxyXG4gICAgICAgICAgaWYodmVuZG9yKSB7XHJcbiAgICAgICAgICAgIHByb3AgPSB2ZW5kb3IgKyBwcm9wLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyBzZXQgdGhlIHN0eWxlXHJcbiAgICAgICAgICBpZihwcm9wIGluIGVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9IHZhbHVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFsc28gdGhlIGRpc2FibGUgb25zZWxlY3RzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJTZWxlY3QgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25zZWxlY3RzdGFydCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhbmQgZGlzYWJsZSBvbmRyYWdzdGFydFxyXG4gICAgaWYoY3NzX3Byb3BzLnVzZXJEcmFnID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uZHJhZ3N0YXJ0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiByZXZlcnRzIGFsbCBjaGFuZ2VzIG1hZGUgYnkgJ3N0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yJ1xyXG4gICAqIEBwYXJhbSAgIHtIdG1sRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNzc19wcm9wc1xyXG4gICAqL1xyXG4gIHN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcjogZnVuY3Rpb24gc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yKGVsZW1lbnQsIGNzc19wcm9wcykge1xyXG4gICAgaWYoIWNzc19wcm9wcyB8fCAhZWxlbWVudCB8fCAhZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2l0aCBjc3MgcHJvcGVydGllcyBmb3IgbW9kZXJuIGJyb3dzZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChbJ3dlYmtpdCcsICdraHRtbCcsICdtb3onLCAnTW96JywgJ21zJywgJ28nLCAnJ10sIGZ1bmN0aW9uKHZlbmRvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaChjc3NfcHJvcHMsIGZ1bmN0aW9uKHZhbHVlLCBwcm9wKSB7XHJcbiAgICAgICAgICAvLyB2ZW5kZXIgcHJlZml4IGF0IHRoZSBwcm9wZXJ0eVxyXG4gICAgICAgICAgaWYodmVuZG9yKSB7XHJcbiAgICAgICAgICAgIHByb3AgPSB2ZW5kb3IgKyBwcm9wLnN1YnN0cmluZygwLCAxKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAvLyByZXNldCB0aGUgc3R5bGVcclxuICAgICAgICAgIGlmKHByb3AgaW4gZWxlbWVudC5zdHlsZSkge1xyXG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlW3Byb3BdID0gJyc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWxzbyB0aGUgZW5hYmxlIG9uc2VsZWN0c3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyU2VsZWN0ID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uc2VsZWN0c3RhcnQgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGFuZCBlbmFibGUgb25kcmFnc3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyRHJhZyA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbmRyYWdzdGFydCA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBjcmVhdGUgbmV3IGhhbW1lciBpbnN0YW5jZVxyXG4gKiBhbGwgbWV0aG9kcyBzaG91bGQgcmV0dXJuIHRoZSBpbnN0YW5jZSBpdHNlbGYsIHNvIGl0IGlzIGNoYWluYWJsZS5cclxuICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgICAgICBlbGVtZW50XHJcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICAgICAgW29wdGlvbnM9e31dXHJcbiAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxuSGFtbWVyLkluc3RhbmNlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gc2V0dXAgSGFtbWVySlMgd2luZG93IGV2ZW50cyBhbmQgcmVnaXN0ZXIgYWxsIGdlc3R1cmVzXHJcbiAgLy8gdGhpcyBhbHNvIHNldHMgdXAgdGhlIGRlZmF1bHQgb3B0aW9uc1xyXG4gIHNldHVwKCk7XHJcblxyXG4gIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XHJcblxyXG4gIC8vIHN0YXJ0L3N0b3AgZGV0ZWN0aW9uIG9wdGlvblxyXG4gIHRoaXMuZW5hYmxlZCA9IHRydWU7XHJcblxyXG4gIC8vIG1lcmdlIG9wdGlvbnNcclxuICB0aGlzLm9wdGlvbnMgPSBIYW1tZXIudXRpbHMuZXh0ZW5kKFxyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgSGFtbWVyLmRlZmF1bHRzKSxcclxuICAgIG9wdGlvbnMgfHwge30pO1xyXG5cclxuICAvLyBhZGQgc29tZSBjc3MgdG8gdGhlIGVsZW1lbnQgdG8gcHJldmVudCB0aGUgYnJvd3NlciBmcm9tIGRvaW5nIGl0cyBuYXRpdmUgYmVoYXZvaXJcclxuICBpZih0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKSB7XHJcbiAgICBIYW1tZXIudXRpbHMuc3RvcERlZmF1bHRCcm93c2VyQmVoYXZpb3IodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKTtcclxuICB9XHJcblxyXG4gIC8vIHN0YXJ0IGRldGVjdGlvbiBvbiB0b3VjaHN0YXJ0XHJcbiAgdGhpcy5fZXZlbnRTdGFydEhhbmRsZXIgPSBIYW1tZXIuZXZlbnQub25Ub3VjaChlbGVtZW50LCBIYW1tZXIuRVZFTlRfU1RBUlQsIGZ1bmN0aW9uKGV2KSB7XHJcbiAgICBpZihzZWxmLmVuYWJsZWQpIHtcclxuICAgICAgSGFtbWVyLmRldGVjdGlvbi5zdGFydERldGVjdChzZWxmLCBldik7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIC8vIGtlZXAgYSBsaXN0IG9mIHVzZXIgZXZlbnQgaGFuZGxlcnMgd2hpY2ggbmVlZHMgdG8gYmUgcmVtb3ZlZCB3aGVuIGNhbGxpbmcgJ2Rpc3Bvc2UnXHJcbiAgdGhpcy5fZXZlbnRIYW5kbGVyID0gW107XHJcblxyXG4gIC8vIHJldHVybiBpbnN0YW5jZVxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbkhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUgPSB7XHJcbiAgLyoqXHJcbiAgICogYmluZCBldmVudHMgdG8gdGhlIGluc3RhbmNlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICBoYW5kbGVyXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBvbjogZnVuY3Rpb24gb25FdmVudChnZXN0dXJlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgZ2VzdHVyZXMgPSBnZXN0dXJlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChnZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihnZXN0dXJlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICAgIHRoaXMuX2V2ZW50SGFuZGxlci5wdXNoKHsgZ2VzdHVyZTogZ2VzdHVyZSwgaGFuZGxlcjogaGFuZGxlciB9KTtcclxuICAgIH0sIHRoaXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHVuYmluZCBldmVudHMgdG8gdGhlIGluc3RhbmNlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICBoYW5kbGVyXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBvZmY6IGZ1bmN0aW9uIG9mZkV2ZW50KGdlc3R1cmUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBnZXN0dXJlcyA9IGdlc3R1cmUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKGdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGdlc3R1cmUsIGhhbmRsZXIsIGZhbHNlKTtcclxuXHJcbiAgICAgIC8vIHJlbW92ZSB0aGUgZXZlbnQgaGFuZGxlciBmcm9tIHRoZSBpbnRlcm5hbCBsaXN0XHJcbiAgICAgIHZhciBpbmRleCA9IC0xO1xyXG4gICAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLl9ldmVudEhhbmRsZXIsIGZ1bmN0aW9uKGV2ZW50SGFuZGxlciwgaSkge1xyXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEgJiYgZXZlbnRIYW5kbGVyLmdlc3R1cmUgPT09IGdlc3R1cmUgJiYgZXZlbnRIYW5kbGVyLmhhbmRsZXIgPT09IGhhbmRsZXIpIHtcclxuICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sIHRoaXMpO1xyXG5cclxuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcclxuICAgICAgICB0aGlzLl9ldmVudEhhbmRsZXIuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgfVxyXG4gICAgfSwgdGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdHJpZ2dlciBnZXN0dXJlIGV2ZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICBbZXZlbnREYXRhXVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgdHJpZ2dlcjogZnVuY3Rpb24gdHJpZ2dlckV2ZW50KGdlc3R1cmUsIGV2ZW50RGF0YSkge1xyXG4gICAgLy8gb3B0aW9uYWxcclxuICAgIGlmKCFldmVudERhdGEpIHtcclxuICAgICAgZXZlbnREYXRhID0ge307XHJcbiAgICB9XHJcblxyXG4gICAgLy8gY3JlYXRlIERPTSBldmVudFxyXG4gICAgdmFyIGV2ZW50ID0gSGFtbWVyLkRPQ1VNRU5ULmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xyXG4gICAgZXZlbnQuaW5pdEV2ZW50KGdlc3R1cmUsIHRydWUsIHRydWUpO1xyXG4gICAgZXZlbnQuZ2VzdHVyZSA9IGV2ZW50RGF0YTtcclxuXHJcbiAgICAvLyB0cmlnZ2VyIG9uIHRoZSB0YXJnZXQgaWYgaXQgaXMgaW4gdGhlIGluc3RhbmNlIGVsZW1lbnQsXHJcbiAgICAvLyB0aGlzIGlzIGZvciBldmVudCBkZWxlZ2F0aW9uIHRyaWNrc1xyXG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLmVsZW1lbnQ7XHJcbiAgICBpZihIYW1tZXIudXRpbHMuaGFzUGFyZW50KGV2ZW50RGF0YS50YXJnZXQsIGVsZW1lbnQpKSB7XHJcbiAgICAgIGVsZW1lbnQgPSBldmVudERhdGEudGFyZ2V0O1xyXG4gICAgfVxyXG5cclxuICAgIGVsZW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZW5hYmxlIG9mIGRpc2FibGUgaGFtbWVyLmpzIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtCb29sZWFufSAgIHN0YXRlXHJcbiAgICogQHJldHVybnMge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKi9cclxuICBlbmFibGU6IGZ1bmN0aW9uIGVuYWJsZShzdGF0ZSkge1xyXG4gICAgdGhpcy5lbmFibGVkID0gc3RhdGU7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZGlzcG9zZSB0aGlzIGhhbW1lciBpbnN0YW5jZVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgZGlzcG9zZTogZnVuY3Rpb24gZGlzcG9zZSgpIHtcclxuXHJcbiAgICAvLyB1bmRvIGFsbCBjaGFuZ2VzIG1hZGUgYnkgc3RvcF9icm93c2VyX2JlaGF2aW9yXHJcbiAgICBpZih0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKSB7XHJcbiAgICAgIEhhbW1lci51dGlscy5zdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3IodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMuc3RvcF9icm93c2VyX2JlaGF2aW9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyB1bmJpbmQgYWxsIGN1c3RvbSBldmVudCBoYW5kbGVyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5fZXZlbnRIYW5kbGVyLCBmdW5jdGlvbihldmVudEhhbmRsZXIpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRIYW5kbGVyLmdlc3R1cmUsIGV2ZW50SGFuZGxlci5oYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHRoaXMuX2V2ZW50SGFuZGxlci5sZW5ndGggPSAwO1xyXG5cclxuICAgIC8vIHVuYmluZCB0aGUgc3RhcnQgZXZlbnQgbGlzdGVuZXJcclxuICAgIEhhbW1lci5ldmVudC51bmJpbmREb20odGhpcy5lbGVtZW50LCBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX1NUQVJUXSwgdGhpcy5fZXZlbnRTdGFydEhhbmRsZXIpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGlzIGhvbGRzIHRoZSBsYXN0IG1vdmUgZXZlbnQsXHJcbiAqIHVzZWQgdG8gZml4IGVtcHR5IHRvdWNoZW5kIGlzc3VlXHJcbiAqIHNlZSB0aGUgb25Ub3VjaCBldmVudCBmb3IgYW4gZXhwbGFuYXRpb25cclxuICogQHR5cGUge09iamVjdH1cclxuICovXHJcbnZhciBsYXN0X21vdmVfZXZlbnQgPSBudWxsO1xyXG5cclxuXHJcbi8qKlxyXG4gKiB3aGVuIHRoZSBtb3VzZSBpcyBob2xkIGRvd24sIHRoaXMgaXMgdHJ1ZVxyXG4gKiBAdHlwZSB7Qm9vbGVhbn1cclxuICovXHJcbnZhciBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcblxyXG5cclxuLyoqXHJcbiAqIHdoZW4gdG91Y2ggZXZlbnRzIGhhdmUgYmVlbiBmaXJlZCwgdGhpcyBpcyB0cnVlXHJcbiAqIEB0eXBlIHtCb29sZWFufVxyXG4gKi9cclxudmFyIHRvdWNoX3RyaWdnZXJlZCA9IGZhbHNlO1xyXG5cclxuXHJcbkhhbW1lci5ldmVudCA9IHtcclxuICAvKipcclxuICAgKiBzaW1wbGUgYWRkRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHR5cGVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIGJpbmREb206IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciB0eXBlcyA9IHR5cGUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHR5cGVzLCBmdW5jdGlvbih0eXBlKXtcclxuICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzaW1wbGUgcmVtb3ZlRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHR5cGVcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIHVuYmluZERvbTogZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHR5cGVzID0gdHlwZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godHlwZXMsIGZ1bmN0aW9uKHR5cGUpe1xyXG4gICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRvdWNoIGV2ZW50cyB3aXRoIG1vdXNlIGZhbGxiYWNrXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlICAgICAgICBsaWtlIEhhbW1lci5FVkVOVF9NT1ZFXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBvblRvdWNoOiBmdW5jdGlvbiBvblRvdWNoKGVsZW1lbnQsIGV2ZW50VHlwZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgIHZhciBmbiA9IGZ1bmN0aW9uIGJpbmREb21PblRvdWNoKGV2KSB7XHJcbiAgICAgIHZhciBzb3VyY2VFdmVudFR5cGUgPSBldi50eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAvLyBvbm1vdXNldXAsIGJ1dCB3aGVuIHRvdWNoZW5kIGhhcyBiZWVuIGZpcmVkIHdlIGRvIG5vdGhpbmcuXHJcbiAgICAgIC8vIHRoaXMgaXMgZm9yIHRvdWNoZGV2aWNlcyB3aGljaCBhbHNvIGZpcmUgYSBtb3VzZXVwIG9uIHRvdWNoZW5kXHJcbiAgICAgIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiB0b3VjaF90cmlnZ2VyZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG1vdXNlYnV0dG9uIG11c3QgYmUgZG93biBvciBhIHRvdWNoIGV2ZW50XHJcbiAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaC8pIHx8ICAgLy8gdG91Y2ggZXZlbnRzIGFyZSBhbHdheXMgb24gc2NyZWVuXHJcbiAgICAgICAgc291cmNlRXZlbnRUeXBlLm1hdGNoKC9wb2ludGVyZG93bi8pIHx8IC8vIHBvaW50ZXJldmVudHMgdG91Y2hcclxuICAgICAgICAoc291cmNlRXZlbnRUeXBlLm1hdGNoKC9tb3VzZS8pICYmIGV2LndoaWNoID09PSAxKSAgIC8vIG1vdXNlIGlzIHByZXNzZWRcclxuICAgICAgICApIHtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gbW91c2UgaXNuJ3QgcHJlc3NlZFxyXG4gICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiAhZXYud2hpY2gpIHtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICAvLyB3ZSBhcmUgaW4gYSB0b3VjaCBldmVudCwgc2V0IHRoZSB0b3VjaCB0cmlnZ2VyZWQgYm9vbCB0byB0cnVlLFxyXG4gICAgICAvLyB0aGlzIGZvciB0aGUgY29uZmxpY3RzIHRoYXQgbWF5IG9jY3VyIG9uIGlvcyBhbmQgYW5kcm9pZFxyXG4gICAgICBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNofHBvaW50ZXIvKSkge1xyXG4gICAgICAgIHRvdWNoX3RyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGNvdW50IHRoZSB0b3RhbCB0b3VjaGVzIG9uIHRoZSBzY3JlZW5cclxuICAgICAgdmFyIGNvdW50X3RvdWNoZXMgPSAwO1xyXG5cclxuICAgICAgLy8gd2hlbiB0b3VjaCBoYXMgYmVlbiB0cmlnZ2VyZWQgaW4gdGhpcyBkZXRlY3Rpb24gc2Vzc2lvblxyXG4gICAgICAvLyBhbmQgd2UgYXJlIG5vdyBoYW5kbGluZyBhIG1vdXNlIGV2ZW50LCB3ZSBzdG9wIHRoYXQgdG8gcHJldmVudCBjb25mbGljdHNcclxuICAgICAgaWYoZW5hYmxlX2RldGVjdCkge1xyXG4gICAgICAgIC8vIHVwZGF0ZSBwb2ludGVyZXZlbnRcclxuICAgICAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgJiYgZXZlbnRUeXBlICE9IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LnVwZGF0ZVBvaW50ZXIoZXZlbnRUeXBlLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRvdWNoXHJcbiAgICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL3RvdWNoLykpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBldi50b3VjaGVzLmxlbmd0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbW91c2VcclxuICAgICAgICBlbHNlIGlmKCF0b3VjaF90cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBzb3VyY2VFdmVudFR5cGUubWF0Y2goL3VwLykgPyAwIDogMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlmIHdlIGFyZSBpbiBhIGVuZCBldmVudCwgYnV0IHdoZW4gd2UgcmVtb3ZlIG9uZSB0b3VjaCBhbmRcclxuICAgICAgICAvLyB3ZSBzdGlsbCBoYXZlIGVub3VnaCwgc2V0IGV2ZW50VHlwZSB0byBtb3ZlXHJcbiAgICAgICAgaWYoY291bnRfdG91Y2hlcyA+IDAgJiYgZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGV2ZW50VHlwZSA9IEhhbW1lci5FVkVOVF9NT1ZFO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBubyB0b3VjaGVzLCBmb3JjZSB0aGUgZW5kIGV2ZW50XHJcbiAgICAgICAgZWxzZSBpZighY291bnRfdG91Y2hlcykge1xyXG4gICAgICAgICAgZXZlbnRUeXBlID0gSGFtbWVyLkVWRU5UX0VORDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN0b3JlIHRoZSBsYXN0IG1vdmUgZXZlbnRcclxuICAgICAgICBpZihjb3VudF90b3VjaGVzIHx8IGxhc3RfbW92ZV9ldmVudCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgbGFzdF9tb3ZlX2V2ZW50ID0gZXY7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHRoZSBoYW5kbGVyXHJcbiAgICAgICAgaGFuZGxlci5jYWxsKEhhbW1lci5kZXRlY3Rpb24sIHNlbGYuY29sbGVjdEV2ZW50RGF0YShlbGVtZW50LCBldmVudFR5cGUsIHNlbGYuZ2V0VG91Y2hMaXN0KGxhc3RfbW92ZV9ldmVudCwgZXZlbnRUeXBlKSwgZXYpKTtcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHBvaW50ZXJldmVudCBmcm9tIGxpc3RcclxuICAgICAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgJiYgZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgICAgIGNvdW50X3RvdWNoZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LnVwZGF0ZVBvaW50ZXIoZXZlbnRUeXBlLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBvbiB0aGUgZW5kIHdlIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgaWYoIWNvdW50X3RvdWNoZXMpIHtcclxuICAgICAgICBsYXN0X21vdmVfZXZlbnQgPSBudWxsO1xyXG4gICAgICAgIGVuYWJsZV9kZXRlY3QgPSBmYWxzZTtcclxuICAgICAgICB0b3VjaF90cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBIYW1tZXIuUG9pbnRlckV2ZW50LnJlc2V0KCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5iaW5kRG9tKGVsZW1lbnQsIEhhbW1lci5FVkVOVF9UWVBFU1tldmVudFR5cGVdLCBmbik7XHJcblxyXG4gICAgLy8gcmV0dXJuIHRoZSBib3VuZCBmdW5jdGlvbiB0byBiZSBhYmxlIHRvIHVuYmluZCBpdCBsYXRlclxyXG4gICAgcmV0dXJuIGZuO1xyXG4gICAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHdlIGhhdmUgZGlmZmVyZW50IGV2ZW50cyBmb3IgZWFjaCBkZXZpY2UvYnJvd3NlclxyXG4gICAqIGRldGVybWluZSB3aGF0IHdlIG5lZWQgYW5kIHNldCB0aGVtIGluIHRoZSBIYW1tZXIuRVZFTlRfVFlQRVMgY29uc3RhbnRcclxuICAgKi9cclxuICBkZXRlcm1pbmVFdmVudFR5cGVzOiBmdW5jdGlvbiBkZXRlcm1pbmVFdmVudFR5cGVzKCkge1xyXG4gICAgLy8gZGV0ZXJtaW5lIHRoZSBldmVudHR5cGUgd2Ugd2FudCB0byBzZXRcclxuICAgIHZhciB0eXBlcztcclxuXHJcbiAgICAvLyBwb2ludGVyRXZlbnRzIG1hZ2ljXHJcbiAgICBpZihIYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMpIHtcclxuICAgICAgdHlwZXMgPSBIYW1tZXIuUG9pbnRlckV2ZW50LmdldEV2ZW50cygpO1xyXG4gICAgfVxyXG4gICAgLy8gb24gQW5kcm9pZCwgaU9TLCBibGFja2JlcnJ5LCB3aW5kb3dzIG1vYmlsZSB3ZSBkb250IHdhbnQgYW55IG1vdXNlZXZlbnRzXHJcbiAgICBlbHNlIGlmKEhhbW1lci5OT19NT1VTRUVWRU5UUykge1xyXG4gICAgICB0eXBlcyA9IFtcclxuICAgICAgICAndG91Y2hzdGFydCcsXHJcbiAgICAgICAgJ3RvdWNobW92ZScsXHJcbiAgICAgICAgJ3RvdWNoZW5kIHRvdWNoY2FuY2VsJ107XHJcbiAgICB9XHJcbiAgICAvLyBmb3Igbm9uIHBvaW50ZXIgZXZlbnRzIGJyb3dzZXJzIGFuZCBtaXhlZCBicm93c2VycyxcclxuICAgIC8vIGxpa2UgY2hyb21lIG9uIHdpbmRvd3M4IHRvdWNoIGxhcHRvcFxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHR5cGVzID0gW1xyXG4gICAgICAgICd0b3VjaHN0YXJ0IG1vdXNlZG93bicsXHJcbiAgICAgICAgJ3RvdWNobW92ZSBtb3VzZW1vdmUnLFxyXG4gICAgICAgICd0b3VjaGVuZCB0b3VjaGNhbmNlbCBtb3VzZXVwJ107XHJcbiAgICB9XHJcblxyXG4gICAgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9TVEFSVF0gPSB0eXBlc1swXTtcclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfTU9WRV0gPSB0eXBlc1sxXTtcclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfRU5EXSA9IHR5cGVzWzJdO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjcmVhdGUgdG91Y2hsaXN0IGRlcGVuZGluZyBvbiB0aGUgZXZlbnRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBldlxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgIGV2ZW50VHlwZSAgIHVzZWQgYnkgdGhlIGZha2VtdWx0aXRvdWNoIHBsdWdpblxyXG4gICAqL1xyXG4gIGdldFRvdWNoTGlzdDogZnVuY3Rpb24gZ2V0VG91Y2hMaXN0KGV2LyosIGV2ZW50VHlwZSovKSB7XHJcbiAgICAvLyBnZXQgdGhlIGZha2UgcG9pbnRlckV2ZW50IHRvdWNobGlzdFxyXG4gICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTKSB7XHJcbiAgICAgIHJldHVybiBIYW1tZXIuUG9pbnRlckV2ZW50LmdldFRvdWNoTGlzdCgpO1xyXG4gICAgfVxyXG4gICAgLy8gZ2V0IHRoZSB0b3VjaGxpc3RcclxuICAgIGVsc2UgaWYoZXYudG91Y2hlcykge1xyXG4gICAgICByZXR1cm4gZXYudG91Y2hlcztcclxuICAgIH1cclxuICAgIC8vIG1ha2UgZmFrZSB0b3VjaGxpc3QgZnJvbSBtb3VzZSBwb3NpdGlvblxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGV2LmlkZW50aWZpZXIgPSAxO1xyXG4gICAgICByZXR1cm4gW2V2XTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY29sbGVjdCBldmVudCBkYXRhIGZvciBIYW1tZXIganNcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGUgICAgICAgIGxpa2UgSGFtbWVyLkVWRU5UX01PVkVcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgY29sbGVjdEV2ZW50RGF0YTogZnVuY3Rpb24gY29sbGVjdEV2ZW50RGF0YShlbGVtZW50LCBldmVudFR5cGUsIHRvdWNoZXMsIGV2KSB7XHJcbiAgICAvLyBmaW5kIG91dCBwb2ludGVyVHlwZVxyXG4gICAgdmFyIHBvaW50ZXJUeXBlID0gSGFtbWVyLlBPSU5URVJfVE9VQ0g7XHJcbiAgICBpZihldi50eXBlLm1hdGNoKC9tb3VzZS8pIHx8IEhhbW1lci5Qb2ludGVyRXZlbnQubWF0Y2hUeXBlKEhhbW1lci5QT0lOVEVSX01PVVNFLCBldikpIHtcclxuICAgICAgcG9pbnRlclR5cGUgPSBIYW1tZXIuUE9JTlRFUl9NT1VTRTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjZW50ZXIgICAgIDogSGFtbWVyLnV0aWxzLmdldENlbnRlcih0b3VjaGVzKSxcclxuICAgICAgdGltZVN0YW1wICA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG4gICAgICB0YXJnZXQgICAgIDogZXYudGFyZ2V0LFxyXG4gICAgICB0b3VjaGVzICAgIDogdG91Y2hlcyxcclxuICAgICAgZXZlbnRUeXBlICA6IGV2ZW50VHlwZSxcclxuICAgICAgcG9pbnRlclR5cGU6IHBvaW50ZXJUeXBlLFxyXG4gICAgICBzcmNFdmVudCAgIDogZXYsXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcHJldmVudCB0aGUgYnJvd3NlciBkZWZhdWx0IGFjdGlvbnNcclxuICAgICAgICogbW9zdGx5IHVzZWQgdG8gZGlzYWJsZSBzY3JvbGxpbmcgb2YgdGhlIGJyb3dzZXJcclxuICAgICAgICovXHJcbiAgICAgIHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICBpZih0aGlzLnNyY0V2ZW50LnByZXZlbnRNYW5pcHVsYXRpb24pIHtcclxuICAgICAgICAgIHRoaXMuc3JjRXZlbnQucHJldmVudE1hbmlwdWxhdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGhpcy5zcmNFdmVudC5wcmV2ZW50RGVmYXVsdCkge1xyXG4gICAgICAgICAgdGhpcy5zcmNFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBzdG9wIGJ1YmJsaW5nIHRoZSBldmVudCB1cCB0byBpdHMgcGFyZW50c1xyXG4gICAgICAgKi9cclxuICAgICAgc3RvcFByb3BhZ2F0aW9uOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnNyY0V2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICB9LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIGltbWVkaWF0ZWx5IHN0b3AgZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgICAgICogbWlnaHQgYmUgdXNlZnVsIGFmdGVyIGEgc3dpcGUgd2FzIGRldGVjdGVkXHJcbiAgICAgICAqIEByZXR1cm4geyp9XHJcbiAgICAgICAqL1xyXG4gICAgICBzdG9wRGV0ZWN0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gSGFtbWVyLmRldGVjdGlvbi5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuSGFtbWVyLlBvaW50ZXJFdmVudCA9IHtcclxuICAvKipcclxuICAgKiBob2xkcyBhbGwgcG9pbnRlcnNcclxuICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAqL1xyXG4gIHBvaW50ZXJzOiB7fSxcclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IGEgbGlzdCBvZiBwb2ludGVyc1xyXG4gICAqIEByZXR1cm5zIHtBcnJheX0gICAgIHRvdWNobGlzdFxyXG4gICAqL1xyXG4gIGdldFRvdWNoTGlzdDogZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgdG91Y2hsaXN0ID0gW107XHJcblxyXG4gICAgLy8gd2UgY2FuIHVzZSBmb3JFYWNoIHNpbmNlIHBvaW50ZXJFdmVudHMgb25seSBpcyBpbiBJRTEwXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChzZWxmLnBvaW50ZXJzLCBmdW5jdGlvbihwb2ludGVyKXtcclxuICAgICAgdG91Y2hsaXN0LnB1c2gocG9pbnRlcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdG91Y2hsaXN0O1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIHVwZGF0ZSB0aGUgcG9zaXRpb24gb2YgYSBwb2ludGVyXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICB0eXBlICAgICAgICAgICAgIEhhbW1lci5FVkVOVF9FTkRcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgIHBvaW50ZXJFdmVudFxyXG4gICAqL1xyXG4gIHVwZGF0ZVBvaW50ZXI6IGZ1bmN0aW9uKHR5cGUsIHBvaW50ZXJFdmVudCkge1xyXG4gICAgaWYodHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIGRlbGV0ZSB0aGlzLnBvaW50ZXJzW3BvaW50ZXJFdmVudC5wb2ludGVySWRdO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHBvaW50ZXJFdmVudC5pZGVudGlmaWVyID0gcG9pbnRlckV2ZW50LnBvaW50ZXJJZDtcclxuICAgICAgdGhpcy5wb2ludGVyc1twb2ludGVyRXZlbnQucG9pbnRlcklkXSA9IHBvaW50ZXJFdmVudDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5wb2ludGVycykubGVuZ3RoO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIGNoZWNrIGlmIGV2IG1hdGNoZXMgcG9pbnRlcnR5cGVcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgcG9pbnRlclR5cGUgICAgIEhhbW1lci5QT0lOVEVSX01PVVNFXHJcbiAgICogQHBhcmFtICAge1BvaW50ZXJFdmVudH0gIGV2XHJcbiAgICovXHJcbiAgbWF0Y2hUeXBlOiBmdW5jdGlvbihwb2ludGVyVHlwZSwgZXYpIHtcclxuICAgIGlmKCFldi5wb2ludGVyVHlwZSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHB0ID0gZXYucG9pbnRlclR5cGUsXHJcbiAgICAgIHR5cGVzID0ge307XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9NT1VTRV0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX01PVVNFIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9NT1VTRSk7XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9UT1VDSF0gPSAocHQgPT09IGV2Lk1TUE9JTlRFUl9UWVBFX1RPVUNIIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9UT1VDSCk7XHJcbiAgICB0eXBlc1tIYW1tZXIuUE9JTlRFUl9QRU5dID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9QRU4gfHwgcHQgPT09IEhhbW1lci5QT0lOVEVSX1BFTik7XHJcbiAgICByZXR1cm4gdHlwZXNbcG9pbnRlclR5cGVdO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBnZXQgZXZlbnRzXHJcbiAgICovXHJcbiAgZ2V0RXZlbnRzOiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgICdwb2ludGVyZG93biBNU1BvaW50ZXJEb3duJyxcclxuICAgICAgJ3BvaW50ZXJtb3ZlIE1TUG9pbnRlck1vdmUnLFxyXG4gICAgICAncG9pbnRlcnVwIHBvaW50ZXJjYW5jZWwgTVNQb2ludGVyVXAgTVNQb2ludGVyQ2FuY2VsJ1xyXG4gICAgXTtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiByZXNldCB0aGUgbGlzdFxyXG4gICAqL1xyXG4gIHJlc2V0OiBmdW5jdGlvbigpIHtcclxuICAgIHRoaXMucG9pbnRlcnMgPSB7fTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuSGFtbWVyLmRldGVjdGlvbiA9IHtcclxuICAvLyBjb250YWlucyBhbGwgcmVnaXN0cmVkIEhhbW1lci5nZXN0dXJlcyBpbiB0aGUgY29ycmVjdCBvcmRlclxyXG4gIGdlc3R1cmVzOiBbXSxcclxuXHJcbiAgLy8gZGF0YSBvZiB0aGUgY3VycmVudCBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb24gc2Vzc2lvblxyXG4gIGN1cnJlbnQgOiBudWxsLFxyXG5cclxuICAvLyB0aGUgcHJldmlvdXMgSGFtbWVyLmdlc3R1cmUgc2Vzc2lvbiBkYXRhXHJcbiAgLy8gaXMgYSBmdWxsIGNsb25lIG9mIHRoZSBwcmV2aW91cyBnZXN0dXJlLmN1cnJlbnQgb2JqZWN0XHJcbiAgcHJldmlvdXM6IG51bGwsXHJcblxyXG4gIC8vIHdoZW4gdGhpcyBiZWNvbWVzIHRydWUsIG5vIGdlc3R1cmVzIGFyZSBmaXJlZFxyXG4gIHN0b3BwZWQgOiBmYWxzZSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHN0YXJ0IEhhbW1lci5nZXN0dXJlIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtIYW1tZXIuSW5zdGFuY2V9ICAgaW5zdFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICAgICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgc3RhcnREZXRlY3Q6IGZ1bmN0aW9uIHN0YXJ0RGV0ZWN0KGluc3QsIGV2ZW50RGF0YSkge1xyXG4gICAgLy8gYWxyZWFkeSBidXN5IHdpdGggYSBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb24gb24gYW4gZWxlbWVudFxyXG4gICAgaWYodGhpcy5jdXJyZW50KSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnN0b3BwZWQgPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLmN1cnJlbnQgPSB7XHJcbiAgICAgIGluc3QgICAgICA6IGluc3QsIC8vIHJlZmVyZW5jZSB0byBIYW1tZXJJbnN0YW5jZSB3ZSdyZSB3b3JraW5nIGZvclxyXG4gICAgICBzdGFydEV2ZW50OiBIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCBldmVudERhdGEpLCAvLyBzdGFydCBldmVudERhdGEgZm9yIGRpc3RhbmNlcywgdGltaW5nIGV0Y1xyXG4gICAgICBsYXN0RXZlbnQgOiBmYWxzZSwgLy8gbGFzdCBldmVudERhdGFcclxuICAgICAgbGFzdFZFdmVudDogZmFsc2UsIC8vIGxhc3QgZXZlbnREYXRhIGZvciB2ZWxvY2l0eS5cclxuICAgICAgdmVsb2NpdHkgIDogZmFsc2UsIC8vIGN1cnJlbnQgdmVsb2NpdHlcclxuICAgICAgbmFtZSAgICAgIDogJycgLy8gY3VycmVudCBnZXN0dXJlIHdlJ3JlIGluL2RldGVjdGVkLCBjYW4gYmUgJ3RhcCcsICdob2xkJyBldGNcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5kZXRlY3QoZXZlbnREYXRhKTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZlbnREYXRhXHJcbiAgICovXHJcbiAgZGV0ZWN0OiBmdW5jdGlvbiBkZXRlY3QoZXZlbnREYXRhKSB7XHJcbiAgICBpZighdGhpcy5jdXJyZW50IHx8IHRoaXMuc3RvcHBlZCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXh0ZW5kIGV2ZW50IGRhdGEgd2l0aCBjYWxjdWxhdGlvbnMgYWJvdXQgc2NhbGUsIGRpc3RhbmNlIGV0Y1xyXG4gICAgZXZlbnREYXRhID0gdGhpcy5leHRlbmRFdmVudERhdGEoZXZlbnREYXRhKTtcclxuXHJcbiAgICAvLyBpbnN0YW5jZSBvcHRpb25zXHJcbiAgICB2YXIgaW5zdF9vcHRpb25zID0gdGhpcy5jdXJyZW50Lmluc3Qub3B0aW9ucztcclxuXHJcbiAgICAvLyBjYWxsIEhhbW1lci5nZXN0dXJlIGhhbmRsZXJzXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0aGlzLmdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKSB7XHJcbiAgICAgIC8vIG9ubHkgd2hlbiB0aGUgaW5zdGFuY2Ugb3B0aW9ucyBoYXZlIGVuYWJsZWQgdGhpcyBnZXN0dXJlXHJcbiAgICAgIGlmKCF0aGlzLnN0b3BwZWQgJiYgaW5zdF9vcHRpb25zW2dlc3R1cmUubmFtZV0gIT09IGZhbHNlKSB7XHJcbiAgICAgICAgLy8gaWYgYSBoYW5kbGVyIHJldHVybnMgZmFsc2UsIHdlIHN0b3Agd2l0aCB0aGUgZGV0ZWN0aW9uXHJcbiAgICAgICAgaWYoZ2VzdHVyZS5oYW5kbGVyLmNhbGwoZ2VzdHVyZSwgZXZlbnREYXRhLCB0aGlzLmN1cnJlbnQuaW5zdCkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICB0aGlzLnN0b3BEZXRlY3QoKTtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0sIHRoaXMpO1xyXG5cclxuICAgIC8vIHN0b3JlIGFzIHByZXZpb3VzIGV2ZW50IGV2ZW50XHJcbiAgICBpZih0aGlzLmN1cnJlbnQpIHtcclxuICAgICAgdGhpcy5jdXJyZW50Lmxhc3RFdmVudCA9IGV2ZW50RGF0YTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBlbmRldmVudCwgYnV0IG5vdCB0aGUgbGFzdCB0b3VjaCwgc28gZG9udCBzdG9wXHJcbiAgICBpZihldmVudERhdGEuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQgJiYgIWV2ZW50RGF0YS50b3VjaGVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgdGhpcy5zdG9wRGV0ZWN0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGV2ZW50RGF0YTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2xlYXIgdGhlIEhhbW1lci5nZXN0dXJlIHZhcnNcclxuICAgKiB0aGlzIGlzIGNhbGxlZCBvbiBlbmREZXRlY3QsIGJ1dCBjYW4gYWxzbyBiZSB1c2VkIHdoZW4gYSBmaW5hbCBIYW1tZXIuZ2VzdHVyZSBoYXMgYmVlbiBkZXRlY3RlZFxyXG4gICAqIHRvIHN0b3Agb3RoZXIgSGFtbWVyLmdlc3R1cmVzIGZyb20gYmVpbmcgZmlyZWRcclxuICAgKi9cclxuICBzdG9wRGV0ZWN0OiBmdW5jdGlvbiBzdG9wRGV0ZWN0KCkge1xyXG4gICAgLy8gY2xvbmUgY3VycmVudCBkYXRhIHRvIHRoZSBzdG9yZSBhcyB0aGUgcHJldmlvdXMgZ2VzdHVyZVxyXG4gICAgLy8gdXNlZCBmb3IgdGhlIGRvdWJsZSB0YXAgZ2VzdHVyZSwgc2luY2UgdGhpcyBpcyBhbiBvdGhlciBnZXN0dXJlIGRldGVjdCBzZXNzaW9uXHJcbiAgICB0aGlzLnByZXZpb3VzID0gSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgdGhpcy5jdXJyZW50KTtcclxuXHJcbiAgICAvLyByZXNldCB0aGUgY3VycmVudFxyXG4gICAgdGhpcy5jdXJyZW50ID0gbnVsbDtcclxuXHJcbiAgICAvLyBzdG9wcGVkIVxyXG4gICAgdGhpcy5zdG9wcGVkID0gdHJ1ZTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZXh0ZW5kIGV2ZW50RGF0YSBmb3IgSGFtbWVyLmdlc3R1cmVzXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICBldlxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgZXZcclxuICAgKi9cclxuICBleHRlbmRFdmVudERhdGE6IGZ1bmN0aW9uIGV4dGVuZEV2ZW50RGF0YShldikge1xyXG4gICAgdmFyIHN0YXJ0RXYgPSB0aGlzLmN1cnJlbnQuc3RhcnRFdmVudCxcclxuICAgICAgICBsYXN0VkV2ID0gdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQ7XHJcblxyXG4gICAgLy8gaWYgdGhlIHRvdWNoZXMgY2hhbmdlLCBzZXQgdGhlIG5ldyB0b3VjaGVzIG92ZXIgdGhlIHN0YXJ0RXZlbnQgdG91Y2hlc1xyXG4gICAgLy8gdGhpcyBiZWNhdXNlIHRvdWNoZXZlbnRzIGRvbid0IGhhdmUgYWxsIHRoZSB0b3VjaGVzIG9uIHRvdWNoc3RhcnQsIG9yIHRoZVxyXG4gICAgLy8gdXNlciBtdXN0IHBsYWNlIGhpcyBmaW5nZXJzIGF0IHRoZSBFWEFDVCBzYW1lIHRpbWUgb24gdGhlIHNjcmVlbiwgd2hpY2ggaXMgbm90IHJlYWxpc3RpY1xyXG4gICAgLy8gYnV0LCBzb21ldGltZXMgaXQgaGFwcGVucyB0aGF0IGJvdGggZmluZ2VycyBhcmUgdG91Y2hpbmcgYXQgdGhlIEVYQUNUIHNhbWUgdGltZVxyXG4gICAgaWYoc3RhcnRFdiAmJiAoZXYudG91Y2hlcy5sZW5ndGggIT0gc3RhcnRFdi50b3VjaGVzLmxlbmd0aCB8fCBldi50b3VjaGVzID09PSBzdGFydEV2LnRvdWNoZXMpKSB7XHJcbiAgICAgIC8vIGV4dGVuZCAxIGxldmVsIGRlZXAgdG8gZ2V0IHRoZSB0b3VjaGxpc3Qgd2l0aCB0aGUgdG91Y2ggb2JqZWN0c1xyXG4gICAgICBzdGFydEV2LnRvdWNoZXMgPSBbXTtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goZXYudG91Y2hlcywgZnVuY3Rpb24odG91Y2gpIHtcclxuICAgICAgICBzdGFydEV2LnRvdWNoZXMucHVzaChIYW1tZXIudXRpbHMuZXh0ZW5kKHt9LCB0b3VjaCkpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZGVsdGFfdGltZSA9IGV2LnRpbWVTdGFtcCAtIHN0YXJ0RXYudGltZVN0YW1wXHJcbiAgICAgICwgZGVsdGFfeCA9IGV2LmNlbnRlci5wYWdlWCAtIHN0YXJ0RXYuY2VudGVyLnBhZ2VYXHJcbiAgICAgICwgZGVsdGFfeSA9IGV2LmNlbnRlci5wYWdlWSAtIHN0YXJ0RXYuY2VudGVyLnBhZ2VZXHJcbiAgICAgICwgaW50ZXJpbUFuZ2xlXHJcbiAgICAgICwgaW50ZXJpbURpcmVjdGlvblxyXG4gICAgICAsIHZlbG9jaXR5ID0gdGhpcy5jdXJyZW50LnZlbG9jaXR5O1xyXG5cclxuICAgIGlmIChsYXN0VkV2ICE9PSBmYWxzZSAmJiBldi50aW1lU3RhbXAgLSBsYXN0VkV2LnRpbWVTdGFtcCA+IEhhbW1lci5VUERBVEVfVkVMT0NJVFlfSU5URVJWQUwpIHtcclxuXHJcbiAgICAgICAgdmVsb2NpdHkgPSAgSGFtbWVyLnV0aWxzLmdldFZlbG9jaXR5KGV2LnRpbWVTdGFtcCAtIGxhc3RWRXYudGltZVN0YW1wLCBldi5jZW50ZXIucGFnZVggLSBsYXN0VkV2LmNlbnRlci5wYWdlWCwgZXYuY2VudGVyLnBhZ2VZIC0gbGFzdFZFdi5jZW50ZXIucGFnZVkpO1xyXG4gICAgICAgIHRoaXMuY3VycmVudC5sYXN0VkV2ZW50ID0gZXY7XHJcblxyXG4gICAgICAgIGlmICh2ZWxvY2l0eS54ID4gMCAmJiB2ZWxvY2l0eS55ID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQudmVsb2NpdHkgPSB2ZWxvY2l0eTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmKHRoaXMuY3VycmVudC52ZWxvY2l0eSA9PT0gZmFsc2UpIHtcclxuICAgICAgICB2ZWxvY2l0eSA9IEhhbW1lci51dGlscy5nZXRWZWxvY2l0eShkZWx0YV90aW1lLCBkZWx0YV94LCBkZWx0YV95KTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQudmVsb2NpdHkgPSB2ZWxvY2l0eTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQubGFzdFZFdmVudCA9IGV2O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVuZCBldmVudHMgKGUuZy4gZHJhZ2VuZCkgZG9uJ3QgaGF2ZSB1c2VmdWwgdmFsdWVzIGZvciBpbnRlcmltRGlyZWN0aW9uICYgaW50ZXJpbUFuZ2xlXHJcbiAgICAvLyBiZWNhdXNlIHRoZSBwcmV2aW91cyBldmVudCBoYXMgZXhhY3RseSB0aGUgc2FtZSBjb29yZGluYXRlc1xyXG4gICAgLy8gc28gZm9yIGVuZCBldmVudHMsIHRha2UgdGhlIHByZXZpb3VzIHZhbHVlcyBvZiBpbnRlcmltRGlyZWN0aW9uICYgaW50ZXJpbUFuZ2xlXHJcbiAgICAvLyBpbnN0ZWFkIG9mIHJlY2FsY3VsYXRpbmcgdGhlbSBhbmQgZ2V0dGluZyBhIHNwdXJpb3VzICcwJ1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09PSAnZW5kJykge1xyXG4gICAgICBpbnRlcmltQW5nbGUgPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIHRoaXMuY3VycmVudC5sYXN0RXZlbnQuaW50ZXJpbUFuZ2xlO1xyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiB0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmludGVyaW1EaXJlY3Rpb247XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgaW50ZXJpbUFuZ2xlID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiBIYW1tZXIudXRpbHMuZ2V0QW5nbGUodGhpcy5jdXJyZW50Lmxhc3RFdmVudC5jZW50ZXIsIGV2LmNlbnRlcik7XHJcbiAgICAgIGludGVyaW1EaXJlY3Rpb24gPSB0aGlzLmN1cnJlbnQubGFzdEV2ZW50ICYmIEhhbW1lci51dGlscy5nZXREaXJlY3Rpb24odGhpcy5jdXJyZW50Lmxhc3RFdmVudC5jZW50ZXIsIGV2LmNlbnRlcik7XHJcbiAgICB9XHJcblxyXG4gICAgSGFtbWVyLnV0aWxzLmV4dGVuZChldiwge1xyXG4gICAgICBkZWx0YVRpbWU6IGRlbHRhX3RpbWUsXHJcblxyXG4gICAgICBkZWx0YVg6IGRlbHRhX3gsXHJcbiAgICAgIGRlbHRhWTogZGVsdGFfeSxcclxuXHJcbiAgICAgIHZlbG9jaXR5WDogdmVsb2NpdHkueCxcclxuICAgICAgdmVsb2NpdHlZOiB2ZWxvY2l0eS55LFxyXG5cclxuICAgICAgZGlzdGFuY2U6IEhhbW1lci51dGlscy5nZXREaXN0YW5jZShzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuXHJcbiAgICAgIGFuZ2xlOiBIYW1tZXIudXRpbHMuZ2V0QW5nbGUoc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcbiAgICAgIGludGVyaW1BbmdsZTogaW50ZXJpbUFuZ2xlLFxyXG5cclxuICAgICAgZGlyZWN0aW9uOiBIYW1tZXIudXRpbHMuZ2V0RGlyZWN0aW9uKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uOiBpbnRlcmltRGlyZWN0aW9uLFxyXG5cclxuICAgICAgc2NhbGU6IEhhbW1lci51dGlscy5nZXRTY2FsZShzdGFydEV2LnRvdWNoZXMsIGV2LnRvdWNoZXMpLFxyXG4gICAgICByb3RhdGlvbjogSGFtbWVyLnV0aWxzLmdldFJvdGF0aW9uKHN0YXJ0RXYudG91Y2hlcywgZXYudG91Y2hlcyksXHJcblxyXG4gICAgICBzdGFydEV2ZW50OiBzdGFydEV2XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXY7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHJlZ2lzdGVyIG5ldyBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZ2VzdHVyZSBvYmplY3QsIHNlZSBnZXN0dXJlcy5qcyBmb3IgZG9jdW1lbnRhdGlvblxyXG4gICAqIEByZXR1cm5zIHtBcnJheX0gICAgIGdlc3R1cmVzXHJcbiAgICovXHJcbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uIHJlZ2lzdGVyKGdlc3R1cmUpIHtcclxuICAgIC8vIGFkZCBhbiBlbmFibGUgZ2VzdHVyZSBvcHRpb25zIGlmIHRoZXJlIGlzIG5vIGdpdmVuXHJcbiAgICB2YXIgb3B0aW9ucyA9IGdlc3R1cmUuZGVmYXVsdHMgfHwge307XHJcbiAgICBpZihvcHRpb25zW2dlc3R1cmUubmFtZV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBvcHRpb25zW2dlc3R1cmUubmFtZV0gPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dGVuZCBIYW1tZXIgZGVmYXVsdCBvcHRpb25zIHdpdGggdGhlIEhhbW1lci5nZXN0dXJlIG9wdGlvbnNcclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoSGFtbWVyLmRlZmF1bHRzLCBvcHRpb25zLCB0cnVlKTtcclxuXHJcbiAgICAvLyBzZXQgaXRzIGluZGV4XHJcbiAgICBnZXN0dXJlLmluZGV4ID0gZ2VzdHVyZS5pbmRleCB8fCAxMDAwO1xyXG5cclxuICAgIC8vIGFkZCBIYW1tZXIuZ2VzdHVyZSB0byB0aGUgbGlzdFxyXG4gICAgdGhpcy5nZXN0dXJlcy5wdXNoKGdlc3R1cmUpO1xyXG5cclxuICAgIC8vIHNvcnQgdGhlIGxpc3QgYnkgaW5kZXhcclxuICAgIHRoaXMuZ2VzdHVyZXMuc29ydChmdW5jdGlvbihhLCBiKSB7XHJcbiAgICAgIGlmKGEuaW5kZXggPCBiLmluZGV4KSB7IHJldHVybiAtMTsgfVxyXG4gICAgICBpZihhLmluZGV4ID4gYi5pbmRleCkgeyByZXR1cm4gMTsgfVxyXG4gICAgICByZXR1cm4gMDtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLmdlc3R1cmVzO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogRHJhZ1xyXG4gKiBNb3ZlIHdpdGggeCBmaW5nZXJzIChkZWZhdWx0IDEpIGFyb3VuZCBvbiB0aGUgcGFnZS4gQmxvY2tpbmcgdGhlIHNjcm9sbGluZyB3aGVuXHJcbiAqIG1vdmluZyBsZWZ0IGFuZCByaWdodCBpcyBhIGdvb2QgcHJhY3RpY2UuIFdoZW4gYWxsIHRoZSBkcmFnIGV2ZW50cyBhcmUgYmxvY2tpbmdcclxuICogeW91IGRpc2FibGUgc2Nyb2xsaW5nIG9uIHRoYXQgYXJlYS5cclxuICogQGV2ZW50cyAgZHJhZywgZHJhcGxlZnQsIGRyYWdyaWdodCwgZHJhZ3VwLCBkcmFnZG93blxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLkRyYWcgPSB7XHJcbiAgbmFtZSAgICAgOiAnZHJhZycsXHJcbiAgaW5kZXggICAgOiA1MCxcclxuICBkZWZhdWx0cyA6IHtcclxuICAgIGRyYWdfbWluX2Rpc3RhbmNlICAgICAgICAgICAgOiAxMCxcclxuXHJcbiAgICAvLyBTZXQgY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2UgdG8gdHJ1ZSB0byBtYWtlIHRoZSBzdGFydGluZyBwb2ludCBvZiB0aGUgZHJhZ1xyXG4gICAgLy8gYmUgY2FsY3VsYXRlZCBmcm9tIHdoZXJlIHRoZSBkcmFnIHdhcyB0cmlnZ2VyZWQsIG5vdCBmcm9tIHdoZXJlIHRoZSB0b3VjaCBzdGFydGVkLlxyXG4gICAgLy8gVXNlZnVsIHRvIGF2b2lkIGEgamVyay1zdGFydGluZyBkcmFnLCB3aGljaCBjYW4gbWFrZSBmaW5lLWFkanVzdG1lbnRzXHJcbiAgICAvLyB0aHJvdWdoIGRyYWdnaW5nIGRpZmZpY3VsdCwgYW5kIGJlIHZpc3VhbGx5IHVuYXBwZWFsaW5nLlxyXG4gICAgY29ycmVjdF9mb3JfZHJhZ19taW5fZGlzdGFuY2U6IHRydWUsXHJcblxyXG4gICAgLy8gc2V0IDAgZm9yIHVubGltaXRlZCwgYnV0IHRoaXMgY2FuIGNvbmZsaWN0IHdpdGggdHJhbnNmb3JtXHJcbiAgICBkcmFnX21heF90b3VjaGVzICAgICAgICAgICAgIDogMSxcclxuXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgYnJvd3NlciBiZWhhdmlvciB3aGVuIGRyYWdnaW5nIG9jY3Vyc1xyXG4gICAgLy8gYmUgY2FyZWZ1bCB3aXRoIGl0LCBpdCBtYWtlcyB0aGUgZWxlbWVudCBhIGJsb2NraW5nIGVsZW1lbnRcclxuICAgIC8vIHdoZW4geW91IGFyZSB1c2luZyB0aGUgZHJhZyBnZXN0dXJlLCBpdCBpcyBhIGdvb2QgcHJhY3RpY2UgdG8gc2V0IHRoaXMgdHJ1ZVxyXG4gICAgZHJhZ19ibG9ja19ob3Jpem9udGFsICAgICAgICA6IGZhbHNlLFxyXG4gICAgZHJhZ19ibG9ja192ZXJ0aWNhbCAgICAgICAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRyYWdfbG9ja190b19heGlzIGtlZXBzIHRoZSBkcmFnIGdlc3R1cmUgb24gdGhlIGF4aXMgdGhhdCBpdCBzdGFydGVkIG9uLFxyXG4gICAgLy8gSXQgZGlzYWxsb3dzIHZlcnRpY2FsIGRpcmVjdGlvbnMgaWYgdGhlIGluaXRpYWwgZGlyZWN0aW9uIHdhcyBob3Jpem9udGFsLCBhbmQgdmljZSB2ZXJzYS5cclxuICAgIGRyYWdfbG9ja190b19heGlzICAgICAgICAgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkcmFnIGxvY2sgb25seSBraWNrcyBpbiB3aGVuIGRpc3RhbmNlID4gZHJhZ19sb2NrX21pbl9kaXN0YW5jZVxyXG4gICAgLy8gVGhpcyB3YXksIGxvY2tpbmcgb2NjdXJzIG9ubHkgd2hlbiB0aGUgZGlzdGFuY2UgaGFzIGJlY29tZSBsYXJnZSBlbm91Z2ggdG8gcmVsaWFibHkgZGV0ZXJtaW5lIHRoZSBkaXJlY3Rpb25cclxuICAgIGRyYWdfbG9ja19taW5fZGlzdGFuY2UgICAgICAgOiAyNVxyXG4gIH0sXHJcblxyXG4gIHRyaWdnZXJlZDogZmFsc2UsXHJcbiAgaGFuZGxlciAgOiBmdW5jdGlvbiBkcmFnR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgLy8gY3VycmVudCBnZXN0dXJlIGlzbnQgZHJhZywgYnV0IGRyYWdnZWQgaXMgdHJ1ZVxyXG4gICAgLy8gdGhpcyBtZWFucyBhbiBvdGhlciBnZXN0dXJlIGlzIGJ1c3kuIG5vdyBjYWxsIGRyYWdlbmRcclxuICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSAmJiB0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG1heCB0b3VjaGVzXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMuZHJhZ19tYXhfdG91Y2hlcyA+IDAgJiZcclxuICAgICAgZXYudG91Y2hlcy5sZW5ndGggPiBpbnN0Lm9wdGlvbnMuZHJhZ19tYXhfdG91Y2hlcykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICAvLyB3aGVuIHRoZSBkaXN0YW5jZSB3ZSBtb3ZlZCBpcyB0b28gc21hbGwgd2Ugc2tpcCB0aGlzIGdlc3R1cmVcclxuICAgICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICAgIGlmKGV2LmRpc3RhbmNlIDwgaW5zdC5vcHRpb25zLmRyYWdfbWluX2Rpc3RhbmNlICYmXHJcbiAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHdlIGFyZSBkcmFnZ2luZyFcclxuICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUpIHtcclxuICAgICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG4gICAgICAgICAgaWYoaW5zdC5vcHRpb25zLmNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlICYmIGV2LmRpc3RhbmNlID4gMCkge1xyXG4gICAgICAgICAgICAvLyBXaGVuIGEgZHJhZyBpcyB0cmlnZ2VyZWQsIHNldCB0aGUgZXZlbnQgY2VudGVyIHRvIGRyYWdfbWluX2Rpc3RhbmNlIHBpeGVscyBmcm9tIHRoZSBvcmlnaW5hbCBldmVudCBjZW50ZXIuXHJcbiAgICAgICAgICAgIC8vIFdpdGhvdXQgdGhpcyBjb3JyZWN0aW9uLCB0aGUgZHJhZ2dlZCBkaXN0YW5jZSB3b3VsZCBqdW1wc3RhcnQgYXQgZHJhZ19taW5fZGlzdGFuY2UgcGl4ZWxzIGluc3RlYWQgb2YgYXQgMC5cclxuICAgICAgICAgICAgLy8gSXQgbWlnaHQgYmUgdXNlZnVsIHRvIHNhdmUgdGhlIG9yaWdpbmFsIHN0YXJ0IHBvaW50IHNvbWV3aGVyZVxyXG4gICAgICAgICAgICB2YXIgZmFjdG9yID0gTWF0aC5hYnMoaW5zdC5vcHRpb25zLmRyYWdfbWluX2Rpc3RhbmNlIC8gZXYuZGlzdGFuY2UpO1xyXG4gICAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQuc3RhcnRFdmVudC5jZW50ZXIucGFnZVggKz0gZXYuZGVsdGFYICogZmFjdG9yO1xyXG4gICAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQuc3RhcnRFdmVudC5jZW50ZXIucGFnZVkgKz0gZXYuZGVsdGFZICogZmFjdG9yO1xyXG5cclxuICAgICAgICAgICAgLy8gcmVjYWxjdWxhdGUgZXZlbnQgZGF0YSB1c2luZyBuZXcgc3RhcnQgcG9pbnRcclxuICAgICAgICAgICAgZXYgPSBIYW1tZXIuZGV0ZWN0aW9uLmV4dGVuZEV2ZW50RGF0YShldik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBsb2NrIGRyYWcgdG8gYXhpcz9cclxuICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubGFzdEV2ZW50LmRyYWdfbG9ja2VkX3RvX2F4aXMgfHwgKGluc3Qub3B0aW9ucy5kcmFnX2xvY2tfdG9fYXhpcyAmJiBpbnN0Lm9wdGlvbnMuZHJhZ19sb2NrX21pbl9kaXN0YW5jZSA8PSBldi5kaXN0YW5jZSkpIHtcclxuICAgICAgICAgIGV2LmRyYWdfbG9ja2VkX3RvX2F4aXMgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGFzdF9kaXJlY3Rpb24gPSBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubGFzdEV2ZW50LmRpcmVjdGlvbjtcclxuICAgICAgICBpZihldi5kcmFnX2xvY2tlZF90b19heGlzICYmIGxhc3RfZGlyZWN0aW9uICE9PSBldi5kaXJlY3Rpb24pIHtcclxuICAgICAgICAgIC8vIGtlZXAgZGlyZWN0aW9uIG9uIHRoZSBheGlzIHRoYXQgdGhlIGRyYWcgZ2VzdHVyZSBzdGFydGVkIG9uXHJcbiAgICAgICAgICBpZihIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChsYXN0X2RpcmVjdGlvbikpIHtcclxuICAgICAgICAgICAgZXYuZGlyZWN0aW9uID0gKGV2LmRlbHRhWSA8IDApID8gSGFtbWVyLkRJUkVDVElPTl9VUCA6IEhhbW1lci5ESVJFQ1RJT05fRE9XTjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBldi5kaXJlY3Rpb24gPSAoZXYuZGVsdGFYIDwgMCkgPyBIYW1tZXIuRElSRUNUSU9OX0xFRlQgOiBIYW1tZXIuRElSRUNUSU9OX1JJR0hUO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gZmlyc3QgdGltZSwgdHJpZ2dlciBkcmFnc3RhcnQgZXZlbnRcclxuICAgICAgICBpZighdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnc3RhcnQnLCBldik7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXJlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIG5vcm1hbCBldmVudFxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuXHJcbiAgICAgICAgLy8gZGlyZWN0aW9uIGV2ZW50LCBsaWtlIGRyYWdkb3duXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArIGV2LmRpcmVjdGlvbiwgZXYpO1xyXG5cclxuICAgICAgICAvLyBibG9jayB0aGUgYnJvd3NlciBldmVudHNcclxuICAgICAgICBpZigoaW5zdC5vcHRpb25zLmRyYWdfYmxvY2tfdmVydGljYWwgJiYgSGFtbWVyLnV0aWxzLmlzVmVydGljYWwoZXYuZGlyZWN0aW9uKSkgfHxcclxuICAgICAgICAgIChpbnN0Lm9wdGlvbnMuZHJhZ19ibG9ja19ob3Jpem9udGFsICYmICFIYW1tZXIudXRpbHMuaXNWZXJ0aWNhbChldi5kaXJlY3Rpb24pKSkge1xyXG4gICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgLy8gdHJpZ2dlciBkcmFnZW5kXHJcbiAgICAgICAgaWYodGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogSG9sZFxyXG4gKiBUb3VjaCBzdGF5cyBhdCB0aGUgc2FtZSBwbGFjZSBmb3IgeCB0aW1lXHJcbiAqIEBldmVudHMgIGhvbGRcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Ib2xkID0ge1xyXG4gIG5hbWUgICAgOiAnaG9sZCcsXHJcbiAgaW5kZXggICA6IDEwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICBob2xkX3RpbWVvdXQgIDogNTAwLFxyXG4gICAgaG9sZF90aHJlc2hvbGQ6IDFcclxuICB9LFxyXG4gIHRpbWVyICAgOiBudWxsLFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiBob2xkR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgc3dpdGNoKGV2LmV2ZW50VHlwZSkge1xyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9TVEFSVDpcclxuICAgICAgICAvLyBjbGVhciBhbnkgcnVubmluZyB0aW1lcnNcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcblxyXG4gICAgICAgIC8vIHNldCB0aGUgZ2VzdHVyZSBzbyB3ZSBjYW4gY2hlY2sgaW4gdGhlIHRpbWVvdXQgaWYgaXQgc3RpbGwgaXNcclxuICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuXHJcbiAgICAgICAgLy8gc2V0IHRpbWVyIGFuZCBpZiBhZnRlciB0aGUgdGltZW91dCBpdCBzdGlsbCBpcyBob2xkLFxyXG4gICAgICAgIC8vIHdlIHRyaWdnZXIgdGhlIGhvbGQgZXZlbnRcclxuICAgICAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID09ICdob2xkJykge1xyXG4gICAgICAgICAgICBpbnN0LnRyaWdnZXIoJ2hvbGQnLCBldik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgaW5zdC5vcHRpb25zLmhvbGRfdGltZW91dCk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAvLyB3aGVuIHlvdSBtb3ZlIG9yIGVuZCB3ZSBjbGVhciB0aGUgdGltZXJcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfTU9WRTpcclxuICAgICAgICBpZihldi5kaXN0YW5jZSA+IGluc3Qub3B0aW9ucy5ob2xkX3RocmVzaG9sZCkge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX0VORDpcclxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbGVhc2VcclxuICogQ2FsbGVkIGFzIGxhc3QsIHRlbGxzIHRoZSB1c2VyIGhhcyByZWxlYXNlZCB0aGUgc2NyZWVuXHJcbiAqIEBldmVudHMgIHJlbGVhc2VcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5SZWxlYXNlID0ge1xyXG4gIG5hbWUgICA6ICdyZWxlYXNlJyxcclxuICBpbmRleCAgOiBJbmZpbml0eSxcclxuICBoYW5kbGVyOiBmdW5jdGlvbiByZWxlYXNlR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTd2lwZVxyXG4gKiB0cmlnZ2VycyBzd2lwZSBldmVudHMgd2hlbiB0aGUgZW5kIHZlbG9jaXR5IGlzIGFib3ZlIHRoZSB0aHJlc2hvbGRcclxuICogQGV2ZW50cyAgc3dpcGUsIHN3aXBlbGVmdCwgc3dpcGVyaWdodCwgc3dpcGV1cCwgc3dpcGVkb3duXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuU3dpcGUgPSB7XHJcbiAgbmFtZSAgICA6ICdzd2lwZScsXHJcbiAgaW5kZXggICA6IDQwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICAvLyBzZXQgMCBmb3IgdW5saW1pdGVkLCBidXQgdGhpcyBjYW4gY29uZmxpY3Qgd2l0aCB0cmFuc2Zvcm1cclxuICAgIHN3aXBlX21pbl90b3VjaGVzOiAxLFxyXG4gICAgc3dpcGVfbWF4X3RvdWNoZXM6IDEsXHJcbiAgICBzd2lwZV92ZWxvY2l0eSAgIDogMC43XHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gc3dpcGVHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICAvLyBtYXggdG91Y2hlc1xyXG4gICAgICBpZihpbnN0Lm9wdGlvbnMuc3dpcGVfbWF4X3RvdWNoZXMgPiAwICYmXHJcbiAgICAgICAgZXYudG91Y2hlcy5sZW5ndGggPCBpbnN0Lm9wdGlvbnMuc3dpcGVfbWluX3RvdWNoZXMgJiZcclxuICAgICAgICBldi50b3VjaGVzLmxlbmd0aCA+IGluc3Qub3B0aW9ucy5zd2lwZV9tYXhfdG91Y2hlcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgIGlmKGV2LnZlbG9jaXR5WCA+IGluc3Qub3B0aW9ucy5zd2lwZV92ZWxvY2l0eSB8fFxyXG4gICAgICAgIGV2LnZlbG9jaXR5WSA+IGluc3Qub3B0aW9ucy5zd2lwZV92ZWxvY2l0eSkge1xyXG4gICAgICAgIC8vIHRyaWdnZXIgc3dpcGUgZXZlbnRzXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyBldi5kaXJlY3Rpb24sIGV2KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUYXAvRG91YmxlVGFwXHJcbiAqIFF1aWNrIHRvdWNoIGF0IGEgcGxhY2Ugb3IgZG91YmxlIGF0IHRoZSBzYW1lIHBsYWNlXHJcbiAqIEBldmVudHMgIHRhcCwgZG91YmxldGFwXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVGFwID0ge1xyXG4gIG5hbWUgICAgOiAndGFwJyxcclxuICBpbmRleCAgIDogMTAwLFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICB0YXBfbWF4X3RvdWNodGltZSA6IDI1MCxcclxuICAgIHRhcF9tYXhfZGlzdGFuY2UgIDogMTAsXHJcbiAgICB0YXBfYWx3YXlzICAgICAgICA6IHRydWUsXHJcbiAgICBkb3VibGV0YXBfZGlzdGFuY2U6IDIwLFxyXG4gICAgZG91YmxldGFwX2ludGVydmFsOiAzMDBcclxuICB9LFxyXG4gIGhhbmRsZXIgOiBmdW5jdGlvbiB0YXBHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX01PVkUgJiYgIUhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UpIHtcclxuICAgICAgLy9UcmFjayB0aGUgZGlzdGFuY2Ugd2UndmUgbW92ZWQuIElmIGl0J3MgYWJvdmUgdGhlIG1heCBPTkNFLCByZW1lbWJlciB0aGF0IChmaXhlcyAjNDA2KS5cclxuICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSA9IChldi5kaXN0YW5jZSA+IGluc3Qub3B0aW9ucy50YXBfbWF4X2Rpc3RhbmNlKTtcclxuICAgIH0gZWxzZSBpZihldi5ldmVudFR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCAmJiBldi5zcmNFdmVudC50eXBlICE9ICd0b3VjaGNhbmNlbCcpIHtcclxuICAgICAgLy8gcHJldmlvdXMgZ2VzdHVyZSwgZm9yIHRoZSBkb3VibGUgdGFwIHNpbmNlIHRoZXNlIGFyZSB0d28gZGlmZmVyZW50IGdlc3R1cmUgZGV0ZWN0aW9uc1xyXG4gICAgICB2YXIgcHJldiA9IEhhbW1lci5kZXRlY3Rpb24ucHJldmlvdXMsXHJcbiAgICAgICAgZGlkX2RvdWJsZXRhcCA9IGZhbHNlO1xyXG5cclxuICAgICAgLy8gd2hlbiB0aGUgdG91Y2h0aW1lIGlzIGhpZ2hlciB0aGVuIHRoZSBtYXggdG91Y2ggdGltZVxyXG4gICAgICAvLyBvciB3aGVuIHRoZSBtb3ZpbmcgZGlzdGFuY2UgaXMgdG9vIG11Y2hcclxuICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnJlYWNoZWRUYXBNYXhEaXN0YW5jZSB8fCBldi5kZWx0YVRpbWUgPiBpbnN0Lm9wdGlvbnMudGFwX21heF90b3VjaHRpbWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGNoZWNrIGlmIGRvdWJsZSB0YXBcclxuICAgICAgaWYocHJldiAmJiBwcmV2Lm5hbWUgPT0gJ3RhcCcgJiZcclxuICAgICAgICAoZXYudGltZVN0YW1wIC0gcHJldi5sYXN0RXZlbnQudGltZVN0YW1wKSA8IGluc3Qub3B0aW9ucy5kb3VibGV0YXBfaW50ZXJ2YWwgJiZcclxuICAgICAgICBldi5kaXN0YW5jZSA8IGluc3Qub3B0aW9ucy5kb3VibGV0YXBfZGlzdGFuY2UpIHtcclxuICAgICAgICBpbnN0LnRyaWdnZXIoJ2RvdWJsZXRhcCcsIGV2KTtcclxuICAgICAgICBkaWRfZG91YmxldGFwID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZG8gYSBzaW5nbGUgdGFwXHJcbiAgICAgIGlmKCFkaWRfZG91YmxldGFwIHx8IGluc3Qub3B0aW9ucy50YXBfYWx3YXlzKSB7XHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSAndGFwJztcclxuICAgICAgICBpbnN0LnRyaWdnZXIoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUsIGV2KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUb3VjaFxyXG4gKiBDYWxsZWQgYXMgZmlyc3QsIHRlbGxzIHRoZSB1c2VyIGhhcyB0b3VjaGVkIHRoZSBzY3JlZW5cclxuICogQGV2ZW50cyAgdG91Y2hcclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5Ub3VjaCA9IHtcclxuICBuYW1lICAgIDogJ3RvdWNoJyxcclxuICBpbmRleCAgIDogLUluZmluaXR5LFxyXG4gIGRlZmF1bHRzOiB7XHJcbiAgICAvLyBjYWxsIHByZXZlbnREZWZhdWx0IGF0IHRvdWNoc3RhcnQsIGFuZCBtYWtlcyB0aGUgZWxlbWVudCBibG9ja2luZyBieVxyXG4gICAgLy8gZGlzYWJsaW5nIHRoZSBzY3JvbGxpbmcgb2YgdGhlIHBhZ2UsIGJ1dCBpdCBpbXByb3ZlcyBnZXN0dXJlcyBsaWtlXHJcbiAgICAvLyB0cmFuc2Zvcm1pbmcgYW5kIGRyYWdnaW5nLlxyXG4gICAgLy8gYmUgY2FyZWZ1bCB3aXRoIHVzaW5nIHRoaXMsIGl0IGNhbiBiZSB2ZXJ5IGFubm95aW5nIGZvciB1c2VycyB0byBiZSBzdHVja1xyXG4gICAgLy8gb24gdGhlIHBhZ2VcclxuICAgIHByZXZlbnRfZGVmYXVsdCAgICA6IGZhbHNlLFxyXG5cclxuICAgIC8vIGRpc2FibGUgbW91c2UgZXZlbnRzLCBzbyBvbmx5IHRvdWNoIChvciBwZW4hKSBpbnB1dCB0cmlnZ2VycyBldmVudHNcclxuICAgIHByZXZlbnRfbW91c2VldmVudHM6IGZhbHNlXHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gdG91Y2hHZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICBpZihpbnN0Lm9wdGlvbnMucHJldmVudF9tb3VzZWV2ZW50cyAmJiBldi5wb2ludGVyVHlwZSA9PSBIYW1tZXIuUE9JTlRFUl9NT1VTRSkge1xyXG4gICAgICBldi5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMucHJldmVudF9kZWZhdWx0KSB7XHJcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9TVEFSVCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBUcmFuc2Zvcm1cclxuICogVXNlciB3YW50IHRvIHNjYWxlIG9yIHJvdGF0ZSB3aXRoIDIgZmluZ2Vyc1xyXG4gKiBAZXZlbnRzICB0cmFuc2Zvcm0sIHBpbmNoLCBwaW5jaGluLCBwaW5jaG91dCwgcm90YXRlXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVHJhbnNmb3JtID0ge1xyXG4gIG5hbWUgICAgIDogJ3RyYW5zZm9ybScsXHJcbiAgaW5kZXggICAgOiA0NSxcclxuICBkZWZhdWx0cyA6IHtcclxuICAgIC8vIGZhY3Rvciwgbm8gc2NhbGUgaXMgMSwgem9vbWluIGlzIHRvIDAgYW5kIHpvb21vdXQgdW50aWwgaGlnaGVyIHRoZW4gMVxyXG4gICAgdHJhbnNmb3JtX21pbl9zY2FsZSAgIDogMC4wMSxcclxuICAgIC8vIHJvdGF0aW9uIGluIGRlZ3JlZXNcclxuICAgIHRyYW5zZm9ybV9taW5fcm90YXRpb246IDEsXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgYnJvd3NlciBiZWhhdmlvciB3aGVuIHR3byB0b3VjaGVzIGFyZSBvbiB0aGUgc2NyZWVuXHJcbiAgICAvLyBidXQgaXQgbWFrZXMgdGhlIGVsZW1lbnQgYSBibG9ja2luZyBlbGVtZW50XHJcbiAgICAvLyB3aGVuIHlvdSBhcmUgdXNpbmcgdGhlIHRyYW5zZm9ybSBnZXN0dXJlLCBpdCBpcyBhIGdvb2QgcHJhY3RpY2UgdG8gc2V0IHRoaXMgdHJ1ZVxyXG4gICAgdHJhbnNmb3JtX2Fsd2F5c19ibG9jazogZmFsc2VcclxuICB9LFxyXG4gIHRyaWdnZXJlZDogZmFsc2UsXHJcbiAgaGFuZGxlciAgOiBmdW5jdGlvbiB0cmFuc2Zvcm1HZXN0dXJlKGV2LCBpbnN0KSB7XHJcbiAgICAvLyBjdXJyZW50IGdlc3R1cmUgaXNudCBkcmFnLCBidXQgZHJhZ2dlZCBpcyB0cnVlXHJcbiAgICAvLyB0aGlzIG1lYW5zIGFuIG90aGVyIGdlc3R1cmUgaXMgYnVzeS4gbm93IGNhbGwgZHJhZ2VuZFxyXG4gICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lICYmIHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICB0aGlzLnRyaWdnZXJlZCA9IGZhbHNlO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYXRsZWFzdCBtdWx0aXRvdWNoXHJcbiAgICBpZihldi50b3VjaGVzLmxlbmd0aCA8IDIpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHByZXZlbnQgZGVmYXVsdCB3aGVuIHR3byBmaW5nZXJzIGFyZSBvbiB0aGUgc2NyZWVuXHJcbiAgICBpZihpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX2Fsd2F5c19ibG9jaykge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgdmFyIHNjYWxlX3RocmVzaG9sZCA9IE1hdGguYWJzKDEgLSBldi5zY2FsZSk7XHJcbiAgICAgICAgdmFyIHJvdGF0aW9uX3RocmVzaG9sZCA9IE1hdGguYWJzKGV2LnJvdGF0aW9uKTtcclxuXHJcbiAgICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgICBpZihzY2FsZV90aHJlc2hvbGQgPCBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9zY2FsZSAmJlxyXG4gICAgICAgICAgcm90YXRpb25fdGhyZXNob2xkIDwgaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fcm90YXRpb24pIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHdlIGFyZSB0cmFuc2Zvcm1pbmchXHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcblxyXG4gICAgICAgIC8vIGZpcnN0IHRpbWUsIHRyaWdnZXIgZHJhZ3N0YXJ0IGV2ZW50XHJcbiAgICAgICAgaWYoIXRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ3N0YXJ0JywgZXYpO1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpOyAvLyBiYXNpYyB0cmFuc2Zvcm0gZXZlbnRcclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciByb3RhdGUgZXZlbnRcclxuICAgICAgICBpZihyb3RhdGlvbl90aHJlc2hvbGQgPiBpbnN0Lm9wdGlvbnMudHJhbnNmb3JtX21pbl9yb3RhdGlvbikge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdyb3RhdGUnLCBldik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB0cmlnZ2VyIHBpbmNoIGV2ZW50XHJcbiAgICAgICAgaWYoc2NhbGVfdGhyZXNob2xkID4gaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fc2NhbGUpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncGluY2gnLCBldik7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3BpbmNoJyArICgoZXYuc2NhbGUgPCAxKSA/ICdpbicgOiAnb3V0JyksIGV2KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgLy8gdHJpZ2dlciBkcmFnZW5kXHJcbiAgICAgICAgaWYodGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyAnZW5kJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4gIC8vIEJhc2VkIG9mZiBMby1EYXNoJ3MgZXhjZWxsZW50IFVNRCB3cmFwcGVyIChzbGlnaHRseSBtb2RpZmllZCkgLSBodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvbG9kYXNoL2Jsb2IvbWFzdGVyL2xvZGFzaC5qcyNMNTUxNS1MNTU0M1xyXG4gIC8vIHNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJucyBsaWtlIHRoZSBmb2xsb3dpbmc6XHJcbiAgaWYodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIGRlZmluZSBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlXHJcbiAgICBkZWZpbmUoZnVuY3Rpb24oKSB7IHJldHVybiBIYW1tZXI7IH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gY2hlY2sgZm9yIGBleHBvcnRzYCBhZnRlciBgZGVmaW5lYCBpbiBjYXNlIGEgYnVpbGQgb3B0aW1pemVyIGFkZHMgYW4gYGV4cG9ydHNgIG9iamVjdFxyXG4gIGVsc2UgaWYodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gSGFtbWVyO1xyXG4gIH1cclxuXHJcbiAgZWxzZSB7XHJcbiAgICB3aW5kb3cuSGFtbWVyID0gSGFtbWVyO1xyXG4gIH1cclxuXHJcbn0pKHdpbmRvdyk7XHJcblxyXG4vKiEgalF1ZXJ5IHBsdWdpbiBmb3IgSGFtbWVyLkpTIC0gdjEuMC4xIC0gMjAxNC0wMi0wM1xyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgSm9yaWsgVGFuZ2VsZGVyIDxqLnRhbmdlbGRlckBnbWFpbC5jb20+O1xyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UgKi8oZnVuY3Rpb24od2luZG93LCB1bmRlZmluZWQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5mdW5jdGlvbiBzZXR1cChIYW1tZXIsICQpIHtcclxuICAvKipcclxuICAgKiBiaW5kIGRvbSBldmVudHNcclxuICAgKiB0aGlzIG92ZXJ3cml0ZXMgYWRkRXZlbnRMaXN0ZW5lclxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZXNcclxuICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICAgICAgaGFuZGxlclxyXG4gICAqL1xyXG4gIEhhbW1lci5ldmVudC5iaW5kRG9tID0gZnVuY3Rpb24oZWxlbWVudCwgZXZlbnRUeXBlcywgaGFuZGxlcikge1xyXG4gICAgJChlbGVtZW50KS5vbihldmVudFR5cGVzLCBmdW5jdGlvbihldikge1xyXG4gICAgICB2YXIgZGF0YSA9IGV2Lm9yaWdpbmFsRXZlbnQgfHwgZXY7XHJcblxyXG4gICAgICBpZihkYXRhLnBhZ2VYID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBkYXRhLnBhZ2VYID0gZXYucGFnZVg7XHJcbiAgICAgICAgZGF0YS5wYWdlWSA9IGV2LnBhZ2VZO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS50YXJnZXQpIHtcclxuICAgICAgICBkYXRhLnRhcmdldCA9IGV2LnRhcmdldDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoZGF0YS53aGljaCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZGF0YS53aGljaCA9IGRhdGEuYnV0dG9uO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighZGF0YS5wcmV2ZW50RGVmYXVsdCkge1xyXG4gICAgICAgIGRhdGEucHJldmVudERlZmF1bHQgPSBldi5wcmV2ZW50RGVmYXVsdDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEuc3RvcFByb3BhZ2F0aW9uKSB7XHJcbiAgICAgICAgZGF0YS5zdG9wUHJvcGFnYXRpb24gPSBldi5zdG9wUHJvcGFnYXRpb247XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBkYXRhKTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIHRoZSBtZXRob2RzIGFyZSBjYWxsZWQgYnkgdGhlIGluc3RhbmNlLCBidXQgd2l0aCB0aGUganF1ZXJ5IHBsdWdpblxyXG4gICAqIHdlIHVzZSB0aGUganF1ZXJ5IGV2ZW50IG1ldGhvZHMgaW5zdGVhZC5cclxuICAgKiBAdGhpcyAgICB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICByZXR1cm4gJCh0aGlzLmVsZW1lbnQpLm9uKHR5cGVzLCBoYW5kbGVyKTtcclxuICB9O1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZXMsIGhhbmRsZXIpIHtcclxuICAgIHJldHVybiAkKHRoaXMuZWxlbWVudCkub2ZmKHR5cGVzLCBoYW5kbGVyKTtcclxuICB9O1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogdHJpZ2dlciBldmVudHNcclxuICAgKiB0aGlzIGlzIGNhbGxlZCBieSB0aGUgZ2VzdHVyZXMgdG8gdHJpZ2dlciBhbiBldmVudCBsaWtlICd0YXAnXHJcbiAgICogQHRoaXMgICAge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICBnZXN0dXJlXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZlbnREYXRhXHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbihnZXN0dXJlLCBldmVudERhdGEpIHtcclxuICAgIHZhciBlbCA9ICQodGhpcy5lbGVtZW50KTtcclxuICAgIGlmKGVsLmhhcyhldmVudERhdGEudGFyZ2V0KS5sZW5ndGgpIHtcclxuICAgICAgZWwgPSAkKGV2ZW50RGF0YS50YXJnZXQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbC50cmlnZ2VyKHtcclxuICAgICAgdHlwZSAgIDogZ2VzdHVyZSxcclxuICAgICAgZ2VzdHVyZTogZXZlbnREYXRhXHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogalF1ZXJ5IHBsdWdpblxyXG4gICAqIGNyZWF0ZSBpbnN0YW5jZSBvZiBIYW1tZXIgYW5kIHdhdGNoIGZvciBnZXN0dXJlcyxcclxuICAgKiBhbmQgd2hlbiBjYWxsZWQgYWdhaW4geW91IGNhbiBjaGFuZ2UgdGhlIG9wdGlvbnNcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBbb3B0aW9ucz17fV1cclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gICQuZm4uaGFtbWVyID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG4gICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcclxuICAgICAgdmFyIGVsID0gJCh0aGlzKTtcclxuICAgICAgdmFyIGluc3QgPSBlbC5kYXRhKCdoYW1tZXInKTtcclxuICAgICAgLy8gc3RhcnQgbmV3IGhhbW1lciBpbnN0YW5jZVxyXG4gICAgICBpZighaW5zdCkge1xyXG4gICAgICAgIGVsLmRhdGEoJ2hhbW1lcicsIG5ldyBIYW1tZXIodGhpcywgb3B0aW9ucyB8fCB7fSkpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIGNoYW5nZSB0aGUgb3B0aW9uc1xyXG4gICAgICBlbHNlIGlmKGluc3QgJiYgb3B0aW9ucykge1xyXG4gICAgICAgIEhhbW1lci51dGlscy5leHRlbmQoaW5zdC5vcHRpb25zLCBvcHRpb25zKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfTtcclxufVxyXG5cclxuICAvLyBCYXNlZCBvZmYgTG8tRGFzaCdzIGV4Y2VsbGVudCBVTUQgd3JhcHBlciAoc2xpZ2h0bHkgbW9kaWZpZWQpIC0gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9sb2Rhc2guanMjTDU1MTUtTDU1NDNcclxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnMgbGlrZSB0aGUgZm9sbG93aW5nOlxyXG4gIGlmKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZVxyXG4gICAgZGVmaW5lKFsnaGFtbWVyanMnLCAnanF1ZXJ5J10sIHNldHVwKTtcclxuXHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgc2V0dXAod2luZG93LkhhbW1lciwgd2luZG93LmpRdWVyeSB8fCB3aW5kb3cuWmVwdG8pO1xyXG4gIH1cclxufSkod2luZG93KTsiLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIiksZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTsvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iXX0=
;