var expect = require('chai').expect,
    sinon = require('sinon'),
    Countdown = require('../js/countdown');


describe("Countdown",function(){

  global.document = { getElementById: function(x){ return x; } };

  var clock,
      el = '#countdown',
      getDisplay = function(c) { return [ c.$m1[0].innerHTML, c.$m2[0].innerHTML, ':', c.$s1[0].innerHTML, c.$s2[0].innerHTML ].join(''); },
      TIME_DISPLAY = "02:22";

  beforeEach(function(done){
    clock = new Countdown(el);
    clock.$el = $('<span id="countdown"><span id="m1" class="timer minutes">0</span>'
      + '<span id="m2" class="timer minutes">2</span><span class="colon">:</span>'
      + '<span id="s1" class="timer seconds">2</span><span id="s2" class="timer seconds">2</span></span>');
    clock.$m1 = clock.$el.find('#m1');
    clock.$m2 = clock.$el.find('#m2');
    clock.$s1 = clock.$el.find('#s1');
    clock.$s2 = clock.$el.find('#s2');
    done();
  });

  it("should be able to display and update its value", function() {
    expect(getDisplay(clock)).to.equal(TIME_DISPLAY);
  });

  it("implements the Flippable interface", function() {
    expect(clock).to.respondTo('_flip');
  });

});