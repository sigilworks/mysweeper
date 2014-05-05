# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Scorekeeper, Scoreboard, Timer, ConsoleRenderer, &c.
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
 - 'killer mine' flare effect.

 - separate grunt `watch` tasks, game code from test code (taking too long to bundle!)
 - create grunt :dist task to includes minification (but not normal `watch`)
 - add visible instructions: click/tap => open, right-click/tap-hold => flag/unflag
 - ^^ display appropriate instructions based on the `this.mobile` flag

## Bugs To Fix
 - move private methods out of prototype objects -- take advantage of modules' privacy!
 - fix broken unit tests on Scoreboard and Countdown