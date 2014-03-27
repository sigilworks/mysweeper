var expect = require('chai').expect,
    sinon = require('sinon'),
    MinesDisplay = require('../js/mines-display');


describe("MinesDisplay",function(){

  global.document = { getElementById: function(x){ return x; } };

  var md,
      MINES = 123,
      el = "<div><span class='minecounter'>1</span><span class='minecounter'>2</span><span class='minecounter'>3</span></div>",
      getDisplay = function(md) { return [ md.$L[0].innerHTML, md.$M[0].innerHTML, md.$R[0].innerHTML ].join(''); };

  beforeEach(function(done){
    md = new MinesDisplay(MINES, el);
    done();
  });

  it("should render the number of mines", function(){ expect(getDisplay(md)).to.equal("123"); });

});
