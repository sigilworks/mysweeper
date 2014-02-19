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

  it.skip("should return an array of cell positions for locating mines", function(){

  });

});


/* 
function MineLayer(mines, dimensions) {
    this.generator = new LinearCongruentialGenerator;
    this.mines = +mines || 0;
    this.dimensions = +dimensions || 0;

    var rands = [],
        _this = this,
        getRandomNumber = function() { return _this.generator.rand() * (Math.pow(_this.dimensions, 2)) | 0; };

    for (var i=0; i < mines; ++i) {
        var rnd = getRandomNumber();
        if (!~rands.indexOf(rnd))
            rands.push(rnd);
        // ...otherwise, give it another go-'round:
        else {
            mines++;
            continue;
        }
    }
    this.locations = rands.map(function(rnd) {
        var row = ~~(rnd / dimensions),
            cell = rnd % dimensions;
        return [ row, cell ];
    });
    return this.locations;
}
*/