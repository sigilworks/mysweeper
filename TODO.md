# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Countdown, Scorekeeper, Scoreboard, TranscriptionStrategy, &c.
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
 
 - refactor scoreboard, countdown, mine counter to use :flippable mixin (e.g., Flippable(800, "span").call(Scoreboard.prototype);)
 - alter :flippable to take an options hash
 - extract MINEABLE_SPACES_MULTIPLIER from apps.js into constants.js, and lower it to 0.33
 - use the pragma "use strict;" everywhere
 - extract a Timer class from Countdown, add it to "./lib", and use Countdown like Scoreboard—both implementing :flippable interface. 
 - Timer class should have option to count up vs. down
 - clean this up BitFlagFactory#pad. Take out that DEFAULT_STATE comment, move all var declarations into first 1/3 of for-comprehension. 

## Bugs To Fix
 - move private methods out of prototype objects -- take advantage of modules' privacy!
