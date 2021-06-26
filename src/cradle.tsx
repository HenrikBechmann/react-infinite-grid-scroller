// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:

    add scroller name for debugging

    fold shift only happens after delay

    nested horizontal tail boundary is wrong - underlying structure; head bottom boundary is wrong

    for resize, preserve cache for reload

    can't mount error in nested lists

    Debug scrollToItem callback (including setting scrollforward on first action).
        motion takes place but gets close rather than exact. Position is off by runwaycount

    Make sure item shell triggers are only fired at the leading, not trailing, edge

    Inconsistency in viewportrows, sometimes Math.ceil, sometimes Math.floor

    change height to 0px from auto for spine in vertical
    
    update scrollforward logic to take into account rapid opposite scrolling. 
    Use differences in scrollTop?

    ==>> check getShift logic. !scrollforward should select next calculated index 
    to be above the fold if possible.

    QA defend against butterfly getting intersections from opposite scroll direction
        as the result of a short viewport

    implement sessionid scheme for cell content

    deal with spine being notified by bottom border rather than top

    test ITEM_OBSERVER_THRESHOLD at various levels
    think through management of items larger than viewport

    Add ITEM_OBSERVER_THRESHOLD to test parameters

    Add show fold to test parameters

 */

/*
    Description
    -----------
    The GridStroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
    The illusion is maintained by synchronizing changes in cradle content with cradle location inside a scrollblock, such
    that as the scrollblock is moved, the cradle moves oppositely in the scrollblock (to stay visible within the viewport). 
    The scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size and position which 
    realistically reflects the size of the list being shown.

    The position of the cradle is controlled by a 'spine' which is a 0px height/width (along the medial - ScrollBlock can be 
    verticsl or horizontal). The purpose of the spine is to act as a 'fold', above which cell content expands 'upwards', and 
    below which the cell content expands  'downwards'. GridScroller can be viewed vertically or horizontally. When horizontal, 
    the spine has a 0px width, so that the 'fold' is vertical, and cells expand to the left and right.

    The spine is controlled to always be in the at the leading edge of the leading cellrow of the viewport. Thus
    in vertical orientation, the spine 'top' css attribute is always equal to the 'scrollTop' position of the scrollblock,
    plus an adjustment. The adjustment is the result of the alignment of the spine in relation to the top-(or left-)most cell
    in the viewport (the 'reference' row). The spine can only be placed at the leading edge of the first visible
    cell in the viewport. Therefore the spine offset from the leading edge of the viewport can be anywhere from minus to
    plus the length of the leading row. The exact amount depends on where the 'breakpoint' of transition notification is set for
    cells crossing the viewport threshold (and can be configured). The default of the breakpoint is .5 (half the length of the cell).

    Technically, there are several reference points tracked by the GridScroller. These are:
        - spineReferenceIndex (the virtual index of the item controlling the location of the spine)
            The spineReferenceIndex is also used to allocate items above (lower index value) and below (same or higher index value)
            the fold
        - cradleReferenceIndex (the virtual index of the item defining the leading bound of the cradle content)
        - spineOffset (pixels - plus or minus - that the spine is placed in relation to the viewport's leading edge) 
    
    These reference points are applied to the following structures:
        - the viewport
        - the scrollblock
        - the cradle, consisting of
            - the spine (contains cradle head and tail)
            - the head (contains leading items)
            - the tail (contains trailing items)

    Structure details:
        the cradle content consists of
        - the number of rows that are visible in the viewport (according to the default parameters)
            - this typically includes one partially visible row
        - the number of runway rows specified in the parameters, times 2 (one et for the head; one for the tail)
        - the number of items is the number of rows times the 'crosscount' the lateral number of cells. 
        - the last row might consist of fewer items than crosscount, to match the maximum listsize
        - the cradleRowcount (visible default rows + runwaycount * 2) and viewpointRowcount (visble rows;typicall one partial)

    Item containers:
        Client cell content is contained in CellShell's, which are configured according to GridScroller's input parameters.
        The ItemCell's are in turn contained in CSS grid structures. There are two grid structures - one in the cradle head,
        and one in the cradle tail. Each grid structure is allowed uniform padding and gaps - identical between the two.

    Overscroll handling:
        Owing to the weight of the code, and potential rapidity of scrolling, there is an overscroll protocol. 
        if the overscroll is such that part of the cradle is still within the viewport boundaries, then the overscroll
        is calculated as the number of cell rows that would fit (completely or partially) in the space between the edge of 
        the cradle that is receding from a viewport edge. 

        If the overshoot is such that the cradle has entirely passed out of the viewport, the GridScroller goes into 'Repositoining'
        mode, meaning that it tracks relative location of the spine edge of the viewport, and repaints the cradle accroding to
        this position when the scrolling stops.
*/

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import useIsMounted from 'react-is-mounted-hook'

