"use strict";
// cradle.tsx
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importStar(require("react"));
var viewport_1 = require("./viewport");
var cradlefunctions_1 = require("./cradlefunctions");
var scrolltracker_1 = __importDefault(require("./scrolltracker"));
var SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200;
var Cradle = function (_a) {
    // =============================================================================================
    // --------------------------------------[ initialization ]-------------------------------------
    var gap = _a.gap, padding = _a.padding, runwaylength = _a.runwaylength, listsize = _a.listsize, offset = _a.offset, orientation = _a.orientation, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, getItem = _a.getItem, placeholder = _a.placeholder, component = _a.component, styles = _a.styles;
    var viewportData = react_1.useContext(viewport_1.ViewportContext);
    var _b = react_1.useState('setup'), cradlestate = _b[0], saveCradleState = _b[1];
    var cradlestateRef = react_1.useRef(null); // access by closures
    cradlestateRef.current = cradlestate;
    // console.log('running cradle with cradlestate', cradlestateRef)
    // -----------------------------[ data heap ]-----------------------
    var listsizeRef = react_1.useRef(null);
    listsizeRef.current = listsize;
    var viewportDataRef = react_1.useRef(null);
    viewportDataRef.current = viewportData;
    var isResizingRef = react_1.useRef(false);
    var pauseObserversRef = react_1.useRef(false);
    var reportReferenceIndexRef = react_1.useRef(component === null || component === void 0 ? void 0 : component.reportReferenceIndex);
    // -----------------------[ effects ]-------------------------
    // initialize window listener, and component elements
    react_1.useEffect(function () {
        viewportData.elementref.current.addEventListener('scroll', onScroll);
        if (component === null || component === void 0 ? void 0 : component.hasOwnProperty('getVisibleList')) {
            component.getVisibleList = getVisibleList;
        }
        if (component === null || component === void 0 ? void 0 : component.hasOwnProperty('getContentList')) {
            component.getContentList = getContentList;
        }
        if (component === null || component === void 0 ? void 0 : component.hasOwnProperty('scrollToItem')) {
            component.scrollToItem = scrollToItem;
        }
        if (component === null || component === void 0 ? void 0 : component.hasOwnProperty('reload')) {
            component.reload = reload;
        }
        return function () {
            viewportData.elementref.current && viewportData.elementref.current.removeEventListener('scroll', onScroll);
        };
    }, []);
    // triger resizing based on viewport state
    react_1.useEffect(function () {
        isResizingRef.current = viewportData.isResizing;
        if (isResizingRef.current) {
            callingReferenceIndexDataRef.current = __assign({}, referenceIndexDataRef.current);
            pauseObserversRef.current = true;
            saveCradleState('resizing');
        }
        if (!isResizingRef.current && (cradlestateRef.current == 'resizing')) {
            saveCradleState('resize');
        }
    }, [viewportData.isResizing]);
    // ------------------------[ session data ]-----------------------
    // current location
    var _c = react_1.useState({
        index: Math.min(offset, (listsize - 1)) || 0,
        scrolloffset: 0
    }), referenceindexdata = _c[0], saveReferenceindex = _c[1];
    var referenceIndexDataRef = react_1.useRef(null); // access by closures
    referenceIndexDataRef.current = referenceindexdata;
    var lastReferenceIndexDataRef = react_1.useRef(null);
    var isCradleInViewRef = react_1.useRef(true);
    var _d = react_1.useState(null), dropentries = _d[0], saveDropentries = _d[1]; // trigger add entries
    var _e = react_1.useState(null), addentries = _e[0], saveAddentries = _e[1]; // add entries
    var contentlistRef = react_1.useRef([]);
    var isScrollingRef = react_1.useRef(false);
    var itemobserverRef = react_1.useRef(null);
    var cradleobserverRef = react_1.useRef(null);
    var cellSpecs = react_1.useMemo(function () {
        return {
            cellWidth: cellWidth, cellHeight: cellHeight, gap: gap, padding: padding
        };
    }, [cellWidth, cellHeight, gap, padding]);
    var cellSpecsRef = react_1.useRef(null);
    cellSpecsRef.current = cellSpecs;
    var divlinerStylesRef = react_1.useRef(Object.assign({
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent: 'start',
        alignContent: 'start',
        boxSizing: 'border-box',
    }, styles === null || styles === void 0 ? void 0 : styles.cradle));
    var orientationRef = react_1.useRef(orientation);
    orientationRef.current = orientation; // availability in closures
    var divlinerStyleRevisionsRef = react_1.useRef(null); // for modifications by observer actions
    var cradleElementRef = react_1.useRef(null);
    var viewportDimensions = viewportData.viewportDimensions;
    var viewportheight = viewportDimensions.height, viewportwidth = viewportDimensions.width;
    var crosscount = react_1.useMemo(function () {
        var crosscount;
        var size = (orientation == 'horizontal') ? viewportheight : viewportwidth;
        var crossLength = (orientation == 'horizontal') ? cellHeight : cellWidth;
        var lengthforcalc = size - (padding * 2) + gap; // length of viewport
        var tilelengthforcalc = crossLength + gap;
        tilelengthforcalc = Math.min(tilelengthforcalc, lengthforcalc); // result cannot be less than 1
        crosscount = Math.floor(lengthforcalc / (tilelengthforcalc));
        return crosscount;
    }, [
        orientation,
        cellWidth,
        cellHeight,
        gap,
        padding,
        viewportheight,
        viewportwidth,
    ]);
    // ==============================================================================================
    // ----------------------------------[ config management ]--------------------------------
    var crosscountRef = react_1.useRef(crosscount); // for easy reference by observer
    var previousCrosscountRef = react_1.useRef(); // available for resize logic
    previousCrosscountRef.current = crosscountRef.current; // available for resize logic
    crosscountRef.current = crosscount; // available for observer closure
    divlinerStylesRef.current = react_1.useMemo(function () {
        // merge base style and revisions (by observer)
        var divlinerStyles = Object.assign(__assign({}, divlinerStylesRef.current), divlinerStyleRevisionsRef.current);
        var styles = cradlefunctions_1.setCradleStyles({
            orientation: orientation,
            divlinerStyles: divlinerStyles,
            cellHeight: cellHeight,
            cellWidth: cellWidth,
            gap: gap,
            crosscount: crosscount,
            viewportheight: viewportheight,
            viewportwidth: viewportwidth,
        });
        return styles;
    }, [
        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        divlinerStyleRevisionsRef.current
    ]);
    react_1.useEffect(function () {
        pauseObserversRef.current = true;
        callingReferenceIndexDataRef.current = __assign({}, referenceIndexDataRef.current);
        saveCradleState('reload');
    }, [
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ]);
    var itemElementsRef = react_1.useRef(new Map());
    var scrollTimeridRef = react_1.useRef(null);
    // =================================================================================
    // -------------------------[ IntersectionObserver support]-------------------------
    // There are two observers, one for the cradle, and another for itemShells; both against
    // the viewport.
    // --------------------------[ cradle observer ]-----------------------------------
    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    react_1.useEffect(function () {
        cradleobserverRef.current = new IntersectionObserver(cradleobservercallback, { root: viewportData.elementref.current });
        cradleobserverRef.current.observe(cradleElementRef.current);
    }, []);
    var cradleobservercallback = react_1.useCallback(function (entries) {
        isCradleInViewRef.current = entries[0].isIntersecting;
    }, []);
    // --------------------------[ item shell observer ]-----------------------------
    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runway at both the leading
            and trailing edges, itemShells scroll into or out of the scope of the observer
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through itemobservercallback() below) at the crossings of the itemshells
            of the defined observer cradle boundaries.

            The no-longer-intersecting notifications trigger dropping of that number of affected items from
            the cradle contentlist. The dropping of items from the trailing end of the content list
            triggers the addition of an equal number of items at the leading edge of the cradle content.

            Technically, the opposite end position spec is set (top or left depending on orientation),
            and the matching end position spec is set to 'auto' when items are added. This causes items to be
            "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.

            There are exceptions for setup and edge cases.
    */
    // the async callback from IntersectionObserver.
    var itemobservercallback = react_1.useCallback(function (entries) {
        if (pauseObserversRef.current) {
            return;
        }
        if (cradlestateRef.current == 'ready') {
            var dropentries_1 = entries.filter(function (entry) { return (!entry.isIntersecting); });
            if (dropentries_1.length) {
                saveDropentries(dropentries_1);
            }
        }
    }, []);
    // drop scroll content
    react_1.useEffect(function () {
        if (dropentries === null)
            return;
        var sampleEntry = dropentries[0];
        var cradleElement = cradleElementRef.current;
        var parentElement = cradleElement.parentElement;
        var viewportElement = viewportData.elementref.current;
        var scrollforward;
        var localContentList;
        // -- isolate forward and backward lists
        //  then set scrollforward
        var forwardcount = 0, backwardcount = 0;
        for (var droprecordindex = 0; droprecordindex < dropentries.length; droprecordindex++) {
            if (orientation == 'vertical') {
                if (sampleEntry.boundingClientRect.y - sampleEntry.rootBounds.y < 0) {
                    forwardcount++;
                }
                else {
                    backwardcount++;
                }
            }
            else {
                if (sampleEntry.boundingClientRect.x - sampleEntry.rootBounds.x < 0) {
                    forwardcount++;
                }
                else {
                    backwardcount++;
                }
            }
        }
        var netshift = forwardcount - backwardcount;
        if (netshift == 0)
            return;
        scrollforward = (forwardcount > backwardcount);
        netshift = Math.abs(netshift);
        // set localContentList
        var indexoffset = contentlistRef.current[0].props.index;
        var pendingcontentoffset;
        var newcontentcount = Math.ceil(netshift / crosscountRef.current) * crosscountRef.current;
        var headindexcount, tailindexcount;
        if (scrollforward) {
            pendingcontentoffset = indexoffset + netshift;
            var proposedtailoffset = pendingcontentoffset + newcontentcount + ((contentlistRef.current.length - netshift) - 1);
            if ((proposedtailoffset) > (listsize - 1)) {
                newcontentcount -= (proposedtailoffset - (listsize - 1));
                if (newcontentcount <= 0) { // defensive
                    return;
                }
            }
            headindexcount = -netshift;
            tailindexcount = 0;
        }
        else {
            pendingcontentoffset = indexoffset;
            var proposedindexoffset = pendingcontentoffset - newcontentcount;
            if (proposedindexoffset < 0) {
                proposedindexoffset = -proposedindexoffset;
                newcontentcount = newcontentcount - proposedindexoffset;
                if (newcontentcount <= 0) {
                    return;
                }
            }
            headindexcount = 0;
            tailindexcount = -netshift;
        }
        localContentList = cradlefunctions_1.getUIContentList({
            indexoffset: indexoffset,
            localContentList: contentlistRef.current,
            headindexcount: headindexcount,
            tailindexcount: tailindexcount,
            callbacksRef: callbacksRef,
        });
        var styles = cradlefunctions_1.setCradleStyleRevisionsForDrop({
            cradleElement: cradleElement,
            parentElement: parentElement,
            scrollforward: scrollforward,
            orientation: orientation
        });
        // immediate change for modification
        var elementstyle = cradleElementRef.current.style;
        elementstyle.top = styles.top;
        elementstyle.bottom = styles.bottom;
        elementstyle.left = styles.left;
        elementstyle.right = styles.right;
        // synchronization
        divlinerStyleRevisionsRef.current = styles;
        contentlistRef.current = localContentList;
        saveDropentries(null);
        saveAddentries({ count: newcontentcount, scrollforward: scrollforward, contentoffset: pendingcontentoffset });
    }, [dropentries]);
    // add scroll content
    react_1.useEffect(function () {
        if (addentries === null)
            return;
        var cradleElement = cradleElementRef.current;
        var parentElement = cradleElement.parentElement;
        var viewportElement = viewportData.elementref.current;
        var scrollforward = addentries.scrollforward;
        var localContentList;
        // set localContentList
        var contentoffset = addentries.contentoffset, newcontentcount = addentries.count;
        var headindexcount, tailindexcount;
        if (scrollforward) {
            headindexcount = 0,
                tailindexcount = newcontentcount;
        }
        else {
            headindexcount = newcontentcount;
            tailindexcount = 0;
        }
        localContentList = cradlefunctions_1.getUIContentList({
            localContentList: contentlistRef.current,
            headindexcount: headindexcount,
            tailindexcount: tailindexcount,
            indexoffset: contentoffset,
            orientation: orientation,
            cellHeight: cellHeight,
            cellWidth: cellWidth,
            observer: itemobserverRef.current,
            crosscount: crosscount,
            callbacksRef: callbacksRef,
            getItem: getItem,
            listsize: listsize,
            placeholder: placeholder,
        });
        var styles = cradlefunctions_1.setCradleStyleRevisionsForAdd({
            cradleElement: cradleElement,
            parentElement: parentElement,
            scrollforward: scrollforward,
            orientation: orientation,
        });
        // immediate change for modification
        var elementstyle = cradleElementRef.current.style;
        elementstyle.top = styles.top;
        elementstyle.bottom = styles.bottom;
        elementstyle.left = styles.left;
        elementstyle.right = styles.right;
        // synchronization
        divlinerStyleRevisionsRef.current = styles;
        contentlistRef.current = localContentList;
        saveAddentries(null);
    }, [addentries]);
    // End of IntersectionObserver support
    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    // reset cradle
    var setCradleContent = react_1.useCallback(function (cradleState, referenceIndexData) {
        var visibletargetindexoffset = referenceIndexData.index, visibletargetscrolloffset = referenceIndexData.scrolloffset;
        if (cradleState == 'reposition')
            visibletargetscrolloffset = 0;
        var localContentList = []; // any duplicated items will be re-used by react
        var _a = cradlefunctions_1.getContentListRequirements({
            cellHeight: cellHeight,
            cellWidth: cellWidth,
            orientation: orientation,
            viewportheight: viewportheight,
            viewportwidth: viewportwidth,
            runwaylength: runwaylength,
            gap: gap,
            padding: padding,
            visibletargetindexoffset: visibletargetindexoffset,
            targetScrollOffset: visibletargetscrolloffset,
            crosscount: crosscount,
            listsize: listsize,
        }), indexoffset = _a.indexoffset, referenceoffset = _a.referenceoffset, contentCount = _a.contentCount, scrollblockoffset = _a.scrollblockoffset, cradleoffset = _a.cradleoffset;
        referenceIndexDataRef.current = {
            index: referenceoffset,
            scrolloffset: visibletargetscrolloffset,
        };
        reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index);
        saveReferenceindex(referenceIndexDataRef.current);
        var childlist = cradlefunctions_1.getUIContentList({
            indexoffset: indexoffset,
            headindexcount: 0,
            tailindexcount: contentCount,
            orientation: orientation,
            cellHeight: cellHeight,
            cellWidth: cellWidth,
            localContentList: localContentList,
            observer: itemobserverRef.current,
            crosscount: crosscount,
            callbacksRef: callbacksRef,
            getItem: getItem,
            listsize: listsize,
            placeholder: placeholder,
        });
        contentDataRef.current = childlist;
        var elementstyle = cradleElementRef.current.style;
        var styles = {};
        if (orientation == 'vertical') {
            styles.top = cradleoffset + 'px';
            styles.bottom = 'auto';
            styles.left = 'auto';
            styles.right = 'auto';
            positionDataRef.current = { property: 'scrollTop', value: scrollblockoffset };
        }
        else { // orientation = 'horizontal'
            styles.top = 'auto';
            styles.bottom = styles.bottom = 'auto';
            styles.left = cradleoffset + 'px';
            styles.right = 'auto';
            positionDataRef.current = { property: 'scrollLeft', value: scrollblockoffset };
        }
        layoutDataRef.current = styles;
    }, [
        cellHeight,
        cellWidth,
        orientation,
        viewportheight,
        viewportwidth,
        runwaylength,
        gap,
        padding,
        crosscount,
    ]);
    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // callback for scroll
    var onScroll = react_1.useCallback(function () {
        if (!isScrollingRef.current) {
            isScrollingRef.current = true;
        }
        clearTimeout(scrollTimeridRef.current);
        scrollTimeridRef.current = setTimeout(function () {
            isScrollingRef.current = false;
            var cradleState = cradlestateRef.current;
            if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {
                (cradleState != 'repositioning') && cradlefunctions_1.normalizeCradleAnchors(cradleElementRef.current, orientationRef.current);
                saveReferenceindex(__assign({}, referenceIndexDataRef.current)); // trigger re-run to capture end of scroll session values
                lastReferenceIndexDataRef.current = __assign({}, referenceIndexDataRef.current);
            }
            switch (cradleState) {
                case 'repositioning': {
                    pauseObserversRef.current = true;
                    callingReferenceIndexDataRef.current = __assign({}, referenceIndexDataRef.current);
                    saveCradleState('reposition');
                    break;
                }
            }
        }, SCROLL_TIMEOUT_FOR_ONAFTERSCROLL);
        if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {
            var cradleState = cradlestateRef.current;
            if (cradleState == 'ready' || cradleState == 'repositioning') {
                referenceIndexDataRef.current = cradlefunctions_1.getReferenceIndexData({
                    orientation: orientationRef.current,
                    viewportData: viewportDataRef.current,
                    cellSpecsRef: cellSpecsRef,
                    crosscountRef: crosscountRef,
                    listsize: listsizeRef.current,
                });
                reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index);
                saveReferenceindex(referenceIndexDataRef.current);
            }
        }
        if (!isCradleInViewRef.current &&
            !pauseObserversRef.current &&
            !isResizingRef.current &&
            !(cradlestateRef.current == 'resize') &&
            !(cradlestateRef.current == 'repositioning') &&
            !(cradlestateRef.current == 'reposition')) {
            var rect = viewportDataRef.current.elementref.current.getBoundingClientRect();
            var top_1 = rect.top, right = rect.right, bottom = rect.bottom, left = rect.left;
            var width = right - left, height = bottom - top_1;
            viewportDataRef.current.viewportDimensions = { top: top_1, right: right, bottom: bottom, left: left, width: width, height: height }; // update for scrolltracker
            saveCradleState('repositioning');
        }
    }, []);
    // trigger pivot on change in orientation
    react_1.useEffect(function () {
        var rootMargin;
        if (orientation == 'horizontal') {
            rootMargin = "0px " + runwaylength + "px 0px " + runwaylength + "px";
        }
        else {
            rootMargin = runwaylength + "px 0px " + runwaylength + "px 0px";
        }
        itemobserverRef.current = new IntersectionObserver(itemobservercallback, { root: viewportData.elementref.current, rootMargin: rootMargin, });
        contentlistRef.current = [];
        if (cradlestate != 'setup') {
            pauseObserversRef.current = true;
            callingReferenceIndexDataRef.current = __assign({}, lastReferenceIndexDataRef.current);
            saveCradleState('pivot');
        }
    }, [
        orientation,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ]);
    // data for state processing
    var callingCradleState = react_1.useRef(cradlestateRef.current);
    var callingReferenceIndexDataRef = react_1.useRef(referenceIndexDataRef.current);
    var layoutDataRef = react_1.useRef(null);
    var positionDataRef = react_1.useRef(null);
    var contentDataRef = react_1.useRef(null);
    // this is the core state engine
    // useLayout for suppressing flashes
    react_1.useLayoutEffect(function () {
        switch (cradlestate) {
            case 'reload':
                contentlistRef.current = [];
                saveCradleState('reposition');
                break;
            case 'position': {
                viewportData.elementref.current[positionDataRef.current.property] =
                    positionDataRef.current.value;
                saveCradleState('layout');
                break;
            }
            case 'layout': {
                divlinerStyleRevisionsRef.current = layoutDataRef.current;
                saveCradleState('content');
                break;
            }
            case 'content': {
                contentlistRef.current = contentDataRef.current;
                saveCradleState('normalize');
                break;
            }
        }
    }, [cradlestate]);
    // standard processing stages
    react_1.useEffect(function () {
        switch (cradlestate) {
            case 'setup':
            case 'resize':
            case 'pivot':
            case 'reposition':
                callingCradleState.current = cradlestate;
                saveCradleState('settle');
                break;
            case 'settle': {
                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current);
                saveCradleState('position');
                break;
            }
            case 'normalize': {
                setTimeout(function () {
                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails
                        viewportData.elementref.current[positionDataRef.current.property] =
                            positionDataRef.current.value;
                        cradlefunctions_1.normalizeCradleAnchors(cradleElementRef.current, orientationRef.current);
                        lastReferenceIndexDataRef.current = __assign({}, referenceIndexDataRef.current);
                        pauseObserversRef.current && (pauseObserversRef.current = false);
                    }
                }, 250);
                saveCradleState('ready');
                break;
            }
            case 'ready':
                break;
        }
    }, [cradlestate]);
    // =============================================================================
    // ------------------------------[ callbacks ]----------------------------------
    // on host demand
    var getVisibleList = react_1.useCallback(function () {
        var itemlist = Array.from(itemElementsRef.current);
        return cradlefunctions_1.calcVisibleItems(itemlist, viewportData.elementref.current, cradleElementRef.current, orientationRef.current);
    }, []);
    var getContentList = react_1.useCallback(function () {
        return Array.from(itemElementsRef.current);
    }, []);
    var reload = react_1.useCallback(function () {
        saveCradleState('reload');
    }, []);
    var scrollToItem = react_1.useCallback(function (index, alignment) {
        if (alignment === void 0) { alignment = 'nearest'; }
        console.log('requested scrollToItem', index, alignment);
        callingReferenceIndexDataRef.current = { index: 0, scrolloffset: 0 };
        saveCradleState('reposition');
    }, []);
    // content item registration
    var getItemElementData = react_1.useCallback(function (itemElementData, reportType) {
        var index = itemElementData[0], shellref = itemElementData[1];
        if (reportType == 'register') {
            itemElementsRef.current.set(index, shellref);
        }
        else if (reportType == 'unregister') {
            itemElementsRef.current.delete(index);
        }
    }, []);
    var callbacksRef = react_1.useRef({
        getElementData: getItemElementData
    });
    // =============================================================================
    // ------------------------------[ render... ]----------------------------------
    var divlinerstyles = divlinerStylesRef.current;
    return react_1.default.createElement(react_1.default.Fragment, null,
        cradlestateRef.current == 'repositioning'
            ? react_1.default.createElement(scrolltracker_1.default, { top: viewportDimensions.top + 3, left: viewportDimensions.left + 3, offset: referenceIndexDataRef.current.index, listsize: listsize, styles: styles })
            : null,
        react_1.default.createElement("div", { ref: cradleElementRef, style: divlinerstyles }, (cradlestateRef.current != 'setup') ? contentlistRef.current : null));
}; // Cradle
exports.default = Cradle;
//# sourceMappingURL=cradle.js.map