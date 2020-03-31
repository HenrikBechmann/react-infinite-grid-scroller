"use strict";
// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importStar(require("react"));
var requestidlecallback_1 = require("requestidlecallback");
var react_is_mounted_hook_1 = __importDefault(require("react-is-mounted-hook"));
var placeholder_1 = __importDefault(require("./placeholder"));
var ItemShell = function (props) {
    var orientation = props.orientation, cellHeight = props.cellHeight, cellWidth = props.cellWidth, index = props.index, observer = props.observer, callbacks = props.callbacks, getItem = props.getItem, listsize = props.listsize, placeholder = props.placeholder;
    var _a = react_1.useState(null), content = _a[0], saveContent = _a[1];
    var _b = react_1.useState(null), error = _b[0], saveError = _b[1];
    var _c = react_1.useState({
        overflow: 'hidden',
    }), styles = _c[0], saveStyles = _c[1];
    var shellRef = react_1.useRef(null);
    var isMounted = react_is_mounted_hook_1.default();
    // initialize
    react_1.useEffect(function () {
        var itemrequest = { current: null };
        var requestidlecallback = window['requestIdleCallback'] ? window['requestIdleCallback'] : requestidlecallback_1.requestIdleCallback;
        var cancelidlecallback = window['cancelIdleCallback'] ? window['cancelIdleCallback'] : requestidlecallback_1.cancelIdleCallback;
        if (getItem) {
            itemrequest = requestidlecallback(function () {
                var value = getItem(index);
                if (value && value.then) {
                    value.then(function (value) {
                        if (isMounted()) {
                            saveContent(value);
                            saveError(null);
                        }
                    }).catch(function (e) {
                        saveContent(null);
                        saveError(e);
                    });
                }
                else {
                    if (isMounted()) {
                        if (value) {
                            saveContent(value);
                            saveError(null);
                        }
                        else {
                            saveError(true);
                            saveContent(null);
                        }
                    }
                }
            });
        }
        return function () {
            var requesthandle = itemrequest.current;
            cancelidlecallback(requesthandle);
        };
    }, []);
    // initialize
    react_1.useEffect(function () {
        var localcalls = callbacks.current;
        localcalls.getElementData && localcalls.getElementData(getElementData(), 'register');
        return (function () {
            localcalls.getElementData && localcalls.getElementData(getElementData(), 'unregister');
        });
    }, [callbacks]);
    react_1.useEffect(function () {
        observer.observe(shellRef.current);
        return function () {
            observer.unobserve(shellRef.current);
        };
    }, [observer]);
    react_1.useEffect(function () {
        var newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles);
        saveStyles(newStyles);
    }, [orientation, cellHeight, cellWidth]);
    // cradle ondemand callback parameter value
    var getElementData = react_1.useCallback(function () {
        return [index, shellRef];
    }, []);
    // placeholder handling
    var customholderRef = react_1.useRef(placeholder ? react_1.default.createElement(placeholder, { index: index, listsize: listsize }) : null);
    return react_1.default.createElement("div", { ref: shellRef, "data-index": index, style: styles }, styles.width ?
        content ?
            content : customholderRef.current ?
            customholderRef.current : react_1.default.createElement(placeholder_1.default, { index: index, listsize: listsize, error: error })
        : null);
}; // ItemShell
var getShellStyles = function (orientation, cellHeight, cellWidth, styles) {
    var styleset = Object.assign({}, styles);
    if (orientation == 'horizontal') {
        styleset.width = cellWidth ? (cellWidth + 'px') : 'auto';
        styleset.height = 'auto';
    }
    else if (orientation === 'vertical') {
        styleset.width = 'auto';
        styleset.height = cellHeight ? (cellHeight + 'px') : 'auto';
    }
    return styleset;
};
exports.default = ItemShell;
//# sourceMappingURL=itemshell.js.map