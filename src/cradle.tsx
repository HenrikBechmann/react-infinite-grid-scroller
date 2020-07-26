// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:
    review rotate referenceindex settings
    investigate cascading calls to out of scope cradle, in relation to itemshift

    QA defend against butterfly getting intersections from opposite scroll direction
        as the result of a short viewport

    minimize use of shift scroll offset

    reposition fails with back and forth

    implement sessionid scheme for cell content

    sometimes scrollforward calculate overflow amount triggers reposition as a side effect

    rapid scrolling immediately after load prevents cradlehidden behavuour

*/

/*
    Description
    -----------

    This module has one main design pattern: the butterfuly pattern (my name)

    the butterfly pattern:
        This pattern consists of two containers for items (the "wings"), joined by a 0-length div (the "spine"). 
        The wings are fixed to the spine through the bottom/right position style on one side, and top/left 
        on the other. Thus additions or deletions effect the distant ends of the wings from the spine on each end. 
        All three together comprise the "cradle" of items. After a change of content, the only compensating 
        adjustment required is the change of position of the spine in relation to the viewport.

*/

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import useIsMounted from 'react-is-mounted-hook'

import ResizeObserverPolyfill from 'resize-observer-polyfill'

import { detect } from 'detect-browser'

const browser = detect()

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

const ITEM_OBSERVER_THRESHOLD = .9

