var $C = require('./constants');

var ThemeStyler = {

	set: function(theme, $el) {
		$el || ($el = $($C.DefaultConfig.board));
		// using $el as anchor to the DOM, go up and
		// look for light.css or dark.css, and--if necessary--swap
		// it out for `theme`.
	}
};

module.exports = ThemeStyler;