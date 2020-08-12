// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:

    Make sure item shell triggers are only fired at the leading, not trailing, edge

    Inconsistency in viewportrows, sometimes Math.ceil, sometimes Math.floor

    change height to 0px from auto for spine in vertical
    
    update scrollforward logic to take into account rapid opposite scrolling. 
    Use differences in scrollTop?

    ==>> check getShift logic. !scrollforward should select next calculated index 
    to be above the fold if possible.

    review rotate spineReferenceIndex settings
    investigate cascading calls to out of scope cradle, in relation to itemshift

    QA defend against butterfly getting intersections from opposite scroll direction
        as the result of a short viewport

    implement sessionid scheme for cell content

    deal with spine being notified by bottom border rather than top

    spine location occasionally down by 10 = padding
    spineReferenceIndex is sometimes located (spineOffset) outside the viewport -- should never happen

*/

/*
    Description
    -----------
    The GridSroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
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

    Item containers:
        Client cell content is contained in ItemShell's, which are configured according to GridScroller's input parameters.
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

import ResizeObserverPolyfill from 'resize-observer-polyfill'

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

const ITEM_OBSERVER_THRESHOLD = 1

import { 
    setCradleGridStyles, 
    getUIContentList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    calcVisibleItems, 
    getScrollReferenceIndexData,
    getContentListRequirements,
    // getSpinePortalOffset,
    isolateRelevantIntersections,
    // normalizeCradleAnchors,
    allocateContentList,

} from './cradlefunctions'

import ScrollTracker from './scrolltracker'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

const Cradle = ({ 
        gap, 
        padding, 
        runwaylength,
        runwaycount, 
        listsize, 
        offset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        functions,
        styles,
    }) => {

    // functions and styles handled separately
    const cradlePropsRef = useRef(null) // access by closures
    cradlePropsRef.current = useMemo(() => {
        return { 
            gap, 
            padding, 
            runwaylength,
            runwaycount, 
            listsize, 
            offset, 
            orientation, 
            cellHeight, 
            cellWidth, 
            getItem, 
            placeholder, 
    }},[
        gap, 
        padding, 
        runwaylength,
        runwaycount, 
        listsize, 
        offset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
    ])

    // =============================================================================================
    // --------------------------------------[ INITIALIZATION ]-------------------------------------
    // =============================================================================================

    // -----------------------------------------------------------------------
    // -----------------------------------[ utilites ]------------------------

    const isMounted = useIsMounted()
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    const itemObserverRef = useRef(null) // IntersectionObserver
    const cradleIntersectionObserverRef = useRef(null)
    const cradleResizeObserverRef = useRef(null)

    // -----------------------------------------------------------------------
    // ---------------------------[ context data ]----------------------------

    const viewportData = useContext(ViewportContext)
    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const [cradleState, saveCradleState] = useState('setup')
    const cradlestateRef = useRef(null) // access by closures
    cradlestateRef.current = cradleState

    // console.log('cradleState', cradleState)
    // -----------------------------------------------------------------------
    // -------------------------[ control variables ]-----------------

    const pauseItemObserverRef = useRef(false)
    // const pauseCradleIntersectionObserverRef = useRef(false)
    const pauseCradleResizeObserverRef = useRef(false)
    const pauseScrollingEffectsRef = useRef(false)

    // to control appearance of repositioning mode
    const isTailCradleInViewRef = useRef(true)
    const isHeadCradleInViewRef = useRef(true)
    const isCradleInViewRef = useRef(false)

    // ------------------------------------------------------------------------
    // -----------------------[ initialization effects ]-----------------------

    //initialize host functions properties
    useEffect(()=>{

        if (functions?.hasOwnProperty('scrollToItem')) {
            // functions.scrollToItem = scrollToItem
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
        let viewportData = viewportDataRef.current
        viewportData.elementref.current.addEventListener('scroll',onScroll)

        return () => {

            viewportData.elementref.current && viewportData.elementref.current.removeEventListener('scroll',onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradlestateRef.current == 'setup') return
        if (viewportData.isResizing) {

            // enter resizing mode
            let scrolloffset
            if (cradlePropsRef.current.orientation == 'vertical') {
                scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
            } else {
                scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
            }

            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
            // console.log('setting callingReferenceIndexDataRef for resizing',{...callingReferenceIndexDataRef.current})

            pauseItemObserverRef.current = true
            // pauseCradleIntersectionObserverRef.current = true
            pauseScrollingEffectsRef.current = true
            saveCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportData.isResizing && (cradlestateRef.current == 'resizing')) {

            saveCradleState('resize')

        }

    },[viewportData.isResizing])

    // reload for changed parameters
    useEffect(()=>{

        if (cradlestateRef.current == 'setup') return

        let scrolloffset
        if (cradlePropsRef.current.orientation == 'vertical') {
            scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
        } else {
            scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
        }

        callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

        pauseItemObserverRef.current = true
        // pauseCradleIntersectionObserverRef.current = true
        pauseScrollingEffectsRef.current = true

        saveCradleState('reload')

    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    // trigger pivot on change in orientation
    useEffect(()=> {

        // console.log('calling pivot effect, orientaton, cradleState',orientation, cradlestateRef.current)
        if (cradlestateRef.current != 'setup') {

            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

            pauseItemObserverRef.current = true
            // pauseCradleIntersectionObserverRef.current = true
            pauseScrollingEffectsRef.current = true

            saveCradleState('pivot')

        }

        headModelContentRef.current = []
        tailModelContentRef.current = []

    },[orientation])

    // =======================================================================
    // -------------------------[ OPERATION ]---------------------------------
    // =======================================================================

    // -----------------------------------------------------------------------
    // ------------------------[ session data ]-------------------------------

    // ------------------ current location -- first head visible item -------------

    const scrollReferenceIndexDataRef = useRef({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:padding
    }) // access by closures

    const stableReferenceIndexDataRef = useRef(scrollReferenceIndexDataRef.current) // capture for state resetContent operations
    const callingReferenceIndexDataRef = useRef(scrollReferenceIndexDataRef.current) // anticipate reposition

    // -------------------------------[ cradle data ]-------------------------------------

    // cradle butterfly html components
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const spineCradleElementRef = useRef(null)

    // data model
    const modelContentRef = useRef(null)
    const headModelContentRef = useRef(null)
    const tailModelContentRef = useRef(null)

    // view model
    const headViewContentRef = useRef([])
    const tailViewContentRef = useRef([])

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

    const crosscountRef = useRef(crosscount) // for easy reference by observer
    crosscountRef.current = crosscount // available for observer closure

    const [cradlerowcount,viewportrowcount] = useMemo(()=> {

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
        let cradlerowcount = viewportrowcount + (runwaycount * 2)
        let itemcount = cradlerowcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            cradlerowcount = Math.ceil(itemcount/crosscount)
        }
        return [cradlerowcount, viewportrowcount]

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

    const cradlerowcountRef = useRef(null)
    cradlerowcountRef.current = cradlerowcount
    const viewportrowcountRef = useRef(null)
    viewportrowcountRef.current = viewportrowcount

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

        cradleResizeObserverRef.current.observe(headCradleElementRef.current)
        cradleResizeObserverRef.current.observe(tailCradleElementRef.current)

        return () => {

            cradleResizeObserverRef.current.disconnect()

        }

    },[])

    const cradleresizeobservercallback = useCallback((entries) => {

        if (pauseCradleResizeObserverRef.current) return

    },[])

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    useEffect(() => {

        let viewportData = viewportDataRef.current
        // IntersectionObserver
        cradleIntersectionObserverRef.current = new IntersectionObserver(

            cradleintersectionobservercallback,
            {root:viewportData.elementref.current, threshold:0}

        )

        cradleIntersectionObserverRef.current.observe(headCradleElementRef.current)
        cradleIntersectionObserverRef.current.observe(tailCradleElementRef.current)

        return () => {

            cradleIntersectionObserverRef.current.disconnect()

        }

    },[])

    const cradleintersectionobservercallback = useCallback((entries) => {

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.name == 'head') {
                isHeadCradleInViewRef.current = entry.isIntersecting
            } else {
                isTailCradleInViewRef.current = entry.isIntersecting
            }
        }
        isCradleInViewRef.current = (isHeadCradleInViewRef.current || isTailCradleInViewRef.current)

        if (!isCradleInViewRef.current) 

        {

            let cradleState = cradlestateRef.current        
            if (
                !viewportDataRef.current.isResizing &&
                !(cradleState == 'resize') &&
                !(cradleState == 'repositioning') && 
                !(cradleState == 'reposition') && 
                !(cradleState == 'pivot')
                ) 
            {

                let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
                let {top, right, bottom, left} = rect
                let width = right - left, height = bottom - top
                viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                pauseItemObserverRef.current = true
                // pauseCradleIntersectionObserverRef.current = true
                console.log('REPOSITIONING')
                headModelContentRef.current = []
                tailModelContentRef.current = []
                headViewContentRef.current = []
                tailViewContentRef.current = []
                saveCradleState('repositioning')

            }
        }

    },[])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runwaycount at both the leading
            and trailing edges, itemShells scroll into or out of the scope of the observer 
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through itemobservercallback() below) at the crossings of the itemshells 
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

        if (itemObserverRef.current) itemObserverRef.current.disconnect()
        itemObserverRef.current = new IntersectionObserver(

            itemobservercallback,
            {
                root:viewportDataRef.current.elementref.current, 
                threshold:ITEM_OBSERVER_THRESHOLD,
            } 

        )

        return () => {

            itemObserverRef.current.disconnect()

        }

    },[orientation])

    // the async callback from IntersectionObserver.
    const itemobservercallback = useCallback((entries)=>{

        let movedentries = []

        for (let entry of entries) {
            if (entry.target.dataset.moved) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.moved = 'moved'

            }
        }

        if (pauseItemObserverRef.current) {

            return

        }

        isMounted() && updateCradleContent(movedentries)

    },[])

    const previousScrollForwardRef = useRef(undefined)

    const updateCradleContent = (entries, source = 'notifications') => {

        let viewportData = viewportDataRef.current
        let viewportElement = viewportData.elementref.current
        let cradleProps = cradlePropsRef.current

        let viewportScrollpos
        if (cradleProps.orientation == 'vertical') {
            viewportScrollpos = viewportElement.scrollTop
        } else {
            viewportScrollpos = viewportElement.scrollLeft
        }
        if ( viewportScrollpos < 0) { // for Safari

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

        console.log('updating cradle content: source, entries.length, scrollforward, scrollPositions, viewportScrollpos', 
            source, entries.length, scrollforward, scrollPositions, viewportScrollpos)

        let spineElement = spineCradleElementRef.current
        let headElement = headCradleElementRef.current
        let tailElement = tailCradleElementRef.current
        let itemelements = itemElementsRef.current
        let modelcontentlist = modelContentRef.current
        let headcontentlist = headModelContentRef.current
        let tailcontentlist = tailModelContentRef.current

        let listsize = cradleProps.listsize
        let crosscount = crosscountRef.current

        let cradleReferenceIndex = modelcontentlist[0].props.index

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the spine
        let intersections = isolateRelevantIntersections({

            scrollforward,
            intersections:entries,
            headcontent:headcontentlist, 
            tailcontent:tailcontentlist,
            ITEM_OBSERVER_THRESHOLD,

        })

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        let [cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spineOffset] = calcContentShifts({

            cradleProps,
            spineElement,
            viewportElement,
            headElement,
            tailElement,
            intersections,
            scrollforward,
            crosscount,
            cradlecontentlist:modelcontentlist,
            headcontentlist,
            tailcontentlist,
            cradlerowcount:cradlerowcountRef.current,
            itemobserverthreshold:ITEM_OBSERVER_THRESHOLD,
            itemelements,

        })

        if (referenceitemshift == 0) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        let [headchangecount,tailchangecount] = calcHeadAndTailChanges({

            itemshiftcount:cradleitemshift,
            crosscount,
            headcontent:headModelContentRef.current,
            tailcontent:tailModelContentRef.current,
            scrollforward,
            cradleProps,
            cradleReferenceIndex,
            cradlerowcount:cradlerowcountRef.current,
            listsize,

        })

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList 

        if (headchangecount || tailchangecount) {

            localContentList = getUIContentList({

                localContentList:modelcontentlist,
                headindexcount:headchangecount,
                tailindexcount:tailchangecount,
                cradleReferenceIndex,
                cradleProps,
                observer: itemObserverRef.current,
                callbacks:callbacksRef.current,
                listsize, // TODO: redundant

            })
        } else {

            localContentList = modelcontentlist

        }

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spineReferenceIndex,
            }
        )

        modelContentRef.current = localContentList
        headViewContentRef.current = headModelContentRef.current = headcontent
        tailViewContentRef.current = tailModelContentRef.current = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        if (spineOffset !== undefined) {
            
            if (cradleProps.orientation == 'vertical') {

                scrollPositionDataRef.current = {property:'scrollTop',value:viewportElement.scrollTop}
                spineCradleElementRef.current.style.top = viewportElement.scrollTop + spineOffset + 'px'
                spineCradleElementRef.current.style.left = 'auto'
                headCradleElementRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                scrollPositionDataRef.current = {property:'scrollLeft',value:viewportElement.scrollLeft}
                spineCradleElementRef.current.style.left = viewportElement.scrollLeft + spineOffset + 'px'
                spineCradleElementRef.current.style.top = 'auto'
                headCradleElementRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        scrollReferenceIndexDataRef.current = {
            index:spineReferenceIndex,
            scrolloffset:spineOffset
        }

        saveCradleState('updatecontent')

    }

    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    // ========================================================================================
    
    // reset cradle, including allocation between head and tail parts of the cradle
    const setCradleContent = (cradleState, referenceIndexData) => { 

        let cradleProps = cradlePropsRef.current
        let { index: visibletargetindexoffset, 
            scrolloffset: visibletargetscrolloffset } = referenceIndexData

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        let cradlerowcount = cradlerowcountRef.current,
            crosscount = crosscountRef.current

        if (cradleState == 'reposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        let localContentList = [] // any duplicated items will be re-used by react

        let {cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset} = 
            getContentListRequirements({

                cellHeight, 
                cellWidth, 
                orientation, 
                runwaycount,
                cradlerowcount,
                gap,
                padding,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                crosscount,
                listsize,
                viewportElement:viewportDataRef.current.elementref.current
            })

        let childlist = getUIContentList({

            localContentList,
            headindexcount:0,
            tailindexcount:contentCount,
            cradleReferenceIndex,
            cradleProps:cradlePropsRef.current,
            observer: itemObserverRef.current,
            // crosscount,
            callbacks:callbacksRef.current,
            listsize,

        })

        let [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            spineReferenceIndex:referenceoffset,
    
        })

        if (headcontentlist.length == 0) {
            spineOffset = padding
        }

        modelContentRef.current = childlist
        headModelContentRef.current = headcontentlist
        tailModelContentRef.current = tailcontentlist

        scrollReferenceIndexDataRef.current = stableReferenceIndexDataRef.current = {

            index: referenceoffset,
            scrolloffset:spineOffset,

        }

        if (referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            referenceIndexCallbackRef.current(
                stableReferenceIndexDataRef.current.index, 'setCradleContent', cstate)

        }

        if (orientation == 'vertical') {

            scrollPositionDataRef.current = {property:'scrollTop',value:scrollblockoffset}
            spineCradleElementRef.current.style.top = (scrollblockoffset + spineOffset) + 'px'
            spineCradleElementRef.current.style.left = 'auto'
            headCradleElementRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            scrollPositionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}
            spineCradleElementRef.current.style.left = (scrollblockoffset + spineOffset) + 'px'
            spineCradleElementRef.current.style.top = 'auto'
            headCradleElementRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    const scrollTimeridRef = useRef(null)

    const scrollPositionsRef = useRef({current:0,previous:0})

    // callback for scrolling
    const onScroll = useCallback((e) => {

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
        scrollPositions.current = //scrollPositioncurrent
            (cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        clearTimeout(scrollTimeridRef.current)

        let cradleState = cradlestateRef.current

        if (!viewportDataRef.current.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    let itemindex = tailModelContentRef.current[0]?.props.index 
                    if (itemindex === undefined) {
                        console.log('ERROR: scroll encountered undefined tailcontent lead')
                    }
                    let scrolloffset
                    if (cradlePropsRef.current.orientation == 'vertical') {

                        scrolloffset = spineCradleElementRef.current.offsetTop - 
                            viewportDataRef.current.elementref.current.scrollTop
                            
                    } else {

                        scrolloffset = spineCradleElementRef.current.offsetLeft - 
                            viewportDataRef.current.elementref.current.scrollLeft
                            
                            
                    }
                    scrollReferenceIndexDataRef.current = {
                        index:itemindex,
                        scrolloffset,
                    }

                } else {

                    scrollReferenceIndexDataRef.current = getScrollReferenceIndexData({
                        viewportData:viewportDataRef.current,
                        cradleProps:cradlePropsRef.current,
                        crosscount:crosscountRef.current,
                    })
                }

                referenceIndexCallbackRef.current && 
                    referenceIndexCallbackRef.current(scrollReferenceIndexDataRef.current.index,'scrolling', cradleState)

            }

        }

        scrollTimeridRef.current = setTimeout(() => {

            let cradleState = cradlestateRef.current
            if (!viewportDataRef.current.isResizing) {
                let localrefdata = {...scrollReferenceIndexDataRef.current}

                stableReferenceIndexDataRef.current = localrefdata

            }
            switch (cradleState) {

                case 'repositioning': {

                    callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}

                    saveCradleState('reposition')

                    break
                }

                default: {
                    
                    updateCradleContent([], 'end of scroll') // for Safari to compensate for overscroll

                }

            }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    },[])

    // data for state processing
    const callingCradleState = useRef(cradlestateRef.current)
    const headlayoutDataRef = useRef(null)
    const scrollPositionDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportData = viewportDataRef.current
        switch (cradleState) {
            case 'reload':
                headModelContentRef.current = []
                tailModelContentRef.current = []
                headViewContentRef.current = []
                tailViewContentRef.current = []
                saveCradleState('setreload')
                break;
            case 'updatereposition':
                saveCradleState('repositioning')

            case 'repositioning':
                break;

            case 'setscrolloffset': {

                viewportData.elementref.current[scrollPositionDataRef.current.property] =
                    scrollPositionDataRef.current.value

                saveCradleState('content')

                break
            }
            case 'updatecontent': { // scroll

                saveCradleState('ready')
                break

            }
            case 'content': {
                headViewContentRef.current = headModelContentRef.current
                tailViewContentRef.current = tailModelContentRef.current
                saveCradleState('normalize')
                break
            }
        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> {

        let viewportData = viewportDataRef.current
        switch (cradleState) {
            case 'setup': 
            case 'resize':
            case 'pivot':
            case 'setreload':
            case 'reposition':

                callingCradleState.current = cradleState
                saveCradleState('settle')

                break

            case 'settle': {

                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current)

                saveCradleState('setscrolloffset')

                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails

                        pauseItemObserverRef.current  && (pauseItemObserverRef.current = false)
                        pauseScrollingEffectsRef.current && (pauseScrollingEffectsRef.current = false)

                    }

                    if (isCradleInViewRef.current) {
                        saveCradleState('ready')
                    } else {
                        saveCradleState('repositioning')
                    }

                })//,100)

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


        return calcVisibleItems({
            itemElementMap:itemElementsRef.current,
            viewportElement:viewportDataRef.current.elementref.current,
            headElement:headCradleElementRef.current, 
            // tailElement:cradlePropsRef.current.orientation,
            spineElement:spineCradleElementRef.current,
            orientation:cradlePropsRef.current.orientation,
            headlist:headViewContentRef.current,
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

        pauseItemObserverRef.current = true
        pauseScrollingEffectsRef.current = true

        let scrolloffset
        if (cradlePropsRef.current.orientation == 'vertical') {
            scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
        } else {
            scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
        }

        console.log('reload',callingReferenceIndexDataRef)
        callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
        saveCradleState('reload')

    },[])

    // content item registration callback; called from item
    const getItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            itemElementsRef.current.set(index,shellref)

        } else if (reportType == 'unregister') {

            itemElementsRef.current.delete(index)

        }

    },[])

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
            offset:scrollReferenceIndexDataRef.current.index,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
    },[viewportDimensions, scrollReferenceIndexDataRef.current, cradlePropsRef])

    return <>

        {(cradlestateRef.current == 'updatereposition' || cradlestateRef.current == 'repositioning')
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.offset} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :null}
        <div 
            style = {cradleSpineStyle} 
            ref = {spineCradleElementRef}
            data-name = 'spine'
        >
            {true?<div style = {{zIndex:1, position:'absolute',width:'100%',height:'100%',boxShadow:'0 0 5px 3px red'}}></div>:null}
            <div 
            
                data-name = 'head'
                ref = {headCradleElementRef} 
                style = {cradleHeadStyle}
            
            >
            
                {(cradlestateRef.current != 'setup')?headViewContentRef.current:null}
            
            </div>
            <div 
            
                data-name = 'tail'
                ref = {tailCradleElementRef} 
                style = {cradleTailStyle}
            
            >
            
                {(cradlestateRef.current != 'setup')?tailViewContentRef.current:null}
            
            </div>
        </div>
        
    </>

} // Cradle


export default Cradle