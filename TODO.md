# Things Left To Do

 - Unit tests on Gameboard, Countdown, and Scorer
 - Mines cannot number more than 1/3rd.
 - Serialize state to JSON or JSON64 to be persisted?
 - Use events transcript to replay?
 - set up scoring system and scoreboard
 - way to re-start game after win/loss
 - Easter eggs: "hinting" for mine locations on key combo
 - Autosize squares based on browser display:
    // (0.95 * $(window).height() + 66) / this.dimensions
    // $('.square').css({ height: newDim, width: newDim });
 - emergency escape hatch - close tab w/o ending game first, saved to LocalStorage, rehydrates on return
 - light/dark themes
