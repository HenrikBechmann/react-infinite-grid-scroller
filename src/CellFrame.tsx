// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of CellFrame is to fetch user content from the cache, or from the host (using getItem).
    While an item is being fetched, CellFrame presents a placeholder (either the default or an 
    imported custom version). If there is an error in fetching content then the placeholder is used
    to present the error to the user. If a new itemID is set by the parent (to synchronize with an altered
    cache), then CellFrame replaces the old item with the new item.

    getItem (which is a function provided by the host) can return one of several values:
        - a React component
        - a promise of a component
        - null
        - undefined
    Anything else is treated as an error

    if a promise is returned, then the promise returns a React component, null or undefined.

    If a valid react component is returned from getItem, then it is instantiated in the cache, and rendered in the
    CellFrame. If null is returned, then CellFrame sends a message to its scroller that the host has 
    indicated the the item being fetched instead represents the end of the list, and the listsize should
    be adjusted accordingly. Any other value that is returned is treated as an error, and presented
    as such to the user through the placeholder component.

    getItem sends the index (logical index in the list) and a session itemID to the host, so that
    the host can sync its own tracking with the scroller.

    One CellFrame at a time is designated as the host of the two triggerLines with the isTriggerCell flag. 
    The triggerlines trigger an update of the Cradle through an IntersectionObserver.
*/

import React, {
    useRef, 
    useEffect, 
    useLayoutEffect, 
    useState, 
    useMemo, 
    useContext,
} from 'react'

import type { CSSProperties } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback' // polyfill if needed

import { OutPortal } from 'react-reverse-portal' // fetch from cache

import Placeholder from './cellframe/Placeholder' // default
import './cellframe/cellframe.css'

import { CradleContext } from './Cradle'
import { ScrollerDndContext, GenericObject } from './InfiniteGridScroller'
import { ViewportContext } from './Viewport'

// =====================[ dnd support ]====================

import { 
    useDrag, 
    useDragLayer, 
    useDrop, 
    DragSourceMonitor, 
    DragLayerMonitor, 
    DropTargetMonitor
} from 'react-dnd'

import { getEmptyImage } from 'react-dnd-html5-backend'

import { MasterDndContext } from './InfiniteGridScroller'

// import moveicon from "../assets/move_item_FILL0_wght400_GRAD0_opsz24.png"
// import copyicon from "../assets/content_copy_FILL0_wght400_GRAD0_opsz24.png"
import dragicon from "../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
// import dropicon from "../task_alt_FILL0_wght400_GRAD0_opsz24.png"
// import nodropicon from "../block_FILL0_wght400_GRAD0_opsz24.png"

// called to choose between dnd or no dnd for CellFrame
export const CellFrameController = props => {

    const masterDndContext = useContext(MasterDndContext)

    if (masterDndContext.dnd) {

        return <DndCellFrame {...props}/>

    } else {

        return <CellFrameWrapper {...props} />

    }

}

