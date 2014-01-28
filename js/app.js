var Gameboard = require('./gameboard');

$(function(){

	// onkeyup when choosing gameboard dimensions,
	// neighboring input should mirror new value,
	// and total possible mineable squares (dimensions ^ 2 -1)
	// be filled into a <span> below.
	$("#dimensions").on('keyup', function() {
		var $this = $(this);

		// update the 'mirror' <input>...
		$('#dimensions-mirror').val($this.val());

		// ...and the possible number of mines.
		var mineableSpaces = function(dim) { return Math.pow(dim, 2) - 1; };
		$("#mine-count")
			.siblings(".advice")
			.find("span")
			.html(mineableSpaces($this.val()) + '.');
	});

	$("form").on("submit", function() {

    	window.gameboard = new Gameboard({
    		dimensions: $("#dimensions").val(),
    		mines: $("#mine-count").val()
    	}).render();

    	$("#options-card").hide();
    	$("#board-card").fadeIn();

    	return false;
	});

});

// set width/height of .square:
    // var newDim = ((0.95 * $(window).height()) + 66) / 20;
    // $('.square').css({ height: newDim, width: newDim });
// (0.95 * $(window).height() + 66) / this.dimensions
