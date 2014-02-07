var expect = require('chai').expect,
    Square = require('../js/square'),
    BitFlagFactory = require('../js/bit-flag-factory'),
    Symbols = require('../js/constants').Symbols,
    Flags = require('../js/constants').Flags;


describe("Square",function(){

  var FLAGS_ARRAY = [ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ],
      BitFlags = new BitFlagFactory(FLAGS_ARRAY),
      bf = new BitFlags,
      ROW = 2, CELL = 3, DANGER = 7, square;

  before(function(done){
    square = new Square(ROW, CELL, DANGER);
    done();
  });


  it("#getRow returns the row number the square is located in", function(){
    expect(square.getRow()).to.equal(ROW);
  });

  it("#getCell returns the cell number the square is located in", function(){
    expect(square.getCell()).to.equal(CELL);
  });

  it("#getDanger returns the danger index of the square", function(){
    expect(square.getDanger()).to.equal(DANGER);
  });

  it("#setDanger should set the danger index of the square", function(){
    expect(square.getDanger()).to.equal(DANGER);
    square.setDanger(1);
    expect(square.getDanger()).to.equal(1);
  });

  it("#getState returns an array of the various states of the square", function(){
    expect(square.getState().join()).to.equal('closed');
    square.flag(); square.mine();
    expect(square.getState().join()).to.equal('closed,flagged,mined');
  });

  it("#isClosed returns whether or not the square is closed", function(){
    expect(square.isClosed()).to.equal(true);
    square.open();
    expect(square.isClosed()).to.equal(false);
  });

  it("#isOpen returns whether or not the square is open", function(){
    expect(square.isOpen()).to.equal(true);
    square.close();
    expect(square.isOpen()).to.equal(false);
  });

  it("#isFlagged returns whether or not the square is flagged", function(){
    expect(square.isFlagged()).to.equal(true);
    square.unflag();
    expect(square.isFlagged()).to.equal(false);
  });

  it("#isMined returns whether or not the square is mined", function(){
    expect(square.isMined()).to.equal(true);
    square.state.unset(square.state.F_MINED);
    expect(square.isMined()).to.equal(false);
  });

  it("#isIndexed returns whether or not the square has a danger index", function(){
    expect(square.isIndexed()).to.equal(true);
    square.state.unset(square.state.F_INDEXED);
    expect(square.isIndexed()).to.equal(false);
  });

  it("#toJSON returns a JSON representation of the square's state", function(){
    var obj = { row: ROW, cell: CELL, state: { _flags: square.state.DEFAULT_STATE }, danger: 1 },
        JSON_STRING = JSON.stringify(obj);
    expect(JSON.stringify(square.toJSON())).to.equal(JSON_STRING);
  });

  it("#toString returns a symbol representing the square's state, ideal for debugging via console", function(){
    expect(square.toString()).to.equal("x");
  });

});