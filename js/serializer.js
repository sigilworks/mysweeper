var Serializer = {
    export: function(gameboard) {
        return {
            _meta: {
                timestamp: +new Date,
                score: null,
                timer: gameboard.clock.seconds,
                transcripts: gameboard.emitter._transcripts || []
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
                userMoves: gameboard.userMoves
            }
        };
    }
}

module.exports = Serializer;


/*  -------------------------------------------------------------------------------------------  */
/*BOARD:
    [
        [
            [
                {"row":0,"cell":0,"state":{"_flags":"1000"},"danger":0},
                {"row":0,"cell":1,"state":{"_flags":"1000"},"danger":1},
                {"row":0,"cell":2,"state":{"_flags":"0010"}},
                {"row":0,"cell":3,"state":{"_flags":"1000"},"danger":1}
            ]
        ],
        [
            [
                {"row":1,"cell":0,"state":{"_flags":"1000"},"danger":0},
                {"row":1,"cell":1,"state":{"_flags":"1000"},"danger":2},
                {"row":1,"cell":2,"state":{"_flags":"1000"},"danger":2},
                {"row":1,"cell":3,"state":{"_flags":"1000"},"danger":2}
            ]
        ],
        [
            [
                {"row":2,"cell":0,"state":{"_flags":"1000"},"danger":1},
                {"row":2,"cell":1,"state":{"_flags":"1000"},"danger":2},
                {"row":2,"cell":2,"state":{"_flags":"0010"}},
                {"row":2,"cell":3,"state":{"_flags":"1000"},"danger":1}
            ]
        ],
        [
            [
                {"row":3,"cell":0,"state":{"_flags":"0010"}},
                {"row":3,"cell":1,"state":{"_flags":"1000"},"danger":2},
                {"row":3,"cell":2,"state":{"_flags":"1000"},"danger":1},
                {"row":3,"cell":3,"state":{"_flags":"1000"},"danger":1}
            ]
        ]
    ]
*/