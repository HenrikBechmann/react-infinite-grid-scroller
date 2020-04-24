// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:
    - check listsize and other parameter availability inside closures using useRef
*/

/*
    Description
    -----------

    This module has one main design pattern: the butterfuly pattarn (my name)

    the butterfly pattern:
        this pattern consists of two containers for items, joined by a 0-length div (the "spine"). 
        The containers are fixed to the spine through the bottom/right position style on one side, and top/left 
        on the other. Thus additions or deletions effect the distant end from the spine on each end. All three 
        together comprise the "cradle" of items. After a change of content, the only adjustment required is the 
        change of position of the spine in relation to the viewport.

*/

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import useIsMounted from 'react-is-mounted-hook'

import ResizeObserverPolyfill from 'resize-observer-polyfill'

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

import { 
    setCradleStyles, 
    getUIContentList, 
    calcVisibleItems, 
    getReferenceIndexData,
    getContentListRequirements,
    setCradleStyleRevisionsForDrop,
    setCradleStyleRevisionsForAdd,
    normalizeCradleAnchors,
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

    const itemObserverRef = useRef(null)
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
    // const isResizingRef = useRef(false)

    const pauseItemObserverRef = useRef(false)
    const pauseCradleObserverRef = useRef(false)

    const isTailCradleInViewRef = useRef(true)
    const isHeadCradleInViewRef = useRef(true)
    const isCradleInViewRef = useRef(true)

    // const isScrollingRef = useRef(false)

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

        // isResizingRef.current = viewportData.isResizing

        if (viewportData.isResizing) {

            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

            pauseItemObserverRef.current = true
            saveCradleState('resizing')

        }
        if (!viewportData.isResizing && (cradlestateRef.current == 'resizing')) {

            saveCradleState('resize')

        }

    },[viewportData.isResizing])

    // reload conditions
    useEffect(()=>{
        console.log('triggering reload as config side effect')
        if (cradlestateRef.current == 'setup') return

        pauseItemObserverRef.current = true
        pauseCradleObserverRef.current = true
        callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}
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

        headContentlistRef.current = []

        if (cradlestateRef.current != 'setup') {

            pauseItemObserverRef.current = true
            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

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

    // ------------------ current location -- first visible item -------------
    const [referenceindexdata, saveReferenceindex] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:0
    })
    const referenceIndexDataRef = useRef(null) // access by closures
    referenceIndexDataRef.current = referenceindexdata
    const masterReferenceIndexDataRef = useRef(referenceindexdata) // capture for state resetContent operations

    // --------------------[ cell specs for reference by functions ]----------------
    const cellSpecs = useMemo(() => {
        return {
            cellWidth, cellHeight, gap, padding
        }
    },[ cellWidth, cellHeight, gap, padding ])
    const cellSpecsRef = useRef(null)
    cellSpecsRef.current = cellSpecs

    // ------------------------------[ orientation ]--------------------------------
    const orientationRef = useRef(orientation)
    orientationRef.current = orientation // availability in closures

    // -------------------------------[ cradle data ]-------------------------------------
    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions

    // cradle html components
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const cradleSpineElementRef = useRef(null)

    // data model
    const contentDataRef = useRef(null)
    const headContentDataRef = useRef(null)
    const tailContentDataRef = useRef(null)
    // view model
    const headContentlistRef = useRef([])
    const tailContentlistRef = useRef([])

    const itemElementsRef = useRef(new Map())

    // ------------------------------[ content dimensions ]---------------------------
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
    // const previousCrosscountRef = useRef() // available for resize logic
    // previousCrosscountRef.current = crosscountRef.current // available for resize logic
    crosscountRef.current = crosscount // available for observer closure

    const rowcount = useMemo(()=> {

        let viewportLength, cellLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            cellLength = cellHeight
        } else {
            viewportLength = viewportwidth
            cellLength = cellWidth
        }

        cellLength += gap

        let rcount = Math.ceil(viewportLength/cellLength)
        rcount += (runwaycount * 2)
        let itemcount = rcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            rcount = Math.ceil(itemcount/crosscount)
        }
        return rcount

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

    const rowcountRef = useRef(null)
    rowcountRef.current = rowcount

    const basecradlelengths = useMemo(()=>{

        let headLength, tailLength

        let viewportLength, cellLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            cellLength = cellHeight
        } else {
            viewportLength = viewportwidth
            cellLength = cellWidth
        }

        cellLength += gap

        headLength = (runwaycount * cellLength) - gap + padding
        tailLength = ((rowcount - runwaycount) * cellLength) - gap + padding

        return [headLength, tailLength]

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        padding,
        rowcount,
        runwaycount,
    ])

    const basecradlelengthsRef = useRef(null)
    basecradlelengthsRef.current = basecradlelengths

    // --------------------------------[ css styles ]---------------------------------

    // base styles
    const headCradleStylesRef = useRef({...{

        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent:'start',
        alignContent:'start',
        boxSizing:'border-box',
        bottom:0,
        left:0,
        right:0,

    } as React.CSSProperties,...styles?.cradle})

    const tailCradleStylesRef = useRef({...{
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent:'start',
        alignContent:'start',
        boxSizing:'border-box',
        top:0,
        left:0,
        right:0,
    } as React.CSSProperties,...styles?.cradle})

    const cradleReferenceBlockStylesRef = useRef({
        position: 'relative',
        transform:`translate(0px,${padding}px)`
    } as React.CSSProperties)

    // style revisions
    const headCradleStyleRevisionsRef = useRef(null) // for modifications by observer actions
    const tailCradleStyleRevisionsRef = useRef(null) // for modifications by observer actions

    // style consolidations
    let [thead, ttail] = useMemo(()=> {

        // merge base style and revisions (by observer)
        let headCradleStyles:React.CSSProperties = {...headCradleStylesRef.current}//,...headCradleStyleRevisionsRef.current}
        let tailCradleStyles:React.CSSProperties = {...tailCradleStylesRef.current}//,...tailCradleStyleRevisionsRef.current}
        let [styles, tailstyles] = setCradleStyles({

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

        return [styles, tailstyles]
    },[
        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        headCradleStyleRevisionsRef.current,
        tailCradleStyleRevisionsRef.current
      ])

    headCradleStylesRef.current = thead
    tailCradleStylesRef.current = ttail

    // --------------------------------[ utilities ]----------------------------------
    const scrollTimeridRef = useRef(null)

    // =================================================================================
    // -------------------------[ IntersectionObserver support]-------------------------
    // =================================================================================

    // There are two observers, one for the cradle, and another for itemShells; both against
    // the viewport.

    // --------------------[ intersection observer data ]---------------------------
    const [dropentries, saveDropentries] = useState(null) // trigger add entries
    const [addentries, saveAddentries] = useState(null) // add entries

    // --------------------------[ cradle observers ]-----------------------------------

    // set up resizeobserver
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

        if (pauseCradleObserverRef.current) return

        console.log('cradle entries',entries)

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

        if (pauseCradleObserverRef.current) return

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
        // let rootMargin
        // if (orientation == 'horizontal') {
        //     rootMargin = `0px ${runwaylength}px 0px ${runwaylength}px`
        // } else {
        //     rootMargin = `${runwaylength}px 0px ${runwaylength}px 0px`
        // }
        // console.log('rootMargin',options)
        itemObserverRef.current = new IntersectionObserver(

            itemobservercallback,
            {
                root:viewportDataRef.current.elementref.current, 
                // rootMargin, 
                threshold:0
            } 

        )

        return () => {

            itemObserverRef.current.disconnect()

        }
    },[orientation])

    // the async callback from IntersectionObserver.
    const itemobservercallback = useCallback((entries)=>{

        // console.log('pauseItemObserverRef.current, cradlestateRef.current',pauseItemObserverRef.current, cradlestateRef.current)

        if (pauseItemObserverRef.current) return

        if (cradlestateRef.current == 'ready') {

            let dropentries = entries.filter(entry => (!entry.isIntersecting))

            // console.log('dropentries',dropentries)

            if (dropentries.length) {

                isMounted() && saveDropentries(dropentries)

            }
        }

    },[])

    // drop scroll content
    useEffect(()=>{
        if (dropentries === null) return

        let viewportData = viewportDataRef.current
        let localdropentries = [...dropentries]
        let contentlistcopy = [...contentDataRef.current]

        let sampleEntry = localdropentries[0]

        let listsize = cradlePropsRef.current.listsize

        let headCradleElement = headCradleElementRef.current
        let tailCradleElement = tailCradleElementRef.current
        let scrollElement = cradleSpineElementRef.current.parentElement
        let viewportElement = viewportData.elementref.current

        let scrollforward
        let localContentList
        let headcontentlist = headContentlistRef.current
        let tailcontentlist = tailContentlistRef.current

        // -- isolate forward and backward lists
        //  then set scrollforward
        let forwardcount = 0, backwardcount = 0
        for (let droprecordindex = 0; droprecordindex <localdropentries.length; droprecordindex++ ) {
            if (orientation == 'vertical') {

                if (sampleEntry.boundingClientRect.y - sampleEntry.rootBounds.y < 0) {
                    forwardcount++
                } else {
                    backwardcount++
                }
            
            } else {
            
                if (sampleEntry.boundingClientRect.x - sampleEntry.rootBounds.x < 0) {
                    forwardcount++
                } else {
                    backwardcount++
                }
            
            }
        }

        let netshift = forwardcount - backwardcount
        if (netshift == 0) {

            return
        }

        scrollforward = (forwardcount > backwardcount)

        netshift = Math.abs(netshift) // should be coerced same as number of rows to shift * crosscount

        // set pendingcontentoffset
        let indexoffset = contentlistcopy[0].props.index
        let pendingcontentoffset
        let addcontentcount = Math.ceil(netshift/crosscountRef.current) * crosscountRef.current // adjust in full row increments

        let headindexcount, tailindexcount

        if (scrollforward) { // delete from head; add to tail; head is direction of stroll

            pendingcontentoffset = indexoffset + netshift
            let proposedtailoffset = pendingcontentoffset + addcontentcount + ((contentlistcopy.length - netshift ) - 1)

            if ((proposedtailoffset) > (listsize -1) ) {
                let diffitemcount = (proposedtailoffset - (listsize -1)) // items outside range
                addcontentcount -= diffitemcount // adjust the addcontent accordingly
                let diffrows = Math.floor(diffitemcount/crosscountRef.current) // number of full rows to leave in place
                let diffrowitems = (diffrows * crosscountRef.current)  // derived number of items to leave in place
                let netshiftadjustment = diffrowitems // recognize net shift adjustment
                netshift -= netshiftadjustment // apply adjustment to netshift
                pendingcontentoffset -= netshiftadjustment // apply adjustment to new offset for add

                if (addcontentcount <=0) { // nothing to do

                    return

                }
            }

            // instructions for cradle content
            headindexcount = -netshift
            tailindexcount = 0

        } else {

            pendingcontentoffset = indexoffset // add to tail (opposite end of scroll direction), offset will remain the same
            let proposedindexoffset = pendingcontentoffset - addcontentcount
            if (proposedindexoffset < 0) {

                let diffitemcount = -proposedindexoffset
                let diffrows = Math.floor(diffitemcount/crosscountRef.current) // number of full rows to leave in place
                let netshiftadjustment = (diffrows * crosscountRef.current)
                addcontentcount -= diffitemcount
                netshift -= netshiftadjustment
                if (addcontentcount <= 0) {

                    return
                    
                }
            }

            headindexcount = 0
            tailindexcount = -netshift

        }

        localContentList = getUIContentList({

            indexoffset,
            localContentList:[...contentlistcopy],
            headindexcount,
            tailindexcount,
            callbacksRef,

        })

        headContentlistRef.current = localContentList

        // let [styles, tailstyles] = setCradleStyleRevisionsForDrop({ 

        //     headcontentlist,
        //     tailcontentlist,
        //     headCradleElement, 
        //     tailCradleElement,
        //     scrollElement, 
        //     scrollforward, 
        //     orientation 

        // })

        // // immediate change (an anti-pattern but performant)
        // // this is required to allow cradle to ajust size in the correct direction
        // // size is generated by number of items        
        // let elementstyle = headCradleElementRef.current.style
        // elementstyle.top = styles.top
        // elementstyle.bottom = styles.bottom
        // elementstyle.left = styles.left
        // elementstyle.right = styles.right

        // // synchronize
        // headCradleStyleRevisionsRef.current = styles 

        saveAddentries({count:addcontentcount,scrollforward,contentoffset:pendingcontentoffset})

    },[dropentries])

    // add scroll content
    useEffect(()=>{

        if (addentries === null) return

        let viewportData = viewportDataRef.current

        let localaddentries:any = {...addentries}
        let localContentList = [...headContentlistRef.current]
        let headcontentlist = headContentlistRef.current
        let tailcontentlist = tailContentlistRef.current

        let headCradleElement = headCradleElementRef.current
        let tailCradleElement = tailCradleElementRef.current
        let scrollElement = cradleSpineElementRef.current.parentElement
        let viewportElement = viewportData.elementref.current

        let { scrollforward } = localaddentries

        // set localContentList
        let { contentoffset, count:addcontentcount } = localaddentries

        let headindexcount, tailindexcount
        if (scrollforward) {

            headindexcount = 0,
            tailindexcount =  addcontentcount

        } else {

            headindexcount = addcontentcount
            tailindexcount = 0

        }

        let cradleProps = cradlePropsRef.current
        // TODO check for closure availability
        localContentList = getUIContentList({

            localContentList,
            headindexcount,
            tailindexcount,
            indexoffset: contentoffset,
            orientation:cradleProps.orientation,
            cellHeight:cradleProps.cellHeight,
            cellWidth:cradleProps.cellWidth,
            observer: itemObserverRef.current,
            crosscount:crosscountRef.current,
            callbacksRef,
            getItem:cradleProps.getItem,
            listsize:cradleProps.listsize,
            placeholder:cradleProps.placeholder,

        })

        headContentlistRef.current = localContentList

        // let [styles,tailstyles] = setCradleStyleRevisionsForAdd({

        //     headcontentlist,
        //     tailcontentlist,
        //     headCradleElement,
        //     tailCradleElement,
        //     scrollElement,
        //     scrollforward,
        //     orientation,

        // })

        // // immediate style change (an anti-pattern but performant)
        // // this is required to allow cradle to ajust size in the correct direction
        // // size is generated by number of items        
        // let elementstyle = headCradleElementRef.current.style
        // elementstyle.top = styles.top
        // elementstyle.bottom = styles.bottom
        // elementstyle.left = styles.left
        // elementstyle.right = styles.right

        // // synchronize
        // headCradleStyleRevisionsRef.current = styles

        saveAddentries(null)

    },[addentries])
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
                viewportheight, 
                viewportwidth, 
                runwaylength, 
                gap,
                padding,
                visibletargetindexoffset,
                targetScrollOffset:visibletargetscrolloffset,
                crosscount,
                listsize,
            })

        referenceIndexDataRef.current = {
            index:referenceoffset,
            scrolloffset:visibletargetscrolloffset,
        }

        if (referenceIndexCallbackRef.current) {
            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            referenceIndexCallbackRef.current(
            referenceIndexDataRef.current.index, 'setCradleContent', cstate)

        }

        saveReferenceindex(referenceIndexDataRef.current)

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
            callbacksRef,
            getItem,
            listsize,
            placeholder,
        })

        let [headcontentlist, tailcontentlist] = allocateContentList(
            {
                orientation,
                contentlist:childlist,
                runwaycount,
                crosscount,
                viewportElement:viewportDataRef.current.elementref.current,
                cellHeight,
                cellWidth,
                padding,
                gap, 
                rowcount,
            }
        )

        contentDataRef.current = childlist
        headContentDataRef.current = headcontentlist
        tailContentDataRef.current = tailcontentlist

        // let elementstyle = headCradleElementRef.current.style

        let headstyles:React.CSSProperties = {}
        let tailstyles:React.CSSProperties = {}

        if (orientation == 'vertical') {

            headstyles.top = cradleoffset + 'px'
            headstyles.bottom = 'auto'
            headstyles.left = 'auto'
            headstyles.right = 'auto'

            positionDataRef.current = {property:'scrollTop',value:scrollblockoffset}

        } else { // orientation = 'horizontal'

            headstyles.top = 'auto'
            headstyles.bottom = styles.bottom = 'auto'
            headstyles.left = cradleoffset + 'px'
            headstyles.right = 'auto'

            positionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}

        }

        headlayoutDataRef.current = headstyles // for 'layout' state

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
        rowcount,
      ]
    )

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    // callback for scroll
    const onScroll = useCallback(() => {

        // if (!isScrollingRef.current)  {

        //     isScrollingRef.current = true

        // }

        clearTimeout(scrollTimeridRef.current)
        scrollTimeridRef.current = setTimeout(() => {

            // isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if (!viewportDataRef.current.isResizing) {

                (cradleState != 'repositioning') && normalizeCradleAnchors(headCradleElementRef.current, orientationRef.current)

                saveReferenceindex({...referenceIndexDataRef.current}) // trigger re-run to capture end of scroll session values
                masterReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

            }
            switch (cradleState) {

                case 'repositioning': {

                    pauseItemObserverRef.current = true
                    callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

                    saveCradleState('reposition')
                    break
                } 

            }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        if (!viewportDataRef.current.isResizing) {

            let cradleState = cradlestateRef.current
            if (cradleState == 'ready' || cradleState == 'repositioning') {

                referenceIndexDataRef.current = getReferenceIndexData({
                    orientation:orientationRef.current,
                    viewportData:viewportDataRef.current,
                    cellSpecsRef,
                    crosscountRef,
                    listsize:cradlePropsRef.current.listsize,
                })
                referenceIndexCallbackRef.current && referenceIndexCallbackRef.current(referenceIndexDataRef.current.index,'scrolling', cradleState)

                saveReferenceindex(referenceIndexDataRef.current)

            }

        }

        if (
            !isCradleInViewRef.current && 
            !pauseItemObserverRef.current && 
            !viewportDataRef.current.isResizing &&
            !(cradlestateRef.current == 'resize') &&
            !(cradlestateRef.current == 'repositioning') && 
            !(cradlestateRef.current == 'reposition')) {

            let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
            let {top, right, bottom, left} = rect
            let width = right - left, height = bottom - top
            viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

            saveCradleState('repositioning')

        }

    },[])

    // data for state processing
    const callingCradleState = useRef(cradlestateRef.current)
    const callingReferenceIndexDataRef = useRef(referenceIndexDataRef.current)
    const headlayoutDataRef = useRef(null)
    const positionDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportData = viewportDataRef.current
        switch (cradlestate) {
            case 'reload':
                headContentlistRef.current = []
                tailContentlistRef.current = []
                saveCradleState('setreload')
                break;
            case 'position': {

                viewportData.elementref.current[positionDataRef.current.property] =
                    positionDataRef.current.value

                saveCradleState('layout')

                break
            }
            case 'layout': {

                headCradleStyleRevisionsRef.current = headlayoutDataRef.current

                saveCradleState('content')

                break
            }
            case 'content': {
                headContentlistRef.current = headContentDataRef.current // contentDataRef.current
                tailContentlistRef.current = tailContentDataRef.current
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

                saveCradleState('position')

                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails

                        normalizeCradleAnchors(headCradleElementRef.current, orientationRef.current)

                        viewportData.elementref.current[positionDataRef.current.property] =
                            positionDataRef.current.value

                        masterReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

                        pauseItemObserverRef.current  && (pauseItemObserverRef.current = false)
                        pauseCradleObserverRef.current  && (pauseCradleObserverRef.current = false)

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
            itemlist,viewportDataRef.current.elementref.current,headCradleElementRef.current, orientationRef.current
        )

    },[])

    const getContentList = useCallback(() => {
        return Array.from(itemElementsRef.current)
    },[])

    const reload = useCallback(() => {

        pauseItemObserverRef.current = true
        pauseCradleObserverRef.current = true

        callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}
        saveCradleState('reload')

    },[])

    const scrollToItem = useCallback((index) => { // , alignment = 'start') => {

        pauseItemObserverRef.current = true
        pauseCradleObserverRef.current = true

        callingReferenceIndexDataRef.current = {index, scrolloffset:0}
        saveCradleState('reposition')

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

    let headCradlestyles = headCradleStylesRef.current
    let tailCradlestyles = tailCradleStylesRef.current

    const trackerArgs = useMemo(() => {
        return {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            offset:referenceIndexDataRef.current.index,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
    },[viewportDimensions, referenceIndexDataRef, cradlePropsRef])

    return <>

        { (cradlestateRef.current == 'repositioning')
            ?<ScrollTracker 
                top = {trackerArgs.top} 
                left = {trackerArgs.left} 
                offset = {trackerArgs.offset} 
                listsize = {trackerArgs.listsize}
                styles = {trackerArgs.styles}
            />
            :null}
        <div 
            style = {cradleReferenceBlockStylesRef.current} 
            ref = {cradleSpineElementRef}
        >
            <div 
            
                data-name = 'head'
                ref = {headCradleElementRef} 
                style = {headCradlestyles}
            
            >
            
                {(cradlestateRef.current != 'setup')?headContentlistRef.current:null}
            
            </div>
            <div 
            
                data-name = 'tail'
                ref = {tailCradleElementRef} 
                style = {tailCradlestyles}
            
            >
            
                {(cradlestateRef.current != 'setup')?tailContentlistRef.current:null}
            
            </div>
        </div>
        
    </>

} // Cradle


export default Cradle