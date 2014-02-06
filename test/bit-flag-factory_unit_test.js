var expect = require('chai').expect,
    Flags = require('../js/constants').Flags,
    BitFlagFactory = require('../js/bit-flag-factory');

// 1. test the BitFlagFactory...
// 2. ...then test the BitFlags object it produces.
// BitFlags = new BitFlagFactory([ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ]);
// BitFlags-------
//     _flags
// has(flag)
// set(flag)
// unset(flag)
// BitFlags.withDefaults(defs) => new BitFlags(defs)
// flags on proto (inst.FLAGNAME)
// DEFAULT_STATE on proto

describe('BitFlagFactory',function(){
  var BitFlags, bf;

  before(function(done){
    BitFlags = new BitFlagFactory([ Flags.OPEN, Flags.MINED, Flags.FLAGGED, Flags.INDEXED ]);
    bf = new BitFlags;
    done();
  });

  it('should have a (private) `_flags` property',function(){
    expect(bf._flags).to.equal('0000');
    expect(bf._flags).to.equal(bf.DEFAULT_STATE);
  });
});


