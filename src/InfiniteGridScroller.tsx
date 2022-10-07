// InfiniteGridScroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the Scrollblock, which is full size for listsize of given cell height/width.
    Scrollblock in turn contains the Cradle - a component that contains CellFrames, which contain 
    displayed user content (items) or transitional placeholders. 

    Host content is instantiated in a cache of React portals (via cacheHandler). content is then 
    portal'd to host CellFrames. The cache can be configured to hold many more items
    than the Cradle (limited by device memory, and some eventual performance degradation), allowing 
    cached host content to maintain state.

    Scrollblock by size represents the entirety of the list, and is the object that is scrolled.

    Cradle contains the list items, and is 'virtualized' -- it appears as
    though it scrolls over a filled scrollblock, but in fact it is only slightly larger than
    the viewport. Content is rotated in and out of the cradle (through the cache)
    
    Individual host items are framed by CellFrame, managed by Cradle

    Overall the InfiniteGridScroller as a package manages the asynchronous interactions of the 
    components of the mechanism. Most of the work occurs in the Cradle component.

    The Rigs liner is set with 'display:absolute' and 'inset:0', so the user containing block should
    be styles accordingly.
*/

import React, { useEffect, useState, useCallback, useRef } from 'react'

// defensive
import { ErrorBoundary } from 'react-error-boundary' // www.npmjs.com/package/react-error-boundary

// based on module template
function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert">
      <p>Oops! Something went wrong inside react-infinite-grid-scroller.</p>
      <p>Click to cancel the error and continue.</p>
      <button onClick={ resetErrorBoundary }>Cancel error</button>
      <pre>{error}</pre>
    </div>
  )
}

// scroller components
import Viewport from './Viewport'
import Scrollblock from './Scrollblock'
import Cradle from './Cradle'

// loaded here to minimize redundant renders in Cradle
import { CacheHandler, PortalList } from './cradle/cachehandler'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

// ===================================[ INITIALIZE ]===========================

