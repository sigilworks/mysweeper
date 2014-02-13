var expect = require('chai').expect,
    sinon = require('sinon'),
    Countdown = require('../js/countdown');


describe("Countdown",function(){
  var clock;

  beforeEach(function(done){
    /*clock = new Countdown(70, '#countdown');
    clock.el = sinon.stub;
    clock.m1 = sinon.stub;
    clock.m2 = sinon.stub;
    clock.s1 = sinon.stub;
    clock.s2 = sinon.stub;*/
    done();
  });

  it("should render the initial display", function(){

  });

});



/*function Countdown(seconds, el) {
    this.seconds = seconds;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);

    this.m1 = this.el.querySelector('#m1');
    this.m2 = this.el.querySelector('#m2');
    this.s1 = this.el.querySelector('#s1');
    this.s2 = this.el.querySelector('#s2');

    this.freeze = false;
}

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