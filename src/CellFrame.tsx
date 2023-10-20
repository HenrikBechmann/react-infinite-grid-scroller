// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of CellFrame is to fetch user content from the cache, or from the host (using getItem).
    While an item is being fetched, CellFrame presents a placeholder (either the default or an 
    imported custom version). If there is an error in fetching content then the placeholder is used
    to present the error to the user. If a new itemID is set by the parent (to synchronize with an altered
    cache), then CellFrame replaces the old item with the new item.

    getItemPack (which is a function provided by the host) can return one of several values:
        - a React component
        - a promise of a component
        - null
        - undefined
    Anything else is treated as an error

    if a promise is returned, then the promise returns a React component, null or undefined.

    If a valid react component is returned from getItemPack, then it is instantiated in the cache, and rendered in the
    CellFrame. If null is returned, then CellFrame sends a message to its scroller that the host has 
    indicated the the item being fetched instead represents the end of the list, and the listsize should
    be adjusted accordingly. Any other value that is returned is treated as an error, and presented
    as such to the user through the placeholder component.

    getItemPack sends the index (logical index in the list) and a session itemID to the host, so that
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

import Placeholder from './CellFrame/Placeholder' // default
import './InfiniteGridScroller/rigs.css'

// import { ViewportContext } from './Viewport'
import DndCellFrame from './CellFrame/DndCellFrame'

import { getFrameStyles, getContentHolderStyles, setContainerStyles } from './CellFrame/cellfunctions'

import { CradleContext } from './Cradle'
import { MasterDndContext, ScrollerDndContext, GenericObject } from './InfiniteGridScroller'
// =====================[ dnd support ]====================

import DndDragIcon from './CellFrame/DndDragIcon'
import DndDisplaceIcon from './CellFrame/DndDisplaceIcon'

// called to choose between dnd or no dnd for CellFrame
const CellFrameController = props => {

    const 
        scrollerDndContext = useContext(ScrollerDndContext),
        masterDndContext = useContext(MasterDndContext)

    // console.log('CellFrameController: masterDndContext.installed && scrollerDndContext.dndOptions.enabled\n',
    //     props.scrollerID, masterDndContext.installed, scrollerDndContext.dndOptions.enabled)

    if (masterDndContext.installed && scrollerDndContext.dndOptions.enabled) {

        return <DndCellFrame {...props}/>

    } else {

        const 
            contentHolderElementRef = useRef(null),
            enhancedProps  = {...props, contentHolderElementRef, isDndEnabled:false }

        return <CellFrame {...enhancedProps} />

    }

}

export default CellFrameController

// provide targetConnector source when not required for DnD
// const CellFrameWrapper = (props) => {

//     const 
//         targetConnector = (element) => {}, // no-op
//         frameRef = useRef(null),

//         enhancedProps = {...props, isDndEnabled:false }

//     return <CellFrame {...enhancedProps}/>
// } 

// =================[ end of dnd support ]=================

const defaultPlaceholderMessages = {
    loading:'(loading...)',
    retrieving:'(retrieving from cache)',
    null:'end of list',
    undefined:'host returned "undefined"',
    invalid:'invalid React element',
}

