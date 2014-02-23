
// need a queue to push +1, -4, &c.
// only push on `nextSignificantUnit` of time (delayed update), based on number of squares/default countdown...or gameWin/gameOver...then final score reconciliation
// one method of giving points for opening squares: 1 - (userMoves / number of unmined squares at game start) * 10 ...for end of game score reconciliation

function Scorekeeper() {

}

Scorekeeper.prototype = {

};

module.exports = Scorekeeper;