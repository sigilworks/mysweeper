;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Gameboard = require('./gameboard');

$(function(){

	// onkeyup when choosing gameboard dimensions,
	// neighboring input should mirror new value,
	// and total possible mineable squares (dimensions ^ 2 -1)
	// be filled into a <span> below.
	$("#dimensions").on('keyup', function() {
		var $this = $(this);

		// update the 'mirror' <input>...
		$('#dimensions-mirror').val($this.val());

		// ...and the possible number of mines.
		var mineableSpaces = function(dim) { return Math.pow(dim, 2) - 1; };
		$("#mine-count")
			.siblings(".advice")
			.find("span")
			.html(mineableSpaces($this.val()) + '.');
	});

	$("form").on("submit", function() {

    	window.gameboard = new Gameboard({
    		dimensions: $("#dimensions").val(),
    		mines: $("#mine-count").val()
    	}).render();

    	$("#options-card").hide();
    	$("#board-card").fadeIn();

    	return false;
	});

});

// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions

},{"./gameboard":4}],2:[function(require,module,exports){

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
},{}],3:[function(require,module,exports){

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
},{}],4:[function(require,module,exports){
var DangerCalculator = require('./danger-calculator'),
    Square = require('./square');

function Gameboard(options) {
    // the map, serving as the internal represenation of the gameboard
    this.board = {
        _table: [],
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
    // the dimensions of the board when rendered
    this.dimensions = +options.dimensions || 9;
    // the number of mines the user has selected
    this.mines = +options.mines || 1;
    // the DOM element of the table serving as the board
    this.$el = $(options.board || "#board");
    // the object that calculates the number of surrounding mines at any square
    this.dangerCalc = new DangerCalculator(this);
    // create the board in memory and assign values to the squares
    this._loadBoard();
    // render the HTML to match the board in memory
    this._renderGrid();
    // keep track of user clicks towards their win
    this.userMoves = 0;
}

Gameboard.prototype = {

    // "PRIVATE" METHODS:
    _loadBoard: function() {
        // 1. prefill squares to required dimensions...
        var _this = this,
            dimensions = this.dimensions,
            mines = this.mines,
            fillRow = function(row, squares) {
                var ret = [];
                for (var i=0; i < squares; ++i)
                    ret[i] = new Square(row, i);
                return ret;
            };

        for (var i=0; i < dimensions; ++i)
            this.board.set(i, fillRow(i, dimensions));

        // 2. determine random positions of mined squares...
        this._determineMineLocations(dimensions, mines);

        // 3. pre-calculate the danger index of each non-mined square...
        this._precalcDangerIndices();

        console.log("G A M E B O A R D\n%o", this.toConsole());
        console.log("M I N E  P L A C E M E N T S\n%o", this.toConsole(true));
    },
    _renderGrid: function() {
        // 1. layout the HTML <table> rows...
        this._createHTMLGrid(this.dimensions);
        // 2. setup event listeners to listen for user clicks
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
            .forEach(function(safe) { safe.danger = _this.dangerCalc.forSquare(safe.getRow(), safe.getCell()); });
    },
    _setupEventListeners: function() {
        this.$el.on({
            click: this._handleClick.bind(this),
            contextmenu: this._handleRightClick.bind(this)
        }, 'td, td > span');
    },
    _removeEventListeners: function() {
        this.$el.off('click, contextmenu', 'td, td > span');
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

        this.userMoves++;

        if (square.isClosed() && !square.isMined() && !square.isFlagged()) {
            square.open();
            $cell.removeClass('closed').addClass('open');
            this._recursiveReveal(square);

        } else if (square.isFlagged())
            console.log("handle flagged situation...")

        else if (square.isMined())
            return this._gameOver();

        if ($('.closed').length === 0)
            this._gameWin();
    },
    _handleRightClick: function(event) {
        var $target = $(event.target),
            $cell = $target.prop('tagName').toLowerCase() === 'span' ? $target.parent() : $target,
            square = $cell.data('square');

        this.userMoves++;

        console.log("$cell: %o, square: %o", $cell, square)
        if (square.isClosed()) {
            square.flag();
            this._renderSquare(square);
            $cell.removeClass('closed').addClass('flagged');

        } else if (square.isFlagged()) {
            square.close();
            $cell.removeClass('flagged').addClass('closed');
        }

        return false;
    },
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

            if (neighbor && !neighbor.isMined() && neighbor.isClosed() && neighbor.getDanger() > 0) {
                neighbor.open();
                _this.getGridCell(neighbor).removeClass('closed').addClass('open');
                _this._recursiveReveal(neighbor);
            }
        });
    },
    _gameWin: function () {
        this._removeEventListeners();
        this.$el.addClass('game-win');

        console.log("G A M E  W I N !!!");
        console.log("User moves: %o", this.userMoves)
    },
    _gameOver: function() {
        // reset everything
        var _this = this;

        this.getSquares()
            .filter(function(sq) { return sq.isFlagged(); })
            .forEach(function(f) { _this.getGridCell(f).find('.danger').html(f.getDanger()); });
        // open/reveal all squares
        // put up 'Game Over' banner
        this.$el.find('.mined').addClass('revealed');
        this.$el.find('.closed, .flagged').removeClass('closed flagged').addClass('open');
        console.log('G A M E  O V E R !!!');
    },
    _renderSquare: function(square) {
        var $cell = this.getGridCell(square),
            $dangerSpan = $('<span />', { 'class': 'danger', html: (!square.isMined()) ? (square.isFlagged()) ? '&#9873;' : square.getDanger() : '&#9881;' });
        // decorate <td> with CSS classes appropriate to square's state
        $cell.removeClass()
             .addClass('square')
             .addClass(square.getState().toLowerCase());
        // insert a span with the danger index
        $cell.find('.danger')
             .remove()
             .end()
             .append($dangerSpan);
        // add some data-* attributes to pass along on click events
        $cell.data('row', square.getRow());
        $cell.data('cell', square.getCell());
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

    toJSON: function() { return this.board.values().join(', '); },
    toConsole: function(withDanger) {
        return this.board.values()
            .reduce(function(str, row, idx) {
                var symbols = withDanger ? row.map(function(sq) { return sq.getDanger() || ' '; }) : row;
                return str += symbols.join('   ').toLowerCase() + "       [" + idx + "]\n";
            }, '\n');
    }
};

module.exports = Gameboard;
},{"./danger-calculator":2,"./square":5}],5:[function(require,module,exports){

function Square(row, cell, state, danger) {
    if (!(this instanceof Square))
        return new Square(arguments);
    this.row = row;
    this.cell = cell;
    this.state = state || this.States.CLOSED;
    this.danger = danger || '-';
}

Square.prototype = {
    States: { CLOSED: 'x', OPENED: '_', FLAGGED: 'f', MINED: '*' },

    getRow: function() { return this.row; },
    getCell: function() { return this.cell; },
    getDanger: function() { return this.danger; },
    getState: function() {
        var _this = this;
        return Object.keys(this.States)
                     .filter(function(key) { return _this.States[key] === _this.state; })[0];
    },

    close: function() { this.state = this.States.CLOSED; },
    open: function() { this.state = this.States.OPENED; },
    flag: function() { this.state = this.States.FLAGGED; },
    mine: function() { this.state = this.States.MINED; },

    isClosed: function() { return this.state === this.States.CLOSED; },
    isOpen: function() { return this.state === this.States.OPENED; },
    isFlagged: function() { return this.state === this.States.FLAGGED; },
    isMined: function() { return this.state === this.States.MINED; },

    toJSON: function() { return { row: this.row, cell: this.cell, state: this.state, danger: this.danger } },
    toString: function() { return this.state; }
};

module.exports = Square;
},{}]},{},[1,2,4,3,5])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9hcHAuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9kYW5nZXItY2FsY3VsYXRvci5qcyIsIkM6L1VzZXJzL0lCTV9BRE1JTi9naXQvbXlzd2VlcGVyL2pzL2VtaXR0ZXIuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9nYW1lYm9hcmQuanMiLCJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9zcXVhcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgR2FtZWJvYXJkID0gcmVxdWlyZSgnLi9nYW1lYm9hcmQnKTtcclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcblx0Ly8gb25rZXl1cCB3aGVuIGNob29zaW5nIGdhbWVib2FyZCBkaW1lbnNpb25zLFxyXG5cdC8vIG5laWdoYm9yaW5nIGlucHV0IHNob3VsZCBtaXJyb3IgbmV3IHZhbHVlLFxyXG5cdC8vIGFuZCB0b3RhbCBwb3NzaWJsZSBtaW5lYWJsZSBzcXVhcmVzIChkaW1lbnNpb25zIF4gMiAtMSlcclxuXHQvLyBiZSBmaWxsZWQgaW50byBhIDxzcGFuPiBiZWxvdy5cclxuXHQkKFwiI2RpbWVuc2lvbnNcIikub24oJ2tleXVwJywgZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgJHRoaXMgPSAkKHRoaXMpO1xyXG5cclxuXHRcdC8vIHVwZGF0ZSB0aGUgJ21pcnJvcicgPGlucHV0Pi4uLlxyXG5cdFx0JCgnI2RpbWVuc2lvbnMtbWlycm9yJykudmFsKCR0aGlzLnZhbCgpKTtcclxuXHJcblx0XHQvLyAuLi5hbmQgdGhlIHBvc3NpYmxlIG51bWJlciBvZiBtaW5lcy5cclxuXHRcdHZhciBtaW5lYWJsZVNwYWNlcyA9IGZ1bmN0aW9uKGRpbSkgeyByZXR1cm4gTWF0aC5wb3coZGltLCAyKSAtIDE7IH07XHJcblx0XHQkKFwiI21pbmUtY291bnRcIilcclxuXHRcdFx0LnNpYmxpbmdzKFwiLmFkdmljZVwiKVxyXG5cdFx0XHQuZmluZChcInNwYW5cIilcclxuXHRcdFx0Lmh0bWwobWluZWFibGVTcGFjZXMoJHRoaXMudmFsKCkpICsgJy4nKTtcclxuXHR9KTtcclxuXHJcblx0JChcImZvcm1cIikub24oXCJzdWJtaXRcIiwgZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgXHR3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZCh7XHJcbiAgICBcdFx0ZGltZW5zaW9uczogJChcIiNkaW1lbnNpb25zXCIpLnZhbCgpLFxyXG4gICAgXHRcdG1pbmVzOiAkKFwiI21pbmUtY291bnRcIikudmFsKClcclxuICAgIFx0fSkucmVuZGVyKCk7XHJcblxyXG4gICAgXHQkKFwiI29wdGlvbnMtY2FyZFwiKS5oaWRlKCk7XHJcbiAgICBcdCQoXCIjYm9hcmQtY2FyZFwiKS5mYWRlSW4oKTtcclxuXHJcbiAgICBcdHJldHVybiBmYWxzZTtcclxuXHR9KTtcclxuXHJcbn0pO1xyXG5cclxuLy8gc2V0IHdpZHRoL2hlaWdodCBvZiAuc3F1YXJlOlxyXG4gICAgLy8gdmFyIG5ld0RpbSA9ICgoMC45NSAqICQod2luZG93KS5oZWlnaHQoKSkgKyA2NikgLyAyMDtcclxuICAgIC8vICQoJy5zcXVhcmUnKS5jc3MoeyBoZWlnaHQ6IG5ld0RpbSwgd2lkdGg6IG5ld0RpbSB9KTtcclxuLy8gKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkgKyA2NikgLyB0aGlzLmRpbWVuc2lvbnNcclxuIiwiXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRGFuZ2VyQ2FsY3VsYXRvcjsiLCJcclxuZnVuY3Rpb24gRW1pdHRlcigpIHtcclxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xyXG59XHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5leHBvcnRzLkVtaXR0ZXIgPSBFbWl0dGVyOyIsInZhciBEYW5nZXJDYWxjdWxhdG9yID0gcmVxdWlyZSgnLi9kYW5nZXItY2FsY3VsYXRvcicpLFxyXG4gICAgU3F1YXJlID0gcmVxdWlyZSgnLi9zcXVhcmUnKTtcclxuXHJcbmZ1bmN0aW9uIEdhbWVib2FyZChvcHRpb25zKSB7XHJcbiAgICAvLyB0aGUgbWFwLCBzZXJ2aW5nIGFzIHRoZSBpbnRlcm5hbCByZXByZXNlbmF0aW9uIG9mIHRoZSBnYW1lYm9hcmRcclxuICAgIHRoaXMuYm9hcmQgPSB7XHJcbiAgICAgICAgX3RhYmxlOiBbXSxcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHJvdykgeyByZXR1cm4gdGhpcy5fdGFibGVbcm93XTsgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHJvdywgdmFsKSB7ICh0aGlzLl90YWJsZVtyb3ddIHx8ICh0aGlzLl90YWJsZVtyb3ddID0gW10pKS5wdXNoKHZhbCk7IH0sXHJcbiAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICAgICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihyb3cpIHsgcmV0dXJuIF90aGlzLl90YWJsZVtyb3ddOyB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIGl0ZW0pIHsgcmV0dXJuIGFjYy5jb25jYXQoaXRlbSk7IH0sIFtdKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbigpIHsgdGhpcy5fdGFibGUgPSB7fTsgfSxcclxuICAgICAgICBzaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKS5sZW5ndGg7IH1cclxuICAgIH07XHJcbiAgICAvLyB0aGUgZGltZW5zaW9ucyBvZiB0aGUgYm9hcmQgd2hlbiByZW5kZXJlZFxyXG4gICAgdGhpcy5kaW1lbnNpb25zID0gK29wdGlvbnMuZGltZW5zaW9ucyB8fCA5O1xyXG4gICAgLy8gdGhlIG51bWJlciBvZiBtaW5lcyB0aGUgdXNlciBoYXMgc2VsZWN0ZWRcclxuICAgIHRoaXMubWluZXMgPSArb3B0aW9ucy5taW5lcyB8fCAxO1xyXG4gICAgLy8gdGhlIERPTSBlbGVtZW50IG9mIHRoZSB0YWJsZSBzZXJ2aW5nIGFzIHRoZSBib2FyZFxyXG4gICAgdGhpcy4kZWwgPSAkKG9wdGlvbnMuYm9hcmQgfHwgXCIjYm9hcmRcIik7XHJcbiAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgIHRoaXMuZGFuZ2VyQ2FsYyA9IG5ldyBEYW5nZXJDYWxjdWxhdG9yKHRoaXMpO1xyXG4gICAgLy8gY3JlYXRlIHRoZSBib2FyZCBpbiBtZW1vcnkgYW5kIGFzc2lnbiB2YWx1ZXMgdG8gdGhlIHNxdWFyZXNcclxuICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgLy8gcmVuZGVyIHRoZSBIVE1MIHRvIG1hdGNoIHRoZSBib2FyZCBpbiBtZW1vcnlcclxuICAgIHRoaXMuX3JlbmRlckdyaWQoKTtcclxuICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgIHRoaXMudXNlck1vdmVzID0gMDtcclxufVxyXG5cclxuR2FtZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuXHJcbiAgICAvLyBcIlBSSVZBVEVcIiBNRVRIT0RTOlxyXG4gICAgX2xvYWRCb2FyZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gMS4gcHJlZmlsbCBzcXVhcmVzIHRvIHJlcXVpcmVkIGRpbWVuc2lvbnMuLi5cclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zID0gdGhpcy5kaW1lbnNpb25zLFxyXG4gICAgICAgICAgICBtaW5lcyA9IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgIGZpbGxSb3cgPSBmdW5jdGlvbihyb3csIHNxdWFyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXQgPSBbXTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICByZXRbaV0gPSBuZXcgU3F1YXJlKHJvdywgaSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmV0O1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBkaW1lbnNpb25zOyArK2kpXHJcbiAgICAgICAgICAgIHRoaXMuYm9hcmQuc2V0KGksIGZpbGxSb3coaSwgZGltZW5zaW9ucykpO1xyXG5cclxuICAgICAgICAvLyAyLiBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgdGhpcy5fZGV0ZXJtaW5lTWluZUxvY2F0aW9ucyhkaW1lbnNpb25zLCBtaW5lcyk7XHJcblxyXG4gICAgICAgIC8vIDMuIHByZS1jYWxjdWxhdGUgdGhlIGRhbmdlciBpbmRleCBvZiBlYWNoIG5vbi1taW5lZCBzcXVhcmUuLi5cclxuICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIkcgQSBNIEUgQiBPIEEgUiBEXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUoKSk7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJNIEkgTiBFICBQIEwgQSBDIEUgTSBFIE4gVCBTXFxuJW9cIiwgdGhpcy50b0NvbnNvbGUodHJ1ZSkpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJHcmlkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAvLyAxLiBsYXlvdXQgdGhlIEhUTUwgPHRhYmxlPiByb3dzLi4uXHJcbiAgICAgICAgdGhpcy5fY3JlYXRlSFRNTEdyaWQodGhpcy5kaW1lbnNpb25zKTtcclxuICAgICAgICAvLyAyLiBzZXR1cCBldmVudCBsaXN0ZW5lcnMgdG8gbGlzdGVuIGZvciB1c2VyIGNsaWNrc1xyXG4gICAgICAgIHRoaXMuX3NldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgIH0sXHJcbiAgICBfZGV0ZXJtaW5lTWluZUxvY2F0aW9uczogZnVuY3Rpb24oZGltZW5zaW9ucywgbWluZXMpIHtcclxuICAgICAgICBmb3IgKHZhciBpPTA7IGkgPCBtaW5lczsgKytpKSB7XHJcbiAgICAgICAgICAgIHZhciBybmQgPSBNYXRoLnJhbmRvbSgpICogKE1hdGgucG93KGRpbWVuc2lvbnMsIDIpKSB8IDAsXHJcbiAgICAgICAgICAgICAgICByb3cgPSB+fihybmQgLyBkaW1lbnNpb25zKSxcclxuICAgICAgICAgICAgICAgIGNlbGwgPSBybmQgJSBkaW1lbnNpb25zLFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlID0gdGhpcy5nZXRTcXVhcmVBdChyb3csIGNlbGwpO1xyXG4gICAgICAgICAgICBzcXVhcmUubWluZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBfcHJlY2FsY0RhbmdlckluZGljZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbC5maWx0ZXIoZnVuY3Rpb24oc3EpIHsgcmV0dXJuICFzcS5pc01pbmVkKCk7IH0pKTsgfSwgW10pXHJcbiAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKHNhZmUpIHsgc2FmZS5kYW5nZXIgPSBfdGhpcy5kYW5nZXJDYWxjLmZvclNxdWFyZShzYWZlLmdldFJvdygpLCBzYWZlLmdldENlbGwoKSk7IH0pO1xyXG4gICAgfSxcclxuICAgIF9zZXR1cEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLiRlbC5vbih7XHJcbiAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICBjb250ZXh0bWVudTogdGhpcy5faGFuZGxlUmlnaHRDbGljay5iaW5kKHRoaXMpXHJcbiAgICAgICAgfSwgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgIH0sXHJcbiAgICBfcmVtb3ZlRXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLm9mZignY2xpY2ssIGNvbnRleHRtZW51JywgJ3RkLCB0ZCA+IHNwYW4nKTtcclxuICAgIH0sXHJcbiAgICBfY3JlYXRlSFRNTEdyaWQ6IGZ1bmN0aW9uKGRpbWVuc2lvbnMpIHtcclxuICAgICAgICB2YXIgZ3JpZCA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICBncmlkICs9IFwiPHRyIGlkPSdyb3dcIiArIGkgKyBcIic+XCJcclxuICAgICAgICAgICAgICAgICArICBbXS5qb2luLmNhbGwoeyBsZW5ndGg6IGRpbWVuc2lvbnMgKyAxIH0sIFwiPHRkPjwvdGQ+XCIpXHJcbiAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLiRlbC5hcHBlbmQoZ3JpZCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgIHZhciAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpLFxyXG4gICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICBzcXVhcmUgPSAkY2VsbC5kYXRhKCdzcXVhcmUnKTtcclxuXHJcbiAgICAgICAgdGhpcy51c2VyTW92ZXMrKztcclxuXHJcbiAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgc3F1YXJlLm9wZW4oKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKHNxdWFyZS5pc0ZsYWdnZWQoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJoYW5kbGUgZmxhZ2dlZCBzaXR1YXRpb24uLi5cIilcclxuXHJcbiAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhbWVPdmVyKCk7XHJcblxyXG4gICAgICAgIGlmICgkKCcuY2xvc2VkJykubGVuZ3RoID09PSAwKVxyXG4gICAgICAgICAgICB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICB9LFxyXG4gICAgX2hhbmRsZVJpZ2h0Q2xpY2s6IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICRjZWxsID0gJHRhcmdldC5wcm9wKCd0YWdOYW1lJykudG9Mb3dlckNhc2UoKSA9PT0gJ3NwYW4nID8gJHRhcmdldC5wYXJlbnQoKSA6ICR0YXJnZXQsXHJcbiAgICAgICAgICAgIHNxdWFyZSA9ICRjZWxsLmRhdGEoJ3NxdWFyZScpO1xyXG5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyhcIiRjZWxsOiAlbywgc3F1YXJlOiAlb1wiLCAkY2VsbCwgc3F1YXJlKVxyXG4gICAgICAgIGlmIChzcXVhcmUuaXNDbG9zZWQoKSkge1xyXG4gICAgICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJTcXVhcmUoc3F1YXJlKTtcclxuICAgICAgICAgICAgJGNlbGwucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdmbGFnZ2VkJyk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgIHNxdWFyZS5jbG9zZSgpO1xyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnZmxhZ2dlZCcpLmFkZENsYXNzKCdjbG9zZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0sXHJcbiAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAvLyBiYXNlZCBvbiBgc291cmNlYCBzcXVhcmUsIHdhbGsgYW5kIHJlY3Vyc2l2ZWx5IHJldmVhbCBjb25uZWN0ZWQgc3BhY2VzXHJcbiAgICAgICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kKSxcclxuICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICBjZWxsID0gc291cmNlLmdldENlbGwoKSxcclxuICAgICAgICAgICAgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciB2ZXJ0ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgIGhvcml6ID0gX3RoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuZWlnaGJvciAmJiAhbmVpZ2hib3IuaXNNaW5lZCgpICYmIG5laWdoYm9yLmlzQ2xvc2VkKCkgJiYgbmVpZ2hib3IuZ2V0RGFuZ2VyKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZWlnaGJvci5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5nZXRHcmlkQ2VsbChuZWlnaGJvcikucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5fcmVjdXJzaXZlUmV2ZWFsKG5laWdoYm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSxcclxuICAgIF9nYW1lV2luOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZ2FtZS13aW4nKTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJHIEEgTSBFICBXIEkgTiAhISFcIik7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgIH0sXHJcbiAgICBfZ2FtZU92ZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKVxyXG4gICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSlcclxuICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oZikgeyBfdGhpcy5nZXRHcmlkQ2VsbChmKS5maW5kKCcuZGFuZ2VyJykuaHRtbChmLmdldERhbmdlcigpKTsgfSk7XHJcbiAgICAgICAgLy8gb3Blbi9yZXZlYWwgYWxsIHNxdWFyZXNcclxuICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgdGhpcy4kZWwuZmluZCgnLm1pbmVkJykuYWRkQ2xhc3MoJ3JldmVhbGVkJyk7XHJcbiAgICAgICAgdGhpcy4kZWwuZmluZCgnLmNsb3NlZCwgLmZsYWdnZWQnKS5yZW1vdmVDbGFzcygnY2xvc2VkIGZsYWdnZWQnKS5hZGRDbGFzcygnb3BlbicpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdHIEEgTSBFICBPIFYgRSBSICEhIScpO1xyXG4gICAgfSxcclxuICAgIF9yZW5kZXJTcXVhcmU6IGZ1bmN0aW9uKHNxdWFyZSkge1xyXG4gICAgICAgIHZhciAkY2VsbCA9IHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSxcclxuICAgICAgICAgICAgJGRhbmdlclNwYW4gPSAkKCc8c3BhbiAvPicsIHsgJ2NsYXNzJzogJ2RhbmdlcicsIGh0bWw6ICghc3F1YXJlLmlzTWluZWQoKSkgPyAoc3F1YXJlLmlzRmxhZ2dlZCgpKSA/ICcmIzk4NzM7JyA6IHNxdWFyZS5nZXREYW5nZXIoKSA6ICcmIzk4ODE7JyB9KTtcclxuICAgICAgICAvLyBkZWNvcmF0ZSA8dGQ+IHdpdGggQ1NTIGNsYXNzZXMgYXBwcm9wcmlhdGUgdG8gc3F1YXJlJ3Mgc3RhdGVcclxuICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NxdWFyZScpXHJcbiAgICAgICAgICAgICAuYWRkQ2xhc3Moc3F1YXJlLmdldFN0YXRlKCkudG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgLy8gaW5zZXJ0IGEgc3BhbiB3aXRoIHRoZSBkYW5nZXIgaW5kZXhcclxuICAgICAgICAkY2VsbC5maW5kKCcuZGFuZ2VyJylcclxuICAgICAgICAgICAgIC5yZW1vdmUoKVxyXG4gICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAuYXBwZW5kKCRkYW5nZXJTcGFuKTtcclxuICAgICAgICAvLyBhZGQgc29tZSBkYXRhLSogYXR0cmlidXRlcyB0byBwYXNzIGFsb25nIG9uIGNsaWNrIGV2ZW50c1xyXG4gICAgICAgICRjZWxsLmRhdGEoJ3JvdycsIHNxdWFyZS5nZXRSb3coKSk7XHJcbiAgICAgICAgJGNlbGwuZGF0YSgnY2VsbCcsIHNxdWFyZS5nZXRDZWxsKCkpO1xyXG4gICAgICAgICRjZWxsLmRhdGEoJ3NxdWFyZScsIHNxdWFyZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8vIFwiUFVCTElDXCIgTUVUSE9EU1xyXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAvLyByZXR1cm4gYHRoaXNgLCBzbyB0aGlzIG1ldGhvZCBjYW4gYmUgY2hhaW5lZCB0byBpdHMgaW5pdGlhbGl6YXRpb24gY2FsbFxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGdldEdyaWRDZWxsOiBmdW5jdGlvbihzcXVhcmUpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy4kZWxcclxuICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgIC5maW5kKCd0ZCcpXHJcbiAgICAgICAgICAgICAgICAuZXEoc3F1YXJlLmdldENlbGwoKSk7XHJcbiAgICB9LFxyXG4gICAgZ2V0U3F1YXJlQXQ6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgIHZhciByb3cgPSB0aGlzLmJvYXJkLmdldChyb3cpO1xyXG4gICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgIH0sXHJcbiAgICBnZXRTcXVhcmVzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgLnZhbHVlcygpXHJcbiAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgdmFsKSB7IHJldHVybiBhY2MuY29uY2F0KHZhbCk7IH0sIFtdKVxyXG4gICAgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2FyZC52YWx1ZXMoKS5qb2luKCcsICcpOyB9LFxyXG4gICAgdG9Db25zb2xlOiBmdW5jdGlvbih3aXRoRGFuZ2VyKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihzdHIsIHJvdywgaWR4KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc3ltYm9scyA9IHdpdGhEYW5nZXIgPyByb3cubWFwKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5nZXREYW5nZXIoKSB8fCAnICc7IH0pIDogcm93O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBzeW1ib2xzLmpvaW4oJyAgICcpLnRvTG93ZXJDYXNlKCkgKyBcIiAgICAgICBbXCIgKyBpZHggKyBcIl1cXG5cIjtcclxuICAgICAgICAgICAgfSwgJ1xcbicpO1xyXG4gICAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHYW1lYm9hcmQ7IiwiXHJcbmZ1bmN0aW9uIFNxdWFyZShyb3csIGNlbGwsIHN0YXRlLCBkYW5nZXIpIHtcclxuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTcXVhcmUpKVxyXG4gICAgICAgIHJldHVybiBuZXcgU3F1YXJlKGFyZ3VtZW50cyk7XHJcbiAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgIHRoaXMuY2VsbCA9IGNlbGw7XHJcbiAgICB0aGlzLnN0YXRlID0gc3RhdGUgfHwgdGhpcy5TdGF0ZXMuQ0xPU0VEO1xyXG4gICAgdGhpcy5kYW5nZXIgPSBkYW5nZXIgfHwgJy0nO1xyXG59XHJcblxyXG5TcXVhcmUucHJvdG90eXBlID0ge1xyXG4gICAgU3RhdGVzOiB7IENMT1NFRDogJ3gnLCBPUEVORUQ6ICdfJywgRkxBR0dFRDogJ2YnLCBNSU5FRDogJyonIH0sXHJcblxyXG4gICAgZ2V0Um93OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMucm93OyB9LFxyXG4gICAgZ2V0Q2VsbDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmNlbGw7IH0sXHJcbiAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICBnZXRTdGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5TdGF0ZXMpXHJcbiAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7IHJldHVybiBfdGhpcy5TdGF0ZXNba2V5XSA9PT0gX3RoaXMuc3RhdGU7IH0pWzBdO1xyXG4gICAgfSxcclxuXHJcbiAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5DTE9TRUQ7IH0sXHJcbiAgICBvcGVuOiBmdW5jdGlvbigpIHsgdGhpcy5zdGF0ZSA9IHRoaXMuU3RhdGVzLk9QRU5FRDsgfSxcclxuICAgIGZsYWc6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlID0gdGhpcy5TdGF0ZXMuRkxBR0dFRDsgfSxcclxuICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlID0gdGhpcy5TdGF0ZXMuTUlORUQ7IH0sXHJcblxyXG4gICAgaXNDbG9zZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuQ0xPU0VEOyB9LFxyXG4gICAgaXNPcGVuOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUgPT09IHRoaXMuU3RhdGVzLk9QRU5FRDsgfSxcclxuICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlID09PSB0aGlzLlN0YXRlcy5GTEFHR0VEOyB9LFxyXG4gICAgaXNNaW5lZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlID09PSB0aGlzLlN0YXRlcy5NSU5FRDsgfSxcclxuXHJcbiAgICB0b0pTT046IGZ1bmN0aW9uKCkgeyByZXR1cm4geyByb3c6IHRoaXMucm93LCBjZWxsOiB0aGlzLmNlbGwsIHN0YXRlOiB0aGlzLnN0YXRlLCBkYW5nZXI6IHRoaXMuZGFuZ2VyIH0gfSxcclxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGU7IH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU3F1YXJlOyJdfQ==
;