const InfiniteGridScroller = (props) => {

    // ------------------[ normalize properties ]--------------------

    let { 

        // required
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
            // base for variable layout
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
            // base for variable layout
        estimatedListSize = 0, // the estimated number of the items in the virtual list. can be modified
        getItem, // required. function provided by host - parameters are index number, set by system,
            // and session itemID for tracking and matching; 
            // return value is host-selected component or promise of a component, or null or undefined

        // ** grid specs:
        orientation = 'vertical', // vertical or horizontal
        gap = 0, // space between grid cells, not including the leading and trailing padding
        padding = 0, // the border space between the items and the viewport, applied to the cradle
        layout = 'uniform', // uniform, variable
        cellMinHeight = 0, // for layout == 'variable' && orientation == 'vertical'
        cellMinWidth = 0, // for layout == 'variable' && orientation == 'horizontal'

        // ** scroller specs:
        runwaySize = 3, // the number of rows outside the view of each side of the viewport 
            // -- gives time to assemble cellFrames before display
        startingIndex = 0, // the 0-based starting index of the list, when first loaded
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // replaces default placeholder if present
        styles = {}, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, scrolltracker, placeholderframe, or
            // placeholdercontent. Do not make structural changes!

        // ** system specs:
        useScrollTracker = true, // the internal component to give feedback for repositioning
        cache = 'cradle', // "preload", "keepload" or "cradle"
        cacheMax = null, // always minimum cradle; null means limited by listsize
        triggerlineOffset = 10, // distance from cell head or tail for content shifts above/below axis
        callbacks = {}, // optional. closures to get direct information streams of some component utilites
            // can contain getFunctions, which provides access to internal scroller functions (mostly cache management)
        advanced = {}, // optional. technical settings like VIEWPORT_RESIZE_TIMEOUT

        // ** information for host cell content
        scrollerProperties, // required for embedded scroller; shares scroller settings with content

    } = props

    if (!(cellWidth && cellHeight && estimatedListSize && getItem )) {
        console.log('RIGS: cellWidth, cellHeight, estimatedListSize and getItem are required')
        return null
    }

    // ---------------------[ Data setup ]----------------------

    // avoid null/undefined
    styles = styles ?? {}
    callbacks = callbacks ?? {}
    advanced = advanced ?? {}
    startingIndex = startingIndex ?? 0
    estimatedListSize = estimatedListSize ?? 0
    runwaySize = runwaySize ?? 3
    useScrollTracker = useScrollTracker ?? true
    cellMinHeight = cellMinHeight ?? 0
    cellMinWidth = cellMinWidth ?? 0

    cellMinHeight = Math.max(cellMinHeight, 25)
    cellMinWidth = Math.max(cellMinWidth, 25)
    cellMinHeight = Math.min(cellHeight, cellMinHeight)
    cellMinWidth = Math.min(cellWidth, cellMinWidth)

    // prop constraints - non-negative values
    runwaySize = Math.max(1,runwaySize) // runwaysize must be at least 1
    estimatedListSize = Math.max(0,estimatedListSize)
    startingIndex = Math.max(0,startingIndex)

    // enums
    if (!['horizontal','vertical'].includes(orientation)) { 
        orientation = 'vertical'
    }
    if (!['preload','keepload','cradle'].includes(cache)) {
        cache = 'cradle'
    }
    if (!['uniform', 'variable'].includes(layout)) {
        layout = 'uniform'
    }

    // package
    const gridSpecs = {
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        layout,
    }

    const gridSpecsRef = useRef(gridSpecs)

    // state
    const [scrollerState, setScrollerState] = useState('setup') // setup, setlistsize, ready

    // system
    const stylesRef = useRef(styles)
    const callbacksRef = useRef(callbacks)

    let {

        showAxis, // boolean; axis can be made visible for debug
        // timeouts
        VIEWPORT_RESIZE_TIMEOUT,
        SCROLL_TIMEOUT_FOR_ONAFTERSCROLL,
        IDLECALLBACK_TIMEOUT,
        TIMEOUT_FOR_VARIABLE_MEASUREMENTS,
        // ratios:
        MAX_CACHE_OVER_RUN, // max streaming over-run as ratio to cacheMax

    } = advanced

    VIEWPORT_RESIZE_TIMEOUT = VIEWPORT_RESIZE_TIMEOUT ?? 250
    SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = SCROLL_TIMEOUT_FOR_ONAFTERSCROLL ?? 100
    IDLECALLBACK_TIMEOUT = IDLECALLBACK_TIMEOUT ?? 4000
    TIMEOUT_FOR_VARIABLE_MEASUREMENTS = TIMEOUT_FOR_VARIABLE_MEASUREMENTS ?? 100
    
    MAX_CACHE_OVER_RUN = MAX_CACHE_OVER_RUN ?? 1.5

    if (typeof showAxis != 'boolean') showAxis = false

    if (typeof useScrollTracker != 'boolean') useScrollTracker = true

    // for mount version
    const scrollerSessionIDRef = useRef(null)
    const scrollerID = scrollerSessionIDRef.current

    // for children
    const cacheHandlerRef = useRef(null)

    const listsizeRef = useRef(estimatedListSize)

    const listsize = listsizeRef.current

    // tests for React with Object.is for changed properties; avoid re-renders with no change
    if (!compareProps(gridSpecs, gridSpecsRef.current)) {
        gridSpecsRef.current = gridSpecs
    }

    if (!compareProps(styles, stylesRef.current)) {
        stylesRef.current = styles
    }
    if (!compareProps(callbacks, callbacksRef.current)) {
        callbacksRef.current = callbacks
    }

    // -------------------------[ Initialization ]-------------------------------

    useEffect (() => {

        scrollerSessionIDRef.current = globalScrollerID++
        cacheHandlerRef.current = new CacheHandler(scrollerSessionIDRef.current, setListsize, listsizeRef)

    },[])

    // called when getItem returns null, or direct call from user (see serviceHandler)
    const setListsize = useCallback((listsize) =>{

        if (listsize == listsizeRef.current) return

        listsizeRef.current = listsize

        // inform the user
        callbacksRef.current.newListsize && callbacksRef.current.newListsize(listsize)

        setScrollerState('setlistsize')

    },[])

    // ---------------------[ State handling ]------------------------

    useEffect(() => {

        switch (scrollerState) {
            case 'setup':
            case 'setlistsize':
                setScrollerState('ready')
        }

    },[scrollerState])

    // --------------------[ Render ]---------------------

    // component calls are deferred by scrollerState to give cacheHandler a chance to initialize
    return <React.StrictMode>
        <ErrorBoundary
        FallbackComponent= { ErrorFallback }
        onReset= { () => {
          // response tbd; there may not need to be one
        }}
        onError = {(error: Error, info: {componentStack: string}) => {
            console.log('react-infinite-grid-scroller captured error', error)
        }}
    >

        {(scrollerState != 'setup') && <Viewport

            gridSpecs = { gridSpecsRef.current }
            styles = { stylesRef.current }
            scrollerProperties = {scrollerProperties}
            scrollerID = { scrollerID }
            VIEWPORT_RESIZE_TIMEOUT = { VIEWPORT_RESIZE_TIMEOUT }

        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }
                styles = { stylesRef.current }
                listsize = { listsize }
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    styles = { stylesRef.current }
                    listsize = { listsize }
                    cache = { cache }
                    cacheMax = { cacheMax }
                    userCallbacks = { callbacksRef.current }
                    startingIndex = { startingIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }

                    cacheHandler = {cacheHandlerRef.current}
                    useScrollTracker = {useScrollTracker}
                    showAxis = { showAxis }
                    SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = { SCROLL_TIMEOUT_FOR_ONAFTERSCROLL }
                    IDLECALLBACK_TIMEOUT = { IDLECALLBACK_TIMEOUT }
                    MAX_CACHE_OVER_RUN = { MAX_CACHE_OVER_RUN }
                    TIMEOUT_FOR_VARIABLE_MEASUREMENTS = { TIMEOUT_FOR_VARIABLE_MEASUREMENTS }
                    scrollerID = { scrollerID }

                />
            </Scrollblock>
        </Viewport>}
        {(scrollerState != 'setup') && <div data-type = 'cacheroot' style = { cacherootstyle }>
            <PortalList cacheProps = { cacheHandlerRef.current.cacheProps }/>
        </div>}
    </ErrorBoundary>
    </React.StrictMode>
}

export default InfiniteGridScroller

// ----------------------------[ Support ]------------------------------

const cacherootstyle = {display:'none'}// as React.CSSProperties // static, out of view 

// utility
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
