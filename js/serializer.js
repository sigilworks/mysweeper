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