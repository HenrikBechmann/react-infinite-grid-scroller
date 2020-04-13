// infinitegridscroller.tsx
// copyright (c) 2019 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'

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
const InfiniteGridScroller = (props) => {
    let { 
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        runway, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listsize, // the exact number of the size of the virtual list
        offset, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties with direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default
        styles, // passive style over-rides (eg. color, opacity) for viewport, scrollblock, cradle, or scrolltracker
        // to come...
        // cache = "preload", "keepload", "none"
        // dense, // boolean (only with preload)
        layout, // uniform, variable
    } = props

    // defaults
    functions !?? (functions = {})
    gap !?? (gap = 0)
    padding !?? (padding = 0)
    runway !?? (runway = 3)
    offset !?? (offset = 0)
    listsize !?? (listsize = 0)
    layout !?? (layout = 'uniform')
    // constraints
    offset = Math.max(0,offset) // non-negative
    offset = Math.min(listsize, offset) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'horizontal'
    }
    // convert to pixels
    let runwaylength = (orientation == 'vertical')?(runway * (cellHeight + gap)):(runway * (cellWidth + gap))
    runwaylength && (runwaylength += (padding * 2))

    return <Viewport 

        orientation = { orientation } 
        cellWidth = { cellHeight }
        cellHeight = { cellHeight }
        gap = { gap }
        padding = { padding }
        functions = { functions }
        styles = { styles }
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

        >

            <Cradle 

                gap = { gap }
                padding = { padding }
                cellWidth = { cellWidth }
                cellHeight = { cellHeight }
                listsize = { listsize }
                offset = { offset }
                orientation = { orientation }
                runwaylength = { runwaylength } 
                getItem = { getItem }
                functions = { functions }
                placeholder = { placeholder }
                styles = { styles }
                runway = { runway }

            />

        </Scrollblock>
    </Viewport>

}

export default InfiniteGridScroller