// HoC for DnD functionality; requires targetConnector
const DndCellFrame = (props) => {

    const 
        {itemID, index} = props,
        cradleContext = useContext(CradleContext),
        { scrollerPropertiesRef } = cradleContext,
        { orientation, scrollerID, virtualListProps} = scrollerPropertiesRef.current,
        {crosscount } = virtualListProps,

        masterDndContext = useContext(MasterDndContext),
        scrollerDndContext = useContext(ScrollerDndContext),
        frameRef = useRef(null)

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept,
        drop:(item,monitor) => {
            return {target:{
                scrollerID,
                itemID,
                index,
            }}
        },
        collect:(monitor:DropTargetMonitor) => {
            return {
                item:monitor.getItem() as any,
                isOver:monitor.isOver(),
                canDrop:monitor.canDrop(),
            }
        },
    })

    const cellCanDropRef = useRef(false)

    const 
        sourceIndex = targetData.item?.index,
        sourceScrollerID = targetData.item?.scrollerID,

        isLocation = (scrollerID !== sourceScrollerID) || (sourceIndex !== index), // && (index !== sourceIndex + 1)),

        classname = 'rigs-target-highlight'

    if (isLocation && targetData.isOver && targetData.canDrop && !frameRef.current?.classList.contains(classname)) {

        cellCanDropRef.current = true
        frameRef.current.classList.add(classname)
        masterDndContext.dropCount++

    } else if (isLocation && !targetData.isOver && frameRef.current?.classList.contains(classname)) {

        masterDndContext.dropCount--
        frameRef.current.classList.remove(classname)
        cellCanDropRef.current = false

    }

    useEffect(()=>{

        return () => {
            
            if (cellCanDropRef.current) masterDndContext.dropCount--

            updateDragLayerIcon()

        }

    },[])

    const updateDragLayerIcon = () => {

        const canDoDrop = !!masterDndContext.dropCount

        if (masterDndContext.dragData.canDrop !== canDoDrop) {
            masterDndContext.dragData.canDrop = canDoDrop
            masterDndContext.setDragState && masterDndContext.setDragState('updateicon')
        }

    }

    updateDragLayerIcon()

    const isDndRef = useRef(true)

    useEffect (() => {

        const isDnd = (masterDndContext.enabled && scrollerDndContext.dndOptions.enabled) // && enabled)

        if (isDndRef.current !== isDnd) {
            isDndRef.current = isDnd
        }

    },[masterDndContext.enabled, scrollerDndContext.dndOptions.enabled])

    const enhancedProps = {...props, isDnd:isDndRef.current, targetConnector, frameRef, masterDndContext}

    return <CellFrame {...enhancedProps}/>

}

// provide targetConnector source when not required for DnD
const CellFrameWrapper = (props) => {

    const 
        targetConnector = (element) => {}, // no-op
        frameRef = useRef(null),

        enhancedProps = {...props, isDnd:false, targetConnector, frameRef}

    return <CellFrame {...enhancedProps}/>
} 

// drag starts here
const DragIcon = props => {

    const { itemID, index, profile, contentholderRef, scrollerID} = props

    let { masterDndContext } = props

    const viewportContext = useContext(ViewportContext)

    masterDndContext = masterDndContext ?? {} 

    const {dragData} = masterDndContext || {}

    let {dndDragIconStyles, dndOptions} = props

    dndDragIconStyles = dndDragIconStyles ?? {}
    dndOptions = dndOptions ?? {}

    const [ sourceData, sourceConnector, previewConnector ] = useDrag(() => {

        return {
            type:(dndOptions.type || 'Cell'), // must be defined

            item:{ 
                scrollerID,
                itemID, 
                index,
                profile,
            },

        collect: (monitor:DragSourceMonitor) => {

            return {
                item:monitor.getItem(),
                isDragging:!!monitor.isDragging(),
                // canDrop:monitor.canDrop()

            }

        },

        canDrag:true,

    }},[itemID, dndOptions])

    const 
        { isDragging } = sourceData,
        classname = 'rigs-source-highlight'

    // console.log('isDragging, dragData.isDragging',isDragging, dragData.isDragging)
    if (isDragging && !dragData.isDragging) {
        dragData.isDragging = isDragging
        dragData.itemID = itemID
        dragData.index = index
        dragData.dndOptions = dndOptions
        masterDndContext.setViewportState('startdragbar')
    }

    // TODO: use element.classList instead
    if (isDragging && !contentholderRef.current.classList.contains(classname)) {
        contentholderRef.current.classList.add(classname)
    }
    if (!isDragging && contentholderRef.current.classList.contains(classname)) {
        contentholderRef.current.classList.remove(classname)
    }

    useEffect(()=>{

        previewConnector(getEmptyImage(),{ captureDraggingState: true })

    },[])

    const iconstylesRef = useRef<CSSProperties>(
        {
            margin:'3px',
            opacity:0.6
        })

    const dragiconstylesRef = useRef<CSSProperties>(
        {...{
            position:'absolute',
            zIndex:'3',
            top:0,
            left:0,
            opacity:0.8,
            height:'32px',
            width:'32px',
        },...dndDragIconStyles})

    return <div data-type = 'dragicon' ref = { sourceConnector } style = {dragiconstylesRef.current}>

        <img style = {iconstylesRef.current} src={dragicon} />

    </div>
}

