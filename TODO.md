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
 - light/dark themes


## Bugs To Fix
 - if you falsely a non-mined square, then unflag it, it has a danger index of 'x' (the flag char in icon font)
 - a custom 4x4 game w/3 mines...consistently only has 2 mines?!
 - why do some games not end when I've opened all squares, and flagged all mines?
