"use strict";
// scrollblock.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importStar(require("react"));
var viewport_1 = require("./viewport");
var Scrollblock = function (_a) {
    var children = _a.children, listsize = _a.listsize, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, gap = _a.gap, padding = _a.padding, orientation = _a.orientation, component = _a.component, styles = _a.styles;
    // -------------------------[ context and state ]-------------------------
    var viewportData = react_1.useContext(viewport_1.ViewportContext);
    var _b = react_1.useState('prepare'), blockstate = _b[0], setBlockState = _b[1];
    // -----------------------------------[ data heap ]-------------------------
    var scrollBlockLengthRef = react_1.useRef(null);
    var scrollblockRef = react_1.useRef(null);
    var divlinerstyleRef = react_1.useRef(Object.assign({
        backgroundColor: 'white',
        position: 'relative',
    }, styles === null || styles === void 0 ? void 0 : styles.cradle));
    var _c = react_1.useState(divlinerstyleRef.current), divlinerstyle = _c[0], saveDivlinerstyle = _c[1]; // to trigger render
    var viewportDimensions = viewportData.viewportDimensions, itemobserver = viewportData.itemobserver, isResizing = viewportData.isResizing;
    var top = viewportDimensions.top, right = viewportDimensions.right, bottom = viewportDimensions.bottom, left = viewportDimensions.left, width = viewportDimensions.width, height = viewportDimensions.height;
    // state engine
    react_1.useEffect(function () {
        switch (blockstate) {
            case 'prepare': {
                setBlockState('render');
                break;
            }
        }
    }, [blockstate]);
    react_1.useLayoutEffect(function () {
        updateBlockLength();
        divlinerstyleRef.current = updateScrollblockStyles(orientation, divlinerstyleRef, scrollBlockLengthRef);
        saveDivlinerstyle(divlinerstyleRef.current);
    }, [
        orientation,
        height,
        width,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ]);
    var updateBlockLength = react_1.useCallback(function () {
        var scrollblocklength = calcScrollblockLength({
            listsize: listsize,
            cellHeight: cellHeight,
            cellWidth: cellWidth,
            gap: gap,
            padding: padding,
            orientation: orientation,
            viewportheight: height,
            viewportwidth: width,
        });
        scrollBlockLengthRef.current = scrollblocklength;
    }, [
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
        orientation,
        height,
        width,
    ]);
    return (blockstate != 'prepare')
        ? react_1.default.createElement("div", { ref: scrollblockRef, style: divlinerstyleRef.current }, children)
        : null;
}; // Scrollblock
// all the parameters affect the length
var calcScrollblockLength = function (_a) {
    var listsize = _a.listsize, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, gap = _a.gap, padding = _a.padding, orientation = _a.orientation, viewportheight = _a.viewportheight, viewportwidth = _a.viewportwidth;
    // dependents of orientation
    var crosslength;
    var cellLength;
    var viewportcrosslength;
    if (orientation == 'vertical') {
        crosslength = cellWidth + gap;
        cellLength = cellHeight + gap;
        viewportcrosslength = viewportwidth;
    }
    else {
        crosslength = cellHeight + gap;
        cellLength = cellWidth + gap;
        viewportcrosslength = viewportheight;
    }
    // adjustments to viewportcrosslength
    viewportcrosslength -= (padding * 2);
    viewportcrosslength += gap;
    var crosscount = Math.floor(viewportcrosslength / crosslength);
    var listlength = Math.ceil(listsize / crosscount);
    var straightlength = (listlength * cellLength) - ((listlength > 0) ? gap : 0) + (padding * 2);
    return straightlength;
};
var updateScrollblockStyles = function (orientation, stylesRef, scrollblocklengthRef) {
    var localstyles = Object.assign({}, stylesRef.current);
    if (orientation == 'horizontal') {
        localstyles.height = '100%';
        localstyles.width = scrollblocklengthRef.current + 'px';
    }
    else if (orientation == 'vertical') {
        localstyles.height = scrollblocklengthRef.current + 'px';
        localstyles.width = '100%';
    }
    return localstyles;
};
exports.default = Scrollblock;
//# sourceMappingURL=scrollblock.js.map