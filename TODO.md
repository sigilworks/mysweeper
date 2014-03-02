# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Countdown, and Scorer
 - Mines cannot number more than 1/3rd.
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
 - clean up flash message strings and refactor from raw strings of HTML.
 - Move emitter switch statement to a TranscriptionStrategy class (exports.TranscriptionStrategy, DefaultTranscriptionStrategy)
 - extract point values for scoring into Constants file

## Bugs To Fix
 - move private methods out of prototype objects -- take advantage of modules' privacy!