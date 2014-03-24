var expect = require('chai').expect,
    sinon = require('sinon'),
    MinesDisplay = require('../js/mines-display');


describe("MinesDisplay",function(){

  global.document = { getElementById: function(x){ return x; } };

  var md,
      MINES = 123,
      el = { charAt: function(){}, querySelector: function(){} },
      getDisplay = function(c) { return [ c.m1.innerHTML, c.m2.innerHTML, ':', c.s1.innerHTML, c.s2.innerHTML ].join(''); };

  beforeEach(function(done){
    md = new MinesDisplay(MINES, el);
    done();
  });

  it("should render the number of mines", function(){
    expect(getDisplay(md)).to.equal("123");
  });

});
