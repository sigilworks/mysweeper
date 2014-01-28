

function BitFlags(isOpen, isMined, isFlagged, hasIndex) {
    this._flags = arguments.length > 0
        ? buildState([].slice.call(arguments))
        : this.DEFAULT_STATE;
}

function binToDec(str) { return parseInt(str, 2); }
function decToBin(num) { return num.toString(2); }
function buildState(arr) { return arr.map(function(param) { return String(+param); }).join(''); }
function pad(str, max) {
  max || (max = 4);
  var diff = max - str.length;
  for (var acc=[]; diff > 0; acc[--diff] = '0') {}
  return acc.join('') + str;
}


BitFlags.prototype = {
    F_OPEN:        1,
    F_MINED:       2,
    F_FLAGGED:     4,
    F_INDEX:       8,

    DEFAULT_STATE: '0000',

    _has: function(flag) { return !!(binToDec(this._flags) & flag); },
    _set: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) | flag)); },
    _remove: function(flag) { return this._flags = pad(decToBin(binToDec(this._flags) & ~flag)); },

    close: function() { this._remove(this.F_OPEN); },
    open: function() { this._set(this.F_OPEN); },
    flag: function() { this._set(this.F_FLAGGED); },
    unflag: function() { this._remove(this.F_FLAGGED); },
    mine: function() { this._set(this.F_MINED); },
    index: function() { this._set(this.F_INDEX); },

    isClosed: function() { return !this._has(this.F_OPEN); },
    isOpen: function() { return this._has(this.F_OPEN); },
    isFlagged: function() { return this._has(this.F_FLAGGED); },
    isMined: function() { return this._has(this.F_MINED); },
    hasIndex: function() { return this._has(this.F_INDEX); }
};

module.exports = BitFlags;