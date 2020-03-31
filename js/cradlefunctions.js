"use strict";
// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/
var react_1 = __importDefault(require("react"));
var itemshell_1 = __importDefault(require("./itemshell"));
exports.calcVisibleItems = function (itemsArray, viewportElement, cradleElement, orientation) {
    var list = [];
    var cradleTop = cradleElement.offsetTop, cradleLeft = cradleElement.offsetLeft;
    var scrollblockTopOffset = -viewportElement.scrollTop, scrollblockLeftOffset = -viewportElement.scrollLeft, viewportHeight = viewportElement.offsetHeight, viewportWidth = viewportElement.offsetWidth, viewportTopOffset = -scrollblockTopOffset, viewportBottomOffset = -scrollblockTopOffset + viewportHeight;
    for (var i = 0; i < itemsArray.length; i++) {
        var _a = itemsArray[i], index = _a[0], elementRef = _a[1];
        var element = elementRef.current;
        var top_1 = element.offsetTop, left = element.offsetLeft, width = element.offsetWidth, height = element.offsetHeight, right = left + width, bottom = top_1 + height;
        var itemTopOffset = scrollblockTopOffset + cradleTop + top_1, // offset from top of viewport
        itemBottomOffset = scrollblockTopOffset + cradleTop + bottom, // offset from top of viewport
        itemLeftOffset = scrollblockLeftOffset + cradleLeft + left, itemRightOffset = scrollblockLeftOffset + cradleLeft + right;
        var isVisible = false; // default
        var topPortion = void 0, bottomPortion = void 0, leftPortion = void 0, rightPortion = void 0;
        if ((itemTopOffset < 0) && (itemBottomOffset > 0)) {
            (orientation == 'vertical') && (isVisible = true);
            bottomPortion = itemBottomOffset;
            topPortion = bottomPortion - height;
        }
        else if ((itemTopOffset >= 0) && (itemBottomOffset < viewportHeight)) {
            (orientation == 'vertical') && (isVisible = true);
            topPortion = height;
            bottomPortion = 0;
        }
        else if ((itemTopOffset > 0) && ((itemTopOffset - viewportHeight) < 0)) {
            (orientation == 'vertical') && (isVisible = true);
            topPortion = viewportHeight - itemTopOffset;
            bottomPortion = topPortion - height;
        }
        else {
            if (orientation == 'vertical')
                continue;
        }
        if (itemLeftOffset < 0 && itemRightOffset > 0) {
            (orientation == 'horizontal') && (isVisible = true);
            rightPortion = itemRightOffset;
            leftPortion = rightPortion - width;
        }
        else if (itemLeftOffset >= 0 && itemRightOffset < viewportWidth) {
            (orientation == 'horizontal') && (isVisible = true);
            leftPortion = width;
            rightPortion = 0;
        }
        else if (itemLeftOffset > 0 && (itemLeftOffset - viewportWidth) < 0) {
            (orientation == 'horizontal') && (isVisible = true);
            leftPortion = viewportWidth - itemLeftOffset;
            rightPortion = leftPortion - width;
        }
        else {
            if (orientation == 'horizontal')
                continue;
        }
        var verticalRatio = (topPortion > 0) ? topPortion / height : bottomPortion / height, horizontalRatio = (leftPortion > 0) ? leftPortion / width : rightPortion / height;
        var itemData = {
            index: index,
            isVisible: isVisible,
            top: top_1,
            right: right,
            bottom: bottom,
            left: left,
            width: width,
            height: height,
            itemTopOffset: itemTopOffset,
            itemBottomOffset: itemBottomOffset,
            topPortion: topPortion,
            bottomPortion: bottomPortion,
            itemLeftOffset: itemLeftOffset,
            itemRightOffset: itemRightOffset,
            leftPortion: leftPortion,
            rightPortion: rightPortion,
            verticalRatio: verticalRatio,
            horizontalRatio: horizontalRatio,
        };
        list.push(itemData);
    }
    list.sort(function (a, b) {
        return (a.index - b.index);
    });
    return list;
};
exports.getReferenceIndexData = function (_a) {
    var orientation = _a.orientation, viewportData = _a.viewportData, cellSpecsRef = _a.cellSpecsRef, crosscountRef = _a.crosscountRef, listsize = _a.listsize;
    var scrollPos, cellLength;
    if (orientation == 'vertical') {
        scrollPos = viewportData.elementref.current.scrollTop;
        cellLength = cellSpecsRef.current.cellHeight + cellSpecsRef.current.gap;
    }
    else {
        scrollPos = viewportData.elementref.current.scrollLeft;
        cellLength = cellSpecsRef.current.cellWidth + cellSpecsRef.current.gap;
    }
    var referencerowindex = Math.ceil(scrollPos / cellLength);
    var referencescrolloffset = cellLength - (scrollPos % cellLength);
    if (referencescrolloffset == cellLength)
        referencescrolloffset = 0;
    var referenceindex = referencerowindex * crosscountRef.current;
    var referenceIndexData = {
        index: Math.min(referenceindex, listsize - 1),
        scrolloffset: referencescrolloffset
    };
    return referenceIndexData;
};
// evaluate content for requirements
exports.getContentListRequirements = function (_a) {
    // -------------[ calc basic inputs: cellLength, contentCount. ]----------
    var orientation = _a.orientation, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, viewportheight = _a.viewportheight, viewportwidth = _a.viewportwidth, runwaylength = _a.runwaylength, gap = _a.gap, padding = _a.padding, visibletargetindexoffset = _a.visibletargetindexoffset, targetScrollOffset = _a.targetScrollOffset, crosscount = _a.crosscount, listsize = _a.listsize;
    var cradleContentLength, cellLength, viewportlength;
    if (orientation == 'vertical') {
        cellLength = cellHeight + gap;
        viewportlength = viewportheight;
    }
    else {
        cellLength = cellWidth + gap;
        viewportlength = viewportwidth;
    }
    cradleContentLength = viewportlength + (runwaylength * 2);
    var cradlerowcount = Math.floor(cradleContentLength / cellLength);
    var contentCount = cradlerowcount * crosscount;
    if (contentCount > listsize)
        contentCount = listsize;
    // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------
    var cradleleadingrowcount = Math.floor(runwaylength / cellLength);
    var leadingitemcount = cradleleadingrowcount * crosscount;
    var targetdiff = visibletargetindexoffset % crosscount;
    var referenceoffset = visibletargetindexoffset - targetdiff; // part of return message
    leadingitemcount += targetdiff;
    leadingitemcount = Math.min(leadingitemcount, visibletargetindexoffset); // for list head
    // -----------------------[ calc indexoffset ]------------------------
    // leading edge
    var indexoffset = visibletargetindexoffset - leadingitemcount;
    var diff = indexoffset % crosscount;
    indexoffset -= diff;
    // ------------[ adjust indexoffset and contentCount for listsize ]------------
    diff = 0;
    var shift = 0;
    if ((indexoffset + contentCount) > listsize) {
        diff = (indexoffset + contentCount) - listsize;
        shift = diff % crosscount;
    }
    if (diff) {
        indexoffset -= (diff - shift);
        contentCount -= shift;
    }
    // --------------------[ calc css positioning ]-----------------------
    var indexrowoffset = Math.floor(indexoffset / crosscount);
    var cradleoffset = indexrowoffset * cellLength;
    var targetrowoffset = Math.floor(visibletargetindexoffset / crosscount);
    var rowscrollblockoffset = targetrowoffset * cellLength;
    var scrollblockoffset = Math.max(0, rowscrollblockoffset - targetScrollOffset);
    return { indexoffset: indexoffset, referenceoffset: referenceoffset, contentCount: contentCount, scrollblockoffset: scrollblockoffset, cradleoffset: cradleoffset }; // summarize requirements message
};
// this makes ui resize less visually jarring
exports.normalizeCradleAnchors = function (cradleElement, orientation) {
    var styles = {};
    var stylerevisions = {};
    if (orientation == 'vertical') {
        if (cradleElement.style.top == 'auto') {
            styles.top = cradleElement.offsetTop + 'px';
            styles.bottom = 'auto';
            styles.left = 'auto';
            styles.right = 'auto';
        }
    }
    else {
        if (cradleElement.style.left == 'auto') {
            styles.left = cradleElement.offsetLeft + 'px';
            styles.right = 'auto';
            styles.top = 'auto';
            styles.bottom = 'auto';
        }
    }
    for (var style in styles) {
        cradleElement.style[style] = styles[style];
    }
};
// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
exports.getUIContentList = function (props) {
    var indexoffset = props.indexoffset, headindexcount = props.headindexcount, tailindexcount = props.tailindexcount, orientation = props.orientation, cellHeight = props.cellHeight, cellWidth = props.cellWidth, contentlist = props.localContentList, observer = props.observer, crosscount = props.crosscount, callbacksRef = props.callbacksRef, getItem = props.getItem, listsize = props.listsize, placeholder = props.placeholder;
    var localContentlist = __spreadArrays(contentlist);
    var tailindexoffset = indexoffset + contentlist.length;
    var returnContentlist;
    var headContentlist = [];
    if (headindexcount >= 0) {
        for (var index = indexoffset - headindexcount; index < (indexoffset); index++) {
            headContentlist.push(emitItem({
                index: index,
                orientation: orientation,
                cellHeight: cellHeight,
                cellWidth: cellWidth,
                observer: observer,
                callbacksRef: callbacksRef,
                getItem: getItem,
                listsize: listsize,
                placeholder: placeholder
            }));
        }
    }
    else {
        localContentlist.splice(0, -headindexcount);
    }
    var tailContentlist = [];
    if (tailindexcount >= 0) {
        for (var index = tailindexoffset; index < (tailindexoffset + tailindexcount); index++) {
            tailContentlist.push(emitItem({
                index: index,
                orientation: orientation,
                cellHeight: cellHeight,
                cellWidth: cellWidth,
                observer: observer,
                callbacksRef: callbacksRef,
                getItem: getItem,
                listsize: listsize,
                placeholder: placeholder
            }));
        }
    }
    else {
        localContentlist.splice(tailindexcount, -tailindexcount);
    }
    returnContentlist = headContentlist.concat(localContentlist, tailContentlist);
    return returnContentlist;
};
var emitItem = function (_a) {
    var index = _a.index, orientation = _a.orientation, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, observer = _a.observer, callbacksRef = _a.callbacksRef, getItem = _a.getItem, listsize = _a.listsize, placeholder = _a.placeholder;
    return react_1.default.createElement(itemshell_1.default, { key: index, orientation: orientation, cellHeight: cellHeight, cellWidth: cellWidth, index: index, observer: observer, callbacks: callbacksRef, getItem: getItem, listsize: listsize, placeholder: placeholder });
};
// ========================================================================================
// ------------------------------------[ styles ]------------------------------------------
// ========================================================================================
exports.setCradleStyles = function (_a) {
    var orientation = _a.orientation, stylesobject = _a.divlinerStyles, cellHeight = _a.cellHeight, cellWidth = _a.cellWidth, gap = _a.gap, crosscount = _a.crosscount, viewportheight = _a.viewportheight, viewportwidth = _a.viewportwidth;
    var styles = Object.assign({}, stylesobject);
    if (orientation == 'horizontal') {
        styles.width = 'auto';
        styles.height = '100%';
        styles.gridAutoFlow = 'column';
        // explict crosscount next line as workaround for FF problem - 
        //     sets length of horiz cradle items in one line (row), not multi-row config
        styles.gridTemplateRows = cellHeight ? "repeat(" + crosscount + ", minmax(" + cellHeight + "px, 1fr))" : 'auto';
        styles.gridTemplateColumns = 'none';
        styles.minWidth = viewportwidth + 'px';
        styles.minHeight = 0;
    }
    else if (orientation == 'vertical') {
        styles.width = '100%';
        styles.height = 'auto';
        styles.gridAutoFlow = 'row';
        styles.gridTemplateRows = 'none';
        styles.gridTemplateColumns = cellWidth ? "repeat(auto-fit, minmax(" + cellWidth + "px, 1fr))" : 'auto';
        styles.minWidth = 0;
        styles.minHeight = viewportheight + 'px';
    }
    return styles;
};
exports.setCradleStyleRevisionsForDrop = function (_a) {
    var cradleElement = _a.cradleElement, parentElement = _a.parentElement, scrollforward = _a.scrollforward, orientation = _a.orientation;
    var styles = {};
    var headpos, tailpos;
    // set styles revisions
    if (orientation == 'vertical') {
        var offsetTop = cradleElement.offsetTop;
        var offsetHeight = cradleElement.offsetHeight;
        var parentHeight = parentElement.offsetHeight;
        styles.left = 'auto';
        styles.right = 'auto';
        if (scrollforward) {
            tailpos = offsetTop + offsetHeight;
            styles.top = 'auto';
            styles.bottom = (parentHeight - tailpos) + 'px';
        }
        else {
            headpos = offsetTop;
            styles.top = headpos + 'px';
            styles.bottom = 'auto';
        }
    }
    else {
        var offsetLeft = cradleElement.offsetLeft;
        var offsetWidth = cradleElement.offsetWidth;
        var parentWidth = parentElement.offsetWidth;
        styles.top = 'auto';
        styles.bottom = 'auto';
        if (scrollforward) {
            tailpos = offsetLeft + offsetWidth;
            styles.left = 'auto';
            styles.right = (parentWidth - tailpos) + 'px';
        }
        else {
            headpos = offsetLeft;
            styles.left = headpos + 'px';
            styles.right = 'auto';
        }
    }
    return styles;
};
exports.setCradleStyleRevisionsForAdd = function (_a) {
    var cradleElement = _a.cradleElement, parentElement = _a.parentElement, scrollforward = _a.scrollforward, orientation = _a.orientation;
    var styles = {};
    var headpos, tailpos;
    // set style revisions
    if (orientation == 'vertical') {
        var offsetTop = cradleElement.offsetTop;
        var offsetHeight = cradleElement.offsetHeight;
        var parentHeight = parentElement.offsetHeight;
        styles.left = 'auto';
        styles.right = 'auto';
        if (scrollforward) {
            headpos = offsetTop;
            styles.top = headpos + 'px';
            styles.bottom = 'auto';
        }
        else { // scroll backward
            tailpos = offsetTop + offsetHeight;
            styles.top = 'auto';
            styles.bottom = (parentHeight - tailpos) + 'px';
        }
    }
    else {
        var offsetLeft = cradleElement.offsetLeft;
        var offsetWidth = cradleElement.offsetWidth;
        var parentWidth = parentElement.offsetWidth;
        styles.top = 'auto';
        styles.bottom = 'auto';
        if (scrollforward) {
            headpos = offsetLeft;
            styles.left = headpos + 'px';
            styles.right = 'auto';
        }
        else { // scroll backward
            tailpos = offsetLeft + offsetWidth;
            styles.left = 'auto';
            styles.right = (parentWidth - tailpos) + 'px';
        }
    }
    return styles;
};
//# sourceMappingURL=cradlefunctions.js.map