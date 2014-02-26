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
 - clean up flash message strings and refactor from raw strings of HTML.

## Bugs To Fix
 - fix options card alignment and UI-related annoyances for mobile and smaller screens, &c.
 - fix lazy-loading symbol font by putting black mine symbol in header menu
 - move private methods out of prototype objects -- take advantage of modules' privacy!
 - in options card, make sure the other radio button isn't disabled when its panel is.


var sum = function(x,y) { return x + y; },
	getDangerIndex = function(sq) { if (sq.isOpen() && +sq.getDanger() > 0) return sq.getDanger(); },
	isFlagged = function(sq) { return sq.isFlagged(); },

	hasIndex = this.getSquares().map(getDangerIndex).filter(Boolean),
	indexedSum = hasIndex.reduce(sum);