# Things Left To Do

## Features or Components To Add
 - Unit tests on Gameboard, Countdown, and Scorer
 - Mines cannot number more than 1/3rd.
 - Use events transcript to replay?
 - set up scoring system and scoreboard
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

## Bugs To Fix
 - fix options card alignment and UI-related annoyances for mobile and smaller screens, &c.
 - fix double-counting of square openings due to mobile events simultaneously being triggered.