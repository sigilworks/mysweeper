function Scoreboard(score, el) {
    this.score = score || 0;
    this.initial = score;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);

    this.H = this.el.querySelector('#sc1');
    this.T = this.el.querySelector('#sc2');
    this.O = this.el.querySelector('#sc3');

    this.update(this.initial);
}

Scoreboard.prototype = {
    constructor: Scoreboard,
    update: function(points) {
        var pts = toStringArray(points);
        this.H.innerHTML = pts[0];
        this.T.innerHTML = pts[1];
        this.O.innerHTML = pts[2];
    }
};

module.exports = Scoreboard;

function toStringArray(num) {
    var num = String(num),
        len = num.length,
        DIGITS_MAX = 3,
        OUT_OF_RANGE = "999";
    // too big for *this* scoreboard...
    if (len > DIGITS_MAX) num = OUT_OF_RANGE, len = OUT_OF_RANGE.length;
    return [ num[len - 3] || "0", num[len - 2] || "0", num[len - 1] || "0" ];
}