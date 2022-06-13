// infinitegridscroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    ROADMAP:
        Bugs
        review code to cradle level
        setCradleContent draws from cache
        suspense analog
        review all code
        modes: uniform, variable, dynamic
        insert, remove, swap functions
        test changing all scroller parameters

    BUGS: 
        axisOffset needs to be recalculated when switching from nested to generic (diff size cells)

    TODO:
        rationalize normalizesignals without timeout
        reload from/to for insertions and substitutions
        provide user with isReparenting flag to be able to reset scroll
        check use of useCallback
        resize triggered by root only, unless variable
        intersection applied to cradle only
        test for two root portals
        promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
        calc minwidth by form factor
        review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
*/

'use strict'

import React, {useEffect, useRef} from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

const getSessionID = () => {

    return globalScrollerID++

}

// ===================================[ INITIALIZE ]===========================

/*
    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, fullsize for adjusted cell height/width, which in turn contains the cradle 
        - a component that contains CellShells (which contain displayed items or transitional placeholders). 
    The CellShells are skeletons which contain the host content components.

    Host content is created in a portal cache (via PortalAgent) and then portal'd to its host CellShell

    Scrollblock virtually represents the entirety of the list, and is the scroller

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by CellShell, managed by Cradle

    Overall the infinitegridscroller manages the (often asynchronous) interactions of the 
    components of the mechanism
*/

const InfiniteGridScroller = (props) => {

    // ------------------[ normalize properties ]--------------------

    // const props = Object.assign({},args) // args should be immutable

    let { 
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        layout, // uniform, variable (doesn't use axis), dynamic (uses axis)
        dense, // boolean (only with preload)

        runwaySize, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listSize, // the exact number of the size of the virtual list; will eventually be changable.
        indexOffset:defaultVisibleIndex, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties to get direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles, // passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // to come...
        // cache = "preload" or "keepload" or "none"
        // advanced, technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
        scrollerName, // for debugging
        triggerlineOffset,
        indexOffset,
    } = props

    const gridSpecs = { // package
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
        dense,
    }

    // set defaults
    functions ?? (functions = {})
    styles ?? (styles = {})
    gap ?? (gap = 0)
    padding ?? (padding = 0)
    runwaySize ?? (runwaySize = 3)
    runwaySize = Math.max(0,runwaySize)
    indexOffset ?? (indexOffset = 0)
    listSize ?? (listSize = 0)
    listSize = Math.max(0,listSize)
    layout ?? (layout = 'uniform')
    // constraints
    indexOffset = Math.max(0,indexOffset) // non-negative
    indexOffset = Math.min((listSize -1), indexOffset) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'vertical'
    }
    // TODO: rationalize with cellHeight & cellWidth; must be less than half
    triggerlineOffset ?? (triggerlineOffset = 10) 

    const gridSpecsRef = useRef(gridSpecs)
    const stylesRef = useRef(styles)
    const functionsRef = useRef(functions)

    // satisfy React Object.is for attributes
    if (!compareProps(gridSpecs, gridSpecsRef.current)) {
        gridSpecsRef.current = gridSpecs
    }
    if (!compareProps(styles, stylesRef.current)) {
        stylesRef.current = styles
    }
    if (!compareProps(functions, functionsRef.current)) {
        functionsRef.current = functions
    }

    freeze(
        functionsRef.current,
        stylesRef.current,
        gridSpecsRef.current,
    )

    // for mount
    const scrollerSessionIDRef = useRef(null);

    if (scrollerSessionIDRef.current === null) {
        scrollerSessionIDRef.current = getSessionID()
    }

    const scrollerID = scrollerSessionIDRef.current

    // --------------------[ render ]---------------------

    return (
        <React.StrictMode>
        <Viewport

            gridSpecs = { gridSpecsRef.current }

            styles = { stylesRef.current }

            scrollerID = { scrollerID }
        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }

                styles = { stylesRef.current }

                scrollerID = { scrollerID }

                listsize = { listSize }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }

                    styles = { stylesRef.current }

                    scrollerID = { scrollerID }
                    scrollerName = { scrollerName }

                    listsize = { listSize }

                    functions = { functionsRef.current }
                    defaultVisibleIndex = { defaultVisibleIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwayRowcountSpec = { runwaySize }

                    triggerlineOffset = { triggerlineOffset }

                />
            </Scrollblock>
        </Viewport>
        </React.StrictMode>

    )
}

export default InfiniteGridScroller

// utilities
function freeze(...args) {
    let [arg, ...rest] = Array.from(arguments)
    Object.freeze(arg)
    if (rest.length == 0) {
        return
    }
    freeze(...rest)
}

function compareProps (obj1,obj2) {
    const keys = Object.keys(obj1)
    let same
    for (let key of keys) {
        if (!Object.is(obj1[key],obj2[key])) {
            return false
        }
    }
    return true
}
