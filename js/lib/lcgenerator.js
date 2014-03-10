// Linear Congruential Generator: variant of a Lehman Generator
// based on LCG found here: https://gist.github.com/Protonk?page=4
var LinearCongruentialGenerator = (function(){
  "use strict;"
  // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
  // m is basically chosen to be large (as it is the max period)
  // and for its relationships to a and c
  function LinearCongruentialGenerator() {
      this.m = 4294967296;
      // a - 1 should be divisible by m's prime factors
      this.a = 1664525;
      // c and m should be co-prime
      this.c = 1013904223;
      this.seed = void 0;
      this.z = void 0;
      // initial priming of the generator, until later overriden
      this.setSeed();
  }
  LinearCongruentialGenerator.prototype = {
    constructor: LinearCongruentialGenerator,
    setSeed: function(val) { this.z = this.seed = val || Math.round(Math.random() * this.m); },
    getSeed: function() { return this.seed; },
    rand: function() {
      // define the recurrence relationship
      this.z = (this.a * this.z + this.c) % this.m;
      // return a float in [0, 1)
      // if z = m then z / m = 0 therefore (z % m) / m < 1 always
      return this.z / this.m;
    }
  };
  return LinearCongruentialGenerator;
})();

module.exports = LinearCongruentialGenerator;