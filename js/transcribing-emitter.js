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
    // send original params to the subscribers...
    console.warn("ARGS: %o", args);
    this.__trigger__.apply(this, args);
    // ...then alter the params for the transcript's records
    // args[0] is the event name:
    switch (args[0]) {
        case "sq:open":
        case "sq:close":
        case "sq:flag":
        case "sq:unflag":
        case "sq:mine":
            // standard Square-based event
            // 0: event name, 1: Square instance, 2: jQuery-wrapped DOM element
            if (args[1].constructor.name === "Square")
                args[1] = JSON.stringify(args[1]);
            if (args[2] instanceof jQuery)
                args[2] = buildDOMString(args[2]);
            break;
        case "gb:start":
        case "gb:end:win":
        case "gb:end:over":
            // standard Gameboard-based event
            if (args[1].constructor.name === "Multimap")
                args[1] = JSON.stringify(args[1]);
            break;
    }
    // prefix array contents with the current timestamp as its key
    args.unshift(+new Date);
    this._transcripts.push(args);
};

module.exports = TranscribingEmitter;


// Takes a <td> DOM node, and converts it to a
// string descriptor, e.g., "tr#row0 td.cell0.mined.closed".
function buildDOMString($el) {
    var node = $el instanceof jQuery ? $el[0] : $el,
        // sorts class names, putting the "cellX" class first
        SORT_FN_CELL_FIRST = function(a, b) {
            function incipit(str) { return str.substring(0, "cell".length).toLowerCase(); };
            return (incipit(a) === "cell" || incipit(b) === "cell" || a > b) ? 1 : (a < b) ? -1 : 0;
        };
    return node.parentNode.tagName.toLowerCase()
        + "#" + node.parentNode.id + " "
        + node.tagName.toLowerCase() + "."
        + node.className.split(' ')
        .sort(SORT_FN_CELL_FIRST)
        .join('.');
}