import { 
    setCradleGridStyles, 
    getUIContentList, 
    getNewReferenceindex,
    calcHeadAndTailChanges,
    calcItemshiftcount,
    calcVisibleItems, 
    getScrollReferenceIndexData,
    getContentListRequirements,
    getSpinePosRef,
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

    const [cradlestate, saveCradleState] = useState('setup')
    const cradlestateRef = useRef(null) // access by closures
    cradlestateRef.current = cradlestate

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
            // callingReferenceIndexDataRef.current = {
            //     index:parseInt(tailModelContentRef.current[0]?.props.index || 0),
            //     scrolloffset,
            // }

            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
            console.log('setting callingReferenceIndexDataRef for resizing',{...callingReferenceIndexDataRef.current})

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
    // TODO: treat like pivot effect below
    useEffect(()=>{

        if (cradlestateRef.current == 'setup') return

        let scrolloffset
        if (cradlePropsRef.current.orientation == 'vertical') {
            scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
        } else {
            scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
        }
        // callingReferenceIndexDataRef.current = {
        //     index:tailModelContentRef.current[0].props.index || 0,
        //     scrolloffset,
        // }
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

        // console.log('calling pivot effect, orientaton, cradlestate',orientation, cradlestateRef.current)
        if (cradlestateRef.current != 'setup') {

            // let scrolloffset
            // if (orientation == 'vertical') {
            //     scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
            // } else {
            //     scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
            // }
            // callingReferenceIndexDataRef.current = {
            //     index:tailModelContentRef.current[0].props.index || 0,
            //     scrolloffset,
            // }
            callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
            // console.log('pivot to orientation, callingReferenceIndexDataRef',orientation, callingReferenceIndexDataRef,
            //     '\nviewport scrollTop, spine offsetTop',
            //     viewportDataRef.current.elementref.current.scrollTop,spineCradleElementRef.current.offsetTop,
            //     '\nviewport scrollLeft, spine offsetLeft',
            //     viewportDataRef.current.elementref.current.scrollLeft,spineCradleElementRef.current.offsetLeft)

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

    const [scrollReferenceIndexData, saveScrollReferenceIndexData] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:padding
    })
    const scrollReferenceIndexDataRef = useRef(null) // access by closures
    scrollReferenceIndexDataRef.current = scrollReferenceIndexData
    const stableReferenceIndexDataRef = useRef(scrollReferenceIndexData) // capture for state resetContent operations
    const callingReferenceIndexDataRef = useRef(scrollReferenceIndexData) // anticipate reposition

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

    // viewportDimensions, crosscount, rowcount

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

        // console.log('setting cradle css',orientation)
        // let top, left, width
        // if (orientation == 'vertical') {

        //     // paddingx = 0
        //     // paddingy = padding
        //     top = padding + 'px'
        //     left = 'auto'
        //     width = 'auto'
        // } else {

        //     // paddingx = padding
        //     // paddingy = 0
        //     left = padding + 'px'
        //     top = 'auto'
        //     width = 0

        // }

        let styleobj:React.CSSProperties = {

            position: 'relative',
            // paddingTop:paddingx,
            // paddingLeft:paddingy,
            // top,
            // left,
            // width,

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

        // console.log('resetting styles', spinestyle)

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

        // cradleHeadStyle,
        // cradleTailStyle,
        // cradleSpineStyle

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
        
        // if (pauseCradleIntersectionObserverRef.current) {
        //     console.log('returning from cradleintersection callback owing to pause')
        //     return
        // }

        if (!isCradleInViewRef.current) 

        {

            // console.log('CRADLE OUT OF VIEW')
            let cradleState = cradlestateRef.current        
            if (
                // !isCradleInViewRef.current && 
                // !pauseCradleIntersectionObserverRef.current //&&
                // !pauseItemObserverRef.current && 
                !viewportDataRef.current.isResizing &&
                !(cradleState == 'resize') &&
                !(cradleState == 'repositioning') && 
                !(cradleState == 'reposition')
                ) 
            {

                let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
                let {top, right, bottom, left} = rect
                let width = right - left, height = bottom - top
                viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                pauseItemObserverRef.current = true
                // pauseCradleIntersectionObserverRef.current = true
                console.log('REPOSITIONING')
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

            // console.log('pause item observer', pauseItemObserverRef.current)
            return

        }

        isMounted() && updateCradleContent(movedentries)

    },[])

    const previousScrollForwardRef = useRef(undefined)

    // adjust scroll content:
    // 1.shift, 2.clip, and 3.add clip amount at other end
    const updateCradleContent = (entries) => {

        // console.log('updateCradleContent entries',entries)

        // ----------------------------[ 1. initialize ]----------------------------

        let scrollPositions = scrollPositionsRef.current

        let scrollforward
        if (scrollPositions.current == scrollPositions.previous) { // edge case 

            scrollforward = previousScrollForwardRef.current

        } else {

            scrollforward = scrollPositions.current > scrollPositions.previous
            previousScrollForwardRef.current = scrollforward

        }

        // console.log('==>> scrollforward, scrollPositions', scrollforward, scrollPositions )

        let viewportData = viewportDataRef.current
        let cradleProps = cradlePropsRef.current

        let viewportElement = viewportData.elementref.current
        let spineElement = spineCradleElementRef.current
        let headElement = headCradleElementRef.current
        let tailElement = tailCradleElementRef.current
        let itemelements = itemElementsRef.current
        let modelcontentlist = modelContentRef.current
        let headcontentlist = headModelContentRef.current
        let tailcontentlist = tailModelContentRef.current

        let listsize = cradleProps.listsize
        let crosscount = crosscountRef.current

        let indexoffset = modelcontentlist[0].props.index

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

        // let filteredindexes = []
        // for (let entry of intersections) {
        //     filteredindexes.push({index:entry.target.dataset.index})
        // }

        // console.log('filteredindexes',filteredindexes)

        // if (intersections.length == 0) {
        //     return
        // }

        // --------------------------------[ 3. Calculate item shift count ]-------------------------------

        let itemshiftcount = calcItemshiftcount({

            cradleProps,
            spineElement,
            viewportElement,
            headElement,
            tailElement,
            intersections,
            scrollforward,
            crosscount,
            cradlecontentlist:modelcontentlist,

        })

        // console.log('updateCradleContent: itemshiftcount, itemshiftrows',itemshiftcount, itemshiftcount / crosscount)

        if (itemshiftcount == 0) {  // nothing to do

            return

        }

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        let [headchangecount,tailchangecount] = calcHeadAndTailChanges({

            itemshiftcount,
            crosscount,
            headcontent:headModelContentRef.current,
            tailcontent:tailModelContentRef.current,
            scrollforward,
            cradleProps,
            indexoffset,
            cradlerowcount:cradlerowcountRef.current,
            listsize,

        })

        // console.log('headchangecount, tailchangecount',headchangecount, tailchangecount)

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList 

        if (headchangecount || tailchangecount) {

            localContentList = getUIContentList({

                localContentList:modelcontentlist,
                headindexcount:headchangecount,
                tailindexcount:tailchangecount,
                indexoffset,
                cradleProps,
                observer: itemObserverRef.current,
                // crosscount,
                callbacks:callbacksRef.current,
                listsize,

            })
        } else {

            localContentList = modelcontentlist

        }

        // -------------------[ 6. calculate new referenceindex ]---------------------

        let [referenceindex, referenceitemshift, previousreferenceindex] = getNewReferenceindex({
            itemshiftcount,
            crosscount,
            listsize,
            scrollforward,
            // localcontentlist:localContentList,
            // headcontentlist,
            tailcontentlist,
            // itemelements,
            // intersections,
        })

        // console.log('referenceindex, referenceitemshift, previousreferenceindex',
        //     referenceindex, referenceitemshift, previousreferenceindex)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                // runwaycount:cradleProps.runwaycount,
                // crosscount,
                referenceindex,
            }
        )

        modelContentRef.current = localContentList
        headViewContentRef.current = headModelContentRef.current = headcontent
        tailViewContentRef.current = tailModelContentRef.current = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        // place the spine in the scrollblock
        let spineposref = getSpinePosRef(
            {
                cradleProps,
                crosscount,
                scrollforward,
                headcontent,
                // tailcontent,
                itemelements,
                referenceindex,
                previousreferenceindex,
                referenceshift:referenceitemshift,
                viewportElement,
                spineElement,
                // headElement,
            }
        )

        // console.log('update content: spineposref, referenceindex, itemshiftcount',spineposref, referenceindex, itemshiftcount)

        if (spineposref !== undefined) {
            
            // console.log('viewportElement.scrollTop BEFORE', viewportElement.scrollTop)

            if (cradleProps.orientation == 'vertical') {

                scrollPositionDataRef.current = {property:'scrollTop',value:viewportElement.scrollTop}
                spineCradleElementRef.current.style.top = viewportElement.scrollTop + spineposref + 'px'
                spineCradleElementRef.current.style.left = 'auto'
                headCradleElementRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                scrollPositionDataRef.current = {property:'scrollLeft',value:viewportElement.scrollLeft}
                spineCradleElementRef.current.style.left = viewportElement.scrollLeft + spineposref + 'px'
                spineCradleElementRef.current.style.top = 'auto'
                headCradleElementRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

            // console.log('viewportElement.scrollTop AFTER', viewportElement.scrollTop)

        }

        // let scrolloffset
        // if (cradlePropsRef.current.orientation == 'vertical') {
        //     scrolloffset = spineposref - 
        //         viewportDataRef.current.elementref.current.scrollTop
                
                
        // } else {

        //     scrolloffset = spineoffsetref - 
        //         viewportDataRef.current.elementref.current.scrollLeft
                
        // }

        // console.log('scrolloffset, spineoffsetref, crosscount', scrolloffset, spineoffsetref, crosscount)

        scrollReferenceIndexDataRef.current = {
            index:referenceindex,
            spineoffset:spineposref
        }

        // console.log('viewportElement.scrollTop CALLING updatescroll updateCradleContent', viewportElement.scrollTop)

        saveCradleState('updatescroll')

        // console.log('viewportElement.scrollTop END OF updateCradleContent', viewportElement.scrollTop)

    }

    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    // ========================================================================================
    
    // reset cradle, including allocation between head and tail parts of the cradle
    const setCradleContent = (cradleState, referenceIndexData) => { //

        // console.log('entering setCradleContent', cradleState, referenceIndexData)

        let cradleProps = cradlePropsRef.current
        let { index: visibletargetindexoffset, 
            scrolloffset: visibletargetscrolloffset } = referenceIndexData

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        let cradlerowcount = cradlerowcountRef.current,
            crosscount = crosscountRef.current

        // console.log('setCradleContent cradleState, index', cradleState, visibletargetindexoffset)

        if (cradleState == 'reposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap
            console.log('for REPOSITION: visibletargetindexoffset',
                visibletargetindexoffset)
        }

        let localContentList = [] // any duplicated items will be re-used by react

        let {indexoffset, referenceoffset, contentCount, scrollblockoffset, spineoffset} = 
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

        // console.log('from getContentListRequirements: indexoffset, referenceoffset, headspan, contentCount, scrollblockoffset, spineoffset',
        //     indexoffset, referenceoffset, (referenceoffset - indexoffset)/crosscount,contentCount, scrollblockoffset, spineoffset)


        let childlist = getUIContentList({

            localContentList,
            headindexcount:0,
            tailindexcount:contentCount,
            indexoffset,
            cradleProps:cradlePropsRef.current,
            observer: itemObserverRef.current,
            // crosscount,
            callbacks:callbacksRef.current,
            listsize,

        })

        let [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            // runwaycount:cradlePropsRef.current.runwaycount,
            // crosscount,
            referenceindex:referenceoffset,
    
        })

        if (headcontentlist.length == 0) {
            spineoffset = padding
        }

        modelContentRef.current = childlist
        headModelContentRef.current = headcontentlist
        tailModelContentRef.current = tailcontentlist

        scrollReferenceIndexDataRef.current = stableReferenceIndexDataRef.current = {

            index: referenceoffset,
            scrolloffset:spineoffset,

        }
        // console.log('setCradleContent stableReferenceIndexDataRef.current', stableReferenceIndexDataRef.current)
        if (referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            referenceIndexCallbackRef.current(
                stableReferenceIndexDataRef.current.index, 'setCradleContent', cstate)

        }

        if (orientation == 'vertical') {

            scrollPositionDataRef.current = {property:'scrollTop',value:scrollblockoffset}
            spineCradleElementRef.current.style.top = (scrollblockoffset + spineoffset) + 'px'
            spineCradleElementRef.current.style.left = 'auto'
            headCradleElementRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            scrollPositionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}
            spineCradleElementRef.current.style.left = (scrollblockoffset + spineoffset) + 'px'
            spineCradleElementRef.current.style.top = 'auto'
            headCradleElementRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }/*,[
        getItem,
        listsize,
        placeholder,
        cellHeight,
        cellWidth,
        orientation,
        viewportheight,
        viewportwidth,
        runwaylength,
        runwaycount,
        gap,
        padding,
        crosscount,
        cradlerowcount,
      ]
    )*/

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    const scrollTimeridRef = useRef(null)

    //TODO: reset scrollpositions with orientation and reset change
    const scrollPositionsRef = useRef({current:0,previous:0})

    // callback for scroll
    const onScroll = useCallback(() => {

        let viewportElement = viewportDataRef.current.elementref.current
        let scrollPositions = scrollPositionsRef.current
        scrollPositions.previous = scrollPositions.current
        scrollPositions.current = 
            cradlePropsRef.current.orientation == 'vertical'
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        clearTimeout(scrollTimeridRef.current)

        // if (pauseScrollingEffectsRef.current) {

        //     return

        // }

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
                    // console.log('scrolling referenceindex for READY',{...scrollReferenceIndexDataRef.current})
                } else {

                    scrollReferenceIndexDataRef.current = getScrollReferenceIndexData({
                        viewportData:viewportDataRef.current,
                        cradleProps:cradlePropsRef.current,
                        crosscount:crosscountRef.current,
                    })

                    // console.log('scrolling referenceindex for REPOSITIONING',{...scrollReferenceIndexDataRef.current})
                }

                referenceIndexCallbackRef.current && 
                    referenceIndexCallbackRef.current(scrollReferenceIndexDataRef.current.index,'scrolling', cradleState)

                saveScrollReferenceIndexData(scrollReferenceIndexDataRef.current)

            }

        }

        // if (!isCradleInViewRef.current) {

        //     // console.log('CRADLE OUT OF VIEW')
        //     let cradleState = cradlestateRef.current        
        //     if (
        //         !isCradleInViewRef.current && 
        //         !pauseItemObserverRef.current && 
        //         !viewportDataRef.current.isResizing &&
        //         !(cradleState == 'resize') &&
        //         !(cradleState == 'repositioning') && 
        //         !(cradleState == 'reposition')) {

        //         let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
        //         let {top, right, bottom, left} = rect
        //         let width = right - left, height = bottom - top
        //         viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
        //         pauseItemObserverRef.current = true
        //         pauseCradleIntersectionObserverRef.current = true
        //         console.log('REPOSITIONING')
        //         saveCradleState('repositioning')

        //     }
        // }

        // if ( 
        //     !isCradleInViewRef.current && 
        //     !pauseItemObserverRef.current && 
        //     !viewportDataRef.current.isResizing &&
        //     !(cradleState == 'resize') &&
        //     !(cradleState == 'repositioning') && 
        //     !(cradleState == 'reposition')) {

        //     let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
        //     let {top, right, bottom, left} = rect
        //     let width = right - left, height = bottom - top
        //     viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
        //     console.log('REPOSITIONING')
        //     cradlestateRef.current = 'repositioning'
        //     pauseItemObserverRef.current = true
        //     pauseCradleIntersectionObserverRef.current = true
        //     // stableReferenceIndexDataRef.current = scrollReferenceIndexDataRef.current
        //     saveCradleState('repositioning')

        // }

        scrollTimeridRef.current = setTimeout(() => {

            // isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if (!viewportDataRef.current.isResizing) {
                let localrefdata = {...scrollReferenceIndexDataRef.current}
                // console.log('saving end of scroll to stableReferenceIndexDataRef', localrefdata)
                stableReferenceIndexDataRef.current = localrefdata
                saveScrollReferenceIndexData(localrefdata) // trigger re-run to capture end of scroll session values

            }
            switch (cradleState) {

                case 'repositioning': {

                    callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
                    pauseScrollingEffectsRef.current = true

                    saveCradleState('reposition')

                    break
                    
                } 

            }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        // saveCradleState('updatescroll')

    },[])

    // data for state processing
    const callingCradleState = useRef(cradlestateRef.current)
    const headlayoutDataRef = useRef(null)
    const scrollPositionDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportData = viewportDataRef.current
        switch (cradlestate) {
            case 'reload':
                headModelContentRef.current = []
                tailModelContentRef.current = []
                headViewContentRef.current = []
                tailViewContentRef.current = []
                saveCradleState('setreload')
                break;

            case 'repositioning':
                headModelContentRef.current = []
                tailModelContentRef.current = []
                headViewContentRef.current = []
                tailViewContentRef.current = []
                break;

            case 'scrollposition': {

                // console.log('within SCROLLPOSITION',scrollPositionDataRef.current)
                viewportData.elementref.current[scrollPositionDataRef.current.property] =
                    scrollPositionDataRef.current.value

                saveCradleState('content')

                break
            }
            case 'updatescroll': { // scroll

                // viewportData.elementref.current[scrollPositionDataRef.current.property] =
                //     scrollPositionDataRef.current.value

                // console.log('WITHIN updatescroll',viewportData.elementref.current.scrollTop, scrollPositionDataRef.current)

                saveCradleState('ready')
                break

            }
            case 'content': {
                headViewContentRef.current = headModelContentRef.current // contentDataRef.current
                tailViewContentRef.current = tailModelContentRef.current
                saveCradleState('normalize')
                break
            }
        }

    },[cradlestate])

    // standard processing stages
    useEffect(()=> {

        let viewportData = viewportDataRef.current
        switch (cradlestate) {
            case 'setup': 
            case 'resize':
            case 'pivot':
            case 'setreload':
            case 'reposition':

                callingCradleState.current = cradlestate
                saveCradleState('settle')

                break

            case 'settle': {

                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current)

                saveCradleState('scrollposition')

                // if (pauseCradleIntersectionObserverRef.current)  {

                //     pauseCradleIntersectionObserverRef.current = false
                    
                // }

                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails

                        // viewportData.elementref.current[scrollPositionDataRef.current.property] =
                        //     scrollPositionDataRef.current.value

                        pauseItemObserverRef.current  && (pauseItemObserverRef.current = false)
                        pauseScrollingEffectsRef.current && (pauseScrollingEffectsRef.current = false)
                        // console.log('normalized!')

                    }

                },100)

                saveCradleState('ready')

                break 

            }          

            case 'ready':
                break

        }

    },[cradlestate])

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
        // pauseCradleIntersectionObserverRef.current = true
        pauseScrollingEffectsRef.current = true
        let scrolloffset
        if (cradlePropsRef.current.orientation == 'vertical') {
            scrolloffset = spineCradleElementRef.current.offsetTop - viewportDataRef.current.elementref.current.scrollTop
        } else {
            scrolloffset = spineCradleElementRef.current.offsetLeft - viewportDataRef.current.elementref.current.scrollLeft
        }
        // callingReferenceIndexDataRef.current = {
        //     index:tailModelContentRef.current[0].props.index || 0,
        //     scrolloffset,
        // }

        console.log('reload',callingReferenceIndexDataRef)
        callingReferenceIndexDataRef.current = {...stableReferenceIndexDataRef.current}
        saveCradleState('reload')

    },[])

    const scrollToItem = useCallback((index) => { // , alignment = 'start') => {

        let referenceindex = index

        pauseItemObserverRef.current = true
        // pauseCradleIntersectionObserverRef.current = true
        pauseScrollingEffectsRef.current = true

        let crosscount = crosscountRef.current
        let diff = referenceindex % crosscount
        referenceindex -= diff

        callingReferenceIndexDataRef.current = {index:referenceindex, scrolloffset:0}
        saveCradleState('reposition')

    },[])

    // content item registration callback; called from item
    const getItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            itemElementsRef.current.set(index,shellref)

        } else if (reportType == 'unregister') {

            // console.log('UNREGISTERING',index)

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

    // console.log('viewport scrollTop before render',viewportDataRef.current.elementref.current.scrollTop)

    return <>

        {(cradlestateRef.current == 'repositioning')
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