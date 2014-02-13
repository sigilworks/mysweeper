var Emitter = require('./emitter'),
    util = require('util');

function TranscribingEmitter() {
    Emitter.call(this);
    this._transcripts = [];
}

TranscribingEmitter.prototype = Object.create(Emitter.prototype);
TranscribingEmitter.prototype.constructor = TranscribingEmitter;

TranscribingEmitter.prototype.__trigger__ = TranscribingEmitter.prototype.trigger;
TranscribingEmitter.prototype.trigger = function(event /*, data... [varargs] */) {
    var args = [].slice.call(arguments);
    this.__trigger__.apply(this, args);
    this._transcripts.push([ +new Date, event ].concat(args.slice(1)));
};

module.exports = TranscribingEmitter;