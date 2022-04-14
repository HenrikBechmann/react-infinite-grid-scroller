// infinitegridscroller.tsx
// copyright (c) 2019-2021 Henrik Bechmann, Toronto, Licence: MIT

/*
    BUG: reposition chip appears outside viewport when list partly hidden
    BUG: repositioningA is broken.
    TODO:
    - reload from/to for insertions and substitutions
    - provide user with isReparenting flag to be able to reset scroll
    - check use of useCallback
    - resize triggered by root only, unless variable
    - intersection applied to cradle only
    - test for two root portals
    - nested list overflows port boundaries on android FF
    - promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
    - calc minwidth by form factor
    - review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
    - add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
*/

import React, {useEffect, useRef} from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'

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
function freeze(...args) {
    let [arg, ...rest] = Array.from(arguments)
    Object.freeze(arg)
    if (rest.length == 0) {
        return
    }
    freeze(...rest)
}

const InfiniteGridScroller = (inheritedprops) => {
    // empty parameters use defaults
    let props = Object.assign({},inheritedprops)

    // set defaults
    props.functions ?? (props.functions = {})
    props.styles ?? (props.styles = {})
    props.gap ?? (props.gap = 0)
    props.padding ?? (props.padding = 0)
    props.runwaySize ?? (props.runwaySize = 3)
    props.defaultVisibleIndex ?? (props.defaultVisibleIndex = 0)
    props.listSize ?? (props.listSize = 0)
    props.layout ?? (props.layout = 'uniform')
    // constraints
    props.defaultVisibleIndex = Math.max(0,props.defaultVisibleIndex) // non-negative
    props.defaultVisibleIndex = Math.min(props.listSize, props.defaultVisibleIndex) // not larger than list
    if (!['horizontal','vertical'].includes(props.orientation)) {
        props.orientation = 'vertical'
    }
    freeze(
        props.functions,
        props.styles,
    )

    const { 
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        runwaySize, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listSize, // the exact number of the size of the virtual list; will eventually be changable.
        indexOffset:defaultVisibleIndex, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties with direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles, // passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // to come...
        // cache = "preload" or "keepload" or "none"
        // dense, // boolean (only with preload)
        // advanced, technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
        layout, // uniform, variable
        scrollerName, // for debugging
    } = props

    // for mount
    const scrollerSessionIDRef = useRef(null);

    if (scrollerSessionIDRef.current === null) {
        scrollerSessionIDRef.current = getSessionID()
    }

    return <Viewport

            cellWidth = { cellWidth }
            cellHeight = { cellHeight }
            gap = { gap }
            padding = { padding }
            orientation = { orientation } 
            styles = { styles }
            scrollerID = { scrollerSessionIDRef.current }
        >
        
            <Scrollblock

                listsize = { listSize }
                
                cellWidth = { cellWidth }
                cellHeight = { cellHeight }
                gap = { gap}
                padding = { padding }
                orientation = { orientation }
                styles = { styles }
                scrollerID = { scrollerSessionIDRef.current }

            >
                <Cradle 

                    listsize = { listSize }

                    cellWidth = { cellWidth }
                    cellHeight = { cellHeight }
                    gap = { gap }
                    padding = { padding }
                    orientation = { orientation }
                    styles = { styles }
                    scrollerID = { scrollerSessionIDRef.current }

                    functions = { functions }
                    scrollerName = { scrollerName }
                    defaultVisibleIndex = { defaultVisibleIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwaycount = { runwaySize }

                />
            </Scrollblock>
        </Viewport>
}

export default InfiniteGridScroller
