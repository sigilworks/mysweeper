var Emitter = require('./lib/emitter'),
    util = require('util');

function TranscribingEmitter() {
    Emitter.call(this);
    this._transcripts = [];
}

TranscribingEmitter.prototype = Object.create(Emitter.prototype);
TranscribingEmitter.prototype.constructor = TranscribingEmitter;

TranscribingEmitter.prototype.__trigger__ = TranscribingEmitter.prototype.trigger;
TranscribingEmitter.prototype.trigger = function(/* data... [varargs] */) {
    var args = [].slice.call(arguments);

    console.log("[TranscribingEmitter: 16]\targs: %o", args);
    this.__trigger__.apply(this, args);

    // standard Square-based event
    if (args.length === 3) {
        // 0: event name, 1: Square instance, 2: jQuery-wrapped DOM element
        if (args[1].constructor.name === "Square")
            args[1] = JSON.stringify(args[1]);
        if (args[2] instanceof jQuery)
            args[2] = buildDOMString(args[2]);
    }
    args.unshift(+new Date);
    this._transcripts.push(args);
};

function buildDOMString($el) {
    var node = $el instanceof jQuery ? $el[0] : $el,
        SORT_FN_CELL_FIRST = function(a,b) { return (a === 'cell' || b ==='cell' || a > b) ? 1 : (a < b) ? -1 : 0; };
    return node.parentNode.tagName.toLowerCase()
        + "#" + node.parentNode.id + " "
        + node.tagName.toLowerCase() + "."
        + node.className.split(' ')
        .sort(SORT_FN_CELL_FIRST)
        .join('.');
}

module.exports = TranscribingEmitter;