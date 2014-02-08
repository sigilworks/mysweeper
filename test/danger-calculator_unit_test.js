var expect = require('chai').expect,
    DangerCalculator = require('../js/danger-calculator'),
    Multimap = require('../js/multimap'),
    PresetSetups = require('../js/constants').PresetSetups,
    Square = require('../js/square');


describe("DangerCalculator",function(){
  var calc, board,
      populateBoard = function(board) {
        var populateRow = function(row, squares) {
            var ret = [];
            for (var i=0; i < squares; ++i)
                ret[i] = new Square(row, i);
            return ret;
          },
          dimensions = PresetSetups.BEGINNER.dimensions;

        for (var i=0; i < dimensions; ++i)
          board.set(i, populateRow(i, dimensions));
      };


  beforeEach(function(done){
    gameboard = {
      board: new Multimap,
      getSquareAt: function(row, cell) {
        var row = this.board.get(row);
        return (row && row[0] && row[0][cell]) ? row[0][cell] : null;
      }
    };
    populateBoard(gameboard.board);

    var minedSquare = gameboard.getSquareAt(4, 1);
    minedSquare.mine();

    calc = new DangerCalculator(gameboard);
    done();
  });

  it("should have a reference to a gameboard", function(){
    expect(gameboard.board).to.be.an.instanceof(Multimap);
    expect(gameboard.board).to.not.be.null;
  });

  it("should have coordinates for accessing neighborhood cells", function() {
    expect(Object.keys(calc.neighborhood).length).to.equal(8);
  });

  it("should be able to calculate the danger index of the squares in the neighborhood of any other", function() {
    var INDEX_1 = [ [3,0], [3,1], [3,2], [4,0], [4,2], [5,0], [5,1], [5,2] ],
        INDEX_0 = [ [3,3], [4,3], [5,3] ],
        minedSquare = gameboard.getSquareAt(4, 1);

    INDEX_1.forEach(function(pair) {
      var square = gameboard.getSquareAt(pair[0], pair[1]);
      if (!square.isMined()) square.setDanger(calc.forSquare(pair[0], pair[1]));
      expect(square.getDanger()).to.equal(1);
    });

    INDEX_0.forEach(function(pair) {
      var square = gameboard.getSquareAt(pair[0], pair[1]);
      if (!square.isMined()) square.setDanger(calc.forSquare(pair[0], pair[1]));
      expect(square.getDanger()).to.equal(0);
    });

    expect(minedSquare.getDanger()).to.not.equal(1);

  });

});