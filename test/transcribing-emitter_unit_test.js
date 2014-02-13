var expect = require('chai').expect,
    TranscribingEmitter = require('../js/transcribing-emitter');


describe("TranscribingEmitter",function(){
  var emitter;

  beforeEach(function(done){
    emitter = new TranscribingEmitter;
    done();
  });

  it.skip("should be able to register new callbacks to an event", function(){

  });

  it.skip("should be able to de-register new callbacks to an event", function(){

  });

  it.skip("should be able to trigger new events (with optional data)", function(){

  });


});


/*
function TranscribingEmitter() {
    Emitter.call(this);
    this._transcripts = [];
}

TranscribingEmitter.prototype = Object.create(Emitter.prototype);

TranscribingEmitter.prototype.__trigger__ = TranscribingEmitter.prototype.trigger;
TranscribingEmitter.prototype.trigger = function(event) {
    var args = [].slice.call(arguments);
    this.__trigger__.apply(this, args);
    this._transcripts.push([ +new Date, event ].concat(args.slice(1)));
};
*/