"use strict";

// do a non-destructive merging of any number of
// javascript hashes/objects
function _extend(base, others) {
	if (!others) return base;

	var args = [].slice.call(arguments, 2),
		_copy = function(old, newer) {
			var keys = Object.keys(newer),
				i = keys.length;
			while (i--)
				old[keys[i]] = newer[keys[i]];
			return old;
		},
		ret = _copy({}, base);

	args.concat(others)
		.forEach(function(other) { ret = _copy(ret, other); });

	return ret;
}

module.exports._extend = _extend;