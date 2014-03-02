
function Emitter() {
    this._events = {};
}

Emitter.prototype = {
    constructor: Emitter,
    on: function(event, fn) {
        var _this = this;
        event.split(/\s+/g).forEach(function(e) {
            _this._events[e] = _this._events[e] || [];
            _this._events[e].push(fn);
        });
    },
    off: function(event, fn) {
        var _this = this;
        event.split(/\s+/g).forEach(function(e) {
            if (_this._events[e] !== false)
                _this._events[e].splice(_this._events[e].indexOf(fn), 1);
        });
    },
    trigger: function(event /*, data... [varargs] */) {
        if (this._events[event] !== false)
            for (var i=0, len=this._events[event].length; i < len; ++i)
                this._events[event][i].apply(this, [].slice.call(arguments, 1));
    }
};

module.exports = Emitter;