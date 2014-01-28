;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

function MiniEmitter() { this._events = {}; }
exports = MiniEmitter;

MiniEmitter.prototype = {
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

},{}],2:[function(require,module,exports){
var Emitter = require('./emitter');
console.log("Emitter: %o", new Emitter);

var Gameboard = (function(){

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
        this.dimensions = +options.dimensions;
        // the number of mines the user has selected
        this.mines = +options.mines;
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

    return Gameboard;
})();


var Square = (function(){

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

    return Square;
})();

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


/*  -------------------------------------------------------------------------------------------  */

$(function(){

    window.gameboard = new Gameboard({ dimensions: 9, mines: 27 }).render();

});

// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions

/*var MiniEmitter = (function(){
    function MiniEmitter() { this._events = {}; }
    MiniEmitter.prototype = {
        on: function(event, fn) {
            this._events[event] = this._events[event] || [];
            this._events[event].push(fn);
        },
        off: function(event, fn) {
            if (this._events[event] !== false)
                this._events[event].splice(this._events[event].indexOf(fn), 1);
        },
        trigger: function(event /*, data... [varargs] *//*) {
            if (this._events[event] !== false)
                for (var i=0, len=this._events[event].length; i < len; ++i)
                    this._events[event][i].apply(this, [].slice.call(arguments, 1));
        }
    };
    return MiniEmitter;
})();*/
},{"./emitter":1}]},{},[2,1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOi9Vc2Vycy9JQk1fQURNSU4vZ2l0L215c3dlZXBlci9qcy9lbWl0dGVyLmpzIiwiQzovVXNlcnMvSUJNX0FETUlOL2dpdC9teXN3ZWVwZXIvanMvbXlzd2VlcGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJcclxuZnVuY3Rpb24gTWluaUVtaXR0ZXIoKSB7IHRoaXMuX2V2ZW50cyA9IHt9OyB9XHJcbmV4cG9ydHMgPSBNaW5pRW1pdHRlcjtcclxuXHJcbk1pbmlFbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgIG9uOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdID0gdGhpcy5fZXZlbnRzW2V2ZW50XSB8fCBbXTtcclxuICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgfSxcclxuICAgIG9mZjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnNwbGljZSh0aGlzLl9ldmVudHNbZXZlbnRdLmluZGV4T2YoZm4pLCAxKTtcclxuICAgIH0sXHJcbiAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8pIHtcclxuICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXRoaXMuX2V2ZW50c1tldmVudF0ubGVuZ3RoOyBpIDwgbGVuOyArK2kpXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdW2ldLmFwcGx5KHRoaXMsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XHJcbiAgICB9XHJcbn07XHJcbiIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyJyk7XHJcbmNvbnNvbGUubG9nKFwiRW1pdHRlcjogJW9cIiwgbmV3IEVtaXR0ZXIpO1xyXG5cclxudmFyIEdhbWVib2FyZCA9IChmdW5jdGlvbigpe1xyXG5cclxuICAgIGZ1bmN0aW9uIEdhbWVib2FyZChvcHRpb25zKSB7XHJcbiAgICAgICAgLy8gdGhlIG1hcCwgc2VydmluZyBhcyB0aGUgaW50ZXJuYWwgcmVwcmVzZW5hdGlvbiBvZiB0aGUgZ2FtZWJvYXJkXHJcbiAgICAgICAgdGhpcy5ib2FyZCA9IHtcclxuICAgICAgICAgICAgX3RhYmxlOiBbXSxcclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbihyb3cpIHsgcmV0dXJuIHRoaXMuX3RhYmxlW3Jvd107IH0sXHJcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24ocm93LCB2YWwpIHsgKHRoaXMuX3RhYmxlW3Jvd10gfHwgKHRoaXMuX3RhYmxlW3Jvd10gPSBbXSkpLnB1c2godmFsKTsgfSxcclxuICAgICAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24oZm4pIHsgcmV0dXJuIFtdLmZvckVhY2guY2FsbCh0aGlzLnZhbHVlcygpLCBmbik7IH0sXHJcbiAgICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3RhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ocm93KSB7IHJldHVybiBfdGhpcy5fdGFibGVbcm93XTsgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGFjYywgaXRlbSkgeyByZXR1cm4gYWNjLmNvbmNhdChpdGVtKTsgfSwgW10pO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24oKSB7IHRoaXMuX3RhYmxlID0ge307IH0sXHJcbiAgICAgICAgICAgIHNpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fdGFibGUpLmxlbmd0aDsgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgLy8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGJvYXJkIHdoZW4gcmVuZGVyZWRcclxuICAgICAgICB0aGlzLmRpbWVuc2lvbnMgPSArb3B0aW9ucy5kaW1lbnNpb25zO1xyXG4gICAgICAgIC8vIHRoZSBudW1iZXIgb2YgbWluZXMgdGhlIHVzZXIgaGFzIHNlbGVjdGVkXHJcbiAgICAgICAgdGhpcy5taW5lcyA9ICtvcHRpb25zLm1pbmVzO1xyXG4gICAgICAgIC8vIHRoZSBET00gZWxlbWVudCBvZiB0aGUgdGFibGUgc2VydmluZyBhcyB0aGUgYm9hcmRcclxuICAgICAgICB0aGlzLiRlbCA9ICQob3B0aW9ucy5ib2FyZCB8fCBcIiNib2FyZFwiKTtcclxuICAgICAgICAvLyB0aGUgb2JqZWN0IHRoYXQgY2FsY3VsYXRlcyB0aGUgbnVtYmVyIG9mIHN1cnJvdW5kaW5nIG1pbmVzIGF0IGFueSBzcXVhcmVcclxuICAgICAgICB0aGlzLmRhbmdlckNhbGMgPSBuZXcgRGFuZ2VyQ2FsY3VsYXRvcih0aGlzKTtcclxuICAgICAgICAvLyBjcmVhdGUgdGhlIGJvYXJkIGluIG1lbW9yeSBhbmQgYXNzaWduIHZhbHVlcyB0byB0aGUgc3F1YXJlc1xyXG4gICAgICAgIHRoaXMuX2xvYWRCb2FyZCgpO1xyXG4gICAgICAgIC8vIHJlbmRlciB0aGUgSFRNTCB0byBtYXRjaCB0aGUgYm9hcmQgaW4gbWVtb3J5XHJcbiAgICAgICAgdGhpcy5fcmVuZGVyR3JpZCgpO1xyXG4gICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgdXNlciBjbGlja3MgdG93YXJkcyB0aGVpciB3aW5cclxuICAgICAgICB0aGlzLnVzZXJNb3ZlcyA9IDA7XHJcbiAgICB9XHJcblxyXG4gICAgR2FtZWJvYXJkLnByb3RvdHlwZSA9IHtcclxuXHJcbiAgICAgICAgLy8gXCJQUklWQVRFXCIgTUVUSE9EUzpcclxuICAgICAgICBfbG9hZEJvYXJkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgLy8gMS4gcHJlZmlsbCBzcXVhcmVzIHRvIHJlcXVpcmVkIGRpbWVuc2lvbnMuLi5cclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcyxcclxuICAgICAgICAgICAgICAgIGRpbWVuc2lvbnMgPSB0aGlzLmRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICBtaW5lcyA9IHRoaXMubWluZXMsXHJcbiAgICAgICAgICAgICAgICBmaWxsUm93ID0gZnVuY3Rpb24ocm93LCBzcXVhcmVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IHNxdWFyZXM7ICsraSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0W2ldID0gbmV3IFNxdWFyZShyb3csIGkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXQ7XHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wOyBpIDwgZGltZW5zaW9uczsgKytpKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ib2FyZC5zZXQoaSwgZmlsbFJvdyhpLCBkaW1lbnNpb25zKSk7XHJcblxyXG4gICAgICAgICAgICAvLyAyLiBkZXRlcm1pbmUgcmFuZG9tIHBvc2l0aW9ucyBvZiBtaW5lZCBzcXVhcmVzLi4uXHJcbiAgICAgICAgICAgIHRoaXMuX2RldGVybWluZU1pbmVMb2NhdGlvbnMoZGltZW5zaW9ucywgbWluZXMpO1xyXG5cclxuICAgICAgICAgICAgLy8gMy4gcHJlLWNhbGN1bGF0ZSB0aGUgZGFuZ2VyIGluZGV4IG9mIGVhY2ggbm9uLW1pbmVkIHNxdWFyZS4uLlxyXG4gICAgICAgICAgICB0aGlzLl9wcmVjYWxjRGFuZ2VySW5kaWNlcygpO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHIEEgTSBFIEIgTyBBIFIgRFxcbiVvXCIsIHRoaXMudG9Db25zb2xlKCkpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIk0gSSBOIEUgIFAgTCBBIEMgRSBNIEUgTiBUIFNcXG4lb1wiLCB0aGlzLnRvQ29uc29sZSh0cnVlKSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBfcmVuZGVyR3JpZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIDEuIGxheW91dCB0aGUgSFRNTCA8dGFibGU+IHJvd3MuLi5cclxuICAgICAgICAgICAgdGhpcy5fY3JlYXRlSFRNTEdyaWQodGhpcy5kaW1lbnNpb25zKTtcclxuICAgICAgICAgICAgLy8gMi4gc2V0dXAgZXZlbnQgbGlzdGVuZXJzIHRvIGxpc3RlbiBmb3IgdXNlciBjbGlja3NcclxuICAgICAgICAgICAgdGhpcy5fc2V0dXBFdmVudExpc3RlbmVycygpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX2RldGVybWluZU1pbmVMb2NhdGlvbnM6IGZ1bmN0aW9uKGRpbWVuc2lvbnMsIG1pbmVzKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IG1pbmVzOyArK2kpIHtcclxuICAgICAgICAgICAgICAgIHZhciBybmQgPSBNYXRoLnJhbmRvbSgpICogKE1hdGgucG93KGRpbWVuc2lvbnMsIDIpKSB8IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcm93ID0gfn4ocm5kIC8gZGltZW5zaW9ucyksXHJcbiAgICAgICAgICAgICAgICAgICAgY2VsbCA9IHJuZCAlIGRpbWVuc2lvbnMsXHJcbiAgICAgICAgICAgICAgICAgICAgc3F1YXJlID0gdGhpcy5nZXRTcXVhcmVBdChyb3csIGNlbGwpO1xyXG4gICAgICAgICAgICAgICAgc3F1YXJlLm1pbmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX3ByZWNhbGNEYW5nZXJJbmRpY2VzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgdGhpcy5ib2FyZC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhY2MsIHZhbCkgeyByZXR1cm4gYWNjLmNvbmNhdCh2YWwuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiAhc3EuaXNNaW5lZCgpOyB9KSk7IH0sIFtdKVxyXG4gICAgICAgICAgICAgICAgLmZvckVhY2goZnVuY3Rpb24oc2FmZSkgeyBzYWZlLmRhbmdlciA9IF90aGlzLmRhbmdlckNhbGMuZm9yU3F1YXJlKHNhZmUuZ2V0Um93KCksIHNhZmUuZ2V0Q2VsbCgpKTsgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBfc2V0dXBFdmVudExpc3RlbmVyczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLm9uKHtcclxuICAgICAgICAgICAgICAgIGNsaWNrOiB0aGlzLl9oYW5kbGVDbGljay5iaW5kKHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgY29udGV4dG1lbnU6IHRoaXMuX2hhbmRsZVJpZ2h0Q2xpY2suYmluZCh0aGlzKVxyXG4gICAgICAgICAgICB9LCAndGQsIHRkID4gc3BhbicpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX3JlbW92ZUV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy4kZWwub2ZmKCdjbGljaywgY29udGV4dG1lbnUnLCAndGQsIHRkID4gc3BhbicpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX2NyZWF0ZUhUTUxHcmlkOiBmdW5jdGlvbihkaW1lbnNpb25zKSB7XHJcbiAgICAgICAgICAgIHZhciBncmlkID0gJyc7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MDsgaSA8IGRpbWVuc2lvbnM7ICsraSkge1xyXG4gICAgICAgICAgICAgICAgZ3JpZCArPSBcIjx0ciBpZD0ncm93XCIgKyBpICsgXCInPlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICsgIFtdLmpvaW4uY2FsbCh7IGxlbmd0aDogZGltZW5zaW9ucyArIDEgfSwgXCI8dGQ+PC90ZD5cIilcclxuICAgICAgICAgICAgICAgICAgICAgKyAgXCI8L3RyPlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZChncmlkKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIF9oYW5kbGVDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpICYmICFzcXVhcmUuaXNNaW5lZCgpICYmICFzcXVhcmUuaXNGbGFnZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgIHNxdWFyZS5vcGVuKCk7XHJcbiAgICAgICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnY2xvc2VkJykuYWRkQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlY3Vyc2l2ZVJldmVhbChzcXVhcmUpO1xyXG5cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChzcXVhcmUuaXNGbGFnZ2VkKCkpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhhbmRsZSBmbGFnZ2VkIHNpdHVhdGlvbi4uLlwiKVxyXG5cclxuICAgICAgICAgICAgZWxzZSBpZiAoc3F1YXJlLmlzTWluZWQoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYW1lT3ZlcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCQoJy5jbG9zZWQnKS5sZW5ndGggPT09IDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9nYW1lV2luKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBfaGFuZGxlUmlnaHRDbGljazogZnVuY3Rpb24oZXZlbnQpIHtcclxuICAgICAgICAgICAgdmFyICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCksXHJcbiAgICAgICAgICAgICAgICAkY2VsbCA9ICR0YXJnZXQucHJvcCgndGFnTmFtZScpLnRvTG93ZXJDYXNlKCkgPT09ICdzcGFuJyA/ICR0YXJnZXQucGFyZW50KCkgOiAkdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgc3F1YXJlID0gJGNlbGwuZGF0YSgnc3F1YXJlJyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnVzZXJNb3ZlcysrO1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCIkY2VsbDogJW8sIHNxdWFyZTogJW9cIiwgJGNlbGwsIHNxdWFyZSlcclxuICAgICAgICAgICAgaWYgKHNxdWFyZS5pc0Nsb3NlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBzcXVhcmUuZmxhZygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3F1YXJlKHNxdWFyZSk7XHJcbiAgICAgICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygnY2xvc2VkJykuYWRkQ2xhc3MoJ2ZsYWdnZWQnKTtcclxuXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3F1YXJlLmlzRmxhZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICBzcXVhcmUuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICRjZWxsLnJlbW92ZUNsYXNzKCdmbGFnZ2VkJykuYWRkQ2xhc3MoJ2Nsb3NlZCcpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBfcmVjdXJzaXZlUmV2ZWFsOiBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAgICAgLy8gYmFzZWQgb24gYHNvdXJjZWAgc3F1YXJlLCB3YWxrIGFuZCByZWN1cnNpdmVseSByZXZlYWwgY29ubmVjdGVkIHNwYWNlc1xyXG4gICAgICAgICAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMuZGFuZ2VyQ2FsYy5uZWlnaGJvcmhvb2QpLFxyXG4gICAgICAgICAgICAgICAgcm93ID0gc291cmNlLmdldFJvdygpLFxyXG4gICAgICAgICAgICAgICAgY2VsbCA9IHNvdXJjZS5nZXRDZWxsKCksXHJcbiAgICAgICAgICAgICAgICBfdGhpcyA9IHRoaXM7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmVydCA9IF90aGlzLmRhbmdlckNhbGMubmVpZ2hib3Job29kW2RpcmVjdGlvbl1bMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5kYW5nZXJDYWxjLm5laWdoYm9yaG9vZFtkaXJlY3Rpb25dWzFdLFxyXG4gICAgICAgICAgICAgICAgICAgIG5laWdoYm9yID0gX3RoaXMuZ2V0U3F1YXJlQXQocm93ICsgdmVydCwgY2VsbCArIGhvcml6KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgIW5laWdoYm9yLmlzTWluZWQoKSAmJiBuZWlnaGJvci5pc0Nsb3NlZCgpICYmIG5laWdoYm9yLmdldERhbmdlcigpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5laWdoYm9yLm9wZW4oKTtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5nZXRHcmlkQ2VsbChuZWlnaGJvcikucmVtb3ZlQ2xhc3MoJ2Nsb3NlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlY3Vyc2l2ZVJldmVhbChuZWlnaGJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX2dhbWVXaW46IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKTtcclxuICAgICAgICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ2dhbWUtd2luJyk7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkcgQSBNIEUgIFcgSSBOICEhIVwiKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIG1vdmVzOiAlb1wiLCB0aGlzLnVzZXJNb3ZlcylcclxuICAgICAgICB9LFxyXG4gICAgICAgIF9nYW1lT3ZlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIC8vIHJlc2V0IGV2ZXJ5dGhpbmdcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0U3F1YXJlcygpXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHNxKSB7IHJldHVybiBzcS5pc0ZsYWdnZWQoKTsgfSlcclxuICAgICAgICAgICAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGYpIHsgX3RoaXMuZ2V0R3JpZENlbGwoZikuZmluZCgnLmRhbmdlcicpLmh0bWwoZi5nZXREYW5nZXIoKSk7IH0pO1xyXG4gICAgICAgICAgICAvLyBvcGVuL3JldmVhbCBhbGwgc3F1YXJlc1xyXG4gICAgICAgICAgICAvLyBwdXQgdXAgJ0dhbWUgT3ZlcicgYmFubmVyXHJcbiAgICAgICAgICAgIHRoaXMuJGVsLmZpbmQoJy5taW5lZCcpLmFkZENsYXNzKCdyZXZlYWxlZCcpO1xyXG4gICAgICAgICAgICB0aGlzLiRlbC5maW5kKCcuY2xvc2VkLCAuZmxhZ2dlZCcpLnJlbW92ZUNsYXNzKCdjbG9zZWQgZmxhZ2dlZCcpLmFkZENsYXNzKCdvcGVuJyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHIEEgTSBFICBPIFYgRSBSICEhIScpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgX3JlbmRlclNxdWFyZTogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgICAgIHZhciAkY2VsbCA9IHRoaXMuZ2V0R3JpZENlbGwoc3F1YXJlKSxcclxuICAgICAgICAgICAgICAgICRkYW5nZXJTcGFuID0gJCgnPHNwYW4gLz4nLCB7ICdjbGFzcyc6ICdkYW5nZXInLCBodG1sOiAoIXNxdWFyZS5pc01pbmVkKCkpID8gKHNxdWFyZS5pc0ZsYWdnZWQoKSkgPyAnJiM5ODczOycgOiBzcXVhcmUuZ2V0RGFuZ2VyKCkgOiAnJiM5ODgxOycgfSk7XHJcbiAgICAgICAgICAgIC8vIGRlY29yYXRlIDx0ZD4gd2l0aCBDU1MgY2xhc3NlcyBhcHByb3ByaWF0ZSB0byBzcXVhcmUncyBzdGF0ZVxyXG4gICAgICAgICAgICAkY2VsbC5yZW1vdmVDbGFzcygpXHJcbiAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzcXVhcmUnKVxyXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhzcXVhcmUuZ2V0U3RhdGUoKS50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICAgICAgLy8gaW5zZXJ0IGEgc3BhbiB3aXRoIHRoZSBkYW5nZXIgaW5kZXhcclxuICAgICAgICAgICAgJGNlbGwuZmluZCgnLmRhbmdlcicpXHJcbiAgICAgICAgICAgICAgICAgLnJlbW92ZSgpXHJcbiAgICAgICAgICAgICAgICAgLmVuZCgpXHJcbiAgICAgICAgICAgICAgICAgLmFwcGVuZCgkZGFuZ2VyU3Bhbik7XHJcbiAgICAgICAgICAgIC8vIGFkZCBzb21lIGRhdGEtKiBhdHRyaWJ1dGVzIHRvIHBhc3MgYWxvbmcgb24gY2xpY2sgZXZlbnRzXHJcbiAgICAgICAgICAgICRjZWxsLmRhdGEoJ3JvdycsIHNxdWFyZS5nZXRSb3coKSk7XHJcbiAgICAgICAgICAgICRjZWxsLmRhdGEoJ2NlbGwnLCBzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgICAgICAgICAgJGNlbGwuZGF0YSgnc3F1YXJlJywgc3F1YXJlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBcIlBVQkxJQ1wiIE1FVEhPRFNcclxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmdldFNxdWFyZXMoKS5mb3JFYWNoKHRoaXMuX3JlbmRlclNxdWFyZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICAgICAgLy8gcmV0dXJuIGB0aGlzYCwgc28gdGhpcyBtZXRob2QgY2FuIGJlIGNoYWluZWQgdG8gaXRzIGluaXRpYWxpemF0aW9uIGNhbGxcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRHcmlkQ2VsbDogZnVuY3Rpb24oc3F1YXJlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRlbFxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5kKCcjcm93JyArIHNxdWFyZS5nZXRSb3coKSlcclxuICAgICAgICAgICAgICAgICAgICAuZmluZCgndGQnKVxyXG4gICAgICAgICAgICAgICAgICAgIC5lcShzcXVhcmUuZ2V0Q2VsbCgpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFNxdWFyZUF0OiBmdW5jdGlvbihyb3csIGNlbGwpIHtcclxuICAgICAgICAgICAgdmFyIHJvdyA9IHRoaXMuYm9hcmQuZ2V0KHJvdyk7XHJcbiAgICAgICAgICAgIHJldHVybiAocm93ICYmIHJvd1swXSAmJiByb3dbMF1bY2VsbF0pID8gcm93WzBdW2NlbGxdIDogbnVsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFNxdWFyZXM6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ib2FyZFxyXG4gICAgICAgICAgICAgICAgICAgIC52YWx1ZXMoKVxyXG4gICAgICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oYWNjLCB2YWwpIHsgcmV0dXJuIGFjYy5jb25jYXQodmFsKTsgfSwgW10pXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgdG9KU09OOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKCkuam9pbignLCAnKTsgfSxcclxuICAgICAgICB0b0NvbnNvbGU6IGZ1bmN0aW9uKHdpdGhEYW5nZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYm9hcmQudmFsdWVzKClcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoZnVuY3Rpb24oc3RyLCByb3csIGlkeCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzeW1ib2xzID0gd2l0aERhbmdlciA/IHJvdy5tYXAoZnVuY3Rpb24oc3EpIHsgcmV0dXJuIHNxLmdldERhbmdlcigpIHx8ICcgJzsgfSkgOiByb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ciArPSBzeW1ib2xzLmpvaW4oJyAgICcpLnRvTG93ZXJDYXNlKCkgKyBcIiAgICAgICBbXCIgKyBpZHggKyBcIl1cXG5cIjtcclxuICAgICAgICAgICAgICAgIH0sICdcXG4nKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBHYW1lYm9hcmQ7XHJcbn0pKCk7XHJcblxyXG5cclxudmFyIFNxdWFyZSA9IChmdW5jdGlvbigpe1xyXG5cclxuICAgIGZ1bmN0aW9uIFNxdWFyZShyb3csIGNlbGwsIHN0YXRlLCBkYW5nZXIpIHtcclxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3F1YXJlKSlcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTcXVhcmUoYXJndW1lbnRzKTtcclxuICAgICAgICB0aGlzLnJvdyA9IHJvdztcclxuICAgICAgICB0aGlzLmNlbGwgPSBjZWxsO1xyXG4gICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZSB8fCB0aGlzLlN0YXRlcy5DTE9TRUQ7XHJcbiAgICAgICAgdGhpcy5kYW5nZXIgPSBkYW5nZXIgfHwgJy0nO1xyXG4gICAgfVxyXG5cclxuICAgIFNxdWFyZS5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgU3RhdGVzOiB7IENMT1NFRDogJ3gnLCBPUEVORUQ6ICdfJywgRkxBR0dFRDogJ2YnLCBNSU5FRDogJyonIH0sXHJcblxyXG4gICAgICAgIGdldFJvdzogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnJvdzsgfSxcclxuICAgICAgICBnZXRDZWxsOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuY2VsbDsgfSxcclxuICAgICAgICBnZXREYW5nZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5kYW5nZXI7IH0sXHJcbiAgICAgICAgZ2V0U3RhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5TdGF0ZXMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkgeyByZXR1cm4gX3RoaXMuU3RhdGVzW2tleV0gPT09IF90aGlzLnN0YXRlOyB9KVswXTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjbG9zZTogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5DTE9TRUQ7IH0sXHJcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5PUEVORUQ7IH0sXHJcbiAgICAgICAgZmxhZzogZnVuY3Rpb24oKSB7IHRoaXMuc3RhdGUgPSB0aGlzLlN0YXRlcy5GTEFHR0VEOyB9LFxyXG4gICAgICAgIG1pbmU6IGZ1bmN0aW9uKCkgeyB0aGlzLnN0YXRlID0gdGhpcy5TdGF0ZXMuTUlORUQ7IH0sXHJcblxyXG4gICAgICAgIGlzQ2xvc2VkOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGUgPT09IHRoaXMuU3RhdGVzLkNMT1NFRDsgfSxcclxuICAgICAgICBpc09wZW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuT1BFTkVEOyB9LFxyXG4gICAgICAgIGlzRmxhZ2dlZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnN0YXRlID09PSB0aGlzLlN0YXRlcy5GTEFHR0VEOyB9LFxyXG4gICAgICAgIGlzTWluZWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5zdGF0ZSA9PT0gdGhpcy5TdGF0ZXMuTUlORUQ7IH0sXHJcblxyXG4gICAgICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7IHJldHVybiB7IHJvdzogdGhpcy5yb3csIGNlbGw6IHRoaXMuY2VsbCwgc3RhdGU6IHRoaXMuc3RhdGUsIGRhbmdlcjogdGhpcy5kYW5nZXIgfSB9LFxyXG4gICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuc3RhdGU7IH1cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIFNxdWFyZTtcclxufSkoKTtcclxuXHJcbmZ1bmN0aW9uIERhbmdlckNhbGN1bGF0b3IoZ2FtZWJvYXJkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGJvYXJkOiBnYW1lYm9hcmQsXHJcbiAgICAgICAgbmVpZ2hib3Job29kOiB7XHJcbiAgICAgICAgICAgIC8vIGRpc3RhbmNlIGluIHN0ZXBzIGZyb20gdGhpcyBzcXVhcmU6XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgICB2ZXJ0LiBob3J6LlxyXG4gICAgICAgICAgICBOT1JUSDogICAgICBbICAxLCAgMCBdLFxyXG4gICAgICAgICAgICBOT1JUSEVBU1Q6ICBbICAxLCAgMSBdLFxyXG4gICAgICAgICAgICBFQVNUOiAgICAgICBbICAwLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSEVBU1Q6ICBbIC0xLCAgMSBdLFxyXG4gICAgICAgICAgICBTT1VUSDogICAgICBbIC0xLCAgMCBdLFxyXG4gICAgICAgICAgICBTT1VUSFdFU1Q6ICBbIC0xLCAtMSBdLFxyXG4gICAgICAgICAgICBXRVNUOiAgICAgICBbICAwLCAtMSBdLFxyXG4gICAgICAgICAgICBOT1JUSFdFU1Q6ICBbICAxLCAtMSBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmb3JTcXVhcmU6IGZ1bmN0aW9uKHJvdywgY2VsbCkge1xyXG4gICAgICAgICAgICBpZiAoK3JvdyA+PSAwICYmICtjZWxsID49IDApIHtcclxuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNaW5lcyA9IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKHRoaXMubmVpZ2hib3Job29kKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oZGlyZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZlcnQgPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaG9yaXogPSBfdGhpcy5uZWlnaGJvcmhvb2RbZGlyZWN0aW9uXVsxXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmVpZ2hib3IgPSBfdGhpcy5ib2FyZC5nZXRTcXVhcmVBdChyb3cgKyB2ZXJ0LCBjZWxsICsgaG9yaXopO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3IgJiYgbmVpZ2hib3IuaXNNaW5lZCgpKSB0b3RhbE1pbmVzKys7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0b3RhbE1pbmVzIHx8ICcnO1xyXG4gICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn1cclxuXHJcblxyXG4vKiAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAgKi9cclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHJcbiAgICB3aW5kb3cuZ2FtZWJvYXJkID0gbmV3IEdhbWVib2FyZCh7IGRpbWVuc2lvbnM6IDksIG1pbmVzOiAyNyB9KS5yZW5kZXIoKTtcclxuXHJcbn0pO1xyXG5cclxuLy8gc2V0IHdpZHRoL2hlaWdodCBvZiAuc3F1YXJlOlxyXG4gICAgLy8gdmFyIG5ld0RpbSA9ICgoMC45NSAqICQod2luZG93KS5oZWlnaHQoKSkgKyA2NikgLyAyMDtcclxuICAgIC8vICQoJy5zcXVhcmUnKS5jc3MoeyBoZWlnaHQ6IG5ld0RpbSwgd2lkdGg6IG5ld0RpbSB9KTtcclxuLy8gKDAuOTUgKiAkKHdpbmRvdykuaGVpZ2h0KCkgKyA2NikgLyB0aGlzLmRpbWVuc2lvbnNcclxuXHJcbi8qdmFyIE1pbmlFbWl0dGVyID0gKGZ1bmN0aW9uKCl7XHJcbiAgICBmdW5jdGlvbiBNaW5pRW1pdHRlcigpIHsgdGhpcy5fZXZlbnRzID0ge307IH1cclxuICAgIE1pbmlFbWl0dGVyLnByb3RvdHlwZSA9IHtcclxuICAgICAgICBvbjogZnVuY3Rpb24oZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSB0aGlzLl9ldmVudHNbZXZlbnRdIHx8IFtdO1xyXG4gICAgICAgICAgICB0aGlzLl9ldmVudHNbZXZlbnRdLnB1c2goZm4pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb2ZmOiBmdW5jdGlvbihldmVudCwgZm4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX2V2ZW50c1tldmVudF0gIT09IGZhbHNlKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW2V2ZW50XS5zcGxpY2UodGhpcy5fZXZlbnRzW2V2ZW50XS5pbmRleE9mKGZuKSwgMSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB0cmlnZ2VyOiBmdW5jdGlvbihldmVudCAvKiwgZGF0YS4uLiBbdmFyYXJnc10gKi8vKikge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fZXZlbnRzW2V2ZW50XSAhPT0gZmFsc2UpXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj10aGlzLl9ldmVudHNbZXZlbnRdLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1tldmVudF1baV0uYXBwbHkodGhpcywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIE1pbmlFbWl0dGVyO1xyXG59KSgpOyovIl19
;