// =================[ end of dnd support ]=================

const defaultPlaceholderMessages = {
    loading:'(loading...)',
    retrieving:'(retrieving from cache)',
    null:'end of list',
    undefined:'host returned "undefined"',
    invalid:'invalid React element',
}

// core component
const CellFrame = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    cellMinHeight,
    cellMinWidth,
    layout,
    getItem,  // function provided by host
    getItemPack,
    listsize, // for feedback in placeholder
    placeholder, // optionally provided by host
    itemID, // session itemID
    index, // logical index in infinite list
    instanceID, // CellFrame session ID
    scrollerID, // scroller ID (for debugging)
    isTriggercell,
    placeholderFrameStyles,
    placeholderLinerStyles,
    placeholderErrorFrameStyles,
    placeholderErrorLinerStyles,
    dndDragIconStyles,
    placeholderMessages,
    usePlaceholder,
    gridstartstyle,
    parentframeRef,
    targetConnector,
    isDnd,
    frameRef,
    masterDndContext,
}) => {

    const scrollerDndContext = useContext(ScrollerDndContext)

    const coreConfigRef = useRef(null)
    coreConfigRef.current = {
        orientation,
        layout,
        cellWidth,
        cellHeight
    }

    // ----------------------[ setup ]----------------------

    const cradleContext = useContext(CradleContext)

    const { 
        cacheAPI, 
        scrollerPropertiesRef, // for the user content, if requested
        nullItemSetMaxListsize, // for internal notification of end-of-list
        itemExceptionCallback, // for notification to host of error
        IDLECALLBACK_TIMEOUT, // to optimize requestIdleCallback
        triggercellTriggerlinesRef,
    } = cradleContext
    
    // style change generates state refresh
    const stylesRef = useRef({})
    const holderStylesRef = useRef({})

    const placeholderMessagesRef = useRef(null)

   placeholderMessagesRef.current = useMemo(() => {

        const newMessages = {...defaultPlaceholderMessages,...placeholderMessages}

        return newMessages

    },[placeholderMessages])

    // processing state
    const [frameState, setFrameState] = useState('setup')
    const frameStateRef = useRef(null)
    frameStateRef.current = frameState

    // to track unmount interrupt
    const isMountedRef = useRef(true)
    // cache data
    const portalMetadataRef = useRef(null)
    // the placeholder to use
    const placeholderRef = useRef(null)
    // the session itemID to use; could be updated by parent
    const itemIDRef = useRef(null)
    itemIDRef.current = itemID
    const dndOptionsRef = useRef<GenericObject>(null)
    const cellFramePropertiesRef = useRef(null)

    const updateDndOptions = (dndOptions) => {
        dndOptionsRef.current = dndOptions
        setFrameState('updatedndoptions')
    }
    const isDndRef = useRef(isDnd)

    useEffect( () => {

        let enabled = dndOptionsRef.current?.enabled
        enabled = enabled ?? true
        const isLocalDnd = isDnd && enabled

        isDndRef.current = isLocalDnd 
    },[isDnd,dndOptionsRef.current?.enabled])

    cellFramePropertiesRef.current = {
        itemID,
        index,
        updateDndOptions,
    }
    // fetch error
    const errorRef = useRef(false)
    // placeholder message
    const messageRef = useRef(null)

    useEffect(()=>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }

    },[])

    const setDroppedBorder = () => {

        // console.log('droppedIndex, index',scrollerDndContext.droppedIndex,index)
        if (scrollerDndContext.droppedIndex == index) {
            // console.log('setting dropped class', index)
            scrollerDndContext.droppedIndex = null
            const classname = 'rigs-dropped-highlight'
            contentholderRef.current.classList.add(classname)
            setTimeout(()=>{
                // console.log('removing class')
                if (frameRef.current) contentholderRef.current.classList.remove(classname)
            },2000)
        }

    }

    // for unmount
    useEffect(()=>{

        setDroppedBorder()
        return () => {

            cancelidlecallback(requestIdleCallbackIdRef.current)

            cacheAPI.unregisterPendingPortal(index)

        }

    },[])

    // refresh content if itemID changes
    useLayoutEffect(()=>{

        if (frameStateRef.current == 'setup') return


        if (isMountedRef.current) {
            setDroppedBorder()
            setFrameState('getusercontent')
        }

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

        if (!usePlaceholder) return null        

        return placeholder?
            React.createElement(placeholder, 
                {index, listsize, message:messageRef.current, error:errorRef.current}):
            null
            
    },[
        index, 
        placeholder,
        listsize, 
        messageRef.current, 
        errorRef.current, 
        usePlaceholder
    ])

    placeholderRef.current = useMemo(()=>{

        if (!usePlaceholder) return null

        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder 
                    key = 'placeholder'
                    index = { index } 
                    listsize = { listsize } 
                    message = { messageRef.current }
                    error = { errorRef.current }
                    userFrameStyles = { placeholderFrameStyles }
                    userLinerStyles = { placeholderLinerStyles }
                    userErrorFrameStyles = { placeholderErrorFrameStyles }
                    userErrorLinerStyles = { placeholderErrorLinerStyles }
                />

        return placeholder

    }, [
        index, 
        customplaceholder, 
        listsize, 
        messageRef.current, 
        errorRef.current,
        usePlaceholder,
        placeholderFrameStyles,
        placeholderLinerStyles,
        placeholderErrorFrameStyles,
        placeholderErrorLinerStyles,
    ])

    // ---------------- [ requestidlecallback config ] ------------------------

    const requestidlecallback = // requestIdleCallback
        window['requestIdleCallback']?
            window['requestIdleCallback']:
            requestIdleCallback

    const cancelidlecallback = // cancelIdleCallback
        window['cancelIdleCallback']?
            window['cancelIdleCallback']:
            cancelIdleCallback

    const requestIdleCallbackIdRef = useRef(null)

    // --------------------[ processing ]-----------------

    // set styles
    useEffect(()=>{

        let newFrameStyles = getFrameStyles(
            orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, stylesRef.current)

        if (gridstartstyle) {
            newFrameStyles = {...newFrameStyles,...gridstartstyle}
        }
        
        const newHolderStyles = getContentHolderStyles(layout, orientation, cellMinWidth, cellMinHeight)

        if (isMountedRef.current) {

            stylesRef.current = newFrameStyles
            holderStylesRef.current = newHolderStyles

        }

    },[orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, gridstartstyle]) 

    const portalNodeRef = useRef(null)

    useLayoutEffect(() => {

        switch (frameState) {

            case 'setup': {

                setFrameState('working') // 'getusercontent' will be called

                break

            }

            case 'working': {

                setFrameState('getusercontent') // delay paint while working
                
                break

            }

            case 'getusercontent': {

                const itemID = itemIDRef.current
                const cached = cacheAPI.hasPortal(itemID)
                const {
                    layout,
                    orientation,
                    cellWidth,
                    cellHeight,
                } = coreConfigRef.current

                if (cached) {

                    messageRef.current = placeholderMessagesRef.current.retrieving

                    if (isMountedRef.current) {

                        // get cache data
                        portalMetadataRef.current = cacheAPI.getPortalMetadata(itemID)
                        Object.assign(portalMetadataRef.current.scrollerProperties,
                            {
                                cellFramePropertiesRef,
                                scrollerPropertiesRef
                            }
                        )
                        dndOptionsRef.current = portalMetadataRef.current.dndOptions
                        portalNodeRef.current = portalMetadataRef.current.portalNode
                        setContainerStyles(
                            portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                        setFrameState('retrieved')

                    }

                } else {

                    messageRef.current = placeholderMessagesRef.current.loading

                    // reserve space in the cache
                    cacheAPI.registerPendingPortal(index)

                    // enqueue the fetch
                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        let returnvalue, usercontent, dndOptions, profile, error
                        // process the fetch
                        try {

                            if (getItemPack) {

                                const itempack = getItemPack(index, itemID, 
                                    {
                                        accept:scrollerDndContext.dndOptions.accept
                                    }
                                );
                                ({ dndOptions, profile} = itempack)
                                dndOptionsRef.current = dndOptions
                                usercontent = await itempack.content

                            } else {

                                usercontent = await getItem(index, itemID)

                            }

                            if (usercontent === null) returnvalue = usercontent

                            if (usercontent === undefined) {

                                error = new Error(placeholderMessagesRef.current.undefined)

                            }

                        } catch(e) {

                            returnvalue = usercontent = undefined
                            error = e

                        }
                        // process the return value
                        if ((usercontent !== null) && (usercontent !== undefined)) {

                            const isValidElement = React.isValidElement(usercontent)
                            if (!isValidElement) {

                                returnvalue = usercontent
                                usercontent = undefined
                                error = new Error(placeholderMessagesRef.current.invalid)
                                
                            }

                        }

                        if (isMountedRef.current) {
                            // prepare the content
                            if ((usercontent !== null) && (usercontent !== undefined)) {

                                // if usercontent is otherwise disallowed, let error handling deal with it.
                                let content 
                                const scrollerProperties = {
                                    cellFramePropertiesRef,
                                    scrollerPropertiesRef,
                                }
                                let addinCount = 0
                                const addinProps:{scrollerProperties?:object, cacheAPI?:object} = {}
                                if (usercontent.props?.hasOwnProperty('scrollerProperties')) {
                                    addinProps.scrollerProperties = scrollerProperties
                                    addinCount++
                                }
                                if (usercontent.props?.hasOwnProperty('cacheAPI')) {
                                    addinProps.cacheAPI = cacheAPI.instance
                                    addinCount++
                                }
                                if (addinCount) {
                                    content = React.cloneElement(usercontent, addinProps)
                                } else {
                                    content = usercontent
                                }

                                const retval = portalMetadataRef.current = 
                                    await cacheAPI.createPortal(content, index, itemID, scrollerProperties, dndOptions, profile)

                                if (retval) {
                                
                                    portalNodeRef.current = portalMetadataRef.current.portalNode
                                    setContainerStyles(
                                        portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                                }

                                isMountedRef.current && setFrameState('inserting')

                            } else { // null or undefined; handle non-component value

                                cacheAPI.unregisterPendingPortal(index) // create portal failed

                                if (usercontent === null) {

                                    // truncate listsize at this index
                                    itemExceptionCallback && 
                                        itemExceptionCallback(
                                            index, itemID, returnvalue, 'cellFrame', 
                                                new Error(placeholderMessagesRef.current.null)
                                        )
                                    nullItemSetMaxListsize(index)

                                } else { // usercontent === undefined, meaning an error has occurred

                                    // change placeholder message to error message
                                    errorRef.current = error
                                    // notify the host
                                    itemExceptionCallback && 
                                        itemExceptionCallback(
                                            index, itemID, returnvalue, 'cellFrame', error
                                        )

                                    isMountedRef.current && setFrameState('error')
                                }

                            }

                        }

                    },{timeout:IDLECALLBACK_TIMEOUT})

                }

                break
            }

            case 'inserting':
            case 'updatedndoptions':
            case 'retrieved': {

                setFrameState('ready')

                break

            }

        }

    }, [frameState])

    const contentholderRef = useRef(null)

    // console.log('index, contentholderRef','-'+ index + '-',contentholderRef)

    return <div 

        ref = {(r) => {
            targetConnector(r)
            frameRef.current = r
        }}
        data-type = 'cellframe' 
        data-scrollerid = { scrollerID } 
        data-index = { index } 
        data-instanceid = { instanceID } 
        style = { stylesRef.current }
    >
        {(frameState != 'setup')
            ?<>
                <div data-type = 'contentholder' ref = {contentholderRef} style = {holderStylesRef.current}> 
                    {((frameState != 'ready')?
                    placeholderRef.current:
                    <OutPortal key = 'portal' node = { portalNodeRef.current }/>)}
                </div>

                {(isDndRef.current && (frameState == 'ready')) && 
                    <DragIcon 
                        contentholderRef = {contentholderRef} 
                        itemID = {itemID} 
                        index = {index} 
                        dndOptions = {dndOptionsRef.current} 
                        profile = {portalMetadataRef.current.profile} 
                        dndDragIconStyles = {dndDragIconStyles}
                        scrollerID = { scrollerID }
                        masterDndContext = {masterDndContext}
                    />
                }

            </>

            :<div></div>}

        {(isTriggercell?
            triggercellTriggerlinesRef.current:
            null)
        }

    </div>

} // CellFrame
// export default CellFrame

