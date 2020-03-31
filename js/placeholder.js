"use strict";
// placeholder.tsx
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
var Placeholder = function (_a) {
    var index = _a.index, listsize = _a.listsize, error = _a.error;
    var stylesRef = react_1.useRef({
        position: 'relative',
        boxSizing: 'border-box',
        backgroundColor: 'cyan',
        border: '2px solid black',
        height: '100%',
        width: '100%'
    });
    var itemStylesRef = react_1.useRef({
        position: 'absolute',
        top: 0,
        left: 0,
        padding: '3px',
        opacity: .5,
        borderRadius: '8px',
        backgroundColor: 'white',
        margin: '3px',
        fontSize: 'smaller',
    });
    return react_1.default.createElement("div", { style: stylesRef.current }, !error ?
        react_1.default.createElement("div", { style: itemStylesRef.current },
            index + 1,
            "/",
            listsize) :
        react_1.default.createElement("div", { style: itemStylesRef.current }, "item is not available at this time"));
};
exports.default = Placeholder;
//# sourceMappingURL=placeholder.js.map