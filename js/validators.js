var $C = require('./constants'),

    // validation helper fns
    isNumeric = function(val) {
        return String(val).replace(/,/g, ''), (val.length !== 0 && !isNaN(+val) && isFinite(+val));
    },

    Validators = {
        BoardDimensions: {
            validate: function(dim) {
                // is numeric input
                if (!isNumeric(dim)) {
                    throw new ValidationError("User entered {0}, which is not a number, and an invalid board dimension.", dim);
                    return false;
                }
                // is not greater than MAX_DIMENSIONS constant
                if (!(dim <= $C.MAX_GRID_DIMENSIONS)) {
                    throw new ValidationError("User entered {0}, which is greater than the game's maximum grid dimensions", +dim);
                    return false;
                }
                // else...
                return true;
            }
        },
        MineCount: {
            validate: function(mines, maxPossible) {
                console.log("mines: %o, maxPossible: %o", mines, maxPossible)
                // is numeric input
                if (!isNumeric(mines)) {
                    throw new ValidationError("User entered {0}, which is not a number, and an invalid number of mines.", mines);
                    return false;
                }
                // is not greater than maxPossible for this configuration
                if (mines > maxPossible) {
                    throw new ValidationError("User entered {0}, which is greater than the possible number of mines ({1}).", +mines, maxPossible);
                    return false;
                }
                // else...
                return true;
            }
        }
};

module.exports = Validators;


/*  -------------------------------------------------------------------------------------------  */
// ERRORS AND EXCEPTIONS

function MysweeperError() {
    var args = [].slice.call(arguments),
        RGX_REPLACEMENT_TOKENS = /\{(\d+)\}/g,
        extendMessage = function(str, args) {
            return (str || '').replace(RGX_REPLACEMENT_TOKENS, function(_, index) { return args[+index] || ''; });
        };
  this.message = extendMessage(args[0], args.slice(1));
  this.name = 'MysweeperError';
  Error.call(this, this.message);
}
MysweeperError.prototype = new Error();
MysweeperError.prototype.constructor = MysweeperError;


function ValidationError() {
  MysweeperError.apply(this, arguments);
  this.name = 'ValidationError';
}
ValidationError.prototype = new MysweeperError();
ValidationError.prototype.constructor = ValidationError;