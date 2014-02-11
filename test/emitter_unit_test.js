var expect = require('chai').expect
    Emitter = require('../js/emitter');


describe("Emitter",function(){
  var emitter;

  beforeEach(function(done){
    emitter = new Emitter;
    done();
  });

  it.skip("should be able to register new callbacks to an event", function(){

  });

  it.skip("should be able to de-register new callbacks to an event", function(){

  });

  it.skip("should be able to de-register all events", function(){

  });

  it.skip("should be able to trigger new events (with optional data)", function(){

  });


});


/*function Emitter() {
    this._events = {};
}

Emitter.prototype = {
    on: function(event, fn) {
        this._events[event] = this._events[event] || [];
        this._events[event].push(fn);
    },
    off: function(event, fn) {
        if (this._events[event] !== false)
            this._events[event].splice(this._events[event].indexOf(fn), 1);
    },
    trigger: function(event /*, data... [varargs] *//*) {
        if (this._events[event] !== false)
            for (var i=0, len=this._events[event].length; i < len; ++i)
                this._events[event][i].apply(this, [].slice.call(arguments, 1));
    }
};
*/