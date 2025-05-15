// most of it is in background.js


function loadImage(imageLink, color) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;
            document.body.append(canvas);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(this, 0, 0);
            const iconAsString = canvas.toDataURL("image/png", "");
            // look for a color
            const borderC = getBorderColor(ctx);

            let foundColor;
            if (borderC) foundColor = borderC;
            else if (color) foundColor = color;
            else foundColor = getAverageColor(this);
            resolve({ image: iconAsString, color: foundColor });
        };
        img.onerror = reject;
        img.src = imageLink;
    });
}

let backgroundColorThief;
function getAverageColor(image) {
    if (!backgroundColorThief) backgroundColorThief = new BackgroundColorTheif()
    try {
        var lightness = (c, n) => c.map(d => (d += n) < 0 ? 0 : d > 255 ? 255 : d | 0);
        var rgb = backgroundColorThief.getBackGroundColor(image);
        return 'rgb(' + lightness(rgb, 30).join(',') + ')';
    } catch (e) {
        console.error(e);
        return null;
    }
}

function getBorderColor(ctx) {
    var width = ctx.canvas.width - 1;
    var height = ctx.canvas.height - 1;
    var colors = {};
    var deduce = function (arr) {
        for (var i = 0; i < arr.length; i += 4) {
            var address = (arr[i + 3] < 1) ? 'alpha' : `${arr[i]},${arr[i + 1]},${arr[i + 2]}`;
            var val = colors[address];
            colors[address] = val == undefined ? 0 : val + 1;
        }
    };
    deduce(ctx.getImageData(0, 0, width, 1).data);
    deduce(ctx.getImageData(width, 0, 1, height).data);
    deduce(ctx.getImageData(0, 0, 1, height).data);
    deduce(ctx.getImageData(0, height, width, 1).data);
    var topColor, topCount = 0;
    for (var color in colors) {
        if (colors[color] > topCount) topCount = colors[topColor = color];
    }
    if (topColor === 'alpha') return false;
    return `rgb(${topColor})`;
}