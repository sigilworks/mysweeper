var expect = require('chai').expect,
    Multimap = require('../js/lib/multimap'),
    Square = require('../js/square'),
    DefaultTranscriptionStrategy = require('../js/transcription-strategy');


describe("DefaultTranscriptionStrategy",function(){

    var strategy = DefaultTranscriptionStrategy,
        square = new Square(0, 0, 0, '0001'),
        map = new Multimap,
        $td = $("<tr id='row0'><td class='cell0 mined closed'></td></tr>").find('td'),

        SQ_TRANSCRIPT = [ 'sq:open',  square, $td ],
        GB_TRANSCRIPT = [ 'gb:start', map ],

        SQ_POST_STRATEGY = '["sq:open","{\\"row\\":0,\\"cell\\":0,\\"state\\":{\\"_flags\\":\\"0001\\"},\\"danger\\":0}","tr#row0 td.closed.mined.cell0"]',
        GB_POST_STRATEGY = '["gb:start","{\\"_table\\":[[[{\\"row\\":0,\\"cell\\":0,\\"state\\":{\\"_flags\\":\\"0001\\"},\\"danger\\":0}]]]}"]';

    map.set(0, [square]);

    it("should be able to process a Square-based event", function() {
        var result = strategy.apply(SQ_TRANSCRIPT),
            timestamp = result.shift();
        expect(timestamp).to.be.a('number');
        expect(result).to.be.an('array');
        expect(JSON.stringify(result)).to.equal(SQ_POST_STRATEGY);
    });

    it("should be able to process a Gameboard-based event", function() {
        var result = strategy.apply(GB_TRANSCRIPT),
            timestamp = result.shift();

        console.log("timestamp: %o\nresult: %o", timestamp, result);

        expect(timestamp).to.be.a('number');
        expect(result).to.be.an('array');
        expect(JSON.stringify(result)).to.equal(GB_POST_STRATEGY);
    });

});
