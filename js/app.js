var Gameboard = require('./gameboard');

$(function(){


	// handle form data here...


    window.gameboard = new Gameboard({ dimensions: 9, mines: 27 }).render();

});

// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions
