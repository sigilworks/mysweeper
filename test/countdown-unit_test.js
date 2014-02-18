var expect = require('chai').expect,
    sinon = require('sinon'),
    Countdown = require('../js/countdown');


describe("Countdown",function(){

  global.document = { getElementById: function(x){ return x; } };

  var clock,
      el = { charAt: function(){}, querySelector: function(){} },
      getDisplay = function(c) { return [ c.m1.innerHTML, c.m2.innerHTML, ':', c.s1.innerHTML, c.s2.innerHTML ].join(''); },
      TIME_IN_SECONDS = 70,
      TIME_DISPLAY = "01:10",
      TIME_RESET = "00:00";

  beforeEach(function(done){
    clock = new Countdown(TIME_IN_SECONDS, el);
    clock.el = { innerHTML: '' };
    clock.m1 = { innerHTML: '' };
    clock.m2 = { innerHTML: '' };
    clock.s1 = { innerHTML: '' };
    clock.s2 = { innerHTML: '' };
    done();
  });

  it("should render the initial display", function(){
    clock._renderInitial();
    expect(getDisplay(clock)).to.equal(TIME_DISPLAY);
  });

  // TODO: test #start, #stop async here

  it("should be able to reset its display", function() {
    clock._renderInitial();
    expect(getDisplay(clock)).to.equal(TIME_DISPLAY);
    clock.reset();
    expect(getDisplay(clock)).to.equal(TIME_RESET);
  });

});


/*
function Countdown(seconds, el) {}

Countdown.prototype = {
    _renderInitial: function() {},
    _toMinsSecs: function(secs) {},
    _setDisplay: function(mins, secs) {},
    _countdown: function() {},
    start: function() { this.freeze = false; this._countdown(); },
    stop: function() { this.freeze = true; },
    reset: function() { this._setDisplay(0, 0); }
};
*/