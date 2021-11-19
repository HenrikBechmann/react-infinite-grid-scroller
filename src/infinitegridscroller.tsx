// infinitegridscroller.tsx
// copyright (c) 2019 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:
    - nested list overflows port boundaries on android FF
    
    - promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE

    - break up cradle

    - change portalmanager to simple object (singleton)

    - calc minwidth by form factor
    - use state machine logic throughout
    */

import React, {useRef, useEffect, useMemo, useContext} from 'react'
// import ReactDOM from 'react-dom'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'
import {portalManager as portalAgentInstance, PortalList} from './portalmanager'

let globalScrollerID = 0
const getScrollerSessionID = () => {
    return globalScrollerID++
}

const portalrootstyle = {display:'none'} // static
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
const InfiniteGridScroller = (props) => {
    let { 
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        runwaysize, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listsize, // the exact number of the size of the virtual list
        indexOffset:defaultVisibleIndex, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties with direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default
        styles, // passive style over-rides (eg. color, opacity) for viewport, scrollblock, cradle, or scrolltracker
        // to come...
        // cache = "preload", "keepload", "none"
        // dense, // boolean (only with preload)
        // advanced, technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
        layout, // uniform, variable
        scrollerName, // for debugging
    } = props

    const portalManager = portalAgentInstance // useContext(PortalAgent)
    const scrollerSessionID = useMemo(()=>{
        return getScrollerSessionID()
    },[])
    const scrollerSessionIDRef = useRef(scrollerSessionID)

    // console.log('RUNNING infinitegridscroller scrollerSessionID',scrollerSessionIDRef.current)//, scrollerState)

    // defaults
    functions !?? (functions = {})
    gap !?? (gap = 0)
    padding !?? (padding = 0)
    runwaysize !?? (runwaysize = 3)
    defaultVisibleIndex !?? (defaultVisibleIndex = 0)
    listsize !?? (listsize = 0)
    layout !?? (layout = 'uniform')
    // constraints
    defaultVisibleIndex = Math.max(0,defaultVisibleIndex) // non-negative
    defaultVisibleIndex = Math.min(listsize, defaultVisibleIndex) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'vertical'
    }

    useEffect(()=>{

        // initialize
        portalManager.createScrollerPortalRepository(scrollerSessionIDRef.current)

        // cleanup
        return () => {portalManager.deleteScrollerPortalRepository(scrollerSessionIDRef.current)}

    },[])

    return <div data-type = 'scroller' data-scrollerid = { scrollerSessionID }>
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

                listsize = { listsize }
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
                    listsize = { listsize }
                    defaultVisibleIndex = { defaultVisibleIndex }
                    orientation = { orientation }
                    getItem = { getItem }
                    functions = { functions }
                    placeholder = { placeholder }
                    styles = { styles }
                    runwaycount = { runwaysize }
                    scrollerName = { scrollerName }
                    scrollerID = { scrollerSessionID }

                />
            </Scrollblock>
        </Viewport>
    </div>
}

export default InfiniteGridScroller
