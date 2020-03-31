"use strict";
// scrolltracker.tsx
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
var ScrollTracker = function (_a) {
    var top = _a.top, left = _a.left, offset = _a.offset, listsize = _a.listsize, styles = _a.styles;
    var trackdata = offset + 1 + "/" + listsize;
    var styleRef = react_1.useRef(Object.assign({
        top: top + 'px',
        left: left + 'px',
        position: 'fixed',
        zIndex: 3,
        backgroundColor: 'white',
        border: '1px solid gray',
        borderRadius: '10px',
        fontSize: 'smaller',
        padding: '3px'
    }, styles === null || styles === void 0 ? void 0 : styles.scrolltracker));
    return react_1.default.createElement("div", { "data-name": 'scrolltracker', style: styleRef.current }, trackdata);
};
exports.default = ScrollTracker;
//# sourceMappingURL=scrolltracker.js.map