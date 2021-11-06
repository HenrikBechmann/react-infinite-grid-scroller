(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("react"), require("react-dom"));
	else if(typeof define === 'function' && define.amd)
		define(["react", "react-dom"], factory);
	else if(typeof exports === 'object')
		exports["Scroller"] = factory(require("react"), require("react-dom"));
	else
		root["Scroller"] = factory(root["react"], root["react-dom"]);
})(self, function(__WEBPACK_EXTERNAL_MODULE_react__, __WEBPACK_EXTERNAL_MODULE_react_dom__) {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@juggle/resize-observer/lib/DOMRectReadOnly.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/DOMRectReadOnly.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DOMRectReadOnly": () => (/* binding */ DOMRectReadOnly)
/* harmony export */ });
/* harmony import */ var _utils_freeze__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/freeze */ "./node_modules/@juggle/resize-observer/lib/utils/freeze.js");

var DOMRectReadOnly = (function () {
    function DOMRectReadOnly(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = this.y;
        this.left = this.x;
        this.bottom = this.top + this.height;
        this.right = this.left + this.width;
        return (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_0__.freeze)(this);
    }
    DOMRectReadOnly.prototype.toJSON = function () {
        var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
        return { x: x, y: y, top: top, right: right, bottom: bottom, left: left, width: width, height: height };
    };
    DOMRectReadOnly.fromRect = function (rectangle) {
        return new DOMRectReadOnly(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    };
    return DOMRectReadOnly;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObservation.js":
/*!***********************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObservation.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObservation": () => (/* binding */ ResizeObservation)
/* harmony export */ });
/* harmony import */ var _ResizeObserverBoxOptions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ResizeObserverBoxOptions */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverBoxOptions.js");
/* harmony import */ var _algorithms_calculateBoxSize__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./algorithms/calculateBoxSize */ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js");
/* harmony import */ var _utils_element__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/element */ "./node_modules/@juggle/resize-observer/lib/utils/element.js");



var skipNotifyOnElement = function (target) {
    return !(0,_utils_element__WEBPACK_IMPORTED_MODULE_2__.isSVG)(target)
        && !(0,_utils_element__WEBPACK_IMPORTED_MODULE_2__.isReplacedElement)(target)
        && getComputedStyle(target).display === 'inline';
};
var ResizeObservation = (function () {
    function ResizeObservation(target, observedBox) {
        this.target = target;
        this.observedBox = observedBox || _ResizeObserverBoxOptions__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverBoxOptions.CONTENT_BOX;
        this.lastReportedSize = {
            inlineSize: 0,
            blockSize: 0
        };
    }
    ResizeObservation.prototype.isActive = function () {
        var size = (0,_algorithms_calculateBoxSize__WEBPACK_IMPORTED_MODULE_1__.calculateBoxSize)(this.target, this.observedBox, true);
        if (skipNotifyOnElement(this.target)) {
            this.lastReportedSize = size;
        }
        if (this.lastReportedSize.inlineSize !== size.inlineSize
            || this.lastReportedSize.blockSize !== size.blockSize) {
            return true;
        }
        return false;
    };
    return ResizeObservation;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserver.js":
/*!********************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserver.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserver": () => (/* binding */ ResizeObserver)
/* harmony export */ });
/* harmony import */ var _ResizeObserverController__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ResizeObserverController */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverController.js");
/* harmony import */ var _utils_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/element */ "./node_modules/@juggle/resize-observer/lib/utils/element.js");


var ResizeObserver = (function () {
    function ResizeObserver(callback) {
        if (arguments.length === 0) {
            throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
        }
        if (typeof callback !== 'function') {
            throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
        }
        _ResizeObserverController__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverController.connect(this, callback);
    }
    ResizeObserver.prototype.observe = function (target, options) {
        if (arguments.length === 0) {
            throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
        }
        if (!(0,_utils_element__WEBPACK_IMPORTED_MODULE_1__.isElement)(target)) {
            throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
        }
        _ResizeObserverController__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverController.observe(this, target, options);
    };
    ResizeObserver.prototype.unobserve = function (target) {
        if (arguments.length === 0) {
            throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
        }
        if (!(0,_utils_element__WEBPACK_IMPORTED_MODULE_1__.isElement)(target)) {
            throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
        }
        _ResizeObserverController__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverController.unobserve(this, target);
    };
    ResizeObserver.prototype.disconnect = function () {
        _ResizeObserverController__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverController.disconnect(this);
    };
    ResizeObserver.toString = function () {
        return 'function ResizeObserver () { [polyfill code] }';
    };
    return ResizeObserver;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserverBoxOptions.js":
/*!******************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserverBoxOptions.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserverBoxOptions": () => (/* binding */ ResizeObserverBoxOptions)
/* harmony export */ });
var ResizeObserverBoxOptions;
(function (ResizeObserverBoxOptions) {
    ResizeObserverBoxOptions["BORDER_BOX"] = "border-box";
    ResizeObserverBoxOptions["CONTENT_BOX"] = "content-box";
    ResizeObserverBoxOptions["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
})(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserverController.js":
/*!******************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserverController.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserverController": () => (/* binding */ ResizeObserverController)
/* harmony export */ });
/* harmony import */ var _utils_scheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/scheduler */ "./node_modules/@juggle/resize-observer/lib/utils/scheduler.js");
/* harmony import */ var _ResizeObservation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ResizeObservation */ "./node_modules/@juggle/resize-observer/lib/ResizeObservation.js");
/* harmony import */ var _ResizeObserverDetail__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ResizeObserverDetail */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverDetail.js");
/* harmony import */ var _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/resizeObservers */ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js");




var observerMap = new WeakMap();
var getObservationIndex = function (observationTargets, target) {
    for (var i = 0; i < observationTargets.length; i += 1) {
        if (observationTargets[i].target === target) {
            return i;
        }
    }
    return -1;
};
var ResizeObserverController = (function () {
    function ResizeObserverController() {
    }
    ResizeObserverController.connect = function (resizeObserver, callback) {
        var detail = new _ResizeObserverDetail__WEBPACK_IMPORTED_MODULE_2__.ResizeObserverDetail(resizeObserver, callback);
        observerMap.set(resizeObserver, detail);
    };
    ResizeObserverController.observe = function (resizeObserver, target, options) {
        var detail = observerMap.get(resizeObserver);
        var firstObservation = detail.observationTargets.length === 0;
        if (getObservationIndex(detail.observationTargets, target) < 0) {
            firstObservation && _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_3__.resizeObservers.push(detail);
            detail.observationTargets.push(new _ResizeObservation__WEBPACK_IMPORTED_MODULE_1__.ResizeObservation(target, options && options.box));
            (0,_utils_scheduler__WEBPACK_IMPORTED_MODULE_0__.updateCount)(1);
            _utils_scheduler__WEBPACK_IMPORTED_MODULE_0__.scheduler.schedule();
        }
    };
    ResizeObserverController.unobserve = function (resizeObserver, target) {
        var detail = observerMap.get(resizeObserver);
        var index = getObservationIndex(detail.observationTargets, target);
        var lastObservation = detail.observationTargets.length === 1;
        if (index >= 0) {
            lastObservation && _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_3__.resizeObservers.splice(_utils_resizeObservers__WEBPACK_IMPORTED_MODULE_3__.resizeObservers.indexOf(detail), 1);
            detail.observationTargets.splice(index, 1);
            (0,_utils_scheduler__WEBPACK_IMPORTED_MODULE_0__.updateCount)(-1);
        }
    };
    ResizeObserverController.disconnect = function (resizeObserver) {
        var _this = this;
        var detail = observerMap.get(resizeObserver);
        detail.observationTargets.slice().forEach(function (ot) { return _this.unobserve(resizeObserver, ot.target); });
        detail.activeTargets.splice(0, detail.activeTargets.length);
    };
    return ResizeObserverController;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserverDetail.js":
/*!**************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserverDetail.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserverDetail": () => (/* binding */ ResizeObserverDetail)
/* harmony export */ });
var ResizeObserverDetail = (function () {
    function ResizeObserverDetail(resizeObserver, callback) {
        this.activeTargets = [];
        this.skippedTargets = [];
        this.observationTargets = [];
        this.observer = resizeObserver;
        this.callback = callback;
    }
    return ResizeObserverDetail;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserverEntry.js":
/*!*************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserverEntry.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserverEntry": () => (/* binding */ ResizeObserverEntry)
/* harmony export */ });
/* harmony import */ var _algorithms_calculateBoxSize__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./algorithms/calculateBoxSize */ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js");
/* harmony import */ var _utils_freeze__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/freeze */ "./node_modules/@juggle/resize-observer/lib/utils/freeze.js");


var ResizeObserverEntry = (function () {
    function ResizeObserverEntry(target) {
        var boxes = (0,_algorithms_calculateBoxSize__WEBPACK_IMPORTED_MODULE_0__.calculateBoxSizes)(target);
        this.target = target;
        this.contentRect = boxes.contentRect;
        this.borderBoxSize = (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_1__.freeze)([boxes.borderBoxSize]);
        this.contentBoxSize = (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_1__.freeze)([boxes.contentBoxSize]);
        this.devicePixelContentBoxSize = (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_1__.freeze)([boxes.devicePixelContentBoxSize]);
    }
    return ResizeObserverEntry;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/ResizeObserverSize.js":
/*!************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/ResizeObserverSize.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserverSize": () => (/* binding */ ResizeObserverSize)
/* harmony export */ });
/* harmony import */ var _utils_freeze__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/freeze */ "./node_modules/@juggle/resize-observer/lib/utils/freeze.js");

var ResizeObserverSize = (function () {
    function ResizeObserverSize(inlineSize, blockSize) {
        this.inlineSize = inlineSize;
        this.blockSize = blockSize;
        (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_0__.freeze)(this);
    }
    return ResizeObserverSize;
}());



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/broadcastActiveObservations.js":
/*!********************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/broadcastActiveObservations.js ***!
  \********************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "broadcastActiveObservations": () => (/* binding */ broadcastActiveObservations)
/* harmony export */ });
/* harmony import */ var _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/resizeObservers */ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js");
/* harmony import */ var _ResizeObserverEntry__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ResizeObserverEntry */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverEntry.js");
/* harmony import */ var _calculateDepthForNode__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./calculateDepthForNode */ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateDepthForNode.js");
/* harmony import */ var _calculateBoxSize__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./calculateBoxSize */ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js");




var broadcastActiveObservations = function () {
    var shallowestDepth = Infinity;
    var callbacks = [];
    _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__.resizeObservers.forEach(function processObserver(ro) {
        if (ro.activeTargets.length === 0) {
            return;
        }
        var entries = [];
        ro.activeTargets.forEach(function processTarget(ot) {
            var entry = new _ResizeObserverEntry__WEBPACK_IMPORTED_MODULE_1__.ResizeObserverEntry(ot.target);
            var targetDepth = (0,_calculateDepthForNode__WEBPACK_IMPORTED_MODULE_2__.calculateDepthForNode)(ot.target);
            entries.push(entry);
            ot.lastReportedSize = (0,_calculateBoxSize__WEBPACK_IMPORTED_MODULE_3__.calculateBoxSize)(ot.target, ot.observedBox);
            if (targetDepth < shallowestDepth) {
                shallowestDepth = targetDepth;
            }
        });
        callbacks.push(function resizeObserverCallback() {
            ro.callback.call(ro.observer, entries, ro.observer);
        });
        ro.activeTargets.splice(0, ro.activeTargets.length);
    });
    for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
        var callback = callbacks_1[_i];
        callback();
    }
    return shallowestDepth;
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/calculateBoxSize.js ***!
  \*********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "calculateBoxSize": () => (/* binding */ calculateBoxSize),
/* harmony export */   "calculateBoxSizes": () => (/* binding */ calculateBoxSizes)
/* harmony export */ });
/* harmony import */ var _ResizeObserverBoxOptions__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../ResizeObserverBoxOptions */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverBoxOptions.js");
/* harmony import */ var _ResizeObserverSize__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ResizeObserverSize */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverSize.js");
/* harmony import */ var _DOMRectReadOnly__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../DOMRectReadOnly */ "./node_modules/@juggle/resize-observer/lib/DOMRectReadOnly.js");
/* harmony import */ var _utils_element__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/element */ "./node_modules/@juggle/resize-observer/lib/utils/element.js");
/* harmony import */ var _utils_freeze__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/freeze */ "./node_modules/@juggle/resize-observer/lib/utils/freeze.js");
/* harmony import */ var _utils_global__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/global */ "./node_modules/@juggle/resize-observer/lib/utils/global.js");






var cache = new WeakMap();
var scrollRegexp = /auto|scroll/;
var verticalRegexp = /^tb|vertical/;
var IE = (/msie|trident/i).test(_utils_global__WEBPACK_IMPORTED_MODULE_5__.global.navigator && _utils_global__WEBPACK_IMPORTED_MODULE_5__.global.navigator.userAgent);
var parseDimension = function (pixel) { return parseFloat(pixel || '0'); };
var size = function (inlineSize, blockSize, switchSizes) {
    if (inlineSize === void 0) { inlineSize = 0; }
    if (blockSize === void 0) { blockSize = 0; }
    if (switchSizes === void 0) { switchSizes = false; }
    return new _ResizeObserverSize__WEBPACK_IMPORTED_MODULE_1__.ResizeObserverSize((switchSizes ? blockSize : inlineSize) || 0, (switchSizes ? inlineSize : blockSize) || 0);
};
var zeroBoxes = (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_4__.freeze)({
    devicePixelContentBoxSize: size(),
    borderBoxSize: size(),
    contentBoxSize: size(),
    contentRect: new _DOMRectReadOnly__WEBPACK_IMPORTED_MODULE_2__.DOMRectReadOnly(0, 0, 0, 0)
});
var calculateBoxSizes = function (target, forceRecalculation) {
    if (forceRecalculation === void 0) { forceRecalculation = false; }
    if (cache.has(target) && !forceRecalculation) {
        return cache.get(target);
    }
    if ((0,_utils_element__WEBPACK_IMPORTED_MODULE_3__.isHidden)(target)) {
        cache.set(target, zeroBoxes);
        return zeroBoxes;
    }
    var cs = getComputedStyle(target);
    var svg = (0,_utils_element__WEBPACK_IMPORTED_MODULE_3__.isSVG)(target) && target.ownerSVGElement && target.getBBox();
    var removePadding = !IE && cs.boxSizing === 'border-box';
    var switchSizes = verticalRegexp.test(cs.writingMode || '');
    var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || '');
    var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || '');
    var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
    var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
    var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
    var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
    var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
    var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
    var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
    var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
    var horizontalPadding = paddingLeft + paddingRight;
    var verticalPadding = paddingTop + paddingBottom;
    var horizontalBorderArea = borderLeft + borderRight;
    var verticalBorderArea = borderTop + borderBottom;
    var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
    var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
    var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
    var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
    var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
    var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
    var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
    var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
    var boxes = (0,_utils_freeze__WEBPACK_IMPORTED_MODULE_4__.freeze)({
        devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
        borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
        contentBoxSize: size(contentWidth, contentHeight, switchSizes),
        contentRect: new _DOMRectReadOnly__WEBPACK_IMPORTED_MODULE_2__.DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
    });
    cache.set(target, boxes);
    return boxes;
};
var calculateBoxSize = function (target, observedBox, forceRecalculation) {
    var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
    switch (observedBox) {
        case _ResizeObserverBoxOptions__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
            return devicePixelContentBoxSize;
        case _ResizeObserverBoxOptions__WEBPACK_IMPORTED_MODULE_0__.ResizeObserverBoxOptions.BORDER_BOX:
            return borderBoxSize;
        default:
            return contentBoxSize;
    }
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateDepthForNode.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/calculateDepthForNode.js ***!
  \**************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "calculateDepthForNode": () => (/* binding */ calculateDepthForNode)
/* harmony export */ });
/* harmony import */ var _utils_element__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/element */ "./node_modules/@juggle/resize-observer/lib/utils/element.js");

var calculateDepthForNode = function (node) {
    if ((0,_utils_element__WEBPACK_IMPORTED_MODULE_0__.isHidden)(node)) {
        return Infinity;
    }
    var depth = 0;
    var parent = node.parentNode;
    while (parent) {
        depth += 1;
        parent = parent.parentNode;
    }
    return depth;
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/deliverResizeLoopError.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/deliverResizeLoopError.js ***!
  \***************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "deliverResizeLoopError": () => (/* binding */ deliverResizeLoopError)
/* harmony export */ });
var msg = 'ResizeObserver loop completed with undelivered notifications.';
var deliverResizeLoopError = function () {
    var event;
    if (typeof ErrorEvent === 'function') {
        event = new ErrorEvent('error', {
            message: msg
        });
    }
    else {
        event = document.createEvent('Event');
        event.initEvent('error', false, false);
        event.message = msg;
    }
    window.dispatchEvent(event);
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/gatherActiveObservationsAtDepth.js":
/*!************************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/gatherActiveObservationsAtDepth.js ***!
  \************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "gatherActiveObservationsAtDepth": () => (/* binding */ gatherActiveObservationsAtDepth)
/* harmony export */ });
/* harmony import */ var _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/resizeObservers */ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js");
/* harmony import */ var _calculateDepthForNode__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./calculateDepthForNode */ "./node_modules/@juggle/resize-observer/lib/algorithms/calculateDepthForNode.js");


var gatherActiveObservationsAtDepth = function (depth) {
    _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__.resizeObservers.forEach(function processObserver(ro) {
        ro.activeTargets.splice(0, ro.activeTargets.length);
        ro.skippedTargets.splice(0, ro.skippedTargets.length);
        ro.observationTargets.forEach(function processTarget(ot) {
            if (ot.isActive()) {
                if ((0,_calculateDepthForNode__WEBPACK_IMPORTED_MODULE_1__.calculateDepthForNode)(ot.target) > depth) {
                    ro.activeTargets.push(ot);
                }
                else {
                    ro.skippedTargets.push(ot);
                }
            }
        });
    });
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/hasActiveObservations.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/hasActiveObservations.js ***!
  \**************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "hasActiveObservations": () => (/* binding */ hasActiveObservations)
/* harmony export */ });
/* harmony import */ var _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/resizeObservers */ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js");

var hasActiveObservations = function () {
    return _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__.resizeObservers.some(function (ro) { return ro.activeTargets.length > 0; });
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/algorithms/hasSkippedObservations.js":
/*!***************************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/algorithms/hasSkippedObservations.js ***!
  \***************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "hasSkippedObservations": () => (/* binding */ hasSkippedObservations)
/* harmony export */ });
/* harmony import */ var _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utils/resizeObservers */ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js");

var hasSkippedObservations = function () {
    return _utils_resizeObservers__WEBPACK_IMPORTED_MODULE_0__.resizeObservers.some(function (ro) { return ro.skippedTargets.length > 0; });
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/exports/resize-observer.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/exports/resize-observer.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ResizeObserver": () => (/* reexport safe */ _ResizeObserver__WEBPACK_IMPORTED_MODULE_0__.ResizeObserver),
/* harmony export */   "ResizeObserverEntry": () => (/* reexport safe */ _ResizeObserverEntry__WEBPACK_IMPORTED_MODULE_1__.ResizeObserverEntry),
/* harmony export */   "ResizeObserverSize": () => (/* reexport safe */ _ResizeObserverSize__WEBPACK_IMPORTED_MODULE_2__.ResizeObserverSize)
/* harmony export */ });
/* harmony import */ var _ResizeObserver__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../ResizeObserver */ "./node_modules/@juggle/resize-observer/lib/ResizeObserver.js");
/* harmony import */ var _ResizeObserverEntry__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ResizeObserverEntry */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverEntry.js");
/* harmony import */ var _ResizeObserverSize__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../ResizeObserverSize */ "./node_modules/@juggle/resize-observer/lib/ResizeObserverSize.js");





/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/element.js":
/*!*******************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/element.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isSVG": () => (/* binding */ isSVG),
/* harmony export */   "isHidden": () => (/* binding */ isHidden),
/* harmony export */   "isElement": () => (/* binding */ isElement),
/* harmony export */   "isReplacedElement": () => (/* binding */ isReplacedElement)
/* harmony export */ });
var isSVG = function (target) { return target instanceof SVGElement && 'getBBox' in target; };
var isHidden = function (target) {
    if (isSVG(target)) {
        var _a = target.getBBox(), width = _a.width, height = _a.height;
        return !width && !height;
    }
    var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
    return !(offsetWidth || offsetHeight || target.getClientRects().length);
};
var isElement = function (obj) {
    var _a, _b;
    if (obj instanceof Element) {
        return true;
    }
    var scope = (_b = (_a = obj) === null || _a === void 0 ? void 0 : _a.ownerDocument) === null || _b === void 0 ? void 0 : _b.defaultView;
    return !!(scope && obj instanceof scope.Element);
};
var isReplacedElement = function (target) {
    switch (target.tagName) {
        case 'INPUT':
            if (target.type !== 'image') {
                break;
            }
        case 'VIDEO':
        case 'AUDIO':
        case 'EMBED':
        case 'OBJECT':
        case 'CANVAS':
        case 'IFRAME':
        case 'IMG':
            return true;
    }
    return false;
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/freeze.js":
/*!******************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/freeze.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "freeze": () => (/* binding */ freeze)
/* harmony export */ });
var freeze = function (obj) { return Object.freeze(obj); };


/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/global.js":
/*!******************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/global.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "global": () => (/* binding */ global)
/* harmony export */ });
var global = typeof window !== 'undefined' ? window : {};


/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/process.js":
/*!*******************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/process.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "process": () => (/* binding */ process)
/* harmony export */ });
/* harmony import */ var _algorithms_hasActiveObservations__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../algorithms/hasActiveObservations */ "./node_modules/@juggle/resize-observer/lib/algorithms/hasActiveObservations.js");
/* harmony import */ var _algorithms_hasSkippedObservations__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../algorithms/hasSkippedObservations */ "./node_modules/@juggle/resize-observer/lib/algorithms/hasSkippedObservations.js");
/* harmony import */ var _algorithms_deliverResizeLoopError__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../algorithms/deliverResizeLoopError */ "./node_modules/@juggle/resize-observer/lib/algorithms/deliverResizeLoopError.js");
/* harmony import */ var _algorithms_broadcastActiveObservations__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../algorithms/broadcastActiveObservations */ "./node_modules/@juggle/resize-observer/lib/algorithms/broadcastActiveObservations.js");
/* harmony import */ var _algorithms_gatherActiveObservationsAtDepth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../algorithms/gatherActiveObservationsAtDepth */ "./node_modules/@juggle/resize-observer/lib/algorithms/gatherActiveObservationsAtDepth.js");





