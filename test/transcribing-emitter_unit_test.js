var expect = require('chai').expect,
    Square = require('../js/square'),
    TranscribingEmitter = require('../js/transcribing-emitter');


describe("TranscribingEmitter",function(){
  var emitter,
      MOCK_EVENT = { target: { nodeName: "TD" } },
      MOCK_SQUARE = new Square(1, 2, 3),
      MOCK_TRANSCRIPT_ENTRY = '["click",{"target":{"nodeName":"TD"}},"$cell",{"row":1,"cell":2,"state":{"_flags":"1000"},"danger":3}]',
      CALLBACK = function(event, name, cell, square) { return this; };

  before(function(done){
    emitter = new TranscribingEmitter;
    done();
  });

  it("should be able to register new callbacks to an event", function(){
    emitter.on('click', CALLBACK);
    expect(emitter._events.click.length).to.equal(1);
  });

  it("should be able to de-register new callbacks to an event", function(){
    emitter.off('click');
    expect(emitter._events.click.length).to.equal(0);
  });

  it("should be able to trigger new events (with optional data)", function(){
    emitter.trigger('click', MOCK_EVENT, "$cell", MOCK_SQUARE);
  });

  it("should keep a transcript of all event data for later replay or serialization", function() {
    var entry = emitter._transcripts[0];
    expect(emitter._transcripts.length).to.equal(1);
    entry.shift();
    expect(JSON.stringify(entry)).to.equal(MOCK_TRANSCRIPT_ENTRY);
  });


});