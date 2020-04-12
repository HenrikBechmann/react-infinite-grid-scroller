// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import useIsMounted from 'react-is-mounted-hook'

import { 
    setCradleStyles, 
    getUIContentList, 
    calcVisibleItems, 
    getReferenceIndexData,
    getContentListRequirements,
    setCradleStyleRevisionsForDrop,
    setCradleStyleRevisionsForAdd,
    normalizeCradleAnchors,

} from './cradlefunctions'

import ScrollTracker from './scrolltracker'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

const Cradle = ({ 
        gap, 
        padding, 
        runwaylength,
        runway, 
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

    // =============================================================================================
    // --------------------------------------[ initialization ]-------------------------------------

    // -----------------------------------------------------------------------
    // -----------------------------------[ utilites ]------------------------

    const isMounted = useIsMounted()
    const reportReferenceIndexRef = useRef(functions?.reportReferenceIndex)
    const itemobserverRef = useRef(null)
    const cradleobserverRef = useRef(null)

    // -----------------------------------------------------------------------
    // ---------------------------[ context data ]----------------------------

    const viewportData = useContext(ViewportContext)
    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const [cradlestate, saveCradleState] = useState('setup')
    const cradlestateRef = useRef(null) // access by closures
    cradlestateRef.current = cradlestate

    const [scrollstate, saveScrollState] = useState('ready')

    // -----------------------------------------------------------------------
    // -----------------------------[ persistent data ]-----------------------

    const listsizeRef = useRef(null)
    listsizeRef.current = listsize

    // -----------------------------------------------------------------------
    // -------------------------[ control variables ]-----------------
    const isResizingRef = useRef(false)

    const pauseItemObserverRef = useRef(false)
    const pauseCradleObserverRef = useRef(false)

    const isCradleInViewRef = useRef(true)

    const isScrollingRef = useRef(false)

    // -----------------------------------------------------------------------
    // --------------------------------[ init effects ]-----------------------

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

        reportReferenceIndexRef.current = functions?.reportReferenceIndex

    },[functions])

    // initialize window scroll listener
    useEffect(() => {

        viewportData.elementref.current.addEventListener('scroll',onScroll)

        return () => {

            viewportData.elementref.current && viewportData.elementref.current.removeEventListener('scroll',onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        isResizingRef.current = viewportData.isResizing

        if (isResizingRef.current) {

            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

            pauseItemObserverRef.current = true
            saveCradleState('resizing')

        }
        if (!isResizingRef.current && (cradlestateRef.current == 'resizing')) {

            saveCradleState('resize')

        }

    },[viewportData.isResizing])

    // reload conditions
    useEffect(()=>{
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

        let rootMargin
        if (orientation == 'horizontal') {
            rootMargin = `0px ${runwaylength}px 0px ${runwaylength}px`
        } else {
            rootMargin = `${runwaylength}px 0px ${runwaylength}px 0px`
        }
        // console.log('rootMargin',options)
        itemobserverRef.current = new IntersectionObserver(
            itemobservercallback,
            {root:viewportData.elementref.current, rootMargin,threshold:0} 
        )

        contentlistRef.current = []

        if (cradlestate != 'setup') {
            pauseItemObserverRef.current = true
            callingReferenceIndexDataRef.current = {...masterReferenceIndexDataRef.current}

            saveCradleState('pivot')
        }

    },[
        orientation,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    // =======================================================================
    // -------------------------[ operation ]---------------------------------

    // -----------------------------------------------------------------------
    // ------------------------[ session data ]-------------------------------

    // current location location -- first visible item
    const [referenceindexdata, saveReferenceindex] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:0
    })
    const referenceIndexDataRef = useRef(null) // access by closures
    referenceIndexDataRef.current = referenceindexdata
    const masterReferenceIndexDataRef = useRef(referenceindexdata) // capture for state resetContent operations

    const [dropentries, saveDropentries] = useState(null) // trigger add entries

    const [addentries, saveAddentries] = useState(null) // add entries

    const contentlistRef = useRef([])

    const cellSpecs = useMemo(() => {
        return {
            cellWidth, cellHeight, gap, padding
        }
    },[ cellWidth, cellHeight, gap, padding ])
    const cellSpecsRef = useRef(null)
    cellSpecsRef.current = cellSpecs

    const cradleStylesRef = useRef({...{
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent:'start',
        alignContent:'start',
        boxSizing:'border-box',

    } as React.CSSProperties,...styles?.cradle})

    const orientationRef = useRef(orientation)
    orientationRef.current = orientation // availability in closures

    const cradleStyleRevisionsRef = useRef(null) // for modifications by observer actions

    const cradleElementRef = useRef(null)

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
        rcount += (runway * 2)
        return rcount

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        // padding,
        viewportheight, 
        viewportwidth,
        runway,
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

        headLength = (runway * cellLength) - gap + padding
        tailLength = ((rowcount - runway) * cellLength) - gap + padding

        return [headLength, tailLength]

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        padding,
        rowcount,
        runway,
    ])

    const basecradlelengthsRef = useRef(null)
    basecradlelengthsRef.current = basecradlelengths

    cradleStylesRef.current = useMemo(()=> {

        // merge base style and revisions (by observer)
        let cradleStyles:React.CSSProperties = {...cradleStylesRef.current,...cradleStyleRevisionsRef.current}
        let styles = setCradleStyles({

            orientation, 
            cradleStyles, 
            cellHeight, 
            cellWidth, 
            gap,
            padding,
            crosscount, 
            viewportheight, 
            viewportwidth, 

        })

        return styles
    },[
        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        cradleStyleRevisionsRef.current
      ])

    const itemElementsRef = useRef(new Map())
    const scrollTimeridRef = useRef(null)

    // =================================================================================
    // -------------------------[ IntersectionObserver support]-------------------------

    // There are two observers, one for the cradle, and another for itemShells; both against
    // the viewport.

    // --------------------------[ cradle observer ]-----------------------------------
    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    useEffect(() => {

        cradleobserverRef.current = new IntersectionObserver(

            cradleobservercallback,
            {root:viewportData.elementref.current, threshold:0}

        )

        cradleobserverRef.current.observe(cradleElementRef.current)

    },[])

    const cradleobservercallback = useCallback((entries) => {

        if (pauseCradleObserverRef.current) return

        isCradleInViewRef.current = entries[0].isIntersecting

    },[])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runway at both the leading
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

        let localdropentries = [...dropentries]
        let contentlistcopy = [...contentlistRef.current]

        let sampleEntry = localdropentries[0]

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let scrollforward
        let localContentList

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


        let styles = setCradleStyleRevisionsForDrop({ 

            cradleElement, 
            parentElement, 
            scrollforward, 
            orientation 

        })

        // immediate change (an anti-pattern but performant)
        // this is required to allow cradle to ajust size in the correct direction
        // size is generated by number of items        
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // synchronize
        cradleStyleRevisionsRef.current = styles 

        contentlistRef.current = localContentList


        saveAddentries({count:addcontentcount,scrollforward,contentoffset:pendingcontentoffset})

    },[dropentries])

    // add scroll content
    useEffect(()=>{

        if (addentries === null) return

        let localaddentries:any = {...addentries}
        let localContentList = [...contentlistRef.current]

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
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

        localContentList = getUIContentList({

            localContentList,
            headindexcount,
            tailindexcount,
            indexoffset: contentoffset,
            orientation,
            cellHeight,
            cellWidth,
            observer: itemobserverRef.current,
            crosscount,
            callbacksRef,
            getItem,
            listsize,
            placeholder,

        })

        let styles = setCradleStyleRevisionsForAdd({

            cradleElement,
            parentElement,
            scrollforward,
            orientation,

        })

        // immediate style change (an anti-pattern but performant)
        // this is required to allow cradle to ajust size in the correct direction
        // size is generated by number of items        
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // synchronize
        cradleStyleRevisionsRef.current = styles

        contentlistRef.current = localContentList

        saveAddentries(null)

    },[addentries])
    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    
    // reset cradle
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

        if (reportReferenceIndexRef.current) {
            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            reportReferenceIndexRef.current(
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
            observer:itemobserverRef.current,
            crosscount,
            callbacksRef,
            getItem,
            listsize,
            placeholder,
        })

        contentDataRef.current = childlist

        let elementstyle = cradleElementRef.current.style

        let styles:React.CSSProperties = {}

        if (orientation == 'vertical') {

            styles.top = cradleoffset + 'px'
            styles.bottom = 'auto'
            styles.left = 'auto'
            styles.right = 'auto'

            positionDataRef.current = {property:'scrollTop',value:scrollblockoffset}

        } else { // orientation = 'horizontal'

            styles.top = 'auto'
            styles.bottom = styles.bottom = 'auto'
            styles.left = cradleoffset + 'px'
            styles.right = 'auto'

            positionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}

        }

        layoutDataRef.current = styles // for 'layout' state

    },[
        cellHeight,
        cellWidth,
        orientation,
        viewportheight,
        viewportwidth,
        runwaylength,
        gap,
        padding,
        crosscount,
      ]
    )

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------

    // callback for scroll
    const onScroll = useCallback(() => {

        if (!isScrollingRef.current)  {

            isScrollingRef.current = true

        }

        clearTimeout(scrollTimeridRef.current)
        scrollTimeridRef.current = setTimeout(() => {

            isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {

                (cradleState != 'repositioning') && normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

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

        if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {

            let cradleState = cradlestateRef.current
            if (cradleState == 'ready' || cradleState == 'repositioning') {

                referenceIndexDataRef.current = getReferenceIndexData({
                    orientation:orientationRef.current,
                    viewportData:viewportDataRef.current,
                    cellSpecsRef,
                    crosscountRef,
                    listsize:listsizeRef.current,
                })
                reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index,'scrolling', cradleState)

                saveReferenceindex(referenceIndexDataRef.current)

            }

        }

        if (
            !isCradleInViewRef.current && 
            !pauseItemObserverRef.current && 
            !isResizingRef.current &&
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
    const layoutDataRef = useRef(null)
    const positionDataRef = useRef(null)
    const contentDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradlestate) {
            case 'reload':
                contentlistRef.current = []
                saveCradleState('setreload')
                break;
            case 'position': {

                viewportData.elementref.current[positionDataRef.current.property] =
                    positionDataRef.current.value

                saveCradleState('layout')

                break
            }
            case 'layout': {

                cradleStyleRevisionsRef.current = layoutDataRef.current

                saveCradleState('content')

                break
            }
            case 'content': {
                contentlistRef.current = contentDataRef.current
                saveCradleState('normalize')
                break
            }
        }

    },[cradlestate])

    // standard processing stages
    useEffect(()=> {

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
                        // setTimeout(()=>{
                        normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

                        viewportData.elementref.current[positionDataRef.current.property] =
                            positionDataRef.current.value
                        // })

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

    // on host demand
    const getVisibleList = useCallback(() => {

        let itemlist = Array.from(itemElementsRef.current)

        return calcVisibleItems(
            itemlist,viewportData.elementref.current,cradleElementRef.current, orientationRef.current
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

    // content item registration
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
    // ------------------------------[ render... ]----------------------------------

    let cradlestyles = cradleStylesRef.current

    // TODO: move scrolltracker values to memo
    return <>

        { cradlestateRef.current == 'repositioning'
            ?<ScrollTracker 
                top = {viewportDimensions.top + 3} 
                left = {viewportDimensions.left + 3} 
                offset = {referenceIndexDataRef.current.index} 
                listsize = {listsize}
                styles = { styles }
            />
            :null}

        <div 
        
            ref = {cradleElementRef} 
            style = {cradlestyles}
        
        >
        
            {(cradlestateRef.current != 'setup')?contentlistRef.current:null}
        
        </div>
        
    </>

} // Cradle


export default Cradle