var process = function () {
    var depth = 0;
    (0,_algorithms_gatherActiveObservationsAtDepth__WEBPACK_IMPORTED_MODULE_4__.gatherActiveObservationsAtDepth)(depth);
    while ((0,_algorithms_hasActiveObservations__WEBPACK_IMPORTED_MODULE_0__.hasActiveObservations)()) {
        depth = (0,_algorithms_broadcastActiveObservations__WEBPACK_IMPORTED_MODULE_3__.broadcastActiveObservations)();
        (0,_algorithms_gatherActiveObservationsAtDepth__WEBPACK_IMPORTED_MODULE_4__.gatherActiveObservationsAtDepth)(depth);
    }
    if ((0,_algorithms_hasSkippedObservations__WEBPACK_IMPORTED_MODULE_1__.hasSkippedObservations)()) {
        (0,_algorithms_deliverResizeLoopError__WEBPACK_IMPORTED_MODULE_2__.deliverResizeLoopError)();
    }
    return depth > 0;
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/queueMicroTask.js":
/*!**************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/queueMicroTask.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "queueMicroTask": () => (/* binding */ queueMicroTask)
/* harmony export */ });
var trigger;
var callbacks = [];
var notify = function () { return callbacks.splice(0).forEach(function (cb) { return cb(); }); };
var queueMicroTask = function (callback) {
    if (!trigger) {
        var toggle_1 = 0;
        var el_1 = document.createTextNode('');
        var config = { characterData: true };
        new MutationObserver(function () { return notify(); }).observe(el_1, config);
        trigger = function () { el_1.textContent = "" + (toggle_1 ? toggle_1-- : toggle_1++); };
    }
    callbacks.push(callback);
    trigger();
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/queueResizeObserver.js":
/*!*******************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/queueResizeObserver.js ***!
  \*******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "queueResizeObserver": () => (/* binding */ queueResizeObserver)
/* harmony export */ });
/* harmony import */ var _queueMicroTask__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./queueMicroTask */ "./node_modules/@juggle/resize-observer/lib/utils/queueMicroTask.js");

var queueResizeObserver = function (cb) {
    (0,_queueMicroTask__WEBPACK_IMPORTED_MODULE_0__.queueMicroTask)(function ResizeObserver() {
        requestAnimationFrame(cb);
    });
};



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js":
/*!***************************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/resizeObservers.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "resizeObservers": () => (/* binding */ resizeObservers)
/* harmony export */ });
var resizeObservers = [];



/***/ }),

/***/ "./node_modules/@juggle/resize-observer/lib/utils/scheduler.js":
/*!*********************************************************************!*\
  !*** ./node_modules/@juggle/resize-observer/lib/utils/scheduler.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduler": () => (/* binding */ scheduler),
/* harmony export */   "updateCount": () => (/* binding */ updateCount)
/* harmony export */ });
/* harmony import */ var _process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./process */ "./node_modules/@juggle/resize-observer/lib/utils/process.js");
/* harmony import */ var _global__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./global */ "./node_modules/@juggle/resize-observer/lib/utils/global.js");
/* harmony import */ var _queueResizeObserver__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./queueResizeObserver */ "./node_modules/@juggle/resize-observer/lib/utils/queueResizeObserver.js");



var watching = 0;
var isWatching = function () { return !!watching; };
var CATCH_PERIOD = 250;
var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
var events = [
    'resize',
    'load',
    'transitionend',
    'animationend',
    'animationstart',
    'animationiteration',
    'keyup',
    'keydown',
    'mouseup',
    'mousedown',
    'mouseover',
    'mouseout',
    'blur',
    'focus'
];
var time = function (timeout) {
    if (timeout === void 0) { timeout = 0; }
    return Date.now() + timeout;
};
var scheduled = false;
var Scheduler = (function () {
    function Scheduler() {
        var _this = this;
        this.stopped = true;
        this.listener = function () { return _this.schedule(); };
    }
    Scheduler.prototype.run = function (timeout) {
        var _this = this;
        if (timeout === void 0) { timeout = CATCH_PERIOD; }
        if (scheduled) {
            return;
        }
        scheduled = true;
        var until = time(timeout);
        (0,_queueResizeObserver__WEBPACK_IMPORTED_MODULE_2__.queueResizeObserver)(function () {
            var elementsHaveResized = false;
            try {
                elementsHaveResized = (0,_process__WEBPACK_IMPORTED_MODULE_0__.process)();
            }
            finally {
                scheduled = false;
                timeout = until - time();
                if (!isWatching()) {
                    return;
                }
                if (elementsHaveResized) {
                    _this.run(1000);
                }
                else if (timeout > 0) {
                    _this.run(timeout);
                }
                else {
                    _this.start();
                }
            }
        });
    };
    Scheduler.prototype.schedule = function () {
        this.stop();
        this.run();
    };
    Scheduler.prototype.observe = function () {
        var _this = this;
        var cb = function () { return _this.observer && _this.observer.observe(document.body, observerConfig); };
        document.body ? cb() : _global__WEBPACK_IMPORTED_MODULE_1__.global.addEventListener('DOMContentLoaded', cb);
    };
    Scheduler.prototype.start = function () {
        var _this = this;
        if (this.stopped) {
            this.stopped = false;
            this.observer = new MutationObserver(this.listener);
            this.observe();
            events.forEach(function (name) { return _global__WEBPACK_IMPORTED_MODULE_1__.global.addEventListener(name, _this.listener, true); });
        }
    };
    Scheduler.prototype.stop = function () {
        var _this = this;
        if (!this.stopped) {
            this.observer && this.observer.disconnect();
            events.forEach(function (name) { return _global__WEBPACK_IMPORTED_MODULE_1__.global.removeEventListener(name, _this.listener, true); });
            this.stopped = true;
        }
    };
    return Scheduler;
}());
var scheduler = new Scheduler();
var updateCount = function (n) {
    !watching && n > 0 && scheduler.start();
    watching += n;
    !watching && scheduler.stop();
};



/***/ }),

/***/ "./src/cellshell.tsx":
/*!***************************!*\
  !*** ./src/cellshell.tsx ***!
  \***************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // cellshell.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var requestidlecallback_1 = __webpack_require__(/*! requestidlecallback */ "./node_modules/requestidlecallback/index.js");

var react_is_mounted_hook_1 = __importDefault(__webpack_require__(/*! react-is-mounted-hook */ "./node_modules/react-is-mounted-hook/lib/index.js"));

var react_reverse_portal_1 = __webpack_require__(/*! react-reverse-portal */ "./node_modules/react-reverse-portal/dist/web/index.js");

var placeholder_1 = __importDefault(__webpack_require__(/*! ./placeholder */ "./src/placeholder.tsx"));

var portalmanager_1 = __webpack_require__(/*! ./portalmanager */ "./src/portalmanager.tsx");

var CellShell = function CellShell(_a) {
  // console.log('running cellshell with scrollerID',scrollerID)
  var _b;

  var orientation = _a.orientation,
      cellHeight = _a.cellHeight,
      cellWidth = _a.cellWidth,
      index = _a.index,
      observer = _a.observer,
      callbacks = _a.callbacks,
      getItem = _a.getItem,
      listsize = _a.listsize,
      placeholder = _a.placeholder,
      instanceID = _a.instanceID,
      scrollerName = _a.scrollerName,
      scrollerID = _a.scrollerID;
  var portalManager = portalmanager_1.portalManager; // useContext(PortalAgent)
  // const [error, saveError] = useState(null)

  var _c = (0, react_1.useState)({
    overflow: 'hidden' // willChange:'transform', // for Chrome Android paint bug

  }),
      styles = _c[0],
      saveStyles = _c[1]; // const [itemstate,setItemstate] = useState('setup')


  var shellRef = (0, react_1.useRef)(null);
  var instanceIDRef = (0, react_1.useRef)(instanceID);
  var isMounted = (0, react_is_mounted_hook_1["default"])();
  var itemrequestRef = (0, react_1.useRef)(null);
  var portalRecord = (0, react_1.useRef)(null);

  var _d = (0, react_1.useState)('setup'),
      portalStatus = _d[0],
      setPortalStatus = _d[1]; // 'setup' -> 'render'
  // console.log('RUNNING cellshell scrollerID, portalStatus', scrollerID, portalStatus)
  // initialize


  (0, react_1.useEffect)(function () {
    var requestidlecallback = window['requestIdleCallback'] ? window['requestIdleCallback'] : requestidlecallback_1.requestIdleCallback;
    var cancelidlecallback = window['cancelIdleCallback'] ? window['cancelIdleCallback'] : requestidlecallback_1.cancelIdleCallback;
    portalRecord.current = portalManager.createPortalListItem(scrollerID, index, null, placeholderchildRef.current); // console.log('cellshell scrollerID, index, instanceID, portalRecord.current',scrollerID, index, instanceID, portalRecord.current)

    var hasUserContent = portalManager.hasPortalUserContent(scrollerID, index); // console.log('cellshell hasUserContent',index,hasUserContent)

    if (!hasUserContent) {
      setPortalStatus('renderplaceholder'); // console.log('cellshell getItem',index)

      if (isMounted() && getItem) {
        itemrequestRef.current = requestidlecallback(function () {
          var contentItem = getItem(index);

          if (contentItem && contentItem.then) {
            contentItem.then(function (usercontent) {
              if (isMounted()) {
                // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                portalRecord.current = portalManager.updatePortalListItem(scrollerID, index, usercontent);
                setPortalStatus('render'); // saveError(null)
              }
            })["catch"](function (e) {
              console.log('ERROR', e); // if (isMounted()) { 
              //     saveError(e)
              // }
            });
          } else {
            // console.log('isMounted, contentItem',isMounted(), contentItem)
            if (isMounted()) {
              if (contentItem) {
                var usercontent = contentItem; // (scrollerID == 0) && console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)

                portalRecord.current = portalManager.updatePortalListItem(scrollerID, index, usercontent);
                setPortalStatus('render'); // saveError(null)
              } else {
                console.log('ERROR', 'no content item'); // saveError(true)
              }
            }
          }
        }, {
          timeout: 250
        });
      }
    } else {
      setPortalStatus('render');
    } // cleanup


    return function () {
      var requesthandle = itemrequestRef.current;
      cancelidlecallback(requesthandle);
    };
  }, []); // initialize

  (0, react_1.useEffect)(function () {
    var localcalls = callbacks;
    localcalls.setElementData && localcalls.setElementData(getElementData(), 'register');
    return function () {
      localcalls.setElementData && localcalls.setElementData(getElementData(), 'unregister');
    };
  }, [callbacks]);
  var shellelement;
  (0, react_1.useEffect)(function () {
    if (!shellRef.current) return;
    observer.observe(shellRef.current);
    shellelement = shellRef.current;
    return function () {
      observer.unobserve(shellelement);
    };
  }, [observer, shellRef.current]);
  (0, react_1.useEffect)(function () {
    var newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles);

    if (isMounted()) {
      saveStyles(newStyles);
    }
  }, [orientation, cellHeight, cellWidth]); // cradle ondemand callback parameter value

  var getElementData = (0, react_1.useCallback)(function () {
    return [index, shellRef];
  }, []); // placeholder handling

  var customplaceholderRef = (0, react_1.useRef)(placeholder ? react_1["default"].createElement(placeholder, {
    index: index,
    listsize: listsize
  }) : null);
  var placeholderchild = (0, react_1.useMemo)(function () {
    var child = customplaceholderRef.current ? customplaceholderRef.current : react_1["default"].createElement(placeholder_1["default"], {
      index: index,
      listsize: listsize,
      error: 'none'
    });
    return child;
  }, [index, customplaceholderRef.current, listsize]);
  var placeholderchildRef = (0, react_1.useRef)(placeholderchild);
  var portalchildRef = (0, react_1.useRef)(placeholderchild);
  var usingPlaceholder = (0, react_1.useRef)(true);
  portalchildRef.current = (0, react_1.useMemo)(function () {
    var portallistitem = portalRecord.current;

    if (portalStatus != 'render') {
      if (portallistitem && !portallistitem.reparenting) {
        portallistitem.reparenting = true;
      }

      return portalchildRef.current;
    }

    if (!usingPlaceholder.current) return portalchildRef.current;
    var reverseportal = portallistitem.reverseportal;
    usingPlaceholder.current = false;
    return react_1["default"].createElement(react_reverse_portal_1.OutPortal, {
      node: reverseportal
    });
  }, [portalStatus]);
  (0, react_1.useEffect)(function () {
    var _a;

    if (portalStatus != 'render') return;

    if ((_a = portalRecord.current) === null || _a === void 0 ? void 0 : _a.reparenting) {
      setTimeout(function () {
        if (!isMounted()) return;
        portalRecord.current.reparenting = false;
      });
    }
  }, [(_b = portalRecord.current) === null || _b === void 0 ? void 0 : _b.reparenting, portalStatus]);
  return react_1["default"].createElement("div", {
    ref: shellRef,
    "data-type": 'cellshell',
    "data-scrollerid": scrollerID,
    "data-index": index,
    "data-instanceid": instanceID,
    style: styles
  }, (portalStatus == 'render' || portalStatus == 'renderplaceholder') && portalchildRef.current);
}; // CellShell


var getShellStyles = function getShellStyles(orientation, cellHeight, cellWidth, styles) {
  var styleset = Object.assign({
    position: 'relative'
  }, styles);

  if (orientation == 'horizontal') {
    styleset.width = cellWidth ? cellWidth + 'px' : 'auto';
    styleset.height = 'auto';
  } else if (orientation === 'vertical') {
    styleset.width = 'auto';
    styleset.height = cellHeight ? cellHeight + 'px' : 'auto';
  }

  return styleset;
};

exports["default"] = CellShell;

/***/ }),

/***/ "./src/cradle.tsx":
/*!************************!*\
  !*** ./src/cradle.tsx ***!
  \************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
/*
    TODO:

    ObserversAgent
    WingsAgent
    MessageAgent ? // message with host environment, such as referenceIndexCallback

    ScrollAgent
    SignalsAgent
    StateAgent
    ContentAgent
    CradleAgent
    ServiceAgent // user services
    StylesAgent

    BUGS:
    - check styles in scrollTracker args
    - reposition gets stuck at a particular number after getting behind on heavy scroll
        check pauseScrollingEffects
    - variable cells showing signs of getItem() with portal
    - Chrome sometimes misses nested cell portals horizontally
    - reduce computing intensity to avoid battery drainage
*/

/*
    Description
    -----------
    The GridStroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
    The illusion is maintained by synchronizing changes in cradle content with cradle location inside a scrollblock, such
    that as the scrollblock is moved, the cradle moves oppositely in the scrollblock (to stay visible within the viewport).
    The scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size and position which
    realistically reflects the size of the list being shown.

    The position of the cradle is controlled by a 'spine' which is a 0px height/width (along the medial - ScrollBlock can be
    verticsl or horizontal). The purpose of the spine is to act as a 'fold', above which cell content expands 'upwards', and
    below which the cell content expands  'downwards'. GridScroller can be viewed vertically or horizontally. When horizontal,
    the spine has a 0px width, so that the 'fold' is vertical, and cells expand to the left and right.

    The spine is controlled to always be in the at the leading edge of the leading cellrow of the viewport. Thus
    in vertical orientation, the spine 'top' css attribute is always equal to the 'scrollTop' position of the scrollblock,
    plus an adjustment. The adjustment is the result of the alignment of the spine in relation to the top-(or left-)most cell
    in the viewport (the 'reference' row). The spine can only be placed at the leading edge of the first visible
    cell in the viewport. Therefore the spine offset from the leading edge of the viewport can be anywhere from minus to
    plus the length of the leading row. The exact amount depends on where the 'breakpoint' of transition notification is set for
    cells crossing the viewport threshold (and can be configured). The default of the breakpoint is .5 (half the length of the cell).

    Technically, there are several reference points tracked by the GridScroller. These are:
        - spineReferenceIndex (the virtual index of the item controlling the location of the spine)
            The spineReferenceIndex is also used to allocate items above (lower index value) and below (same or higher index value)
            the fold
        - cradleReferenceIndex (the virtual index of the item defining the leading bound of the cradle content)
        - spinePosOffset (pixels - plus or minus - that the spine is placed in relation to the viewport's leading edge)
    
    These reference points are applied to the following structures:
        - the viewport
        - the scrollblock
        - the cradle, consisting of
            - the spine (contains cradle head and tail)
            - the head (contains leading items)
            - the tail (contains trailing items)

    Structure details:
        the cradle content consists of
        - the number of rows that are visible in the viewport (according to the default parameters)
            - this typically includes one partially visible row
        - the number of runway rows specified in the parameters, times 2 (one et for the head; one for the tail)
        - the number of items is the number of rows times the 'crosscount' the lateral number of cells.
        - the last row might consist of fewer items than crosscount, to match the maximum listsize
        - the cradleRowcount (visible default rows + runwaycount * 2) and viewpointRowcount (visble rows;typicall one partial)

    Item containers:
        Client cell content is contained in CellShell's, which are configured according to GridScroller's input parameters.
        The ItemCell's are in turn contained in CSS grid structures. There are two grid structures - one in the cradle head,
        and one in the cradle tail. Each grid structure is allowed uniform padding and gaps - identical between the two.

    Overscroll handling:
        Owing to the weight of the code, and potential rapidity of scrolling, there is an overscroll protocol.
        if the overscroll is such that part of the cradle is still within the viewport boundaries, then the overscroll
        is calculated as the number of cell rows that would fit (completely or partially) in the space between the edge of
        the cradle that is receding from a viewport edge.

        If the overshoot is such that the cradle has entirely passed out of the viewport, the GridScroller goes into 'Repositoining'
        mode, meaning that it tracks relative location of the spine edge of the viewport, and repaints the cradle accroding to
        this position when the scrolling stops.
*/

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var react_is_mounted_hook_1 = __importDefault(__webpack_require__(/*! react-is-mounted-hook */ "./node_modules/react-is-mounted-hook/lib/index.js")); // import ResizeObserverPolyfill from 'resize-observer-polyfill'


var viewport_1 = __webpack_require__(/*! ./viewport */ "./src/viewport.tsx");

var portalmanager_1 = __webpack_require__(/*! ./portalmanager */ "./src/portalmanager.tsx"); // import { ResizeObserver } from '@juggle/resize-observer'
// const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver


var ITEM_OBSERVER_THRESHOLD = 0; // import agency classes - loci of data and related methods

var scrollagent_1 = __importDefault(__webpack_require__(/*! ./cradle/scrollagent */ "./src/cradle/scrollagent.tsx"));

var signalsagent_1 = __importDefault(__webpack_require__(/*! ./cradle/signalsagent */ "./src/cradle/signalsagent.tsx"));

var stateagent_1 = __importDefault(__webpack_require__(/*! ./cradle/stateagent */ "./src/cradle/stateagent.tsx"));

var contentagent_1 = __importDefault(__webpack_require__(/*! ./cradle/contentagent */ "./src/cradle/contentagent.tsx"));

var cradleagent_1 = __importDefault(__webpack_require__(/*! ./cradle/cradleagent */ "./src/cradle/cradleagent.tsx"));

var observersagent_1 = __importDefault(__webpack_require__(/*! ./cradle/observersagent */ "./src/cradle/observersagent.tsx"));

var serviceagent_1 = __importDefault(__webpack_require__(/*! ./cradle/serviceagent */ "./src/cradle/serviceagent.tsx"));

var stylesagent_1 = __importDefault(__webpack_require__(/*! ./cradle/stylesagent */ "./src/cradle/stylesagent.tsx")); // popup position trackeer


var scrolltracker_1 = __importDefault(__webpack_require__(/*! ./scrolltracker */ "./src/scrolltracker.tsx"));

