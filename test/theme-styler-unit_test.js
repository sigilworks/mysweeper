var expect = require('chai').expect,
    ThemeStyler = require('../js/theme-styler');


describe("ThemeStyler",function(){

  var styler,
  	  theme = "DARK",
  	  classname = "dark";

  beforeEach(function(done){
    styler = ThemeStyler;
    done();
  });

  it("should add the proper theme class to the document body", function() {
  	expect($(document.body).hasClass(classname)).to.be.false;
  	styler.set(theme);
    expect($(document.body).hasClass(classname)).to.be.true;
    expect($(document.body).attr('class')).to.equal(classname);
  });

});