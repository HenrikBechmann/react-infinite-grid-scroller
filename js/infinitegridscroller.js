"use strict";
// infinitegridscroller.tsx
// copyright (c) 2019 Henrik Bechmann, Toronto, Licence: MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var viewport_1 = __importDefault(require("./viewport"));
var scrollblock_1 = __importDefault(require("./scrollblock"));
var cradle_1 = __importDefault(require("./cradle"));
/*
    BACKLOG:
    - cache: none/preload/keepload
*/
// ===================================[ INITIALIZE ]===========================
/*
    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, which in turn contains the cradle
        - a component that contains displayed (or nearly displayed) items.
    The items are skeletons which contain the host content components.

    Scrollblock virtually represents the entirety of the list, and of course scrolls
    Cradle contains the list items, and is 'virtualiized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by ItemShell, managed by Cradle

    Overall the infinitegridscroller manages the often asynchronous interactions of the
    components of the mechanism
*/
var InfiniteGridScroller = function (props) {
    var _a, _b, _c, _d, _e, _f;
    var orientation = props.orientation, // vertical or horizontal
    gap = props.gap, // space between grid cells, not including the leading and trailing edges
    padding = props.padding, // the space between the items and the viewport, applied to the cradle
    cellHeight = props.cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
    cellWidth = props.cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
    runway = props.runway, // the number of items outside the view of each side of the viewport 
    // -- gives time to assemble before display
    listsize = props.listsize, // the exact number of the size of the virtual list
    offset = props.offset, // the 0-based starting index of the list, when first loaded
    getItem = props.getItem, // function provided by host - parameter is index number, set by system; return value is 
    // host-selected component or promise of a component
    component = props.component, // properties with direct access to some component utilites, optional
    placeholder = props.placeholder, // a sparse component to stand in for content until the content arrives; 
    // optional, replaces default
    styles = props.styles;
    // defaults
    (_a = component) !== null && _a !== void 0 ? _a : (component = {});
    (_b = gap) !== null && _b !== void 0 ? _b : (gap = 0);
    (_c = padding) !== null && _c !== void 0 ? _c : (padding = 0);
    (_d = runway) !== null && _d !== void 0 ? _d : (runway = 3);
    (_e = offset) !== null && _e !== void 0 ? _e : (offset = 0);
    (_f = listsize) !== null && _f !== void 0 ? _f : (listsize = 0);
    // constraints
    offset = Math.max(0, offset); // non-negative
    offset = Math.min(listsize, offset); // not larger than list
    if (!['horizontal', 'vertical'].includes(orientation)) {
        orientation = 'horizontal';
    }
    // convert to pixels
    var runwaylength = (orientation == 'vertical') ? (runway * (cellHeight + gap)) : (runway * (cellWidth + gap));
    return react_1.default.createElement(viewport_1.default, { orientation: orientation, cellWidth: cellHeight, cellHeight: cellHeight, gap: gap, padding: padding, component: component, styles: styles },
        react_1.default.createElement(scrollblock_1.default, { listsize: listsize, cellWidth: cellWidth, cellHeight: cellHeight, gap: gap, padding: padding, orientation: orientation, component: component, styles: styles },
            react_1.default.createElement(cradle_1.default, { gap: gap, padding: padding, cellWidth: cellWidth, cellHeight: cellHeight, listsize: listsize, offset: offset, orientation: orientation, runwaylength: runwaylength, getItem: getItem, component: component, placeholder: placeholder, styles: styles })));
};
exports.default = InfiniteGridScroller;
//# sourceMappingURL=infinitegridscroller.js.map