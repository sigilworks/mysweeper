# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Countdown, Scorekeeper, Scoreboard, TranscriptionStrategy, &c.
 - Use events transcript to replay?
 - Easter eggs: "hinting" for mine locations on key combo
 - Autosize squares based on browser display:
    ```
    // (0.95 * $(window).height() + 66) / this.dimensions
    // $('.square').css({ height: newDim, width: newDim });
    ```
 - emergency escape and restore - close tab w/o ending game first, saved to LocalStorage, rehydrates on return
 - replace bespoke mocks with Sinon equivs in tests for Countdown and TranscribingEmitter.
 - complete serialization/deserialization process
 - consider use of Fisher-Yates shuffler to distribute mines
 - 'card flip' effect when revealing squares, and 'killer mine' flare.

## Bugs To Fix
 - move private methods out of prototype objects -- take advantage of modules' privacy!
 - fix broken unit tests on Scoreboard and Countdown
 - mine count display should have separate chips for each digit like score and timer.

 ```
    Card flip effect:
    .container              { height: 75px; perspective: 600; position: relative; width: 75px; }
    .sq                     { height: 100%; position: absolute; -webkit-transform-style: preserve-3d;
                              -webkit-transition: all 1s ease-in-out; width: 100%;
                              border: 3px solid rgba(51,51,51,0.75); }
    .sq .face               { backface-visibility: hidden; height: 100%; position: absolute;
                              width: 100%; background: #777; }
    .sq .danger             { -webkit-transform: rotateY(180deg); background: #FCE9A5; }

    $(".sq").click(function() {
        $(this).css({
            "webkitTransform": "rotateY(180deg)",
            "webkitTransition": "all 1s ease-in-out"
        });
    });
 ```