// utilities
const getFrameStyles = 
    (orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, styles) => {

    const styleset = {...styles,position:'relative', overflow:'visible'}

    if (orientation === 'vertical') {

        styleset.width = null
        if (layout == 'uniform') {

            styleset.height = cellHeight + 'px'
            styleset.minHeight = null
            styleset.maxHeight = null

        } else { // 'variable'

            styleset.height = null
            styleset.minHeight = cellMinHeight + 'px'
            styleset.maxHeight = cellHeight + 'px'

        }
        
    } else { // 'horizontal'

        styleset.height = null
        if (layout == 'uniform') {

            styleset.width = cellWidth + 'px'
            styleset.minWidth = null
            styleset.maxWidth = null

        } else { // 'variable'

            styleset.width = null
            styleset.minWidth = cellMinWidth + 'px'
            styleset.maxWidth = cellWidth + 'px'

        }

    }

    return styleset

}

const getContentHolderStyles = (layout,orientation,cellMinWidth, cellMinHeight ) => {
    let styles:CSSProperties = {}
    if (layout == 'uniform') {
        styles = {
            inset:'0px',
            position:'absolute',
            height:null,
            width:null,
            minWidth:null,
            minHeight:null,
        }
    } else { // variable
        styles.inset = null
        styles.position = null
        if (orientation == 'vertical') {
            styles.width = '100%'
            styles.height = null
            styles.minWidth = null
            styles.minHeight = cellMinHeight + 'px'
        } else {
            styles.width = null
            styles.height = '100%'
            styles.minWidth = cellMinWidth + 'px'
            styles.minHeight = null
        }
    }
    return styles
}

// see also some base styles set in cacheAPI
const setContainerStyles = (container, layout, orientation, cellWidth, cellHeight) => {

    // container.style.overflow = 'hidden'

    if (layout == 'uniform') {

        container.style.inset = '0px' 
        container.style.position = 'absolute'
        container.style.maxWidth = null
        container.style.maxHeight = null
        container.style.height = null
        container.style.width = null

    } else { // variable

        container.style.inset = null 
        container.style.position = null

        if (orientation == 'vertical') {

            container.style.width = '100%'
            container.style.height = null
            container.style.maxWidth = null
            container.style.maxHeight = cellHeight + 'px'

        } else {

            container.style.width = null
            container.style.height = '100%'
            container.style.maxWidth = cellWidth + 'px'
            container.style.maxHeight = null

        }

    }
}

