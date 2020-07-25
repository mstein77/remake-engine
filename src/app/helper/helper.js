function d(main, ...params) {
    let stack = null;
    try {
        throw new Error('myError');
    }
    catch(e) {
        stack = e.stack.split('\n');
    }
    const func = [];
    let no = 0;
    for (let line of stack) {
        const pos = no;
        no++;
        if (pos <= 1) {
            continue;
        } else if (pos === 2) {
            func.push(line.trim());
            continue;
        } else if (pos > 6) {
            break;
        }
        line = line.split('(');
        func.push(line[0].substr(6).trim());
    }
    console.group('Debug ' + func.join(' <- '));
    console.log(main, ...params);
    console.groupEnd();
    return main;
}

function getItemsCloneWithUpdatedItem(oldItems, index, props) {
    const newItems = [...oldItems];
    newItems[index] = Object.assign({}, oldItems[index], props);
    return newItems;
}

function hex2rgb(hex) {
    const color = {};
    if (hex[0] === '#') {
        if (hex.length === 7) {
            color.r = parseInt(hex.substr(1, 2), 16);
            color.g = parseInt(hex.substr(3, 2), 16);
            color.b = parseInt(hex.substr(5, 2), 16);
            return color;
        }
    }
    return null;
}

function rgb2hex(rgb) {
    if (typeof rgb === 'string') {
        return rgb;
    }
    return '#' + (rgb.r).toString(16) + (rgb.g).toString(16) + (rgb.b).toString(16);
}

export {
    d,
    hex2rgb,
    rgb2hex,
    getItemsCloneWithUpdatedItem
}