var Cradle = function Cradle(_a) {
  // --------------------------[ bundle cradleProps ]----------------------------
  var gap = _a.gap,
      padding = _a.padding,
      runwaycount = _a.runwaycount,
      listsize = _a.listsize,
      defaultVisibleIndex = _a.defaultVisibleIndex,
      orientation = _a.orientation,
      cellHeight = _a.cellHeight,
      cellWidth = _a.cellWidth,
      getItem = _a.getItem,
      placeholder = _a.placeholder,
      functions = _a.functions,
      styles = _a.styles,
      scrollerName = _a.scrollerName,
      scrollerID = _a.scrollerID; // functions and styles handled separately

  var cradlePropsRef = (0, react_1.useRef)(null); // access by closures

  cradlePropsRef.current = (0, react_1.useMemo)(function () {
    return {
      gap: gap,
      padding: padding,
      runwaycount: runwaycount,
      listsize: listsize,
      defaultVisibleIndex: defaultVisibleIndex,
      orientation: orientation,
      cellHeight: cellHeight,
      cellWidth: cellWidth,
      getItem: getItem,
      placeholder: placeholder,
      scrollerName: scrollerName,
      scrollerID: scrollerID
    };
  }, [gap, padding, runwaycount, listsize, defaultVisibleIndex, orientation, cellHeight, cellWidth, getItem, placeholder, scrollerName, scrollerID]);
  var cradleProps = cradlePropsRef.current; // =============================================================================================
  // --------------------------------------[ INITIALIZATION ]-------------------------------------
  // =============================================================================================
  // -----------------------------------------------------------------------
  // -----------------------------------[ utilites ]------------------------
  // const portalManager = portalAgentInstance// useContext(PortalAgent)

  var isMounted = (0, react_is_mounted_hook_1["default"])();
  var referenceIndexCallbackRef = (0, react_1.useRef)(functions === null || functions === void 0 ? void 0 : functions.referenceIndexCallback); // -----------------------------------------------------------------------
  // ---------------------------[ context data ]----------------------------

  var viewportData = (0, react_1.useContext)(viewport_1.ViewportContext);
  var viewportDataRef = (0, react_1.useRef)(null);
  viewportDataRef.current = viewportData;

  var _b = (0, react_1.useState)('setup'),
      cradleState = _b[0],
      setCradleState = _b[1];

  var cradleStateRef = (0, react_1.useRef)(null); // access by closures

  cradleStateRef.current = cradleState;
  var isReparentingRef = (0, react_1.useRef)(false); // -----------------------------------------------------------------------
  // -------------------------[ configuration ]-----------------

  var viewportDimensions = viewportData.viewportDimensions;
  var viewportheight = viewportDimensions.height,
      viewportwidth = viewportDimensions.width;
  var crosscount = (0, react_1.useMemo)(function () {
    console.log('in cradle calc crosscount viewportheight, viewportwidth', viewportheight, viewportwidth, Object.assign({}, viewportDataRef.current));
    var crosscount;
    var size = orientation == 'horizontal' ? viewportheight : viewportwidth;
    var crossLength = orientation == 'horizontal' ? cellHeight : cellWidth;
    var lengthforcalc = size - padding * 2 + gap; // length of viewport

    var tilelengthforcalc = crossLength + gap;
    tilelengthforcalc = Math.min(tilelengthforcalc, lengthforcalc); // result cannot be less than 1

    crosscount = Math.floor(lengthforcalc / tilelengthforcalc);
    console.log('crosscount calculated in cradle', scrollerID, crosscount);
    return crosscount;
  }, [orientation, cellWidth, cellHeight, gap, padding, viewportheight, viewportwidth]);

  var _c = (0, react_1.useMemo)(function () {
    var viewportLength, cellLength;

    if (orientation == 'vertical') {
      viewportLength = viewportheight;
      cellLength = cellHeight;
    } else {
      viewportLength = viewportwidth;
      cellLength = cellWidth;
    }

    cellLength += gap;
    var viewportrowcount = Math.ceil(viewportLength / cellLength);
    var cradleRowcount = viewportrowcount + runwaycount * 2;
    var itemcount = cradleRowcount * crosscount;

    if (itemcount > listsize) {
      itemcount = listsize;
      cradleRowcount = Math.ceil(itemcount / crosscount);
    }

    return [cradleRowcount, viewportrowcount];
  }, [orientation, cellWidth, cellHeight, gap, listsize, // padding,
  viewportheight, viewportwidth, runwaycount, crosscount]),
      cradleRowcount = _c[0],
      viewportRowcount = _c[1]; // const signalsRef = useRef(Object.assign({},signalsbaseline))


  var cradleConfigRef = (0, react_1.useRef)(null);
  cradleConfigRef.current = {
    crosscount: crosscount,
    cradleRowcount: cradleRowcount,
    viewportRowcount: viewportRowcount,
    cellObserverThreshold: ITEM_OBSERVER_THRESHOLD,
    listRowcount: Math.ceil(listsize / crosscount)
  }; // -----------------------------------------------------------------------
  // -------------------------[ cradle management nodes ]-----------------

  var managersRef = (0, react_1.useRef)(null); // make available to individual managers

  var commonPropsRef = (0, react_1.useRef)({
    managersRef: managersRef,
    viewportdataRef: viewportDataRef,
    cradlePropsRef: cradlePropsRef,
    cradleConfigRef: cradleConfigRef
  });
  var serviceCallsRef = (0, react_1.useRef)({
    referenceIndexCallbackRef: referenceIndexCallbackRef
  }); // cradle butterfly html components

  var headCradleElementRef = (0, react_1.useRef)(null);
  var tailCradleElementRef = (0, react_1.useRef)(null);
  var spineCradleElementRef = (0, react_1.useRef)(null);
  var cradleElementsRef = (0, react_1.useRef)({
    head: headCradleElementRef,
    tail: tailCradleElementRef,
    spine: spineCradleElementRef
  });
  var setItemElementData = (0, react_1.useCallback)(function (itemElementData, reportType) {
    var index = itemElementData[0],
        shellref = itemElementData[1];

    if (reportType == 'register') {
      contentAgent.itemElements.set(index, shellref);
    } else if (reportType == 'unregister') {
      contentAgent.itemElements["delete"](index);
    }
  }, []);
  var contentCallbacksRef = (0, react_1.useRef)({
    setElementData: setItemElementData
  });

  var _d = (0, react_1.useMemo)(function () {
    return [new scrollagent_1["default"](commonPropsRef), new signalsagent_1["default"](commonPropsRef), new stateagent_1["default"](commonPropsRef, cradleStateRef, setCradleState, isMounted), new contentagent_1["default"](commonPropsRef, contentCallbacksRef), new cradleagent_1["default"](commonPropsRef, cradleElementsRef.current), new observersagent_1["default"](commonPropsRef), new serviceagent_1["default"](commonPropsRef, serviceCallsRef), new stylesagent_1["default"](commonPropsRef)];
  }, []),
      scrollAgent = _d[0],
      signalsAgent = _d[1],
      stateAgent = _d[2],
      contentAgent = _d[3],
      cradleAgent = _d[4],
      observersAgent = _d[5],
      serviceAgent = _d[6],
      stylesAgent = _d[7]; // to instantiate managersRef


  var managementsetRef = (0, react_1.useRef)({
    scroll: scrollAgent,
    signals: signalsAgent,
    state: stateAgent,
    content: contentAgent,
    cradle: cradleAgent,
    service: serviceAgent,
    observers: observersAgent,
    styles: stylesAgent
  });
  managersRef.current = managementsetRef.current;

  if (viewportData.isReparenting) {
    signalsAgent.resetSignals();
    viewportData.isReparenting = false;
    isReparentingRef.current = true;
    setCradleState('reparenting');
  } // ------------------------------------------------------------------------
  // -----------------------[ initialization effects ]-----------------------
  //initialize host functions properties


  (0, react_1.useEffect)(function () {
    if (functions === null || functions === void 0 ? void 0 : functions.hasOwnProperty('scrollToItem')) {
      functions.scrollToItem = serviceAgent.scrollToItem;
    }

    if (functions === null || functions === void 0 ? void 0 : functions.hasOwnProperty('getVisibleList')) {
      functions.getVisibleList = serviceAgent.getVisibleList;
    }

    if (functions === null || functions === void 0 ? void 0 : functions.hasOwnProperty('getContentList')) {
      functions.getContentList = serviceAgent.getContentList;
    }

    if (functions === null || functions === void 0 ? void 0 : functions.hasOwnProperty('reload')) {
      functions.reload = serviceAgent.reload;
    }

    referenceIndexCallbackRef.current = functions === null || functions === void 0 ? void 0 : functions.referenceIndexCallback;
  }, [functions]); // initialize window scroll listener

  (0, react_1.useEffect)(function () {
    var viewportdata = viewportDataRef.current;
    viewportdata.elementref.current.addEventListener('scroll', scrollAgent.onScroll);
    return function () {
      viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll', scrollAgent.onScroll);
    };
  }, []); // -----------------------------------------------------------------------
  // -----------------------[ reconfiguration effects ]---------------------
  // trigger resizing based on viewport state

  (0, react_1.useEffect)(function () {
    if (cradleStateRef.current == 'setup') return;

    if (viewportData.isResizing) {
      cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex;
      cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset;
      var signals = signalsAgent.signals;
      signals.pauseCellObserver = true;
      signals.pauseCradleIntersectionObserver = true;
      signals.pauseCradleResizeObserver = true;
      signals.pauseScrollingEffects = true;
      setCradleState('resizing');
    } // complete resizing mode


    if (!viewportData.isResizing && cradleStateRef.current == 'resizing') {
      setCradleState('resized');
    }
  }, [viewportData.isResizing]); // reload for changed parameters

  (0, react_1.useEffect)(function () {
    if (cradleStateRef.current == 'setup') return;
    cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex;
    cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset;
    var signals = signalsAgent.signals;
    signals.pauseCellObserver = true;
    signals.pauseScrollingEffects = true;
    setCradleState('reload');
  }, [listsize, cellHeight, cellWidth, gap, padding]); // trigger pivot on change in orientation

  (0, react_1.useEffect)(function () {
    if (cradleStateRef.current != 'setup') {
      cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex;
      cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset; // get previous ratio

      var previousCellPixelLength = orientation == 'vertical' ? cradlePropsRef.current.cellWidth : cradlePropsRef.current.cellHeight;
      var previousSpineOffset = cradleAgent.cellReferenceData.nextSpineOffset;
      var previousratio = previousSpineOffset / previousCellPixelLength;
      var currentCellPixelLength = orientation == 'vertical' ? cradlePropsRef.current.cellHeight : cradlePropsRef.current.cellWidth;
      var currentSpineOffset = previousratio * currentCellPixelLength;
      cradleAgent.cellReferenceData.nextSpineOffset = Math.round(currentSpineOffset);
      var signals = signalsAgent.signals;
      signals.pauseCellObserver = true; // pauseCradleIntersectionObserverRef.current = true

      signals.pauseScrollingEffects = true;
      setCradleState('pivot');
    } // let cradleContent = contentAgentRef.current.content


    cradleContent.headModel = [];
    cradleContent.tailModel = [];
    cradleContent.headView = [];
    cradleContent.tailView = [];
  }, [orientation]); // =======================================================================
  // -------------------------[ OPERATION ]---------------------------------
  // =======================================================================
  // -----------------------------------------------------------------------
  // ------------------------[ style data ]-------------------------------
  // styles for wings and spine

  var _e = (0, react_1.useMemo)(function () {
    return stylesAgent.setCradleStyles({
      orientation: orientation,
      cellHeight: cellHeight,
      cellWidth: cellWidth,
      gap: gap,
      padding: padding,
      viewportheight: viewportheight,
      viewportwidth: viewportwidth,
      crosscount: crosscount,
      userstyles: styles
    });
  }, [orientation, cellHeight, cellWidth, gap, padding, viewportheight, viewportwidth, crosscount, styles]),
      cradleHeadStyle = _e[0],
      cradleTailStyle = _e[1],
      cradleSpineStyle = _e[2]; // =================================================================================
  // -------------------------[ Observer support]-------------------------
  // =================================================================================

  /*
      There are two interection observers, one for the cradle, and another for itemShells;
          both against the viewport.
      There is also a resize observer for the cradle wings, to respond to size changes of
          variable cells.
  */
  // --------------------------[ resize observer ]-----------------------------------
  // set up cradle resizeobserver


  (0, react_1.useEffect)(function () {
    var observer = observersAgent.cradleResize.create();
    var cradleElements = cradleAgent.elements;
    observer.observe(cradleElements.headRef.current);
    observer.observe(cradleElements.tailRef.current);
    return function () {
      observer.disconnect();
    };
  }, []); // --------------------[ intersection observer for cradle body ]-----------------------
  // this sets up an IntersectionObserver of the cradle against the viewport. When the
  // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.

  (0, react_1.useEffect)(function () {
    var observer = observersAgent.cradleIntersect.create();
    var cradleElements = cradleAgent.elements;
    observer.observe(cradleElements.headRef.current);
    observer.observe(cradleElements.tailRef.current);
    return function () {
      observer.disconnect();
    };
  }, []); // --------------------------[ item shell observer ]-----------------------------

  /*
      The cradle content is driven by notifications from the IntersectionObserver.
      - as the user scrolls the cradle, which has a runwaycount at both the leading
          and trailing edges, CellShells scroll into or out of the scope of the observer
          (defined by the width/height of the viewport + the lengths of the runways). The observer
          notifies the app (through cellobservercallback() below) at the crossings of the itemshells
          of the defined observer cradle boundaries.
           The no-longer-intersecting notifications trigger dropping of that number of affected items from
          the cradle contentlist. The dropping of items from the trailing end of the content list
          triggers the addition of an equal number of items at the leading edge of the cradle content.
           Technically, the opposite end position spec is set (top or left depending on orientation),
          and the matching end position spec is set to 'auto' when items are added. This causes items to be
          "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.
           There are exceptions for setup and edge cases.
  */
  // responds to change of orientation

  (0, react_1.useEffect)(function () {
    var observer = observersAgent.cellIntersect.observer;
    if (observer) observer.disconnect();
    observer = observersAgent.cellIntersect.create();
    return function () {
      observer.disconnect();
    };
  }, [orientation]); // =====================================================================================
  // ----------------------------------[ state management ]-------------------------------
  // =====================================================================================
  // data for state processing

  var callingCradleState = (0, react_1.useRef)(cradleStateRef.current);
  var headlayoutDataRef = (0, react_1.useRef)(null); // this is the core state engine
  // useLayout for suppressing flashes

  (0, react_1.useLayoutEffect)(function () {
    var viewportData = viewportDataRef.current;
    var cradleContent = contentAgent.content;

    switch (cradleState) {
      case 'reload':
        // cradleContent.portalData.clear()
        setCradleState('setreload');
        break;

      case 'updatereposition':
        setCradleState('repositioning');
        break;

      case 'repositioning':
        break;

      case 'reparenting':
        isReparentingRef.current = false;
        setCradleState('setscrollposition');
        break;

      case 'setscrollposition':
        {
          // const cradleAgent = managersRef.current.scrollRef.current
          viewportData.elementref.current[cradleAgent.blockScrollProperty] = Math.max(0, cradleAgent.blockScrollPos);
          setCradleState('normalizesignals');
          break;
        }

      case 'updatecontent':
        {
          // scroll
          setCradleState('ready');
          break;
        }

      case 'preparerender':
        {
          var cradleContent_1 = contentAgent.content;
          cradleContent_1.headView = cradleContent_1.headModel;
          cradleContent_1.tailView = cradleContent_1.tailModel;
          setCradleState('setscrollposition');
          break;
        }
    }
  }, [cradleState]); // standard processing stages

  (0, react_1.useEffect)(function () {
    var viewportData = viewportDataRef.current;

    switch (cradleState) {
      case 'setup':
      case 'resized':
      case 'pivot':
      case 'setreload':
      case 'reposition':
        callingCradleState.current = cradleState;
        setCradleState('preparecontent');
        break;

      case 'preparecontent':
        {
          cradleContent.headModel = [];
          cradleContent.tailModel = [];
          cradleContent.headView = [];
          cradleContent.tailView = [];
          portalmanager_1.portalManager.resetScrollerPortalRepository(scrollerID);
          contentAgent.setCradleContent(callingCradleState.current);
          setCradleState('preparerender');
          break;
        }

      case 'normalizesignals':
        {
          setTimeout(function () {
            if (!isMounted()) return; // console.log('normalizesignals for cradle',scrollerID)

            if (!viewportData.isResizing) {
              // redundant scroll position to avoid accidental positioning at tail end of reposition
              var signals = signalsAgent.signals;

              if (viewportData.elementref.current) {
                // already unmounted if fails (?)
                signals.pauseCellObserver && (signals.pauseCellObserver = false);
                signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false);
                signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false);
                signals.pauseCradleResizeObserver && (signals.pauseCradleResizeObserver = false); // signals.isReparenting && (signals.isReparenting = false)
              } else {
                console.log('ERROR: viewport element not set in normalizesignals', scrollerID, viewportData);
              }

              if (signals.isCradleInView) {
                setCradleState('ready');
              } else {
                setCradleState('repositioning');
              }
            } else {
              setCradleState('resizing');
            }
          }, 100);
          break;
        }

      case 'ready':
        break;
    }
  }, [cradleState]); // =============================================================================
  // ------------------------------[ RENDER... ]----------------------------------
  // =============================================================================

  var scrollTrackerArgs = (0, react_1.useMemo)(function () {
    if (!(cradleStateRef.current == 'updatereposition' || cradleStateRef.current == 'repositioning')) {
      return;
    }

    var trackerargs = {
      top: viewportDimensions.top + 3,
      left: viewportDimensions.left + 3,
      referenceIndexOffset: cradleAgent.cellReferenceData.scrollReferenceIndex,
      listsize: cradlePropsRef.current.listsize,
      styles: cradlePropsRef.current.styles
    };
    return trackerargs;
  }, [cradleStateRef.current, viewportDimensions, cradleAgent.cellReferenceData.scrollReferenceIndex, cradlePropsRef]);
  var cradleContent = contentAgent.content;
  return react_1["default"].createElement(react_1["default"].Fragment, null, cradleStateRef.current == 'updatereposition' || cradleStateRef.current == 'repositioning' ? react_1["default"].createElement(scrolltracker_1["default"], {
    top: scrollTrackerArgs.top,
    left: scrollTrackerArgs.left,
    offset: scrollTrackerArgs.referenceIndexOffset,
    listsize: scrollTrackerArgs.listsize,
    styles: scrollTrackerArgs.styles
  }) : null, react_1["default"].createElement("div", {
    "data-type": 'cradle_handle',
    style: cradleSpineStyle,
    ref: spineCradleElementRef
  },  true ? react_1["default"].createElement("div", {
    style: {
      zIndex: 1,
      position: 'absolute',
      width: '100%',
      height: '100%',
      boxShadow: '0 0 5px 3px red'
    }
  }) : 0, react_1["default"].createElement("div", {
    "data-type": 'head',
    ref: headCradleElementRef,
    style: cradleHeadStyle
  }, cradleStateRef.current != 'setup' ? cradleContent.headView : null), react_1["default"].createElement("div", {
    "data-type": 'tail',
    ref: tailCradleElementRef,
    style: cradleTailStyle
  }, cradleStateRef.current != 'setup' ? cradleContent.tailView : null)));
}; // Cradle


exports["default"] = Cradle;

/***/ }),

/***/ "./src/cradle/contentagent.tsx":
/*!*************************************!*\
  !*** ./src/cradle/contentagent.tsx ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var contentfunctions_1 = __webpack_require__(/*! ./contentfunctions */ "./src/cradle/contentfunctions.tsx");

var portalmanager_1 = __webpack_require__(/*! ../portalmanager */ "./src/portalmanager.tsx");

var ContentAgent =
/** @class */
function (_super) {
  __extends(ContentAgent, _super);

  function ContentAgent(commonPropsRef, contentCallbacksRef) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.content = {
      cradleModel: null,
      headModel: null,
      tailModel: null,
      headView: [],
      tailView: []
    };
    _this.instanceIdCounterRef = {
      current: 0
    };
    _this.instanceIdMap = new Map();
    _this._previousScrollForward = undefined;
    _this.itemElements = new Map(); // Two public methods - setCradleContent and updateCradleContent
    // reset cradle, including allocation between head and tail parts of the cradle

    _this.setCradleContent = function (cradleState
    /*, referenceIndexData*/
    ) {
      var viewportData = _this._viewportdataRef.current;
      var cradleProps = _this._cradlePropsRef.current;
      var cradleConfig = _this._cradleconfigRef.current;
      var scrollAgent = _this._managersRef.current.scroll;
      var cradleAgent = _this._managersRef.current.cradle;
      var stateAgent = _this._managersRef.current.state;
      var serviceAgent = _this._managersRef.current.service;
      var observersAgent = _this._managersRef.current.observers;
      var viewportElement = viewportData.elementref.current;
      var visibletargetindexoffset = cradleAgent.cellReferenceData.readyReferenceIndex;
      var visibletargetscrolloffset = cradleAgent.cellReferenceData.readySpineOffset;
      var cellHeight = cradleProps.cellHeight,
          cellWidth = cradleProps.cellWidth,
          orientation = cradleProps.orientation,
          runwaycount = cradleProps.runwaycount,
          gap = cradleProps.gap,
          padding = cradleProps.padding,
          listsize = cradleProps.listsize;
      var cradleRowcount = cradleConfig.cradleRowcount,
          crosscount = cradleConfig.crosscount,
          viewportRowcount = cradleConfig.viewportRowcount;

      if (cradleState == 'reposition') {
        visibletargetscrolloffset = visibletargetindexoffset == 0 ? padding : gap;
      }

      var localContentList = [];
      var cradleContent = _this.content;

      var _a = (0, contentfunctions_1.getContentListRequirements)({
        cradleProps: cradleProps,
        cradleConfig: cradleConfig,
        visibletargetindexoffset: visibletargetindexoffset,
        targetViewportOffset: visibletargetscrolloffset,
        viewportElement: viewportData.elementref.current
      }),
          cradleReferenceIndex = _a.cradleReferenceIndex,
          referenceoffset = _a.referenceoffset,
          contentCount = _a.contentCount,
          scrollblockOffset = _a.scrollblockOffset,
          spinePosOffset = _a.spinePosOffset,
          spineAdjustment = _a.spineAdjustment; // returns content constrained by cradleRowcount


      var _b = (0, contentfunctions_1.getUICellShellList)({
        cradleProps: cradleProps,
        cradleConfig: cradleConfig,
        contentCount: contentCount,
        cradleReferenceIndex: cradleReferenceIndex,
        headchangecount: 0,
        tailchangecount: contentCount,
        localContentList: localContentList,
        callbacks: _this.contentCallbacksRef.current,
        observer: observersAgent.cellIntersect.observer,
        instanceIdCounterRef: _this.instanceIdCounterRef
      }),
          childlist = _b[0],
          deleteditems = _b[1];

      (0, contentfunctions_1.deleteAndResetPortals)(portalmanager_1.portalManager, cradleProps.scrollerID, deleteditems);

      var _c = (0, contentfunctions_1.allocateContentList)({
        contentlist: childlist,
        spineReferenceIndex: referenceoffset
      }),
          headcontentlist = _c[0],
          tailcontentlist = _c[1];

      if (headcontentlist.length == 0) {
        spinePosOffset = padding;
      }

      cradleContent.cradleModel = childlist;
      cradleContent.headModel = headcontentlist;
      cradleContent.tailModel = tailcontentlist;
      cradleAgent.cellReferenceData.scrollReferenceIndex = referenceoffset;
      cradleAgent.cellReferenceData.scrollSpineOffset = spinePosOffset;
      cradleAgent.cellReferenceData.readyReferenceIndex = referenceoffset;
      cradleAgent.cellReferenceData.readySpineOffset = spinePosOffset;

      if (serviceAgent.serviceCalls.referenceIndexCallbackRef.current) {
        var cstate = cradleState;
        if (cstate == 'setreload') cstate = 'reload';
        serviceAgent.serviceCalls.referenceIndexCallbackRef.current(cradleAgent.cellReferenceData.readyReferenceIndex, 'setCradleContent', cstate);
      }

      var cradleElements = cradleAgent.elements; //cradleElementsRef.current

      cradleAgent.blockScrollPos = scrollblockOffset - spinePosOffset;

      if (orientation == 'vertical') {
        cradleAgent.blockScrollProperty = 'scrollTop';
        cradleElements.spineRef.current.style.top = scrollblockOffset + spineAdjustment + 'px';
        cradleElements.spineRef.current.style.left = 'auto';
        cradleElements.headRef.current.style.paddingBottom = headcontentlist.length ? cradleProps.gap + 'px' : 0;
      } else {
        // orientation = 'horizontal'
        cradleAgent.blockScrollProperty = 'scrollLeft';
        cradleElements.spineRef.current.style.top = 'auto';
        cradleElements.spineRef.current.style.left = scrollblockOffset + spineAdjustment + 'px';
        cradleElements.headRef.current.style.paddingRight = headcontentlist.length ? cradleProps.gap + 'px' : 0;
      }
    };

    _this.updateCradleContent = function (entries, source) {
      var _a;

      if (source === void 0) {
        source = 'notifications';
      }

      var viewportData = _this._viewportdataRef.current;
      var cradleProps = _this._cradlePropsRef.current;
      var scrollAgent = _this._managersRef.current.scroll;
      var cradleAgent = _this._managersRef.current.cradle;
      var stateAgent = _this._managersRef.current.state;
      var observersAgent = _this._managersRef.current.observers;
      var viewportElement = viewportData.elementref.current;

      if (!viewportElement) {
        console.error('ERROR: viewport element not set in updateCradleContent', cradleProps.scrollerID, viewportData.elementref.current, viewportData);
        return;
      }

      var scrollOffset;

      if (cradleProps.orientation == 'vertical') {
        scrollOffset = viewportElement.scrollTop;
      } else {
        scrollOffset = viewportElement.scrollLeft;
      }

      if (scrollOffset < 0) {
        // for Safari elastic bounce at top of scroll
        return;
      } // ----------------------------[ 1. initialize ]----------------------------


      var scrollPositions = scrollAgent.scrollPositions; //scrollPositionsRef.current

      var scrollforward;

      if (scrollPositions.current == scrollPositions.previous) {
        // edge case 
        scrollforward = _this._previousScrollForward;
      } else {
        scrollforward = scrollPositions.current > scrollPositions.previous;
        _this._previousScrollForward = scrollforward;
      }

      if (scrollforward === undefined) {
        return; // init call
      }

      var cradleElements = cradleAgent.elements;
      var cradleContent = _this.content;
      var cradleConfig = _this._cradleconfigRef.current;
      var itemElements = _this.itemElements;
      var modelcontentlist = cradleContent.cradleModel;
      var cradleReferenceIndex = modelcontentlist[0].props.index; // --------------------[ 2. filter intersections list ]-----------------------
      // filter out inapplicable intersection entries
      // we're only interested in intersections proximal to the spine

      var intersections = (0, contentfunctions_1.isolateRelevantIntersections)({
        scrollforward: scrollforward,
        intersections: entries,
        cradleContent: cradleContent,
        cellObserverThreshold: cradleConfig.cellObserverThreshold
      }); // --------------------------------[ 3. Calculate shifts ]-------------------------------

      var _b = (0, contentfunctions_1.calcContentShifts)({
        cradleProps: cradleProps,
        cradleConfig: cradleConfig,
        cradleElements: cradleElements,
        cradleContent: cradleContent,
        viewportElement: viewportElement,
        itemElements: itemElements,
        intersections: intersections,
        scrollforward: scrollforward
      }),
          cradleindex = _b[0],
          cradleitemshift = _b[1],
          spineReferenceIndex = _b[2],
          referenceitemshift = _b[3],
          spinePosOffset = _b[4],
          contentCount = _b[5];

      if (referenceitemshift == 0 && cradleitemshift == 0) return; // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

      var _c = (0, contentfunctions_1.calcHeadAndTailChanges)({
        cradleProps: cradleProps,
        cradleConfig: cradleConfig,
        cradleContent: cradleContent,
        cradleshiftcount: cradleitemshift,
        scrollforward: scrollforward,
        cradleReferenceIndex: cradleReferenceIndex
      }),
          headchangecount = _c[0],
          tailchangecount = _c[1]; // ----------------------------------[ 5. reconfigure cradle content ]--------------------------
      // collect modified content


      var localContentList,
          deletedContentItems = [];

      if (headchangecount || tailchangecount) {
        _a = (0, contentfunctions_1.getUICellShellList)({
          cradleProps: cradleProps,
          cradleConfig: cradleConfig,
          contentCount: contentCount,
          localContentList: modelcontentlist,
          headchangecount: headchangecount,
          tailchangecount: tailchangecount,
          cradleReferenceIndex: cradleReferenceIndex,
          observer: observersAgent.cellIntersect.observer,
          callbacks: _this.contentCallbacksRef.current,
          instanceIdCounterRef: _this.instanceIdCounterRef
        }), localContentList = _a[0], deletedContentItems = _a[1];
      } else {
        localContentList = modelcontentlist;
      }

      (0, contentfunctions_1.deleteAndResetPortals)(portalmanager_1.portalManager, cradleProps.scrollerID, deletedContentItems); // ----------------------------------[ 7. allocate cradle content ]--------------------------

      var _d = (0, contentfunctions_1.allocateContentList)({
        contentlist: localContentList,
        spineReferenceIndex: spineReferenceIndex
      }),
          headcontent = _d[0],
          tailcontent = _d[1];

      cradleContent.cradleModel = localContentList;
      cradleContent.headView = cradleContent.headModel = headcontent;
      cradleContent.tailView = cradleContent.tailModel = tailcontent; // -------------------------------[ 8. set css changes ]-------------------------

      if (spinePosOffset !== undefined) {
        if (cradleProps.orientation == 'vertical') {
          cradleAgent.blockScrollPos = viewportElement.scrollTop;
          cradleAgent.blockScrollProperty = 'scrollTop';
          cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px';
          cradleElements.spineRef.current.style.left = 'auto';
          cradleElements.headRef.current.style.paddingBottom = headcontent.length ? cradleProps.gap + 'px' : 0;
        } else {
          cradleAgent.blockScrollPos = viewportElement.scrollLeft;
          cradleAgent.blockScrollProperty = 'scrollLeft';
          cradleElements.spineRef.current.style.top = 'auto';
          cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px';
          cradleElements.headRef.current.style.paddingRight = headcontent.length ? cradleProps.gap + 'px' : 0;
        }
      }

      cradleAgent.cellReferenceData.scrollReferenceIndex = spineReferenceIndex;
      cradleAgent.cellReferenceData.scrollSpineOffset = spinePosOffset;
      cradleAgent.cellReferenceData.readyReferenceIndex = spineReferenceIndex;
      cradleAgent.cellReferenceData.readySpineOffset = spinePosOffset;
      stateAgent.setCradleState('updatecontent');
    };

    _this.contentCallbacksRef = contentCallbacksRef;
    return _this;
  }

  return ContentAgent;
}(cradlesuper_1["default"]);

