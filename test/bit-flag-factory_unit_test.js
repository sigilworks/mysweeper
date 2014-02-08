var expect = require('chai').expect,
    Flags = require('../js/constants').Flags,
    BitFlagFactory = require('../js/bit-flag-factory');


describe("BitFlagFactory",function(){
  var BitFlags,
      bf,
      FLAGS_ARRAY = [ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ];

  beforeEach(function(done){
    BitFlags = new BitFlagFactory(FLAGS_ARRAY);
    bf = new BitFlags;
    done();
  });

  it("should have a (private) `_flags` property", function(){
    expect(bf._flags).to.equal("0000");
    expect(bf._flags).to.equal(bf.DEFAULT_STATE);
  });

  it("should have a DEFAULT_STATE property based on its number of flags", function() {
    expect(bf._flags.length).to.equal(bf.DEFAULT_STATE.length);
  });

  it("should have the flags passed to factory's constructor available on the prototype", function() {
    FLAGS_ARRAY.forEach(function(flag, idx) {
      expect(bf[String(flag)]).to.equal(Math.pow(2, idx));
    });
  });

  it("can set the value of a flag", function() {
    bf.set(bf.F_MINED);
    expect(bf._flags).to.equal("0010");
  });

  it("can unset the value of a flag", function() {
    bf.set(bf.F_MINED);
    expect(bf._flags).to.equal("0010");
    bf.unset(bf.F_MINED);
    expect(bf._flags).to.equal("0000");
  });

  it("can test the value of a flag", function() {
    expect(bf.has(bf.F_MINED)).to.be.false;
    bf.set(bf.F_MINED);
    expect(bf.has(bf.F_MINED)).to.be.true;
    bf.unset(bf.F_MINED);
    expect(bf.has(bf.F_MINED)).to.be.false;
  });

});


