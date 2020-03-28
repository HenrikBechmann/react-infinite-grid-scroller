// iscrollbygrid                                                                                                      .tsx
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
    The job of InfiniteScrollByGrid is to pass paramters to dependents
    Viewport contains the scrollblock (scrolling block)
    Scrollblock virtually represents the entirety of the list, and scrolls
    Cradle contains the list items, and is 'virtualiized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by ItemShell, managed by Cradle
*/
const InfiniteScrollByGrid = (props) => {
    let { 
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth, 
        runway, 
        listsize, 
        offset,
        getItem,
        component,
        placeholder,
        styles,
        // cache = "preload", "keepload", "none"
        // dense, // boolean
    } = props

    if (!['horizontal','vertical'].includes(orientation)) {
        console.warn('invalid value for scroller orientation; resetting to default',orientation)
        orientation = 'horizontal'
    }
    component !?? (component = {})
    gap !?? (gap = 0)
    padding !?? (padding = 0)
    runway !?? (runway = 3)
    offset !?? (offset = 0)
    listsize !?? (listsize = 0)
    let runwaylength = (orientation == 'vertical')?(runway * (cellHeight + gap)):(runway * (cellWidth + gap))

    return <Viewport 

        orientation = { orientation } 
        cellWidth = { cellHeight }
        cellHeight = { cellHeight }
        gap = { gap }
        padding = { padding }
        component = { component }
        styles = { styles }
    >
    
        <Scrollblock

            listsize = { listsize }
            cellWidth = { cellWidth }
            cellHeight = { cellHeight }
            gap = { gap}
            padding = { padding }
            orientation = { orientation }
            component = { component }
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
                component = { component }
                placeholder = { placeholder }
                styles = { styles }

            />

        </Scrollblock>
    </Viewport>

}

export default InfiniteScrollByGrid