exports["default"] = ContentAgent;

/***/ }),

/***/ "./src/cradle/contentfunctions.tsx":
/*!*****************************************!*\
  !*** ./src/cradle/contentfunctions.tsx ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __spreadArray = this && this.__spreadArray || function (to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.deleteAndResetPortals = exports.allocateContentList = exports.getUICellShellList = exports.calcHeadAndTailChanges = exports.calcContentShifts = exports.isolateRelevantIntersections = exports.getContentListRequirements = void 0;
/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

var react_1 = __importDefault(__webpack_require__(/*! react */ "react"));

var cellshell_1 = __importDefault(__webpack_require__(/*! ../cellshell */ "./src/cellshell.tsx"));

var detect_browser_1 = __webpack_require__(/*! detect-browser */ "./node_modules/detect-browser/es/index.js");

var browser = (0, detect_browser_1.detect)();

var getContentListRequirements = function getContentListRequirements(_a) {
  var _b;

  var // called from setCradleContent only
  cradleProps = _a.cradleProps,
      cradleConfig = _a.cradleConfig,
      referenceoffset = _a.visibletargetindexoffset,
      targetViewportOffset = _a.targetViewportOffset,
      viewportElement = _a.viewportElement;
  var orientation = cradleProps.orientation,
      cellHeight = cradleProps.cellHeight,
      cellWidth = cradleProps.cellWidth,
      runwaycount = cradleProps.runwaycount,
      gap = cradleProps.gap,
      padding = cradleProps.padding,
      listsize = cradleProps.listsize;
  var crosscount = cradleConfig.crosscount,
      cradleRowcount = cradleConfig.cradleRowcount,
      viewportRowcount = cradleConfig.viewportRowcount; // reconcile spineReferenceIndex to crosscount context

  var diff = referenceoffset % crosscount;
  referenceoffset -= diff; // -------------[ calc basic inputs: cellLength, contentCount. ]----------

  var cellLength, viewportlength;

  if (orientation == 'vertical') {
    cellLength = cellHeight + gap;
    viewportlength = viewportElement.offsetHeight;
  } else {
    cellLength = cellWidth + gap;
    viewportlength = viewportElement.offsetWidth;
  } // let viewportrows = Math.floor(viewportlength / cellLength)


  var viewportrows = viewportRowcount;
  var contentCount = cradleRowcount * crosscount; // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------

  var runwayitemcount = runwaycount * crosscount;
  runwayitemcount = Math.min(runwayitemcount, referenceoffset); // for list head
  // -----------------------[ calc cradleReferenceIndex ]------------------------
  // leading edge

  var cradleReferenceIndex = referenceoffset - runwayitemcount; // ------------[ adjust cradleReferenceIndex for underflow ]------------

  diff = 0; // reset

  var indexshift = 0; // adjustment if overshoot head

  if (cradleReferenceIndex < 0) {
    diff = cradleReferenceIndex;
    indexshift = Math.floor(cradleReferenceIndex / crosscount) * crosscount;
    cradleReferenceIndex += indexshift;
  } // ------------[ adjust cradleReferenceIndex and contentCount for listsize overflow ]------------


  var spinePosOffset = targetViewportOffset % cellLength; // if (spinePosOffset < 0) { // TODO: this shouldn't happen - reproduce from wide botton to narrow
  //     spinePosOffset += (orientation == 'vertical'?cellHeight:cellWidth)
  //     referenceoffset += crosscount
  //     cradleReferenceIndex += crosscount
  // }
  // --------------------[ calc css positioning ]-----------------------

  var targetrowoffset = Math.ceil(referenceoffset / crosscount);
  var scrollblockOffset = targetrowoffset * cellLength + padding; // gap

  var spineAdjustment;

  if (targetrowoffset == 0) {
    scrollblockOffset = 0;
    spinePosOffset = 0; // padding

    spineAdjustment = padding;
  } else {
    spineAdjustment = 0; //gap;

    _b = adjustSpineOffsetForMaxRefindex({
      referenceoffset: referenceoffset,
      spinePosOffset: spinePosOffset,
      scrollblockOffset: scrollblockOffset,
      targetrowoffset: targetrowoffset,
      viewportlength: viewportlength,
      listsize: listsize,
      viewportrows: viewportrows,
      crosscount: crosscount,
      cellLength: cellLength,
      padding: padding,
      gap: gap,
      cradleReferenceIndex: cradleReferenceIndex,
      contentCount: contentCount
    }), cradleReferenceIndex = _b[0], contentCount = _b[1], referenceoffset = _b[2], scrollblockOffset = _b[3], spinePosOffset = _b[4];
  }

  return {
    cradleReferenceIndex: cradleReferenceIndex,
    referenceoffset: referenceoffset,
    contentCount: contentCount,
    scrollblockOffset: scrollblockOffset,
    spinePosOffset: spinePosOffset,
    spineAdjustment: spineAdjustment
  }; // summarize requirements message
};

exports.getContentListRequirements = getContentListRequirements;

var adjustSpineOffsetForMaxRefindex = function adjustSpineOffsetForMaxRefindex(_a) {
  var listsize = _a.listsize,
      crosscount = _a.crosscount,
      contentCount = _a.contentCount,
      cradleReferenceIndex = _a.cradleReferenceIndex,
      referenceoffset = _a.referenceoffset,
      targetrowoffset = _a.targetrowoffset,
      scrollblockOffset = _a.scrollblockOffset,
      spinePosOffset = _a.spinePosOffset,
      viewportlength = _a.viewportlength,
      viewportrows = _a.viewportrows,
      cellLength = _a.cellLength,
      padding = _a.padding,
      gap = _a.gap;
  var activelistitemcount = cradleReferenceIndex + contentCount;
  var activelistrowcount = Math.ceil(activelistitemcount / crosscount);
  var listRowcount = Math.ceil(listsize / crosscount);

  if (activelistrowcount > listRowcount) {
    var diffrows = activelistrowcount - listRowcount;
    var diff = diffrows * crosscount;
    cradleReferenceIndex -= diff;
    activelistrowcount -= diffrows;
  } // let testlistrowcount = Math.ceil((cradleReferenceIndex + contentCount + 1)/crosscount)


  if (activelistrowcount == listRowcount) {
    var diff = listsize % crosscount;

    if (diff) {
      contentCount -= crosscount - diff;
    }
  }

  var maxrefindexrowoffset = Math.ceil(listsize / crosscount) - viewportrows + 1; // console.log('targetrowoffset, maxrefindexrowoffset', targetrowoffset, maxrefindexrowoffset)

  if (targetrowoffset > maxrefindexrowoffset) {
    var diff = targetrowoffset - maxrefindexrowoffset;
    targetrowoffset -= diff; // maxrefindexrowoffset

    referenceoffset = targetrowoffset * crosscount;
    scrollblockOffset = targetrowoffset * cellLength + padding;
    spinePosOffset = viewportlength - (viewportrows - 1) * cellLength - gap;
  }

  return [cradleReferenceIndex, contentCount, referenceoffset, scrollblockOffset, spinePosOffset];
}; // filter out items that not proximate to the spine


var isolateRelevantIntersections = function isolateRelevantIntersections(_a) {
  var intersections = _a.intersections,
      cradleContent = _a.cradleContent,
      cellObserverThreshold = _a.cellObserverThreshold,
      scrollforward = _a.scrollforward;
  var headcontent = cradleContent.headModel;
  var tailcontent = cradleContent.tailModel;
  var headindexes = [],
      tailindexes = [],
      headintersectionindexes = [],
      headintersections = [],
      tailintersectionindexes = [],
      tailintersections = [],
      intersecting = {},
      filteredintersections = []; // collect lists of indexes...
  // headindexes, tailindexes

  for (var _i = 0, headcontent_1 = headcontent; _i < headcontent_1.length; _i++) {
    var component = headcontent_1[_i];
    headindexes.push(component.props.index);
  }

  for (var _b = 0, tailcontent_1 = tailcontent; _b < tailcontent_1.length; _b++) {
    var component = tailcontent_1[_b];
    tailindexes.push(component.props.index);
  }

  var duplicates = {};
  var intersectionsptr = 0;

  for (var _c = 0, intersections_1 = intersections; _c < intersections_1.length; _c++) {
    var entry = intersections_1[_c];
    var index = parseInt(entry.target.dataset.index);
    var headptr_1 = void 0,
        tailptr_1 = void 0;

    if (tailindexes.includes(index)) {
      tailintersectionindexes.push(index);
      tailintersections.push(entry);
      tailptr_1 = tailintersections.length - 1; // used for duplicate resolution
    } else if (headindexes.includes(index)) {
      headintersectionindexes.push(index);
      headintersections.push(entry);
      headptr_1 = headintersections.length - 1; // used for duplicate resolution
    } else {
      console.log('error: unknown intersection element, aborting isolateRelevantIntersections', entry);
      return; // shouldn't happen; give up
    }

    var ratio = void 0;

    if (browser && browser.name == 'safari') {
      ratio = entry.intersectionRatio;
    } else {
      ratio = Math.round(entry.intersectionRatio * 1000) / 1000;
    }

    var calcintersecting = ratio >= cellObserverThreshold;
    var iobj = {
      index: index,
      intersecting: calcintersecting,
      isIntersecting: entry.isIntersecting,
      ratio: ratio,
      originalratio: entry.intersectionRatio,
      time: entry.time,
      headptr: headptr_1,
      tailptr: tailptr_1,
      intersectionsptr: intersectionsptr
    };

    if (!intersecting[index]) {
      // new item
      intersecting[index] = iobj;
    } else {
      // duplicate item
      if (!Array.isArray(intersecting[index])) {
        var arr = [intersecting[index]];
        intersecting[index] = arr;
      }

      intersecting[index].push(iobj);

      if (!duplicates[index]) {
        duplicates[index] = [];
        duplicates[index].push(intersecting[index][0]);
      }

      duplicates[index].push(iobj);
    }

    intersectionsptr++;
  } // resolve duplicates. For uneven number, keep the most recent
  // otherwise delete them, they cancel each other out.


  var duplicateslength = Object.keys(duplicates).length;

  if (duplicateslength > 0) {
    // console.log('DUPLICATES found', duplicateslength, duplicates)
    var headintersectionsdelete_1 = [],
        tailintersectionsdelete_1 = [];

    for (var duplicateindex in duplicates) {
      var duplicate = duplicates[duplicateindex];

      if (duplicate.length % 2) {
        duplicate.sort(duplicatecompare);
        var entry = duplicate.slice(duplicate.length - 1, 1);
        intersecting[entry.index] = entry;
      } else {
        delete intersecting[duplicate[0].index]; // intersectingdelete.push(duplicate[0].index)
      }

      for (var _d = 0, duplicate_1 = duplicate; _d < duplicate_1.length; _d++) {
        var entryobj = duplicate_1[_d];
        var headptr_2 = entryobj.headptr;
        var tailptr_2 = entryobj.tailptr;

        if (headptr_2 !== undefined) {
          headintersectionsdelete_1.push(headptr_2);
        }

        if (tailptr_2 !== undefined) {
          tailintersectionsdelete_1.push(tailptr_2);
        }
      }
    }

    if (headintersectionsdelete_1.length) {
      headintersectionindexes = headintersectionindexes.filter(function (value, index) {
        return !headintersectionsdelete_1.includes(index);
      });
      headintersections = headintersections.filter(function (value, index) {
        return !headintersectionsdelete_1.includes(index);
      });
    }

    if (tailintersectionsdelete_1.length) {
      tailintersectionindexes = tailintersectionindexes.filter(function (value, index) {
        return !tailintersectionsdelete_1.includes(index);
      });
      tailintersections = tailintersections.filter(function (value, index) {
        return !tailintersectionsdelete_1.includes(index);
      });
    }
  }

  headintersectionindexes.sort(indexcompare);
  tailintersectionindexes.sort(indexcompare);
  headintersections.sort(entrycompare);
  tailintersections.sort(entrycompare); // set reference points in relation to the spine

  var headindex = headindexes[headindexes.length - 1];
  var tailindex = tailindexes[0];
  var headptr = headintersectionindexes.indexOf(headindex);
  var tailptr = tailintersectionindexes.indexOf(tailindex); // filter out items that register only because they have just been moved

  if (headptr !== headintersectionindexes.length - 1) {
    headptr = -1;
  }

  if (tailptr !== 0) {
    tailptr = -1;
  }

  if (headptr > -1 && tailptr > -1) {
    // edge case
    if (scrollforward) {
      headptr = -1;
    } else {
      tailptr = -1;
    }
  } // collect notifications to main thread (filtered intersections)
  // for scrollbackward


  var headrefindex, tailrefindex; // for return

  if (!scrollforward && headptr >= 0) {
    headrefindex = headintersectionindexes[headptr];
    var refindex = headrefindex + 1;
    var refintersecting = intersecting[refindex - 1].intersecting;

    for (var ptr = headptr; ptr >= 0; ptr--) {
      var index = headintersectionindexes[ptr]; // test for continuity and consistency

      if (index + 1 == refindex && intersecting[index].intersecting == refintersecting) {
        filteredintersections.push(headintersections[ptr]);
      } else {
        break;
      }

      refindex = index;
      refintersecting = intersecting[refindex].intersecting;
    }
  } // for scrollforward


  if (scrollforward && tailptr >= 0) {
    tailrefindex = tailintersectionindexes[tailptr];
    var refindex = tailrefindex - 1;
    var refintersecting = intersecting[refindex + 1].intersecting;

    for (var ptr = tailptr; ptr < tailintersectionindexes.length; ptr++) {
      var index = tailintersectionindexes[ptr]; // test for continuity and consistency

      if (index - 1 == refindex && intersecting[index].intersecting == refintersecting) {
        filteredintersections.push(tailintersections[ptr]);
      } else {
        break;
      }

      refindex = index;
      refintersecting = intersecting[index].intersecting;
    }
  }

  filteredintersections.sort(entrycompare); // TODO this should be integrated into the code above

  return filteredintersections;
};

exports.isolateRelevantIntersections = isolateRelevantIntersections;

var indexcompare = function indexcompare(a, b) {
  var retval = a < b ? -1 : 1;
  return retval;
};

var entrycompare = function entrycompare(a, b) {
  var retval = parseInt(a.target.dataset.index) < parseInt(b.target.dataset.index) ? -1 : 1;
  return retval;
};

var duplicatecompare = function duplicatecompare(a, b) {
  var retval = a.time < b.time ? -1 : 1;
};

