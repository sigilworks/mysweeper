
var Flippable = function(duration, wrapper) {
    if (!(this instanceof Flippable))
        return new Flippable(duration, wrapper);
    
    var nodeNameToTag = function(node) { return "<" + node + "/>"; },
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
            if (str = String(str).toLowerCase(), str && !!~tags.indexOf(str)) 
                return str;
        };
    
    return function() {
        this._flipDuration = +duration || 800,
        this._flipWrapper = verifyDOMNode(wrapper) || 'span';

        this._flip = function($el, content) {
            $el
                .wrapInner($(nodeNameToTag(this._flipWrapper)))
                .find(this.wrapper)
                .delay(this._flipDuration)
                .slideUp(this._flipDuration, function() { $(this).parent().html(content) });
        }
    };
};

module.exports = Flippable;