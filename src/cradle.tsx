// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:
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

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

import { 
    setCradleGridStyles, 
    getUIContentList, 
    calcVisibleItems, 
    getReferenceIndexData,
    getContentListRequirements,
    getSpinePosRef,
    trimRunwaysFromIntersections,
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

    console.log('running cradle with state',cradlestate)

    // -----------------------------------------------------------------------
    // -------------------------[ control variables ]-----------------

    const pauseItemObserverRef = useRef(false)
    const pauseCradleIntersectionObserverRef = useRef(false)
    const pauseCradleResizeObserverRef = useRef(false)
    const pauseScrollingEffectsRef = useRef(false)

    // to control appearance of repositioning mode
    const isTailCradleInViewRef = useRef(true)
    const isHeadCradleInViewRef = useRef(true)
    const isCradleInViewRef = useRef(true)

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

        if (viewportData.isResizing) {

            // enter resizing mode
            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

            pauseItemObserverRef.current = true
            pauseCradleIntersectionObserverRef.current = true
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

        callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

        pauseItemObserverRef.current = true
        pauseCradleIntersectionObserverRef.current = true
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

        headModelContentRef.current = []
        tailModelContentRef.current = []

        if (cradlestateRef.current != 'setup') {

            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

            pauseItemObserverRef.current = true
            pauseCradleIntersectionObserverRef.current = true
            pauseScrollingEffectsRef.current = true

            saveCradleState('pivot')

        }

    },[
        orientation,
    ])

    // =======================================================================
    // -------------------------[ OPERATION ]---------------------------------
    // =======================================================================

    // -----------------------------------------------------------------------
    // ------------------------[ session data ]-------------------------------

    // ------------------ current location -- first head visible item -------------

    const [immediateReferenceIndexData, saveImmediateReferenceIndexData] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:0
    })
    const immediateReferenceIndexDataRef = useRef(null) // access by closures
    immediateReferenceIndexDataRef.current = immediateReferenceIndexData
    const masterReferenceIndexDataRef = useRef(immediateReferenceIndexData) // capture for state resetContent operations
    const callingReferenceIndexDataRef = useRef(immediateReferenceIndexData) // anticipate reposition

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
            bottom = gap + 'px'
            left = 0
            right = 0
            top = 'auto'
        } else {
            bottom = 0
            left = 'auto'
            right = gap + 'px'
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
            right = 'right'
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

    let cradleSpineStyle = useMemo(() => {

        let paddingx, paddingy, top, left
        if (orientation == 'vertical') {

            paddingx = 0
            paddingy = padding
            top = padding + 'px',
            left = 'auto'

        } else {

            paddingx = padding
            paddingy = 0
            left = padding + 'px'
            top = 'auto'

        }

        return {

            position: 'relative',
            top,
            left,
            // transform:`translate(${paddingx}px,${paddingy}px)`

        } as React.CSSProperties

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

        let top, left
        if (orientation == 'vertical') {
            top = padding + 'px'
            left = 'auto'
        } else {
            top = 'auto'
            left = 'padding' + 'px'
        }

        let spinestyle = {
            position: 'relative',
            top,
            left,
            // transform:`translate(0px,${padding}px)`
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

        cradleHeadStyle,
        cradleTailStyle,
        cradleSpineStyle

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

        // console.log('cradle resize entries',entries)

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

        if (pauseCradleIntersectionObserverRef.current) return

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.name == 'head') {
                isHeadCradleInViewRef.current = entry.isIntersecting
            } else {
                isTailCradleInViewRef.current = entry.isIntersecting
            }
        }

        isCradleInViewRef.current = (isHeadCradleInViewRef.current || isTailCradleInViewRef.current)

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

    useEffect(() => {

        itemObserverRef.current = new IntersectionObserver(

            itemobservercallback,
            {
                root:viewportDataRef.current.elementref.current, 
                threshold:.9
            } 

        )

        return () => {

            itemObserverRef.current.disconnect()

        }
    },[orientation])

    // the async callback from IntersectionObserver.
    const itemobservercallback = useCallback((entries)=>{

        if (pauseItemObserverRef.current) return

        if (cradlestateRef.current == 'ready') {

            let orientation = cradlePropsRef.current.orientation

            let spinesideintersections = entries.filter(entry => {

                if (orientation == 'vertical') {

                   return (( entry.rootBounds.y - entry.boundingClientRect.y ) > 0)

                } else {

                    return (( entry.rootBounds.x - entry.boundingClientRect.x ) > 0)

                }
            })

            isMounted() && adjustcradleentries(spinesideintersections)

        }

    },[])

    // TODO: investigate case where both forward and backward scroll
    // adjust scroll content:
    // 1.shift, 2.clip, and 3.add clip amount at other end
    const adjustcradleentries = useCallback((spinesideintersections)=>{

        if (spinesideintersections.length == 0) return

        let viewportData = viewportDataRef.current
        let localintersections = [...spinesideintersections]
        let contentlistcopy = [...modelContentRef.current]
        let cradleProps = cradlePropsRef.current

        let listsize = cradleProps.listsize

        let headCradleElement = headCradleElementRef.current
        let tailCradleElement = tailCradleElementRef.current
        let spineCradleElement = spineCradleElementRef.current
        let scrollElement = spineCradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let headcontentlist = headModelContentRef.current
        let tailcontentlist = tailModelContentRef.current

        let scrollforward

        localintersections = trimRunwaysFromIntersections({

            intersections:localintersections,
            headcontent:headcontentlist, 
            tailcontent:tailcontentlist,

        })

        if (localintersections.length == 0) return

        // -- isolate forward and backward lists (happens with rapid scrolling changes)
        //  then set scrollforward
        let forwardcount = 0, backwardcount = 0
        for (let intersectrecordindex = 0; intersectrecordindex < localintersections.length; intersectrecordindex++ ) {
            let sampleEntry = localintersections[intersectrecordindex]
            if (orientation == 'vertical') {

                if (!sampleEntry.isIntersecting) {
                    forwardcount++
                } else {
                    backwardcount++
                }
            
            } 
        }
        scrollforward = (forwardcount > backwardcount)
        let shiftitemcount = forwardcount - backwardcount
        let referencerowshift = Math.abs(Math.ceil(shiftitemcount/crosscountRef.current))
        let referenceshift

        let referenceindex
        if (scrollforward) {
            referenceshift = referencerowshift * crosscountRef.current
            referenceindex = tailcontentlist[referenceshift]?.props.index || 0 // first time
        } else {
            referenceshift = referencerowshift * crosscountRef.current
            // let headcontentindex = (headcontentlist.length) - referenceshift
            // if ((headcontentindex) > (headcontentlist.length + 1)) {
            //     referenceindex = tailcontentlist[0]?.props.index || 0
            // } else {
                referenceindex = headcontentlist[(headcontentlist.length - referenceshift)]?.props.index || 0 // first time
            // }
            // console.log('calculated scrollbackward referencerowshift, referenceshift, headcontentindex, referenceindex, headcontentlist',
            //     referencerowshift, referenceshift, headcontentindex, referenceindex, [...headcontentlist])
        }

        if (referenceindex > (listsize -1)) {
            referenceindex = listsize -1
        }
        if (referenceindex < 0) {
            referenceindex = 0
        }

        // console.log('forwardcount, backwardcount, shiftitemcount, referencerowshift, referenceshift, referenceindex,localintersections',
        //     forwardcount, backwardcount, shiftitemcount, referencerowshift, referenceshift, referenceindex, localintersections)

        if (shiftitemcount == 0) {

            return

        }

        shiftitemcount = Math.abs(shiftitemcount) 
        let shiftrowcount = Math.ceil(shiftitemcount/crosscountRef.current)
        // console.log('OPENING shiftrowcount, shiftitemcount',shiftrowcount, shiftitemcount)

        // set pendingcontentoffset
        let indexoffset = contentlistcopy[0].props.index
        let pendingcontentoffset
        let addcontentcount = 0

        // next, verify number of rows to delete
        let headindexchangecount, currentheadrowcount, viewportrowcount, tailindexchangecount, tailrowcount

        currentheadrowcount = Math.ceil(headModelContentRef.current.length/crosscountRef.current)

        let cliprowcount = 0, clipitemcount = 0

        if (scrollforward) { // delete from head; add to tail; head is direction of stroll

            if ((currentheadrowcount + shiftrowcount) > (cradleProps.runwaycount)) {
                let rowdiff = (currentheadrowcount + shiftrowcount) - (cradleProps.runwaycount)
                cliprowcount = rowdiff
                clipitemcount = (cliprowcount * crosscountRef.current)
            }

            addcontentcount = clipitemcount

            pendingcontentoffset = indexoffset + clipitemcount

            let proposedtailindex = pendingcontentoffset + contentlistcopy.length - 1

            if ((proposedtailindex) > (listsize -1) ) {

                let diffitemcount = (proposedtailindex - (listsize -1)) // items outside range
                addcontentcount -= diffitemcount // adjust the addcontent accordingly
                
                let diffrows = Math.floor(diffitemcount/crosscountRef.current) // number of full rows to leave in place
                let diffrowitems = (diffrows * crosscountRef.current)  // derived number of items to leave in place

                clipitemcount -= diffrowitems // apply adjustment to netshift
                // pendingcontentoffset -= diffrowitems // apply adjustment to new offset for add

                if (addcontentcount <=0) { // nothing to do

                    clipitemcount = addcontentcount = 0

                }
            }

            headindexchangecount = -clipitemcount
            tailindexchangecount = addcontentcount

        } else {

            // debugger

            if ((currentheadrowcount - shiftrowcount) < (cradleProps.runwaycount)) {
                addcontentcount = (shiftrowcount * crosscountRef.current)
                // console.log('scrollback adjust for RUNWAY UNDERFLOW')
                let rowdiff = (cradleProps.runwaycount) - (currentheadrowcount - shiftrowcount)
                cliprowcount = rowdiff
                let tailrowitemcount = (listsize % crosscountRef.current)
                if (tailrowcount) {
                    clipitemcount = tailrowitemcount
                    if (cliprowcount > 1) {
                        clipitemcount += ((cliprowcount -1) * crosscountRef.current)
                    }
                } else {
                    clipitemcount = (cliprowcount * crosscountRef.current)
                }
            }

            pendingcontentoffset = indexoffset // add to tail (opposite end of scroll direction), offset will remain the same

            let proposedindexoffset = pendingcontentoffset - clipitemcount

            if (proposedindexoffset < 0) {

                // console.log('scrollback adjust for TOP UNDERFLOW')

                let diffitemcount = -proposedindexoffset
                let diffrows = Math.floor(diffitemcount/crosscountRef.current) // number of full rows to leave in place
                let diffrowitems = (diffrows * crosscountRef.current)

                addcontentcount -= diffitemcount
                clipitemcount -= diffrowitems

                // console.log('addcontentcount, clipitemcount, diffitemcount, diffrowitems',
                //     addcontentcount, clipitemcount, diffitemcount, diffrowitems)
                if (addcontentcount <= 0) {

                    clipitemcount = addcontentcount = 0
                    
                }
            }

            headindexchangecount = addcontentcount
            tailindexchangecount = -clipitemcount

            // console.log('SCROLLBACK scrollforward,referenceindex,headindexchangecount, tailindexchangecount',
            //     scrollforward,referenceindex,headindexchangecount, tailindexchangecount)

        }

        // console.log('getUIContentList headindexchangecount, tailindexchangecount, indexoffset',
        //     headindexchangecount, tailindexchangecount, indexoffset)
        let localContentList 
        if (headindexchangecount || tailindexchangecount) {
            // console.log('getUIContentList')
            localContentList = getUIContentList({

                localContentList:contentlistcopy,
                headindexcount:headindexchangecount,
                tailindexcount:tailindexchangecount,
                indexoffset,//,: pendingcontentoffset,

                orientation:cradleProps.orientation,
                cellHeight:cradleProps.cellHeight,
                cellWidth:cradleProps.cellWidth,
                observer: itemObserverRef.current,
                crosscount:crosscountRef.current,
                callbacks:callbacksRef.current,
                getItem:cradleProps.getItem,
                listsize,
                placeholder:cradleProps.placeholder,

            })
        } else {

            localContentList = contentlistcopy

        }

        // headModelContentRef.current = localContentList
        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                runwaycount:cradleProps.runwaycount,
                crosscount:crosscountRef.current,
                referenceindex,
            }
        )

        // console.log('SPLIT headcontent count, tailcontent count, referenceindex, headcontent, tailcontent',
        //     headcontent.length, tailcontent.length, referenceindex, headcontent, tailcontent)

        modelContentRef.current = localContentList
        headViewContentRef.current = headModelContentRef.current = headcontent
        tailViewContentRef.current = tailModelContentRef.current = tailcontent

        // console.log('viewport scrolltop BEFORE GETSPINEPOSREF', scrolltop, viewportElement.scrollTop)

        let spineposref = getSpinePosRef(
            {
                scrollforward,
                itemelements:itemElementsRef.current,
                orientation:cradleProps.orientation,
                spineElement:spineCradleElementRef.current,
                referenceindex,
                crosscount:crosscountRef.current,
                gap:cradleProps.gap
            }
        )

        console.log('spineposref',spineposref)

        // console.log('spineposref,headcontent, tailcontent',spineposref,headcontent, tailcontent)

        if (spineposref !== undefined) {
            if (cradleProps.orientation == 'vertical') {
                // spineCradleElementRef.current.style.transform = `translate(0px,${spineposref}px)`
                spineCradleElementRef.current.style.top = spineposref + 'px'
                spineCradleElementRef.current.style.left = 'auto'
            } else {
                // spineCradleElementRef.current.style.transform = `translate(${spineposref}px,0px)`
                spineCradleElementRef.current.style.left = spineposref + 'px'
                spineCradleElementRef.current.style.top = 'auto'
            }
        }

        // console.log('viewport scrolltop BEFORE CALLING updatescroll', scrolltop, viewportElement.scrollTop)

        saveCradleState('updatescroll')

    },[])

    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    // ========================================================================================
    
    // reset cradle, including allocation between head and tail parts of the cradle
    const setCradleContent = useCallback((cradleState, referenceIndexData) => {

        let { index: visibletargetindexoffset, 
            scrolloffset: visibletargetscrolloffset } = referenceIndexData

        if (cradleState == 'reposition') visibletargetscrolloffset = 0

        let localContentList = [] // any duplicated items will be re-used by react

        let {indexoffset, referenceoffset, contentCount, scrollblockoffset, cradleoffset} = 
            getContentListRequirements({
                cellHeight, 
                cellWidth, 
                orientation, 
                runwaycount,
                rowcount:cradlerowcount,
                gap,
                visibletargetindexoffset,
                targetScrollOffset:visibletargetscrolloffset,
                crosscount,
                listsize,
            })

        immediateReferenceIndexDataRef.current = {
            index:referenceoffset,
            scrolloffset:visibletargetscrolloffset,
        }

        if (referenceIndexCallbackRef.current) {
            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            referenceIndexCallbackRef.current(
            immediateReferenceIndexDataRef.current.index, 'setCradleContent', cstate)

        }

        saveImmediateReferenceIndexData(immediateReferenceIndexDataRef.current) // consistent with onScroll

        let childlist = getUIContentList({
            indexoffset, 
            headindexcount:0, 
            tailindexcount:contentCount, 
            orientation, 
            cellHeight, 
            cellWidth, 
            localContentList,
            observer:itemObserverRef.current,
            crosscount,
            callbacks:callbacksRef.current,
            getItem,
            listsize,
            placeholder,
        })

        let [headcontentlist, tailcontentlist] = allocateContentList(
            {
                contentlist:childlist,
                runwaycount:cradlePropsRef.current.runwaycount,
                crosscount,
                referenceindex:0,
            }
        )

        modelContentRef.current = childlist
        headModelContentRef.current = headcontentlist
        tailModelContentRef.current = tailcontentlist

        if (orientation == 'vertical') {

            scrollPositionDataRef.current = {property:'scrollTop',value:scrollblockoffset}

        } else { // orientation = 'horizontal'

            scrollPositionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}

        }

    },[
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
    )

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    const scrollTimeridRef = useRef(null)

    // callback for scroll
    const onScroll = useCallback(() => {

        // console.log('onScroll scrollTop',viewportDataRef.current.elementref.current.scrollTop)

        clearTimeout(scrollTimeridRef.current)

        if (pauseScrollingEffectsRef.current) return

        let cradleState = cradlestateRef.current

        if (!viewportDataRef.current.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                immediateReferenceIndexDataRef.current = getReferenceIndexData({
                    viewportData:viewportDataRef.current,
                    cradlePropsRef,
                    crosscountRef,
                })
                referenceIndexCallbackRef.current && 
                    referenceIndexCallbackRef.current(immediateReferenceIndexDataRef.current.index,'scrolling', cradleState)

                saveImmediateReferenceIndexData(immediateReferenceIndexDataRef.current)

            }

        }

        if (
            !isCradleInViewRef.current && 
            !pauseItemObserverRef.current && 
            !viewportDataRef.current.isResizing &&
            !(cradleState == 'resize') &&
            !(cradleState == 'repositioning') && 
            !(cradleState == 'reposition')) {

            let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
            let {top, right, bottom, left} = rect
            let width = right - left, height = bottom - top
            viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

            saveCradleState('repositioning')

        }

        scrollTimeridRef.current = setTimeout(() => {

            // isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if (!viewportDataRef.current.isResizing) {

                // (cradleState != 'repositioning') && 
                //     normalizeCradleAnchors(headCradleElementRef.current, cradlePropsRef.current.orientation)
                let localrefdata = {...immediateReferenceIndexDataRef.current}
                saveImmediateReferenceIndexData(localrefdata) // trigger re-run to capture end of scroll session values
                masterReferenceIndexDataRef.current = localrefdata

            }
            switch (cradleState) {

                case 'repositioning': {

                    callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

                    pauseItemObserverRef.current = true

                    saveCradleState('reposition')

                    break
                    
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
        switch (cradlestate) {
            case 'reload':
                headModelContentRef.current = []
                tailModelContentRef.current = []
                saveCradleState('setreload')
                break;
            case 'scrollposition': {

                viewportData.elementref.current[scrollPositionDataRef.current.property] =
                    scrollPositionDataRef.current.value

                saveCradleState('content')

                break
            }
            case 'updatescroll': { // scroll

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

                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails

                        viewportData.elementref.current[scrollPositionDataRef.current.property] =
                            scrollPositionDataRef.current.value

                        // pick up position from setContent
                        masterReferenceIndexDataRef.current = {...immediateReferenceIndexDataRef.current}

                        pauseItemObserverRef.current  && (pauseItemObserverRef.current = false)
                        pauseCradleIntersectionObserverRef.current  && (pauseCradleIntersectionObserverRef.current = false)
                        pauseScrollingEffectsRef.current && (pauseScrollingEffectsRef.current = false)

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

        let itemlist = Array.from(itemElementsRef.current)

        return calcVisibleItems(
            itemlist,
            viewportDataRef.current.elementref.current,
            headCradleElementRef.current, 
            cradlePropsRef.current.orientation
        )

    },[])

    const getContentList = useCallback(() => {
        return Array.from(itemElementsRef.current)
    },[])

    const reload = useCallback(() => {

        pauseItemObserverRef.current = true
        pauseCradleIntersectionObserverRef.current = true
        pauseScrollingEffectsRef.current = true
        callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}
        saveCradleState('reload')

    },[])

    const scrollToItem = useCallback((index) => { // , alignment = 'start') => {

        pauseItemObserverRef.current = true
        pauseCradleIntersectionObserverRef.current = true

        callingReferenceIndexDataRef.current = {index, scrolloffset:0}
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

    // let cradleHeadStyle = cradleHeadStyleRef.current
    // let cradleTailStyle = cradleTailStyleRef.current
    // let cradleSpineStyle = cradleSpineStyleRef.current

    const scrollTrackerArgs = useMemo(() => {
        return {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            offset:immediateReferenceIndexDataRef.current.index,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
    },[viewportDimensions, immediateReferenceIndexDataRef, cradlePropsRef])

    return <>

        { (cradlestateRef.current == 'repositioning')
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