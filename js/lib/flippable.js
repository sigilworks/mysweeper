"use strict;"

var Flippable = function(settings) {
    if (!(this instanceof Flippable))
        return new Flippable(settings);

    var options = { duration: 0, wrapper: 'span' };
    for (var s in settings)
        if (settings.hasOwnProperty(s))
            options[s] = settings[s];

    var nodeNameToTag = function(node) { return "<" + node + " />"; },
        verifyDOMNode = function(str) {
            var tags = "a,abbr,acronym,address,applet,area,article,aside,audio,"
                + "b,base,basefont,bdi,bdo,bgsound,big,blink,blockquote,body,br,button,"
                + "canvas,caption,center,cite,code,col,colgroup,content,data,datalist,dd,"
                + "decorator,del,details,dfn,dir,div,dl,dt,element,em,embed,fieldset,figcaption,"
                + "figure,font,footer,form,frame,frameset,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,"
                + "i,iframe,img,input,ins,isindex,kbd,keygen,label,legend,li,link,listing,"
                + "main,map,mark,marquee,menu,menuitem,meta,meter,nav,nobr,noframes,noscript,object,"
                + "ol,optgroup,option,output,p,param,plaintext,pre,progress,q,rp,rt,ruby,s,samp,script,"
                + "section,select,shadow,small,source,spacer,span,strike,strong,style,sub,summary,sup,"
                + "table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,tt,u,ul,var,video,wbr,xmp";
            return (str = String(str).toLowerCase(), str && !!~tags.indexOf(str)) ? str : 'span';
        };

    return function() {
        this._flipDuration = +options.duration,
        this._flipWrapper = verifyDOMNode(options.wrapper);

        this._flip = function($el, content) {
            if ($el.html() !== content) {
                $el
                    .wrapInner($(nodeNameToTag(this._flipWrapper)))
                    .find(this._flipWrapper)
                    .delay(this._flipDuration)
                    .slideUp(this._flipDuration, function() { $(this).parent().html(content) });
            }
        }
    };
};

module.exports = Flippable;