var calcContentShifts = function calcContentShifts(_a) {
  // ------------------------[ initialize ]--------------
  var _b;

  var // called only from updateCradleContent
  cradleProps = _a.cradleProps,
      cradleElements = _a.cradleElements,
      cradleContent = _a.cradleContent,
      cradleConfig = _a.cradleConfig,
      viewportElement = _a.viewportElement,
      itemElements = _a.itemElements,
      intersections = _a.intersections,
      scrollforward = _a.scrollforward;
  var gap = cradleProps.gap,
      orientation = cradleProps.orientation,
      cellHeight = cradleProps.cellHeight,
      cellWidth = cradleProps.cellWidth,
      listsize = cradleProps.listsize,
      padding = cradleProps.padding,
      runwaycount = cradleProps.runwaycount;
  var spineElement = cradleElements.spineRef.current;
  var headElement = cradleElements.headRef.current;
  var tailElement = cradleElements.tailRef.current;
  var cradlecontentlist = cradleContent.cradleModel;
  var headcontentlist = cradleContent.headModel;
  var tailcontentlist = cradleContent.tailModel;
  var crosscount = cradleConfig.crosscount,
      cradleRowcount = cradleConfig.cradleRowcount,
      listRowcount = cradleConfig.listRowcount,
      viewportRowcount = cradleConfig.viewportRowcount,
      itemObserverThreshold = cradleConfig.itemObserverThreshold;
  var BOD = false,
      EOD = false; // beginning-of-data, end-of-data
  // -------[ 1. calculate head overshoot row count, if any ]-------

  var startingspineoffset, headblockoffset, tailblockoffset, viewportlength;
  var viewportvisiblegaplength = 0;
  var cellLength = orientation == 'vertical' ? cellHeight + gap : cellWidth + gap;

  if (orientation == 'vertical') {
    startingspineoffset = spineElement.offsetTop - viewportElement.scrollTop;
    viewportlength = viewportElement.offsetHeight; // measure any gap between the cradle and the top viewport boundary

    if (!scrollforward) {
      // if startingspineoffset is below the top by more than the height of the headElment then a gap will be visible
      viewportvisiblegaplength = startingspineoffset - headElement.offsetHeight;
    }
  } else {
    // horizontal
    startingspineoffset = spineElement.offsetLeft - viewportElement.scrollLeft;
    viewportlength = viewportElement.offsetWidth;

    if (!scrollforward) {
      viewportvisiblegaplength = startingspineoffset - headElement.offsetWidth;
    }
  }

  if (viewportvisiblegaplength < 0 || viewportvisiblegaplength > viewportlength) viewportvisiblegaplength = 0; // no visible gap, or reposition should have kicked in
  // viewportvisiblegaplength is always positive

  var overshootrowcount = viewportvisiblegaplength == 0 ? 0 : Math.ceil(viewportvisiblegaplength / cellLength); // rows to fill viewport
  // extra rows for runway

  if (overshootrowcount) {
    overshootrowcount += runwaycount;
  }

  var overshootitemcount = overshootrowcount * crosscount;

  if (overshootitemcount) {
    // (!scrollforward && overshootitemcount) { // negation of values for scroll backward
    overshootitemcount = -overshootitemcount;
    overshootrowcount = -overshootrowcount;
  } // ----------------------[ 2. calculate itemshiftcount includng overshoot ]------------------------
  // shift item count is the number of items the virtual cradle shifts, according to observer notices


  var forwardcount = 0,
      backwardcount = 0;

  if (scrollforward) {
    backwardcount = intersections.length;
  } else {
    forwardcount = intersections.length;
  }

  var cradleshiftcount = backwardcount - forwardcount + overshootitemcount;
  var referenceshiftcount = cradleshiftcount;
  var cradlerowshift = Math.ceil(cradleshiftcount / crosscount);
  var referencerowshift = cradlerowshift; // --------------------------[ 3. calc cradleindex and referenceindex ]--------------------------

  var previouscradleindex = cradlecontentlist[0].props.index;
  var previouscradlerowoffset = previouscradleindex / crosscount;
  var previousreferenceindex = (_b = tailcontentlist[0]) === null || _b === void 0 ? void 0 : _b.props.index; // TODO:Uncaught TypeError: Cannot read property 'props' of undefined

  var previousreferencerowoffset = previousreferenceindex / crosscount;
  var diff;

  if (scrollforward) {
    if (previouscradlerowoffset + cradleRowcount + cradlerowshift >= listRowcount) {
      EOD = true;
    }

    diff = previouscradlerowoffset + cradleRowcount + cradlerowshift - listRowcount;

    if (diff > 0) {
      cradlerowshift -= diff;
      cradleshiftcount -= diff * crosscount;
    }
  } else {
    if (previouscradlerowoffset + cradlerowshift <= 0) {
      BOD = true;
    }

    diff = previouscradlerowoffset + cradlerowshift;

    if (diff < 0) {
      cradlerowshift -= diff;
      cradleshiftcount -= diff * crosscount;
    }
  }

  var newcradleindex = previouscradleindex + cradleshiftcount;
  var newreferenceindex = previousreferenceindex + referenceshiftcount;

  if (newreferenceindex < 0) {
    referenceshiftcount += newreferenceindex;
    newreferenceindex = 0;
  } // -------------[ 4. calculate spineAdjustment and spinePosOffset ]------------------


  var referenceitemshiftcount = newreferenceindex - previousreferenceindex;
  var cradleitemshiftcount = newcradleindex - previouscradleindex;
  referencerowshift = referenceitemshiftcount / crosscount;
  var referencepixelshift = referencerowshift * cellLength;
  var spinePosOffset = startingspineoffset + referencepixelshift;
  var spineOffsetTarget = spinePosOffset;
  var spineAdjustment = 0;

  if (Math.abs(spinePosOffset) > cellLength) {
    spineOffsetTarget = spinePosOffset % cellLength;
    spineAdjustment = -(Math.ceil((spinePosOffset - spineOffsetTarget) / cellLength) * crosscount);
  }

  if (spineOffsetTarget < 0) {
    spineOffsetTarget += cellLength;
    spineAdjustment += crosscount;
  }

  if (spineAdjustment && (BOD || EOD)) {
    newreferenceindex += spineAdjustment;
    referenceitemshiftcount += spineAdjustment;
    spinePosOffset = spineOffsetTarget;
  } else if (spineAdjustment) {
    newcradleindex += spineAdjustment;
    cradleitemshiftcount += spineAdjustment;
    newreferenceindex += spineAdjustment;
    referenceitemshiftcount += spineAdjustment;
    spinePosOffset = spineOffsetTarget;
  }

  spinePosOffset = spineOffsetTarget; // ---------------------[ 5. return required values ]-------------------

  var cradleitemcount = cradleRowcount * crosscount;
  return [newcradleindex, cradleitemshiftcount, newreferenceindex, referenceitemshiftcount, spinePosOffset, cradleitemcount];
};

exports.calcContentShifts = calcContentShifts;

var calcHeadAndTailChanges = function calcHeadAndTailChanges(_a) {
  var cradleProps = _a.cradleProps,
      cradleConfig = _a.cradleConfig,
      cradleContent = _a.cradleContent,
      cradleshiftcount = _a.cradleshiftcount,
      scrollforward = _a.scrollforward,
      cradleReferenceIndex = _a.cradleReferenceIndex;
  var listsize = cradleProps.listsize;
  var headcontent = cradleContent.headModel;
  var tailcontent = cradleContent.tailModel;
  var crosscount = cradleConfig.crosscount,
      cradleRowcount = cradleConfig.cradleRowcount;
  cradleshiftcount = Math.abs(cradleshiftcount);
  var rowshiftcount = Math.ceil(cradleshiftcount / crosscount); //+ boundaryrowcount

  var headrowcount, tailrowcount;
  headrowcount = Math.ceil(headcontent.length / crosscount);
  tailrowcount = Math.ceil(tailcontent.length / crosscount);
  var pendingcontentoffset; // lookahead to new cradleReferenceIndex

  var headchangecount, tailchangecount; // the output instructions for getUICellShellList
  // anticipaate add to one end, clip from the other        

  var additemcount = 0;
  var cliprowcount = 0,
      clipitemcount = 0;

  if (scrollforward) {
    // clip from head; add to tail; scroll forward head is direction of scroll
    // adjust clipitemcount
    if (headrowcount + rowshiftcount > cradleProps.runwaycount) {
      var rowdiff = headrowcount + rowshiftcount - cradleProps.runwaycount;
      cliprowcount = rowdiff;
      clipitemcount = cliprowcount * crosscount;
    }

    additemcount = clipitemcount; // maintain constant cradle count

    pendingcontentoffset = cradleReferenceIndex + clipitemcount; // after clip

    var proposedtailindex = pendingcontentoffset + cradleRowcount * crosscount - 1; // modelcontentlist.length - 1
    // adkjust changes for list boundaries

    if (proposedtailindex > listsize - 1) {
      var diffitemcount = proposedtailindex - (listsize - 1); // items outside range

      additemcount -= diffitemcount; // adjust the addcontent accordingly

      var diffrows = Math.floor(diffitemcount / crosscount); // number of full rows to leave in place

      var diffrowitems = diffrows * crosscount; // derived number of items to leave in place

      clipitemcount -= diffrowitems; // apply adjustment to netshift

      if (additemcount <= 0) {
        // nothing to do
        additemcount = 0;
      }

      if (clipitemcount <= 0) {
        clipitemcount = 0;
      }
    }

    headchangecount = -clipitemcount;
    tailchangecount = additemcount;
  } else {
    // scroll backward, in direction of tail; clip from tail, add to head
    var intersectionindexes = []; // headcount will be less than minimum (runwaycount), so a shift can be accomplished[]

    if (headrowcount - rowshiftcount < cradleProps.runwaycount) {
      // calculate clip for tail
      var rowshortfall = cradleProps.runwaycount - (headrowcount - rowshiftcount);
      cliprowcount = rowshortfall;
      var tailrowitemcount = tailcontent.length % crosscount;
      if (tailrowitemcount == 0) tailrowitemcount = crosscount;
      clipitemcount = tailrowitemcount;

      if (tailrowcount > 1) {
        if (cliprowcount > tailrowcount) {
          cliprowcount = tailrowcount;
        }

        if (cliprowcount > 1) {
          clipitemcount += (cliprowcount - 1) * crosscount;
        }
      } // compenstate with additemcount


      additemcount = cliprowcount * crosscount;
    }

    var proposedindexoffset = cradleReferenceIndex - additemcount;

    if (proposedindexoffset < 0) {
      var diffitemcount = -proposedindexoffset;
      var diffrows = Math.ceil(diffitemcount / crosscount); // number of full rows to leave in place

      var diffrowitems = diffrows * crosscount;
      additemcount -= diffitemcount;
      clipitemcount -= diffrowitems;

      if (additemcount <= 0) {
        additemcount = 0;
      }

      if (clipitemcount <= 0) {
        clipitemcount = 0;
      }
    }

    headchangecount = additemcount;
    tailchangecount = -clipitemcount;
  }

  return [headchangecount, tailchangecount];
};

exports.calcHeadAndTailChanges = calcHeadAndTailChanges; // update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.

var getUICellShellList = function getUICellShellList(_a) {
  var cradleProps = _a.cradleProps,
      cradleConfig = _a.cradleConfig,
      contentCount = _a.contentCount,
      cradleReferenceIndex = _a.cradleReferenceIndex,
      headchangecount = _a.headchangecount,
      tailchangecount = _a.tailchangecount,
      contentlist = _a.localContentList,
      callbacks = _a.callbacks,
      observer = _a.observer,
      instanceIdCounterRef = _a.instanceIdCounterRef;
  var crosscount = cradleConfig.crosscount,
      cradleRowcount = cradleConfig.cradleRowcount;

  var localContentlist = __spreadArray([], contentlist, true);

  var tailindexoffset = cradleReferenceIndex + contentlist.length; // let headindexoffset = cradleReferenceIndex
  // let returnContentlist

  var headContentlist = [];
  var topconstraint = cradleReferenceIndex - headchangecount,
      bottomconstraint = cradleReferenceIndex - headchangecount + (contentCount + 1); // TODO: validate "+1"

  var deletedtailitems = [],
      deletedheaditems = [];

  if (headchangecount >= 0) {
    for (var index = cradleReferenceIndex - headchangecount; index < cradleReferenceIndex; index++) {
      if (!(index >= topconstraint && index <= bottomconstraint)) {
        continue;
      }

      headContentlist.push(acquireItem({
        index: index,
        cradleProps: cradleProps,
        observer: observer,
        callbacks: callbacks,
        instanceIdCounterRef: instanceIdCounterRef
      }));
    }
  } else {
    deletedheaditems = localContentlist.splice(0, -headchangecount);
  }

  var tailContentlist = [];

  if (tailchangecount >= 0) {
    for (var index = tailindexoffset; index < tailindexoffset + tailchangecount; index++) {
      if (!(index >= topconstraint && index <= bottomconstraint)) {
        continue;
      }

      tailContentlist.push(acquireItem({
        index: index,
        cradleProps: cradleProps,
        observer: observer,
        callbacks: callbacks,
        instanceIdCounterRef: instanceIdCounterRef
      }));
    }
  } else {
    deletedtailitems = localContentlist.splice(tailchangecount, -tailchangecount);
  }

  var deleteditems = deletedheaditems.concat(deletedtailitems);
  var componentList = headContentlist.concat(localContentlist, tailContentlist);
  return [componentList, deleteditems];
};

exports.getUICellShellList = getUICellShellList; // butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden

var allocateContentList = function allocateContentList(_a) {
  var _b;

  var contentlist = _a.contentlist,
      // of cradle, in items (React components)
  spineReferenceIndex = _a.spineReferenceIndex;
  var offsetindex = (_b = contentlist[0]) === null || _b === void 0 ? void 0 : _b.props.index; // TODO: Cannot read property 'props' of undefined

  var headitemcount;
  headitemcount = spineReferenceIndex - offsetindex;
  var headlist = contentlist.slice(0, headitemcount);
  var taillist = contentlist.slice(headitemcount);
  return [headlist, taillist];
};

exports.allocateContentList = allocateContentList;

var acquireItem = function acquireItem(_a) {
  var index = _a.index,
      cradleProps = _a.cradleProps,
      observer = _a.observer,
      callbacks = _a.callbacks,
      instanceIdCounterRef = _a.instanceIdCounterRef;
  var instanceID = instanceIdCounterRef.current++;
  return emitItem({
    index: index,
    cradleProps: cradleProps,
    observer: observer,
    callbacks: callbacks,
    instanceID: instanceID
  });
};

var emitItem = function emitItem(_a) {
  var index = _a.index,
      cradleProps = _a.cradleProps,
      observer = _a.observer,
      callbacks = _a.callbacks,
      instanceID = _a.instanceID;
  var orientation = cradleProps.orientation,
      cellHeight = cradleProps.cellHeight,
      cellWidth = cradleProps.cellWidth,
      getItem = cradleProps.getItem,
      placeholder = cradleProps.placeholder,
      listsize = cradleProps.listsize,
      scrollerName = cradleProps.scrollerName,
      scrollerID = cradleProps.scrollerID;
  return react_1["default"].createElement(cellshell_1["default"], {
    key: index,
    orientation: orientation,
    cellHeight: cellHeight,
    cellWidth: cellWidth,
    index: index,
    observer: observer,
    callbacks: callbacks,
    getItem: getItem,
    listsize: listsize,
    placeholder: placeholder,
    instanceID: instanceID,
    scrollerName: scrollerName,
    scrollerID: scrollerID
  });
};

var deleteAndResetPortals = function deleteAndResetPortals(portalManager, scrollerID, deleteList) {
  for (var _i = 0, deleteList_1 = deleteList; _i < deleteList_1.length; _i++) {
    var item = deleteList_1[_i];
    portalManager.deletePortalListItem(scrollerID, item.props.index);
  }

  if (deleteList.length) portalManager.renderPortalList(scrollerID);
};

exports.deleteAndResetPortals = deleteAndResetPortals;

/***/ }),

/***/ "./src/cradle/cradleagent.tsx":
/*!************************************!*\
  !*** ./src/cradle/cradleagent.tsx ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var CradleAgent =
/** @class */
function (_super) {
  __extends(CradleAgent, _super);

  function CradleAgent(commonPropsRef, cradleElements) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.cellReferenceData = {
      scrollReferenceIndex: null,
      scrollSpineOffset: null,
      readyReferenceIndex: null,
      readySpineOffset: null,
      nextReferenceIndex: null,
      nextSpineOffset: null
    };
    _this.elements = {
      spineRef: null,
      headRef: null,
      tailRef: null
    }; // console.log('CALLING CradleAgent CONSTRUCTOR')

    var elements = _this.elements;
    elements.spineRef = cradleElements.spine;
    elements.headRef = cradleElements.head;
    elements.tailRef = cradleElements.tail;
    var _a = commonPropsRef.current.cradlePropsRef.current,
        defaultVisibleIndex = _a.defaultVisibleIndex,
        listsize = _a.listsize,
        padding = _a.padding; // console.log('commonPropsRef.current.cradlePropsRef.current in CradleAgent constructor',commonPropsRef.current.cradlePropsRef.current)

    _this.cellReferenceData.scrollReferenceIndex = Math.min(defaultVisibleIndex, listsize - 1) || 0;
    _this.cellReferenceData.scrollSpineOffset = padding;
    _this.cellReferenceData.readyReferenceIndex = _this.cellReferenceData.scrollReferenceIndex;
    _this.cellReferenceData.readySpineOffset = _this.cellReferenceData.scrollSpineOffset;
    _this.cellReferenceData.nextReferenceIndex = _this.cellReferenceData.readyReferenceIndex;
    _this.cellReferenceData.nextSpineOffset = _this.cellReferenceData.readySpineOffset;
    return _this;
  }

  return CradleAgent;
}(cradlesuper_1["default"]);

exports["default"] = CradleAgent;

/***/ }),

/***/ "./src/cradle/cradlesuper.tsx":
/*!************************************!*\
  !*** ./src/cradle/cradlesuper.tsx ***!
  \************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";
 // cradlesuper.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var CradleManagement =
/** @class */
function () {
  function CradleManagement(commonPropsRef) {
    var _a = commonPropsRef.current,
        managersRef = _a.managersRef,
        viewportdataRef = _a.viewportdataRef,
        cradlePropsRef = _a.cradlePropsRef,
        cradleConfigRef = _a.cradleConfigRef;
    this._managersRef = managersRef;
    this._viewportdataRef = viewportdataRef;
    this._cradlePropsRef = cradlePropsRef;
    this._cradleconfigRef = cradleConfigRef;
  }

  return CradleManagement;
}();

exports["default"] = CradleManagement;

/***/ }),

/***/ "./src/cradle/observersagent.tsx":
/*!***************************************!*\
  !*** ./src/cradle/observersagent.tsx ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // wingsmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var resize_observer_1 = __webpack_require__(/*! @juggle/resize-observer */ "./node_modules/@juggle/resize-observer/lib/exports/resize-observer.js");

var ResizeObserverClass = window['ResizeObserver'] || resize_observer_1.ResizeObserver;

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var ObserversAgent =
/** @class */
function (_super) {
  __extends(ObserversAgent, _super);

  function ObserversAgent(commonPropsRef) {
    var _this = _super.call(this, commonPropsRef) || this; // TODO: stub


    _this.cradleresizeobservercallback = function (entries) {
      var signalsAgent = _this._managersRef.current.signals;
      if (signalsAgent.signals.pauseCradleResizeObserver) return;
    };

    _this.cradleIntersectionObserverCallback = function (entries) {
      var _a;

      var signalsAgent = _this._managersRef.current.signals;
      var signals = signalsAgent.signals;
      var stateAgent = _this._managersRef.current.state;
      var contentAgent = _this._managersRef.current.content;
      if (signals.pauseCradleIntersectionObserver) return;
      var viewportData = _this._viewportdataRef.current;
      if ((_a = viewportData.portalitem) === null || _a === void 0 ? void 0 : _a.reparenting) return;

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (entry.target.dataset.type == 'head') {
          signals.isHeadCradleInView = entry.isIntersecting;
        } else {
          signals.isTailCradleInView = entry.isIntersecting;
        }
      }

      signals.isCradleInView = signals.isHeadCradleInView || signals.isTailCradleInView;

      if (!signals.isCradleInView) {
        var cradleState = stateAgent.cradleStateRef.current;

        if (!viewportData.isResizing && !(cradleState == 'resized') && !(cradleState == 'repositioning') && !(cradleState == 'reposition') && !(cradleState == 'pivot')) {
          var element = viewportData.elementref.current;

          if (!element) {
            console.log('viewport element not set in cradleIntersectionObserverCallback', _this._cradlePropsRef.current.scrollerID, viewportData);
            return;
          }

          var rect = element.getBoundingClientRect();
          var top_1 = rect.top,
              right = rect.right,
              bottom = rect.bottom,
              left = rect.left;
          var width = right - left,
              height = bottom - top_1;
          viewportData.viewportDimensions = {
            top: top_1,
            right: right,
            bottom: bottom,
            left: left,
            width: width,
            height: height
          }; // update for scrolltracker

          signals.pauseCellObserver = true; // pauseCradleIntersectionObserverRef.current = true

          var cradleContent = contentAgent.content;
          cradleContent.headModel = [];
          cradleContent.tailModel = [];
          cradleContent.headView = [];
          cradleContent.tailView = [];
          stateAgent.setCradleState('repositioning');
        }
      }
    }; // the async callback from IntersectionObserver.


    _this.cellobservercallback = function (entries) {
      var signalsAgent = _this._managersRef.current.signals;
      var contentAgent = _this._managersRef.current.content;
      var stateAgent = _this._managersRef.current.state;
      var movedentries = [];

      for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];

        if (entry.target.dataset.initialized) {
          movedentries.push(entry);
        } else {
          entry.target.dataset.initialized = true;
        }
      }

      if (signalsAgent.signals.pauseCellObserver) {
        return;
      }

      stateAgent.isMounted() && contentAgent.updateCradleContent(movedentries, 'cellObserver');
    };

    _this.cradleResize = {
      observer: null,
      callback: _this.cradleresizeobservercallback,
      create: function create() {
        _this.cradleResize.observer = new ResizeObserverClass(_this.cradleResize.callback);
        return _this.cradleResize.observer;
      }
    };
    _this.cradleIntersect = {
      observer: null,
      callback: _this.cradleIntersectionObserverCallback,
      create: function create() {
        var viewportData = _this._viewportdataRef.current;
        _this.cradleIntersect.observer = new IntersectionObserver(_this.cradleIntersect.callback, {
          root: viewportData.elementref.current,
          threshold: 0
        });
        return _this.cradleIntersect.observer;
      }
    };
    _this.cellIntersect = {
      observer: null,
      callback: null,
      create: function create() {
        var viewportData = _this._viewportdataRef.current;
        _this.cellIntersect.observer = new IntersectionObserver(_this.cellobservercallback, {
          root: viewportData.elementref.current,
          threshold: _this._cradleconfigRef.current.cellObserverThreshold
        });
        return _this.cellIntersect.observer;
      }
    };
    return _this;
  }

  return ObserversAgent;
}(cradlesuper_1["default"]);

exports["default"] = ObserversAgent;

/***/ }),

