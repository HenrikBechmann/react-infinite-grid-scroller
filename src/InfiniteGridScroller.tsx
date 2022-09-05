// InfiniteGridScroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    ROADMAP:

        layout: uniform, variable

        cross-browser testing; smartphone testing

        release to npm

        create demo site - github pages

    BUGS: 
    
    TODO:

        re-test for memory leaks window.performance.memory
        retest concat replacements
        ----------------
        (after layout...)
        
        - prioritize fetch cells for visible cells

        - create random loading delays in test ui
        - provide way to attempt reload of a single cell (change instanceID)
        - test for two root portals
        - calc minwidth by form factor
        - review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        - add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
*/

/*
    react-infinite-grid-scroller = RIGS

    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, fullsize for adjusted cell height/width, which in turn contains the cradle 
        - a component that contains CellFrames (which contain displayed items or transitional placeholders. 
    The CellFrames are skeletons which contain the host content components.

    Host content is instantiated in a portal cache (via PortalHandler) 
    and then portal'd to its host CellFrame. The cach can be configured to hold many more items
    than cradle, allowing a range of host content to maintain state.

    Scrollblock by size represents the entirety of the list, and is the scroller

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual host items are framed by CellFrame, managed by Cradle

    Overall the infinitegridscroller as a package manages the often asynchronous interactions of the 
    components of the mechanism. Most of the work occurs in the Cradle component.
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

        // ** grid specs:
        orientation = 'vertical', // vertical or horizontal
        gap = 0, // space between grid cells, not including the leading and trailing padding
        padding = 0, // the border space between the items and the viewport, applied to the cradle
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
            // base for variable layout
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
            // base for variable layout
        layout = 'uniform', // uniform, variable

        // ** scroller specs:
        estimatedListSize = 0, // the exact number of the size of the virtual list. can be modified
        runwaySize = 3, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble cellFrames before display
        startingIndex = 0, // the 0-based starting index of the list, when first loaded
        getItem, // required. function provided by host - parameters are index number, set by system,
            // and session itemID for tracking and matching; 
            // return value is host-selected component or promise of a component, or null or undefined
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // replaces default placeholder if present
        styles = {}, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, scrolltracker, placeholderframe, or
            // placeholdercontent. Do not make structural changes!

        // ** system specs:
        useScrollTracker = true, // the internal use feedback for repositioning
        cache = 'cradle', // "preload", "keepload" or "cradle"
        cacheMax = null, // always minimum cradle; null means limited by listsize
        triggerlineOffset = 10, // distance from cell head or tail for content shifts above/below axis
        callbacks = {}, // optional. closures to get direct information streams of some component utilites
            // can contain getFunctions, which provides access to internal scroller functions (mostly cache management)
        advanced = {}, // optional. technical settings like VIEWPORT_RESIZE_TIMEOUT
        scrollerProperties, // required for embedded scroller; shares scroller settings with content
    } = props

    // ---------------------[ Data setup ]----------------------

    // avoid null/undefined
    styles = styles ?? {}
    callbacks = callbacks ?? {}
    advanced = advanced ?? {}
    startingIndex = startingIndex ?? 0
    estimatedListSize = estimatedListSize ?? 0
    runwaySize = runwaySize ?? 3
    useScrollTracker = useScrollTracker ?? true

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
        layout,
    }

    const gridSpecsRef = useRef(gridSpecs)

    // state
    const [scrollerState, setScrollerState] = useState('setup') // setup, setlistsize, ready

    // system
    const stylesRef = useRef(styles)
    const callbacksRef = useRef(callbacks)

    let {

        showAxis, // for debug
        VIEWPORT_RESIZE_TIMEOUT,
        SCROLL_TIMEOUT_FOR_ONAFTERSCROLL,
        IDLECALLBACK_TIMEOUT,
        MAX_CACHE_OVER_RUN,

    } = advanced

    VIEWPORT_RESIZE_TIMEOUT = VIEWPORT_RESIZE_TIMEOUT ?? 250
    SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = SCROLL_TIMEOUT_FOR_ONAFTERSCROLL ?? 500
    IDLECALLBACK_TIMEOUT = IDLECALLBACK_TIMEOUT ?? 4000
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

    // test React Object.is for attributes; avoid re-renders with no change
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

    // called when getItem returns null, or direct call from user (see servicehandler)
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
