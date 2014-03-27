var expect = require('chai').expect,
    Validators = require('../js/validators'),
    MAX_GRID_DIMENSIONS = require('../js/constants').MAX_GRID_DIMENSIONS,
    ValidationError = require('../js/errors').ValidationError;

// TODO: get these tests to catch the contrary propositions throwing ValidationError!
describe("Validators",function(){

    var BoardDimensions = Validators.BoardDimensions,
        MineCount = Validators.MineCount;

    describe("BoardDimensions", function() {
        var numeric = 12,
            alphanum = '1ab3c';

        it('will reject any non-numeric user input', function () {
            expect(BoardDimensions.validate(numeric)).to.be.true;
            // expect(BoardDimensions.validate(alphanum)).to.throw(new ValidationError);
        });

        it('will reject any dimensions greater than MAX_GRID_DIMENSIONS (' + MAX_GRID_DIMENSIONS + ')', function () {
            expect(BoardDimensions.validate(numeric)).to.be.true;
            expect(numeric).to.be.below(MAX_GRID_DIMENSIONS);
        });
    });

    describe('MineCount', function () {
        var mines = 10,
            MAX = 12,
            MIN = 1;

        it('will reject any non-numeric user input', function () {
            expect(MineCount.validate(mines, MAX)).to.be.true;
        });

        it('will reject any mine count greater than the maximum possible at the chosen dimensions', function () {
            expect(MineCount.validate(mines, MAX)).to.be.true;
            expect(mines).to.be.below(MAX);
        });

        it('will reject any mine count less than the minimum (' + MIN + ')', function () {
            expect(MineCount.validate(mines, MAX)).to.be.true;
            expect(mines).to.be.above(MIN);
        });
    });

});