/***/ "./src/cradle/scrollagent.tsx":
/*!************************************!*\
  !*** ./src/cradle/scrollagent.tsx ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200;

var ScrollAgent =
/** @class */
function (_super) {
  __extends(ScrollAgent, _super);

  function ScrollAgent(commonPropsRef) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.scrollPositions = {
      current: 0,
      previous: 0
    };
    _this._scrolltimerid = null;

    _this.onScroll = function () {
      var signals = _this._managersRef.current.signals.signals;

      if (signals.pauseScrollingEffects) {
        return;
      }

      var viewportData = _this._viewportdataRef.current;
      var viewportElement = viewportData.elementref.current;
      var scrollPositionCurrent = _this._cradlePropsRef.current.orientation == 'vertical' ? viewportElement.scrollTop : viewportElement.scrollLeft;

      if (scrollPositionCurrent < 0) {
        // for Safari
        return;
      }

      _this.scrollPositions.previous = _this.scrollPositions.current;
      _this.scrollPositions.current = scrollPositionCurrent;
      clearTimeout(_this._scrolltimerid);
      var stateAgent = _this._managersRef.current.state;
      var cradleState = stateAgent.cradleStateRef.current;
      var contentAgent = _this._managersRef.current.content;
      var cradleAgent = _this._managersRef.current.cradle;
      var serviceAgent = _this._managersRef.current.service;

      if (!viewportData.isResizing) {
        if (cradleState == 'ready' || cradleState == 'repositioning') {
          if (cradleState == 'ready') {
            // let itemindex = contentAgent.content.tailModel[0]?.props.index 
            // console.log('itemindex, readyReferenceIndex',itemindex,cradleAgent.cellReferenceData.readyReferenceIndex)
            var itemindex = cradleAgent.cellReferenceData.readyReferenceIndex;
            var spineVisiblePosOffset = void 0;
            var cradleElements = cradleAgent.elements;

            if (_this._cradlePropsRef.current.orientation == 'vertical') {
              spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - _this._viewportdataRef.current.elementref.current.scrollTop;
            } else {
              spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - _this._viewportdataRef.current.elementref.current.scrollLeft;
            }

            cradleAgent.cellReferenceData.scrollReferenceIndex = itemindex;
            cradleAgent.cellReferenceData.scrollSpineOffset = spineVisiblePosOffset;
          } else {
            _this._setScrollReferenceIndexData();

            stateAgent.setCradleState('updatereposition');
          } // TODO: re-instatiate the following


          serviceAgent.serviceCalls.referenceIndexCallbackRef.current && serviceAgent.serviceCalls.referenceIndexCallbackRef.current(cradleAgent.cellReferenceData.scrollReferenceIndex, 'scrolling', cradleState);
        }
      }

      _this._scrolltimerid = setTimeout(function () {
        _this._onAfterScroll();
      }, SCROLL_TIMEOUT_FOR_ONAFTERSCROLL);
    };

    _this._onAfterScroll = function () {
      var stateAgent = _this._managersRef.current.state;
      var cradleAgent = _this._managersRef.current.cradle;
      var cradleProps = _this._cradlePropsRef.current;
      var viewportData = _this._viewportdataRef.current; // let cradleMaster = this._managersRef.current.cradleMaster

      var contentAgent = _this._managersRef.current.content;
      if (!stateAgent.isMounted()) return;
      var spineVisiblePosOffset;
      var cradleElements = cradleAgent.elements;
      var viewportElement = viewportData.elementref.current;

      if (cradleProps.orientation == 'vertical') {
        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - viewportElement.scrollTop;
      } else {
        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - viewportElement.scrollLeft;
      }

      cradleAgent.cellReferenceData.scrollSpineOffset = spineVisiblePosOffset;

      if (!viewportData.isResizing) {
        cradleAgent.cellReferenceData.readyReferenceIndex = cradleAgent.cellReferenceData.scrollReferenceIndex;
        cradleAgent.cellReferenceData.readySpineOffset = cradleAgent.cellReferenceData.scrollSpineOffset;

        if (cradleProps.orientation == 'vertical') {
          cradleAgent.blockScrollProperty = 'scrollTop';
          cradleAgent.blockScrollPos = viewportElement.scrollTop;
        } else {
          cradleAgent.blockScrollProperty = 'scrollLeft';
          cradleAgent.blockScrollPos = viewportElement.scrollLeft;
        }
      }

      var cradleState = stateAgent.cradleStateRef.current;

      switch (cradleState) {
        case 'repositioning':
          {
            cradleAgent.nextReferenceIndex = cradleAgent.readyReferenceIndex;
            cradleAgent.nextSpineOffset = cradleAgent.readySpineOffset;
            stateAgent.setCradleState('reposition');
            break;
          }

        default:
          {
            contentAgent.updateCradleContent([], 'endofscroll'); // for Safari to compensate for overscroll
          }
      }
    };

    _this._setScrollReferenceIndexData = function () {
      var viewportData = _this._viewportdataRef.current;
      var cradleProps = _this._cradlePropsRef.current;
      var cradleConfig = _this._cradleconfigRef.current;
      var crosscount = cradleConfig.crosscount;
      var viewportElement = viewportData.elementref.current;
      var orientation = cradleProps.orientation,
          listsize = cradleProps.listsize;
      var scrollPos, cellLength;

      if (orientation == 'vertical') {
        scrollPos = viewportElement.scrollTop;
        cellLength = cradleProps.cellHeight + cradleProps.gap;
      } else {
        scrollPos = viewportElement.scrollLeft;
        cellLength = cradleProps.cellWidth + cradleProps.gap;
      }

      var referencescrolloffset = cellLength - scrollPos % cellLength;

      if (referencescrolloffset == cellLength + cradleProps.padding) {
        referencescrolloffset = 0;
      }

      var referencerowindex = Math.ceil((scrollPos - cradleProps.padding) / cellLength);
      var spineReferenceIndex = referencerowindex * crosscount;
      spineReferenceIndex = Math.min(spineReferenceIndex, listsize - 1);
      var diff = spineReferenceIndex % crosscount;
      spineReferenceIndex -= diff;
      var referenceIndexData = {
        index: spineReferenceIndex,
        spineVisiblePosOffset: referencescrolloffset
      };
      if (spineReferenceIndex == 0) referencescrolloffset = 0; // defensive

      var cradleAgent = _this._managersRef.current.cradle;
      cradleAgent.cellReferenceData.scrollReferenceIndex = spineReferenceIndex;
      cradleAgent.cellReferenceData.scrollSpineOffset = referencescrolloffset;
    };

    return _this;
  }

  return ScrollAgent;
}(cradlesuper_1["default"]);

exports["default"] = ScrollAgent;

/***/ }),

/***/ "./src/cradle/serviceagent.tsx":
/*!*************************************!*\
  !*** ./src/cradle/serviceagent.tsx ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // servicemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var ServiceAgent =
/** @class */
function (_super) {
  __extends(ServiceAgent, _super);

  function ServiceAgent(commonPropsRef, serviceCallsRef) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.getVisibleList = function () {
      var contentAgent = _this._managersRef.current.content;
      var cradleContent = contentAgent.content;
      var viewportData = _this._viewportdataRef.current;
      var cradleAgent = _this._managersRef.current.cradle;
      var cradleElements = cradleAgent.elements;
      return getVisibleItemsList({
        itemElementMap: contentAgent.itemElements,
        viewportElement: viewportData.elementref.current,
        cradleElements: cradleElements,
        cradleProps: _this._cradlePropsRef.current,
        cradleContent: cradleContent
      });
    };

    _this.getContentList = function () {
      var contentAgent = _this._managersRef.current.content;
      var contentlist = Array.from(contentAgent.itemElements);
      contentlist.sort(function (a, b) {
        return a[0] < b[0] ? -1 : 1;
      });
      return contentlist;
    };

    _this.reload = function () {
      var cradleAgent = _this._managersRef.current.cradle;
      var signalsAgent = _this._managersRef.current.signals;
      var stateAgent = _this._managersRef.current.state;
      var signals = signalsAgent.signals; // let viewportData = this._viewportdata

      signals.pauseCellObserver = true;
      signals.pauseScrollingEffects = true;
      var spineVisiblePosOffset;
      var cradleElements = cradleAgent.elements;
      cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset;
      cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex;
      stateAgent.setCradleState('reload');
    };

    _this.scrollToItem = function (index) {
      var signalsAgent = _this._managersRef.current.signals;
      var cradleAgent = _this._managersRef.current.cradle;
      var stateAgent = _this._managersRef.current.state;
      var signals = signalsAgent.signals; // let cradleAgent = cradleAgentRef.current

      signals.pauseCellObserver = true;
      signals.pauseScrollingEffects = true;
      cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset;
      cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex = index;
      stateAgent.setCradleState('reposition');
    };

    _this.serviceCalls = serviceCallsRef.current;
    return _this;
  }

  return ServiceAgent;
}(cradlesuper_1["default"]);

exports["default"] = ServiceAgent;

var getVisibleItemsList = function getVisibleItemsList(_a) {
  var itemElementMap = _a.itemElementMap,
      viewportElement = _a.viewportElement,
      cradleElements = _a.cradleElements,
      cradleProps = _a.cradleProps,
      cradleContent = _a.cradleContent;
  var headElement = cradleElements.headRef.current;
  var spineElement = cradleElements.spineRef.current;
  var orientation = cradleProps.orientation;
  var headlist = cradleContent.headView;
  var itemlistindexes = Array.from(itemElementMap.keys());
  itemlistindexes.sort(function (a, b) {
    return a < b ? -1 : 1;
  });
  var headlistindexes = [];

  for (var _i = 0, headlist_1 = headlist; _i < headlist_1.length; _i++) {
    var item = headlist_1[_i];
    headlistindexes.push(parseInt(item.props.index));
  }

  var list = [];
  var cradleTop = headElement.offsetTop + spineElement.offsetTop,
      cradleLeft = headElement.offsetLeft + spineElement.offsetLeft;
  var scrollblockTopOffset = -viewportElement.scrollTop,
      scrollblockLeftOffset = -viewportElement.scrollLeft,
      viewportHeight = viewportElement.offsetHeight,
      viewportWidth = viewportElement.offsetWidth,
      viewportTopOffset = -scrollblockTopOffset,
      viewportBottomOffset = -scrollblockTopOffset + viewportHeight;

  for (var _b = 0, itemlistindexes_1 = itemlistindexes; _b < itemlistindexes_1.length; _b++) {
    var index = itemlistindexes_1[_b];
    var element = itemElementMap.get(index).current;
    var inheadlist = headlistindexes.includes(index);
    var top_1 = inheadlist ? element.offsetTop : (orientation == 'vertical' ? headElement.offsetHeight : 0) + element.offsetTop,
        left = inheadlist ? element.offsetLeft : (orientation == 'horizontal' ? headElement.offsetWidth : 0) + element.offsetLeft,
        width = element.offsetWidth,
        height = element.offsetHeight,
        right = left + width,
        bottom = top_1 + height;
    var itemTopOffset = scrollblockTopOffset + cradleTop + top_1,
        // offset from top of viewport
    itemBottomOffset = scrollblockTopOffset + cradleTop + bottom,
        // offset from top of viewport
    itemLeftOffset = scrollblockLeftOffset + cradleLeft + left,
        itemRightOffset = scrollblockLeftOffset + cradleLeft + right;
    var isVisible = false; // default

    var topPortion = void 0,
        bottomPortion = void 0,
        leftPortion = void 0,
        rightPortion = void 0;

    if (itemTopOffset < 0 && itemBottomOffset > 0) {
      orientation == 'vertical' && (isVisible = true);
      bottomPortion = itemBottomOffset;
      topPortion = bottomPortion - height;
    } else if (itemTopOffset >= 0 && itemBottomOffset < viewportHeight) {
      orientation == 'vertical' && (isVisible = true);
      topPortion = height;
      bottomPortion = 0;
    } else if (itemTopOffset > 0 && itemTopOffset - viewportHeight < 0) {
      orientation == 'vertical' && (isVisible = true);
      topPortion = viewportHeight - itemTopOffset;
      bottomPortion = topPortion - height;
    } else {
      if (orientation == 'vertical') continue;
    }

    if (itemLeftOffset < 0 && itemRightOffset > 0) {
      orientation == 'horizontal' && (isVisible = true);
      rightPortion = itemRightOffset;
      leftPortion = rightPortion - width;
    } else if (itemLeftOffset >= 0 && itemRightOffset < viewportWidth) {
      orientation == 'horizontal' && (isVisible = true);
      leftPortion = width;
      rightPortion = 0;
    } else if (itemLeftOffset > 0 && itemLeftOffset - viewportWidth < 0) {
      orientation == 'horizontal' && (isVisible = true);
      leftPortion = viewportWidth - itemLeftOffset;
      rightPortion = leftPortion - width;
    } else {
      if (orientation == 'horizontal') continue;
    }

    var verticalRatio = topPortion > 0 ? topPortion / height : bottomPortion / height,
        horizontalRatio = leftPortion > 0 ? leftPortion / width : rightPortion / height;
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
      horizontalRatio: horizontalRatio
    };
    list.push(itemData);
  }

  return list;
};

/***/ }),

/***/ "./src/cradle/signalsagent.tsx":
/*!*************************************!*\
  !*** ./src/cradle/signalsagent.tsx ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var signalsbaseline = {
  pauseCellObserver: true,
  pauseCradleIntersectionObserver: true,
  pauseCradleResizeObserver: true,
  pauseScrollingEffects: true,
  isTailCradleInView: true,
  isHeadCradleInView: true,
  isCradleInView: true
};

var SignalsAgent =
/** @class */
function (_super) {
  __extends(SignalsAgent, _super);

  function SignalsAgent(commonPropsRef) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.signals = {
      pauseCellObserver: null,
      pauseCradleIntersectionObserver: null,
      pauseCradleResizeObserver: null,
      pauseScrollingEffects: null,
      isTailCradleInView: null,
      isHeadCradleInView: null,
      isCradleInView: null
    };

    _this.resetSignals = function () {
      _this.signals = Object.assign({}, signalsbaseline); //clone 
    };

    _this.resetSignals();

    return _this;
  }

  return SignalsAgent;
}(cradlesuper_1["default"]);

exports["default"] = SignalsAgent;

/***/ }),

/***/ "./src/cradle/stateagent.tsx":
/*!***********************************!*\
  !*** ./src/cradle/stateagent.tsx ***!
  \***********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var StateAgent =
/** @class */
function (_super) {
  __extends(StateAgent, _super);

  function StateAgent(commonPropsRef, cradleStateRef, setCradleState, isMounted) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.setCradleState = setCradleState;
    _this.cradleStateRef = cradleStateRef;
    _this.isMounted = isMounted;
    return _this;
  }

  return StateAgent;
}(cradlesuper_1["default"]);

exports["default"] = StateAgent;

/***/ }),

/***/ "./src/cradle/stylesagent.tsx":
/*!************************************!*\
  !*** ./src/cradle/stylesagent.tsx ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // stylesmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

var __extends = this && this.__extends || function () {
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  };

  return function (d, b) {
    if (typeof b !== "function" && b !== null) throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");

    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var cradlesuper_1 = __importDefault(__webpack_require__(/*! ./cradlesuper */ "./src/cradle/cradlesuper.tsx"));

var StylesAgent =
/** @class */
function (_super) {
  __extends(StylesAgent, _super);

  function StylesAgent(commonPropsRef) {
    var _this = _super.call(this, commonPropsRef) || this;

    _this.setCradleStyles = function (_a) {
      var orientation = _a.orientation,
          cellHeight = _a.cellHeight,
          cellWidth = _a.cellWidth,
          gap = _a.gap,
          padding = _a.padding,
          crosscount = _a.crosscount,
          viewportheight = _a.viewportheight,
          viewportwidth = _a.viewportwidth,
          userstyles = _a.userstyles; // TODO: change 'cradle' to 'head' and 'tail' for more granularity

      var headstyles = _this.getHeadStyles(gap, padding, orientation, userstyles === null || userstyles === void 0 ? void 0 : userstyles.cradle);

      var tailstyles = _this.getTailStyles(gap, padding, orientation, userstyles === null || userstyles === void 0 ? void 0 : userstyles.cradle);

      var spinestyles = _this.getSpineStyles(gap, padding, orientation, userstyles === null || userstyles === void 0 ? void 0 : userstyles.spine);

      headstyles.gridGap = gap + 'px';
      tailstyles.gridGap = gap + 'px';

      if (orientation == 'horizontal') {
        headstyles.padding = padding + "px 0 " + padding + "px " + padding + "px";
        headstyles.width = 'auto';
        headstyles.height = '100%';
        headstyles.gridAutoFlow = 'column'; // explict crosscount next line as workaround for FF problem - 
        //     sets length of horiz cradle items in one line (row), not multi-row config

        headstyles.gridTemplateRows = cellHeight ? "repeat(" + crosscount + ", minmax(" + cellHeight + "px, 1fr))" : 'auto'; // headstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'

        headstyles.gridTemplateColumns = 'none';
        tailstyles.padding = padding + "px " + padding + "px " + padding + "px 0";
        tailstyles.width = 'auto';
        tailstyles.height = '100%';
        tailstyles.gridAutoFlow = 'column'; // explict crosscount next line as workaround for FF problem - 
        //     sets length of horiz cradle items in one line (row), not multi-row config

        tailstyles.gridTemplateRows = cellHeight ? "repeat(" + crosscount + ", minmax(" + cellHeight + "px, 1fr))" : 'auto'; // tailstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'

        tailstyles.gridTemplateColumns = 'none';
      } else if (orientation == 'vertical') {
        headstyles.padding = padding + "px " + padding + "px 0 " + padding + "px";
        headstyles.width = '100%';
        headstyles.height = 'auto';
        headstyles.gridAutoFlow = 'row';
        headstyles.gridTemplateRows = 'none';
        headstyles.gridTemplateColumns = cellWidth ? "repeat(auto-fit, minmax(" + cellWidth + "px, 1fr))" : 'auto';
        tailstyles.padding = "0 " + padding + "px " + padding + "px " + padding + "px";
        tailstyles.width = '100%';
        tailstyles.height = 'auto';
        tailstyles.gridAutoFlow = 'row';
        tailstyles.gridTemplateRows = 'none';
        tailstyles.gridTemplateColumns = cellWidth ? "repeat(auto-fit, minmax(" + cellWidth + "px, 1fr))" : 'auto';
      }

      return [headstyles, tailstyles, spinestyles];
    };

    _this.getHeadStyles = function (gap, padding, orientation, userheadstyles) {
      var bottom, left, top, right;

      if (orientation == 'vertical') {
        bottom = 0;
        left = 0;
        right = 0;
        top = 'auto';
      } else {
        bottom = 0;
        left = 'auto';
        right = 0;
        top = 0;
      }

      return __assign(__assign({}, {
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent: 'start',
        alignContent: 'start',
        boxSizing: 'border-box',
        bottom: bottom,
        left: left,
        right: right,
        top: top
      }), userheadstyles);
    };

    _this.getTailStyles = function (gap, padding, orientation, usertailstyles) {
      var bottom, left, top, right;

      if (orientation == 'vertical') {
        bottom = 'auto';
        left = 0;
        right = 0;
        top = 0;
      } else {
        bottom = 0;
        left = 0;
        right = 'auto';
        top = 0;
      }

      return __assign(__assign({}, {
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent: 'start',
        alignContent: 'start',
        boxSizing: 'border-box',
        top: top,
        left: left,
        right: right,
        bottom: bottom
      }), usertailstyles);
    };

    _this.getSpineStyles = function (gap, padding, orientation, userspinestyles) {
      var top, left, width, height; // for spine

      if (orientation == 'vertical') {
        top = padding + 'px';
        left = 'auto';
        width = '100%';
        height = 'auto';
      } else {
        top = 'auto';
        left = padding + 'px';
        width = 0;
        height = '100%';
      }

      return __assign(__assign({}, {
        position: 'relative',
        top: top,
        left: left,
        width: width,
        height: height
      }), userspinestyles);
    };

    return _this;
  }

  return StylesAgent;
}(cradlesuper_1["default"]);

exports["default"] = StylesAgent;

/***/ }),

/***/ "./src/infinitegridscroller.tsx":
/*!**************************************!*\
  !*** ./src/infinitegridscroller.tsx ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // infinitegridscroller.tsx
// copyright (c) 2019 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
/*
    TODO:
    - nested list overflows port boundaries on android FF
    
    - promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE

    - break up cradle

    - change portalmanager to simple object (singleton)

    - calc minwidth by form factor
    - use state machine logic throughout
    */

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var viewport_1 = __importDefault(__webpack_require__(/*! ./viewport */ "./src/viewport.tsx"));

var scrollblock_1 = __importDefault(__webpack_require__(/*! ./scrollblock */ "./src/scrollblock.tsx"));

var cradle_1 = __importDefault(__webpack_require__(/*! ./cradle */ "./src/cradle.tsx"));

var portalmanager_1 = __webpack_require__(/*! ./portalmanager */ "./src/portalmanager.tsx");

var globalScrollerID = 0;

var getScrollerSessionID = function getScrollerSessionID() {
  return globalScrollerID++;
};

var portalrootstyle = {
  display: 'none'
}; // static

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

    Host content is created in a portal cache (via PortalAgent) and then portal'd to its parent item

    Scrollblock virtually represents the entirety of the list, and of course scrolls

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by CellShell, managed by Cradle

    Overall the infinitegridscroller manages the (often asynchronous) interactions of the
    components of the mechanism
*/

var InfiniteGridScroller = function InfiniteGridScroller(props) {
  var _a, _b, _c, _d, _e, _f, _g;

  var orientation = props.orientation,
      // vertical or horizontal
  gap = props.gap,
      // space between grid cells, not including the leading and trailing edges
  padding = props.padding,
      // the space between the items and the viewport, applied to the cradle
  cellHeight = props.cellHeight,
      // the outer pixel height - literal for vertical; approximate for horizontal
  cellWidth = props.cellWidth,
      // the outer pixel width - literal for horizontal; approximate for vertical
  runway = props.runway,
      // the number of items outside the view of each side of the viewport 
  // -- gives time to assemble before display
  listsize = props.listsize,
      // the exact number of the size of the virtual list
  defaultVisibleIndex = props.indexOffset,
      // the 0-based starting index of the list, when first loaded
  getItem = props.getItem,
      // function provided by host - parameter is index number, set by system; return value is 
  // host-selected component or promise of a component
  functions = props.functions,
      // properties with direct access to some component utilites, optional
  placeholder = props.placeholder,
      // a sparse component to stand in for content until the content arrives; 
  // optional, replaces default
  styles = props.styles,
      // passive style over-rides (eg. color, opacity) for viewport, scrollblock, cradle, or scrolltracker
  // to come...
  // cache = "preload", "keepload", "none"
  // dense, // boolean (only with preload)
  // advanced, technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
  layout = props.layout,
      // uniform, variable
  scrollerName = props.scrollerName;
  var portalManager = portalmanager_1.portalManager; // useContext(PortalAgent)

  var scrollerSessionID = (0, react_1.useMemo)(function () {
    return getScrollerSessionID();
  }, []);
  var scrollerSessionIDRef = (0, react_1.useRef)(scrollerSessionID); // console.log('RUNNING infinitegridscroller scrollerSessionID',scrollerSessionIDRef.current)//, scrollerState)
  // defaults

  (_a = functions) !== null && _a !== void 0 ? _a : functions = {};
  (_b = gap) !== null && _b !== void 0 ? _b : gap = 0;
  (_c = padding) !== null && _c !== void 0 ? _c : padding = 0;
  (_d = runway) !== null && _d !== void 0 ? _d : runway = 3;
  (_e = defaultVisibleIndex) !== null && _e !== void 0 ? _e : defaultVisibleIndex = 0;
  (_f = listsize) !== null && _f !== void 0 ? _f : listsize = 0;
  (_g = layout) !== null && _g !== void 0 ? _g : layout = 'uniform'; // constraints

  defaultVisibleIndex = Math.max(0, defaultVisibleIndex); // non-negative

  defaultVisibleIndex = Math.min(listsize, defaultVisibleIndex); // not larger than list

  if (!['horizontal', 'vertical'].includes(orientation)) {
    orientation = 'vertical';
  }

  (0, react_1.useEffect)(function () {
    // initialize
    portalManager.createScrollerPortalRepository(scrollerSessionIDRef.current); // cleanup

    return function () {
      portalManager.deleteScrollerPortalRepository(scrollerSessionIDRef.current);
    };
  }, []);
  return react_1["default"].createElement("div", {
    "data-type": 'scroller',
    "data-scrollerid": scrollerSessionID
  }, react_1["default"].createElement("div", {
    "data-type": 'portalroot',
    style: portalrootstyle
  }, react_1["default"].createElement(portalmanager_1.PortalList, {
    scrollerID: scrollerSessionID
  })), react_1["default"].createElement(viewport_1["default"], {
    orientation: orientation,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    gap: gap,
    padding: padding,
    functions: functions,
    styles: styles,
    scrollerID: scrollerSessionID
  }, react_1["default"].createElement(scrollblock_1["default"], {
    listsize: listsize,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    gap: gap,
    padding: padding,
    orientation: orientation,
    functions: functions,
    styles: styles,
    scrollerID: scrollerSessionID
  }, react_1["default"].createElement(cradle_1["default"], {
    gap: gap,
    padding: padding,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    listsize: listsize,
    defaultVisibleIndex: defaultVisibleIndex,
    orientation: orientation,
    getItem: getItem,
    functions: functions,
    placeholder: placeholder,
    styles: styles,
    runwaycount: runway,
    scrollerName: scrollerName,
    scrollerID: scrollerSessionID
  }))));
};

