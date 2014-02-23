
// need a queue to push +1, -4, &c.
// only push on `nextSignificantUnit` of time (delayed update), based on number of squares/default countdown...or gameWin/gameOver...then final score reconciliation
// one method of giving points for opening squares: 1 - (userMoves / number of unmined squares at game start) * 10 ...for end of game score reconciliation

function Scorekeeper(gameboard) {
    this.q = [];
    this.final = [];
    this.score = 0;

    this.gameboard = gameboard;

    this.nsu = this._determineSignificantUnit();
    this.endGame = false; // if game is now over, flush queues

    this._initialize();
}

Scorekeeper.prototype = {
    _initialize: function() {
        // start the event loop, with nothing in it for now
        this._next(function() {});
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
    _flush: function(queue) {
        Array.isArray(queue) || (queue = [queue]);
        console.log("flushing...");
        var pts = queue.reduce(function(acc, score) { return acc += score; }, 0);
        this._next(function() { this.score += pts; });

        if (this.endGame && this.final.length > 0)
            this._flushFinal();

        this._updateDisplay();
    },
    _flushFinal: function() {
            console.log("flushing final queue...");
            var pts = this.final.reduce(function(acc, score) { return acc += score; }, 0);
            this._next(function() { this.score += pts; }, true);

            this.score += this._creditForOpeningSquares();
            this.score += this._creditForTimePassed();
    },
    _creditForOpeningSquares: function() {
        var moves = this.gameboard.userMoves,
            unmined = Math.pow(this.gameboard.dimensions, 2) - this.gameboard.mines;
        return 1 - (~~(moves / unmined) * 10);
    },
    _creditForTimePassed: function() {
        var total = this.gameboard.clock.initial,
            elapsed = this.gameboard.clock.seconds;
        return 100 - ~~(elapsed / total * 100);
    },
    _updateDisplay: function() {
        // update the scoreboard on the page here...
        console.log(":score => %o       [%o]", this.score, new Date);
    },
    _next: function(fn, isFinal) {
        if (this.loop)
            clearInterval(this.loop);

        if (this.endGame) {
            setInterval(fn.bind(this), 0);
            this._flush(this.final);
        } else
            this.loop = setInterval(fn.bind(this), isFinal ? 0 : this.nsu);
    },
    up: function(pts) { console.log("upping by %o", pts); this.q.push(+pts); },
    down: function(pts) {
        pts = +pts;
        console.log("downing by %o", pts);
        // make sure not decrementing below zero
        if ((this.score - pts) < 0)
            this.q.push(0);
        else
            this.q.push(-pts);
    },
    finalUp: function(pts) {
        console.log("final upping by %o", pts); this.final.push(+pts);
    },
    finalDown: function(pts) {
        pts = +pts;
        console.log("final downing by %o", pts);
        // make sure not decrementing below zero
        if ((this.score - pts) < 0)
            this.final.push(0);
        else
            this.final.push(-pts);
    },
    clear: function(isFullClear) {
        if (isFullClear) this.q.length = 0;
        this.score = 0;
    }
};

module.exports = Scorekeeper;