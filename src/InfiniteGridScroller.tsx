// InfiniteGridScroller.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the Scrollblock, which is full size for listsize of given cell height/width.
    Scrollblock in turn contains the Cradle - a component that contains CellFrames, which contain 
    displayed user content (items) or transitional placeholders. 

    Host content is instantiated in a cache of React portals (via cacheHandler). Content is then 
    portal'd to CellFrames. The cache can be configured to hold more items than the Cradle (limited by 
    device memory). Caching allows host content to maintain state.

    Scrollblock represents the entirety of the list (and is sized accordingly). It is the object that is scrolled.

    Cradle contains the list items, and is 'virtualized' -- it appears as though it scrolls through a filled 
    scrollblock, but in fact it is only slightly larger than the viewport. Content is rotated in and out of the 
    cradle through the cache.
    
    Individual host items are framed by CellFrame, which are managed by Cradle.

    Overall the InfiniteGridScroller as a package manages the asynchronous interactions of the 
    components of the mechanism. Most of the work occurs in the Cradle component.

    The Rigs liner (the top level Viewport element) is set with 'display:absolute' and 'inset:0', so the user 
    containing block should be styles accordingly.
*/

import React, { useEffect, useState, useCallback, useRef } from 'react'

// defensive
import { ErrorBoundary } from 'react-error-boundary' // www.npmjs.com/package/react-error-boundary

export const isSafariIOS = () => {
    const
        is_ios = /iP(ad|od|hone)/i.test(window.navigator.userAgent),
        is_safari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)
    return ( is_ios && is_safari ) 
}

// based on module template
function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert" style = {{margin:'3px'}}>
      <p>Something went wrong inside react-infinite-grid-scroller. See the console for details.</p>
      <p>Click to cancel the error and try to continue.</p>
      <button style = {{border:'1px solid black', margin:'3px', padding:'3px'}} onClick={ resetErrorBoundary }>Cancel error</button>
    </div>
  )
}

// scroller components
import Viewport from './Viewport'
import Scrollblock from './Scrollblock'
import Cradle from './Cradle'

// loaded here to minimize redundant renders in Cradle
import PortalCache from './PortalCache'
import CacheHandler from './portalcache/cachehandler'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

// ===================================[ INITIALIZE ]===========================