exports["default"] = InfiniteGridScroller;

/***/ }),

/***/ "./src/placeholder.tsx":
/*!*****************************!*\
  !*** ./src/placeholder.tsx ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // placeholder.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var Placeholder = function Placeholder(_a) {
  var index = _a.index,
      listsize = _a.listsize,
      error = _a.error;
  var stylesRef = (0, react_1.useRef)({
    position: 'relative',
    boxSizing: 'border-box',
    backgroundColor: 'cyan',
    border: '2px solid black',
    height: '100%',
    width: '100%'
  });
  var itemStylesRef = (0, react_1.useRef)({
    position: 'absolute',
    top: 0,
    left: 0,
    padding: '3px',
    opacity: .5,
    borderRadius: '8px',
    backgroundColor: 'white',
    margin: '3px',
    fontSize: 'smaller'
  });
  return react_1["default"].createElement("div", {
    style: stylesRef.current
  }, !error ? react_1["default"].createElement("div", {
    style: itemStylesRef.current
  }, index + 1, "/", listsize) : react_1["default"].createElement("div", {
    style: itemStylesRef.current
  }, "item is not available at this time"));
};

exports["default"] = Placeholder;

/***/ }),

/***/ "./src/portalmanager.tsx":
/*!*******************************!*\
  !*** ./src/portalmanager.tsx ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // portalmanager.tsx

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.PortalList = exports.PortalWrapper = exports.portalManager = void 0;
/*
    The infinite list scroller stores user cell data in a hidden portal cache, from whence
    the data is pulled into the relevant CellShell for display
*/

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var react_reverse_portal_1 = __webpack_require__(/*! react-reverse-portal */ "./node_modules/react-reverse-portal/dist/web/index.js");

var react_is_mounted_hook_1 = __importDefault(__webpack_require__(/*! react-is-mounted-hook */ "./node_modules/react-is-mounted-hook/lib/index.js")); // global scroller data, organized by session scrollerID


var scrollerPortalMetaData = new Map();
var scrollerPortalListData = new Map();
var scrollerPortalCallbacks = new Map();

var PortalAgentClass =
/** @class */
function () {
  function PortalAgentClass() {
    // set state of the PortalList component of the scroller to trigger render
    this.renderPortalList = function (scrollerID) {
      var scrollerlistmap = scrollerPortalListData.get(scrollerID);

      if (scrollerlistmap.modified) {
        scrollerlistmap.portalList = Array.from(scrollerlistmap.portalMap.values());
        scrollerlistmap.modified = false;
      }

      scrollerPortalCallbacks.get(scrollerID).setListState(); // trigger display update
    };
  } // initialize scroller repository


  PortalAgentClass.prototype.createScrollerPortalRepository = function (scrollerID) {
    if (!scrollerPortalMetaData.has(scrollerID)) {
      scrollerPortalMetaData.set(scrollerID, new Map());
    }

    if (!scrollerPortalListData.has(scrollerID)) {
      scrollerPortalListData.set(scrollerID, {
        modified: false,
        portalMap: new Map(),
        portalList: null
      });
    }
  }; // clear scroller repository for list recreation (like re-positioning in list)


  PortalAgentClass.prototype.clearScrollerPortalRepository = function (scrollerID) {
    if (scrollerPortalMetaData.has(scrollerID)) {
      scrollerPortalMetaData.get(scrollerID).clear();
    }

    if (scrollerPortalListData.has(scrollerID)) {
      scrollerPortalListData["delete"](scrollerID);
    }
  }; // start again


  PortalAgentClass.prototype.resetScrollerPortalRepository = function (scrollerID) {
    this.clearScrollerPortalRepository(scrollerID);
    this.createScrollerPortalRepository(scrollerID);
  }; // delete scroller repository for reset or unmount


  PortalAgentClass.prototype.deleteScrollerPortalRepository = function (scrollerID) {
    scrollerPortalMetaData["delete"](scrollerID);
    scrollerPortalListData["delete"](scrollerID);
    scrollerPortalCallbacks["delete"](scrollerID);
  }; // add a portal list item. The index is the scroller dataset index


  PortalAgentClass.prototype.createPortalListItem = function (scrollerID, index, usercontent, placeholder) {
    if (this.hasPortalListItem(scrollerID, index)) {
      return this.getPortalListItem(scrollerID, index);
    }

    var container = document.createElement('div'); // container.style.inset = '0px' // not recognized by React

    container.style.top = '0px';
    container.style.right = '0px';
    container.style.left = '0px';
    container.style.bottom = '0px';
    container.style.position = 'absolute'; // container.style.willChange = 'transform'
    // container.style.display = 'none'

    container.dataset.type = 'portalcontainer';
    container.dataset.index = index;
    container.dataset.scrollerid = scrollerID;
    container.setAttribute('key', index);

    var _a = getInPortal(usercontent || placeholder, container),
        portal = _a[0],
        reverseportal = _a[1];

    var scrollerportals = scrollerPortalListData.get(scrollerID);
    scrollerportals.portalMap.set(index, react_1["default"].createElement(exports.PortalWrapper, {
      portal: portal,
      key: index,
      index: index
    }));
    scrollerportals.modified = true;
    var portalMetaItem = {
      usercontent: usercontent,
      placeholder: placeholder,
      target: null,
      container: container,
      portal: portal,
      reverseportal: reverseportal,
      reparenting: false,
      indexid: index,
      scrollerid: scrollerID
    };
    scrollerPortalMetaData.get(scrollerID).set(index, portalMetaItem);
    this.renderPortalList(scrollerID);
    return portalMetaItem;
  }; // update the content of a portal list item


  PortalAgentClass.prototype.updatePortalListItem = function (scrollerID, index, usercontent) {
    var portalItem = this.getPortalListItem(scrollerID, index);
    var portal = updateInPortal(usercontent, portalItem.reverseportal);
    var scrollerportals = scrollerPortalListData.get(scrollerID);
    scrollerportals.portalMap.set(index, react_1["default"].createElement(exports.PortalWrapper, {
      portal: portal,
      key: index,
      index: index
    }));
    scrollerportals.modified = true;
    var portalMetaItem = scrollerPortalMetaData.get(scrollerID).get(index);
    portalMetaItem.usercontent = usercontent;
    this.renderPortalList(scrollerID);
    return portalMetaItem;
  }; // delete a portal list item


  PortalAgentClass.prototype.deletePortalListItem = function (scrollerID, index) {
    scrollerPortalMetaData.get(scrollerID)["delete"](index);
    var portalMetaItem = scrollerPortalListData.get(scrollerID);
    portalMetaItem.portalMap["delete"](index);
    portalMetaItem.modified = true;
    return portalMetaItem;
  }; // query existence of a portal list item


  PortalAgentClass.prototype.hasPortalListItem = function (scrollerID, index) {
    return scrollerPortalMetaData.get(scrollerID).has(index);
  }; // query existence of content for a portal list item


  PortalAgentClass.prototype.hasPortalUserContent = function (scrollerID, index) {
    var portalItem = this.getPortalListItem(scrollerID, index);
    return !!(portalItem && portalItem.usercontent);
  }; // get a portal list item's meta data


  PortalAgentClass.prototype.getPortalListItem = function (scrollerID, index) {
    return scrollerPortalMetaData.get(scrollerID).get(index);
  };

  return PortalAgentClass;
}(); // export the portal manager


exports.portalManager = new PortalAgentClass(); // export const PortalAgent = React.createContext(portalManager)
// Utility functions
// get a react-reverse-portal InPortal component, with its metadata
// with user content and container

var getInPortal = function getInPortal(content, container) {
  var reversePortal = (0, react_reverse_portal_1.createHtmlPortalNode)();
  reversePortal.element = container;
  return [react_1["default"].createElement(react_reverse_portal_1.InPortal, {
    node: reversePortal
  }, content), reversePortal];
}; // update an InPortal component's user content


var updateInPortal = function updateInPortal(content, reversePortal) {
  return react_1["default"].createElement(react_reverse_portal_1.InPortal, {
    node: reversePortal
  }, content);
}; // Utility components


var wrapperstyle = {
  display: 'none'
}; // static
// hidden portal wrapper for clarity and usage of conventional react relisting services

var PortalWrapper = function PortalWrapper(_a) {
  var portal = _a.portal,
      index = _a.index;
  return react_1["default"].createElement("div", {
    "data-type": 'portalwrapper',
    "data-index": index,
    style: wrapperstyle,
    key: index
  }, portal);
};

exports.PortalWrapper = PortalWrapper; // portal list component for rapid relisting of updates, using external callback for set state

var PortalList = function PortalList(_a) {
  var scrollerID = _a.scrollerID;

  var _b = (0, react_1.useState)(null),
      portalList = _b[0],
      setPortalList = _b[1];

  var isMounted = (0, react_is_mounted_hook_1["default"])();
  (0, react_1.useEffect)(function () {
    scrollerPortalCallbacks.set(scrollerID, {
      setListState: function setListState() {
        isMounted() && setPortalList(scrollerPortalListData.get(scrollerID).portalList);
      }
    });
  }, []);
  return portalList;
};

exports.PortalList = PortalList;

/***/ }),

/***/ "./src/scrollblock.tsx":
/*!*****************************!*\
  !*** ./src/scrollblock.tsx ***!
  \*****************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // scrollblock.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var viewport_1 = __webpack_require__(/*! ./viewport */ "./src/viewport.tsx");

var Scrollblock = function Scrollblock(_a) {
  var children = _a.children,
      listsize = _a.listsize,
      cellHeight = _a.cellHeight,
      cellWidth = _a.cellWidth,
      gap = _a.gap,
      padding = _a.padding,
      orientation = _a.orientation,
      functions = _a.functions,
      styles = _a.styles,
      scrollerID = _a.scrollerID; // -------------------------[ context and state ]-------------------------

  var viewportData = (0, react_1.useContext)(viewport_1.ViewportContext);

  var _b = (0, react_1.useState)('setup'),
      blockstate = _b[0],
      setBlockState = _b[1]; // setup -> render
  // console.log('RUNNING scrollblock scrollerID, viewportstate',scrollerID,blockstate)
  // -----------------------------------[ data heap ]-------------------------


  var scrollBlockLengthRef = (0, react_1.useRef)(null);
  var scrollblockRef = (0, react_1.useRef)(null);
  var divlinerstyleRef = (0, react_1.useRef)(Object.assign({
    backgroundColor: 'white',
    position: 'relative'
  }, styles === null || styles === void 0 ? void 0 : styles.cradle));

  var _c = (0, react_1.useState)(divlinerstyleRef.current),
      divlinerstyle = _c[0],
      saveDivlinerstyle = _c[1]; // to trigger render


  var viewportDimensions = viewportData.viewportDimensions,
      itemobserver = viewportData.itemobserver,
      isResizing = viewportData.isResizing;
  var top = viewportDimensions.top,
      right = viewportDimensions.right,
      bottom = viewportDimensions.bottom,
      left = viewportDimensions.left,
      width = viewportDimensions.width,
      height = viewportDimensions.height; // state engine

  (0, react_1.useEffect)(function () {
    switch (blockstate) {
      case 'setup':
        {
          setBlockState('render');
          break;
        }
    }
  }, [blockstate]);
  (0, react_1.useLayoutEffect)(function () {
    updateBlockLength();
    divlinerstyleRef.current = updateScrollblockStyles(orientation, divlinerstyleRef, scrollBlockLengthRef);
    saveDivlinerstyle(divlinerstyleRef.current);
  }, [orientation, height, width, listsize, cellHeight, cellWidth, gap, padding]);
  var updateBlockLength = (0, react_1.useCallback)(function () {
    var scrollblocklength = calcScrollblockLength({
      listsize: listsize,
      cellHeight: cellHeight,
      cellWidth: cellWidth,
      gap: gap,
      padding: padding,
      orientation: orientation,
      viewportheight: height,
      viewportwidth: width
    });
    scrollBlockLengthRef.current = scrollblocklength;
  }, [listsize, cellHeight, cellWidth, gap, padding, orientation, height, width]);
  return blockstate != 'setup' && react_1["default"].createElement("div", {
    ref: scrollblockRef,
    "data-type": 'scrollblock',
    style: divlinerstyleRef.current
  }, children);
}; // Scrollblock
// all the parameters affect the length


var calcScrollblockLength = function calcScrollblockLength(_a) {
  var listsize = _a.listsize,
      cellHeight = _a.cellHeight,
      cellWidth = _a.cellWidth,
      gap = _a.gap,
      padding = _a.padding,
      orientation = _a.orientation,
      viewportheight = _a.viewportheight,
      viewportwidth = _a.viewportwidth; // dependents of orientation

  var crosslength;
  var cellLength;
  var viewportcrosslength;

  if (orientation == 'vertical') {
    crosslength = cellWidth + gap;
    cellLength = cellHeight + gap;
    viewportcrosslength = viewportwidth;
  } else {
    crosslength = cellHeight + gap;
    cellLength = cellWidth + gap;
    viewportcrosslength = viewportheight;
  } // adjustments to viewportcrosslength


  viewportcrosslength -= padding * 2;
  viewportcrosslength += gap;
  if (viewportcrosslength < crosslength) viewportcrosslength = crosslength; // must be at least one

  var crosscount = Math.floor(viewportcrosslength / crosslength);
  var listlength = Math.ceil(listsize / crosscount);
  var straightlength = listlength * cellLength - (listlength > 0 ? gap : 0) + padding * 2;
  return straightlength;
};

var updateScrollblockStyles = function updateScrollblockStyles(orientation, stylesRef, scrollblocklengthRef) {
  var localstyles = Object.assign({}, stylesRef.current);
  var height;
  var width;

  if (orientation == 'horizontal') {
    height = '100%';
    width = scrollblocklengthRef.current + 'px';
  } else if (orientation == 'vertical') {
    height = scrollblocklengthRef.current + 'px';
    width = '100%';
  }

  localstyles.height = height;
  localstyles.width = width;
  return localstyles;
};

exports["default"] = Scrollblock;

/***/ }),

/***/ "./src/scrolltracker.tsx":
/*!*******************************!*\
  !*** ./src/scrolltracker.tsx ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // scrolltracker.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

var ScrollTracker = function ScrollTracker(_a) {
  var top = _a.top,
      left = _a.left,
      offset = _a.offset,
      listsize = _a.listsize,
      styles = _a.styles;
  var trackdata = offset + 1 + "/" + listsize;
  var styleRef = (0, react_1.useRef)(Object.assign({
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
  return react_1["default"].createElement("div", {
    "data-name": 'scrolltracker',
    style: styleRef.current
  }, trackdata);
};

exports["default"] = ScrollTracker;

/***/ }),

/***/ "./src/viewport.tsx":
/*!**************************!*\
  !*** ./src/viewport.tsx ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
 // viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

var __assign = this && this.__assign || function () {
  __assign = Object.assign || function (t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];

      for (var p in s) {
        if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
    }

    return t;
  };

  return __assign.apply(this, arguments);
};

var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  Object.defineProperty(o, k2, {
    enumerable: true,
    get: function get() {
      return m[k];
    }
  });
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});

var __importStar = this && this.__importStar || function (mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) {
    if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  }

  __setModuleDefault(result, mod);

  return result;
};

var __importDefault = this && this.__importDefault || function (mod) {
  return mod && mod.__esModule ? mod : {
    "default": mod
  };
};

Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.ViewportContext = void 0;
/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

var react_1 = __importStar(__webpack_require__(/*! react */ "react"));

exports.ViewportContext = react_1["default"].createContext(null);

var react_is_mounted_hook_1 = __importDefault(__webpack_require__(/*! react-is-mounted-hook */ "./node_modules/react-is-mounted-hook/lib/index.js"));

var resize_observer_1 = __webpack_require__(/*! @juggle/resize-observer */ "./node_modules/@juggle/resize-observer/lib/exports/resize-observer.js");

var portalmanager_1 = __webpack_require__(/*! ./portalmanager */ "./src/portalmanager.tsx");

var ResizeObserverClass = window['ResizeObserver'] || resize_observer_1.ResizeObserver; // control constant

var RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = 250;

var Viewport = function Viewport(_a) {
  // -----------------------[ initialize ]------------------
  var _b;

  var children = _a.children,
      orientation = _a.orientation,
      cellWidth = _a.cellWidth,
      cellHeight = _a.cellHeight,
      gap = _a.gap,
      padding = _a.padding,
      functions = _a.functions,
      styles = _a.styles,
      scrollerID = _a.scrollerID; // processing state

  var portalManager = portalmanager_1.portalManager; // useContext(PortalAgent)
  // setup -> render; resizing -> resized -> render

  var _c = (0, react_1.useState)('setup'),
      viewportstate = _c[0],
      setViewportState = _c[1];

  var viewportstateRef = (0, react_1.useRef)(null);
  viewportstateRef.current = viewportstate;
  var isMounted = (0, react_is_mounted_hook_1["default"])(); // data heap
  // const timeoutidRef = useRef(null)

  var viewportdivRef = (0, react_1.useRef)(undefined);
  var divlinerstyleRef = (0, react_1.useRef)(Object.assign({
    position: 'absolute',
    // height:'100%',
    // width:'100%',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'auto',
    backgroundColor: 'red'
  }, styles === null || styles === void 0 ? void 0 : styles.viewport));
  var resizeTimeridRef = (0, react_1.useRef)(null);
  var isResizingRef = (0, react_1.useRef)(false);
  var viewportDataRef = (0, react_1.useRef)({
    portalitem: null,
    isResizing: false,
    isReparenting: false
  });
  var viewportClientRectRef = (0, react_1.useRef)({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });
  var resizeObserverRef = (0, react_1.useRef)(null); // console.log('RUNNING viewport scrollerID, viewportstate, portalitem',
  //     scrollerID,viewportstate,viewportDataRef.current.portalitem)

  if (((_b = viewportDataRef.current.portalitem) === null || _b === void 0 ? void 0 : _b.reparenting) && !viewportDataRef.current.isReparenting) {
    viewportDataRef.current.isReparenting = true;
    console.log('in viewport, setting isReparenting', scrollerID, viewportstateRef.current, viewportDataRef.current);
    setViewportState('reparenting');
  }

  (0, react_1.useEffect)(function () {
    // initialize
    resizeObserverRef.current = new ResizeObserverClass(resizeCallback);
    resizeObserverRef.current.observe(viewportdivRef.current); // cleanup

    return function () {
      resizeObserverRef.current.disconnect();
    };
  }, []);
  (0, react_1.useEffect)(function () {
    if (scrollerID == 0) return;
    var parentscrollerid;
    var portalindex;
    var el = viewportdivRef.current;

    while (el) {
      if (el.dataset && el.dataset.type == 'portalcontainer') {
        portalindex = parseInt(el.dataset.index);
        parentscrollerid = parseInt(el.dataset.scrollerid);
        viewportDataRef.current.portalitem = portalManager.getPortalListItem(parentscrollerid, portalindex);
        break;
      } else {
        el = el.parentElement;
      }
    }

    if (!el) {
      console.log('ERROR: parent portalcontainer not found');
      return;
    }
  }, []);
  var resizeCallback = (0, react_1.useCallback)(function (entries) {
    if (viewportstateRef.current == 'setup') return; // console.log('viewport resizeCallback scrollerID, viewportDataRef.current.portalitem.reparenting, viewportDataRef.current.portalitem',
    //     scrollerID, viewportDataRef.current.portalitem?.reparenting, viewportDataRef.current.portalitem)
    // console.log('continuing')

    var target = entries[0].target;

    if (!target.dataset.initialized) {
      // console.log('initializing target', target.dataset)
      target.dataset.initialized = true;
      return;
    }

    if (!isResizingRef.current) {
      viewportDataRef.current.isResizing = isResizingRef.current = true;
      viewportDataRef.current = Object.assign({}, viewportDataRef.current); // trigger child render
      // below is a realtime message to cradle.onScroll
      // to stop updating the referenceIndexData, and to the item observer to stop
      // triggering responses (anticipating reset of cradle content based on resize)

      if (isMounted()) setViewportState('resizing');
    }

    clearTimeout(resizeTimeridRef.current);
    resizeTimeridRef.current = setTimeout(function () {
      isResizingRef.current = false;

      if (isMounted()) {
        setViewportState('resized');
      }
    }, RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE);
  }, []); // ----------------------------------[ calculate ]--------------------------------
  // calculated values

  divlinerstyleRef.current = (0, react_1.useMemo)(function () {
    var mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding);

    var styles = __assign({}, divlinerstyleRef.current);

    if (orientation == 'vertical') {
      styles.minWidth = mincrosslength + 'px';
      styles.minHeight = 'auto';
    } else {
      styles.minWidth = 'auto';
      styles.minHeight = mincrosslength + 'px';
    }

    return styles;
  }, [orientation, cellWidth, cellHeight, padding]); // set context data for children

  viewportDataRef.current = (0, react_1.useMemo)(function () {
    if (viewportstate == 'setup') return viewportDataRef.current;
    viewportClientRectRef.current = viewportdivRef.current.getBoundingClientRect();
    var _a = viewportClientRectRef.current,
        top = _a.top,
        right = _a.right,
        bottom = _a.bottom,
        left = _a.left;
    console.log('getting scrollerID, viewport dimensions', scrollerID, top, right, bottom, left);
    var width, height, localViewportData;
    width = right - left;
    height = bottom - top;
    localViewportData = {
      viewportDimensions: {
        top: top,
        right: right,
        bottom: bottom,
        left: left,
        width: width,
        height: height
      },
      elementref: viewportdivRef,
      isResizing: isResizingRef.current
    };
    return Object.assign({}, viewportDataRef.current, localViewportData);
  }, [orientation, isResizingRef.current, viewportstate]); // --------------------[ state processing ]---------------------------

  (0, react_1.useEffect)(function () {
    switch (viewportstate) {
      case 'setup':
      case 'resized':
        {
          setViewportState('render');
          break;
        }
    }
  }, [viewportstate]);
  (0, react_1.useEffect)(function () {
    var viewportstate = viewportstateRef.current;

    if (viewportstate == 'reparenting') {
      setViewportState('render');
    }
  }, [viewportstateRef.current]); // ----------------------[ render ]--------------------------------

  return react_1["default"].createElement(exports.ViewportContext.Provider, {
    value: viewportDataRef.current
  }, react_1["default"].createElement("div", {
    "data-type": 'viewport',
    "data-scrollerid": scrollerID,
    style: divlinerstyleRef.current,
    ref: viewportdivRef
  }, viewportstate != 'setup' && viewportstate != 'reparenting' && children));
}; // Viewport
// establish minimum width/height for the viewport -- approximately one item


