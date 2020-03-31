"use strict";
// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible portal of the list being shown
*/
var react_1 = __importStar(require("react"));
exports.ViewportContext = react_1.default.createContext(null);
// control constant
var RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = 250;
var Viewport = function (_a) {
    // -----------------------[ initialize ]------------------
    var children = _a.children, orientation = _a.orientation, cellWidth = _a.cellWidth, cellHeight = _a.cellHeight, gap = _a.gap, padding = _a.padding, component = _a.component, styles = _a.styles;
    // processing state
    var _b = react_1.useState('prepare'), portstate = _b[0], setPortState = _b[1];
    // data heap
    var timeoutidRef = react_1.useRef(null);
    var viewportdivRef = react_1.useRef(undefined);
    var resizeScrollPosRef = react_1.useRef({ top: 0, left: 0 });
    var divlinerstyleRef = react_1.useRef(Object.assign({
        position: 'absolute',
        height: '100%',
        width: '100%',
        overflow: 'auto',
        backgroundColor: 'red',
    }, styles === null || styles === void 0 ? void 0 : styles.viewport));
    var resizeTimeridRef = react_1.useRef(null);
    var isResizingRef = react_1.useRef(false);
    var viewportDataRef = react_1.useRef(null);
    // initialize
    react_1.useEffect(function () {
        window.addEventListener('resize', onResize);
        return function () {
            window.removeEventListener('resize', onResize);
        };
    }, []);
    // event listener callback
    var onResize = react_1.useCallback(function () {
        if (!isResizingRef.current) {
            isResizingRef.current = true;
            // below is a realtime message to cradle.onScroll
            // to stop updating the referenceIndexData, and to the item observer to stop
            // triggering responses (anticipating reset of cradle content based on resize)
            viewportDataRef.current.isResizing = true;
            resizeScrollPosRef.current = {
                top: viewportdivRef.current.scrollTop,
                left: viewportdivRef.current.scrollLeft
            };
            setPortState('resizing');
        }
        clearTimeout(resizeTimeridRef.current);
        resizeTimeridRef.current = setTimeout(function () {
            isResizingRef.current = false;
            setPortState('resize');
        }, RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE);
    }, []);
    // ----------------------------------[ calculate ]--------------------------------
    // calculated values
    divlinerstyleRef.current = react_1.useMemo(function () {
        var mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding);
        var styles = __assign({}, divlinerstyleRef.current);
        if (orientation == 'vertical') {
            styles.minWidth = mincrosslength + 'px';
            styles.minHeight = 'auto';
        }
        else {
            styles.minWidth = 'auto';
            styles.minHeight = mincrosslength + 'px';
        }
        return styles;
    }, [orientation, cellWidth, cellHeight, padding]);
    var viewportClientRect;
    if (viewportdivRef.current) {
        viewportClientRect = viewportdivRef.current.getBoundingClientRect();
    }
    else {
        viewportClientRect = {};
    }
    var top = viewportClientRect.top, right = viewportClientRect.right, bottom = viewportClientRect.bottom, left = viewportClientRect.left;
    // set context data for children
    viewportDataRef.current = react_1.useMemo(function () {
        var width, height, localViewportData;
        if (!(top === undefined)) { //proxy
            width = (right - left);
            height = (bottom - top);
            localViewportData = {
                viewportDimensions: { top: top, right: right, bottom: bottom, left: left, width: width, height: height },
                elementref: viewportdivRef,
                isResizing: isResizingRef.current,
            };
        }
        return localViewportData;
    }, [orientation, top, right, bottom, left, isResizingRef.current]);
    // --------------------[ state processing ]---------------------------
    react_1.useEffect(function () {
        switch (portstate) {
            case 'prepare':
            case 'resize': {
                setPortState('render');
                break;
            }
        }
    }, [portstate]);
    // ----------------------[ render ]--------------------------------
    return react_1.default.createElement(exports.ViewportContext.Provider, { value: viewportDataRef.current },
        react_1.default.createElement("div", { style: divlinerstyleRef.current, ref: viewportdivRef }, (portstate != 'prepare') ? children : null));
}; // Viewport
// establish minimum width/height for the viewport -- approximately one item
var calcMinViewportCrossLength = function (orientation, cellWidth, cellHeight, padding) {
    var crosslength, cellLength;
    if (orientation == 'vertical') {
        cellLength = cellWidth;
    }
    else {
        cellLength = cellHeight;
    }
    crosslength = cellLength + (padding * 2);
    return crosslength;
};
exports.default = Viewport;
//# sourceMappingURL=viewport.js.map