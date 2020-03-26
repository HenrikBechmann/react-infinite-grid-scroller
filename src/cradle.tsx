// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import { 
    setCradleStyles, 
    getUIContentList, 
    calcVisibleItems, 
    // getVisibleTargetData, 
    getReferenceIndexData,
    getContentListRequirements,
    setCradleStyleRevisionsForDrop,
    setCradleStyleRevisionsForAdd,
    normalizeCradleAnchors,
    // isCradleInView,
} from './cradlefunctions'

import ScrollTracker from './scrolltracker'

/*

    2: tasks
    code maintenance

    1 add examples 1, 2, 3 to control page: 
        - images, scroll and pivot
        - nested lists, scroll and pivot

    0 qa

*/

const Cradle = ({ 
        gap, 
        padding, 
        runwaylength, 
        listsize, 
        offset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        component,
        styles,
    }) => {

    // =============================================================================================
    // --------------------------------------[ initialization ]-------------------------------------

    const listsizeRef = useRef(null)
    listsizeRef.current = listsize

    const [cradlestate, saveCradleState] = useState('setup')
    const cradlestateRef = useRef(null) // access by closures
    cradlestateRef.current = cradlestate

    const viewportData = useContext(ViewportContext)

    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const isResizingRef = useRef(false)

    const pauseObserversRef = useRef(false)

    useEffect(()=>{

        isResizingRef.current = viewportData.isResizing

        // console.log('changing isResizingRef to ',viewportData.isResizing)

        if (isResizingRef.current) {

            callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

            // console.log('setting callingReferenceIndexDataRef from isResizing with referenceIndexDataRef', callingReferenceIndexDataRef.current)
            pauseObserversRef.current = true
            saveCradleState('resizing')

        }
        if (!isResizingRef.current && (cradlestateRef.current == 'resizing')) {

            saveCradleState('resize')

        }

    },[viewportData.isResizing])

    const reportReferenceIndexRef = useRef(component?.reportReferenceIndex)

    // initialize window listener
    useEffect(() => {

        viewportData.elementref.current.addEventListener('scroll',onScroll)

        if (component?.hasOwnProperty('getVisibleList')) {
            component.getVisibleList = getVisibleList
        } 

        if (component?.hasOwnProperty('getContentList')) {
            component.getContentList = getContentList
        } 

        if (component?.hasOwnProperty('scrollToItem')) {
            component.scrollToItem = scrollToItem
        } 

        if (component?.hasOwnProperty('reload')) {
            component.reload = reload
        }

        return () => {

            viewportData.elementref.current.removeEventListener('scroll',onScroll)

        }

    },[])

    // main control
    // current location
    const [referenceindexdata, saveReferenceindex] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:0
    })
    const referenceIndexDataRef = useRef(null) // access by closures
    referenceIndexDataRef.current = referenceindexdata
    const lastReferenceIndexDataRef = useRef(null)

    const isCradleInViewRef = useRef(true)

    const [dropentries, saveDropentries] = useState(null)

    const [addentries, saveAddentries] = useState(null)

    // const [contentlist,saveContentlist] = useState([])
    const contentlistRef = useRef([])

    const isScrollingRef = useRef(false)

    // console.log('==>> RUNNING Cradle with state', cradlestate)

    const itemobserverRef = useRef(null)

    const cradleobserverRef = useRef(null)

    const cellSpecs = useMemo(() => {
        return {
            cellWidth,cellHeight,gap, padding
        }
    },[cellWidth,cellHeight,gap, padding])
    const cellSpecsRef = useRef(null)
    cellSpecsRef.current = cellSpecs

    // const mainConfigDatasetRef = useRef({setup:true})

    const divlinerStylesRef = useRef(Object.assign({
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent:'start',
        alignContent:'start',
        boxSizing:'border-box',

    } as React.CSSProperties,styles?.cradle))

    const orientationRef = useRef(orientation)
    orientationRef.current = orientation // availability in closures

    const divlinerStyleRevisionsRef = useRef(null) // for modifications by observer actions

    const cradleElementRef = useRef(null)

    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions

    const crosscount = useMemo(() => {

        let crosscount
        let size = (orientation == 'horizontal')?viewportheight:viewportwidth
        let crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        let lengthforcalc = size - (padding * 2) + gap
        crosscount = Math.floor(lengthforcalc/(crossLength + gap))
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
    // console.log('crosscount value',crosscount)
    // ==============================================================================================
    // ----------------------------------[ config management ]--------------------------------

    const crosscountRef = useRef(crosscount) // for easy reference by observer
    const previousCrosscountRef = useRef() // available for resize logic
    previousCrosscountRef.current = crosscountRef.current // available for resize logic
    crosscountRef.current = crosscount // available for observer closure

    // capture previous versions for reconfigure calculations above
    // const configDataRef:any = useRef({})
    // const previousConfigDataRef:any = useRef({})
    // const visibleListRef = useRef([])

    divlinerStylesRef.current = useMemo(()=> {

        // merge base style and revisions (by observer)
        let divlinerStyles:React.CSSProperties = Object.assign({...divlinerStylesRef.current},divlinerStyleRevisionsRef.current)
        let styles = setCradleStyles({

            orientation, 
            divlinerStyles, 
            cellHeight, 
            cellWidth, 
            gap,
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
        divlinerStyleRevisionsRef.current
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
            {root:viewportData.elementref.current}

        )

        cradleobserverRef.current.observe(cradleElementRef.current)

    },[])

    const cradleobservercallback = useCallback((entries) => {

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

    // the async callback from IntersectionObserver. this is a closure
    const itemobservercallback = useCallback((entries)=>{

        if (pauseObserversRef.current) {

            return

        }

        if (cradlestateRef.current == 'ready') {

            let dropentries = entries.filter(entry => (!entry.isIntersecting))

            if (dropentries.length) {

                saveDropentries(dropentries)

            }
        }

    },[])

    // drop scroll content
    useEffect(()=>{
        if (dropentries === null) return

        let sampleEntry = dropentries[0]

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let scrollforward
        let localContentList

        // -- isolate forward and backward lists
        //  then set scrollforward
        let forwardcount = 0, backwardcount = 0
        for (let droprecordindex = 0; droprecordindex <dropentries.length; droprecordindex++ ) {
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
        if (netshift == 0) return

        scrollforward = (forwardcount > backwardcount)

        netshift = Math.abs(netshift)

        // set localContentList
        let indexoffset = contentlistRef.current[0].props.index
        let pendingcontentoffset
        let newcontentcount = Math.ceil(netshift/crosscountRef.current)*crosscountRef.current
        let headindexcount, tailindexcount

        if (scrollforward) {
            pendingcontentoffset = indexoffset + netshift
            let proposedtailoffset = pendingcontentoffset + newcontentcount + ((contentlistRef.current.length - netshift ) - 1)

            if ((proposedtailoffset) > (listsize -1) ) {
                newcontentcount -= (proposedtailoffset - (listsize -1))
                if (newcontentcount <=0) { // defensive
                    return
                }
            }

            headindexcount = -netshift
            tailindexcount = 0

        } else {

            pendingcontentoffset = indexoffset
            let proposedindexoffset = pendingcontentoffset - newcontentcount
            if (proposedindexoffset < 0) {
                proposedindexoffset = -proposedindexoffset
                newcontentcount = newcontentcount - proposedindexoffset
                if (newcontentcount <= 0) {
                    return 
                }
            }

            headindexcount = 0
            tailindexcount = -netshift

        }

        localContentList = getUIContentList({

            indexoffset,
            localContentList:contentlistRef.current,
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

        // immediate change for modification
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // synchronization
        divlinerStyleRevisionsRef.current = styles 

        // saveContentlist(localContentList) // delete entries
        contentlistRef.current = localContentList
        saveDropentries(null)
        saveAddentries({count:newcontentcount,scrollforward,contentoffset:pendingcontentoffset})

    },[dropentries])

    // add scroll content
    useEffect(()=>{
        if (addentries === null) return

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let { scrollforward } = addentries
        let localContentList

        // set localContentList
        let { contentoffset, count:newcontentcount } = addentries

        let headindexcount, tailindexcount
        if (scrollforward) {

            headindexcount = 0,
            tailindexcount =  newcontentcount

        } else {

            headindexcount = newcontentcount
            tailindexcount = 0

        }

        localContentList = getUIContentList({

            localContentList: contentlistRef.current,
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

        // immediate change for modification
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // synchronization
        divlinerStyleRevisionsRef.current = styles

        // saveContentlist(localContentList)
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

        // console.log('setCradleContent cradleState, referenceIndexData', cradleState, referenceIndexData)

        // console.log('visibletargetindexoffset, visibletargetscrolloffset',visibletargetindexoffset, visibletargetscrolloffset)

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

        reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index)

        saveReferenceindex(referenceIndexDataRef.current)

        // console.log('xxx===>> x1. indexoffset, referenceoffset, contentCount, scrollblockoffset, cradleoffset, referenceIndexDataRef',
        //     indexoffset, referenceoffset, contentCount, scrollblockoffset, cradleoffset, {...referenceIndexDataRef.current})

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

        // contentlistRef.current = []
        contentDataRef.current = childlist

        // let elementstyle = cradleElementRef.current.style
        let elementstyle = cradleElementRef.current.style

        let styles:React.CSSProperties = {}
        // let cradleoffset
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

        // console.log('styles',styles)
        layoutDataRef.current = styles
        // console.log('x2. styles, referenceIndexDataRef.current, scrollTop', 
        //     styles, referenceIndexDataRef.current,viewportData.elementref.current.scrollTop)

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

    // maintain a list of visible items (visibleList) 
    // on shift of state to ready, or trigger next state after repositioning
    // when scroll ends.
    // useEffect(() => {

    //     if (isScrollingRef.current || isResizingRef.current) return

    //     // console.log('finish scrolling', cradlestate)

    //     if (cradlestate == 'ready') {

    //         // console.log('calculating visible item list')
    //         // update visible list
    //         // let itemlist = Array.from(itemElementsRef.current)

    //         // visibleListRef.current = calcVisibleItems(
    //         //     itemlist,viewportData.elementref.current,cradleElementRef.current, orientation
    //         // )

    //     }

    // },[cradlestate, isScrollingRef.current, isResizingRef.current])

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------

    // callback for scroll
    const onScroll = useCallback(() => {

        // console.log('scrolling to, isScrolling, isResizing, cradleState ',
        //     viewportData.elementref.current.scrollTop,isScrollingRef.current,isResizingRef.current, cradlestateRef.current)
        if (!isScrollingRef.current)  {

            isScrollingRef.current = true

        }

        clearTimeout(scrollTimeridRef.current)
        scrollTimeridRef.current = setTimeout(() => {
            // console.log('scrolling TIMEOUT with cradleState', cradlestateRef.current)
            isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {

                // console.log('normalizing anchors from scroll')
    
                (cradleState != 'repositioning') && normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

                saveReferenceindex({...referenceIndexDataRef.current}) // trigger re-run to capture end of scroll session values
                lastReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

            }
            switch (cradleState) {

                case 'repositioning': {

                    pauseObserversRef.current = true
                    callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}
                    // console.log('setting callingReferenceIndexDataRef from referenceIndexDataRef for repositioning',callingReferenceIndexDataRef.current)
                    saveCradleState('reposition')
                    break
                } 

            }

        },200)

        // console.log('in onScroll:isResizingRef, viewportData.isResizing',isResizingRef.current,viewportData.isResizing)
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
                reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index)

                // console.log('calling getReferenceIndexDate for referenceIndexDateRef from onScroll', referenceIndexDataRef.current)
                saveReferenceindex(referenceIndexDataRef.current)

            }

        }

        // console.log('repositioning controls: isCradleInViewRef, pauseObserversRef, isResizingRef, cradlestateRef',
        //     isCradleInViewRef.current, pauseObserversRef.current, isResizingRef.current, cradlestateRef.current)

        if (
            !isCradleInViewRef.current && 
            !pauseObserversRef.current && 
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

    // trigger pivot on change in orientation
    useEffect(()=> {

        let rootMargin
        if (orientation == 'horizontal') {
            rootMargin = `0px ${runwaylength}px 0px ${runwaylength}px`
        } else {
            rootMargin = `${runwaylength}px 0px ${runwaylength}px 0px`
        }
        itemobserverRef.current = new IntersectionObserver(
            itemobservercallback,
            {root:viewportData.elementref.current, rootMargin,} 
        )

        contentlistRef.current = []

        if (cradlestate != 'setup') {
            pauseObserversRef.current = true
            callingReferenceIndexDataRef.current = {...lastReferenceIndexDataRef.current}

            saveCradleState('pivot')
        }

    },[orientation])

    // this is the core state engine
    // triggering next state phase: states = setup, pivot, resize, reposition (was run)
    const callingCradleState = useRef(cradlestateRef.current)
    const callingReferenceIndexDataRef = useRef(referenceIndexDataRef.current)

    const layoutDataRef = useRef(null)

    const positionDataRef = useRef(null)

    const contentDataRef = useRef(null)

    useLayoutEffect(()=>{

        switch (cradlestate) {
            case 'reload':
                contentlistRef.current = []
                saveCradleState('reposition')
                break;
            case 'position': {

                viewportData.elementref.current[positionDataRef.current.property] =
                    positionDataRef.current.value

                saveCradleState('layout')

                break
            }
            case 'layout': {

                divlinerStyleRevisionsRef.current = layoutDataRef.current

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

    useEffect(()=> {
        // console.log('calling state machine with ',cradlestate)
        switch (cradlestate) {
            case 'setup': 
            case 'resize':
            case 'pivot':
            case 'reposition':

                callingCradleState.current = cradlestate
                saveCradleState('settle')

                break

            case 'settle': {

                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current)

                // console.log('setting ready from ', cradlestate)
                saveCradleState('position')
                // console.log('callingReferenceIndexDataRef.current',{...callingReferenceIndexDataRef.current})
                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    viewportData.elementref.current[positionDataRef.current.property] =
                        positionDataRef.current.value

                    normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

                    lastReferenceIndexDataRef.current = {...referenceIndexDataRef.current}
                    // console.log('referenceIndexData after settle', {...referenceIndexDataRef.current})
                    // console.log('cancelling pauseObserversRef', pauseObserversRef.current)
                    pauseObserversRef.current  && (pauseObserversRef.current = false)
                },250)
                saveCradleState('ready')
                break 
            }          

            case 'ready':
                break
        }
    },[cradlestate])

    // =============================================================================
    // ------------------------------[ callbacks ]----------------------------------

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
        saveCradleState('reload')
    },[])

    const scrollToItem = useCallback((index, alignment = 'nearest') => {
        console.log('requested scrollToItem',index, alignment)
        callingReferenceIndexDataRef.current = {index:0, scrolloffset:0}
        saveCradleState('reposition')
    },[])

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

    let divlinerstyles = divlinerStylesRef.current

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
            style = {divlinerstyles}
        
        >
        
            {(cradlestateRef.current != 'setup')?contentlistRef.current:null}
        
        </div>
        
    </>

} // Cradle


export default Cradle