var calcMinViewportCrossLength = function calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding) {
  // console.log('calcMinViewportCrossLength parms',orientation, cellWidth, cellHeight, padding,)
  var crosslength, cellLength;

  if (orientation == 'vertical') {
    cellLength = cellWidth;
  } else {
    cellLength = cellHeight;
  }

  crosslength = cellLength + padding * 2;
  return crosslength;
};

exports["default"] = Viewport;

/***/ }),

/***/ "./node_modules/detect-browser/es/index.js":
/*!*************************************************!*\
  !*** ./node_modules/detect-browser/es/index.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BrowserInfo": () => (/* binding */ BrowserInfo),
/* harmony export */   "NodeInfo": () => (/* binding */ NodeInfo),
/* harmony export */   "SearchBotDeviceInfo": () => (/* binding */ SearchBotDeviceInfo),
/* harmony export */   "BotInfo": () => (/* binding */ BotInfo),
/* harmony export */   "ReactNativeInfo": () => (/* binding */ ReactNativeInfo),
/* harmony export */   "detect": () => (/* binding */ detect),
/* harmony export */   "browserName": () => (/* binding */ browserName),
/* harmony export */   "parseUserAgent": () => (/* binding */ parseUserAgent),
/* harmony export */   "detectOS": () => (/* binding */ detectOS),
/* harmony export */   "getNodeVersion": () => (/* binding */ getNodeVersion)
/* harmony export */ });
var __spreadArray = (undefined && undefined.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var BrowserInfo = /** @class */ (function () {
    function BrowserInfo(name, version, os) {
        this.name = name;
        this.version = version;
        this.os = os;
        this.type = 'browser';
    }
    return BrowserInfo;
}());

var NodeInfo = /** @class */ (function () {
    function NodeInfo(version) {
        this.version = version;
        this.type = 'node';
        this.name = 'node';
        this.os = process.platform;
    }
    return NodeInfo;
}());

var SearchBotDeviceInfo = /** @class */ (function () {
    function SearchBotDeviceInfo(name, version, os, bot) {
        this.name = name;
        this.version = version;
        this.os = os;
        this.bot = bot;
        this.type = 'bot-device';
    }
    return SearchBotDeviceInfo;
}());

var BotInfo = /** @class */ (function () {
    function BotInfo() {
        this.type = 'bot';
        this.bot = true; // NOTE: deprecated test name instead
        this.name = 'bot';
        this.version = null;
        this.os = null;
    }
    return BotInfo;
}());

var ReactNativeInfo = /** @class */ (function () {
    function ReactNativeInfo() {
        this.type = 'react-native';
        this.name = 'react-native';
        this.version = null;
        this.os = null;
    }
    return ReactNativeInfo;
}());

// tslint:disable-next-line:max-line-length
var SEARCHBOX_UA_REGEX = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/;
var SEARCHBOT_OS_REGEX = /(nuhk|curl|Googlebot|Yammybot|Openbot|Slurp|MSNBot|Ask\ Jeeves\/Teoma|ia_archiver)/;
var REQUIRED_VERSION_PARTS = 3;
var userAgentRules = [
    ['aol', /AOLShield\/([0-9\._]+)/],
    ['edge', /Edge\/([0-9\._]+)/],
    ['edge-ios', /EdgiOS\/([0-9\._]+)/],
    ['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
    ['kakaotalk', /KAKAOTALK\s([0-9\.]+)/],
    ['samsung', /SamsungBrowser\/([0-9\.]+)/],
    ['silk', /\bSilk\/([0-9._-]+)\b/],
    ['miui', /MiuiBrowser\/([0-9\.]+)$/],
    ['beaker', /BeakerBrowser\/([0-9\.]+)/],
    ['edge-chromium', /EdgA?\/([0-9\.]+)/],
    [
        'chromium-webview',
        /(?!Chrom.*OPR)wv\).*Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/,
    ],
    ['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
    ['phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/],
    ['crios', /CriOS\/([0-9\.]+)(:?\s|$)/],
    ['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
    ['fxios', /FxiOS\/([0-9\.]+)/],
    ['opera-mini', /Opera Mini.*Version\/([0-9\.]+)/],
    ['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
    ['opera', /OPR\/([0-9\.]+)(:?\s|$)/],
    ['ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
    ['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
    ['ie', /MSIE\s(7\.0)/],
    ['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
    ['android', /Android\s([0-9\.]+)/],
    ['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
    ['safari', /Version\/([0-9\._]+).*Safari/],
    ['facebook', /FB[AS]V\/([0-9\.]+)/],
    ['instagram', /Instagram\s([0-9\.]+)/],
    ['ios-webview', /AppleWebKit\/([0-9\.]+).*Mobile/],
    ['ios-webview', /AppleWebKit\/([0-9\.]+).*Gecko\)$/],
    ['curl', /^curl\/([0-9\.]+)$/],
    ['searchbot', SEARCHBOX_UA_REGEX],
];
var operatingSystemRules = [
    ['iOS', /iP(hone|od|ad)/],
    ['Android OS', /Android/],
    ['BlackBerry OS', /BlackBerry|BB10/],
    ['Windows Mobile', /IEMobile/],
    ['Amazon OS', /Kindle/],
    ['Windows 3.11', /Win16/],
    ['Windows 95', /(Windows 95)|(Win95)|(Windows_95)/],
    ['Windows 98', /(Windows 98)|(Win98)/],
    ['Windows 2000', /(Windows NT 5.0)|(Windows 2000)/],
    ['Windows XP', /(Windows NT 5.1)|(Windows XP)/],
    ['Windows Server 2003', /(Windows NT 5.2)/],
    ['Windows Vista', /(Windows NT 6.0)/],
    ['Windows 7', /(Windows NT 6.1)/],
    ['Windows 8', /(Windows NT 6.2)/],
    ['Windows 8.1', /(Windows NT 6.3)/],
    ['Windows 10', /(Windows NT 10.0)/],
    ['Windows ME', /Windows ME/],
    ['Open BSD', /OpenBSD/],
    ['Sun OS', /SunOS/],
    ['Chrome OS', /CrOS/],
    ['Linux', /(Linux)|(X11)/],
    ['Mac OS', /(Mac_PowerPC)|(Macintosh)/],
    ['QNX', /QNX/],
    ['BeOS', /BeOS/],
    ['OS/2', /OS\/2/],
];
function detect(userAgent) {
    if (!!userAgent) {
        return parseUserAgent(userAgent);
    }
    if (typeof document === 'undefined' &&
        typeof navigator !== 'undefined' &&
        navigator.product === 'ReactNative') {
        return new ReactNativeInfo();
    }
    if (typeof navigator !== 'undefined') {
        return parseUserAgent(navigator.userAgent);
    }
    return getNodeVersion();
}
function matchUserAgent(ua) {
    // opted for using reduce here rather than Array#first with a regex.test call
    // this is primarily because using the reduce we only perform the regex
    // execution once rather than once for the test and for the exec again below
    // probably something that needs to be benchmarked though
    return (ua !== '' &&
        userAgentRules.reduce(function (matched, _a) {
            var browser = _a[0], regex = _a[1];
            if (matched) {
                return matched;
            }
            var uaMatch = regex.exec(ua);
            return !!uaMatch && [browser, uaMatch];
        }, false));
}
function browserName(ua) {
    var data = matchUserAgent(ua);
    return data ? data[0] : null;
}
function parseUserAgent(ua) {
    var matchedRule = matchUserAgent(ua);
    if (!matchedRule) {
        return null;
    }
    var name = matchedRule[0], match = matchedRule[1];
    if (name === 'searchbot') {
        return new BotInfo();
    }
    // Do not use RegExp for split operation as some browser do not support it (See: http://blog.stevenlevithan.com/archives/cross-browser-split)
    var versionParts = match[1] && match[1].split('.').join('_').split('_').slice(0, 3);
    if (versionParts) {
        if (versionParts.length < REQUIRED_VERSION_PARTS) {
            versionParts = __spreadArray(__spreadArray([], versionParts, true), createVersionParts(REQUIRED_VERSION_PARTS - versionParts.length), true);
        }
    }
    else {
        versionParts = [];
    }
    var version = versionParts.join('.');
    var os = detectOS(ua);
    var searchBotMatch = SEARCHBOT_OS_REGEX.exec(ua);
    if (searchBotMatch && searchBotMatch[1]) {
        return new SearchBotDeviceInfo(name, version, os, searchBotMatch[1]);
    }
    return new BrowserInfo(name, version, os);
}
function detectOS(ua) {
    for (var ii = 0, count = operatingSystemRules.length; ii < count; ii++) {
        var _a = operatingSystemRules[ii], os = _a[0], regex = _a[1];
        var match = regex.exec(ua);
        if (match) {
            return os;
        }
    }
    return null;
}
function getNodeVersion() {
    var isNode = typeof process !== 'undefined' && process.version;
    return isNode ? new NodeInfo(process.version.slice(1)) : null;
}
function createVersionParts(count) {
    var output = [];
    for (var ii = 0; ii < count; ii++) {
        output.push('0');
    }
    return output;
}


/***/ }),

/***/ "./node_modules/react-is-mounted-hook/lib/index.js":
/*!*********************************************************!*\
  !*** ./node_modules/react-is-mounted-hook/lib/index.js ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var use_is_mounted_1 = __importDefault(__webpack_require__(/*! ./use-is-mounted */ "./node_modules/react-is-mounted-hook/lib/use-is-mounted.js"));
exports["default"] = use_is_mounted_1.default;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/react-is-mounted-hook/lib/use-is-mounted.js":
/*!******************************************************************!*\
  !*** ./node_modules/react-is-mounted-hook/lib/use-is-mounted.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var react_1 = __webpack_require__(/*! react */ "react");
function useIsMounted() {
    var ref = react_1.useRef(false);
    react_1.useEffect(function () {
        ref.current = true;
        return function () {
            ref.current = false;
        };
    }, []);
    return react_1.useCallback(function () { return ref.current; }, [ref]);
}
exports["default"] = useIsMounted;
//# sourceMappingURL=use-is-mounted.js.map

/***/ }),

/***/ "./node_modules/react-reverse-portal/dist/web/index.js":
/*!*************************************************************!*\
  !*** ./node_modules/react-reverse-portal/dist/web/index.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createHtmlPortalNode": () => (/* binding */ createHtmlPortalNode),
/* harmony export */   "createSvgPortalNode": () => (/* binding */ createSvgPortalNode),
/* harmony export */   "InPortal": () => (/* binding */ InPortal),
/* harmony export */   "OutPortal": () => (/* binding */ OutPortal)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ "react-dom");
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
var __extends = (undefined && undefined.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();


// Internally, the portalNode must be for either HTML or SVG elements
var ELEMENT_TYPE_HTML = 'html';
var ELEMENT_TYPE_SVG = 'svg';
// ReactDOM can handle several different namespaces, but they're not exported publicly
// https://github.com/facebook/react/blob/b87aabdfe1b7461e7331abb3601d9e6bb27544bc/packages/react-dom/src/shared/DOMNamespaces.js#L8-L10
var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
var validateElementType = function (domElement, elementType) {
    if (elementType === ELEMENT_TYPE_HTML) {
        return domElement instanceof HTMLElement;
    }
    if (elementType === ELEMENT_TYPE_SVG) {
        return domElement instanceof SVGElement;
    }
    throw new Error("Unrecognized element type \"" + elementType + "\" for validateElementType.");
};
// This is the internal implementation: the public entry points set elementType to an appropriate value
var createPortalNode = function (elementType, options) {
    var initialProps = {};
    var parent;
    var lastPlaceholder;
    var element;
    if (elementType === ELEMENT_TYPE_HTML) {
        element = document.createElement('div');
    }
    else if (elementType === ELEMENT_TYPE_SVG) {
        element = document.createElementNS(SVG_NAMESPACE, 'g');
    }
    else {
        throw new Error("Invalid element type \"" + elementType + "\" for createPortalNode: must be \"html\" or \"svg\".");
    }
    if (options && typeof options === "object") {
        for (var _i = 0, _a = Object.entries(options.attributes); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            element.setAttribute(key, value);
        }
    }
    var portalNode = {
        element: element,
        elementType: elementType,
        setPortalProps: function (props) {
            initialProps = props;
        },
        getInitialPortalProps: function () {
            return initialProps;
        },
        mount: function (newParent, newPlaceholder) {
            if (newPlaceholder === lastPlaceholder) {
                // Already mounted - noop.
                return;
            }
            portalNode.unmount();
            // To support SVG and other non-html elements, the portalNode's elementType needs to match
            // the elementType it's being rendered into
            if (newParent !== parent) {
                if (!validateElementType(newParent, elementType)) {
                    throw new Error("Invalid element type for portal: \"" + elementType + "\" portalNodes must be used with " + elementType + " elements, but OutPortal is within <" + newParent.tagName + ">.");
                }
            }
            newParent.replaceChild(portalNode.element, newPlaceholder);
            parent = newParent;
            lastPlaceholder = newPlaceholder;
        },
        unmount: function (expectedPlaceholder) {
            if (expectedPlaceholder && expectedPlaceholder !== lastPlaceholder) {
                // Skip unmounts for placeholders that aren't currently mounted
                // They will have been automatically unmounted already by a subsequent mount()
                return;
            }
            if (parent && lastPlaceholder) {
                parent.replaceChild(lastPlaceholder, portalNode.element);
                parent = undefined;
                lastPlaceholder = undefined;
            }
        }
    };
    return portalNode;
};
var InPortal = /** @class */ (function (_super) {
    __extends(InPortal, _super);
    function InPortal(props) {
        var _this = _super.call(this, props) || this;
        _this.addPropsChannel = function () {
            Object.assign(_this.props.node, {
                setPortalProps: function (props) {
                    // Rerender the child node here if/when the out portal props change
                    _this.setState({ nodeProps: props });
                }
            });
        };
        _this.state = {
            nodeProps: _this.props.node.getInitialPortalProps(),
        };
        return _this;
    }
    InPortal.prototype.componentDidMount = function () {
        this.addPropsChannel();
    };
    InPortal.prototype.componentDidUpdate = function () {
        this.addPropsChannel();
    };
    InPortal.prototype.render = function () {
        var _this = this;
        var _a = this.props, children = _a.children, node = _a.node;
        return react_dom__WEBPACK_IMPORTED_MODULE_1__.createPortal(react__WEBPACK_IMPORTED_MODULE_0__.Children.map(children, function (child) {
            if (!react__WEBPACK_IMPORTED_MODULE_0__.isValidElement(child))
                return child;
            return react__WEBPACK_IMPORTED_MODULE_0__.cloneElement(child, _this.state.nodeProps);
        }), node.element);
    };
    return InPortal;
}(react__WEBPACK_IMPORTED_MODULE_0__.PureComponent));
var OutPortal = /** @class */ (function (_super) {
    __extends(OutPortal, _super);
    function OutPortal(props) {
        var _this = _super.call(this, props) || this;
        _this.placeholderNode = react__WEBPACK_IMPORTED_MODULE_0__.createRef();
        _this.passPropsThroughPortal();
        return _this;
    }
    OutPortal.prototype.passPropsThroughPortal = function () {
        var propsForTarget = Object.assign({}, this.props, { node: undefined });
        this.props.node.setPortalProps(propsForTarget);
    };
    OutPortal.prototype.componentDidMount = function () {
        var node = this.props.node;
        this.currentPortalNode = node;
        var placeholder = this.placeholderNode.current;
        var parent = placeholder.parentNode;
        node.mount(parent, placeholder);
        this.passPropsThroughPortal();
    };
    OutPortal.prototype.componentDidUpdate = function () {
        // We re-mount on update, just in case we were unmounted (e.g. by
        // a second OutPortal, which has now been removed)
        var node = this.props.node;
        // If we're switching portal nodes, we need to clean up the current one first.
        if (this.currentPortalNode && node !== this.currentPortalNode) {
            this.currentPortalNode.unmount(this.placeholderNode.current);
            this.currentPortalNode = node;
        }
        var placeholder = this.placeholderNode.current;
        var parent = placeholder.parentNode;
        node.mount(parent, placeholder);
        this.passPropsThroughPortal();
    };
    OutPortal.prototype.componentWillUnmount = function () {
        var node = this.props.node;
        node.unmount(this.placeholderNode.current);
    };
    OutPortal.prototype.render = function () {
        // Render a placeholder to the DOM, so we can get a reference into
        // our location in the DOM, and swap it out for the portaled node.
        // A <div> placeholder works fine even for SVG.
        return react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { ref: this.placeholderNode });
    };
    return OutPortal;
}(react__WEBPACK_IMPORTED_MODULE_0__.PureComponent));
var createHtmlPortalNode = createPortalNode.bind(null, ELEMENT_TYPE_HTML);
var createSvgPortalNode = createPortalNode.bind(null, ELEMENT_TYPE_SVG);

//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/requestidlecallback/index.js":
/*!***************************************************!*\
  !*** ./node_modules/requestidlecallback/index.js ***!
  \***************************************************/
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (factory) {
	if (true) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}
}(function(){
	'use strict';
	var scheduleStart, throttleDelay, lazytimer, lazyraf;
	var root = typeof window != 'undefined' ?
		window :
		typeof __webpack_require__.g != undefined ?
			__webpack_require__.g :
			this || {};
	var requestAnimationFrame = root.cancelRequestAnimationFrame && root.requestAnimationFrame || setTimeout;
	var cancelRequestAnimationFrame = root.cancelRequestAnimationFrame || clearTimeout;
	var tasks = [];
	var runAttempts = 0;
	var isRunning = false;
	var remainingTime = 7;
	var minThrottle = 35;
	var throttle = 125;
	var index = 0;
	var taskStart = 0;
	var tasklength = 0;
	var IdleDeadline = {
		get didTimeout(){
			return false;
		},
		timeRemaining: function(){
			var timeRemaining = remainingTime - (Date.now() - taskStart);
			return timeRemaining < 0 ? 0 : timeRemaining;
		},
	};
	var setInactive = debounce(function(){
		remainingTime = 22;
		throttle = 66;
		minThrottle = 0;
	});

	function debounce(fn){
		var id, timestamp;
		var wait = 99;
		var check = function(){
			var last = (Date.now()) - timestamp;

			if (last < wait) {
				id = setTimeout(check, wait - last);
			} else {
				id = null;
				fn();
			}
		};
		return function(){
			timestamp = Date.now();
			if(!id){
				id = setTimeout(check, wait);
			}
		};
	}

	function abortRunning(){
		if(isRunning){
			if(lazyraf){
				cancelRequestAnimationFrame(lazyraf);
			}
			if(lazytimer){
				clearTimeout(lazytimer);
			}
			isRunning = false;
		}
	}

	function onInputorMutation(){
		if(throttle != 125){
			remainingTime = 7;
			throttle = 125;
			minThrottle = 35;

			if(isRunning) {
				abortRunning();
				scheduleLazy();
			}
		}
		setInactive();
	}

	function scheduleAfterRaf() {
		lazyraf = null;
		lazytimer = setTimeout(runTasks, 0);
	}

	function scheduleRaf(){
		lazytimer = null;
		requestAnimationFrame(scheduleAfterRaf);
	}

	function scheduleLazy(){

		if(isRunning){return;}
		throttleDelay = throttle - (Date.now() - taskStart);

		scheduleStart = Date.now();

		isRunning = true;

		if(minThrottle && throttleDelay < minThrottle){
			throttleDelay = minThrottle;
		}

		if(throttleDelay > 9){
			lazytimer = setTimeout(scheduleRaf, throttleDelay);
		} else {
			throttleDelay = 0;
			scheduleRaf();
		}
	}

	function runTasks(){
		var task, i, len;
		var timeThreshold = remainingTime > 9 ?
			9 :
			1
		;

		taskStart = Date.now();
		isRunning = false;

		lazytimer = null;

		if(runAttempts > 2 || taskStart - throttleDelay - 50 < scheduleStart){
			for(i = 0, len = tasks.length; i < len && IdleDeadline.timeRemaining() > timeThreshold; i++){
				task = tasks.shift();
				tasklength++;
				if(task){
					task(IdleDeadline);
				}
			}
		}

		if(tasks.length){
			scheduleLazy();
		} else {
			runAttempts = 0;
		}
	}

	function requestIdleCallbackShim(task){
		index++;
		tasks.push(task);
		scheduleLazy();
		return index;
	}

	function cancelIdleCallbackShim(id){
		var index = id - 1 - tasklength;
		if(tasks[index]){
			tasks[index] = null;
		}
	}

	if(!root.requestIdleCallback || !root.cancelIdleCallback){
		root.requestIdleCallback = requestIdleCallbackShim;
		root.cancelIdleCallback = cancelIdleCallbackShim;

		if(root.document && document.addEventListener){
			root.addEventListener('scroll', onInputorMutation, true);
			root.addEventListener('resize', onInputorMutation);

			document.addEventListener('focus', onInputorMutation, true);
			document.addEventListener('mouseover', onInputorMutation, true);
			['click', 'keypress', 'touchstart', 'mousedown'].forEach(function(name){
				document.addEventListener(name, onInputorMutation, {capture: true, passive: true});
			});

			if(root.MutationObserver){
				new MutationObserver( onInputorMutation ).observe( document.documentElement, {childList: true, subtree: true, attributes: true} );
			}
		}
	} else {
		try{
			root.requestIdleCallback(function(){}, {timeout: 0});
		} catch(e){
			(function(rIC){
				var timeRemainingProto, timeRemaining;
				root.requestIdleCallback = function(fn, timeout){
					if(timeout && typeof timeout.timeout == 'number'){
						return rIC(fn, timeout.timeout);
					}
					return rIC(fn);
				};
				if(root.IdleCallbackDeadline && (timeRemainingProto = IdleCallbackDeadline.prototype)){
					timeRemaining = Object.getOwnPropertyDescriptor(timeRemainingProto, 'timeRemaining');
					if(!timeRemaining || !timeRemaining.configurable || !timeRemaining.get){return;}
					Object.defineProperty(timeRemainingProto, 'timeRemaining', {
						value:  function(){
							return timeRemaining.get.call(this);
						},
						enumerable: true,
						configurable: true,
					});
				}
			})(root.requestIdleCallback)
		}
	}

	return {
		request: requestIdleCallbackShim,
		cancel: cancelIdleCallbackShim,
	};
}));


/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_react__;

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_react_dom__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/infinitegridscroller.tsx");
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=build.js.map