const InfiniteGridScroller = (props) => {


    // ------------------[ normalize properties ]--------------------

    let { 

        // required
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
            // max for variable layout
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
            // max for variable layout
        startingListSize = 0, // the starging number of items in the virtual list. can be changed
        getItem, // required. function provided by host - parameters set by system are index number
            // and session itemID for tracking and matching; 
            // return value is host-selected component or promise of a component, or null or undefined

        // grid specs:
        orientation = 'vertical', // vertical or horizontal
        gap = 0, // space between grid cells, not including the leading and trailing padding
        padding = 0, // the border space between the items and the viewport, applied to the cradle
        layout = 'uniform', // uniform, variable
        cellMinHeight = 25, // for layout == 'variable' && orientation == 'vertical'
        cellMinWidth = 25, // for layout == 'variable' && orientation == 'horizontal'

        // scroller specs:
        runwaySize = 3, // the number of rows outside the view of each side of the viewport 
            // -- gives time to assemble cellFrames before display
        startingIndex = 0, // the 0-based starting index of the list, when first loaded

        // system specs:
        cache = 'cradle', // "preload", "keepload" or "cradle"
        cacheMax = null, // always minimum cradle content size; falsey means limited by listsize
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // replaces default placeholder if present
        usePlaceholder = true, // no placeholder rendered if false
        useScrollTracker = true, // the internal component to give feedback for repositioning

        // advanced objects
        styles = {}, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, scrolltracker, placeholderframe, 
            // placeholdererrorframe, placeholderliner or placeholdererrorliner. Do not make structural changes!
        placeholderMessages = {}, // messages presented by default placeholder. See documentation
        callbacks = {}, // optional. closures to get direct information streams of some component utilites
            // can contain functionsCallback, which provides access to internal scroller functions 
            //(mostly cache management)
        technical = {}, // optional. technical settings like VIEWPORT_RESIZE_TIMEOUT

        // information for host cell content
        scrollerProperties, // required for embedded scroller; shares scroller settings with content

    } = props

    let isMinimalPropsFail = false
    if (!(cellWidth && cellHeight && getItem )) {
        console.log('RIGS: cellWidth, cellHeight, and getItem are required')
        isMinimalPropsFail = true
    }

    // ---------------------[ Data setup ]----------------------

    const originalValues = {
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        gap,
        padding,
        startingIndex,
        startingListSize,
        runwaySize,
        cacheMax,
    }

    // avoid null/undefined
    styles = styles ?? {}
    callbacks = callbacks ?? {}
    technical = technical ?? {}
    startingIndex = startingIndex ?? 0
    startingListSize = startingListSize ?? 0
    runwaySize = runwaySize ?? 3
    usePlaceholder = usePlaceholder ?? true
    useScrollTracker = useScrollTracker ?? true
    cellMinHeight = cellMinHeight ?? 0
    cellMinWidth = cellMinWidth ?? 0
    cacheMax = cacheMax ?? 0

    cellHeight = +cellHeight
    cellWidth = +cellWidth
    cellMinHeight = +cellMinHeight
    cellMinWidth = +cellMinWidth
    gap = +gap
    padding = +padding
    startingIndex = +startingIndex
    startingListSize = +startingListSize
    runwaySize = +runwaySize
    cacheMax = +cacheMax

    const verifiedValues = {
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        gap,
        padding,
        startingIndex,
        startingListSize,
        runwaySize,
        cacheMax,        
    }

    cellMinHeight = Math.max(cellMinHeight, 25)
    cellMinWidth = Math.max(cellMinWidth, 25)
    cellMinHeight = Math.min(cellHeight, cellMinHeight)
    cellMinWidth = Math.min(cellWidth, cellMinWidth)

    // prop constraints - non-negative values
    runwaySize = Math.max(1,runwaySize) // runwaysize must be at least 1
    startingListSize = Math.max(0,startingListSize)
    startingIndex = Math.max(0,startingIndex)

    // package
    let problems = 0
    for (const prop in verifiedValues) {
        if (isNaN(verifiedValues[prop])) {
            problems++
        } 
    }

    if (problems) {
        console.error('Error: invalid number - compare originalValues and verifiedValues', 
            originalValues, verifiedValues)
    }

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
    const placeholderMessagesRef = useRef(placeholderMessages)

    let {

        showAxis, // boolean; axis can be made visible for debug
        triggerlineOffset, // distance from cell head or tail for content shifts above/below axis
        // timeouts
        VIEWPORT_RESIZE_TIMEOUT,
        ONAFTERSCROLL_TIMEOUT,
        IDLECALLBACK_TIMEOUT,
        VARIABLE_MEASUREMENTS_TIMEOUT,
        // ratios:
        MAX_CACHE_OVER_RUN, // max streaming over-run as ratio to cacheMax
        CACHE_PARTITION_SIZE, 

    } = technical

    VIEWPORT_RESIZE_TIMEOUT = VIEWPORT_RESIZE_TIMEOUT ?? 250
    ONAFTERSCROLL_TIMEOUT = ONAFTERSCROLL_TIMEOUT ?? 100
    IDLECALLBACK_TIMEOUT = IDLECALLBACK_TIMEOUT ?? 250
    VARIABLE_MEASUREMENTS_TIMEOUT = VARIABLE_MEASUREMENTS_TIMEOUT ?? 250
    
    MAX_CACHE_OVER_RUN = MAX_CACHE_OVER_RUN ?? 1.5
    CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE ?? 30

    if (typeof showAxis != 'boolean') showAxis = false

    triggerlineOffset = triggerlineOffset ?? 10

    if (typeof usePlaceholder != 'boolean') usePlaceholder = true
    if (typeof useScrollTracker != 'boolean') useScrollTracker = true

    // for mount version
    const scrollerSessionIDRef = useRef(null)
    const scrollerID = scrollerSessionIDRef.current

    // for children
    const cacheHandlerRef = useRef(null)

    const listsizeRef = useRef(startingListSize)

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
    if (!compareProps(placeholderMessages, placeholderMessagesRef.current)) {
        placeholderMessagesRef.current = placeholderMessages
    }

    // -------------------------[ Initialization ]-------------------------------

    const getCacheAPI = (cacheHandler) => {
        cacheHandlerRef.current = cacheHandler
    }

    useEffect (() => {

        if (scrollerSessionIDRef.current === null) { // defend against React.StrictMode double run
            scrollerSessionIDRef.current = globalScrollerID++
            // cacheHandlerRef.current = new CacheHandler(scrollerSessionIDRef.current, setListsize, listsizeRef, 
            //     CACHE_PARTITION_SIZE)
        }

    },[]);

    // called when getItem returns null, or direct call from user (see serviceHandler)
    const updateListsize = useCallback((listsize) =>{

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

    if (problems || isMinimalPropsFail) {
        return <div>error: see console.</div>        
    }

    // component calls are deferred by scrollerState to give cacheHandler a chance to initialize
    return <ErrorBoundary
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
            // scrollerProperties = { scrollerProperties }
            scrollerID = { scrollerID }
            VIEWPORT_RESIZE_TIMEOUT = { VIEWPORT_RESIZE_TIMEOUT }

        >
        
            {<Scrollblock

                gridSpecs = { gridSpecsRef.current }
                styles = { stylesRef.current }
                listsize = { listsize }
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    styles = { stylesRef.current }
                    listsize = { listsize }
                    updateListsize = { updateListsize }
                    cache = { cache }
                    cacheMax = { cacheMax }
                    userCallbacks = { callbacksRef.current }
                    startingIndex = { startingIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    placeholderMessages = { placeholderMessagesRef.current }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }
                    scrollerProperties = { scrollerProperties }

                    cacheHandler = { cacheHandlerRef.current }
                    usePlaceholder = { usePlaceholder }
                    useScrollTracker = { useScrollTracker }
                    showAxis = { showAxis }
                    ONAFTERSCROLL_TIMEOUT = { ONAFTERSCROLL_TIMEOUT }
                    IDLECALLBACK_TIMEOUT = { IDLECALLBACK_TIMEOUT }
                    MAX_CACHE_OVER_RUN = { MAX_CACHE_OVER_RUN }
                    VARIABLE_MEASUREMENTS_TIMEOUT = { VARIABLE_MEASUREMENTS_TIMEOUT }
                    scrollerID = { scrollerID }

                />
            </Scrollblock>}
        </Viewport>}
        {(scrollerState != 'setup') && <div data-type = 'cacheroot' style = { cacherootstyle }>
            <PortalCache 
                scrollerSessionIDRef = { scrollerSessionIDRef }
                setListsize = { updateListsize } 
                listsizeRef = { listsizeRef } 
                getCacheAPI = { getCacheAPI } 
                CACHE_PARTITION_SIZE = { CACHE_PARTITION_SIZE } />
        </div>} 
    </ErrorBoundary>
}

export default InfiniteGridScroller

// ----------------------------[ Support ]------------------------------

const cacherootstyle = {display:'none'}// as React.CSSProperties // static, out of view 

// utility
function compareProps (obj1,obj2) {
    if (!obj1 || !obj2) return false
    const keys = Object.keys(obj1)
    for (const key of keys) {
        if (!Object.is(obj1[key],obj2[key])) {
            return false
        }
    }
    return true
}