// import ResizeObserverPolyfill from 'resize-observer-polyfill'

import { ResizeObserver } from '@juggle/resize-observer'

import { PortalManager } from './portalmanager'

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserver

const ITEM_OBSERVER_THRESHOLD = 0

import { 
    setCradleGridStyles, 
    getUIContentList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    calcVisibleItems, 
    getScrollReferenceIndexData,
    getContentListRequirements,
    isolateRelevantIntersections,
    allocateContentList,
    deleteAndResetPortals,

} from './cradlefunctions'

import ScrollTracker from './scrolltracker'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

const signalsbaseline = {
        pauseCellObserver: true,
        pauseCradleIntersectionObserver:true,
        pauseCradleResizeObserver: true,
        pauseScrollingEffects: true,
        isTailCradleInView:true,
        isHeadCradleInView:true,
        isCradleInView:true,
        isReparenting:false,
    }

const Cradle = ({ 
        gap, 
        padding, 
        // runwaylength,
        runwaycount, 
        listsize, 
        indexOffset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        functions,
        styles,
        scrollerName,
        scrollerID,
    }) => {

    // console.log('cradle scrollerID',scrollerID)

    // functions and styles handled separately
    const cradlePropsRef = useRef(null) // access by closures
    cradlePropsRef.current = useMemo(() => {
        return { 
            gap, 
            padding, 
            // runwaylength,
            runwaycount, 
            listsize, 
            indexOffset, 
            orientation, 
            cellHeight, 
            cellWidth, 
            getItem, 
            placeholder, 
            scrollerName,
            scrollerID,
    }},[
        gap, 
        padding, 
        // runwaylength,
        runwaycount, 
        listsize, 
        indexOffset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        scrollerName,
        scrollerID,
    ])

    // =============================================================================================
    // --------------------------------------[ INITIALIZATION ]-------------------------------------
    // =============================================================================================

    // -----------------------------------------------------------------------
    // -----------------------------------[ utilites ]------------------------

    const portalManager = useContext(PortalManager)
    let isMounted = useIsMounted()
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    const cellObserverRef = useRef(null) // IntersectionObserver
    const cradleIntersectionObserverRef = useRef(null)
    const cradleResizeObserverRef = useRef(null)

    // -----------------------------------------------------------------------
    // ---------------------------[ context data ]----------------------------

    const viewportData = useContext(ViewportContext)
    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const [cradleState, setCradleState] = useState('setup')

    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    console.log('RUNNING cradle scrollerID, cradleState', scrollerID, cradleState)
    // -----------------------------------------------------------------------
    // -------------------------[ control flags ]-----------------

    const signalsRef = useRef(signalsbaseline)

    if (viewportData.portalitem?.reparenting && !signalsRef.current.isReparenting && !(cradleState == 'setup')) {
            console.log('resetting signals for reparenting')
            signalsRef.current = signalsbaseline;
            signalsRef.current.isReparenting = true
            // let observerRecords = cellObserverRef.current.takeRecords()
            // console.log('taken observerRecords',observerRecords)
            // setCradleState('normalizecontrols')
        // }
    }

    // console.log('RUNNING cradle scrollerID cradleState with portalRecord',
    //     scrollerID, cradleState)

    // ------------------------------------------------------------------------
    // -----------------------[ initialization effects ]-----------------------

    //initialize host functions properties
    useEffect(()=>{

        if (functions?.hasOwnProperty('scrollToItem')) {
            functions.scrollToItem = scrollToItem
        } 

        if (functions?.hasOwnProperty('getVisibleList')) {
            functions.getVisibleList = getVisibleList
        } 

        if (functions?.hasOwnProperty('getContentList')) {
            functions.getContentList = getContentList
        } 

        if (functions?.hasOwnProperty('reload')) {
            functions.reload = reload
        }

        referenceIndexCallbackRef.current = functions?.referenceIndexCallback

    },[functions])

    // initialize window scroll listener
    useEffect(() => {
        let viewportdata = viewportDataRef.current
        viewportdata.elementref.current.addEventListener('scroll',onScroll)

        return () => {

            viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll',onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        // console.log('viewportData.isResizing', viewportData.isResizing)
        if (cradleStateRef.current == 'setup') return
        if (viewportData.isResizing) {

            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

            // console.log('calling resizing with', callingReferenceIndexDataRef.current)

            signalsRef.current.pauseCellObserver = true
            signalsRef.current.pauseCradleIntersectionObserver = true
            signalsRef.current.pauseCradleResizeObserver = true
            signalsRef.current.pauseScrollingEffects = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportData.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('resized')

        }

    },[viewportData.isResizing])

    // reload for changed parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

        signalsRef.current.pauseCellObserver = true
        // pauseCradleIntersectionObserverRef.current = true
        signalsRef.current.pauseScrollingEffects = true

        setCradleState('reload')

    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    // trigger pivot on change in orientation
    useEffect(()=> {

        if (cradleStateRef.current != 'setup') {

            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

            // let orientation = cradlePropsRef.current.orientation
            // get previous ration
            let previousCellPixelLength = (orientation == 'vertical')?cradlePropsRef.current.cellWidth:cradlePropsRef.current.cellHeight
            let previousSpineOffset = callingReferenceIndexDataRef.current.spineoffset

            let previousratio = previousSpineOffset/previousCellPixelLength

            let currentCellPixelLength = (orientation == 'vertical')?cradlePropsRef.current.cellHeight:cradlePropsRef.current.cellWidth

            let currentSpineOffset = previousratio * currentCellPixelLength
            
            // scrollReferenceIndexDataRef.current.spineoffset = 
            callingReferenceIndexDataRef.current.spineoffset = Math.round(currentSpineOffset)

            signalsRef.current.pauseCellObserver = true
            // pauseCradleIntersectionObserverRef.current = true
            signalsRef.current.pauseScrollingEffects = true

            setCradleState('pivot')

        }

        let cradleContent = cradleContentRef.current
        cradleContent.headModel = []
        cradleContent.tailModel = []
        cradleContent.headView = []
        cradleContent.tailView = []

    },[orientation])

    // =======================================================================
    // -------------------------[ OPERATION ]---------------------------------
    // =======================================================================

    // -----------------------------------------------------------------------
    // ------------------------[ session data ]-------------------------------

    // ------------------ current location -- first tail visible item -------------

    const instanceIdCounterRef = useRef(0)
    const instanceIdMapRef = useRef(new Map())

    const scrollReferenceIndexDataRef = useRef({ // existing or expected, monitored through onScroll
        index:Math.min(indexOffset,(listsize - 1)) || 0,
        spineoffset:padding
    }) // access by closures

    // set by onScroll at the end of scroll sessions
    const stableReferenceIndexDataRef = useRef(scrollReferenceIndexDataRef.current) 

    // anticipate calling of operation which requires ReferenceIndex data
    const callingReferenceIndexDataRef = useRef(stableReferenceIndexDataRef.current) // anticipate reposition

    // -------------------------------[ cradle data ]-------------------------------------

    // TODO: create a datamodel object for this?
    // cradle butterfly html components
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const spineCradleElementRef = useRef(null)
    const cradleElementsRef = useRef(
        {
            head:headCradleElementRef, 
            tail:tailCradleElementRef, 
            spine:spineCradleElementRef
        }
    )

    const cradleContentRef = useRef({
        cradleModel: null,
        headModel: null,
        tailModel: null,
        headView: [],
        tailView: [],
        // portalData: new Map()
    })

    // item elements cache...
    const itemElementsRef = useRef(new Map()) // items register their element

    // ------------------------------[ cradle configuration ]---------------------------

    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions
    
    const crosscount = useMemo(() => {

        let crosscount
        let size = (orientation == 'horizontal')?viewportheight:viewportwidth
        let crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        let lengthforcalc = size - (padding * 2) + gap // length of viewport
        let tilelengthforcalc = crossLength + gap
        tilelengthforcalc = Math.min(tilelengthforcalc,lengthforcalc) // result cannot be less than 1
        crosscount = Math.floor(lengthforcalc/(tilelengthforcalc))

        // console.log('cradle CROSSCOUNT for scrollerName, scrollerID',scrollerName, scrollerID, crosscount)

        return crosscount

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        padding, 
        viewportheight, 
        viewportwidth,
    ])

    // const crosscountRef = useRef(crosscount) // for easy reference by observer
    // crosscountRef.current = crosscount // available for observer closure

    const [cradleRowcount,viewportRowcount] = useMemo(()=> {

        let viewportLength, cellLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            cellLength = cellHeight
        } else {
            viewportLength = viewportwidth
            cellLength = cellWidth
        }

        cellLength += gap

        let viewportrowcount = Math.ceil(viewportLength/cellLength)
        let cradleRowcount = viewportrowcount + (runwaycount * 2)
        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            cradleRowcount = Math.ceil(itemcount/crosscount)
        }
        return [cradleRowcount, viewportrowcount]

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        listsize,
        // padding,
        viewportheight, 
        viewportwidth,
        runwaycount,
        crosscount,
    ])

    const cradleConfigRef = useRef({
        crosscount,
        cradleRowcount,
        viewportRowcount,
        cellObserverThreshold:ITEM_OBSERVER_THRESHOLD,
        listRowcount:Math.ceil(listsize/crosscount)
    })

    cradleConfigRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        cellObserverThreshold:ITEM_OBSERVER_THRESHOLD,
        listRowcount:Math.ceil(listsize/crosscount),
    }

    // ----------------------------------[ cradle default styles]----------------------------------

    // base styles
    let cradleHeadStyle = useMemo(() => {

        let bottom, left, top, right

        if (orientation == 'vertical') {
            bottom = 0
            left = 0
            right = 0
            top = 'auto'
        } else {
            bottom = 0
            left = 'auto'
            right = 0
            top = 0
        }

        return {...{

            position: 'absolute',
            backgroundColor: 'blue',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            justifyContent:'start',
            alignContent:'start',
            boxSizing:'border-box',
            bottom,
            left,
            right,
            top,

        } as React.CSSProperties,...styles?.cradle}

    },[
        gap,
        padding,
        styles,
        orientation,
    ])

    let cradleTailStyle = useMemo(() => {

        let bottom, left, top, right

        if (orientation == 'vertical') {
            bottom = 'auto'
            left = 0
            right = 0
            top = 0
        } else {
            bottom = 0
            left = 0
            right = 'auto'
            top = 0
        }

        return {...{

            position: 'absolute',
            backgroundColor: 'blue',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            justifyContent:'start',
            alignContent:'start',
            boxSizing:'border-box',
            top,
            left,
            right,
            bottom,

        } as React.CSSProperties,...styles?.cradle}

    },[
        gap,
        padding,
        styles,
        orientation,
    ])

    // redundant
    let cradleSpineStyle = useMemo(() => {

        let styleobj:React.CSSProperties = {

            position: 'relative',

        }

        return styleobj

    },[

        padding,
        orientation,

    ])

    // enhanced styles for grid
    const [headstyle, tailstyle, spinestyle] = useMemo(()=> {
        // merge base style and revisions (by observer)
        let headCradleStyles:React.CSSProperties = {...cradleHeadStyle}
        let tailCradleStyles:React.CSSProperties = {...cradleTailStyle}
        let [headstyles, tailstyles] = setCradleGridStyles({

            orientation, 
            headCradleStyles, 
            tailCradleStyles, 
            cellHeight, 
            cellWidth, 
            gap,
            padding,
            crosscount, 
            viewportheight, 
            viewportwidth,

        })

        let top, left, width, height
        if (orientation == 'vertical') {
            top = padding + 'px'
            left = 'auto'
            width = '100%'
            height = 'auto'
        } else {
            top = 'auto'
            left = padding + 'px'
            width = 0
            height = '100%'
        }

        let spinestyle = {
            position: 'relative',
            top,
            left,
            width,
            height,
        } as React.CSSProperties

        return [headstyles, tailstyles, spinestyle]

    },[

        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,

      ])

    cradleHeadStyle = headstyle
    cradleTailStyle = tailstyle
    cradleSpineStyle = spinestyle

    // =================================================================================
    // -------------------------[ IntersectionObserver support]-------------------------
    // =================================================================================

    /*
        There are two interection observers, one for the cradle, and another for itemShells; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to respond to size changes of 
            variable cells.
    */    

    // --------------------------[ cradle observers ]-----------------------------------

    // set up cradle resizeobserver
    useEffect(() => {

        // ResizeObserver
        cradleResizeObserverRef.current = new LocalResizeObserver(cradleresizeobservercallback)

        let cradleElements = cradleElementsRef.current
        cradleResizeObserverRef.current.observe(cradleElements.head.current)
        cradleResizeObserverRef.current.observe(cradleElements.tail.current)

        return () => {

            cradleResizeObserverRef.current.disconnect()

        }

    },[])

    // TODO: noop
    const cradleresizeobservercallback = useCallback((entries) => {

        if (signalsRef.current.pauseCradleResizeObserver) return

    },[])

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    useEffect(() => {

        let viewportData = viewportDataRef.current
        // IntersectionObserver
        cradleIntersectionObserverRef.current = new IntersectionObserver(

            cradleIntersectionObserverCallback,
            {root:viewportData.elementref.current, threshold:0}

        )

        let cradleElements = cradleElementsRef.current
        cradleIntersectionObserverRef.current.observe(cradleElements.head.current)
        cradleIntersectionObserverRef.current.observe(cradleElements.tail.current)

        return () => {

            cradleIntersectionObserverRef.current.disconnect()

        }

    },[])

    const cradleIntersectionObserverCallback = useCallback((entries) => {


        let signals = signalsRef.current;

        // (scrollerID == 3) && console.log('OBSERVER IntersectionObserver callback scrollerid, reparenting, signals, entries',
        //     scrollerID, viewportDataRef.current.portalitem.reparenting, signals, entries)

        if (signals.pauseCradleIntersectionObserver) return
        if (viewportDataRef.current.portalitem?.reparenting) return

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.type == 'head') {
                signals.isHeadCradleInView = entry.isIntersecting
            } else {
                signals.isTailCradleInView = entry.isIntersecting
            }
        }

        signals.isCradleInView = (signals.isHeadCradleInView || signals.isTailCradleInView);

        // (scrollerID == 3) && console.log('isCradleInView, isHeadCradleInView, isTailCradleInView, cradlestate',
        //     signals.isCradleInView, signals.isHeadCradleInView, signals.isTailCradleInView, cradleStateRef.current)

        if (!signals.isCradleInView) 
        {
            let cradleState = cradleStateRef.current        
            if (
                !viewportDataRef.current.isResizing &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioning') && 
                !(cradleState == 'reposition') && 
                !(cradleState == 'pivot')
                ) 
            {
                let element = viewportDataRef.current.elementref.current
                if (!element) {
                    console.log('viewport element not set in cradleIntersectionObserverCallback',
                        scrollerID, viewportDataRef.current.elementref.current,viewportDataRef)
                    return
                }
                let rect = element.getBoundingClientRect()
                let {top, right, bottom, left} = rect
                let width = right - left, height = bottom - top
                viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                signals.pauseCellObserver = true
                // pauseCradleIntersectionObserverRef.current = true
                let cradleContent = cradleContentRef.current
                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                setCradleState('repositioning')

            }
        }

    },[])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runwaycount at both the leading
            and trailing edges, CellShells scroll into or out of the scope of the observer 
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through cellobservercallback() below) at the crossings of the itemshells 
            of the defined observer cradle boundaries.

            The no-longer-intersecting notifications trigger dropping of that number of affected items from 
            the cradle contentlist. The dropping of items from the trailing end of the content list
            triggers the addition of an equal number of items at the leading edge of the cradle content.

            Technically, the opposite end position spec is set (top or left depending on orientation), 
            and the matching end position spec is set to 'auto' when items are added. This causes items to be 
            "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.

            There are exceptions for setup and edge cases.
    */

    // change orientation
    useEffect(() => {

        if (cellObserverRef.current) cellObserverRef.current.disconnect()
        cellObserverRef.current = new IntersectionObserver(

            cellobservercallback,
            {
                root:viewportDataRef.current.elementref.current, 
                threshold:cradleConfigRef.current.cellObserverThreshold,
            } 

        )

        return () => {

            cellObserverRef.current.disconnect()

        }

    },[orientation])

    // the async callback from IntersectionObserver.
    const cellobservercallback = useCallback((entries)=>{

        let movedentries = []

        for (let entry of entries) {
            if (entry.target.dataset.initialized) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.initialized = true

            }
        }

        if (signalsRef.current.pauseCellObserver) {

            return

        }

        console.log('scrollerID cradle calling updateCradleContent from cellobserver',scrollerID)

        isMounted() && updateCradleContent(movedentries)

    },[])

    const previousScrollForwardRef = useRef(undefined)

    const updateCradleContent = (entries, source = 'notifications') => {

        let viewportData = viewportDataRef.current
        let viewportElement = viewportData.elementref.current
        if (!viewportElement) {
            console.error('ERROR: viewport element not set in updateCradleContent',
                scrollerID, viewportData.elementref.current,viewportDataRef)
            return
        }
            
        let cradleProps = cradlePropsRef.current

        let scrollOffset
        if (cradleProps.orientation == 'vertical') {
            scrollOffset = viewportElement.scrollTop
        } else {
            scrollOffset = viewportElement.scrollLeft // TODO: Cannot read property 'scrollLeft' of null
        }
        if ( scrollOffset < 0) { // for Safari elastic bounce at top of scroll

            return

        }

        // ----------------------------[ 1. initialize ]----------------------------

        let scrollPositions = scrollPositionsRef.current

        let scrollforward
        if (scrollPositions.current == scrollPositions.previous) { // edge case 

            scrollforward = previousScrollForwardRef.current

        } else {

            scrollforward = scrollPositions.current > scrollPositions.previous
            previousScrollForwardRef.current = scrollforward

        }

        if (scrollforward === undefined) {
            return // init call
        }

        let cradleElements = cradleElementsRef.current
        let cradleContent = cradleContentRef.current
        let cradleConfig = cradleConfigRef.current

        let itemElements = itemElementsRef.current

        let modelcontentlist = cradleContent.cradleModel

        let cradleReferenceIndex = modelcontentlist[0].props.index

        // let cradleConfig = cradleConfigRef.current

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the spine
        let intersections = isolateRelevantIntersections({

            scrollforward,
            intersections:entries,
            cradleContent,
            cellObserverThreshold:cradleConfig.cellObserverThreshold,

        })

        // console.log('intersections', intersections)

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        let [cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spineOffset, 
            contentCount] = calcContentShifts({

                cradleProps,
                cradleConfig,
                cradleElements,
                cradleContent,
                viewportElement,
                itemElements,
                intersections,
                scrollforward,
                // source,

        })

         // console.log('in updateCradleContent: cradleindex, cradleitemshift, spineReferenceIndex, referenceitemshift, spineOffset, contentCount',
         //     cradleindex, cradleitemshift, spineReferenceIndex, referenceitemshift, spineOffset, contentCount)

        if ((referenceitemshift == 0 && cradleitemshift == 0)) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        let [headchangecount,tailchangecount] = calcHeadAndTailChanges({

            cradleProps,
            cradleConfig,
            cradleContent,
            cradleshiftcount:cradleitemshift,
            scrollforward,
            cradleReferenceIndex,

        })

        // console.log('headchangecount,tailchangecount',headchangecount,tailchangecount)

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        // console.log('cradle UPDATECradleContent cradleReferenceIndex, cradleProps',cradleReferenceIndex, cradleProps)

        if (headchangecount || tailchangecount) {

            [localContentList,deletedContentItems] = getUIContentList({
                cradleProps,
                cradleConfig,
                contentCount,
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                observer: cellObserverRef.current,
                callbacks:callbacksRef.current,
                instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndResetPortals(portalManager, scrollerID, deletedContentItems)

        // console.log('deletedContentItems from updateCradleContent',deletedContentItems)

        // console.log('localContentList.length', localContentList.length)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spineReferenceIndex,
            }
        )

        // console.log('headcontent.length, tailcontent.length',headcontent.length, tailcontent.length)

        cradleContent.cradleModel = localContentList
        cradleContent.headView = cradleContent.headModel = headcontent
        cradleContent.tailView = cradleContent.tailModel = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        if (spineOffset !== undefined) {
            
            let cradleElements = cradleElementsRef.current

            if (cradleProps.orientation == 'vertical') {

                scrollPositionDataRef.current = {property:'scrollTop',value:viewportElement.scrollTop}
                cradleElements.spine.current.style.top = viewportElement.scrollTop + spineOffset + 'px'
                cradleElements.spine.current.style.left = 'auto'
                cradleElements.head.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                scrollPositionDataRef.current = {property:'scrollLeft',value:viewportElement.scrollLeft}
                cradleElements.spine.current.style.top = 'auto'
                cradleElements.spine.current.style.left = viewportElement.scrollLeft + spineOffset + 'px'
                cradleElements.head.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        scrollReferenceIndexDataRef.current = {
            index:spineReferenceIndex,
            spineoffset:spineOffset
        }

        setCradleState('updatecontent')

    }

    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    // ========================================================================================
    
    // reset cradle, including allocation between head and tail parts of the cradle
    const setCradleContent = (cradleState, referenceIndexData) => { 

        // console.log('setCradleContent start: cradleState, referenceIndexData',cradleState, referenceIndexData)

        let cradleProps = cradlePropsRef.current
        let { index: visibletargetindexoffset, 
            spineoffset: visibletargetscrolloffset } = referenceIndexData

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        let cradleConfig = cradleConfigRef.current
        let { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleConfig

        if (cradleState == 'reposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        let localContentList = []
        let cradleContent = cradleContentRef.current
        // cradleContent.portalData.clear()

        let {cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment} = 
            getContentListRequirements({
                cradleProps,
                cradleConfig,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                viewportElement:viewportDataRef.current.elementref.current
            })

        // console.log('setCradleContent getContentListRequirements: cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment',
        //     cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment)

        // console.log('cradle SETCradleContent cradleProps',cradleProps)

        // returns content constrained by cradleRowcount
        let [childlist,deleteditems] = getUIContentList({

            cradleProps,
            cradleConfig,
            contentCount,
            cradleReferenceIndex,
            headchangecount:0,
            tailchangecount:contentCount,
            localContentList,
            callbacks:callbacksRef.current,
            observer: cellObserverRef.current,
            instanceIdCounterRef,
        })

        deleteAndResetPortals(portalManager, scrollerID, deleteditems)

        // console.log('contentlist, deleteditems from setCradleContent',childlist,deleteditems)

        // console.log('childlist.length, contentCount, rows from setContent', childlist.length, contentCount, Math.ceil(contentCount/crosscount))

        let [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            spineReferenceIndex:referenceoffset,
    
        })

        // console.log('headcontentlist.length, tailcontentlist.length',headcontentlist.length, tailcontentlist.length)

        if (headcontentlist.length == 0) {
            spineOffset = padding
        }

        cradleContent.cradleModel = childlist
        cradleContent.headModel = headcontentlist
        cradleContent.tailModel = tailcontentlist

        scrollReferenceIndexDataRef.current = 
        stableReferenceIndexDataRef.current = {

            index: referenceoffset,
            spineoffset:spineOffset,

        }

        // console.log('setting referenceindexdata in setCradleContent',stableReferenceIndexDataRef.current)

        if (referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            referenceIndexCallbackRef.current(
                stableReferenceIndexDataRef.current.index, 'setCradleContent', cstate)

        }

        let cradleElements = cradleElementsRef.current

        if (orientation == 'vertical') {

            scrollPositionDataRef.current = {property:'scrollTop',value:scrollblockoffset  - spineOffset}

            cradleElements.spine.current.style.top = (scrollblockoffset + spineadjustment) + 'px'
            cradleElements.spine.current.style.left = 'auto'
            cradleElements.head.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            scrollPositionDataRef.current = {property:'scrollLeft',value:scrollblockoffset - spineOffset}

            cradleElements.spine.current.style.top = 'auto'
            cradleElements.spine.current.style.left = (scrollblockoffset + spineadjustment) + 'px'
            cradleElements.head.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    const scrollTimeridRef = useRef(null)

    const scrollPositionsRef = useRef({current:0,previous:0})

    // callback for scrolling
    const onScroll = useCallback((e) => {

        if (signalsRef.current.pauseScrollingEffects) {
            return
        }

        let viewportElement = viewportDataRef.current.elementref.current
        let scrollPositions = scrollPositionsRef.current

        let scrollPositioncurrent = 
            (cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositioncurrent < 0) { // for Safari

            return 

        }

        scrollPositions.previous = scrollPositions.current
        scrollPositions.current = 
            (cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        clearTimeout(scrollTimeridRef.current)

        let cradleState = cradleStateRef.current

        let cradleContent = cradleContentRef.current

        if (!viewportDataRef.current.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    let itemindex = cradleContent.tailModel[0]?.props.index 
                    if (itemindex === undefined) { // TODO: investigate
                        console.log('ERROR: scroll encountered undefined tailcontent lead')
                    }
                    let spineoffset
                    let cradleElements = cradleElementsRef.current

                    if (cradlePropsRef.current.orientation == 'vertical') {

                        spineoffset = cradleElements.spine.current.offsetTop - 
                            viewportDataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineoffset = cradleElements.spine.current.offsetLeft - 
                            viewportDataRef.current.elementref.current.scrollLeft

                    }
                    scrollReferenceIndexDataRef.current = {
                        index:itemindex,
                        spineoffset,
                    }

                } else {

                    scrollReferenceIndexDataRef.current = getScrollReferenceIndexData({
                        viewportData:viewportDataRef.current,
                        cradleProps:cradlePropsRef.current,
                        cradleConfig:cradleConfigRef.current,
                    })
                    setCradleState('updatereposition')
                }

                referenceIndexCallbackRef.current && 
                    referenceIndexCallbackRef.current(scrollReferenceIndexDataRef.current.index,'scrolling', cradleState)

            }

        }

        scrollTimeridRef.current = setTimeout(() => {

            if (!isMounted()) return

            // console.log('scrollerName, portalData after SCROLL:',scrollerName, cradleContentRef.current.portalData)

            let spineoffset
            let cradleElements = cradleElementsRef.current

            if (cradlePropsRef.current.orientation == 'vertical') {

                spineoffset = cradleElements.spine.current.offsetTop - 
                    viewportDataRef.current.elementref.current.scrollTop
                    
            } else {

                spineoffset = cradleElements.spine.current.offsetLeft - 
                    viewportDataRef.current.elementref.current.scrollLeft

            }

            scrollReferenceIndexDataRef.current.spineoffset = spineoffset

            let cradleState = cradleStateRef.current
            if (!viewportDataRef.current.isResizing) {
                let localrefdata = {...scrollReferenceIndexDataRef.current}

                stableReferenceIndexDataRef.current = localrefdata

            }
            switch (cradleState) {

                case 'repositioning': {

                    callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

                    setCradleState('reposition')

                    break
                }

                default: {
                    console.log('scrollerID cradle calling updateCradleContent from end of scroll',scrollerID)
                    updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

                }

            }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    },[])

    // data for state processing
    const callingCradleState = useRef(cradleStateRef.current)
    const headlayoutDataRef = useRef(null)
    const scrollPositionDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportData = viewportDataRef.current
        let cradleContent = cradleContentRef.current
        switch (cradleState) {
            case 'reload':
                // cradleContent.portalData.clear()
                setCradleState('setreload')
                break;
            case 'updatereposition':
                setCradleState('repositioning')
                break;
            case 'repositioning':
                break;

            case 'setscrollposition': {

                viewportData.elementref.current[scrollPositionDataRef.current.property] =
                    scrollPositionDataRef.current.value

                setCradleState('normalizecontrols')

                break
            }
            case 'updatecontent': { // scroll

                setCradleState('ready')
                break

            }
            case 'preparerender': {

                let cradleContent = cradleContentRef.current
                cradleContent.headView = cradleContent.headModel
                cradleContent.tailView = cradleContent.tailModel

                setCradleState('setscrollposition')
                break
            }
        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> {

        let viewportData = viewportDataRef.current
        switch (cradleState) {
            case 'setup': 
            case 'resized':
            case 'pivot':
            case 'setreload':
            case 'reposition':

                callingCradleState.current = cradleState
                setCradleState('preparecontent')

                break

            case 'preparecontent': {

                // console.log('settle (setCradleContent): state, refIndex',callingCradleState.current, callingReferenceIndexDataRef.current)

                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                portalManager.resetScrollerPortalRepository(scrollerID)
                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current)

                setCradleState('preparerender')

                break
            }
            case 'normalizecontrols': {
                setTimeout(()=> {

                    if (!isMounted()) return
                    if (!viewportData.isResizing) {
                        // redundant scroll position to avoid accidental positioning at tail end of reposition
                        if (viewportData.elementref.current) { // already unmounted if fails (?)
                            let signals = signalsRef.current
                            signals.pauseCellObserver  && (signals.pauseCellObserver = false)
                            signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)
                            signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)
                            signals.pauseCradleResizeObserver && (signals.pauseCradleResizeObserver = false)
                            signals.isReparenting && (signals.isReparenting = false)
                        } else {
                            console.log('ERROR: viewport element not set in normalizecontrols', scrollerID, viewportData)
                        }

                        if (signalsRef.current.isCradleInView) {
                            setCradleState('ready')
                        } else {
                            setCradleState('repositioning')
                        }

                    } else {
                        setCradleState('resizing')
                    }

                },100)

                break 

            }          

            case 'ready':
                break

        }

    },[cradleState])

    // =============================================================================
    // ------------------------------[ callbacks ]----------------------------------
    // =============================================================================

    // on host demand
    const getVisibleList = useCallback(() => {

        // let cradleElements = cradleElementsRef.current
        let cradleContent = cradleContentRef.current

        return calcVisibleItems({
            itemElementMap:itemElementsRef.current,
            viewportElement:viewportDataRef.current.elementref.current,
            cradleElements:cradleElementsRef.current, 
            // tailElement:cradlePropsRef.current.orientation,
            // spineElement:cradleElements.spine.current,
            cradleProps:cradlePropsRef.current,
            // orientation:cradlePropsRef.current.orientation,
            cradleContent:cradleContentRef.current,
            // headlist:cradleContent.headView,
        })

    },[])

    const getContentList = useCallback(() => {
        let contentlist = Array.from(itemElementsRef.current)

        contentlist.sort((a,b)=>{
            return (a[0] < b[0])?-1:1
        })

        return contentlist
    },[])

    const reload = useCallback(() => {

        signalsRef.current.pauseCellObserver = true
        signalsRef.current.pauseScrollingEffects = true

        let spineoffset
        let cradleElements = cradleElementsRef.current

        if (cradlePropsRef.current.orientation == 'vertical') {
            spineoffset = cradleElements.spine.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
        } else {
            spineoffset = cradleElements.spine.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
        }

        callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
        setCradleState('reload')

    },[])

    // const ViewportPortalItemRef = useRef(null)
    // content item registration callback; called from item
    const getItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref, portalDataRef] = itemElementData

        if (reportType == 'register') {

            itemElementsRef.current.set(index,shellref)

        } else if (reportType == 'unregister') {

            itemElementsRef.current.delete(index)

        }

    },[])

    const scrollToItem = useCallback((index) => {

        signalsRef.current.pauseCellObserver = true
        signalsRef.current.pauseScrollingEffects = true

        callingReferenceIndexDataRef.current = {index,spineoffset:0}

        setCradleState('reposition')

    }, [])

    const callbacksRef = useRef({
        getElementData:getItemElementData
    })

    // =============================================================================
    // ------------------------------[ RENDER... ]----------------------------------
    // =============================================================================

    const scrollTrackerArgs = useMemo(() => {
        return {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            indexOffset:scrollReferenceIndexDataRef.current.index,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
    },[viewportDimensions, scrollReferenceIndexDataRef.current, cradlePropsRef])

    let cradleContent = cradleContentRef.current

    return <>

        {(cradleStateRef.current == 'updatereposition' || cradleStateRef.current == 'repositioning')
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.indexOffset} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :null}
        <div 
            data-type = 'cradle_spine'
            style = {cradleSpineStyle} 
            ref = {spineCradleElementRef}
        >
            {true?<div style = {{zIndex:1, position:'absolute',width:'100%',height:'100%',boxShadow:'0 0 5px 3px red'}}></div>:null}
            <div 
            
                data-type = 'head'
                ref = {headCradleElementRef} 
                style = {cradleHeadStyle}
            
            >
            
                {(cradleStateRef.current != 'setup')?cradleContent.headView:null}
            
            </div>
            <div 
            
                data-type = 'tail'
                ref = {tailCradleElementRef} 
                style = {cradleTailStyle}
            
            >
            
                {(cradleStateRef.current != 'setup')?cradleContent.tailView:null}
            
            </div>
        </div>
        
    </>

} // Cradle


export default Cradle