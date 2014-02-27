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

    var $possibleMines = $("#mine-count").siblings(".advice").find("span"),
        PRESET_PANEL_SELECTOR = "ul.preset > li:not(:has(label[for$='-mode']))",
        CUSTOM_PANEL_SELECTOR = "ul.custom > li:not(:has(label[for$='-mode']))";

    // setting initial value
    $possibleMines.html(mineableSpaces($("#dimensions").attr("placeholder")));

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
            gameOptions.dimensions = $("#dimensions").val() || +$("#dimensions").attr("placeholder");
            gameOptions.mines = $("#mine-count").val() || +$("#mine-count").attr("placeholder");
            // set the desired color theme...
            gameOptions.theme = $("#color-theme").val();
        }


        // set up <header> content...
        $("#mines-display").find("span").html(gameOptions.mines);
        $(".version").html(VERSION);

        window.gameboard = new Gameboard(gameOptions).render();

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
},{"./constants":3,"./gameboard":6}],2:[function(require,module,exports){

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
    Version: 'beta4',

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

    MobileDeviceRegex: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/
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
},{"./lib/emitter":8,"util":21}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],21:[function(require,module,exports){
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

},{"./support/isBuffer":20,"__browserify_process":19,"inherits":18}]},{},[1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,16,17])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9jb25zb2xlLXJlbmRlcmVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY29uc3RhbnRzLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvY291bnRkb3duLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvZGFuZ2VyLWNhbGN1bGF0b3IuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9saWIvYml0LWZsYWctZmFjdG9yeS5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2xpYi9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL2xjZ2VuZXJhdG9yLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbGliL211bHRpbWFwLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbWluZWxheWVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc2NvcmVrZWVwZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zZXJpYWxpemVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvc3F1YXJlLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdGhlbWUtc3R5bGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvdHJhbnNjcmliaW5nLWVtaXR0ZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy92ZW5kb3IvanF1ZXJ5LmhhbW1lci1mdWxsLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlrREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsidmFyIEdhbWVib2FyZCA9IHJlcXVpcmUoJy4vZ2FtZWJvYXJkJyksXHJcbiAgICBNb2RlcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuTW9kZXMsXHJcbiAgICBQcmVzZXRMZXZlbHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLlByZXNldExldmVscyxcclxuICAgIFByZXNldFNldHVwcyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuUHJlc2V0U2V0dXBzLFxyXG4gICAgVkVSU0lPTiA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuVmVyc2lvbixcclxuXHJcbiAgICBtaW5lYWJsZVNwYWNlcyA9IGZ1bmN0aW9uKGRpbSkgeyByZXR1cm4gfn4oTWF0aC5wb3coZGltLCAyKSAqIDAuNSk7IH0sXHJcbiAgICBkaXNhYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsLCB1bmRvKSB7XHJcbiAgICAgICAgaWYgKHVuZG8gPT0gbnVsbCkgdW5kbyA9IGZhbHNlO1xyXG4gICAgICAgICRlbFt1bmRvID8gJ3JlbW92ZUNsYXNzJyA6ICdhZGRDbGFzcyddKCdkaXNhYmxlZCcpO1xyXG4gICAgICAgICRlbC5maW5kKFwiaW5wdXRcIikucHJvcCgncmVhZG9ubHknLCAhdW5kbyk7XHJcbiAgICB9LFxyXG4gICAgZW5hYmxlT3B0aW9uID0gZnVuY3Rpb24oJGVsKSB7IHJldHVybiBkaXNhYmxlT3B0aW9uKCRlbCwgdHJ1ZSk7IH07XHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblxyXG4gICAgdmFyICRwb3NzaWJsZU1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnNpYmxpbmdzKFwiLmFkdmljZVwiKS5maW5kKFwic3BhblwiKSxcclxuICAgICAgICBQUkVTRVRfUEFORUxfU0VMRUNUT1IgPSBcInVsLnByZXNldCA+IGxpOm5vdCg6aGFzKGxhYmVsW2ZvciQ9Jy1tb2RlJ10pKVwiLFxyXG4gICAgICAgIENVU1RPTV9QQU5FTF9TRUxFQ1RPUiA9IFwidWwuY3VzdG9tID4gbGk6bm90KDpoYXMobGFiZWxbZm9yJD0nLW1vZGUnXSkpXCI7XHJcblxyXG4gICAgLy8gc2V0dGluZyBpbml0aWFsIHZhbHVlXHJcbiAgICAkcG9zc2libGVNaW5lcy5odG1sKG1pbmVhYmxlU3BhY2VzKCQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIikpKTtcclxuXHJcbiAgICAkKFwiI3ByZXNldC1tb2RlXCIpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkgeyBlbmFibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgZGlzYWJsZU9wdGlvbigkKENVU1RPTV9QQU5FTF9TRUxFQ1RPUikpOyB9KS5jbGljaygpO1xyXG4gICAgJChcIiNjdXN0b20tbW9kZVwiKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHsgZW5hYmxlT3B0aW9uKCQoQ1VTVE9NX1BBTkVMX1NFTEVDVE9SKSk7IGRpc2FibGVPcHRpb24oJChQUkVTRVRfUEFORUxfU0VMRUNUT1IpKTsgfSk7XHJcblxyXG4gICAgJC5lYWNoKCQoXCJsYWJlbFtmb3JePSdsZXZlbC0nXVwiKSwgZnVuY3Rpb24oXywgbGFiZWwpIHtcclxuICAgICAgICB2YXIgbGV2ZWwgPSAkKGxhYmVsKS5hdHRyKCdmb3InKS5zdWJzdHJpbmcoJ2xldmVsLScubGVuZ3RoKS50b1VwcGVyQ2FzZSgpLFxyXG4gICAgICAgICAgICBkaW1zID0gUHJlc2V0U2V0dXBzW2xldmVsXS5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IFByZXNldFNldHVwc1tsZXZlbF0ubWluZXMsXHJcbiAgICAgICAgICAgICRhZHZpY2UgPSAkKGxhYmVsKS5maW5kKCcuYWR2aWNlJyk7XHJcbiAgICAgICAgJGFkdmljZS5odG1sKFwiIChcIiArIGRpbXMgKyBcIiB4IFwiICsgZGltcyArIFwiLCBcIiArIG1pbmVzICsgXCIgbWluZXMpXCIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG4gICAgLy8gbmVpZ2hib3JpbmcgaW5wdXQgc2hvdWxkIG1pcnJvciBuZXcgdmFsdWUsXHJcbiAgICAvLyBhbmQgdG90YWwgcG9zc2libGUgbWluZWFibGUgc3F1YXJlcyAoZGltZW5zaW9ucyBeIDIgLTEpXHJcbiAgICAvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuICAgICQoXCIjZGltZW5zaW9uc1wiKS5vbigna2V5dXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG4gICAgICAgIC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG4gICAgICAgICQoJyNkaW1lbnNpb25zLW1pcnJvcicpLnZhbCgkdGhpcy52YWwoKSk7XHJcbiAgICAgICAgLy8gLi4uYW5kIHRoZSBwb3NzaWJsZSBudW1iZXIgb2YgbWluZXMuXHJcbiAgICAgICAgJHBvc3NpYmxlTWluZXMuaHRtbChtaW5lYWJsZVNwYWNlcygkdGhpcy52YWwoKSkgKyAnLicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBtb2RlID0gJChcIltuYW1lPW1vZGUtc2VsZWN0XTpjaGVja2VkXCIpLnZhbCgpLFxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucyA9IHt9O1xyXG5cclxuICAgICAgICBpZiAobW9kZSA9PT0gTW9kZXMuUFJFU0VUKSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbCA9ICQoXCJbbmFtZT1wcmVzZXQtbGV2ZWxdOmNoZWNrZWRcIikudmFsKCksXHJcbiAgICAgICAgICAgICAgICBzZXR1cCA9IE9iamVjdC5rZXlzKFByZXNldExldmVscylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihwbCkgeyByZXR1cm4gUHJlc2V0TGV2ZWxzW3BsXSA9PT0gbGV2ZWw7IH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5wb3AoKTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuaXNDdXN0b20gPSBmYWxzZTtcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMuZGltZW5zaW9ucyA9IFByZXNldFNldHVwc1tzZXR1cF0uZGltZW5zaW9ucztcclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMubWluZXMgPSBQcmVzZXRTZXR1cHNbc2V0dXBdLm1pbmVzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIE1vZGVzLkNVU1RPTS4uLlxyXG4gICAgICAgICAgICBnYW1lT3B0aW9ucy5pc0N1c3RvbSA9IHRydWU7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLmRpbWVuc2lvbnMgPSAkKFwiI2RpbWVuc2lvbnNcIikudmFsKCkgfHwgKyQoXCIjZGltZW5zaW9uc1wiKS5hdHRyKFwicGxhY2Vob2xkZXJcIik7XHJcbiAgICAgICAgICAgIGdhbWVPcHRpb25zLm1pbmVzID0gJChcIiNtaW5lLWNvdW50XCIpLnZhbCgpIHx8ICskKFwiI21pbmUtY291bnRcIikuYXR0cihcInBsYWNlaG9sZGVyXCIpO1xyXG4gICAgICAgICAgICAvLyBzZXQgdGhlIGRlc2lyZWQgY29sb3IgdGhlbWUuLi5cclxuICAgICAgICAgICAgZ2FtZU9wdGlvbnMudGhlbWUgPSAkKFwiI2NvbG9yLXRoZW1lXCIpLnZhbCgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIHNldCB1cCA8aGVhZGVyPiBjb250ZW50Li4uXHJcbiAgICAgICAgJChcIiNtaW5lcy1kaXNwbGF5XCIpLmZpbmQoXCJzcGFuXCIpLmh0bWwoZ2FtZU9wdGlvbnMubWluZXMpO1xyXG4gICAgICAgICQoXCIudmVyc2lvblwiKS5odG1sKFZFUlNJT04pO1xyXG5cclxuICAgICAgICB3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZChnYW1lT3B0aW9ucykucmVuZGVyKCk7XHJcblxyXG4gICAgICAgICQoXCIjb3B0aW9ucy1jYXJkXCIpLmhpZGUoKTtcclxuICAgICAgICAkKFwiI2JvYXJkLWNhcmRcIikuZmFkZUluKCk7XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgICQoXCIjYm9hcmQtY2FyZFwiKS5vbihcImNsaWNrXCIsIFwiYS5yZXBsYXlcIiwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gdGVtcG9yYXJ5LCBicnV0ZS1mb3JjZSBmaXguLi5cclxuICAgICAgICAvLyBUT0RPOiByZXNldCBmb3JtIGFuZCB0b2dnbGUgdmlzaWJpbGl0eSBvbiB0aGUgc2VjdGlvbnMuLi5cclxuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XHJcbiAgICB9KTtcclxuXHJcbn0pOyIsIlxyXG52YXIgQ29uc29sZVJlbmRlcmVyID0ge1xyXG5cclxuICAgIENPTF9TUEFDSU5HOiAnICAgJyxcclxuICAgIE1JTkVEX1NRVUFSRTogJyonLFxyXG4gICAgQkxBTktfU1FVQVJFOiAnLicsXHJcbiAgICBSRU5ERVJFRF9NQVA6ICclbycsXHJcbiAgICBERUZBVUxUX1RSQU5TRk9STUVSOiBmdW5jdGlvbihyb3cpeyByZXR1cm4gcm93OyB9LFxyXG5cclxuICAgIF9tYWtlVGl0bGU6IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gc3RyLnNwbGl0KCcnKS5qb2luKCcgJykudG9VcHBlckNhc2UoKTsgfSxcclxuICAgIF9kaXNwbGF5Um93TnVtOiBmdW5jdGlvbihudW0pIHsgcmV0dXJuIFwiICAgICAgIFtcIiArIG51bSArIFwiXVxcblwiIH0sXHJcbiAgICBfdG9TeW1ib2xzOiBmdW5jdGlvbih2YWx1ZXMsIGZuKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHIgKz0gZm4ocm93KS5qb2luKF90aGlzLkNPTF9TUEFDSU5HKS50b0xvd2VyQ2FzZSgpICsgX3RoaXMuX2Rpc3BsYXlSb3dOdW0oaWR4KVxyXG4gICAgICAgIH0sICdcXG4nKTtcclxuICAgIH0sXHJcbiAgICBfdmFsaWRhdGU6IGZ1bmN0aW9uKHZhbHVlcykge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlcykgJiYgdmFsdWVzLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcclxuICAgICAgICBlbHNlIHRocm93IFwiTm8gdmFsdWVzIHByZXNlbnQuXCI7XHJcbiAgICB9LFxyXG4gICAgX2dldFJlbmRlcmVkTWFwOiBmdW5jdGlvbih0cmFuc2Zvcm1lcikge1xyXG4gICAgICAgIHZhciB2YWxzID0gdGhpcy5fdmFsaWRhdGUodGhpcy52YWx1ZXMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLl90b1N5bWJvbHModmFscywgdHJhbnNmb3JtZXIpO1xyXG4gICAgfSxcclxuXHJcbiAgICB0bzogZnVuY3Rpb24obG9nKSB7IHRoaXMuJGxvZyA9IGxvZzsgcmV0dXJuIHRoaXM7IH0sXHJcbiAgICB3aXRoVmFsdWVzOiBmdW5jdGlvbih2YWx1ZXMpIHtcclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHRoaXMuX3ZhbGlkYXRlKHZhbHVlcyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHZpZXdHYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICB0cmFuc2Zvcm1lciA9IGZ1bmN0aW9uKHJvdykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvdy5tYXAoZnVuY3Rpb24oc3EpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKHNxLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5NSU5FRF9TUVVBUkUgOiBzcS5nZXREYW5nZXIoKSA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBfdGhpcy5CTEFOS19TUVVBUkUgOiBzcS5nZXREYW5nZXIoKTsgfSlcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB0aGlzLiRsb2coWyB0aGlzLl9tYWtlVGl0bGUoXCJnYW1lYm9hcmRcIiksIHRoaXMuUkVOREVSRURfTUFQIF1cclxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpLFxyXG4gICAgICAgICAgICB0aGlzLl9nZXRSZW5kZXJlZE1hcCh0cmFuc2Zvcm1lcikpO1xyXG4gICAgfSxcclxuICAgIHZpZXdNaW5lczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy4kbG9nKFsgdGhpcy5fbWFrZVRpdGxlKFwibWluZSBwbGFjZW1lbnRzXCIpLCB0aGlzLlJFTkRFUkVEX01BUCBdXHJcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKSxcclxuICAgICAgICAgICAgdGhpcy5fZ2V0UmVuZGVyZWRNYXAodGhpcy5ERUZBVUxUX1RSQU5TRk9STUVSKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbnNvbGVSZW5kZXJlcjsiLCJcclxudmFyIENvbnN0YW50cyA9IHtcclxuICAgIFZlcnNpb246ICdiZXRhNCcsXHJcblxyXG4gICAgRGVmYXVsdENvbmZpZzoge1xyXG4gICAgICAgIGRpbWVuc2lvbnM6IDksXHJcbiAgICAgICAgbWluZXM6IDEsXHJcbiAgICAgICAgYm9hcmQ6ICcjYm9hcmQnLFxyXG4gICAgICAgIHRpbWVyOiA1MDAsXHJcbiAgICAgICAgZGVidWdfbW9kZTogdHJ1ZSwgLypmYWxzZSovXHJcbiAgICAgICAgdGhlbWU6ICdMSUdIVCdcclxuICAgIH0sXHJcblxyXG4gICAgU3ltYm9sczogeyBDTE9TRUQ6ICd4JywgT1BFTjogJ18nLCBGTEFHR0VEOiAnZicsIE1JTkVEOiAnKicgfSxcclxuXHJcbiAgICBGbGFnczogIHsgT1BFTjogJ0ZfT1BFTicsIE1JTkVEOiAnRl9NSU5FRCcsIEZMQUdHRUQ6ICdGX0ZMQUdHRUQnLCBJTkRFWEVEOiAnRl9JTkRFWEVEJyB9LFxyXG5cclxuICAgIEdseXBoczogeyBGTEFHOiAneCcsIE1JTkU6ICfDhCcgfSxcclxuXHJcbiAgICBNb2RlczogeyBQUkVTRVQ6IFwiUFwiLCBDVVNUT006IFwiQ1wiIH0sXHJcblxyXG4gICAgUHJlc2V0TGV2ZWxzOiB7IEJFR0lOTkVSOiBcIkJcIiwgSU5URVJNRURJQVRFOiBcIklcIiwgRVhQRVJUOiBcIkVcIiB9LFxyXG5cclxuICAgIFByZXNldFNldHVwczoge1xyXG4gICAgICAgIEJFR0lOTkVSOiAgICAgICB7IGRpbWVuc2lvbnM6ICA5LCBtaW5lczogIDksIHRpbWVyOiAzMDAgfSxcclxuICAgICAgICBJTlRFUk1FRElBVEU6ICAgeyBkaW1lbnNpb25zOiAxMiwgbWluZXM6IDIxLCB0aW1lcjogNDIwIH0sXHJcbiAgICAgICAgRVhQRVJUOiAgICAgICAgIHsgZGltZW5zaW9uczogMTUsIG1pbmVzOiA2NywgdGltZXI6IDU0MCB9XHJcbiAgICB9LFxyXG5cclxuICAgIFRoZW1lczogeyBMSUdIVDogJ2xpZ2h0JywgREFSSzogJ2RhcmsnIH0sXHJcblxyXG4gICAgTWVzc2FnZU92ZXJsYXk6ICcjZmxhc2gnLFxyXG5cclxuICAgIE1vYmlsZURldmljZVJlZ2V4OiAvYW5kcm9pZHx3ZWJvc3xpcGhvbmV8aXBhZHxpcG9kfGJsYWNrYmVycnl8aWVtb2JpbGV8b3BlcmEgbWluaS9cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc3RhbnRzOyIsIlxyXG5cclxuZnVuY3Rpb24gQ291bnRkb3duKHNlY29uZHMsIGVsKSB7XHJcbiAgICB0aGlzLnNlY29uZHMgPSBzZWNvbmRzO1xyXG4gICAgdGhpcy5pbml0aWFsID0gc2Vjb25kcztcclxuICAgIHRoaXMuZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbC5jaGFyQXQoMCkgPT09ICcjJyA/IGVsLnN1YnN0cmluZygxKSA6IGVsKTtcclxuXHJcbiAgICB0aGlzLm0xID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjbTEnKTtcclxuICAgIHRoaXMubTIgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNtMicpO1xyXG4gICAgdGhpcy5zMSA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3MxJyk7XHJcbiAgICB0aGlzLnMyID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjczInKTtcclxuXHJcbiAgICB0aGlzLmZyZWV6ZSA9IGZhbHNlO1xyXG59XHJcblxyXG5Db3VudGRvd24ucHJvdG90eXBlID0ge1xyXG4gICAgY29uc3RydWN0b3I6IENvdW50ZG93bixcclxuICAgIF9yZW5kZXJJbml0aWFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgYXJyID0gdGhpcy5fdG9NaW5zU2Vjcyh0aGlzLnNlY29uZHMpO1xyXG4gICAgICAgIHRoaXMuX3NldERpc3BsYXkoYXJyWzBdIHx8IDAsIGFyclsxXSB8fCAwKTtcclxuICAgIH0sXHJcbiAgICBfdG9NaW5zU2VjczogZnVuY3Rpb24oc2Vjcykge1xyXG4gICAgICAgIHZhciBtaW5zID0gfn4oc2VjcyAvIDYwKSxcclxuICAgICAgICAgICAgc2VjcyA9IHNlY3MgJSA2MDtcclxuICAgICAgICByZXR1cm4gW21pbnMsIHNlY3NdO1xyXG4gICAgfSxcclxuICAgIF9zZXREaXNwbGF5OiBmdW5jdGlvbihtaW5zLCBzZWNzKSB7XHJcbiAgICAgICAgdmFyIG0gPSBTdHJpbmcobWlucyksXHJcbiAgICAgICAgICAgIHMgPSBTdHJpbmcoc2VjcyksXHJcbiAgICAgICAgICAgIHRpbWVzID0gW20sIHNdLm1hcChmdW5jdGlvbih4KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJyID0gU3RyaW5nKHgpLnNwbGl0KCcnKTtcclxuICAgICAgICAgICAgICAgIGlmIChhcnIubGVuZ3RoIDwgMikgYXJyLnVuc2hpZnQoJzAnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcnI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMubTEuaW5uZXJIVE1MID0gdGltZXNbMF1bMF07XHJcbiAgICAgICAgdGhpcy5tMi5pbm5lckhUTUwgPSB0aW1lc1swXVsxXTtcclxuICAgICAgICB0aGlzLnMxLmlubmVySFRNTCA9IHRpbWVzWzFdWzBdO1xyXG4gICAgICAgIHRoaXMuczIuaW5uZXJIVE1MID0gdGltZXNbMV1bMV07XHJcbiAgICB9LFxyXG4gICAgX2NvdW50ZG93bjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgdGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghX3RoaXMuZnJlZXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNlY29uZHMgIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyciA9IF90aGlzLl90b01pbnNTZWNzKF90aGlzLnNlY29uZHMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0RGlzcGxheShhcnJbMF0sIGFyclsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLnNlY29uZHMtLTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRpbWVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldERpc3BsYXkoMCwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XHJcbiAgICAgICAgICAgIH0sIDEwMDApO1xyXG4gICAgfSxcclxuICAgIHN0YXJ0OiBmdW5jdGlvbigpIHsgdGhpcy5mcmVlemUgPSBmYWxzZTsgdGhpcy5fY291bnRkb3duKCk7IH0sXHJcbiAgICBzdG9wOiBmdW5jdGlvbigpIHsgdGhpcy5mcmVlemUgPSB0cnVlOyB9LFxyXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkgeyB0aGlzLl9zZXREaXNwbGF5KDAsIDApOyB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvdW50ZG93bjsiLCJcclxuZnVuY3Rpb24gRGFuZ2VyQ2FsY3VsYXRvcihnYW1lYm9hcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYm9hcmQ6IGdhbWVib2FyZCxcclxuICAgICAgICBuZWlnaGJvcmhvb2Q6IHtcclxuICAgICAgICAgICAgLy8gZGlzdGFuY2UgaW4gc3RlcHMgZnJvbSB0aGlzIHNxdWFyZTpcclxuICAgICAgICAgICAgLy8gICAgICAgICAgIHZlcnQuIGhvcnouXHJcbiAgICAgICAgICAgIE5PUlRIOiAgICAgIFsgIDEsICAwIF0sXHJcbiAgICAgICAgICAgIE5PUlRIRUFTVDogIFsgIDEsICAxIF0sXHJcbiAgICAgICAgICAgIEVBU1Q6ICAgICAgIFsgIDAsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIRUFTVDogIFsgLTEsICAxIF0sXHJcbiAgICAgICAgICAgIFNPVVRIOiAgICAgIFsgLTEsICAwIF0sXHJcbiAgICAgICAgICAgIFNPVVRIV0VTVDogIFsgLTEsIC0xIF0sXHJcbiAgICAgICAgICAgIFdFU1Q6ICAgICAgIFsgIDAsIC0xIF0sXHJcbiAgICAgICAgICAgIE5PUlRIV0VTVDogIFsgIDEsIC0xIF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZvclNxdWFyZTogZnVuY3Rpb24ocm93LCBjZWxsKSB7XHJcbiAgICAgICAgICAgIGlmICgrcm93ID49IDAgJiYgK2NlbGwgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbE1pbmVzID0gMCxcclxuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXModGhpcy5uZWlnaGJvcmhvb2QpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3JpeiA9IF90aGlzLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZWlnaGJvciA9IF90aGlzLmJvYXJkLmdldFNxdWFyZUF0KHJvdyArIHZlcnQsIGNlbGwgKyBob3Jpeik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiBuZWlnaGJvci5pc01pbmVkKCkpIHRvdGFsTWluZXMrKztcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvdGFsTWluZXMgfHwgJyc7XHJcbiAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEYW5nZXJDYWxjdWxhdG9yOyIsInZhciBNdWx0aW1hcCA9IHJlcXVpcmUoJy4vbGliL211bHRpbWFwJyksXHJcbiAgICBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKSxcclxuICAgIFNlcmlhbGl6ZXIgPSByZXF1aXJlKCcuL3NlcmlhbGl6ZXInKSxcclxuICAgIEdseXBocyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJykuR2x5cGhzLFxyXG4gICAgTWVzc2FnZU92ZXJsYXkgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1lc3NhZ2VPdmVybGF5LFxyXG4gICAgREVGQVVMVF9HQU1FX09QVElPTlMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkRlZmF1bHRDb25maWcsXHJcbiAgICByZ3hfbW9iaWxlX2RldmljZXMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLk1vYmlsZURldmljZVJlZ2V4LFxyXG4gICAgQ291bnRkb3duID0gcmVxdWlyZSgnLi9jb3VudGRvd24nKSxcclxuICAgIFRyYW5zY3JpYmluZ0VtaXR0ZXIgPSByZXF1aXJlKCcuL3RyYW5zY3JpYmluZy1lbWl0dGVyJyksXHJcbiAgICBUaGVtZVN0eWxlciA9IHJlcXVpcmUoJy4vdGhlbWUtc3R5bGVyJyksXHJcbiAgICBDb25zb2xlUmVuZGVyZXIgPSByZXF1aXJlKCcuL2NvbnNvbGUtcmVuZGVyZXInKSxcclxuICAgIE1pbmVMYXllciA9IHJlcXVpcmUoJy4vbWluZWxheWVyJyksXHJcbiAgICBTY29yZWtlZXBlciA9IHJlcXVpcmUoJy4vc2NvcmVrZWVwZXInKTtcclxuXHJcbi8vIHdyYXBwZXIgYXJvdW5kIGAkbG9nYCwgdG8gdG9nZ2xlIGRldiBtb2RlIGRlYnVnZ2luZ1xyXG52YXIgJGxvZyA9IGZ1bmN0aW9uICRsb2coKSB7IGlmICgkbG9nLmRlYnVnX21vZGUgfHwgZmFsc2UpIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7IH1cclxuXHJcbmZ1bmN0aW9uIEdhbWVib2FyZChvcHRpb25zKSB7XHJcbiAgICAvLyB0aGUgbWFwLCBzZXJ2aW5nIGFzIHRoZSBpbnRlcm5hbCByZXByZXNlbmF0aW9uIG9mIHRoZSBnYW1lYm9hcmRcclxuICAgIHRoaXMuYm9hcmQgPSBuZXcgTXVsdGltYXA7XHJcbiAgICAvLyB0aGUgZGltZW5zaW9ucyBvZiB0aGUgYm9hcmQgd2hlbiByZW5kZXJlZFxyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK29wdGlvbnMuZGltZW5zaW9ucyB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5kaW1lbnNpb25zO1xyXG4gICAgLy8gdGhlIG51bWJlciBvZiBtaW5lcyB0aGUgdXNlciBoYXMgc2VsZWN0ZWRcclxuICAgIHRoaXMubWluZXMgPSArb3B0aW9ucy5taW5lcyB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5taW5lcztcclxuICAgIC8vIHRoZSBET00gZWxlbWVudCBvZiB0aGUgdGFibGUgc2VydmluZyBhcyB0aGUgYm9hcmRcclxuICAgIHRoaXMuJGVsID0gJChvcHRpb25zLmJvYXJkIHx8IERFRkFVTFRfR0FNRV9PUFRJT05TLmJvYXJkKTtcclxuICAgIC8vIGlzIGN1c3RvbSBvciBwcmVzZXQgZ2FtZT9cclxuICAgIHRoaXMuaXNDdXN0b20gPSBvcHRpb25zLmlzQ3VzdG9tIHx8IGZhbHNlO1xyXG4gICAgLy8gdGhlIGV2ZW50IHRyYW5zY3JpYmVyIGZvciBwbGF5YmFjayBhbmQgcGVyc2lzdGVuY2VcclxuICAgIHRoaXMuZW1pdHRlciA9IG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyO1xyXG4gICAgLy8gc2VsZWN0aXZlbHkgZW5hYmxlIGRlYnVnIG1vZGUgZm9yIGNvbnNvbGUgdmlzdWFsaXphdGlvbnMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICAgIHRoaXMuZGVidWdfbW9kZSA9IG9wdGlvbnMuZGVidWdfbW9kZSB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy5kZWJ1Z19tb2RlO1xyXG4gICAgJGxvZy5kZWJ1Z19tb2RlID0gdGhpcy5kZWJ1Z19tb2RlO1xyXG4gICAgLy8gc3BlY2lmaWVzIHRoZSBkZXNpcmVkIGNvbG9yIHRoZW1lIG9yIHNraW5cclxuICAgIHRoaXMudGhlbWUgPSB0aGlzLl9zZXRDb2xvclRoZW1lKG9wdGlvbnMudGhlbWUgfHwgREVGQVVMVF9HQU1FX09QVElPTlMudGhlbWUpO1xyXG4gICAgLy8gY29udGFpbmVyIGZvciBmbGFzaCBtZXNzYWdlcywgc3VjaCBhcyB3aW4vbG9zcyBvZiBnYW1lXHJcbiAgICB0aGlzLmZsYXNoQ29udGFpbmVyID0gJChNZXNzYWdlT3ZlcmxheSk7XHJcbiAgICAvLyBjaGVjayBmb3IgZGVza3RvcCBvciBtb2JpbGUgcGxhdGZvcm0gKGZvciBldmVudCBoYW5kbGVycylcclxuICAgIHRoaXMuaXNNb2JpbGUgPSB0aGlzLl9jaGVja0Zvck1vYmlsZSgpO1xyXG4gICAgLy8ga2VlcCB0cmFjayBvZiB1c2VyIGNsaWNrcyB0b3dhcmRzIHRoZWlyIHdpblxyXG4gICAgdGhpcy51c2VyTW92ZXMgPSAwO1xyXG4gICAgLy8gdGhlIG9iamVjdCB0aGF0IGNhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBzdXJyb3VuZGluZyBtaW5lcyBhdCBhbnkgc3F1YXJlXHJcbiAgICB0aGlzLmRhbmdlckNhbGMgPSBuZXcgRGFuZ2VyQ2FsY3VsYXRvcih0aGlzKTtcclxuICAgIC8vIGFkZCBpbiB0aGUgY291bnRkb3duIGNsb2NrLi4uXHJcbiAgICB0aGlzLmNsb2NrID0gbmV3IENvdW50ZG93bigrb3B0aW9ucy50aW1lciB8fCBERUZBVUxUX0dBTUVfT1BUSU9OUy50aW1lciwgJyNjb3VudGRvd24nKTtcclxuICAgIHRoaXMuY2xvY2suc3RhcnQoKTtcclxuICAgIC8vIGNyZWF0ZSB0aGUgc2NvcmVrZWVwaW5nIG9iamVjdFxyXG4gICAgdGhpcy5zY29yZWtlZXBlciA9IG5ldyBTY29yZWtlZXBlcih0aGlzKTtcclxuXHJcbiAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgdGhpcy5fbG9hZEJvYXJkKCk7XHJcbiAgICAvLyByZW5kZXIgdGhlIEhUTUwgdG8gbWF0Y2ggdGhlIGJvYXJkIGluIG1lbW9yeVxyXG4gICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG4gICAgLy8gdHJpZ2dlciBldmVudCBmb3IgZ2FtZSB0byBiZWdpbi4uLlxyXG4gICAgdGhpcy5lbWl0dGVyLnRyaWdnZXIoJ2diOnN0YXJ0JywgdGhpcy5ib2FyZCwgdGhpcy4kZWwuc2VsZWN0b3IpO1xyXG59XHJcblxyXG5cclxuR2FtZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBHYW1lYm9hcmQsXHJcbiAgICAvLyBcIlBSSVZBVEVcIiBNRVRIT0RTOlxyXG4gICAgX2xvYWRCb2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcHJlZmlsbCBzcXVhcmVzIHRvIHJlcXVpcmVkIGRpbWVuc2lvbnMuLi5cclxuICAgICAgICB2YXIgZGltZW5zaW9ucyA9IHRoaXMuZGltZW5zaW9ucyxcclxuICAgICAgICAgICAgbWluZXMgPSB0aGlzLm1pbmVzLFxyXG4gICAgICAgICAgICBwb3B1bGF0ZVJvdyA9IGZ1bmN0aW9uKHJvdywgc3F1YXJlcykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgc3F1YXJlczsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldFtpXSA9IG5ldyBTcXVhcmUocm93LCBpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSlcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgcG9wdWxhdGVSb3coaSwgZGltZW5zaW9ucykpO1xyXG5cclxuICAgICAgICAvLyBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcblxyXG4gICAgICAgIC8vIHByZS1jYWxjdWxhdGUgdGhlIGRhbmdlciBpbmRleCBvZiBlYWNoIG5vbi1taW5lZCBzcXVhcmUuLi5cclxuICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICAvLyBkaXNwbGF5IG91dHB1dCBhbmQgZ2FtZSBzdHJhdGVneSB0byB0aGUgY29uc29sZS4uLlxyXG4gICAgICAgIGlmICh0aGlzLmRlYnVnX21vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy50b0NvbnNvbGUoKTtcclxuICAgICAgICAgICAgdGhpcy50b0NvbnNvbGUodHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF9yZW5kZXJHcmlkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyBsYXlvdXQgdGhlIEhUTUwgPHRhYmxlPiByb3dzLi4uXHJcbiAgICAgICAgdGhpcy5fY3JlYXRlSFRNTEdyaWQodGhpcy5kaW1lbnNpb25zKTtcclxuICAgICAgICAvLyBzZXR1cCBldmVudCBsaXN0ZW5lcnMgdG8gbGlzdGVuIGZvciB1c2VyIGNsaWNrc1xyXG4gICAgICAgIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAvLyBzZXQgdGhlIGNvbG9yIHRoZW1lLi4uXHJcbiAgICAgICAgdGhpcy5fc2V0Q29sb3JUaGVtZSh0aGlzLnRoZW1lKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lTWluZUxvY2F0aW9uczogZnVuY3Rpb24oZGltZW5zaW9ucywgbWluZXMpIHtcclxuICAgICAgICB2YXIgbG9jcyA9IG5ldyBNaW5lTGF5ZXIobWluZXMsIGRpbWVuc2lvbnMpLCBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgbG9jcy5mb3JFYWNoKGZ1bmN0aW9uKGxvYykgeyBfdGhpcy5nZXRTcXVhcmVBdChsb2NbMF0sIGxvY1sxXSkubWluZSgpOyB9KTtcclxuICAgIH0sXHJcbiAgICBfcHJlY2FsY0RhbmdlckluZGljZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pKTsgfSwgW10pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNhZmUpIHsgc2FmZS5zZXREYW5nZXIoX3RoaXMuZGFuZ2VyQ2FsYy5mb3JTcXVhcmUoc2FmZS5nZXRSb3coKSwgc2FmZS5nZXRDZWxsKCkpKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX2NyZWF0ZUhUTUxHcmlkOiBmdW5jdGlvbihkaW1lbnNpb25zKSB7XHJcbiAgICAgICAgdmFyIGdyaWQgPSAnJztcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpIHtcclxuICAgICAgICAgICAgZ3JpZCArPSBcIjx0ciBpZD0ncm93XCIgKyBpICsgXCInPlwiXHJcbiAgICAgICAgICAgICAgICAgKyAgW10uam9pbi5jYWxsKHsgbGVuZ3RoOiBkaW1lbnNpb25zICsgMSB9LCBcIjx0ZD48L3RkPlwiKVxyXG4gICAgICAgICAgICAgICAgICsgIFwiPC90cj5cIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy4kZWwuYXBwZW5kKGdyaWQpO1xyXG4gICAgfSxcclxuICAgIF9zZXRDb2xvclRoZW1lOiBmdW5jdGlvbih0aGVtZSkge1xyXG4gICAgICAgIFRoZW1lU3R5bGVyLnNldCh0aGVtZSwgdGhpcy4kZWwpO1xyXG4gICAgICAgIHJldHVybiB0aGVtZTtcclxuICAgIH0sXHJcbiAgICBfY2hlY2tGb3JNb2JpbGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gcmd4X21vYmlsZV9kZXZpY2VzLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpKTsgfSxcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuaXNNb2JpbGUpIHtcclxuICAgICAgICAgICAgLy8gZm9yIHRvdWNoIGV2ZW50czogdGFwID09IGNsaWNrLCBob2xkID09IHJpZ2h0IGNsaWNrXHJcbiAgICAgICAgICAgIHRoaXMuJGVsLmhhbW1lcigpLm9uKHtcclxuICAgICAgICAgICAgICAgIHRhcDogdGhpcy5faGFuZGxlQ2xpY2suYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGhvbGQ6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgICAgICB9LCAndGQsIHRkID4gc3BhbicpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKHtcclxuICAgICAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgICAgICB9LCAndGQsIHRkID4gc3BhbicpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVE9ETzogcmVtb3ZlIGFmdGVyIGRldmVsb3BtZW50IGVuZHMuLi5mb3IgZGVidWcgdXNlIG9ubHkhXHJcbiAgICAgICAgLy8gSU5ESVZJRFVBTCBTUVVBUkUgRVZFTlRTXHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpvcGVuJywgZnVuY3Rpb24oc3F1YXJlLCBjZWxsKSB7ICRsb2coXCJPcGVuaW5nIHNxdWFyZSBhdCAoJW8sICVvKS5cIiwgc3F1YXJlLmdldFJvdygpLCBzcXVhcmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpjbG9zZScsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiQ2xvc2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignc3E6ZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiRmxhZ2dpbmcgc3F1YXJlIGF0ICglbywgJW8pLlwiLCBzcXVhcmUuZ2V0Um93KCksIHNxdWFyZS5nZXRDZWxsKCkpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOnVuZmxhZycsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkgeyAkbG9nKFwiVW5mbGFnZ2luZyBzcXVhcmUgYXQgKCVvLCAlbykuXCIsIHNxdWFyZS5nZXRSb3coKSwgc3F1YXJlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgICAgIC8vIEdBTUVCT0FSRC1XSURFIEVWRU5UU1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6c3RhcnQnLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgJGxvZyhcIkxldCB0aGUgZ2FtZSBiZWdpbiFcIiwgYXJndW1lbnRzKTsgfSk7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdnYjplbmQ6d2luJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJHYW1lIG92ZXIhIFlvdSB3aW4hXCIpOyB9KTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDpvdmVyJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7ICRsb2coXCJHYW1lIG92ZXIhIFlvdSdyZSBkZWFkIVwiKTsgfSk7XHJcbiAgICB9LFxyXG4gICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vZmYoKTtcclxuICAgICAgICAvLyB0dXJuIG9mZiB0b3VjaCBldmVudHMgYXMgd2VsbFxyXG4gICAgICAgIHRoaXMuJGVsLmhhbW1lcigpLm9mZigpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICB2YXIgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KSxcclxuICAgICAgICAgICAgJGNlbGwgPSAkdGFyZ2V0LnByb3AoJ3RhZ05hbWUnKS50b0xvd2VyQ2FzZSgpID09PSAnc3BhbicgPyAkdGFyZ2V0LnBhcmVudCgpIDogJHRhcmdldCxcclxuICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgIC8vIFRPRE86IGFsc28gaGFuZGxlIGZpcnN0LWNsaWNrLWNhbid0LWJlLW1pbmUgKGlmIHdlJ3JlIGZvbGxvd2luZyB0aGF0IHJ1bGUpXHJcbiAgICAgICAgLy8gaGVyZSwgaWYgdXNlck1vdmVzID09PSAwLi4uIDptZXNzYWdlID0+IDptdWxsaWdhbj9cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG4gICAgICAgIHZhciBjdXJyX29wZW4gPSB0aGlzLl9nZXRPcGVuZWRTcXVhcmVzQ291bnQoKTtcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgdGhpcy5fb3BlblNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgICAgICBpZiAoIXNxdWFyZS5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWN1cnNpdmVSZXZlYWwoc3F1YXJlKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNNaW5lZCgpKSB7XHJcbiAgICAgICAgICAgICRjZWxsLmFkZENsYXNzKCdraWxsZXItbWluZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZU92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICB2YXIgb3BlbmVkX3NxdWFyZXMgPSB0aGlzLl9nZXRPcGVuZWRTcXVhcmVzQ291bnQoKSAtIGN1cnJfb3BlbjtcclxuICAgICAgICAkbG9nKFwiSnVzdCBvcGVuZWQgJW8gc3F1YXJlcy4uLnRlbGxpbmcgc2NvcmVyLlxcblVzZXIgbW92ZXM6ICVvLlwiLCBvcGVuZWRfc3F1YXJlcywgdGhpcy51c2VyTW92ZXMpO1xyXG4gICAgICAgIHRoaXMuc2NvcmVrZWVwZXIudXAob3BlbmVkX3NxdWFyZXMpO1xyXG4gICAgfSxcclxuICAgIF9oYW5kbGVSaWdodENsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgLy8gc3RvcCB0aGUgY29udGV4dG1lbnUgZnJvbSBwb3BwaW5nIHVwIG9uIGRlc2t0b3AgYnJvd3NlcnNcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBpZiAoc3F1YXJlLmlzQ2xvc2VkKCkgJiYgIXNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgdGhpcy5fZmxhZ1NxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSkge1xyXG4gICAgICAgICAgICB0aGlzLl91bmZsYWdTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgdGhpcy5fY2xvc2VTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2V2YWx1YXRlRm9yR2FtZVdpbigpO1xyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9LFxyXG4gICAgLy8gaGFuZGxlcyBhdXRvY2xlYXJpbmcgb2Ygc3BhY2VzIGFyb3VuZCB0aGUgb25lIGNsaWNrZWRcclxuICAgIF9yZWN1cnNpdmVSZXZlYWw6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgIC8vIGJhc2VkIG9uIGBzb3VyY2VgIHNxdWFyZSwgd2FsayBhbmQgcmVjdXJzaXZlbHkgcmV2ZWFsIGNvbm5lY3RlZCBzcGFjZXNcclxuICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICByb3cgPSBzb3VyY2UuZ2V0Um93KCksXHJcbiAgICAgICAgICAgIGNlbGwgPSBzb3VyY2UuZ2V0Q2VsbCgpLFxyXG4gICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihkaXJlY3Rpb24pIHtcclxuICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzBdLFxyXG4gICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5laWdoYm9yICYmICFuZWlnaGJvci5pc01pbmVkKCkgJiYgIW5laWdoYm9yLmlzRmxhZ2dlZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLl9vcGVuU3F1YXJlKG5laWdoYm9yKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIW5laWdoYm9yLmdldERhbmdlcigpIHx8ICFuZWlnaGJvci5nZXREYW5nZXIoKSA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0sXHJcbiAgICBfb3BlblNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUub3BlbigpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOm9wZW5cIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF9jbG9zZVNxdWFyZTogZnVuY3Rpb24oc3F1YXJlLCBmaXJlRXZlbnQpIHtcclxuICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICBmaXJlRXZlbnQgJiYgdGhpcy5lbWl0dGVyLnRyaWdnZXIoXCJzcTpjbG9zZVwiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2ZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLmZsYWcoKTtcclxuICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICBmaXJlRXZlbnQgPSAoZmlyZUV2ZW50ID09IG51bGwpID8gdHJ1ZSA6IGZpcmVFdmVudDtcclxuICAgICAgICB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOmZsYWdcIiwgc3F1YXJlLCB0aGlzLmdldEdyaWRDZWxsKHNxdWFyZSkpO1xyXG4gICAgfSxcclxuICAgIF91bmZsYWdTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSwgZmlyZUV2ZW50KSB7XHJcbiAgICAgICAgc3F1YXJlLnVuZmxhZygpO1xyXG4gICAgICAgIHRoaXMuX3JlbmRlclNxdWFyZShzcXVhcmUpO1xyXG4gICAgICAgIGZpcmVFdmVudCA9IChmaXJlRXZlbnQgPT0gbnVsbCkgPyB0cnVlIDogZmlyZUV2ZW50O1xyXG4gICAgICAgIGZpcmVFdmVudCAmJiB0aGlzLmVtaXR0ZXIudHJpZ2dlcihcInNxOnVuZmxhZ1wiLCBzcXVhcmUsIHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSk7XHJcbiAgICB9LFxyXG4gICAgX2dldE9wZW5lZFNxdWFyZXNDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmlzT3BlbigpOyB9KS5sZW5ndGg7IH0sXHJcbiAgICBfZXZhbHVhdGVGb3JHYW1lV2luOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbm90TWluZWQgPSB0aGlzLmdldFNxdWFyZXMoKS5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pLmxlbmd0aDtcclxuICAgICAgICBpZiAobm90TWluZWQgPT09IHRoaXMuX2dldE9wZW5lZFNxdWFyZXNDb3VudCgpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FtZVdpbigpO1xyXG4gICAgfSxcclxuICAgIF9mbGFzaE1zZzogZnVuY3Rpb24obXNnLCBpc0FsZXJ0KSB7XHJcbiAgICAgICAgdGhpcy5mbGFzaENvbnRhaW5lclxyXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGlzQWxlcnQgPyAnZ2FtZS1vdmVyJyA6ICdnYW1lLXdpbicpXHJcbiAgICAgICAgICAgICAgICAuaHRtbChtc2cpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgfSxcclxuICAgIF9wcmVwYXJlRmluYWxSZXZlYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKClcclxuICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmdldEdyaWRDZWxsKGYpLmZpbmQoJy5kYW5nZXInKS5odG1sKGYuZ2V0RGFuZ2VyKCkpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuX3VuZmxhZ1NxdWFyZShmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuX3JlbW92ZUV2ZW50TGlzdGVuZXJzKCk7XHJcbiAgICAgICAgdGhpcy5jbG9jay5zdG9wKCk7XHJcbiAgICAgICAgdGhpcy5zY29yZWtlZXBlci5jbG9zZSgpO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcHJlcGFyZUZpbmFsUmV2ZWFsKCk7XHJcblxyXG4gICAgICAgIHRoaXMuJGVsLmFkZENsYXNzKCdnYW1lLXdpbicpO1xyXG4gICAgICAgIHRoaXMuJGVsXHJcbiAgICAgICAgICAgIC5maW5kKCcuc3F1YXJlJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpXHJcbiAgICAgICAgICAgIC5hZGRDbGFzcygnb3BlbicpO1xyXG5cclxuICAgICAgICAkbG9nKFwiLS0tICBHQU1FIFdJTiEgIC0tLVwiKTtcclxuICAgICAgICAkbG9nKFwiVXNlciBtb3ZlczogJW9cIiwgdGhpcy51c2VyTW92ZXMpXHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOndpbicsIHRoaXMuYm9hcmQsIHRoaXMuJGVsLnNlbGVjdG9yKTtcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuX3ByZXBhcmVGaW5hbFJldmVhbCgpO1xyXG5cclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS1vdmVyJyk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICB0aGlzLiRlbFxyXG4gICAgICAgICAgICAuZmluZCgnLnNxdWFyZScpXHJcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKVxyXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ29wZW4nKTtcclxuXHJcbiAgICAgICAgLy8gcHV0IHVwICdHYW1lIE92ZXInIGJhbm5lclxyXG4gICAgICAgICRsb2coJy0tLSAgR0FNRSBPVkVSISAgLS0tJyk7XHJcbiAgICAgICAgdGhpcy5fZmxhc2hNc2coJzxzcGFuPkdhbWUgT3ZlciE8L3NwYW4+PGEgaHJlZj1cIiNcIiBjbGFzcz1cInJlcGxheVwiPkNsaWNrIGhlcmUgdG8gcGxheSBhZ2Fpbi4uLjwvYT4nLCB0cnVlKTtcclxuICAgICAgICB0aGlzLmVtaXR0ZXIudHJpZ2dlcignZ2I6ZW5kOm92ZXInLCB0aGlzLmJvYXJkLCB0aGlzLiRlbC5zZWxlY3Rvcik7XHJcbiAgICB9LFxyXG4gICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgdmFyICRjZWxsID0gdGhpcy5nZXRHcmlkQ2VsbChzcXVhcmUpLFxyXG4gICAgICAgICAgICBnZXRDb250ZW50cyA9IGZ1bmN0aW9uKHNxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3EuaXNGbGFnZ2VkKCkpIHJldHVybiBHbHlwaHMuRkxBRztcclxuICAgICAgICAgICAgICAgIGlmIChzcS5pc01pbmVkKCkpIHJldHVybiBHbHlwaHMuTUlORTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAhIXNxLmdldERhbmdlcigpID8gc3EuZ2V0RGFuZ2VyKCkgOiAnJztcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6IGdldENvbnRlbnRzKHNxdWFyZSkgfSk7XHJcblxyXG4gICAgICAgICRjZWxsLmVtcHR5KCkuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuXHJcbiAgICAgICAgLy8gZGVjb3JhdGUgPHRkPiB3aXRoIENTUyBjbGFzc2VzIGFwcHJvcHJpYXRlIHRvIHNxdWFyZSdzIHN0YXRlXHJcbiAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgLmFkZENsYXNzKCdjZWxsJyArIHNxdWFyZS5nZXRDZWxsKCkpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkuam9pbignICcpKTtcclxuXHJcbiAgICAgICAgLy8gYXR0YWNoIHRoZSBTcXVhcmUgdG8gdGhlIGRhdGEgYXNzb2NpYXRlZCB3aXRoIHRoZSBncmlkIGNlbGxcclxuICAgICAgICAkY2VsbC5kYXRhKCdzcXVhcmUnLCBzcXVhcmUpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5nZXRTcXVhcmVzKCkuZm9yRWFjaCh0aGlzLl9yZW5kZXJTcXVhcmUuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgLy8gcmV0dXJuIGB0aGlzYCwgc28gdGhpcyBtZXRob2QgY2FuIGJlIGNoYWluZWQgdG8gaXRzIGluaXRpYWxpemF0aW9uIGNhbGxcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICAvLyB0YWtlcyBhIFNxdWFyZSBpbnN0YW5jZSBhcyBhIHBhcmFtLCByZXR1cm5zIGEgalF1ZXJ5LXdyYXBwZWQgRE9NIG5vZGUgb2YgaXRzIGNlbGxcclxuICAgIGdldEdyaWRDZWxsOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgIC5maW5kKCd0ZCcpXHJcbiAgICAgICAgICAgICAgICAuZXEoc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICB9LFxyXG4gICAgLy8gdGFrZXMgcm93IGFuZCBjZWxsIGNvb3JkaW5hdGVzIGFzIHBhcmFtcywgcmV0dXJucyB0aGUgYXNzb2NpYXRlZCBTcXVhcmUgaW5zdGFuY2VcclxuICAgIGdldFNxdWFyZUF0OiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICB2YXIgcm93ID0gdGhpcy5ib2FyZC5nZXQocm93KTtcclxuICAgICAgICByZXR1cm4gKHJvdyAmJiByb3dbMF0gJiYgcm93WzBdW2NlbGxdKSA/IHJvd1swXVtjZWxsXSA6IG51bGw7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmRcclxuICAgICAgICAgICAgICAgIC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwpOyB9LCBbXSlcclxuICAgIH0sXHJcbiAgICAvLyBleHBvcnQgc2VyaWFsaXplZCBzdGF0ZSB0byBwZXJzaXN0IGdhbWUgZm9yIGxhdGVyXHJcbiAgICBleHBvcnQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIG5lZWQgZ2FtZU9wdGlvbnMsIG1ldGFkYXRhIG9uIGRhdGV0aW1lL2V0Yy4sIHNlcmlhbGl6ZSBhbGwgc3F1YXJlcycgc3RhdGVzXHJcbiAgICAgICAgcmV0dXJuIFNlcmlhbGl6ZXIuZXhwb3J0KHRoaXMpO1xyXG4gICAgfSxcclxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmJvYXJkLnZhbHVlcygpLmpvaW4oJywgJyk7IH0sXHJcbiAgICB0b0NvbnNvbGU6IGZ1bmN0aW9uKHdpdGhEYW5nZXIpIHtcclxuICAgICAgICB2YXIgcmVuZGVyZXIgPSBDb25zb2xlUmVuZGVyZXIudG8oJGxvZykud2l0aFZhbHVlcyh0aGlzLmJvYXJkLnZhbHVlcygpKTtcclxuICAgICAgICByZXR1cm4gKHdpdGhEYW5nZXIpID8gcmVuZGVyZXIudmlld0dhbWUoKSA6IHJlbmRlcmVyLnZpZXdNaW5lcygpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lYm9hcmQ7IiwiXHJcbi8vIEB1c2FnZSB2YXIgQml0RmxhZ3MgPSBuZXcgQml0RmxhZ0ZhY3RvcnkoWydGX09QRU4nLCAnRl9NSU5FRCcsICdGX0ZMQUdHRUQnLCAnRl9JTkRFWEVEJ10pOyBiZiA9IG5ldyBCaXRGbGFncztcclxuZnVuY3Rpb24gQml0RmxhZ0ZhY3RvcnkoYXJncykge1xyXG5cclxuICAgIHZhciBiaW5Ub0RlYyA9IGZ1bmN0aW9uKHN0cikgeyByZXR1cm4gcGFyc2VJbnQoc3RyLCAyKTsgfSxcclxuICAgICAgICBkZWNUb0JpbiA9IGZ1bmN0aW9uKG51bSkgeyByZXR1cm4gbnVtLnRvU3RyaW5nKDIpOyB9LFxyXG4gICAgICAgIGJ1aWxkU3RhdGUgPSBmdW5jdGlvbihhcnIpIHsgcmV0dXJuIHBhZChhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7IHJldHVybiBTdHJpbmcoK3BhcmFtKTsgfSkucmV2ZXJzZSgpLmpvaW4oJycpKTsgfSxcclxuICAgICAgICBwYWQgPSBmdW5jdGlvbiAoc3RyLCBtYXgpIHtcclxuICAgICAgICAgIG1heCB8fCAobWF4ID0gNCAvKiB0aGlzLkRFRkFVTFRfU0laRS5sZW5ndGggKi8pO1xyXG4gICAgICAgICAgdmFyIGRpZmYgPSBtYXggLSBzdHIubGVuZ3RoO1xyXG4gICAgICAgICAgZm9yICh2YXIgYWNjPVtdOyBkaWZmID4gMDsgYWNjWy0tZGlmZl0gPSAnMCcpIHt9XHJcbiAgICAgICAgICByZXR1cm4gYWNjLmpvaW4oJycpICsgc3RyO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlUXVlcnlNZXRob2QgPSBmdW5jdGlvbihuYW1lKSB7IHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuaGFzKHRoaXNbbmFtZV0pOyB9IH0sXHJcbiAgICAgICAgY3JlYXRlUXVlcnlNZXRob2ROYW1lID0gZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICBpZiAofm5hbWUuaW5kZXhPZignXycpKVxyXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyaW5nKG5hbWUuaW5kZXhPZignXycpICsgMSk7XHJcbiAgICAgICAgICAgIHJldHVybiAnaXMnICsgbmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5hbWUuc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0U3RhdGVzID0gZnVuY3Rpb24oYXJncywgcHJvdG8pIHtcclxuICAgICAgICAgICAgaWYgKCFhcmdzLmxlbmd0aCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgcHJvdG8uX3N0YXRlcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49YXJncy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZsYWdOYW1lID0gU3RyaW5nKGFyZ3NbaV0pLnRvVXBwZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgY2xzTmFtZSA9IGZsYWdOYW1lLnRvTG93ZXJDYXNlKCksXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBNYXRoLnBvdygyLCBpKSxcclxuICAgICAgICAgICAgICAgICAgICBxdWVyeU1ldGhvZE5hbWUgPSBjcmVhdGVRdWVyeU1ldGhvZE5hbWUoY2xzTmFtZSksXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlNZXRob2QgPSBjcmVhdGVRdWVyeU1ldGhvZChmbGFnTmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcHJvdG9bZmxhZ05hbWVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBwcm90by5fc3RhdGVzW2ldID0gY2xzTmFtZTtcclxuICAgICAgICAgICAgICAgIHByb3RvW3F1ZXJ5TWV0aG9kTmFtZV0gPSBxdWVyeU1ldGhvZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBwcm90by5ERUZBVUxUX1NUQVRFID0gcGFkKCcnLCBpKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIGZ1bmN0aW9uIEJpdEZsYWdzKCkge1xyXG4gICAgICAgIHRoaXMuX2ZsYWdzID0gYXJndW1lbnRzLmxlbmd0aCA+IDBcclxuICAgICAgICAgICAgPyBidWlsZFN0YXRlKFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSlcclxuICAgICAgICAgICAgOiB0aGlzLkRFRkFVTFRfU1RBVEU7XHJcbiAgICB9XHJcblxyXG4gICAgQml0RmxhZ3MucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yOiBCaXRGbGFncyxcclxuICAgICAgICBoYXM6IGZ1bmN0aW9uKGZsYWcpIHsgcmV0dXJuICEhKGJpblRvRGVjKHRoaXMuX2ZsYWdzKSAmIGZsYWcpOyB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24oZmxhZykgeyByZXR1cm4gdGhpcy5fZmxhZ3MgPSBwYWQoZGVjVG9CaW4oYmluVG9EZWModGhpcy5fZmxhZ3MpIHwgZmxhZykpOyB9LFxyXG4gICAgICAgIHVuc2V0OiBmdW5jdGlvbihmbGFnKSB7IHJldHVybiB0aGlzLl9mbGFncyA9IHBhZChkZWNUb0JpbihiaW5Ub0RlYyh0aGlzLl9mbGFncykgJiB+ZmxhZykpOyB9LFxyXG4gICAgICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IF9mbGFnczogdGhpcy5fZmxhZ3MgfTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBCaXRGbGFncy53aXRoRGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykgeyByZXR1cm4gbmV3IEJpdEZsYWdzKGRlZmF1bHRzKTsgfTtcclxuXHJcbiAgICBzZXRTdGF0ZXMoYXJncywgQml0RmxhZ3MucHJvdG90eXBlKTtcclxuXHJcbiAgICByZXR1cm4gQml0RmxhZ3M7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQml0RmxhZ0ZhY3Rvcnk7IiwiXHJcbmZ1bmN0aW9uIEVtaXR0ZXIoKSB7XHJcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcclxufVxyXG5cclxuRW1pdHRlci5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogRW1pdHRlcixcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiLy8gTGluZWFyIENvbmdydWVudGlhbCBHZW5lcmF0b3I6IHZhcmlhbnQgb2YgYSBMZWhtYW4gR2VuZXJhdG9yXHJcbi8vIGJhc2VkIG9uIExDRyBmb3VuZCBoZXJlOiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9Qcm90b25rP3BhZ2U9NFxyXG52YXIgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yID0gKGZ1bmN0aW9uKCl7XHJcbiAgLy8gU2V0IHRvIHZhbHVlcyBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvTnVtZXJpY2FsX1JlY2lwZXNcclxuICAvLyBtIGlzIGJhc2ljYWxseSBjaG9zZW4gdG8gYmUgbGFyZ2UgKGFzIGl0IGlzIHRoZSBtYXggcGVyaW9kKVxyXG4gIC8vIGFuZCBmb3IgaXRzIHJlbGF0aW9uc2hpcHMgdG8gYSBhbmQgY1xyXG4gIGZ1bmN0aW9uIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcigpIHtcclxuICAgICAgdGhpcy5tID0gNDI5NDk2NzI5NjtcclxuICAgICAgLy8gYSAtIDEgc2hvdWxkIGJlIGRpdmlzaWJsZSBieSBtJ3MgcHJpbWUgZmFjdG9yc1xyXG4gICAgICB0aGlzLmEgPSAxNjY0NTI1O1xyXG4gICAgICAvLyBjIGFuZCBtIHNob3VsZCBiZSBjby1wcmltZVxyXG4gICAgICB0aGlzLmMgPSAxMDEzOTA0MjIzO1xyXG4gICAgICB0aGlzLnNlZWQgPSB2b2lkIDA7XHJcbiAgICAgIHRoaXMueiA9IHZvaWQgMDtcclxuICAgICAgLy8gaW5pdGlhbCBwcmltaW5nIG9mIHRoZSBnZW5lcmF0b3IsIHVudGlsIGxhdGVyIG92ZXJyaWRlblxyXG4gICAgICB0aGlzLnNldFNlZWQoKTtcclxuICB9XHJcbiAgTGluZWFyQ29uZ3J1ZW50aWFsR2VuZXJhdG9yLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3IsXHJcbiAgICBzZXRTZWVkOiBmdW5jdGlvbih2YWwpIHsgdGhpcy56ID0gdGhpcy5zZWVkID0gdmFsIHx8IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIHRoaXMubSk7IH0sXHJcbiAgICBnZXRTZWVkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc2VlZDsgfSxcclxuICAgIHJhbmQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAvLyBkZWZpbmUgdGhlIHJlY3VycmVuY2UgcmVsYXRpb25zaGlwXHJcbiAgICAgIHRoaXMueiA9ICh0aGlzLmEgKiB0aGlzLnogKyB0aGlzLmMpICUgdGhpcy5tO1xyXG4gICAgICAvLyByZXR1cm4gYSBmbG9hdCBpbiBbMCwgMSlcclxuICAgICAgLy8gaWYgeiA9IG0gdGhlbiB6IC8gbSA9IDAgdGhlcmVmb3JlICh6ICUgbSkgLyBtIDwgMSBhbHdheXNcclxuICAgICAgcmV0dXJuIHRoaXMueiAvIHRoaXMubTtcclxuICAgIH1cclxuICB9O1xyXG4gIHJldHVybiBMaW5lYXJDb25ncnVlbnRpYWxHZW5lcmF0b3I7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjsiLCJcclxuZnVuY3Rpb24gTXVsdGltYXAoKSB7XHJcbiAgICB0aGlzLl90YWJsZSA9IFtdO1xyXG59XHJcblxyXG5NdWx0aW1hcC5wcm90b3R5cGUgPSB7XHJcbiAgICBjb25zdHJ1Y3RvcjogTXVsdGltYXAsXHJcbiAgICBnZXQ6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfSxcclxuICAgIHNldDogZnVuY3Rpb24ocm93LCB2YWwpIHsgKHRoaXMuX3RhYmxlW3Jvd10gfHwgKHRoaXMuX3RhYmxlW3Jvd10gPSBbXSkpLnB1c2godmFsKTsgfSxcclxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGZuKSB7IHJldHVybiBbXS5mb3JFYWNoLmNhbGwodGhpcy52YWx1ZXMoKSwgZm4pOyB9LFxyXG4gICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl90YWJsZSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgfSxcclxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfSxcclxuICAgIHNpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpLmxlbmd0aDsgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aW1hcDsiLCJcclxudmFyIExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvciA9IHJlcXVpcmUoJy4vbGliL2xjZ2VuZXJhdG9yJyk7XHJcblxyXG5mdW5jdGlvbiBNaW5lTGF5ZXIobWluZXMsIGRpbWVuc2lvbnMpIHtcclxuICAgIHRoaXMuZ2VuZXJhdG9yID0gbmV3IExpbmVhckNvbmdydWVudGlhbEdlbmVyYXRvcjtcclxuICAgIHRoaXMubWluZXMgPSArbWluZXMgfHwgMDtcclxuICAgIHRoaXMuZGltZW5zaW9ucyA9ICtkaW1lbnNpb25zIHx8IDA7XHJcblxyXG4gICAgdmFyIHJhbmRzID0gW10sXHJcbiAgICAgICAgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgIGdldFJhbmRvbU51bWJlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gX3RoaXMuZ2VuZXJhdG9yLnJhbmQoKSAqIChNYXRoLnBvdyhfdGhpcy5kaW1lbnNpb25zLCAyKSkgfCAwOyB9O1xyXG5cclxuICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICB2YXIgcm5kID0gZ2V0UmFuZG9tTnVtYmVyKCk7XHJcblxyXG4gICAgICAgIGlmICghfnJhbmRzLmluZGV4T2Yocm5kKSlcclxuICAgICAgICAgICAgcmFuZHMucHVzaChybmQpO1xyXG4gICAgICAgIC8vIC4uLm90aGVyd2lzZSwgZ2l2ZSBpdCBhbm90aGVyIGdvLSdyb3VuZDpcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgbWluZXMrKztcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMubG9jYXRpb25zID0gcmFuZHMubWFwKGZ1bmN0aW9uKHJuZCkge1xyXG4gICAgICAgIHZhciByb3cgPSB+fihybmQgLyBkaW1lbnNpb25zKSxcclxuICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnM7XHJcbiAgICAgICAgcmV0dXJuIFsgcm93LCBjZWxsIF07XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5sb2NhdGlvbnM7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWluZUxheWVyOyIsImZ1bmN0aW9uIFNjb3Jla2VlcGVyKGdhbWVib2FyZCkge1xyXG4gIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gIHRoaXMuY2FsbGJhY2tzID0ge1xyXG4gICAgdXA6IGZ1bmN0aW9uIHVwKHB0cykgeyB0aGlzLnNjb3JlICs9IHB0czsgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uIGRvd24ocHRzKSB7IHRoaXMuc2NvcmUgPSAodGhpcy5zY29yZSAtIHB0cyA8PSAwKSA/IDAgOiB0aGlzLnNjb3JlIC0gcHRzOyB9XHJcbiAgfTtcclxuXHJcbiAgdGhpcy5maW5hbGl6ZXJzID0ge1xyXG4gICAgZm9yT3BlbmluZ1NxdWFyZXM6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtb3ZlcyA9IGdhbWVib2FyZC51c2VyTW92ZXMsXHJcbiAgICAgICAgICAgIHVubWluZWQgPSBNYXRoLnBvdyhnYW1lYm9hcmQuZGltZW5zaW9ucywgMikgLSBnYW1lYm9hcmQubWluZXM7XHJcbiAgICAgICAgcmV0dXJuIDEgLSAofn4obW92ZXMgLyB1bm1pbmVkKSAqIDEwKTtcclxuICAgIH0sXHJcbiAgICBmb3JUaW1lUGFzc2VkOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgdG90YWwgPSBnYW1lYm9hcmQuY2xvY2suaW5pdGlhbCwgZWxhcHNlZCA9IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzO1xyXG4gICAgICAgIHJldHVybiAxMDAgLSB+fihlbGFwc2VkIC8gdG90YWwgKiAxMDApO1xyXG4gICAgfSxcclxuICAgIGZvckZld2VzdE1vdmVzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICAvLyBleHBlcmltZW50YWw6IHNxcnQoeF4yIC0geCkgKiAxMFxyXG4gICAgICAgIHZhciBkaW1zID0gTWF0aC5wb3coZ2FtZWJvYXJkLmRpbWVuc2lvbnMsIDIpO1xyXG4gICAgICAgIHJldHVybiB+fihNYXRoLnNxcnQoZGltcyAtIGdhbWVib2FyZC51c2VyTW92ZXMpICogMTApO1xyXG4gICAgfSxcclxuICAgIGZvckZpbmFsTWlzZmxhZ2dpbmdzOiBmdW5jdGlvbihnYW1lYm9hcmQpIHtcclxuICAgICAgICB2YXIgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBtaXNmbGFnZ2VkID0gZmxhZ2dlZC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pO1xyXG4gICAgICAgIHJldHVybiAobWlzZmxhZ2dlZC5sZW5ndGggKiAxMCkgfHwgMDtcclxuICAgIH0sXHJcbiAgICBmb3JDb3JyZWN0RmxhZ2dpbmc6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHZhciBtaW5lcyA9IGdhbWVib2FyZC5taW5lcyxcclxuICAgICAgICAgICAgc3F1YXJlcyA9IGdhbWVib2FyZC5nZXRTcXVhcmVzKCksXHJcbiAgICAgICAgICAgIGZsYWdnZWQgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNGbGFnZ2VkKCk7IH0pLFxyXG4gICAgICAgICAgICBmbGFnZ2VkTWluZXMgPSBzcXVhcmVzLmZpbHRlcihmdW5jdGlvbihzcSkgeyByZXR1cm4gc3EuaXNNaW5lZCgpOyB9KSxcclxuICAgICAgICAgICAgcGN0ID0gfn4oZmxhZ2dlZE1pbmVzLmxlbmd0aCAvIG1pbmVzKTtcclxuICAgICAgICByZXR1cm4gTWF0aC5jZWlsKChtaW5lcyAqIDEwKSAqIHBjdCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgdGhpcy5xdWV1ZSA9IFtdO1xyXG4gIHRoaXMuZmluYWwgPSBbXTtcclxuXHJcbiAgLy8gVE9ETzogd2VhbiB0aGlzIGNsYXNzIG9mZiBkZXBlbmRlbmN5IG9uIGdhbWVib2FyZFxyXG4gIC8vIHNob3VsZCBvbmx5IG5lZWQgdG8gaGF2ZSBjdG9yIGluamVjdGVkIHdpdGggdGhlIGdhbWVib2FyZCdzIGVtaXR0ZXJcclxuICB0aGlzLmdhbWVib2FyZCA9IGdhbWVib2FyZDtcclxuICB0aGlzLmVtaXR0ZXIgPSBnYW1lYm9hcmQuZW1pdHRlcjtcclxuICB0aGlzLnNjb3JlID0gMDtcclxuXHJcbiAgdGhpcy5uc3UgPSB0aGlzLl9kZXRlcm1pbmVTaWduaWZpY2FudFVuaXQoKTtcclxuICB0aGlzLmVuZEdhbWUgPSBmYWxzZTsgLy8gaWYgZ2FtZSBpcyBub3cgb3ZlciwgZmx1c2ggcXVldWVzXHJcbiAgdGhpcy50aW1lciA9IHNldEludGVydmFsKHRoaXMuX3RpY2suYmluZChfdGhpcyksIHRoaXMubnN1KTtcclxuXHJcbiAgY29uc29sZS5sb2coXCJTY29yZWtlZXBlciBpbml0aWFsaXplZC4gIDpzY29yZSA9PiAlbywgOnRpbWVyID0+ICVvXCIsIHRoaXMuc2NvcmUsIHRoaXMudGltZXIpO1xyXG4gIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBvcyhwdHMpIHsgcmV0dXJuIE1hdGguYWJzKCtwdHMpIHx8IDA7IH1cclxuZnVuY3Rpb24gbmVnKHB0cykgeyByZXR1cm4gLTEgKiBNYXRoLmFicygrcHRzKSB8fCAwOyB9XHJcblxyXG5TY29yZWtlZXBlci5wcm90b3R5cGUgPSB7XHJcbiAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOm9wZW4nLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHtcclxuICAgICAgICAvLyBjaGVjayBkYW5nZXIgaW5kZXguLi5pZiBub3QgPiAxLCBub3QgYHVwYHMgZm9yIHRoYXQhXHJcblxyXG4gICAgICB9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTpjbG9zZScsIGZ1bmN0aW9uKHNxdWFyZSwgY2VsbCkge30pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ3NxOmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuICAgICAgdGhpcy5lbWl0dGVyLm9uKCdzcTp1bmZsYWcnLCBmdW5jdGlvbihzcXVhcmUsIGNlbGwpIHt9KTtcclxuXHJcbiAgICAgIHRoaXMuZW1pdHRlci5vbignZ2I6c3RhcnQnLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgLyogU1RBUlQgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDp3aW4nLCBmdW5jdGlvbihlbmFtZSwgZ2FtZWJvYXJkLCAkZWwpIHsgX3RoaXMuZW5kR2FtZSA9IHRydWU7IC8qIFNUT1AgVEhFIFNDT1JFS0VFUEVSICovIH0pO1xyXG4gICAgICB0aGlzLmVtaXR0ZXIub24oJ2diOmVuZDpvdmVyJywgZnVuY3Rpb24oZW5hbWUsIGdhbWVib2FyZCwgJGVsKSB7IF90aGlzLmVuZEdhbWUgPSB0cnVlOyAvKiBTVE9QIFRIRSBTQ09SRUtFRVBFUiAqLyB9KTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lU2lnbmlmaWNhbnRVbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgaXNDdXN0b20gPSB0aGlzLmdhbWVib2FyZC5pc0N1c3RvbSxcclxuICAgICAgICAgICAgcyA9IHRoaXMuZ2FtZWJvYXJkLmNsb2NrLnNlY29uZHMsXHJcbiAgICAgICAgICAgIFNFQ09ORFMgPSAxMDAwLCAvLyBtaWxsaXNlY29uZHNcclxuICAgICAgICAgICAgZ2V0TWF4VGltZSA9IGZ1bmN0aW9uKHRpbWUpIHsgcmV0dXJuIE1hdGgubWF4KHRpbWUsIDEgKiBTRUNPTkRTKSB9O1xyXG5cclxuICAgICAgICBpZiAocyAvIDEwMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSh+fihzIC8gMjUwICogU0VDT05EUykpO1xyXG4gICAgICAgIGVsc2UgaWYgKHMgLyAxMCA+PSAxKVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0TWF4VGltZSg1ICogU0VDT05EUyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gMSAqIFNFQ09ORFM7XHJcbiAgICB9LFxyXG4gICAgX3NvcnRlZEluc2VydDogZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHZhciBsbyA9IDAsIGhpID0gdGhpcy5xdWV1ZS5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUgKGxvIDwgaGkpIHtcclxuICAgICAgICAgICAgdmFyIG1pZCA9IH5+KChsbyArIGhpKSAvIDIpO1xyXG4gICAgICAgICAgICBpZiAoeC50aW1lIDwgdGhpcy5xdWV1ZVttaWRdLnRpbWUpXHJcbiAgICAgICAgICAgICAgICBoaSA9IG1pZDtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbG8gPSBtaWQgKyAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbG87XHJcbiAgICB9LFxyXG4gICAgX2VucXVldWU6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKHRoaXMuX3NvcnRlZEluc2VydCh4KSwgMCwgeCk7IH0sXHJcbiAgICBfcHJvY2Vzc0V2ZW50OiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuY2FsbGJhY2tzW2V2ZW50LnR5cGVdO1xyXG4gICAgICAgIGlmIChmbiAhPSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gKGZuLmxlbmd0aCA+IDEpXHJcbiAgICAgICAgICAgICAgICA/IGZuLmNhbGwodGhpcywgZXZlbnQucHRzLCBmdW5jdGlvbihlcnIpIHsgaWYgKCFlcnIpIHJldHVybiB2b2lkIDA7IH0pXHJcbiAgICAgICAgICAgICAgICA6IGNvbnNvbGUubG9nKFwiPHNjb3JlIGV2ZW50OiAlbz46IDpvbGQgWyVvXVwiLCBmbi5uYW1lLCB0aGlzLnNjb3JlKSwgZm4uY2FsbCh0aGlzLCBldmVudC5wdHMpLCBjb25zb2xlLmxvZyhcIi4uLjpuZXcgPT4gWyVvXVwiLCB0aGlzLnNjb3JlKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBjb25zb2xlLmxvZyhcIltTY29yZWtlZXBlcl0gY291bGQgbm90IGZpbmQgZnVuY3Rpb24gXCIgKyBldmVudC50eXBlKTtcclxuICAgIH0sXHJcbiAgICBfcHJvY2Vzc0ZpbmFsaXplcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGZvciAodmFyIHZpc2l0b3IgaW4gdGhpcy5maW5hbGl6ZXJzKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiPGZpbmFsaXplcjogJW8+OiA6b2xkIFslb10gPT4gOm5ldyBbJW9dLi4uIFwiLCB2aXNpdG9yLCB0aGlzLnNjb3JlLCAodGhpcy5zY29yZSArPSB0aGlzLmZpbmFsaXplcnNbdmlzaXRvcl0odGhpcy5nYW1lYm9hcmQpKSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuc2NvcmUgKz0gdmlzaXRvcih0aGlzLmdhbWVib2FyZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIF90aWNrOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgY3VycklkeCA9IHRoaXMuX3NvcnRlZEluc2VydCh7IHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpIH0pLCBpbmRleCA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgY3VycklkeCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChfdGhpcy5xdWV1ZVtpbmRleF0pOyByZXR1cm4gaW5kZXggKz0gMTsgfTtcclxuICAgICAgICAgICAgY2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucXVldWUuc3BsaWNlKDAsIGN1cnJJZHgpO1xyXG4gICAgfSxcclxuICAgIF91cGRhdGVEaXNwbGF5OiBmdW5jdGlvbigpIHtcclxuICAgICAgLy8gdXBkYXRlIHRoZSBzY29yZWJvYXJkIG9uIHRoZSBwYWdlIGhlcmUuLi5cclxuICAgICAgY29uc29sZS5sb2coXCI6c2NvcmUgPT4gJW8gIEAgWyVvXVwiLCB0aGlzLnNjb3JlLCBuZXcgRGF0ZSk7XHJcbiAgICB9LFxyXG4gICAgX2FkZFNjb3JlVG9RdWV1ZTogZnVuY3Rpb24odHlwZSwgcHRzKSB7IHJldHVybiB0aGlzLl9lbnF1ZXVlKHsgdGltZTogKCgrbmV3IERhdGUpICsgdGhpcy5uc3UpLCB0eXBlOiB0eXBlLCBwdHM6IHB0cyB9KTsgfSxcclxuXHJcbiAgICB1cDogZnVuY3Rpb24ocHRzKSB7IGNvbnNvbGUubG9nKFwiUXVldWVpbmcgYHVwYCBzY29yZSBldmVudCBvZiAlb1wiLCBwb3MocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcInVwXCIsIHBvcyhwdHMpKTsgfSxcclxuICAgIGRvd246IGZ1bmN0aW9uKHB0cykgeyBjb25zb2xlLmxvZyhcIlF1ZXVlaW5nIGBkb3duYCBzY29yZSBldmVudCBvZiAlb1wiLCBuZWcocHRzKSk7IHRoaXMuX2FkZFNjb3JlVG9RdWV1ZShcImRvd25cIiwgbmVnKHB0cykpOyB9LFxyXG5cclxuICAgIGZpbmFsVXA6IGZ1bmN0aW9uKHB0cykgeyB0aGlzLmZpbmFsLnB1c2gocG9zKHB0cykpOyB9LFxyXG4gICAgZmluYWxEb3duOiBmdW5jdGlvbihwdHMpIHsgdGhpcy5maW5hbC5wdXNoKG5lZyhwdHMpKTsgfSxcclxuXHJcbiAgICBnZXRQZW5kaW5nU2NvcmVDb3VudDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnF1ZXVlLmxlbmd0aDsgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhcIkNsZWFyaW5nIG91dCByZW1haW5pbmcgcXVldWUhXCIpO1xyXG4gICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICB0aGlzLnF1ZXVlLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHsgX3RoaXMuX3Byb2Nlc3NFdmVudChldmVudCk7IH0pO1xyXG5cclxuICAgICAgdGhpcy5fcHJvY2Vzc0ZpbmFsaXplcnMoKTtcclxuXHJcbiAgICAgIGNvbnNvbGUuaW5mbyhcIkZJTkFMIFNDT1JFOiAlb1wiLCB0aGlzLnNjb3JlKTtcclxuICAgIH0sXHJcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy50aW1lcik7XHJcbiAgICAgIHRoaXMucXVldWUubGVuZ3RoID0gMDtcclxuICAgICAgdGhpcy5maW5hbC5sZW5ndGggPSAwO1xyXG4gICAgICB0aGlzLnNjb3JlID0gMDtcclxuICAgIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2NvcmVrZWVwZXI7IiwidmFyIFNlcmlhbGl6ZXIgPSB7XHJcbiAgICBleHBvcnQ6IGZ1bmN0aW9uKGdhbWVib2FyZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIF9tZXRhOiB7XHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6ICtuZXcgRGF0ZSxcclxuICAgICAgICAgICAgICAgIHNjb3JlOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgdGltZXI6IGdhbWVib2FyZC5jbG9jay5zZWNvbmRzLFxyXG4gICAgICAgICAgICAgICAgdHJhbnNjcmlwdHM6IGdhbWVib2FyZC5lbWl0dGVyLl90cmFuc2NyaXB0cyB8fCBbXSxcclxuICAgICAgICAgICAgICAgIHVzZXI6IHt9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICRlbDogZ2FtZWJvYXJkLiRlbC5zZWxlY3RvcixcclxuICAgICAgICAgICAgICAgIGJvYXJkOiBnYW1lYm9hcmQuYm9hcmQuX3RhYmxlLFxyXG4gICAgICAgICAgICAgICAgc2NvcmVrZWVwZXI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBmbGFzaENvbnRhaW5lcjogZ2FtZWJvYXJkLmZsYXNoQ29udGFpbmVyLnNlbGVjdG9yLFxyXG4gICAgICAgICAgICAgICAgdGhlbWU6IGdhbWVib2FyZC50aGVtZSxcclxuICAgICAgICAgICAgICAgIGRlYnVnX21vZGU6IGdhbWVib2FyZC5kZWJ1Z19tb2RlLFxyXG4gICAgICAgICAgICAgICAgZGltZW5zaW9uczogZ2FtZWJvYXJkLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBtaW5lczogZ2FtZWJvYXJkLm1pbmVzLFxyXG4gICAgICAgICAgICAgICAgdXNlck1vdmVzOiBnYW1lYm9hcmQudXNlck1vdmVzLFxyXG4gICAgICAgICAgICAgICAgaXNNb2JpbGU6IGdhbWVib2FyZC5pc01vYmlsZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH0sXHJcbiAgICBpbXBvcnQ6IGZ1bmN0aW9uKGV4cG9ydGVkKSB7XHJcbiAgICAgICAgLy8gMS4gbmV3IEdhbWVib2FyZCBvYmplY3QgKGRlZmF1bHRzIGlzIG9rKVxyXG4gICAgICAgIC8vIDIuIHJlcGxhY2UgYGJvYXJkYCB3aXRoIG5ldyBNdWx0aW1hcDpcclxuICAgICAgICAvLyAgICAgLSBjb3VudCBhcnJheXMgYXQgZmlyc3QgbGV2ZWwgaW4gYm9hcmQgZm9yIG51bSByb3dzXHJcbiAgICAgICAgLy8gICAgICAgICAgW1tbe1wicm93XCI6MCxcImNlbGxcIjowLFwic3RhdGVcIjp7XCJfZmxhZ3NcIjpcIjEwMDBcIn0sXCJkYW5nZXJcIjowfSxcclxuICAgICAgICAvLyAgICAgICAgICB7XCJyb3dcIjowLFwiY2VsbFwiOjIsXCJzdGF0ZVwiOntcIl9mbGFnc1wiOlwiMDAxMFwifX1dXV1cclxuICAgICAgICAvLyAgICAgLSBwYXJzZSBlYWNoIG9iamVjdCB0byBjcmVhdGUgbmV3IFNxdWFyZShyb3csIGNlbGwsIGRhbmdlciwgX2ZsYWdzKVxyXG4gICAgICAgIC8vIDMuICRlbCA9ICQoZXhwb3J0ZWQuJGVsKVxyXG4gICAgICAgIC8vIDQuIGZsYXNoQ29udGFpbmVyID0gJChleHBvcnRlZC5mbGFzaENvbnRhaW5lcilcclxuICAgICAgICAvLyA1LiB0aGVtZSA9IGV4cG9ydGVkLnRoZW1lXHJcbiAgICAgICAgLy8gNi4gZGVidWdfbW9kZSA9IGV4cG9ydGVkLmRlYnVnX21vZGVcclxuICAgICAgICAvLyA3LiBkaW1lbnNpb25zID0gZXhwb3J0ZWQuZGltZW5zaW9uc1xyXG4gICAgICAgIC8vIDguIG1pbmVzID0gZ2FtZWJvYXJkLm1pbmVzXHJcbiAgICAgICAgLy8gOS4gdXNlck1vdmVzID0gZ2FtZWJvYWQudXNlck1vdmVzLCBhbmQgaXNNb2JpbGVcclxuICAgICAgICAvLyAxMC4gbWFrZSBuZXcgQ291bnRkb3duIHdpdGggZXhwb3J0ZWQuX21ldGEudGltZXIgPSBzZWNvbmRzLCBjbG9jay5zdGFydCgpXHJcbiAgICAgICAgLy8gMTEuIGluc3RhbnRpYXRlIG5ldyBUcmFuc2NyaWJpbmdFbWl0dGVyLCBsb2FkaW5nIF9tZXRhLnRyYW5zY3JpcHRzIGludG8gaXRzIF90cmFuc2NyaXB0c1xyXG4gICAgICAgIC8vIDEyLiByZS1ydW4gdGhlIGludGVybmFsIGluaXQoKSBvcHM6IF9sb2FkQm9hcmQsIF9yZW5kZXJHcmlkXHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VyaWFsaXplcjsiLCJ2YXIgQml0RmxhZ0ZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9iaXQtZmxhZy1mYWN0b3J5JyksXHJcbiAgICBTeW1ib2xzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKS5TeW1ib2xzLFxyXG4gICAgRmxhZ3MgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLkZsYWdzLFxyXG5cclxuICAgIEJpdEZsYWdzID0gbmV3IEJpdEZsYWdGYWN0b3J5KFsgRmxhZ3MuT1BFTiwgRmxhZ3MuTUlORUQsIEZsYWdzLkZMQUdHRUQsIEZsYWdzLklOREVYRUQgXSk7XHJcblxyXG5mdW5jdGlvbiBTcXVhcmUocm93LCBjZWxsLCBkYW5nZXIsIGZsYWdzKSB7XHJcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICByZXR1cm4gbmV3IFNxdWFyZShhcmd1bWVudHMpO1xyXG4gICAgdGhpcy5yb3cgPSByb3c7XHJcbiAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgdGhpcy5zdGF0ZSA9IGZsYWdzID8gbmV3IEJpdEZsYWdzKGZsYWdzKSA6IG5ldyBCaXRGbGFncztcclxuICAgIHRoaXMuZGFuZ2VyID0gKGRhbmdlciA9PSArZGFuZ2VyKSA/ICtkYW5nZXIgOiAwO1xyXG5cclxuICAgIGlmICh0aGlzLmRhbmdlciA+IDApIHRoaXMuaW5kZXgoKTtcclxufVxyXG5cclxuU3F1YXJlLnByb3RvdHlwZSA9IHtcclxuICAgIGNvbnN0cnVjdG9yOiBTcXVhcmUsXHJcbiAgICBnZXRSb3c6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5yb3c7IH0sXHJcbiAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgIGdldERhbmdlcjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmRhbmdlcjsgfSxcclxuICAgIHNldERhbmdlcjogZnVuY3Rpb24oaWR4KSB7IGlmIChpZHggPT0gK2lkeCkgeyB0aGlzLmRhbmdlciA9ICtpZHg7IHRoaXMuZGFuZ2VyID4gMCAmJiB0aGlzLmluZGV4KCk7IH0gfSxcclxuICAgIGdldFN0YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhTeW1ib2xzKVxyXG4gICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gX3RoaXNbICdpcycgKyBrZXkuY2hhckF0KDApICsga2V5LnN1YnN0cmluZygxKS50b0xvd2VyQ2FzZSgpIF0oKTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihrZXkpIHsgcmV0dXJuIGtleS50b0xvd2VyQ2FzZSgpOyB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnVuc2V0KHRoaXMuc3RhdGUuRl9PUEVOKTsgfSxcclxuICAgIG9wZW46IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlLnNldCh0aGlzLnN0YXRlLkZfT1BFTik7IH0sXHJcbiAgICBmbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0ZMQUdHRUQpOyB9LFxyXG4gICAgdW5mbGFnOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS51bnNldCh0aGlzLnN0YXRlLkZfRkxBR0dFRCk7IH0sXHJcbiAgICBtaW5lOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX01JTkVEKTsgfSxcclxuICAgIGluZGV4OiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZS5zZXQodGhpcy5zdGF0ZS5GX0lOREVYRUQpOyB9LFxyXG5cclxuICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuICF0aGlzLnN0YXRlLmlzT3BlbigpOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNPcGVuKCk7IH0sXHJcbiAgICBpc0ZsYWdnZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0ZsYWdnZWQoKTsgfSxcclxuICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc01pbmVkKCk7IH0sXHJcbiAgICBpc0luZGV4ZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZS5pc0luZGV4ZWQoKTsgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyByb3c6IHRoaXMucm93LCBjZWxsOiB0aGlzLmNlbGwsIHN0YXRlOiB0aGlzLnN0YXRlLCBkYW5nZXI6IHRoaXMuZGFuZ2VyIH0gfSxcclxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUuaXNNaW5lZCgpXHJcbiAgICAgICAgICAgID8gU3ltYm9scy5NSU5FRCA6IHRoaXMuc3RhdGUuaXNGbGFnZ2VkKClcclxuICAgICAgICAgICAgICAgID8gU3ltYm9scy5GTEFHR0VEIDogdGhpcy5zdGF0ZS5pc09wZW4oKVxyXG4gICAgICAgICAgICAgICAgICAgID8gU3ltYm9scy5PUEVOIDogU3ltYm9scy5DTE9TRUQ7XHJcbiAgICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNxdWFyZTsiLCJ2YXIgJEMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xyXG5cclxudmFyIFRoZW1lU3R5bGVyID0ge1xyXG5cdHNldDogZnVuY3Rpb24odGhlbWUsICRlbCkge1xyXG5cclxuXHRcdCRlbCB8fCAoJGVsID0gJCgkQy5EZWZhdWx0Q29uZmlnLmJvYXJkKSk7XHJcblxyXG5cdFx0dmFyIHRoZW1lRmlsZSA9ICRDLlRoZW1lc1t0aGVtZV0sXHJcblx0XHRcdCRoZWFkID0gJGVsLnBhcmVudHMoXCJib2R5XCIpLnNpYmxpbmdzKFwiaGVhZFwiKSxcclxuXHRcdFx0JHN0eWxlcyA9ICRoZWFkLmZpbmQoXCJsaW5rXCIpLFxyXG5cclxuXHRcdFx0aGFzUHJlRXhpc3RpbmcgPSBmdW5jdGlvbihzdHlsZXNoZWV0cykge1xyXG5cdFx0XHRcdHJldHVybiAhIXN0eWxlc2hlZXRzLmZpbHRlcihmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdHJldHVybiAhIX4kKHRoaXMpLmF0dHIoJ2hyZWYnKS5pbmRleE9mKHRoZW1lRmlsZSk7XHJcblx0XHRcdFx0fSkubGVuZ3RoXHJcblx0XHRcdH0sXHJcblx0XHRcdC8vIGJ1aWxkIGEgbmV3IDxsaW5rPiB0YWcgZm9yIHRoZSBkZXNpcmVkIHRoZW1lIHN0eWxlc2hlZXQ6XHJcblx0XHRcdCRsaW5rID0gJChcIjxsaW5rIC8+XCIsIHtcclxuXHRcdFx0XHRyZWw6ICdzdHlsZXNoZWV0JyxcclxuXHRcdFx0XHR0eXBlOiAndGV4dC9jc3MnLFxyXG5cdFx0XHRcdGhyZWY6ICdjc3MvJyArIHRoZW1lRmlsZSArICcuY3NzJ1xyXG5cdFx0XHR9KTtcclxuXHRcdC8vIHVzaW5nICRlbCBhcyBhbmNob3IgdG8gdGhlIERPTSwgZ28gdXAgYW5kXHJcblx0XHQvLyBsb29rIGZvciBsaWdodC5jc3Mgb3IgZGFyay5jc3MsIGFuZC0taWYgbmVjZXNzYXJ5LS1zd2FwXHJcblx0XHQvLyBpdCBvdXQgZm9yIGB0aGVtZWAuXHJcblx0XHQvLyBBZGQgJGxpbmsgaWZmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdCFcclxuXHRcdGlmICghaGFzUHJlRXhpc3RpbmcoJHN0eWxlcykpXHJcblx0XHRcdCRzdHlsZXMuYWZ0ZXIoJGxpbmspO1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVGhlbWVTdHlsZXI7IiwidmFyIEVtaXR0ZXIgPSByZXF1aXJlKCcuL2xpYi9lbWl0dGVyJyksXHJcbiAgICB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG5cclxuZnVuY3Rpb24gVHJhbnNjcmliaW5nRW1pdHRlcigpIHtcclxuICAgIEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuX3RyYW5zY3JpcHRzID0gW107XHJcbn1cclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSk7XHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVHJhbnNjcmliaW5nRW1pdHRlcjtcclxuXHJcblRyYW5zY3JpYmluZ0VtaXR0ZXIucHJvdG90eXBlLl9fdHJpZ2dlcl9fID0gVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlcjtcclxuVHJhbnNjcmliaW5nRW1pdHRlci5wcm90b3R5cGUudHJpZ2dlciA9IGZ1bmN0aW9uKC8qIGRhdGEuLi4gW3ZhcmFyZ3NdICovKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcclxuICAgIC8vIHNlbmQgb3JpZ2luYWwgcGFyYW1zIHRvIHRoZSBzdWJzY3JpYmVycy4uLlxyXG4gICAgdGhpcy5fX3RyaWdnZXJfXy5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgIGNvbnNvbGUuZGVidWcoXCJbVEVdID0+ICVvXCIsIGFyZ3MpXHJcbiAgICAvLyAuLi50aGVuIGFsdGVyIHRoZSBwYXJhbXMgZm9yIHRoZSB0cmFuc2NyaXB0J3MgcmVjb3Jkc1xyXG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAzKSB7XHJcblxyXG4gICAgICAgIC8vIHN0YW5kYXJkIFNxdWFyZS1iYXNlZCBldmVudFxyXG4gICAgICAgIC8vIDA6IGV2ZW50IG5hbWUsIDE6IFNxdWFyZSBpbnN0YW5jZSwgMjogalF1ZXJ5LXdyYXBwZWQgRE9NIGVsZW1lbnRcclxuICAgICAgICBpZiAoYXJnc1sxXS5jb25zdHJ1Y3Rvci5uYW1lID09PSBcIlNxdWFyZVwiKVxyXG4gICAgICAgICAgICBhcmdzWzFdID0gSlNPTi5zdHJpbmdpZnkoYXJnc1sxXSk7XHJcbiAgICAgICAgaWYgKGFyZ3NbMl0gaW5zdGFuY2VvZiBqUXVlcnkpXHJcbiAgICAgICAgICAgIGFyZ3NbMl0gPSBidWlsZERPTVN0cmluZyhhcmdzWzJdKTtcclxuXHJcbiAgICAgICAgLy8gc3RhbmRhcmQgR2FtZWJvYXJkLWJhc2VkIGV2ZW50XHJcbiAgICAgICAgaWYgKGFyZ3NbMV0uY29uc3RydWN0b3IubmFtZSA9PT0gXCJNdWx0aW1hcFwiKVxyXG4gICAgICAgICAgICBhcmdzWzFdID0gSlNPTi5zdHJpbmdpZnkoYXJnc1sxXSk7XHJcbiAgICB9XHJcbiAgICBhcmdzLnVuc2hpZnQoK25ldyBEYXRlKTtcclxuICAgIHRoaXMuX3RyYW5zY3JpcHRzLnB1c2goYXJncyk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBidWlsZERPTVN0cmluZygkZWwpIHtcclxuICAgIHZhciBub2RlID0gJGVsIGluc3RhbmNlb2YgalF1ZXJ5ID8gJGVsWzBdIDogJGVsLFxyXG4gICAgICAgIFNPUlRfRk5fQ0VMTF9GSVJTVCA9IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gKGEgPT09ICdjZWxsJyB8fCBiID09PSdjZWxsJyB8fCBhID4gYikgPyAxIDogKGEgPCBiKSA/IC0xIDogMDsgfTtcclxuICAgIHJldHVybiBub2RlLnBhcmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgKyBcIiNcIiArIG5vZGUucGFyZW50Tm9kZS5pZCArIFwiIFwiXHJcbiAgICAgICAgKyBub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSArIFwiLlwiXHJcbiAgICAgICAgKyBub2RlLmNsYXNzTmFtZS5zcGxpdCgnICcpXHJcbiAgICAgICAgLnNvcnQoU09SVF9GTl9DRUxMX0ZJUlNUKVxyXG4gICAgICAgIC5qb2luKCcuJyk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVHJhbnNjcmliaW5nRW1pdHRlcjsiLCIvKiEgalF1ZXJ5IHBsdWdpbiBmb3IgSGFtbWVyLkpTIC0gdjEuMC4xIC0gMjAxNC0wMi0wM1xyXG4gKiBodHRwOi8vZWlnaHRtZWRpYS5naXRodWIuY29tL2hhbW1lci5qc1xyXG4gKlxyXG4gKiBIYW1tZXIuSlMgLSB2MS4wLjdkZXYgLSAyMDE0LTAyLTE4XHJcbiAqIGh0dHA6Ly9laWdodG1lZGlhLmdpdGh1Yi5jb20vaGFtbWVyLmpzXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxNCBKb3JpayBUYW5nZWxkZXIgPGoudGFuZ2VsZGVyQGdtYWlsLmNvbT47XHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZSAqL1xyXG5cclxuKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuLyoqXHJcbiAqIEhhbW1lclxyXG4gKiB1c2UgdGhpcyB0byBjcmVhdGUgaW5zdGFuY2VzXHJcbiAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBvcHRpb25zXHJcbiAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKi9cclxudmFyIEhhbW1lciA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICByZXR1cm4gbmV3IEhhbW1lci5JbnN0YW5jZShlbGVtZW50LCBvcHRpb25zIHx8IHt9KTtcclxufTtcclxuXHJcbi8vIGRlZmF1bHQgc2V0dGluZ3NcclxuSGFtbWVyLmRlZmF1bHRzID0ge1xyXG4gIC8vIGFkZCBzdHlsZXMgYW5kIGF0dHJpYnV0ZXMgdG8gdGhlIGVsZW1lbnQgdG8gcHJldmVudCB0aGUgYnJvd3NlciBmcm9tIGRvaW5nXHJcbiAgLy8gaXRzIG5hdGl2ZSBiZWhhdmlvci4gdGhpcyBkb2VzbnQgcHJldmVudCB0aGUgc2Nyb2xsaW5nLCBidXQgY2FuY2Vsc1xyXG4gIC8vIHRoZSBjb250ZXh0bWVudSwgdGFwIGhpZ2hsaWdodGluZyBldGNcclxuICAvLyBzZXQgdG8gZmFsc2UgdG8gZGlzYWJsZSB0aGlzXHJcbiAgc3RvcF9icm93c2VyX2JlaGF2aW9yOiB7XHJcbiAgICAvLyB0aGlzIGFsc28gdHJpZ2dlcnMgb25zZWxlY3RzdGFydD1mYWxzZSBmb3IgSUVcclxuICAgIHVzZXJTZWxlY3QgICAgICAgOiAnbm9uZScsXHJcbiAgICAvLyB0aGlzIG1ha2VzIHRoZSBlbGVtZW50IGJsb2NraW5nIGluIElFMTAgPiwgeW91IGNvdWxkIGV4cGVyaW1lbnQgd2l0aCB0aGUgdmFsdWVcclxuICAgIC8vIHNlZSBmb3IgbW9yZSBvcHRpb25zIHRoaXMgaXNzdWU7IGh0dHBzOi8vZ2l0aHViLmNvbS9FaWdodE1lZGlhL2hhbW1lci5qcy9pc3N1ZXMvMjQxXHJcbiAgICB0b3VjaEFjdGlvbiAgICAgIDogJ25vbmUnLFxyXG4gICAgdG91Y2hDYWxsb3V0ICAgICA6ICdub25lJyxcclxuICAgIGNvbnRlbnRab29taW5nICAgOiAnbm9uZScsXHJcbiAgICB1c2VyRHJhZyAgICAgICAgIDogJ25vbmUnLFxyXG4gICAgdGFwSGlnaGxpZ2h0Q29sb3I6ICdyZ2JhKDAsMCwwLDApJ1xyXG4gIH1cclxuXHJcbiAgLy9cclxuICAvLyBtb3JlIHNldHRpbmdzIGFyZSBkZWZpbmVkIHBlciBnZXN0dXJlIGF0IGdlc3R1cmVzLmpzXHJcbiAgLy9cclxufTtcclxuXHJcbi8vIGRldGVjdCB0b3VjaGV2ZW50c1xyXG5IYW1tZXIuSEFTX1BPSU5URVJFVkVOVFMgPSB3aW5kb3cubmF2aWdhdG9yLnBvaW50ZXJFbmFibGVkIHx8IHdpbmRvdy5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZDtcclxuSGFtbWVyLkhBU19UT1VDSEVWRU5UUyA9ICgnb250b3VjaHN0YXJ0JyBpbiB3aW5kb3cpO1xyXG5cclxuLy8gZG9udCB1c2UgbW91c2VldmVudHMgb24gbW9iaWxlIGRldmljZXNcclxuSGFtbWVyLk1PQklMRV9SRUdFWCA9IC9tb2JpbGV8dGFibGV0fGlwKGFkfGhvbmV8b2QpfGFuZHJvaWR8c2lsay9pO1xyXG5IYW1tZXIuTk9fTU9VU0VFVkVOVFMgPSBIYW1tZXIuSEFTX1RPVUNIRVZFTlRTICYmIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKEhhbW1lci5NT0JJTEVfUkVHRVgpO1xyXG5cclxuLy8gZXZlbnR0eXBlcyBwZXIgdG91Y2hldmVudCAoc3RhcnQsIG1vdmUsIGVuZClcclxuLy8gYXJlIGZpbGxlZCBieSBIYW1tZXIuZXZlbnQuZGV0ZXJtaW5lRXZlbnRUeXBlcyBvbiBzZXR1cFxyXG5IYW1tZXIuRVZFTlRfVFlQRVMgPSB7fTtcclxuXHJcbi8vIGRpcmVjdGlvbiBkZWZpbmVzXHJcbkhhbW1lci5ESVJFQ1RJT05fRE9XTiA9ICdkb3duJztcclxuSGFtbWVyLkRJUkVDVElPTl9MRUZUID0gJ2xlZnQnO1xyXG5IYW1tZXIuRElSRUNUSU9OX1VQID0gJ3VwJztcclxuSGFtbWVyLkRJUkVDVElPTl9SSUdIVCA9ICdyaWdodCc7XHJcblxyXG4vLyBwb2ludGVyIHR5cGVcclxuSGFtbWVyLlBPSU5URVJfTU9VU0UgPSAnbW91c2UnO1xyXG5IYW1tZXIuUE9JTlRFUl9UT1VDSCA9ICd0b3VjaCc7XHJcbkhhbW1lci5QT0lOVEVSX1BFTiA9ICdwZW4nO1xyXG5cclxuLy8gaW50ZXJ2YWwgaW4gd2hpY2ggSGFtbWVyIHJlY2FsY3VsYXRlcyBjdXJyZW50IHZlbG9jaXR5IGluIG1zXHJcbkhhbW1lci5VUERBVEVfVkVMT0NJVFlfSU5URVJWQUwgPSAyMDtcclxuXHJcbi8vIHRvdWNoIGV2ZW50IGRlZmluZXNcclxuSGFtbWVyLkVWRU5UX1NUQVJUID0gJ3N0YXJ0JztcclxuSGFtbWVyLkVWRU5UX01PVkUgPSAnbW92ZSc7XHJcbkhhbW1lci5FVkVOVF9FTkQgPSAnZW5kJztcclxuXHJcbi8vIGhhbW1lciBkb2N1bWVudCB3aGVyZSB0aGUgYmFzZSBldmVudHMgYXJlIGFkZGVkIGF0XHJcbkhhbW1lci5ET0NVTUVOVCA9IHdpbmRvdy5kb2N1bWVudDtcclxuXHJcbi8vIHBsdWdpbnMgYW5kIGdlc3R1cmVzIG5hbWVzcGFjZXNcclxuSGFtbWVyLnBsdWdpbnMgPSBIYW1tZXIucGx1Z2lucyB8fCB7fTtcclxuSGFtbWVyLmdlc3R1cmVzID0gSGFtbWVyLmdlc3R1cmVzIHx8IHt9O1xyXG5cclxuXHJcbi8vIGlmIHRoZSB3aW5kb3cgZXZlbnRzIGFyZSBzZXQuLi5cclxuSGFtbWVyLlJFQURZID0gZmFsc2U7XHJcblxyXG4vKipcclxuICogc2V0dXAgZXZlbnRzIHRvIGRldGVjdCBnZXN0dXJlcyBvbiB0aGUgZG9jdW1lbnRcclxuICovXHJcbmZ1bmN0aW9uIHNldHVwKCkge1xyXG4gIGlmKEhhbW1lci5SRUFEWSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gZmluZCB3aGF0IGV2ZW50dHlwZXMgd2UgYWRkIGxpc3RlbmVycyB0b1xyXG4gIEhhbW1lci5ldmVudC5kZXRlcm1pbmVFdmVudFR5cGVzKCk7XHJcblxyXG4gIC8vIFJlZ2lzdGVyIGFsbCBnZXN0dXJlcyBpbnNpZGUgSGFtbWVyLmdlc3R1cmVzXHJcbiAgSGFtbWVyLnV0aWxzLmVhY2goSGFtbWVyLmdlc3R1cmVzLCBmdW5jdGlvbihnZXN0dXJlKXtcclxuICAgIEhhbW1lci5kZXRlY3Rpb24ucmVnaXN0ZXIoZ2VzdHVyZSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIEFkZCB0b3VjaCBldmVudHMgb24gdGhlIGRvY3VtZW50XHJcbiAgSGFtbWVyLmV2ZW50Lm9uVG91Y2goSGFtbWVyLkRPQ1VNRU5ULCBIYW1tZXIuRVZFTlRfTU9WRSwgSGFtbWVyLmRldGVjdGlvbi5kZXRlY3QpO1xyXG4gIEhhbW1lci5ldmVudC5vblRvdWNoKEhhbW1lci5ET0NVTUVOVCwgSGFtbWVyLkVWRU5UX0VORCwgSGFtbWVyLmRldGVjdGlvbi5kZXRlY3QpO1xyXG5cclxuICAvLyBIYW1tZXIgaXMgcmVhZHkuLi4hXHJcbiAgSGFtbWVyLlJFQURZID0gdHJ1ZTtcclxufVxyXG5cclxuSGFtbWVyLnV0aWxzID0ge1xyXG4gIC8qKlxyXG4gICAqIGV4dGVuZCBtZXRob2QsXHJcbiAgICogYWxzbyB1c2VkIGZvciBjbG9uaW5nIHdoZW4gZGVzdCBpcyBhbiBlbXB0eSBvYmplY3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICBkZXN0XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgc3JjXHJcbiAgICogQHBhcm0gIHtCb29sZWFufSAgbWVyZ2UgICAgZG8gYSBtZXJnZVxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIGRlc3RcclxuICAgKi9cclxuICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChkZXN0LCBzcmMsIG1lcmdlKSB7XHJcbiAgICBmb3IodmFyIGtleSBpbiBzcmMpIHtcclxuICAgICAgaWYoZGVzdFtrZXldICE9PSB1bmRlZmluZWQgJiYgbWVyZ2UpIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG4gICAgICBkZXN0W2tleV0gPSBzcmNba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBkZXN0O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBmb3IgZWFjaFxyXG4gICAqIEBwYXJhbSBvYmpcclxuICAgKiBAcGFyYW0gaXRlcmF0b3JcclxuICAgKi9cclxuICBlYWNoOiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XHJcbiAgICB2YXIgaSwgbGVuZ3RoO1xyXG4gICAgLy8gbmF0aXZlIGZvckVhY2ggb24gYXJyYXlzXHJcbiAgICBpZiAoJ2ZvckVhY2gnIGluIG9iaikge1xyXG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICAvLyBhcnJheXNcclxuICAgIGVsc2UgaWYob2JqLmxlbmd0aCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGZvciAoaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIC8vIG9iamVjdHNcclxuICAgIGVsc2Uge1xyXG4gICAgICBmb3IgKGkgaW4gb2JqKSB7XHJcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSAmJiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBmaW5kIGlmIGEgbm9kZSBpcyBpbiB0aGUgZ2l2ZW4gcGFyZW50XHJcbiAgICogdXNlZCBmb3IgZXZlbnQgZGVsZWdhdGlvbiB0cmlja3NcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgbm9kZVxyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBwYXJlbnRcclxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gICAgICAgaGFzX3BhcmVudFxyXG4gICAqL1xyXG4gIGhhc1BhcmVudDogZnVuY3Rpb24obm9kZSwgcGFyZW50KSB7XHJcbiAgICB3aGlsZShub2RlKSB7XHJcbiAgICAgIGlmKG5vZGUgPT0gcGFyZW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IHRoZSBjZW50ZXIgb2YgYWxsIHRoZSB0b3VjaGVzXHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgdG91Y2hlc1xyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIGNlbnRlclxyXG4gICAqL1xyXG4gIGdldENlbnRlcjogZnVuY3Rpb24gZ2V0Q2VudGVyKHRvdWNoZXMpIHtcclxuICAgIHZhciB2YWx1ZXNYID0gW10sIHZhbHVlc1kgPSBbXTtcclxuXHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0b3VjaGVzLCBmdW5jdGlvbih0b3VjaCkge1xyXG4gICAgICAvLyBJIHByZWZlciBjbGllbnRYIGJlY2F1c2UgaXQgaWdub3JlIHRoZSBzY3JvbGxpbmcgcG9zaXRpb25cclxuICAgICAgdmFsdWVzWC5wdXNoKHR5cGVvZiB0b3VjaC5jbGllbnRYICE9PSAndW5kZWZpbmVkJyA/IHRvdWNoLmNsaWVudFggOiB0b3VjaC5wYWdlWCApO1xyXG4gICAgICB2YWx1ZXNZLnB1c2godHlwZW9mIHRvdWNoLmNsaWVudFkgIT09ICd1bmRlZmluZWQnID8gdG91Y2guY2xpZW50WSA6IHRvdWNoLnBhZ2VZICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBwYWdlWDogKChNYXRoLm1pbi5hcHBseShNYXRoLCB2YWx1ZXNYKSArIE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlc1gpKSAvIDIpLFxyXG4gICAgICBwYWdlWTogKChNYXRoLm1pbi5hcHBseShNYXRoLCB2YWx1ZXNZKSArIE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlc1kpKSAvIDIpXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBjYWxjdWxhdGUgdGhlIHZlbG9jaXR5IGJldHdlZW4gdHdvIHBvaW50c1xyXG4gICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIGRlbHRhX3RpbWVcclxuICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICBkZWx0YV94XHJcbiAgICogQHBhcmFtICAge051bWJlcn0gICAgZGVsdGFfeVxyXG4gICAqIEByZXR1cm5zIHtPYmplY3R9ICAgIHZlbG9jaXR5XHJcbiAgICovXHJcbiAgZ2V0VmVsb2NpdHk6IGZ1bmN0aW9uIGdldFZlbG9jaXR5KGRlbHRhX3RpbWUsIGRlbHRhX3gsIGRlbHRhX3kpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHg6IE1hdGguYWJzKGRlbHRhX3ggLyBkZWx0YV90aW1lKSB8fCAwLFxyXG4gICAgICB5OiBNYXRoLmFicyhkZWx0YV95IC8gZGVsdGFfdGltZSkgfHwgMFxyXG4gICAgfTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBhbmdsZSBiZXR3ZWVuIHR3byBjb29yZGluYXRlc1xyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9ICAgIGFuZ2xlXHJcbiAgICovXHJcbiAgZ2V0QW5nbGU6IGZ1bmN0aW9uIGdldEFuZ2xlKHRvdWNoMSwgdG91Y2gyKSB7XHJcbiAgICB2YXIgeSA9IHRvdWNoMi5wYWdlWSAtIHRvdWNoMS5wYWdlWSxcclxuICAgICAgeCA9IHRvdWNoMi5wYWdlWCAtIHRvdWNoMS5wYWdlWDtcclxuICAgIHJldHVybiBNYXRoLmF0YW4yKHksIHgpICogMTgwIC8gTWF0aC5QSTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogYW5nbGUgdG8gZGlyZWN0aW9uIGRlZmluZVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMVxyXG4gICAqIEBwYXJhbSAgIHtUb3VjaH0gICAgIHRvdWNoMlxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9ICAgIGRpcmVjdGlvbiBjb25zdGFudCwgbGlrZSBIYW1tZXIuRElSRUNUSU9OX0xFRlRcclxuICAgKi9cclxuICBnZXREaXJlY3Rpb246IGZ1bmN0aW9uIGdldERpcmVjdGlvbih0b3VjaDEsIHRvdWNoMikge1xyXG4gICAgdmFyIHggPSBNYXRoLmFicyh0b3VjaDEucGFnZVggLSB0b3VjaDIucGFnZVgpLFxyXG4gICAgICB5ID0gTWF0aC5hYnModG91Y2gxLnBhZ2VZIC0gdG91Y2gyLnBhZ2VZKTtcclxuXHJcbiAgICBpZih4ID49IHkpIHtcclxuICAgICAgcmV0dXJuIHRvdWNoMS5wYWdlWCAtIHRvdWNoMi5wYWdlWCA+IDAgPyBIYW1tZXIuRElSRUNUSU9OX0xFRlQgOiBIYW1tZXIuRElSRUNUSU9OX1JJR0hUO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIHJldHVybiB0b3VjaDEucGFnZVkgLSB0b3VjaDIucGFnZVkgPiAwID8gSGFtbWVyLkRJUkVDVElPTl9VUCA6IEhhbW1lci5ESVJFQ1RJT05fRE9XTjtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byB0b3VjaGVzXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gxXHJcbiAgICogQHBhcmFtICAge1RvdWNofSAgICAgdG91Y2gyXHJcbiAgICogQHJldHVybnMge051bWJlcn0gICAgZGlzdGFuY2VcclxuICAgKi9cclxuICBnZXREaXN0YW5jZTogZnVuY3Rpb24gZ2V0RGlzdGFuY2UodG91Y2gxLCB0b3VjaDIpIHtcclxuICAgIHZhciB4ID0gdG91Y2gyLnBhZ2VYIC0gdG91Y2gxLnBhZ2VYLFxyXG4gICAgICB5ID0gdG91Y2gyLnBhZ2VZIC0gdG91Y2gxLnBhZ2VZO1xyXG4gICAgcmV0dXJuIE1hdGguc3FydCgoeCAqIHgpICsgKHkgKiB5KSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGN1bGF0ZSB0aGUgc2NhbGUgZmFjdG9yIGJldHdlZW4gdHdvIHRvdWNoTGlzdHMgKGZpbmdlcnMpXHJcbiAgICogbm8gc2NhbGUgaXMgMSwgYW5kIGdvZXMgZG93biB0byAwIHdoZW4gcGluY2hlZCB0b2dldGhlciwgYW5kIGJpZ2dlciB3aGVuIHBpbmNoZWQgb3V0XHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgc3RhcnRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBlbmRcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICBzY2FsZVxyXG4gICAqL1xyXG4gIGdldFNjYWxlOiBmdW5jdGlvbiBnZXRTY2FsZShzdGFydCwgZW5kKSB7XHJcbiAgICAvLyBuZWVkIHR3byBmaW5nZXJzLi4uXHJcbiAgICBpZihzdGFydC5sZW5ndGggPj0gMiAmJiBlbmQubGVuZ3RoID49IDIpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0RGlzdGFuY2UoZW5kWzBdLCBlbmRbMV0pIC9cclxuICAgICAgICB0aGlzLmdldERpc3RhbmNlKHN0YXJ0WzBdLCBzdGFydFsxXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsY3VsYXRlIHRoZSByb3RhdGlvbiBkZWdyZWVzIGJldHdlZW4gdHdvIHRvdWNoTGlzdHMgKGZpbmdlcnMpXHJcbiAgICogQHBhcmFtICAge0FycmF5fSAgICAgc3RhcnRcclxuICAgKiBAcGFyYW0gICB7QXJyYXl9ICAgICBlbmRcclxuICAgKiBAcmV0dXJucyB7TnVtYmVyfSAgICByb3RhdGlvblxyXG4gICAqL1xyXG4gIGdldFJvdGF0aW9uOiBmdW5jdGlvbiBnZXRSb3RhdGlvbihzdGFydCwgZW5kKSB7XHJcbiAgICAvLyBuZWVkIHR3byBmaW5nZXJzXHJcbiAgICBpZihzdGFydC5sZW5ndGggPj0gMiAmJiBlbmQubGVuZ3RoID49IDIpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0QW5nbGUoZW5kWzFdLCBlbmRbMF0pIC1cclxuICAgICAgICB0aGlzLmdldEFuZ2xlKHN0YXJ0WzFdLCBzdGFydFswXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMDtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogYm9vbGVhbiBpZiB0aGUgZGlyZWN0aW9uIGlzIHZlcnRpY2FsXHJcbiAgICogQHBhcmFtICAgIHtTdHJpbmd9ICAgIGRpcmVjdGlvblxyXG4gICAqIEByZXR1cm5zICB7Qm9vbGVhbn0gICBpc192ZXJ0aWNhbFxyXG4gICAqL1xyXG4gIGlzVmVydGljYWw6IGZ1bmN0aW9uIGlzVmVydGljYWwoZGlyZWN0aW9uKSB7XHJcbiAgICByZXR1cm4gKGRpcmVjdGlvbiA9PSBIYW1tZXIuRElSRUNUSU9OX1VQIHx8IGRpcmVjdGlvbiA9PSBIYW1tZXIuRElSRUNUSU9OX0RPV04pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzdG9wIGJyb3dzZXIgZGVmYXVsdCBiZWhhdmlvciB3aXRoIGNzcyBwcm9wc1xyXG4gICAqIEBwYXJhbSAgIHtIdG1sRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGNzc19wcm9wc1xyXG4gICAqL1xyXG4gIHN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yOiBmdW5jdGlvbiBzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcihlbGVtZW50LCBjc3NfcHJvcHMpIHtcclxuICAgIGlmKCFjc3NfcHJvcHMgfHwgIWVsZW1lbnQgfHwgIWVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHdpdGggY3NzIHByb3BlcnRpZXMgZm9yIG1vZGVybiBicm93c2Vyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goWyd3ZWJraXQnLCAna2h0bWwnLCAnbW96JywgJ01veicsICdtcycsICdvJywgJyddLCBmdW5jdGlvbih2ZW5kb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goY3NzX3Byb3BzLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xyXG4gICAgICAgICAgLy8gdmVuZGVyIHByZWZpeCBhdCB0aGUgcHJvcGVydHlcclxuICAgICAgICAgIGlmKHZlbmRvcikge1xyXG4gICAgICAgICAgICBwcm9wID0gdmVuZG9yICsgcHJvcC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gc2V0IHRoZSBzdHlsZVxyXG4gICAgICAgICAgaWYocHJvcCBpbiBlbGVtZW50LnN0eWxlKSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGVbcHJvcF0gPSB2YWx1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBhbHNvIHRoZSBkaXNhYmxlIG9uc2VsZWN0c3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyU2VsZWN0ID09ICdub25lJykge1xyXG4gICAgICBlbGVtZW50Lm9uc2VsZWN0c3RhcnQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYW5kIGRpc2FibGUgb25kcmFnc3RhcnRcclxuICAgIGlmKGNzc19wcm9wcy51c2VyRHJhZyA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbmRyYWdzdGFydCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogcmV2ZXJ0cyBhbGwgY2hhbmdlcyBtYWRlIGJ5ICdzdG9wRGVmYXVsdEJyb3dzZXJCZWhhdmlvcidcclxuICAgKiBAcGFyYW0gICB7SHRtbEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgICBjc3NfcHJvcHNcclxuICAgKi9cclxuICBzdGFydERlZmF1bHRCcm93c2VyQmVoYXZpb3I6IGZ1bmN0aW9uIHN0YXJ0RGVmYXVsdEJyb3dzZXJCZWhhdmlvcihlbGVtZW50LCBjc3NfcHJvcHMpIHtcclxuICAgIGlmKCFjc3NfcHJvcHMgfHwgIWVsZW1lbnQgfHwgIWVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHdpdGggY3NzIHByb3BlcnRpZXMgZm9yIG1vZGVybiBicm93c2Vyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goWyd3ZWJraXQnLCAna2h0bWwnLCAnbW96JywgJ01veicsICdtcycsICdvJywgJyddLCBmdW5jdGlvbih2ZW5kb3IpIHtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2goY3NzX3Byb3BzLCBmdW5jdGlvbih2YWx1ZSwgcHJvcCkge1xyXG4gICAgICAgICAgLy8gdmVuZGVyIHByZWZpeCBhdCB0aGUgcHJvcGVydHlcclxuICAgICAgICAgIGlmKHZlbmRvcikge1xyXG4gICAgICAgICAgICBwcm9wID0gdmVuZG9yICsgcHJvcC5zdWJzdHJpbmcoMCwgMSkudG9VcHBlckNhc2UoKSArIHByb3Auc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gcmVzZXQgdGhlIHN0eWxlXHJcbiAgICAgICAgICBpZihwcm9wIGluIGVsZW1lbnQuc3R5bGUpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5zdHlsZVtwcm9wXSA9ICcnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIGFsc28gdGhlIGVuYWJsZSBvbnNlbGVjdHN0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlclNlbGVjdCA9PSAnbm9uZScpIHtcclxuICAgICAgZWxlbWVudC5vbnNlbGVjdHN0YXJ0ID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhbmQgZW5hYmxlIG9uZHJhZ3N0YXJ0XHJcbiAgICBpZihjc3NfcHJvcHMudXNlckRyYWcgPT0gJ25vbmUnKSB7XHJcbiAgICAgIGVsZW1lbnQub25kcmFnc3RhcnQgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogY3JlYXRlIG5ldyBoYW1tZXIgaW5zdGFuY2VcclxuICogYWxsIG1ldGhvZHMgc2hvdWxkIHJldHVybiB0aGUgaW5zdGFuY2UgaXRzZWxmLCBzbyBpdCBpcyBjaGFpbmFibGUuXHJcbiAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICAgICAgZWxlbWVudFxyXG4gKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgIFtvcHRpb25zPXt9XVxyXG4gKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbkhhbW1lci5JbnN0YW5jZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIHNldHVwIEhhbW1lckpTIHdpbmRvdyBldmVudHMgYW5kIHJlZ2lzdGVyIGFsbCBnZXN0dXJlc1xyXG4gIC8vIHRoaXMgYWxzbyBzZXRzIHVwIHRoZSBkZWZhdWx0IG9wdGlvbnNcclxuICBzZXR1cCgpO1xyXG5cclxuICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xyXG5cclxuICAvLyBzdGFydC9zdG9wIGRldGVjdGlvbiBvcHRpb25cclxuICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xyXG5cclxuICAvLyBtZXJnZSBvcHRpb25zXHJcbiAgdGhpcy5vcHRpb25zID0gSGFtbWVyLnV0aWxzLmV4dGVuZChcclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoe30sIEhhbW1lci5kZWZhdWx0cyksXHJcbiAgICBvcHRpb25zIHx8IHt9KTtcclxuXHJcbiAgLy8gYWRkIHNvbWUgY3NzIHRvIHRoZSBlbGVtZW50IHRvIHByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSBkb2luZyBpdHMgbmF0aXZlIGJlaGF2b2lyXHJcbiAgaWYodGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcikge1xyXG4gICAgSGFtbWVyLnV0aWxzLnN0b3BEZWZhdWx0QnJvd3NlckJlaGF2aW9yKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcik7XHJcbiAgfVxyXG5cclxuICAvLyBzdGFydCBkZXRlY3Rpb24gb24gdG91Y2hzdGFydFxyXG4gIHRoaXMuX2V2ZW50U3RhcnRIYW5kbGVyID0gSGFtbWVyLmV2ZW50Lm9uVG91Y2goZWxlbWVudCwgSGFtbWVyLkVWRU5UX1NUQVJULCBmdW5jdGlvbihldikge1xyXG4gICAgaWYoc2VsZi5lbmFibGVkKSB7XHJcbiAgICAgIEhhbW1lci5kZXRlY3Rpb24uc3RhcnREZXRlY3Qoc2VsZiwgZXYpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvLyBrZWVwIGEgbGlzdCBvZiB1c2VyIGV2ZW50IGhhbmRsZXJzIHdoaWNoIG5lZWRzIHRvIGJlIHJlbW92ZWQgd2hlbiBjYWxsaW5nICdkaXNwb3NlJ1xyXG4gIHRoaXMuX2V2ZW50SGFuZGxlciA9IFtdO1xyXG5cclxuICAvLyByZXR1cm4gaW5zdGFuY2VcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblxyXG5IYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlID0ge1xyXG4gIC8qKlxyXG4gICAqIGJpbmQgZXZlbnRzIHRvIHRoZSBpbnN0YW5jZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgaGFuZGxlclxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgb246IGZ1bmN0aW9uIG9uRXZlbnQoZ2VzdHVyZSwgaGFuZGxlcikge1xyXG4gICAgdmFyIGdlc3R1cmVzID0gZ2VzdHVyZS5zcGxpdCgnICcpO1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goZ2VzdHVyZXMsIGZ1bmN0aW9uKGdlc3R1cmUpIHtcclxuICAgICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZ2VzdHVyZSwgaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgICB0aGlzLl9ldmVudEhhbmRsZXIucHVzaCh7IGdlc3R1cmU6IGdlc3R1cmUsIGhhbmRsZXI6IGhhbmRsZXIgfSk7XHJcbiAgICB9LCB0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB1bmJpbmQgZXZlbnRzIHRvIHRoZSBpbnN0YW5jZVxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgaGFuZGxlclxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgb2ZmOiBmdW5jdGlvbiBvZmZFdmVudChnZXN0dXJlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgZ2VzdHVyZXMgPSBnZXN0dXJlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaChnZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihnZXN0dXJlLCBoYW5kbGVyLCBmYWxzZSk7XHJcblxyXG4gICAgICAvLyByZW1vdmUgdGhlIGV2ZW50IGhhbmRsZXIgZnJvbSB0aGUgaW50ZXJuYWwgbGlzdFxyXG4gICAgICB2YXIgaW5kZXggPSAtMTtcclxuICAgICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5fZXZlbnRIYW5kbGVyLCBmdW5jdGlvbihldmVudEhhbmRsZXIsIGkpIHtcclxuICAgICAgICBpZiAoaW5kZXggPT09IC0xICYmIGV2ZW50SGFuZGxlci5nZXN0dXJlID09PSBnZXN0dXJlICYmIGV2ZW50SGFuZGxlci5oYW5kbGVyID09PSBoYW5kbGVyKSB7XHJcbiAgICAgICAgICBpbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XHJcbiAgICAgICAgdGhpcy5fZXZlbnRIYW5kbGVyLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH1cclxuICAgIH0sIHRoaXMpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRyaWdnZXIgZ2VzdHVyZSBldmVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgICAgW2V2ZW50RGF0YV1cclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIHRyaWdnZXI6IGZ1bmN0aW9uIHRyaWdnZXJFdmVudChnZXN0dXJlLCBldmVudERhdGEpIHtcclxuICAgIC8vIG9wdGlvbmFsXHJcbiAgICBpZighZXZlbnREYXRhKSB7XHJcbiAgICAgIGV2ZW50RGF0YSA9IHt9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNyZWF0ZSBET00gZXZlbnRcclxuICAgIHZhciBldmVudCA9IEhhbW1lci5ET0NVTUVOVC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcclxuICAgIGV2ZW50LmluaXRFdmVudChnZXN0dXJlLCB0cnVlLCB0cnVlKTtcclxuICAgIGV2ZW50Lmdlc3R1cmUgPSBldmVudERhdGE7XHJcblxyXG4gICAgLy8gdHJpZ2dlciBvbiB0aGUgdGFyZ2V0IGlmIGl0IGlzIGluIHRoZSBpbnN0YW5jZSBlbGVtZW50LFxyXG4gICAgLy8gdGhpcyBpcyBmb3IgZXZlbnQgZGVsZWdhdGlvbiB0cmlja3NcclxuICAgIHZhciBlbGVtZW50ID0gdGhpcy5lbGVtZW50O1xyXG4gICAgaWYoSGFtbWVyLnV0aWxzLmhhc1BhcmVudChldmVudERhdGEudGFyZ2V0LCBlbGVtZW50KSkge1xyXG4gICAgICBlbGVtZW50ID0gZXZlbnREYXRhLnRhcmdldDtcclxuICAgIH1cclxuXHJcbiAgICBlbGVtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGVuYWJsZSBvZiBkaXNhYmxlIGhhbW1lci5qcyBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7Qm9vbGVhbn0gICBzdGF0ZVxyXG4gICAqIEByZXR1cm5zIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICovXHJcbiAgZW5hYmxlOiBmdW5jdGlvbiBlbmFibGUoc3RhdGUpIHtcclxuICAgIHRoaXMuZW5hYmxlZCA9IHN0YXRlO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGRpc3Bvc2UgdGhpcyBoYW1tZXIgaW5zdGFuY2VcclxuICAgKiBAcmV0dXJucyB7SGFtbWVyLkluc3RhbmNlfVxyXG4gICAqL1xyXG4gIGRpc3Bvc2U6IGZ1bmN0aW9uIGRpc3Bvc2UoKSB7XHJcblxyXG4gICAgLy8gdW5kbyBhbGwgY2hhbmdlcyBtYWRlIGJ5IHN0b3BfYnJvd3Nlcl9iZWhhdmlvclxyXG4gICAgaWYodGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcikge1xyXG4gICAgICBIYW1tZXIudXRpbHMuc3RhcnREZWZhdWx0QnJvd3NlckJlaGF2aW9yKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLnN0b3BfYnJvd3Nlcl9iZWhhdmlvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gdW5iaW5kIGFsbCBjdXN0b20gZXZlbnQgaGFuZGxlcnNcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHRoaXMuX2V2ZW50SGFuZGxlciwgZnVuY3Rpb24oZXZlbnRIYW5kbGVyKSB7XHJcbiAgICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50SGFuZGxlci5nZXN0dXJlLCBldmVudEhhbmRsZXIuaGFuZGxlciwgZmFsc2UpO1xyXG4gICAgfSwgdGhpcyk7XHJcbiAgICB0aGlzLl9ldmVudEhhbmRsZXIubGVuZ3RoID0gMDtcclxuXHJcbiAgICAvLyB1bmJpbmQgdGhlIHN0YXJ0IGV2ZW50IGxpc3RlbmVyXHJcbiAgICBIYW1tZXIuZXZlbnQudW5iaW5kRG9tKHRoaXMuZWxlbWVudCwgSGFtbWVyLkVWRU5UX1RZUEVTW0hhbW1lci5FVkVOVF9TVEFSVF0sIHRoaXMuX2V2ZW50U3RhcnRIYW5kbGVyKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogdGhpcyBob2xkcyB0aGUgbGFzdCBtb3ZlIGV2ZW50LFxyXG4gKiB1c2VkIHRvIGZpeCBlbXB0eSB0b3VjaGVuZCBpc3N1ZVxyXG4gKiBzZWUgdGhlIG9uVG91Y2ggZXZlbnQgZm9yIGFuIGV4cGxhbmF0aW9uXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqL1xyXG52YXIgbGFzdF9tb3ZlX2V2ZW50ID0gbnVsbDtcclxuXHJcblxyXG4vKipcclxuICogd2hlbiB0aGUgbW91c2UgaXMgaG9sZCBkb3duLCB0aGlzIGlzIHRydWVcclxuICogQHR5cGUge0Jvb2xlYW59XHJcbiAqL1xyXG52YXIgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG5cclxuXHJcbi8qKlxyXG4gKiB3aGVuIHRvdWNoIGV2ZW50cyBoYXZlIGJlZW4gZmlyZWQsIHRoaXMgaXMgdHJ1ZVxyXG4gKiBAdHlwZSB7Qm9vbGVhbn1cclxuICovXHJcbnZhciB0b3VjaF90cmlnZ2VyZWQgPSBmYWxzZTtcclxuXHJcblxyXG5IYW1tZXIuZXZlbnQgPSB7XHJcbiAgLyoqXHJcbiAgICogc2ltcGxlIGFkZEV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICB0eXBlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBiaW5kRG9tOiBmdW5jdGlvbihlbGVtZW50LCB0eXBlLCBoYW5kbGVyKSB7XHJcbiAgICB2YXIgdHlwZXMgPSB0eXBlLnNwbGl0KCcgJyk7XHJcbiAgICBIYW1tZXIudXRpbHMuZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSl7XHJcbiAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBoYW5kbGVyLCBmYWxzZSk7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogc2ltcGxlIHJlbW92ZUV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICB0eXBlXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICB1bmJpbmREb206IGZ1bmN0aW9uKGVsZW1lbnQsIHR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciB0eXBlcyA9IHR5cGUuc3BsaXQoJyAnKTtcclxuICAgIEhhbW1lci51dGlscy5lYWNoKHR5cGVzLCBmdW5jdGlvbih0eXBlKXtcclxuICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZXIsIGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB0b3VjaCBldmVudHMgd2l0aCBtb3VzZSBmYWxsYmFja1xyXG4gICAqIEBwYXJhbSAgIHtIVE1MRWxlbWVudH0gICBlbGVtZW50XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIGV2ZW50VHlwZSAgICAgICAgbGlrZSBIYW1tZXIuRVZFTlRfTU9WRVxyXG4gICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gICAgICBoYW5kbGVyXHJcbiAgICovXHJcbiAgb25Ub3VjaDogZnVuY3Rpb24gb25Ub3VjaChlbGVtZW50LCBldmVudFR5cGUsIGhhbmRsZXIpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB2YXIgZm4gPSBmdW5jdGlvbiBiaW5kRG9tT25Ub3VjaChldikge1xyXG4gICAgICB2YXIgc291cmNlRXZlbnRUeXBlID0gZXYudHlwZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgLy8gb25tb3VzZXVwLCBidXQgd2hlbiB0b3VjaGVuZCBoYXMgYmVlbiBmaXJlZCB3ZSBkbyBub3RoaW5nLlxyXG4gICAgICAvLyB0aGlzIGlzIGZvciB0b3VjaGRldmljZXMgd2hpY2ggYWxzbyBmaXJlIGEgbW91c2V1cCBvbiB0b3VjaGVuZFxyXG4gICAgICBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgdG91Y2hfdHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBtb3VzZWJ1dHRvbiBtdXN0IGJlIGRvd24gb3IgYSB0b3VjaCBldmVudFxyXG4gICAgICBlbHNlIGlmKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvdG91Y2gvKSB8fCAgIC8vIHRvdWNoIGV2ZW50cyBhcmUgYWx3YXlzIG9uIHNjcmVlblxyXG4gICAgICAgIHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvcG9pbnRlcmRvd24vKSB8fCAvLyBwb2ludGVyZXZlbnRzIHRvdWNoXHJcbiAgICAgICAgKHNvdXJjZUV2ZW50VHlwZS5tYXRjaCgvbW91c2UvKSAmJiBldi53aGljaCA9PT0gMSkgICAvLyBtb3VzZSBpcyBwcmVzc2VkXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG1vdXNlIGlzbid0IHByZXNzZWRcclxuICAgICAgZWxzZSBpZihzb3VyY2VFdmVudFR5cGUubWF0Y2goL21vdXNlLykgJiYgIWV2LndoaWNoKSB7XHJcbiAgICAgICAgZW5hYmxlX2RldGVjdCA9IGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgLy8gd2UgYXJlIGluIGEgdG91Y2ggZXZlbnQsIHNldCB0aGUgdG91Y2ggdHJpZ2dlcmVkIGJvb2wgdG8gdHJ1ZSxcclxuICAgICAgLy8gdGhpcyBmb3IgdGhlIGNvbmZsaWN0cyB0aGF0IG1heSBvY2N1ciBvbiBpb3MgYW5kIGFuZHJvaWRcclxuICAgICAgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaHxwb2ludGVyLykpIHtcclxuICAgICAgICB0b3VjaF90cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjb3VudCB0aGUgdG90YWwgdG91Y2hlcyBvbiB0aGUgc2NyZWVuXHJcbiAgICAgIHZhciBjb3VudF90b3VjaGVzID0gMDtcclxuXHJcbiAgICAgIC8vIHdoZW4gdG91Y2ggaGFzIGJlZW4gdHJpZ2dlcmVkIGluIHRoaXMgZGV0ZWN0aW9uIHNlc3Npb25cclxuICAgICAgLy8gYW5kIHdlIGFyZSBub3cgaGFuZGxpbmcgYSBtb3VzZSBldmVudCwgd2Ugc3RvcCB0aGF0IHRvIHByZXZlbnQgY29uZmxpY3RzXHJcbiAgICAgIGlmKGVuYWJsZV9kZXRlY3QpIHtcclxuICAgICAgICAvLyB1cGRhdGUgcG9pbnRlcmV2ZW50XHJcbiAgICAgICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTICYmIGV2ZW50VHlwZSAhPSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC51cGRhdGVQb2ludGVyKGV2ZW50VHlwZSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0b3VjaFxyXG4gICAgICAgIGVsc2UgaWYoc291cmNlRXZlbnRUeXBlLm1hdGNoKC90b3VjaC8pKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gZXYudG91Y2hlcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG1vdXNlXHJcbiAgICAgICAgZWxzZSBpZighdG91Y2hfdHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gc291cmNlRXZlbnRUeXBlLm1hdGNoKC91cC8pID8gMCA6IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpZiB3ZSBhcmUgaW4gYSBlbmQgZXZlbnQsIGJ1dCB3aGVuIHdlIHJlbW92ZSBvbmUgdG91Y2ggYW5kXHJcbiAgICAgICAgLy8gd2Ugc3RpbGwgaGF2ZSBlbm91Z2gsIHNldCBldmVudFR5cGUgdG8gbW92ZVxyXG4gICAgICAgIGlmKGNvdW50X3RvdWNoZXMgPiAwICYmIGV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBldmVudFR5cGUgPSBIYW1tZXIuRVZFTlRfTU9WRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gbm8gdG91Y2hlcywgZm9yY2UgdGhlIGVuZCBldmVudFxyXG4gICAgICAgIGVsc2UgaWYoIWNvdW50X3RvdWNoZXMpIHtcclxuICAgICAgICAgIGV2ZW50VHlwZSA9IEhhbW1lci5FVkVOVF9FTkQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzdG9yZSB0aGUgbGFzdCBtb3ZlIGV2ZW50XHJcbiAgICAgICAgaWYoY291bnRfdG91Y2hlcyB8fCBsYXN0X21vdmVfZXZlbnQgPT09IG51bGwpIHtcclxuICAgICAgICAgIGxhc3RfbW92ZV9ldmVudCA9IGV2O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciB0aGUgaGFuZGxlclxyXG4gICAgICAgIGhhbmRsZXIuY2FsbChIYW1tZXIuZGV0ZWN0aW9uLCBzZWxmLmNvbGxlY3RFdmVudERhdGEoZWxlbWVudCwgZXZlbnRUeXBlLCBzZWxmLmdldFRvdWNoTGlzdChsYXN0X21vdmVfZXZlbnQsIGV2ZW50VHlwZSksIGV2KSk7XHJcblxyXG4gICAgICAgIC8vIHJlbW92ZSBwb2ludGVyZXZlbnQgZnJvbSBsaXN0XHJcbiAgICAgICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTICYmIGV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgICAgICBjb3VudF90b3VjaGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC51cGRhdGVQb2ludGVyKGV2ZW50VHlwZSwgZXYpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gb24gdGhlIGVuZCB3ZSByZXNldCBldmVyeXRoaW5nXHJcbiAgICAgIGlmKCFjb3VudF90b3VjaGVzKSB7XHJcbiAgICAgICAgbGFzdF9tb3ZlX2V2ZW50ID0gbnVsbDtcclxuICAgICAgICBlbmFibGVfZGV0ZWN0ID0gZmFsc2U7XHJcbiAgICAgICAgdG91Y2hfdHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgSGFtbWVyLlBvaW50ZXJFdmVudC5yZXNldCgpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYmluZERvbShlbGVtZW50LCBIYW1tZXIuRVZFTlRfVFlQRVNbZXZlbnRUeXBlXSwgZm4pO1xyXG5cclxuICAgIC8vIHJldHVybiB0aGUgYm91bmQgZnVuY3Rpb24gdG8gYmUgYWJsZSB0byB1bmJpbmQgaXQgbGF0ZXJcclxuICAgIHJldHVybiBmbjtcclxuICAgIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiB3ZSBoYXZlIGRpZmZlcmVudCBldmVudHMgZm9yIGVhY2ggZGV2aWNlL2Jyb3dzZXJcclxuICAgKiBkZXRlcm1pbmUgd2hhdCB3ZSBuZWVkIGFuZCBzZXQgdGhlbSBpbiB0aGUgSGFtbWVyLkVWRU5UX1RZUEVTIGNvbnN0YW50XHJcbiAgICovXHJcbiAgZGV0ZXJtaW5lRXZlbnRUeXBlczogZnVuY3Rpb24gZGV0ZXJtaW5lRXZlbnRUeXBlcygpIHtcclxuICAgIC8vIGRldGVybWluZSB0aGUgZXZlbnR0eXBlIHdlIHdhbnQgdG8gc2V0XHJcbiAgICB2YXIgdHlwZXM7XHJcblxyXG4gICAgLy8gcG9pbnRlckV2ZW50cyBtYWdpY1xyXG4gICAgaWYoSGFtbWVyLkhBU19QT0lOVEVSRVZFTlRTKSB7XHJcbiAgICAgIHR5cGVzID0gSGFtbWVyLlBvaW50ZXJFdmVudC5nZXRFdmVudHMoKTtcclxuICAgIH1cclxuICAgIC8vIG9uIEFuZHJvaWQsIGlPUywgYmxhY2tiZXJyeSwgd2luZG93cyBtb2JpbGUgd2UgZG9udCB3YW50IGFueSBtb3VzZWV2ZW50c1xyXG4gICAgZWxzZSBpZihIYW1tZXIuTk9fTU9VU0VFVkVOVFMpIHtcclxuICAgICAgdHlwZXMgPSBbXHJcbiAgICAgICAgJ3RvdWNoc3RhcnQnLFxyXG4gICAgICAgICd0b3VjaG1vdmUnLFxyXG4gICAgICAgICd0b3VjaGVuZCB0b3VjaGNhbmNlbCddO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yIG5vbiBwb2ludGVyIGV2ZW50cyBicm93c2VycyBhbmQgbWl4ZWQgYnJvd3NlcnMsXHJcbiAgICAvLyBsaWtlIGNocm9tZSBvbiB3aW5kb3dzOCB0b3VjaCBsYXB0b3BcclxuICAgIGVsc2Uge1xyXG4gICAgICB0eXBlcyA9IFtcclxuICAgICAgICAndG91Y2hzdGFydCBtb3VzZWRvd24nLFxyXG4gICAgICAgICd0b3VjaG1vdmUgbW91c2Vtb3ZlJyxcclxuICAgICAgICAndG91Y2hlbmQgdG91Y2hjYW5jZWwgbW91c2V1cCddO1xyXG4gICAgfVxyXG5cclxuICAgIEhhbW1lci5FVkVOVF9UWVBFU1tIYW1tZXIuRVZFTlRfU1RBUlRdID0gdHlwZXNbMF07XHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX01PVkVdID0gdHlwZXNbMV07XHJcbiAgICBIYW1tZXIuRVZFTlRfVFlQRVNbSGFtbWVyLkVWRU5UX0VORF0gPSB0eXBlc1syXTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogY3JlYXRlIHRvdWNobGlzdCBkZXBlbmRpbmcgb24gdGhlIGV2ZW50XHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgZXZcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICBldmVudFR5cGUgICB1c2VkIGJ5IHRoZSBmYWtlbXVsdGl0b3VjaCBwbHVnaW5cclxuICAgKi9cclxuICBnZXRUb3VjaExpc3Q6IGZ1bmN0aW9uIGdldFRvdWNoTGlzdChldi8qLCBldmVudFR5cGUqLykge1xyXG4gICAgLy8gZ2V0IHRoZSBmYWtlIHBvaW50ZXJFdmVudCB0b3VjaGxpc3RcclxuICAgIGlmKEhhbW1lci5IQVNfUE9JTlRFUkVWRU5UUykge1xyXG4gICAgICByZXR1cm4gSGFtbWVyLlBvaW50ZXJFdmVudC5nZXRUb3VjaExpc3QoKTtcclxuICAgIH1cclxuICAgIC8vIGdldCB0aGUgdG91Y2hsaXN0XHJcbiAgICBlbHNlIGlmKGV2LnRvdWNoZXMpIHtcclxuICAgICAgcmV0dXJuIGV2LnRvdWNoZXM7XHJcbiAgICB9XHJcbiAgICAvLyBtYWtlIGZha2UgdG91Y2hsaXN0IGZyb20gbW91c2UgcG9zaXRpb25cclxuICAgIGVsc2Uge1xyXG4gICAgICBldi5pZGVudGlmaWVyID0gMTtcclxuICAgICAgcmV0dXJuIFtldl07XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNvbGxlY3QgZXZlbnQgZGF0YSBmb3IgSGFtbWVyIGpzXHJcbiAgICogQHBhcmFtICAge0hUTUxFbGVtZW50fSAgIGVsZW1lbnRcclxuICAgKiBAcGFyYW0gICB7U3RyaW5nfSAgICAgICAgZXZlbnRUeXBlICAgICAgICBsaWtlIEhhbW1lci5FVkVOVF9NT1ZFXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIGNvbGxlY3RFdmVudERhdGE6IGZ1bmN0aW9uIGNvbGxlY3RFdmVudERhdGEoZWxlbWVudCwgZXZlbnRUeXBlLCB0b3VjaGVzLCBldikge1xyXG4gICAgLy8gZmluZCBvdXQgcG9pbnRlclR5cGVcclxuICAgIHZhciBwb2ludGVyVHlwZSA9IEhhbW1lci5QT0lOVEVSX1RPVUNIO1xyXG4gICAgaWYoZXYudHlwZS5tYXRjaCgvbW91c2UvKSB8fCBIYW1tZXIuUG9pbnRlckV2ZW50Lm1hdGNoVHlwZShIYW1tZXIuUE9JTlRFUl9NT1VTRSwgZXYpKSB7XHJcbiAgICAgIHBvaW50ZXJUeXBlID0gSGFtbWVyLlBPSU5URVJfTU9VU0U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY2VudGVyICAgICA6IEhhbW1lci51dGlscy5nZXRDZW50ZXIodG91Y2hlcyksXHJcbiAgICAgIHRpbWVTdGFtcCAgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuICAgICAgdGFyZ2V0ICAgICA6IGV2LnRhcmdldCxcclxuICAgICAgdG91Y2hlcyAgICA6IHRvdWNoZXMsXHJcbiAgICAgIGV2ZW50VHlwZSAgOiBldmVudFR5cGUsXHJcbiAgICAgIHBvaW50ZXJUeXBlOiBwb2ludGVyVHlwZSxcclxuICAgICAgc3JjRXZlbnQgICA6IGV2LFxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHByZXZlbnQgdGhlIGJyb3dzZXIgZGVmYXVsdCBhY3Rpb25zXHJcbiAgICAgICAqIG1vc3RseSB1c2VkIHRvIGRpc2FibGUgc2Nyb2xsaW5nIG9mIHRoZSBicm93c2VyXHJcbiAgICAgICAqL1xyXG4gICAgICBwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgaWYodGhpcy5zcmNFdmVudC5wcmV2ZW50TWFuaXB1bGF0aW9uKSB7XHJcbiAgICAgICAgICB0aGlzLnNyY0V2ZW50LnByZXZlbnRNYW5pcHVsYXRpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKHRoaXMuc3JjRXZlbnQucHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICAgIHRoaXMuc3JjRXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogc3RvcCBidWJibGluZyB0aGUgZXZlbnQgdXAgdG8gaXRzIHBhcmVudHNcclxuICAgICAgICovXHJcbiAgICAgIHN0b3BQcm9wYWdhdGlvbjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5zcmNFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBpbW1lZGlhdGVseSBzdG9wIGdlc3R1cmUgZGV0ZWN0aW9uXHJcbiAgICAgICAqIG1pZ2h0IGJlIHVzZWZ1bCBhZnRlciBhIHN3aXBlIHdhcyBkZXRlY3RlZFxyXG4gICAgICAgKiBAcmV0dXJuIHsqfVxyXG4gICAgICAgKi9cclxuICAgICAgc3RvcERldGVjdDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIEhhbW1lci5kZXRlY3Rpb24uc3RvcERldGVjdCgpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbkhhbW1lci5Qb2ludGVyRXZlbnQgPSB7XHJcbiAgLyoqXHJcbiAgICogaG9sZHMgYWxsIHBvaW50ZXJzXHJcbiAgICogQHR5cGUge09iamVjdH1cclxuICAgKi9cclxuICBwb2ludGVyczoge30sXHJcblxyXG4gIC8qKlxyXG4gICAqIGdldCBhIGxpc3Qgb2YgcG9pbnRlcnNcclxuICAgKiBAcmV0dXJucyB7QXJyYXl9ICAgICB0b3VjaGxpc3RcclxuICAgKi9cclxuICBnZXRUb3VjaExpc3Q6IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIHRvdWNobGlzdCA9IFtdO1xyXG5cclxuICAgIC8vIHdlIGNhbiB1c2UgZm9yRWFjaCBzaW5jZSBwb2ludGVyRXZlbnRzIG9ubHkgaXMgaW4gSUUxMFxyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2goc2VsZi5wb2ludGVycywgZnVuY3Rpb24ocG9pbnRlcil7XHJcbiAgICAgIHRvdWNobGlzdC5wdXNoKHBvaW50ZXIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRvdWNobGlzdDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiB1cGRhdGUgdGhlIHBvc2l0aW9uIG9mIGEgcG9pbnRlclxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgdHlwZSAgICAgICAgICAgICBIYW1tZXIuRVZFTlRfRU5EXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICBwb2ludGVyRXZlbnRcclxuICAgKi9cclxuICB1cGRhdGVQb2ludGVyOiBmdW5jdGlvbih0eXBlLCBwb2ludGVyRXZlbnQpIHtcclxuICAgIGlmKHR5cGUgPT0gSGFtbWVyLkVWRU5UX0VORCkge1xyXG4gICAgICBkZWxldGUgdGhpcy5wb2ludGVyc1twb2ludGVyRXZlbnQucG9pbnRlcklkXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBwb2ludGVyRXZlbnQuaWRlbnRpZmllciA9IHBvaW50ZXJFdmVudC5wb2ludGVySWQ7XHJcbiAgICAgIHRoaXMucG9pbnRlcnNbcG9pbnRlckV2ZW50LnBvaW50ZXJJZF0gPSBwb2ludGVyRXZlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMucG9pbnRlcnMpLmxlbmd0aDtcclxuICB9LFxyXG5cclxuICAvKipcclxuICAgKiBjaGVjayBpZiBldiBtYXRjaGVzIHBvaW50ZXJ0eXBlXHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgICAgIHBvaW50ZXJUeXBlICAgICBIYW1tZXIuUE9JTlRFUl9NT1VTRVxyXG4gICAqIEBwYXJhbSAgIHtQb2ludGVyRXZlbnR9ICBldlxyXG4gICAqL1xyXG4gIG1hdGNoVHlwZTogZnVuY3Rpb24ocG9pbnRlclR5cGUsIGV2KSB7XHJcbiAgICBpZighZXYucG9pbnRlclR5cGUpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwdCA9IGV2LnBvaW50ZXJUeXBlLFxyXG4gICAgICB0eXBlcyA9IHt9O1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfTU9VU0VdID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9NT1VTRSB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfTU9VU0UpO1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfVE9VQ0hdID0gKHB0ID09PSBldi5NU1BPSU5URVJfVFlQRV9UT1VDSCB8fCBwdCA9PT0gSGFtbWVyLlBPSU5URVJfVE9VQ0gpO1xyXG4gICAgdHlwZXNbSGFtbWVyLlBPSU5URVJfUEVOXSA9IChwdCA9PT0gZXYuTVNQT0lOVEVSX1RZUEVfUEVOIHx8IHB0ID09PSBIYW1tZXIuUE9JTlRFUl9QRU4pO1xyXG4gICAgcmV0dXJuIHR5cGVzW3BvaW50ZXJUeXBlXTtcclxuICB9LFxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogZ2V0IGV2ZW50c1xyXG4gICAqL1xyXG4gIGdldEV2ZW50czogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAncG9pbnRlcmRvd24gTVNQb2ludGVyRG93bicsXHJcbiAgICAgICdwb2ludGVybW92ZSBNU1BvaW50ZXJNb3ZlJyxcclxuICAgICAgJ3BvaW50ZXJ1cCBwb2ludGVyY2FuY2VsIE1TUG9pbnRlclVwIE1TUG9pbnRlckNhbmNlbCdcclxuICAgIF07XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogcmVzZXQgdGhlIGxpc3RcclxuICAgKi9cclxuICByZXNldDogZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnBvaW50ZXJzID0ge307XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbkhhbW1lci5kZXRlY3Rpb24gPSB7XHJcbiAgLy8gY29udGFpbnMgYWxsIHJlZ2lzdHJlZCBIYW1tZXIuZ2VzdHVyZXMgaW4gdGhlIGNvcnJlY3Qgb3JkZXJcclxuICBnZXN0dXJlczogW10sXHJcblxyXG4gIC8vIGRhdGEgb2YgdGhlIGN1cnJlbnQgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uIHNlc3Npb25cclxuICBjdXJyZW50IDogbnVsbCxcclxuXHJcbiAgLy8gdGhlIHByZXZpb3VzIEhhbW1lci5nZXN0dXJlIHNlc3Npb24gZGF0YVxyXG4gIC8vIGlzIGEgZnVsbCBjbG9uZSBvZiB0aGUgcHJldmlvdXMgZ2VzdHVyZS5jdXJyZW50IG9iamVjdFxyXG4gIHByZXZpb3VzOiBudWxsLFxyXG5cclxuICAvLyB3aGVuIHRoaXMgYmVjb21lcyB0cnVlLCBubyBnZXN0dXJlcyBhcmUgZmlyZWRcclxuICBzdG9wcGVkIDogZmFsc2UsXHJcblxyXG5cclxuICAvKipcclxuICAgKiBzdGFydCBIYW1tZXIuZ2VzdHVyZSBkZXRlY3Rpb25cclxuICAgKiBAcGFyYW0gICB7SGFtbWVyLkluc3RhbmNlfSAgIGluc3RcclxuICAgKiBAcGFyYW0gICB7T2JqZWN0fSAgICAgICAgICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIHN0YXJ0RGV0ZWN0OiBmdW5jdGlvbiBzdGFydERldGVjdChpbnN0LCBldmVudERhdGEpIHtcclxuICAgIC8vIGFscmVhZHkgYnVzeSB3aXRoIGEgSGFtbWVyLmdlc3R1cmUgZGV0ZWN0aW9uIG9uIGFuIGVsZW1lbnRcclxuICAgIGlmKHRoaXMuY3VycmVudCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zdG9wcGVkID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5jdXJyZW50ID0ge1xyXG4gICAgICBpbnN0ICAgICAgOiBpbnN0LCAvLyByZWZlcmVuY2UgdG8gSGFtbWVySW5zdGFuY2Ugd2UncmUgd29ya2luZyBmb3JcclxuICAgICAgc3RhcnRFdmVudDogSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgZXZlbnREYXRhKSwgLy8gc3RhcnQgZXZlbnREYXRhIGZvciBkaXN0YW5jZXMsIHRpbWluZyBldGNcclxuICAgICAgbGFzdEV2ZW50IDogZmFsc2UsIC8vIGxhc3QgZXZlbnREYXRhXHJcbiAgICAgIGxhc3RWRXZlbnQ6IGZhbHNlLCAvLyBsYXN0IGV2ZW50RGF0YSBmb3IgdmVsb2NpdHkuXHJcbiAgICAgIHZlbG9jaXR5ICA6IGZhbHNlLCAvLyBjdXJyZW50IHZlbG9jaXR5XHJcbiAgICAgIG5hbWUgICAgICA6ICcnIC8vIGN1cnJlbnQgZ2VzdHVyZSB3ZSdyZSBpbi9kZXRlY3RlZCwgY2FuIGJlICd0YXAnLCAnaG9sZCcgZXRjXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZGV0ZWN0KGV2ZW50RGF0YSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbW1lci5nZXN0dXJlIGRldGVjdGlvblxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2ZW50RGF0YVxyXG4gICAqL1xyXG4gIGRldGVjdDogZnVuY3Rpb24gZGV0ZWN0KGV2ZW50RGF0YSkge1xyXG4gICAgaWYoIXRoaXMuY3VycmVudCB8fCB0aGlzLnN0b3BwZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4dGVuZCBldmVudCBkYXRhIHdpdGggY2FsY3VsYXRpb25zIGFib3V0IHNjYWxlLCBkaXN0YW5jZSBldGNcclxuICAgIGV2ZW50RGF0YSA9IHRoaXMuZXh0ZW5kRXZlbnREYXRhKGV2ZW50RGF0YSk7XHJcblxyXG4gICAgLy8gaW5zdGFuY2Ugb3B0aW9uc1xyXG4gICAgdmFyIGluc3Rfb3B0aW9ucyA9IHRoaXMuY3VycmVudC5pbnN0Lm9wdGlvbnM7XHJcblxyXG4gICAgLy8gY2FsbCBIYW1tZXIuZ2VzdHVyZSBoYW5kbGVyc1xyXG4gICAgSGFtbWVyLnV0aWxzLmVhY2godGhpcy5nZXN0dXJlcywgZnVuY3Rpb24oZ2VzdHVyZSkge1xyXG4gICAgICAvLyBvbmx5IHdoZW4gdGhlIGluc3RhbmNlIG9wdGlvbnMgaGF2ZSBlbmFibGVkIHRoaXMgZ2VzdHVyZVxyXG4gICAgICBpZighdGhpcy5zdG9wcGVkICYmIGluc3Rfb3B0aW9uc1tnZXN0dXJlLm5hbWVdICE9PSBmYWxzZSkge1xyXG4gICAgICAgIC8vIGlmIGEgaGFuZGxlciByZXR1cm5zIGZhbHNlLCB3ZSBzdG9wIHdpdGggdGhlIGRldGVjdGlvblxyXG4gICAgICAgIGlmKGdlc3R1cmUuaGFuZGxlci5jYWxsKGdlc3R1cmUsIGV2ZW50RGF0YSwgdGhpcy5jdXJyZW50Lmluc3QpID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgdGhpcy5zdG9wRGV0ZWN0KCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LCB0aGlzKTtcclxuXHJcbiAgICAvLyBzdG9yZSBhcyBwcmV2aW91cyBldmVudCBldmVudFxyXG4gICAgaWYodGhpcy5jdXJyZW50KSB7XHJcbiAgICAgIHRoaXMuY3VycmVudC5sYXN0RXZlbnQgPSBldmVudERhdGE7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZW5kZXZlbnQsIGJ1dCBub3QgdGhlIGxhc3QgdG91Y2gsIHNvIGRvbnQgc3RvcFxyXG4gICAgaWYoZXZlbnREYXRhLmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EICYmICFldmVudERhdGEudG91Y2hlcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgIHRoaXMuc3RvcERldGVjdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBldmVudERhdGE7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGNsZWFyIHRoZSBIYW1tZXIuZ2VzdHVyZSB2YXJzXHJcbiAgICogdGhpcyBpcyBjYWxsZWQgb24gZW5kRGV0ZWN0LCBidXQgY2FuIGFsc28gYmUgdXNlZCB3aGVuIGEgZmluYWwgSGFtbWVyLmdlc3R1cmUgaGFzIGJlZW4gZGV0ZWN0ZWRcclxuICAgKiB0byBzdG9wIG90aGVyIEhhbW1lci5nZXN0dXJlcyBmcm9tIGJlaW5nIGZpcmVkXHJcbiAgICovXHJcbiAgc3RvcERldGVjdDogZnVuY3Rpb24gc3RvcERldGVjdCgpIHtcclxuICAgIC8vIGNsb25lIGN1cnJlbnQgZGF0YSB0byB0aGUgc3RvcmUgYXMgdGhlIHByZXZpb3VzIGdlc3R1cmVcclxuICAgIC8vIHVzZWQgZm9yIHRoZSBkb3VibGUgdGFwIGdlc3R1cmUsIHNpbmNlIHRoaXMgaXMgYW4gb3RoZXIgZ2VzdHVyZSBkZXRlY3Qgc2Vzc2lvblxyXG4gICAgdGhpcy5wcmV2aW91cyA9IEhhbW1lci51dGlscy5leHRlbmQoe30sIHRoaXMuY3VycmVudCk7XHJcblxyXG4gICAgLy8gcmVzZXQgdGhlIGN1cnJlbnRcclxuICAgIHRoaXMuY3VycmVudCA9IG51bGw7XHJcblxyXG4gICAgLy8gc3RvcHBlZCFcclxuICAgIHRoaXMuc3RvcHBlZCA9IHRydWU7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGV4dGVuZCBldmVudERhdGEgZm9yIEhhbW1lci5nZXN0dXJlc1xyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgZXZcclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAgIGV2XHJcbiAgICovXHJcbiAgZXh0ZW5kRXZlbnREYXRhOiBmdW5jdGlvbiBleHRlbmRFdmVudERhdGEoZXYpIHtcclxuICAgIHZhciBzdGFydEV2ID0gdGhpcy5jdXJyZW50LnN0YXJ0RXZlbnQsXHJcbiAgICAgICAgbGFzdFZFdiA9IHRoaXMuY3VycmVudC5sYXN0VkV2ZW50O1xyXG5cclxuICAgIC8vIGlmIHRoZSB0b3VjaGVzIGNoYW5nZSwgc2V0IHRoZSBuZXcgdG91Y2hlcyBvdmVyIHRoZSBzdGFydEV2ZW50IHRvdWNoZXNcclxuICAgIC8vIHRoaXMgYmVjYXVzZSB0b3VjaGV2ZW50cyBkb24ndCBoYXZlIGFsbCB0aGUgdG91Y2hlcyBvbiB0b3VjaHN0YXJ0LCBvciB0aGVcclxuICAgIC8vIHVzZXIgbXVzdCBwbGFjZSBoaXMgZmluZ2VycyBhdCB0aGUgRVhBQ1Qgc2FtZSB0aW1lIG9uIHRoZSBzY3JlZW4sIHdoaWNoIGlzIG5vdCByZWFsaXN0aWNcclxuICAgIC8vIGJ1dCwgc29tZXRpbWVzIGl0IGhhcHBlbnMgdGhhdCBib3RoIGZpbmdlcnMgYXJlIHRvdWNoaW5nIGF0IHRoZSBFWEFDVCBzYW1lIHRpbWVcclxuICAgIGlmKHN0YXJ0RXYgJiYgKGV2LnRvdWNoZXMubGVuZ3RoICE9IHN0YXJ0RXYudG91Y2hlcy5sZW5ndGggfHwgZXYudG91Y2hlcyA9PT0gc3RhcnRFdi50b3VjaGVzKSkge1xyXG4gICAgICAvLyBleHRlbmQgMSBsZXZlbCBkZWVwIHRvIGdldCB0aGUgdG91Y2hsaXN0IHdpdGggdGhlIHRvdWNoIG9iamVjdHNcclxuICAgICAgc3RhcnRFdi50b3VjaGVzID0gW107XHJcbiAgICAgIEhhbW1lci51dGlscy5lYWNoKGV2LnRvdWNoZXMsIGZ1bmN0aW9uKHRvdWNoKSB7XHJcbiAgICAgICAgc3RhcnRFdi50b3VjaGVzLnB1c2goSGFtbWVyLnV0aWxzLmV4dGVuZCh7fSwgdG91Y2gpKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGRlbHRhX3RpbWUgPSBldi50aW1lU3RhbXAgLSBzdGFydEV2LnRpbWVTdGFtcFxyXG4gICAgICAsIGRlbHRhX3ggPSBldi5jZW50ZXIucGFnZVggLSBzdGFydEV2LmNlbnRlci5wYWdlWFxyXG4gICAgICAsIGRlbHRhX3kgPSBldi5jZW50ZXIucGFnZVkgLSBzdGFydEV2LmNlbnRlci5wYWdlWVxyXG4gICAgICAsIGludGVyaW1BbmdsZVxyXG4gICAgICAsIGludGVyaW1EaXJlY3Rpb25cclxuICAgICAgLCB2ZWxvY2l0eSA9IHRoaXMuY3VycmVudC52ZWxvY2l0eTtcclxuXHJcbiAgICBpZiAobGFzdFZFdiAhPT0gZmFsc2UgJiYgZXYudGltZVN0YW1wIC0gbGFzdFZFdi50aW1lU3RhbXAgPiBIYW1tZXIuVVBEQVRFX1ZFTE9DSVRZX0lOVEVSVkFMKSB7XHJcblxyXG4gICAgICAgIHZlbG9jaXR5ID0gIEhhbW1lci51dGlscy5nZXRWZWxvY2l0eShldi50aW1lU3RhbXAgLSBsYXN0VkV2LnRpbWVTdGFtcCwgZXYuY2VudGVyLnBhZ2VYIC0gbGFzdFZFdi5jZW50ZXIucGFnZVgsIGV2LmNlbnRlci5wYWdlWSAtIGxhc3RWRXYuY2VudGVyLnBhZ2VZKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQubGFzdFZFdmVudCA9IGV2O1xyXG5cclxuICAgICAgICBpZiAodmVsb2NpdHkueCA+IDAgJiYgdmVsb2NpdHkueSA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50LnZlbG9jaXR5ID0gdmVsb2NpdHk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZih0aGlzLmN1cnJlbnQudmVsb2NpdHkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgdmVsb2NpdHkgPSBIYW1tZXIudXRpbHMuZ2V0VmVsb2NpdHkoZGVsdGFfdGltZSwgZGVsdGFfeCwgZGVsdGFfeSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50LnZlbG9jaXR5ID0gdmVsb2NpdHk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50Lmxhc3RWRXZlbnQgPSBldjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBlbmQgZXZlbnRzIChlLmcuIGRyYWdlbmQpIGRvbid0IGhhdmUgdXNlZnVsIHZhbHVlcyBmb3IgaW50ZXJpbURpcmVjdGlvbiAmIGludGVyaW1BbmdsZVxyXG4gICAgLy8gYmVjYXVzZSB0aGUgcHJldmlvdXMgZXZlbnQgaGFzIGV4YWN0bHkgdGhlIHNhbWUgY29vcmRpbmF0ZXNcclxuICAgIC8vIHNvIGZvciBlbmQgZXZlbnRzLCB0YWtlIHRoZSBwcmV2aW91cyB2YWx1ZXMgb2YgaW50ZXJpbURpcmVjdGlvbiAmIGludGVyaW1BbmdsZVxyXG4gICAgLy8gaW5zdGVhZCBvZiByZWNhbGN1bGF0aW5nIHRoZW0gYW5kIGdldHRpbmcgYSBzcHVyaW91cyAnMCdcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PT0gJ2VuZCcpIHtcclxuICAgICAgaW50ZXJpbUFuZ2xlID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiB0aGlzLmN1cnJlbnQubGFzdEV2ZW50LmludGVyaW1BbmdsZTtcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbiA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgdGhpcy5jdXJyZW50Lmxhc3RFdmVudC5pbnRlcmltRGlyZWN0aW9uO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGludGVyaW1BbmdsZSA9IHRoaXMuY3VycmVudC5sYXN0RXZlbnQgJiYgSGFtbWVyLnV0aWxzLmdldEFuZ2xlKHRoaXMuY3VycmVudC5sYXN0RXZlbnQuY2VudGVyLCBldi5jZW50ZXIpO1xyXG4gICAgICBpbnRlcmltRGlyZWN0aW9uID0gdGhpcy5jdXJyZW50Lmxhc3RFdmVudCAmJiBIYW1tZXIudXRpbHMuZ2V0RGlyZWN0aW9uKHRoaXMuY3VycmVudC5sYXN0RXZlbnQuY2VudGVyLCBldi5jZW50ZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIEhhbW1lci51dGlscy5leHRlbmQoZXYsIHtcclxuICAgICAgZGVsdGFUaW1lOiBkZWx0YV90aW1lLFxyXG5cclxuICAgICAgZGVsdGFYOiBkZWx0YV94LFxyXG4gICAgICBkZWx0YVk6IGRlbHRhX3ksXHJcblxyXG4gICAgICB2ZWxvY2l0eVg6IHZlbG9jaXR5LngsXHJcbiAgICAgIHZlbG9jaXR5WTogdmVsb2NpdHkueSxcclxuXHJcbiAgICAgIGRpc3RhbmNlOiBIYW1tZXIudXRpbHMuZ2V0RGlzdGFuY2Uoc3RhcnRFdi5jZW50ZXIsIGV2LmNlbnRlciksXHJcblxyXG4gICAgICBhbmdsZTogSGFtbWVyLnV0aWxzLmdldEFuZ2xlKHN0YXJ0RXYuY2VudGVyLCBldi5jZW50ZXIpLFxyXG4gICAgICBpbnRlcmltQW5nbGU6IGludGVyaW1BbmdsZSxcclxuXHJcbiAgICAgIGRpcmVjdGlvbjogSGFtbWVyLnV0aWxzLmdldERpcmVjdGlvbihzdGFydEV2LmNlbnRlciwgZXYuY2VudGVyKSxcclxuICAgICAgaW50ZXJpbURpcmVjdGlvbjogaW50ZXJpbURpcmVjdGlvbixcclxuXHJcbiAgICAgIHNjYWxlOiBIYW1tZXIudXRpbHMuZ2V0U2NhbGUoc3RhcnRFdi50b3VjaGVzLCBldi50b3VjaGVzKSxcclxuICAgICAgcm90YXRpb246IEhhbW1lci51dGlscy5nZXRSb3RhdGlvbihzdGFydEV2LnRvdWNoZXMsIGV2LnRvdWNoZXMpLFxyXG5cclxuICAgICAgc3RhcnRFdmVudDogc3RhcnRFdlxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGV2O1xyXG4gIH0sXHJcblxyXG5cclxuICAvKipcclxuICAgKiByZWdpc3RlciBuZXcgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGdlc3R1cmUgb2JqZWN0LCBzZWUgZ2VzdHVyZXMuanMgZm9yIGRvY3VtZW50YXRpb25cclxuICAgKiBAcmV0dXJucyB7QXJyYXl9ICAgICBnZXN0dXJlc1xyXG4gICAqL1xyXG4gIHJlZ2lzdGVyOiBmdW5jdGlvbiByZWdpc3RlcihnZXN0dXJlKSB7XHJcbiAgICAvLyBhZGQgYW4gZW5hYmxlIGdlc3R1cmUgb3B0aW9ucyBpZiB0aGVyZSBpcyBubyBnaXZlblxyXG4gICAgdmFyIG9wdGlvbnMgPSBnZXN0dXJlLmRlZmF1bHRzIHx8IHt9O1xyXG4gICAgaWYob3B0aW9uc1tnZXN0dXJlLm5hbWVdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgb3B0aW9uc1tnZXN0dXJlLm5hbWVdID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHRlbmQgSGFtbWVyIGRlZmF1bHQgb3B0aW9ucyB3aXRoIHRoZSBIYW1tZXIuZ2VzdHVyZSBvcHRpb25zXHJcbiAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKEhhbW1lci5kZWZhdWx0cywgb3B0aW9ucywgdHJ1ZSk7XHJcblxyXG4gICAgLy8gc2V0IGl0cyBpbmRleFxyXG4gICAgZ2VzdHVyZS5pbmRleCA9IGdlc3R1cmUuaW5kZXggfHwgMTAwMDtcclxuXHJcbiAgICAvLyBhZGQgSGFtbWVyLmdlc3R1cmUgdG8gdGhlIGxpc3RcclxuICAgIHRoaXMuZ2VzdHVyZXMucHVzaChnZXN0dXJlKTtcclxuXHJcbiAgICAvLyBzb3J0IHRoZSBsaXN0IGJ5IGluZGV4XHJcbiAgICB0aGlzLmdlc3R1cmVzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xyXG4gICAgICBpZihhLmluZGV4IDwgYi5pbmRleCkgeyByZXR1cm4gLTE7IH1cclxuICAgICAgaWYoYS5pbmRleCA+IGIuaW5kZXgpIHsgcmV0dXJuIDE7IH1cclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5nZXN0dXJlcztcclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIERyYWdcclxuICogTW92ZSB3aXRoIHggZmluZ2VycyAoZGVmYXVsdCAxKSBhcm91bmQgb24gdGhlIHBhZ2UuIEJsb2NraW5nIHRoZSBzY3JvbGxpbmcgd2hlblxyXG4gKiBtb3ZpbmcgbGVmdCBhbmQgcmlnaHQgaXMgYSBnb29kIHByYWN0aWNlLiBXaGVuIGFsbCB0aGUgZHJhZyBldmVudHMgYXJlIGJsb2NraW5nXHJcbiAqIHlvdSBkaXNhYmxlIHNjcm9sbGluZyBvbiB0aGF0IGFyZWEuXHJcbiAqIEBldmVudHMgIGRyYWcsIGRyYXBsZWZ0LCBkcmFncmlnaHQsIGRyYWd1cCwgZHJhZ2Rvd25cclxuICovXHJcbkhhbW1lci5nZXN0dXJlcy5EcmFnID0ge1xyXG4gIG5hbWUgICAgIDogJ2RyYWcnLFxyXG4gIGluZGV4ICAgIDogNTAsXHJcbiAgZGVmYXVsdHMgOiB7XHJcbiAgICBkcmFnX21pbl9kaXN0YW5jZSAgICAgICAgICAgIDogMTAsXHJcblxyXG4gICAgLy8gU2V0IGNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlIHRvIHRydWUgdG8gbWFrZSB0aGUgc3RhcnRpbmcgcG9pbnQgb2YgdGhlIGRyYWdcclxuICAgIC8vIGJlIGNhbGN1bGF0ZWQgZnJvbSB3aGVyZSB0aGUgZHJhZyB3YXMgdHJpZ2dlcmVkLCBub3QgZnJvbSB3aGVyZSB0aGUgdG91Y2ggc3RhcnRlZC5cclxuICAgIC8vIFVzZWZ1bCB0byBhdm9pZCBhIGplcmstc3RhcnRpbmcgZHJhZywgd2hpY2ggY2FuIG1ha2UgZmluZS1hZGp1c3RtZW50c1xyXG4gICAgLy8gdGhyb3VnaCBkcmFnZ2luZyBkaWZmaWN1bHQsIGFuZCBiZSB2aXN1YWxseSB1bmFwcGVhbGluZy5cclxuICAgIGNvcnJlY3RfZm9yX2RyYWdfbWluX2Rpc3RhbmNlOiB0cnVlLFxyXG5cclxuICAgIC8vIHNldCAwIGZvciB1bmxpbWl0ZWQsIGJ1dCB0aGlzIGNhbiBjb25mbGljdCB3aXRoIHRyYW5zZm9ybVxyXG4gICAgZHJhZ19tYXhfdG91Y2hlcyAgICAgICAgICAgICA6IDEsXHJcblxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IGJyb3dzZXIgYmVoYXZpb3Igd2hlbiBkcmFnZ2luZyBvY2N1cnNcclxuICAgIC8vIGJlIGNhcmVmdWwgd2l0aCBpdCwgaXQgbWFrZXMgdGhlIGVsZW1lbnQgYSBibG9ja2luZyBlbGVtZW50XHJcbiAgICAvLyB3aGVuIHlvdSBhcmUgdXNpbmcgdGhlIGRyYWcgZ2VzdHVyZSwgaXQgaXMgYSBnb29kIHByYWN0aWNlIHRvIHNldCB0aGlzIHRydWVcclxuICAgIGRyYWdfYmxvY2tfaG9yaXpvbnRhbCAgICAgICAgOiBmYWxzZSxcclxuICAgIGRyYWdfYmxvY2tfdmVydGljYWwgICAgICAgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkcmFnX2xvY2tfdG9fYXhpcyBrZWVwcyB0aGUgZHJhZyBnZXN0dXJlIG9uIHRoZSBheGlzIHRoYXQgaXQgc3RhcnRlZCBvbixcclxuICAgIC8vIEl0IGRpc2FsbG93cyB2ZXJ0aWNhbCBkaXJlY3Rpb25zIGlmIHRoZSBpbml0aWFsIGRpcmVjdGlvbiB3YXMgaG9yaXpvbnRhbCwgYW5kIHZpY2UgdmVyc2EuXHJcbiAgICBkcmFnX2xvY2tfdG9fYXhpcyAgICAgICAgICAgIDogZmFsc2UsXHJcblxyXG4gICAgLy8gZHJhZyBsb2NrIG9ubHkga2lja3MgaW4gd2hlbiBkaXN0YW5jZSA+IGRyYWdfbG9ja19taW5fZGlzdGFuY2VcclxuICAgIC8vIFRoaXMgd2F5LCBsb2NraW5nIG9jY3VycyBvbmx5IHdoZW4gdGhlIGRpc3RhbmNlIGhhcyBiZWNvbWUgbGFyZ2UgZW5vdWdoIHRvIHJlbGlhYmx5IGRldGVybWluZSB0aGUgZGlyZWN0aW9uXHJcbiAgICBkcmFnX2xvY2tfbWluX2Rpc3RhbmNlICAgICAgIDogMjVcclxuICB9LFxyXG5cclxuICB0cmlnZ2VyZWQ6IGZhbHNlLFxyXG4gIGhhbmRsZXIgIDogZnVuY3Rpb24gZHJhZ0dlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIC8vIGN1cnJlbnQgZ2VzdHVyZSBpc250IGRyYWcsIGJ1dCBkcmFnZ2VkIGlzIHRydWVcclxuICAgIC8vIHRoaXMgbWVhbnMgYW4gb3RoZXIgZ2VzdHVyZSBpcyBidXN5LiBub3cgY2FsbCBkcmFnZW5kXHJcbiAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSAhPSB0aGlzLm5hbWUgJiYgdGhpcy50cmlnZ2VyZWQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdlbmQnLCBldik7XHJcbiAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBtYXggdG91Y2hlc1xyXG4gICAgaWYoaW5zdC5vcHRpb25zLmRyYWdfbWF4X3RvdWNoZXMgPiAwICYmXHJcbiAgICAgIGV2LnRvdWNoZXMubGVuZ3RoID4gaW5zdC5vcHRpb25zLmRyYWdfbWF4X3RvdWNoZXMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgLy8gd2hlbiB0aGUgZGlzdGFuY2Ugd2UgbW92ZWQgaXMgdG9vIHNtYWxsIHdlIHNraXAgdGhpcyBnZXN0dXJlXHJcbiAgICAgICAgLy8gb3Igd2UgY2FuIGJlIGFscmVhZHkgaW4gZHJhZ2dpbmdcclxuICAgICAgICBpZihldi5kaXN0YW5jZSA8IGluc3Qub3B0aW9ucy5kcmFnX21pbl9kaXN0YW5jZSAmJlxyXG4gICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZSBhcmUgZHJhZ2dpbmchXHJcbiAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgIT0gdGhpcy5uYW1lKSB7XHJcbiAgICAgICAgICBIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9IHRoaXMubmFtZTtcclxuICAgICAgICAgIGlmKGluc3Qub3B0aW9ucy5jb3JyZWN0X2Zvcl9kcmFnX21pbl9kaXN0YW5jZSAmJiBldi5kaXN0YW5jZSA+IDApIHtcclxuICAgICAgICAgICAgLy8gV2hlbiBhIGRyYWcgaXMgdHJpZ2dlcmVkLCBzZXQgdGhlIGV2ZW50IGNlbnRlciB0byBkcmFnX21pbl9kaXN0YW5jZSBwaXhlbHMgZnJvbSB0aGUgb3JpZ2luYWwgZXZlbnQgY2VudGVyLlxyXG4gICAgICAgICAgICAvLyBXaXRob3V0IHRoaXMgY29ycmVjdGlvbiwgdGhlIGRyYWdnZWQgZGlzdGFuY2Ugd291bGQganVtcHN0YXJ0IGF0IGRyYWdfbWluX2Rpc3RhbmNlIHBpeGVscyBpbnN0ZWFkIG9mIGF0IDAuXHJcbiAgICAgICAgICAgIC8vIEl0IG1pZ2h0IGJlIHVzZWZ1bCB0byBzYXZlIHRoZSBvcmlnaW5hbCBzdGFydCBwb2ludCBzb21ld2hlcmVcclxuICAgICAgICAgICAgdmFyIGZhY3RvciA9IE1hdGguYWJzKGluc3Qub3B0aW9ucy5kcmFnX21pbl9kaXN0YW5jZSAvIGV2LmRpc3RhbmNlKTtcclxuICAgICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnN0YXJ0RXZlbnQuY2VudGVyLnBhZ2VYICs9IGV2LmRlbHRhWCAqIGZhY3RvcjtcclxuICAgICAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50LnN0YXJ0RXZlbnQuY2VudGVyLnBhZ2VZICs9IGV2LmRlbHRhWSAqIGZhY3RvcjtcclxuXHJcbiAgICAgICAgICAgIC8vIHJlY2FsY3VsYXRlIGV2ZW50IGRhdGEgdXNpbmcgbmV3IHN0YXJ0IHBvaW50XHJcbiAgICAgICAgICAgIGV2ID0gSGFtbWVyLmRldGVjdGlvbi5leHRlbmRFdmVudERhdGEoZXYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gbG9jayBkcmFnIHRvIGF4aXM/XHJcbiAgICAgICAgaWYoSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lmxhc3RFdmVudC5kcmFnX2xvY2tlZF90b19heGlzIHx8IChpbnN0Lm9wdGlvbnMuZHJhZ19sb2NrX3RvX2F4aXMgJiYgaW5zdC5vcHRpb25zLmRyYWdfbG9ja19taW5fZGlzdGFuY2UgPD0gZXYuZGlzdGFuY2UpKSB7XHJcbiAgICAgICAgICBldi5kcmFnX2xvY2tlZF90b19heGlzID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGxhc3RfZGlyZWN0aW9uID0gSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lmxhc3RFdmVudC5kaXJlY3Rpb247XHJcbiAgICAgICAgaWYoZXYuZHJhZ19sb2NrZWRfdG9fYXhpcyAmJiBsYXN0X2RpcmVjdGlvbiAhPT0gZXYuZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAvLyBrZWVwIGRpcmVjdGlvbiBvbiB0aGUgYXhpcyB0aGF0IHRoZSBkcmFnIGdlc3R1cmUgc3RhcnRlZCBvblxyXG4gICAgICAgICAgaWYoSGFtbWVyLnV0aWxzLmlzVmVydGljYWwobGFzdF9kaXJlY3Rpb24pKSB7XHJcbiAgICAgICAgICAgIGV2LmRpcmVjdGlvbiA9IChldi5kZWx0YVkgPCAwKSA/IEhhbW1lci5ESVJFQ1RJT05fVVAgOiBIYW1tZXIuRElSRUNUSU9OX0RPV047XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZXYuZGlyZWN0aW9uID0gKGV2LmRlbHRhWCA8IDApID8gSGFtbWVyLkRJUkVDVElPTl9MRUZUIDogSGFtbWVyLkRJUkVDVElPTl9SSUdIVDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGZpcnN0IHRpbWUsIHRyaWdnZXIgZHJhZ3N0YXJ0IGV2ZW50XHJcbiAgICAgICAgaWYoIXRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ3N0YXJ0JywgZXYpO1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciBub3JtYWwgZXZlbnRcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lLCBldik7XHJcblxyXG4gICAgICAgIC8vIGRpcmVjdGlvbiBldmVudCwgbGlrZSBkcmFnZG93blxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUgKyBldi5kaXJlY3Rpb24sIGV2KTtcclxuXHJcbiAgICAgICAgLy8gYmxvY2sgdGhlIGJyb3dzZXIgZXZlbnRzXHJcbiAgICAgICAgaWYoKGluc3Qub3B0aW9ucy5kcmFnX2Jsb2NrX3ZlcnRpY2FsICYmIEhhbW1lci51dGlscy5pc1ZlcnRpY2FsKGV2LmRpcmVjdGlvbikpIHx8XHJcbiAgICAgICAgICAoaW5zdC5vcHRpb25zLmRyYWdfYmxvY2tfaG9yaXpvbnRhbCAmJiAhSGFtbWVyLnV0aWxzLmlzVmVydGljYWwoZXYuZGlyZWN0aW9uKSkpIHtcclxuICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIC8vIHRyaWdnZXIgZHJhZ2VuZFxyXG4gICAgICAgIGlmKHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEhvbGRcclxuICogVG91Y2ggc3RheXMgYXQgdGhlIHNhbWUgcGxhY2UgZm9yIHggdGltZVxyXG4gKiBAZXZlbnRzICBob2xkXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuSG9sZCA9IHtcclxuICBuYW1lICAgIDogJ2hvbGQnLFxyXG4gIGluZGV4ICAgOiAxMCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgaG9sZF90aW1lb3V0ICA6IDUwMCxcclxuICAgIGhvbGRfdGhyZXNob2xkOiAxXHJcbiAgfSxcclxuICB0aW1lciAgIDogbnVsbCxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gaG9sZEdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIHN3aXRjaChldi5ldmVudFR5cGUpIHtcclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfU1RBUlQ6XHJcbiAgICAgICAgLy8gY2xlYXIgYW55IHJ1bm5pbmcgdGltZXJzXHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG5cclxuICAgICAgICAvLyBzZXQgdGhlIGdlc3R1cmUgc28gd2UgY2FuIGNoZWNrIGluIHRoZSB0aW1lb3V0IGlmIGl0IHN0aWxsIGlzXHJcbiAgICAgICAgSGFtbWVyLmRldGVjdGlvbi5jdXJyZW50Lm5hbWUgPSB0aGlzLm5hbWU7XHJcblxyXG4gICAgICAgIC8vIHNldCB0aW1lciBhbmQgaWYgYWZ0ZXIgdGhlIHRpbWVvdXQgaXQgc3RpbGwgaXMgaG9sZCxcclxuICAgICAgICAvLyB3ZSB0cmlnZ2VyIHRoZSBob2xkIGV2ZW50XHJcbiAgICAgICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZihIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQubmFtZSA9PSAnaG9sZCcpIHtcclxuICAgICAgICAgICAgaW5zdC50cmlnZ2VyKCdob2xkJywgZXYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIGluc3Qub3B0aW9ucy5ob2xkX3RpbWVvdXQpO1xyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgLy8gd2hlbiB5b3UgbW92ZSBvciBlbmQgd2UgY2xlYXIgdGhlIHRpbWVyXHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX01PVkU6XHJcbiAgICAgICAgaWYoZXYuZGlzdGFuY2UgPiBpbnN0Lm9wdGlvbnMuaG9sZF90aHJlc2hvbGQpIHtcclxuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9FTkQ6XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWxlYXNlXHJcbiAqIENhbGxlZCBhcyBsYXN0LCB0ZWxscyB0aGUgdXNlciBoYXMgcmVsZWFzZWQgdGhlIHNjcmVlblxyXG4gKiBAZXZlbnRzICByZWxlYXNlXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuUmVsZWFzZSA9IHtcclxuICBuYW1lICAgOiAncmVsZWFzZScsXHJcbiAgaW5kZXggIDogSW5maW5pdHksXHJcbiAgaGFuZGxlcjogZnVuY3Rpb24gcmVsZWFzZUdlc3R1cmUoZXYsIGluc3QpIHtcclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfRU5EKSB7XHJcbiAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU3dpcGVcclxuICogdHJpZ2dlcnMgc3dpcGUgZXZlbnRzIHdoZW4gdGhlIGVuZCB2ZWxvY2l0eSBpcyBhYm92ZSB0aGUgdGhyZXNob2xkXHJcbiAqIEBldmVudHMgIHN3aXBlLCBzd2lwZWxlZnQsIHN3aXBlcmlnaHQsIHN3aXBldXAsIHN3aXBlZG93blxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlN3aXBlID0ge1xyXG4gIG5hbWUgICAgOiAnc3dpcGUnLFxyXG4gIGluZGV4ICAgOiA0MCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgLy8gc2V0IDAgZm9yIHVubGltaXRlZCwgYnV0IHRoaXMgY2FuIGNvbmZsaWN0IHdpdGggdHJhbnNmb3JtXHJcbiAgICBzd2lwZV9taW5fdG91Y2hlczogMSxcclxuICAgIHN3aXBlX21heF90b3VjaGVzOiAxLFxyXG4gICAgc3dpcGVfdmVsb2NpdHkgICA6IDAuN1xyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHN3aXBlR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQpIHtcclxuICAgICAgLy8gbWF4IHRvdWNoZXNcclxuICAgICAgaWYoaW5zdC5vcHRpb25zLnN3aXBlX21heF90b3VjaGVzID4gMCAmJlxyXG4gICAgICAgIGV2LnRvdWNoZXMubGVuZ3RoIDwgaW5zdC5vcHRpb25zLnN3aXBlX21pbl90b3VjaGVzICYmXHJcbiAgICAgICAgZXYudG91Y2hlcy5sZW5ndGggPiBpbnN0Lm9wdGlvbnMuc3dpcGVfbWF4X3RvdWNoZXMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAvLyBvciB3ZSBjYW4gYmUgYWxyZWFkeSBpbiBkcmFnZ2luZ1xyXG4gICAgICBpZihldi52ZWxvY2l0eVggPiBpbnN0Lm9wdGlvbnMuc3dpcGVfdmVsb2NpdHkgfHxcclxuICAgICAgICBldi52ZWxvY2l0eVkgPiBpbnN0Lm9wdGlvbnMuc3dpcGVfdmVsb2NpdHkpIHtcclxuICAgICAgICAvLyB0cmlnZ2VyIHN3aXBlIGV2ZW50c1xyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTtcclxuICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgZXYuZGlyZWN0aW9uLCBldik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVGFwL0RvdWJsZVRhcFxyXG4gKiBRdWljayB0b3VjaCBhdCBhIHBsYWNlIG9yIGRvdWJsZSBhdCB0aGUgc2FtZSBwbGFjZVxyXG4gKiBAZXZlbnRzICB0YXAsIGRvdWJsZXRhcFxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRhcCA9IHtcclxuICBuYW1lICAgIDogJ3RhcCcsXHJcbiAgaW5kZXggICA6IDEwMCxcclxuICBkZWZhdWx0czoge1xyXG4gICAgdGFwX21heF90b3VjaHRpbWUgOiAyNTAsXHJcbiAgICB0YXBfbWF4X2Rpc3RhbmNlICA6IDEwLFxyXG4gICAgdGFwX2Fsd2F5cyAgICAgICAgOiB0cnVlLFxyXG4gICAgZG91YmxldGFwX2Rpc3RhbmNlOiAyMCxcclxuICAgIGRvdWJsZXRhcF9pbnRlcnZhbDogMzAwXHJcbiAgfSxcclxuICBoYW5kbGVyIDogZnVuY3Rpb24gdGFwR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9NT1ZFICYmICFIYW1tZXIuZGV0ZWN0aW9uLmN1cnJlbnQucmVhY2hlZFRhcE1heERpc3RhbmNlKSB7XHJcbiAgICAgIC8vVHJhY2sgdGhlIGRpc3RhbmNlIHdlJ3ZlIG1vdmVkLiBJZiBpdCdzIGFib3ZlIHRoZSBtYXggT05DRSwgcmVtZW1iZXIgdGhhdCAoZml4ZXMgIzQwNikuXHJcbiAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UgPSAoZXYuZGlzdGFuY2UgPiBpbnN0Lm9wdGlvbnMudGFwX21heF9kaXN0YW5jZSk7XHJcbiAgICB9IGVsc2UgaWYoZXYuZXZlbnRUeXBlID09IEhhbW1lci5FVkVOVF9FTkQgJiYgZXYuc3JjRXZlbnQudHlwZSAhPSAndG91Y2hjYW5jZWwnKSB7XHJcbiAgICAgIC8vIHByZXZpb3VzIGdlc3R1cmUsIGZvciB0aGUgZG91YmxlIHRhcCBzaW5jZSB0aGVzZSBhcmUgdHdvIGRpZmZlcmVudCBnZXN0dXJlIGRldGVjdGlvbnNcclxuICAgICAgdmFyIHByZXYgPSBIYW1tZXIuZGV0ZWN0aW9uLnByZXZpb3VzLFxyXG4gICAgICAgIGRpZF9kb3VibGV0YXAgPSBmYWxzZTtcclxuXHJcbiAgICAgIC8vIHdoZW4gdGhlIHRvdWNodGltZSBpcyBoaWdoZXIgdGhlbiB0aGUgbWF4IHRvdWNoIHRpbWVcclxuICAgICAgLy8gb3Igd2hlbiB0aGUgbW92aW5nIGRpc3RhbmNlIGlzIHRvbyBtdWNoXHJcbiAgICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5yZWFjaGVkVGFwTWF4RGlzdGFuY2UgfHwgZXYuZGVsdGFUaW1lID4gaW5zdC5vcHRpb25zLnRhcF9tYXhfdG91Y2h0aW1lKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBjaGVjayBpZiBkb3VibGUgdGFwXHJcbiAgICAgIGlmKHByZXYgJiYgcHJldi5uYW1lID09ICd0YXAnICYmXHJcbiAgICAgICAgKGV2LnRpbWVTdGFtcCAtIHByZXYubGFzdEV2ZW50LnRpbWVTdGFtcCkgPCBpbnN0Lm9wdGlvbnMuZG91YmxldGFwX2ludGVydmFsICYmXHJcbiAgICAgICAgZXYuZGlzdGFuY2UgPCBpbnN0Lm9wdGlvbnMuZG91YmxldGFwX2Rpc3RhbmNlKSB7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKCdkb3VibGV0YXAnLCBldik7XHJcbiAgICAgICAgZGlkX2RvdWJsZXRhcCA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGRvIGEgc2luZ2xlIHRhcFxyXG4gICAgICBpZighZGlkX2RvdWJsZXRhcCB8fCBpbnN0Lm9wdGlvbnMudGFwX2Fsd2F5cykge1xyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gJ3RhcCc7XHJcbiAgICAgICAgaW5zdC50cmlnZ2VyKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lLCBldik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVG91Y2hcclxuICogQ2FsbGVkIGFzIGZpcnN0LCB0ZWxscyB0aGUgdXNlciBoYXMgdG91Y2hlZCB0aGUgc2NyZWVuXHJcbiAqIEBldmVudHMgIHRvdWNoXHJcbiAqL1xyXG5IYW1tZXIuZ2VzdHVyZXMuVG91Y2ggPSB7XHJcbiAgbmFtZSAgICA6ICd0b3VjaCcsXHJcbiAgaW5kZXggICA6IC1JbmZpbml0eSxcclxuICBkZWZhdWx0czoge1xyXG4gICAgLy8gY2FsbCBwcmV2ZW50RGVmYXVsdCBhdCB0b3VjaHN0YXJ0LCBhbmQgbWFrZXMgdGhlIGVsZW1lbnQgYmxvY2tpbmcgYnlcclxuICAgIC8vIGRpc2FibGluZyB0aGUgc2Nyb2xsaW5nIG9mIHRoZSBwYWdlLCBidXQgaXQgaW1wcm92ZXMgZ2VzdHVyZXMgbGlrZVxyXG4gICAgLy8gdHJhbnNmb3JtaW5nIGFuZCBkcmFnZ2luZy5cclxuICAgIC8vIGJlIGNhcmVmdWwgd2l0aCB1c2luZyB0aGlzLCBpdCBjYW4gYmUgdmVyeSBhbm5veWluZyBmb3IgdXNlcnMgdG8gYmUgc3R1Y2tcclxuICAgIC8vIG9uIHRoZSBwYWdlXHJcbiAgICBwcmV2ZW50X2RlZmF1bHQgICAgOiBmYWxzZSxcclxuXHJcbiAgICAvLyBkaXNhYmxlIG1vdXNlIGV2ZW50cywgc28gb25seSB0b3VjaCAob3IgcGVuISkgaW5wdXQgdHJpZ2dlcnMgZXZlbnRzXHJcbiAgICBwcmV2ZW50X21vdXNlZXZlbnRzOiBmYWxzZVxyXG4gIH0sXHJcbiAgaGFuZGxlciA6IGZ1bmN0aW9uIHRvdWNoR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgaWYoaW5zdC5vcHRpb25zLnByZXZlbnRfbW91c2VldmVudHMgJiYgZXYucG9pbnRlclR5cGUgPT0gSGFtbWVyLlBPSU5URVJfTU9VU0UpIHtcclxuICAgICAgZXYuc3RvcERldGVjdCgpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYoaW5zdC5vcHRpb25zLnByZXZlbnRfZGVmYXVsdCkge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmKGV2LmV2ZW50VHlwZSA9PSBIYW1tZXIuRVZFTlRfU1RBUlQpIHtcclxuICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSwgZXYpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogVHJhbnNmb3JtXHJcbiAqIFVzZXIgd2FudCB0byBzY2FsZSBvciByb3RhdGUgd2l0aCAyIGZpbmdlcnNcclxuICogQGV2ZW50cyAgdHJhbnNmb3JtLCBwaW5jaCwgcGluY2hpbiwgcGluY2hvdXQsIHJvdGF0ZVxyXG4gKi9cclxuSGFtbWVyLmdlc3R1cmVzLlRyYW5zZm9ybSA9IHtcclxuICBuYW1lICAgICA6ICd0cmFuc2Zvcm0nLFxyXG4gIGluZGV4ICAgIDogNDUsXHJcbiAgZGVmYXVsdHMgOiB7XHJcbiAgICAvLyBmYWN0b3IsIG5vIHNjYWxlIGlzIDEsIHpvb21pbiBpcyB0byAwIGFuZCB6b29tb3V0IHVudGlsIGhpZ2hlciB0aGVuIDFcclxuICAgIHRyYW5zZm9ybV9taW5fc2NhbGUgICA6IDAuMDEsXHJcbiAgICAvLyByb3RhdGlvbiBpbiBkZWdyZWVzXHJcbiAgICB0cmFuc2Zvcm1fbWluX3JvdGF0aW9uOiAxLFxyXG4gICAgLy8gcHJldmVudCBkZWZhdWx0IGJyb3dzZXIgYmVoYXZpb3Igd2hlbiB0d28gdG91Y2hlcyBhcmUgb24gdGhlIHNjcmVlblxyXG4gICAgLy8gYnV0IGl0IG1ha2VzIHRoZSBlbGVtZW50IGEgYmxvY2tpbmcgZWxlbWVudFxyXG4gICAgLy8gd2hlbiB5b3UgYXJlIHVzaW5nIHRoZSB0cmFuc2Zvcm0gZ2VzdHVyZSwgaXQgaXMgYSBnb29kIHByYWN0aWNlIHRvIHNldCB0aGlzIHRydWVcclxuICAgIHRyYW5zZm9ybV9hbHdheXNfYmxvY2s6IGZhbHNlXHJcbiAgfSxcclxuICB0cmlnZ2VyZWQ6IGZhbHNlLFxyXG4gIGhhbmRsZXIgIDogZnVuY3Rpb24gdHJhbnNmb3JtR2VzdHVyZShldiwgaW5zdCkge1xyXG4gICAgLy8gY3VycmVudCBnZXN0dXJlIGlzbnQgZHJhZywgYnV0IGRyYWdnZWQgaXMgdHJ1ZVxyXG4gICAgLy8gdGhpcyBtZWFucyBhbiBvdGhlciBnZXN0dXJlIGlzIGJ1c3kuIG5vdyBjYWxsIGRyYWdlbmRcclxuICAgIGlmKEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lICE9IHRoaXMubmFtZSAmJiB0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgdGhpcy50cmlnZ2VyZWQgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGF0bGVhc3QgbXVsdGl0b3VjaFxyXG4gICAgaWYoZXYudG91Y2hlcy5sZW5ndGggPCAyKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBwcmV2ZW50IGRlZmF1bHQgd2hlbiB0d28gZmluZ2VycyBhcmUgb24gdGhlIHNjcmVlblxyXG4gICAgaWYoaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9hbHdheXNfYmxvY2spIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICAgIH1cclxuXHJcbiAgICBzd2l0Y2goZXYuZXZlbnRUeXBlKSB7XHJcbiAgICAgIGNhc2UgSGFtbWVyLkVWRU5UX1NUQVJUOlxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIEhhbW1lci5FVkVOVF9NT1ZFOlxyXG4gICAgICAgIHZhciBzY2FsZV90aHJlc2hvbGQgPSBNYXRoLmFicygxIC0gZXYuc2NhbGUpO1xyXG4gICAgICAgIHZhciByb3RhdGlvbl90aHJlc2hvbGQgPSBNYXRoLmFicyhldi5yb3RhdGlvbik7XHJcblxyXG4gICAgICAgIC8vIHdoZW4gdGhlIGRpc3RhbmNlIHdlIG1vdmVkIGlzIHRvbyBzbWFsbCB3ZSBza2lwIHRoaXMgZ2VzdHVyZVxyXG4gICAgICAgIC8vIG9yIHdlIGNhbiBiZSBhbHJlYWR5IGluIGRyYWdnaW5nXHJcbiAgICAgICAgaWYoc2NhbGVfdGhyZXNob2xkIDwgaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fc2NhbGUgJiZcclxuICAgICAgICAgIHJvdGF0aW9uX3RocmVzaG9sZCA8IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3JvdGF0aW9uKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB3ZSBhcmUgdHJhbnNmb3JtaW5nIVxyXG4gICAgICAgIEhhbW1lci5kZXRlY3Rpb24uY3VycmVudC5uYW1lID0gdGhpcy5uYW1lO1xyXG5cclxuICAgICAgICAvLyBmaXJzdCB0aW1lLCB0cmlnZ2VyIGRyYWdzdGFydCBldmVudFxyXG4gICAgICAgIGlmKCF0aGlzLnRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKHRoaXMubmFtZSArICdzdGFydCcsIGV2KTtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcmVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluc3QudHJpZ2dlcih0aGlzLm5hbWUsIGV2KTsgLy8gYmFzaWMgdHJhbnNmb3JtIGV2ZW50XHJcblxyXG4gICAgICAgIC8vIHRyaWdnZXIgcm90YXRlIGV2ZW50XHJcbiAgICAgICAgaWYocm90YXRpb25fdGhyZXNob2xkID4gaW5zdC5vcHRpb25zLnRyYW5zZm9ybV9taW5fcm90YXRpb24pIHtcclxuICAgICAgICAgIGluc3QudHJpZ2dlcigncm90YXRlJywgZXYpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gdHJpZ2dlciBwaW5jaCBldmVudFxyXG4gICAgICAgIGlmKHNjYWxlX3RocmVzaG9sZCA+IGluc3Qub3B0aW9ucy50cmFuc2Zvcm1fbWluX3NjYWxlKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIoJ3BpbmNoJywgZXYpO1xyXG4gICAgICAgICAgaW5zdC50cmlnZ2VyKCdwaW5jaCcgKyAoKGV2LnNjYWxlIDwgMSkgPyAnaW4nIDogJ291dCcpLCBldik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBIYW1tZXIuRVZFTlRfRU5EOlxyXG4gICAgICAgIC8vIHRyaWdnZXIgZHJhZ2VuZFxyXG4gICAgICAgIGlmKHRoaXMudHJpZ2dlcmVkKSB7XHJcbiAgICAgICAgICBpbnN0LnRyaWdnZXIodGhpcy5uYW1lICsgJ2VuZCcsIGV2KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuICAvLyBCYXNlZCBvZmYgTG8tRGFzaCdzIGV4Y2VsbGVudCBVTUQgd3JhcHBlciAoc2xpZ2h0bHkgbW9kaWZpZWQpIC0gaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2xvZGFzaC9ibG9iL21hc3Rlci9sb2Rhc2guanMjTDU1MTUtTDU1NDNcclxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnMgbGlrZSB0aGUgZm9sbG93aW5nOlxyXG4gIGlmKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZVxyXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkgeyByZXR1cm4gSGFtbWVyOyB9KTtcclxuICB9XHJcblxyXG4gIC8vIGNoZWNrIGZvciBgZXhwb3J0c2AgYWZ0ZXIgYGRlZmluZWAgaW4gY2FzZSBhIGJ1aWxkIG9wdGltaXplciBhZGRzIGFuIGBleHBvcnRzYCBvYmplY3RcclxuICBlbHNlIGlmKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEhhbW1lcjtcclxuICB9XHJcblxyXG4gIGVsc2Uge1xyXG4gICAgd2luZG93LkhhbW1lciA9IEhhbW1lcjtcclxuICB9XHJcblxyXG59KSh3aW5kb3cpO1xyXG5cclxuLyohIGpRdWVyeSBwbHVnaW4gZm9yIEhhbW1lci5KUyAtIHYxLjAuMSAtIDIwMTQtMDItMDNcclxuICogaHR0cDovL2VpZ2h0bWVkaWEuZ2l0aHViLmNvbS9oYW1tZXIuanNcclxuICpcclxuICogQ29weXJpZ2h0IChjKSAyMDE0IEpvcmlrIFRhbmdlbGRlciA8ai50YW5nZWxkZXJAZ21haWwuY29tPjtcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlICovKGZ1bmN0aW9uKHdpbmRvdywgdW5kZWZpbmVkKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gc2V0dXAoSGFtbWVyLCAkKSB7XHJcbiAgLyoqXHJcbiAgICogYmluZCBkb20gZXZlbnRzXHJcbiAgICogdGhpcyBvdmVyd3JpdGVzIGFkZEV2ZW50TGlzdGVuZXJcclxuICAgKiBAcGFyYW0gICB7SFRNTEVsZW1lbnR9ICAgZWxlbWVudFxyXG4gICAqIEBwYXJhbSAgIHtTdHJpbmd9ICAgICAgICBldmVudFR5cGVzXHJcbiAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgICAgIGhhbmRsZXJcclxuICAgKi9cclxuICBIYW1tZXIuZXZlbnQuYmluZERvbSA9IGZ1bmN0aW9uKGVsZW1lbnQsIGV2ZW50VHlwZXMsIGhhbmRsZXIpIHtcclxuICAgICQoZWxlbWVudCkub24oZXZlbnRUeXBlcywgZnVuY3Rpb24oZXYpIHtcclxuICAgICAgdmFyIGRhdGEgPSBldi5vcmlnaW5hbEV2ZW50IHx8IGV2O1xyXG5cclxuICAgICAgaWYoZGF0YS5wYWdlWCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZGF0YS5wYWdlWCA9IGV2LnBhZ2VYO1xyXG4gICAgICAgIGRhdGEucGFnZVkgPSBldi5wYWdlWTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEudGFyZ2V0KSB7XHJcbiAgICAgICAgZGF0YS50YXJnZXQgPSBldi50YXJnZXQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKGRhdGEud2hpY2ggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGRhdGEud2hpY2ggPSBkYXRhLmJ1dHRvbjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIWRhdGEucHJldmVudERlZmF1bHQpIHtcclxuICAgICAgICBkYXRhLnByZXZlbnREZWZhdWx0ID0gZXYucHJldmVudERlZmF1bHQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmKCFkYXRhLnN0b3BQcm9wYWdhdGlvbikge1xyXG4gICAgICAgIGRhdGEuc3RvcFByb3BhZ2F0aW9uID0gZXYuc3RvcFByb3BhZ2F0aW9uO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBoYW5kbGVyLmNhbGwodGhpcywgZGF0YSk7XHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiB0aGUgbWV0aG9kcyBhcmUgY2FsbGVkIGJ5IHRoZSBpbnN0YW5jZSwgYnV0IHdpdGggdGhlIGpxdWVyeSBwbHVnaW5cclxuICAgKiB3ZSB1c2UgdGhlIGpxdWVyeSBldmVudCBtZXRob2RzIGluc3RlYWQuXHJcbiAgICogQHRoaXMgICAge0hhbW1lci5JbnN0YW5jZX1cclxuICAgKiBAcmV0dXJuICB7alF1ZXJ5fVxyXG4gICAqL1xyXG4gIEhhbW1lci5JbnN0YW5jZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbih0eXBlcywgaGFuZGxlcikge1xyXG4gICAgcmV0dXJuICQodGhpcy5lbGVtZW50KS5vbih0eXBlcywgaGFuZGxlcik7XHJcbiAgfTtcclxuICBIYW1tZXIuSW5zdGFuY2UucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGVzLCBoYW5kbGVyKSB7XHJcbiAgICByZXR1cm4gJCh0aGlzLmVsZW1lbnQpLm9mZih0eXBlcywgaGFuZGxlcik7XHJcbiAgfTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIHRyaWdnZXIgZXZlbnRzXHJcbiAgICogdGhpcyBpcyBjYWxsZWQgYnkgdGhlIGdlc3R1cmVzIHRvIHRyaWdnZXIgYW4gZXZlbnQgbGlrZSAndGFwJ1xyXG4gICAqIEB0aGlzICAgIHtIYW1tZXIuSW5zdGFuY2V9XHJcbiAgICogQHBhcmFtICAge1N0cmluZ30gICAgZ2VzdHVyZVxyXG4gICAqIEBwYXJhbSAgIHtPYmplY3R9ICAgIGV2ZW50RGF0YVxyXG4gICAqIEByZXR1cm4gIHtqUXVlcnl9XHJcbiAgICovXHJcbiAgSGFtbWVyLkluc3RhbmNlLnByb3RvdHlwZS50cmlnZ2VyID0gZnVuY3Rpb24oZ2VzdHVyZSwgZXZlbnREYXRhKSB7XHJcbiAgICB2YXIgZWwgPSAkKHRoaXMuZWxlbWVudCk7XHJcbiAgICBpZihlbC5oYXMoZXZlbnREYXRhLnRhcmdldCkubGVuZ3RoKSB7XHJcbiAgICAgIGVsID0gJChldmVudERhdGEudGFyZ2V0KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZWwudHJpZ2dlcih7XHJcbiAgICAgIHR5cGUgICA6IGdlc3R1cmUsXHJcbiAgICAgIGdlc3R1cmU6IGV2ZW50RGF0YVxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIGpRdWVyeSBwbHVnaW5cclxuICAgKiBjcmVhdGUgaW5zdGFuY2Ugb2YgSGFtbWVyIGFuZCB3YXRjaCBmb3IgZ2VzdHVyZXMsXHJcbiAgICogYW5kIHdoZW4gY2FsbGVkIGFnYWluIHlvdSBjYW4gY2hhbmdlIHRoZSBvcHRpb25zXHJcbiAgICogQHBhcmFtICAge09iamVjdH0gICAgW29wdGlvbnM9e31dXHJcbiAgICogQHJldHVybiAge2pRdWVyeX1cclxuICAgKi9cclxuICAkLmZuLmhhbW1lciA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZhciBlbCA9ICQodGhpcyk7XHJcbiAgICAgIHZhciBpbnN0ID0gZWwuZGF0YSgnaGFtbWVyJyk7XHJcbiAgICAgIC8vIHN0YXJ0IG5ldyBoYW1tZXIgaW5zdGFuY2VcclxuICAgICAgaWYoIWluc3QpIHtcclxuICAgICAgICBlbC5kYXRhKCdoYW1tZXInLCBuZXcgSGFtbWVyKHRoaXMsIG9wdGlvbnMgfHwge30pKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBjaGFuZ2UgdGhlIG9wdGlvbnNcclxuICAgICAgZWxzZSBpZihpbnN0ICYmIG9wdGlvbnMpIHtcclxuICAgICAgICBIYW1tZXIudXRpbHMuZXh0ZW5kKGluc3Qub3B0aW9ucywgb3B0aW9ucyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH07XHJcbn1cclxuXHJcbiAgLy8gQmFzZWQgb2ZmIExvLURhc2gncyBleGNlbGxlbnQgVU1EIHdyYXBwZXIgKHNsaWdodGx5IG1vZGlmaWVkKSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9sb2Rhc2gvYmxvYi9tYXN0ZXIvbG9kYXNoLmpzI0w1NTE1LUw1NTQzXHJcbiAgLy8gc29tZSBBTUQgYnVpbGQgb3B0aW1pemVycywgbGlrZSByLmpzLCBjaGVjayBmb3Igc3BlY2lmaWMgY29uZGl0aW9uIHBhdHRlcm5zIGxpa2UgdGhlIGZvbGxvd2luZzpcclxuICBpZih0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gZGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGVcclxuICAgIGRlZmluZShbJ2hhbW1lcmpzJywgJ2pxdWVyeSddLCBzZXR1cCk7XHJcblxyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIHNldHVwKHdpbmRvdy5IYW1tZXIsIHdpbmRvdy5qUXVlcnkgfHwgd2luZG93LlplcHRvKTtcclxuICB9XHJcbn0pKHdpbmRvdyk7IiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwidmFyIHByb2Nlc3M9cmVxdWlyZShcIl9fYnJvd3NlcmlmeV9wcm9jZXNzXCIpLGdsb2JhbD10eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge307Ly8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19
;