// core component
export const CellFrame = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    cellMinHeight,
    cellMinWidth,
    layout,
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
    isDndEnabled,
    frameRef,
    contentHolderElementRef,
    showDndDisplaceIcon,
    setDndCellFrameState,
}) => {

    const 
        scrollerDndContext = useContext(ScrollerDndContext),
        masterDndContext = useContext(MasterDndContext),

        coreConfigRef = useRef(null)

    coreConfigRef.current = {
        orientation,
        layout,
        cellWidth,
        cellHeight
    }

    // ----------------------[ setup ]----------------------

    const 
        cradleContext = useContext(CradleContext),
        { 
            cacheAPI, 
            scrollerPropertiesRef, // for the user content, if requested
            itemExceptionCallback, // for notification to host of error
            IDLECALLBACK_TIMEOUT, // to optimize requestIdleCallback
            triggercellTriggerlinesRef,
        } = cradleContext,
        // style change generates state refresh
        stylesRef = useRef({}),
        holderStylesRef = useRef({}),
        placeholderMessagesRef = useRef(null)

   placeholderMessagesRef.current = useMemo(() => {

        const newMessages = {...defaultPlaceholderMessages,...placeholderMessages}

        return newMessages

    },[placeholderMessages])

    // processing state
    const 
        [frameState, setFrameState] = useState('setup'),
        frameStateRef = useRef(null)

    frameStateRef.current = frameState

    // to track unmount interrupt
    const 
        isMountedRef = useRef(true),
        // cache data
        portalMetadataRef = useRef(null),
        // the placeholder to use
        placeholderRef = useRef(null),
        // the session itemID to use; could be updated by parent
        itemIDRef = useRef(null)

    itemIDRef.current = itemID

    const 
        dndOptionsRef = useRef<GenericObject>(null),
        cellFramePropertiesRef = useRef(null),
        isDndEnabledRef = useRef(isDndEnabled)

    // useEffect( () => {

    //     let enabled = dndOptionsRef.current?.enabled
    //     enabled = enabled ?? true
    //     const isLocalDnd = isDnd && enabled

    //     isDndRef.current = isLocalDnd 
    // },[isDnd,dndOptionsRef.current?.enabled])

    cellFramePropertiesRef.current = {
        itemID,
        index,
        // updateDndOptions,
    }
    // fetch error
    const 
        errorRef = useRef(false),
        // placeholder message
        messageRef = useRef(null)

    useEffect(()=>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }

    },[])

    const setDroppedBorder = () => {

        setTimeout(()=>{ // for dnd CellFrame could cross axis and lose element (about to be replaced)

            if (scrollerDndContext.droppedIndex === index) {

                const classname = 'rigs-dropped-highlight'

                if (contentHolderElementRef?.current) { // may have crossed axis
                    scrollerDndContext.droppedIndex = null
                    contentHolderElementRef.current.classList.add(classname)
                    setTimeout(()=>{
                        if (contentHolderElementRef?.current) contentHolderElementRef.current.classList.remove(classname)
                    },2000)
    
                }

            }
        },100)

    }

    const setDisplacedBorder = () => {

        if (scrollerDndContext.displacedIndex === index) {
            scrollerDndContext.displacedIndex = null
            const classname = 'rigs-target-finish'
            contentHolderElementRef.current.classList.add(classname)
            setTimeout(()=>{
                if (frameRef?.current) contentHolderElementRef.current.classList.remove(classname)
            },2000)
        }

    }

    // for unmount
    useEffect(()=>{

        // setDroppedBorder()
        return () => {

            cancelidlecallback(requestIdleCallbackIdRef.current)

            cacheAPI.unregisterPendingPortal(index)

        }

    },[])

    useEffect(()=>{

        if (['inserting','retrieved'].includes(frameState)) {
            setDroppedBorder()
            setDisplacedBorder()
        }

    },[frameState])

    // refresh content if itemID changes
    useLayoutEffect(()=>{

        if (frameStateRef.current == 'setup') return


        if (isMountedRef.current) {
            setFrameState('getusercontent')
        }

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

        if (!usePlaceholder) return null

        const 
            dndEnabled = scrollerDndContext.dndOptions?.enabled

        return placeholder
            ?React.createElement(placeholder, 
                {index, listsize, message:messageRef.current, error:errorRef.current, dndEnabled})
            :null
            
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
            customplaceholder
                ?customplaceholder
                :<Placeholder 
                    key = 'placeholder'
                    index = { index } 
                    listsize = { listsize } 
                    message = { messageRef.current }
                    error = { errorRef.current }
                    dndEnabled = {scrollerDndContext.dndOptions?.enabled}
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
        window['requestIdleCallback']
            ?window['requestIdleCallback']
            :requestIdleCallback

    const cancelidlecallback = // cancelIdleCallback
        window['cancelIdleCallback']
            ?window['cancelIdleCallback']
            :cancelIdleCallback

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

                const 
                    itemID = itemIDRef.current,
                    cached = cacheAPI.hasPortal(itemID),
                    {
                        layout,
                        orientation,
                        cellWidth,
                        cellHeight,
                    } = coreConfigRef.current

                if (cached) {

                    // console.log('retrieving from cache: itemID', itemID)

                    messageRef.current = placeholderMessagesRef.current.retrieving

                    if (isMountedRef.current) {

                        // get cache data
                        portalMetadataRef.current = cacheAPI.getPortalMetadata(itemID)
                        Object.assign(portalMetadataRef.current.scrollerContext,
                            {
                                cell:cellFramePropertiesRef,
                                scroller:scrollerPropertiesRef
                            }
                        )
                        dndOptionsRef.current = portalMetadataRef.current.dndOptions
                        portalNodeRef.current = portalMetadataRef.current.portalNode
                        setContainerStyles(
                            portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                        setFrameState('retrieved')

                    }

                } else {

                    // console.log('fetching new: itemID',itemID)

                    messageRef.current = placeholderMessagesRef.current.loading

                    // reserve space in the cache
                    cacheAPI.registerPendingPortal(index)

                    // enqueue the fetch
                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        let returnvalue, usercontent, dndOptions, profile, error, itempack
                        // process the fetch
                        try {

                            if (getItemPack) {

                                let context:GenericObject;
                                if (masterDndContext.installed 
                                    && scrollerDndContext.dndFetchIndex === index) {

                                    context = {

                                        contextType:'dndFetchRequest',
                                        accept:scrollerDndContext.dndOptions.accept,
                                        scrollerID,
                                        scrollerProfile:cradleContext.scrollerProfile,
                                        item:scrollerDndContext.dndFetchItem,

                                    }

                                    // console.log('dndFetchRequest',context)

                                    scrollerDndContext.dndFetchIndex = null
                                    scrollerDndContext.dndFetchItem = null

                                } else if (masterDndContext.installed) {


                                    context = {

                                        contextType:'dndFetch',
                                        accept:scrollerDndContext.dndOptions.accept,
                                        scrollerID,
                                        scrollerProfile:cradleContext.scrollerProfile,

                                    }

                                } else {

                                    // console.log('fetch cradleContext',cradleContext)
                                    context = {

                                        contextType:'fetch',
                                        scrollerProfile:cradleContext.scrollerProfile,
                                        scrollerID,
                                        
                                    }

                                }

                                itempack = await getItemPack(index, itemID, context);
                                ({ dndOptions, profile} = itempack)
                                dndOptions = dndOptions ?? {}
                                profile = profile ?? {}
                                dndOptionsRef.current = dndOptions
                                usercontent = await itempack.component

                            }
                            if (usercontent === null || usercontent === undefined) {

                                if (usercontent === null) usercontent === undefined
                                    
                                error = new Error(placeholderMessagesRef.current.undefined)

                            }

                        } catch(e) {

                            returnvalue = usercontent = undefined
                            if (!itempack) {
                                // console.log('error', e)
                                error = new Error ('no data ( ' + e.message +')')
                            } else {
                                error = e
                            }

                        }
                        // process the return value
                        if (usercontent !== undefined) {

                            const isValidElement = React.isValidElement(usercontent)
                            if (!isValidElement) {

                                returnvalue = usercontent
                                usercontent = undefined
                                error = new Error(placeholderMessagesRef.current.invalid)
                                
                            }

                        }

                        if (isMountedRef.current) {
                            // prepare the component
                            if (usercontent !== undefined) {

                                // if usercontent is otherwise disallowed, let error handling deal with it.
                                let component 
                                const scrollerContext = {
                                    cell:cellFramePropertiesRef,
                                    scroller:scrollerPropertiesRef,
                                }
                                let addinCount = 0
                                const addinProps:{scrollerContext?:object, cacheAPI?:object} = {}
                                if (usercontent.props?.hasOwnProperty('scrollerContext')) {
                                    addinProps.scrollerContext = scrollerContext
                                    addinCount++
                                }
                                if (usercontent.props?.hasOwnProperty('cacheAPI')) {
                                    addinProps.cacheAPI = cacheAPI.instance
                                    addinCount++
                                }
                                if (addinCount) {
                                    component = React.cloneElement(usercontent, addinProps)
                                } else {
                                    component = usercontent
                                }

                                portalMetadataRef.current = 
                                    await cacheAPI.createPortal(component, index, itemID, scrollerContext, dndOptions, profile)

                                if (portalMetadataRef.current) {
                                
                                    portalNodeRef.current = portalMetadataRef.current.portalNode
                                    setContainerStyles(
                                        portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                                }

                                isMountedRef.current && setFrameState('inserting')

                            } else { // undefined; handle non-component value

                                cacheAPI.unregisterPendingPortal(index) // create portal failed

                                // change placeholder message to error message
                                errorRef.current = error
                                // notify the host
                                itemExceptionCallback 
                                    && itemExceptionCallback(
                                        index, {
                                            contextType: 'itemException',
                                            itemID, 
                                            scrollerID,
                                            profile, 
                                            dndOptions,
                                            component:returnvalue, 
                                            action:'fetch', 
                                            error:error.message
                                        }
                                    )

                                isMountedRef.current && setFrameState('nodata')

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

    // const contentHolderElementRef = useRef(null)

    return <div 

        ref = { frameRef }
        data-type = 'cellframe' 
        data-scrollerid = { scrollerID } 
        data-index = { index } 
        data-instanceid = { instanceID } 
        style = { stylesRef.current }
    >
        {(frameState != 'setup')
            ?<>
                <div data-type = 'contentholder' ref = {contentHolderElementRef} style = {holderStylesRef.current}> 
                    {((frameState != 'ready')
                        ?placeholderRef.current
                        :<OutPortal key = 'portal' node = { portalNodeRef.current }/>)}
                </div>

                {(isDndEnabledRef.current 
                    && (['ready','nodata'].includes(frameState))) 
                    && <DndDragIcon 
                        contentHolderElementRef = {contentHolderElementRef} 
                        itemID = {itemID} 
                        index = {index} 
                        setDndCellFrameState = { setDndCellFrameState }
                        dndOptions = {dndOptionsRef.current} 
                        profile = {portalMetadataRef.current?.profile} 
                        dndDragIconStyles = {dndDragIconStyles}
                        scrollerID = { scrollerID }
                    />
                }
            </>

            :<div></div>}

        {(isTriggercell
            ?triggercellTriggerlinesRef.current
            :null)
        }
        {(isDndEnabledRef.current 
            && showDndDisplaceIcon 
            && (['ready','nodata'].includes(frameState))) 
            && <DndDisplaceIcon orientation = {orientation} scrollerID = {scrollerID} index = {index} />
        }
    </div>

} 
