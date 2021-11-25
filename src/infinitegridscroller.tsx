// infinitegridscroller.tsx
// copyright (c) 2019-2021 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:
    - make sure outportal locations are unmounted before outportal is moved
    - check use of useCallback
    - resize triggered by root only, unless variable
    - intersection applied to cradle only
    - test for two root portals
    - nested list overflows port boundaries on android FF
    - promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
    - break up cradle
    - change portalmanager to simple object (singleton)
    - calc minwidth by form factor
    - use state machine logic throughout
    - consider rendering client content offscreen instead of display none
    - review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
*/

import React, {useEffect, useRef, useState} from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'
import {portalManager, PortalList} from './portalmanager'

let globalScrollerID = 0
const getNextScrollerSessionID = () => {
    // console.log('getting globalScrollerID',globalScrollerID)
    return globalScrollerID++
}

const portalrootstyle = {display:'none'} // static parm

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
    let { 
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
    // TODO: this is an anti pattern because useMemo is not guaranteed to run only once
    const scrollerSessionID = useRef(null) //useMemo(()=>{ // get once only per instance

    const [scrollerstate,setScollerState] = useState('setup')

    useEffect(()=>{

        let sessionID = getNextScrollerSessionID()
        scrollerSessionID.current = sessionID
        // side effect: immediate initialization of session portal repository
        portalManager.createScrollerPortalRepository(sessionID)

        setScollerState('render')

        // cleanup portal repository
        return () => portalManager.deleteScrollerPortalRepository(scrollerSessionID.current)

    },[])

    // console.log('RUNNING infinitegridscroller scrollerSessionID',scrollerSessionID.current)

    // set defaults
    functions ?? (functions = {})
    gap ?? (gap = 0)
    padding ?? (padding = 0)
    runwaySize ?? (runwaySize = 3)
    defaultVisibleIndex ?? (defaultVisibleIndex = 0)
    listSize ?? (listSize = 0)
    layout ?? (layout = 'uniform')
    // constraints
    defaultVisibleIndex = Math.max(0,defaultVisibleIndex) // non-negative
    defaultVisibleIndex = Math.min(listSize, defaultVisibleIndex) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'vertical'
    }

    return ((scrollerstate == 'render') && <div data-type = 'scroller-frame' data-scrollerid = { scrollerSessionID.current }>
        <div data-type = 'portalroot' style = { portalrootstyle }>
            <PortalList scrollerID = { scrollerSessionID }/>
        </div>
        <Viewport

            orientation = { orientation } 
            cellWidth = { cellWidth }
            cellHeight = { cellHeight }
            gap = { gap }
            padding = { padding }
            functions = { functions }
            styles = { styles }
            scrollerID = { scrollerSessionID }
        >
        
            <Scrollblock

                listsize = { listSize }
                cellWidth = { cellWidth }
                cellHeight = { cellHeight }
                gap = { gap}
                padding = { padding }
                orientation = { orientation }
                functions = { functions }
                styles = { styles }
                scrollerID = { scrollerSessionID }

            >
                <Cradle 

                    gap = { gap }
                    padding = { padding }
                    cellWidth = { cellWidth }
                    cellHeight = { cellHeight }
                    listsize = { listSize }
                    defaultVisibleIndex = { defaultVisibleIndex }
                    orientation = { orientation }
                    getItem = { getItem }
                    functions = { functions }
                    placeholder = { placeholder }
                    styles = { styles }
                    runwaycount = { runwaySize }
                    scrollerName = { scrollerName }
                    scrollerID = { scrollerSessionID }

                />
            </Scrollblock>
        </Viewport>
    </div>)
}

export default InfiniteGridScroller
