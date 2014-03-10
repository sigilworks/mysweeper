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
 - break up CSS so that light/dark themes could be easily extracted
 - replace bespoke mocks with Sinon equivs in tests for Countdown and TranscribingEmitter.
 - 'card flip' effect when revealing squares, and 'killer mine' flare.
 - complete serialization/deserialization process
 - consider use of Fisher-Yates shuffler to distribute mines

 - alter :flippable to take an options hash
 - add uglify, compression, gzip to build process
 - clean up flash message strings and refactor from raw strings of HTML.

## Bugs To Fix
 - move private methods out of prototype objects -- take advantage of modules' privacy!
 - fix broken unit tests on Scoreboard and Countdown