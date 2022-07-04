// infinitegridscroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    ROADMAP:
        // cache management
            // cacheMax; cacheMax over-run
            // preload
            // keepload
            // cradle

        surface cache, cacheMax & runway etc to test options
        also surface external callbacks for testing
        review all code

        layout: uniform, variable, dynamic, dense
        insert, remove, swap functions (create sessionID reference system)

        test changing all gridscroller parameters
        test config size edge cases - over and under sized cells

        create demo site - github pages, and sandbox
        release to npm

    BUGS: 
        //- rapid scrolling up with full cache can lead to overshoot just shy of reposition,
        //    with trigger lines out of view
        // - time lag before repositioning the trigger lines - promises?
        // - when sublist is in scroll motion when being reparented, block scrollpos is not properly recovered
        // - item 400 in 400 item nested list of scrollers crosscount = 3 takes up entire width of viewport

    TODO:
        - test and review sessionItemID
        - implement changeOrder callback for user - cellFrame index prop must be updated
        - use sessionID for referencing; index for order
        - review state change chains in cradle
        - check preload intent against state machine handling
        - rationalize await handling everywhere to behave like promises
        // - rationalize external callbacks routing
        // callback for user re preload
        error handling for preload items -- allow recovery
        test for memory leaks with Chrome's window.performance.memory property
        try to reduce need to run renderportallist - try some kind of pagination/grouping
        replace top/left with transformx/y
        prioritize fetch cells for visible cells
        customizable scrolltracker, or provide callback feature for scroll tracking
        reload from/to for insertions and substitutions
        check use of useCallback
        test for two root portals
        promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
        calc minwidth by form factor
        review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
        cross-browser testing
*/

import React, {useEffect, useState, useRef} from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'

import { CacheHandler, PortalList } from './cradle/cachehandler'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

// ===================================[ INITIALIZE ]===========================

/*
    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, fullsize for adjusted cell height/width, which in turn contains the cradle 
        - a component that contains CellFrames (which contain displayed items or transitional placeholders). 
    The CellFrames are skeletons which contain the host content components.

    Host content is created in a portal cache (via PortalAgent) and then portal'd to its host CellFrame

    Scrollblock virtually represents the entirety of the list, and is the scroller

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by CellFrame, managed by Cradle

    Overall the infinitegridscroller manages the (often asynchronous) interactions of the 
    components of the mechanism
*/

const InfiniteGridScroller = (props) => {

    // ------------------[ normalize properties ]--------------------

    // const props = Object.assign({},args) // args should be immutable

    let { 
        // grid specs
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        layout, // uniform, variable (doesn't use axis), dynamic (uses axis), dense
        // scroller specs
        runwaySize, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listSize, // the exact number of the size of the virtual list; will eventually be changable.
        indexOffset, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties to get direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles, // passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // system specs
        cache, //  = "preload", "keepload" or "cradle"
        cacheMax, // (always minimum cradle)
        advanced, // technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
        triggerlineOffset,
        scrollerData
    } = props

    const gridSpecs = { // package
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
    }

    // allow scrollerID to be set by useEffect. Inline setting causes double processing
    const [scrollerState, setScrollerState] = useState('setup')

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
    cache ?? (cache = 'preload')
    cacheMax ?? (cacheMax = 100)
    // constraints
    indexOffset = Math.max(0,indexOffset) // non-negative
    indexOffset = Math.min((listSize -1), indexOffset) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'vertical'
    }
    if (!['preload','keepload','cradle'].includes(cache)) {
        cache = 'cradle'
    }
    // TODO: rationalize with cellHeight & cellWidth; must be less than half
    triggerlineOffset ?? (triggerlineOffset = 10) 

    const gridSpecsRef = useRef(gridSpecs)
    const stylesRef = useRef(styles)
    const functionsRef = useRef(functions)
    const defaultVisibleIndex = indexOffset

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

    // for mount
    const scrollerSessionIDRef = useRef(null);

    const cacheHandlerRef = useRef(null)

    useEffect (() => {
        scrollerSessionIDRef.current = globalScrollerID++
        cacheHandlerRef.current = new CacheHandler(scrollerSessionIDRef.current)
    },[])

    const scrollerID = scrollerSessionIDRef.current

    // console.log('infinite scroller scrollerID, scrollerState, cache, cacheMax', 
    //     '-'+scrollerID+'-',scrollerState, cache, cacheMax)

    // --------------------[ render ]---------------------

    useEffect(() => {

        switch (scrollerState) {
            case 'setup':
                setScrollerState('ready')
        }

    },[scrollerState])

    return (<>
        {(scrollerState != 'setup') && <Viewport

            gridSpecs = { gridSpecsRef.current }
            styles = { stylesRef.current }
            scrollerData = {scrollerData}
            scrollerID = { scrollerID }

        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }
                styles = { stylesRef.current }
                listsize = { listSize }
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    styles = { stylesRef.current }
                    listsize = { listSize }
                    cache = { cache }
                    cacheMax = { cacheMax }
                    functions = { functionsRef.current }
                    defaultVisibleIndex = { defaultVisibleIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }

                    cacheHandler = {cacheHandlerRef.current}
                    scrollerID = { scrollerID }

                />
            </Scrollblock>
        </Viewport>}
        {(scrollerState != 'setup') && <div data-type = 'cacheroot' style = { cacherootstyle }>
            <PortalList scrollerProps = {cacheHandlerRef.current.scrollerProps}/>
        </div>}
        </>)
}

const cacherootstyle = {display:'none'} as React.CSSProperties // static, out of view 

export default InfiniteGridScroller

// utilities
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
