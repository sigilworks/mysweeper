var expect = require('chai').expect,
    MineLayer = require('../js/minelayer'),
    LinearCongruentialGenerator = require('../js/lib/lcgenerator');


describe("MineLayer",function(){
  var mlayer,
      MINES = 12,
      DIMENSIONS = 10;

  before(function(done){
    mlayer = new MineLayer(MINES, DIMENSIONS);
    done();
  });

  it("should return an array of cell positions for locating mines", function(){
    var squaresCount = Math.pow(DIMENSIONS, 2),
        reductions = Math.max.apply(Math, mlayer.map(function(pair) { return pair[0] * pair[1]; }));
    expect(mlayer.length).to.equal(MINES);
    expect(reductions).to.be.below(squaresCount);
  });

});