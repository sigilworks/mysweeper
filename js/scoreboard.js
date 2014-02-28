function Scoreboard(score, el) {
    this.score = score || 0;
    this.initial = score;
    this.el = document.getElementById(el.charAt(0) === '#' ? el.substring(1) : el);
    this.$el = $(el);

    this.$L = this.$el.find('#sc1');
    this.$M = this.$el.find('#sc2');
    this.$R = this.$el.find('#sc3');

    this.update(this.initial);
}

Scoreboard.prototype = {
    constructor: Scoreboard,
    _increment: function($chip, newval) {
        var FX_DURATION = 800;

        $chip.wrapInner("<span/>")
             .find("span")
             .slideUp({
                duration: FX_DURATION,
                queue: 'scoreboard',
                done: function() { $(this).parent().html(newval).delay(400, 'scoreboard'); }
             });
    },
    update: function(points) {
        var pts = toStringArray(points);
        this._increment(this.$R, pts[2]);
        this._increment(this.$M, pts[1]);
        this._increment(this.$L, pts[0]);
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