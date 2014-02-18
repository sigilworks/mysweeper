# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Countdown, and Scorer
 - Mines cannot number more than 1/3rd.
 - Serialize state to JSON or JSON64 to be persisted?
 - Use events transcript to replay?
 - set up scoring system and scoreboard
 - way to re-start game after win/loss
 - Easter eggs: "hinting" for mine locations on key combo
 - Autosize squares based on browser display:
 	```
    // (0.95 * $(window).height() + 66) / this.dimensions
    // $('.square').css({ height: newDim, width: newDim });
    ```
 - emergency escape and restore - close tab w/o ending game first, saved to LocalStorage, rehydrates on return
 - break up CSS so that light/dark themes could be easily extracted
 - replace bespoke mocks with Sinon equivs in tests for Countdown and TranscribingEmitter.

## Bugs To Fix
 - a custom 4x4 game w/3 mines...consistently only has 2 mines?!
 - ensure random numbers are unique so that number of mines will be correct!