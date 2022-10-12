// cachehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module manages the InfiniteGridScroller limited (sparse) cache. It also provides support for 
    services which allow the host to actively manage many aspects of the cache. See documentation
    about the user functionsCallback callback for details. Note that overly large caches of complex components
    can impair performance. This can be optimized with the cacheMax property.

    The infinite grid scroller stores user cell content (components) in a central hidden portal cache 
    for each InfiniteGridScroller root, from whence the components are pulled into the relevant CellFrames 
    for display. The user components are stored in React portals, with each portal instantiated in
    a container div ('portalwrapper'). These container divs are included in a standard React component 
    list in the real DOM. The contained portals themselves are not part of the real DOM, but are part of 
    React's virtual DOM.

    See https://reactjs.org/docs/portals.html for general information about React portals.
    See https://www.npmjs.com/package/react-reverse-portal for the utility that InfiniteGridScroller
    uses to manage portals.

    This caching has many advantages, notably the ability to move cells back and forth between the
    head and tail grids of the Cradle without losing state, and the ability to maintain state for 
    complex components which move beyond the scope of the content of the Cradle. But there is an
    important side effect.

    Instantiated components which are removed from the real DOM (into the portal of the virtual DOM)
    have their scroll positions, width, and height set to zero. Therefore if components rely on these 
    values for configuration, they must have a way of storing values in state (notably the 
    Scroll Pos - scrollLeft or scrollTop), recognizing when the component comes out of the portal cache 
    into the real DOM (width and height are typically no longer both 0), and responding to change in 
    cache state appropriately.

    Tips:
        - your component is in cache when both width and height = 0
        - your component is out of cache when both width and height are back to normal
        - if you create an empty 'scrollerProperties' property for your component, CellFrame will
            set it to an object containing isReparentingRef and scrollerPropertiesRef
        - isReparentingRef.current provides an up-to-date boolean indicating whether the component is 
            currently being 'reparented' into the real DOM. Set the value back to false once you've 
            detected it. After reparenting (after the width and height are back to normal) is when
            you should restore scrollPos (scrollTop or scrollLeft) to what it was.
        - if your component does not scroll, there should be no issues.
*/

import React, {useState, useEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

let globalItemID = 0

// global scroller data, organized by session scrollerID
// the cache itself is maintained in the root infinitegridscroller component
export class CacheHandler {

    constructor(scrollerID, setListsize, listsizeRef) {
        this.cacheProps.scrollerID = scrollerID
        this.setListsize = setListsize // passed from infinitegridscroller setListsize(listsize)
        this.listsizeRef = listsizeRef
    }

    cacheProps = {
        setListState:null,
        modified:false,

        metadataMap:new Map(), // item => {index, component}
        // some portals may have been requested by requestidlecallback, not yet created
        requestedSet:new Set(), // requestedSet of indexes
        portalMap:new Map(), // index => InPortal
        indexToItemIDMap:new Map(),

        portalList:null,

        scrollerID:null
    }

    cradleParameters

    portalHoldList

    listsizeRef

    // setListsize(listsize) causes an InfiniteGridScroller useState update
    // of the listsize throughout
    setListsize 

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------------[ basic operations ]--------------------------

    changeListsize = (newlistsize, deleteListCallback, changeListsizeCallback) => {

        this.setListsize(newlistsize)

        // match cache to newlistsize
        const portalIndexMap = this.cacheProps.indexToItemIDMap
        const mapkeysList = Array.from(portalIndexMap.keys())
        mapkeysList.sort((a,b) => a - b)

        const highestindex = mapkeysList.at(-1)

        if (highestindex > (newlistsize -1)) { // pare the cache

            const parelist = mapkeysList.filter((index)=>{
                return index > (newlistsize -1)
            })

            this.deletePortal(parelist, deleteListCallback)

        }

        changeListsizeCallback && changeListsizeCallback(newlistsize)

    }

    clearCache = () => {

        // keep the setListState callback
        this.cacheProps.portalMap.clear() 
        this.cacheProps.metadataMap.clear()
        this.cacheProps.indexToItemIDMap.clear()
        this.cacheProps.requestedSet.clear()
        this.cacheProps.portalList = null
        this.cacheProps.modified = true

        this.renderPortalList() // trigger display update

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = () => {

        if (this.cacheProps.modified) {
            this.cacheProps.portalList = Array.from(this.cacheProps.portalMap.values())
            this.cacheProps.modified = false
        }

        this.cacheProps.setListState() // trigger display update

    }

    // ----------------------[ cache size limit enforceent ]------------------

    matchCacheToCradle = (cradleIndexList, deleteListCallback) => {

        const mapkeys = Array.from(this.cacheProps.indexToItemIDMap.keys())

        const delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.deletePortal(delkeys, deleteListCallback)
            return true

        } else {

            return false

        }

    }

    pareCacheToMax = (cacheMax, cradleIndexList, deleteListCallback, scrollerID = undefined) => {

        const modelLength = cradleIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const max = Math.max(modelLength, cacheMax)

        const portalIndexList = this.cacheProps.indexToItemIDMap,
            requestedSet = this.cacheProps.requestedSet

        if ((portalIndexList.size + requestedSet.size) <= max) return false

        // sort the map keys
        const mapkeyslist = Array.from(portalIndexList.keys()),
            requestedkeys = Array.from(requestedSet.keys())

        const mapkeys = [...mapkeyslist,...requestedkeys]

        mapkeys.sort((a,b) => a - b)

        // get number to pare
        const mapLength = mapkeys.length,
            parecount = mapLength - max

        // distribute paring proportionally at front and back
        const headindex = cradleIndexList[0],
            tailindex = cradleIndexList[modelLength - 1],
            headpos = mapkeys.indexOf(headindex),
            tailpos = mapkeys.indexOf(tailindex)

        const headroom = headpos,
            tailroom = mapLength - (tailpos + 1),
            pareroom = headroom + tailroom

        const headparecount = Math.floor((headroom/pareroom)*parecount),
            tailparecount = parecount - headparecount

        // collect indexes to pare
        const headlist = mapkeys.slice(0,headparecount),
            taillist = mapkeys.slice(mapLength - tailparecount)

        const delList = [...headlist,...taillist]

        this.deletePortal(delList, deleteListCallback)

        return true

    }

    guardAgainstRunawayCaching = (cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {

        if (!cacheMax) return false

        const {
            portalMap,
            requestedSet 
        } = this.cacheProps

        const max = Math.max(cradleListLength, cacheMax)

        if ((portalMap.size + requestedSet.size) <= ((max) * MAX_CACHE_OVER_RUN)) {

            return false

        } else {

            return true

        }

    }

    // --------------------------------[ preload ]--------------------------------

    preload(finalCallback, nullItemSetMaxListsize, scrollerID) {

        const { cradleParameters } = this

        const { scrollerPropertiesRef } = cradleParameters

        const { stateHandler, serviceHandler } = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current

        const { getItem, cacheMax } = cradleInheritedProperties,
            { listsize } = cradleInternalProperties

        const promises = []

        let cacheSize = cacheMax ?? 0

        cacheSize = Math.min(cacheSize, listsize)

        const preloadsize = 
            cacheSize?
                cacheSize:
                listsize

        const breakloop = {
            current:false
        }

        const maxListsizeInterrupt = (index) => {
            breakloop.current = true
            nullItemSetMaxListsize(index)
        }

        // serviceHandler.callbacks.preloadIndexCallback
        if (stateHandler.isMountedRef.current) {
            
            const indexToItemIDMap = this.cacheProps.indexToItemIDMap

            const { preloadIndexCallback, itemExceptionCallback } = serviceHandler.callbacks

            for (let index = 0; index < preloadsize; index++) {

                preloadIndexCallback && preloadIndexCallback(index)
                if (!indexToItemIDMap.has(index)) {

                    const promise = this.preloadItem(
                        index, 
                        getItem, 
                        scrollerPropertiesRef,
                        itemExceptionCallback,
                        maxListsizeInterrupt,
                        scrollerID
                    )
                    promises.push(promise)

                }

                if (breakloop.current) break
            }
        }

        Promise.allSettled(promises).then(
            ()=>{
                this.cacheProps.modified = true
                this.renderPortalList()
                finalCallback()
            }
        )

    }

    // =========================[ SNAPSHOTS ]=========================

    getCacheIndexMap() {

        return new Map(this.cacheProps.indexToItemIDMap)

    }

    getCradleIndexMap(cradleIndexList) {

        const cradleMap = new Map(),
            { indexToItemIDMap } = this.cacheProps

        for (const index of cradleIndexList) {

            cradleMap.set(index, indexToItemIDMap.get(index))

        }

        return cradleMap

    }

    getCacheItemMap() {

        const cachelist = new Map()

        for (const [key, value] of this.cacheProps.metadataMap) {
            const {
                index,
                component,
            } = value

            cachelist.set(key,{
                index,
                component,
            })

        }

        return cachelist

    }

    // ==========================[ SERVICE SUPPORT ]=========================

    // move is coerced by servicehandler to be within current list bounds
    moveIndex(toindex, fromindex, fromhighindex ) {

        const {indexToItemIDMap,metadataMap} = this.cacheProps

        // ----------- define parameters ---------------

        const rangeabsoluteincrement = fromhighindex - fromindex + 1,
            movedirectionalincrement = toindex - fromindex,
            tohighindex = toindex + (rangeabsoluteincrement - 1)

        const shiftdirection = 
            (movedirectionalincrement > 0)? // move up in list
                -1: // shift down, make room for shiftingindex above
                1   // shift up, make room for shiftingindex below

        const orderedindexlist = Array.from(indexToItemIDMap.keys())
        orderedindexlist.sort((a,b)=>a-b)

        const toindexptr = orderedindexlist.findIndex(value => value >= toindex),
            tohighindexptr = orderedindexlist.findIndex(value => value >= tohighindex),
            fromindexptr = orderedindexlist.findIndex(value => value >= fromindex),
            fromhighindexptr = orderedindexlist.findIndex(value => value >= fromhighindex)

        // ---------------- capture index data to move ----------------

        let processtomoveList
        if ((fromindexptr == -1) && (fromhighindexptr == -1)) { // scope is out of view

            processtomoveList = []

        } else if (fromhighindexptr == -1) { // scope is partially in view

            processtomoveList = orderedindexlist.slice(fromindexptr)

        } else { // scope is entirely in view

            processtomoveList = orderedindexlist.slice(fromindexptr, fromhighindexptr + 1)

        }

        const processtomoveMap = new Map()
        const capturemoveindex = (index) => {

            processtomoveMap.set(index, indexToItemIDMap.get(index))

        }

        processtomoveList.forEach(capturemoveindex)

        // ------------- get list of indexes to shift out of the way ---------------
        
        let processtoshiftList
        if (shiftdirection == 1) { // block is moving down, shift is up; toindex < fromindex

            if ((toindexptr == -1) && (fromindexptr == -1)) {

                processtoshiftList = []

            } else if (fromindexptr == -1) {

                processtoshiftList = orderedindexlist.slice(toindexptr)

            } else {

                processtoshiftList = orderedindexlist.slice(toindexptr, fromindexptr)

            }

        } else { // shiftdirection == -1; block is moving up, shift is down; fromindex < toindex

            if (tohighindexptr == -1 && fromhighindexptr == -1) {

                processtoshiftList = []

            } else if (tohighindexptr == -1) {

                processtoshiftList = orderedindexlist.slice(fromhighindexptr + 1)

            } else {

                processtoshiftList = orderedindexlist.slice(fromhighindexptr + 1, tohighindexptr + 1)

            }
        }

        if (shiftdirection == 1) processtoshiftList.reverse()

        // -------------- move indexes out of the way --------------

        const processedshiftList = []
        const processshiftindex = (index) => {

            const itemID = indexToItemIDMap.get(index)

            const newIndex = 
                (shiftdirection == -1)?
                    index - rangeabsoluteincrement:
                    index + rangeabsoluteincrement

            indexToItemIDMap.set(newIndex,itemID)
            metadataMap.get(itemID).index = newIndex
            processedshiftList.push(newIndex)

        }

        processtoshiftList.forEach(processshiftindex)

        // ------------ replace shifted index space with moved indexes ----------

        const processedmoveList = []
        const processmoveindex = (itemID, index) => {
            const newIndex = index + movedirectionalincrement // swap

            indexToItemIDMap.set(newIndex, itemID)
            metadataMap.get(itemID).index = newIndex
            processedmoveList.push(newIndex)

        }

        processtomoveMap.forEach(processmoveindex)

        // -----------return list of processed indexes to caller --------
        // for synchrnization with cradle cellFrames

        const processedIndexes = [...processedshiftList,...processedmoveList]

        return processedIndexes

    }

    // insert or remove indexes: much of this deals with the fact that the cache is sparse.
    insertRemoveIndex(index, highrange, increment, listsize) { // increment is +1 or -1

        const { indexToItemIDMap, metadataMap, portalMap } = this.cacheProps

        // ---------- define range parameters ---------------

        // high range is the highest index number of the insert/remove operation
        let highrangeindex = highrange ?? 0

        highrangeindex = 
            (highrangeindex > index)?
                highrangeindex:
                index

        const emptyreturn = [[],[],0]
        if (increment == -1) {

            // removal must be entirely within scope of the list
            if (highrangeindex > (listsize - 1)) return emptyreturn

        } else {

            // addition can at most start at the next index above the current list
            if (index > listsize) return emptyreturn

        }

        // rangecount is the absolute number in the insert/remove range - contiguous
        const rangecount = highrangeindex - index + 1

        // range increment adds sign to rangecount to indicate add/remove
        const rangeincrement = rangecount * increment

        // highPtr, lowPtr, shrinktoPtr within orderedIndexList.
        const orderedIndexList = Array.from(indexToItemIDMap.keys())
        orderedIndexList.sort((a,b)=>a-b)

        // ---------- define boundaries within ordered cache index list ------------
        // Ptr = index into array, as opposed to index of virtual list

        // shrinkptr is the location of the bottom of the shrink range for removals
        let shrinktoIndex = null
        let shrinktoPtr = - 1
        
        if (increment == - 1) {
            
            shrinktoIndex = orderedIndexList.at(-1) + (rangeincrement)

            shrinktoIndex = Math.max(highrangeindex + (rangeincrement), shrinktoIndex)

            shrinktoIndex = Math.min(listsize - 1,shrinktoIndex) 

            shrinktoPtr = orderedIndexList.findIndex(value => value >= shrinktoIndex)

        }

        // lowPtr and highPtr must be within low and high range
        const lowPtr = orderedIndexList.findIndex(value => {

            return (value >= index) && (value <= highrangeindex)

        })

        const reverseIndexList = Array.from(orderedIndexList)
        reverseIndexList.reverse()
        let highPtr = reverseIndexList.findIndex(value=> {

            return value <= highrangeindex

        })
        if (highPtr != -1) {
            highPtr = (orderedIndexList.length - 1) - highPtr
            if (highPtr < lowPtr) highPtr = -1
        }

        // ----------- list indexes to process, replace, and remove, and items to remove --------

        let indexesToProcessList, // for either insert or remove
            indexesToReplaceList = [], // for insert the range being inserted
            indexesToRemoveList = [], // for remove - end of list; the list is shrinking
            indexesOfItemsToRemoveList= [], // for remove - within the range of indexes being removed
            itemsToRemoveList = [] // for remove, derived from the previous

        // get indexesToProcessList
        if ((lowPtr == -1) && (highPtr == -1)) { // core scope is out of view

            indexesToProcessList = []

        } else { // core scope is partially or fully in view; lowPtr is available

            if (increment == 1) {

                indexesToProcessList = orderedIndexList.slice(lowPtr)

            } else if (highPtr == -1) { // increment == -1; lowPtr is available

                indexesToProcessList = []

            } else { // increment == -1; lowPtr and highPtr are available

                indexesToProcessList = orderedIndexList.slice(highPtr + 1)

            }

        }

        const portalHoldList = [] // hold portals for deletion until after after cradle synch

        if (increment == 1) {

            // get indexesToReplaceList
            if ((lowPtr == -1) && (highPtr == -1)) { // core scope is out of view

                indexesToReplaceList = []

            } else if (highPtr == -1) {

                indexesToReplaceList = orderedIndexList.slice(lowPtr)

            } else {

                indexesToReplaceList = orderedIndexList.slice(lowPtr, highPtr + 1)
            }

        } else {

            // get indexesToRemoveList
            if (shrinktoPtr == -1) { // core scope is out of view

                indexesToRemoveList = []

            } else {

                indexesToRemoveList = orderedIndexList.slice(shrinktoPtr + 1)
            }

            // get indexesOfItemsToRemoveList
            if ((lowPtr == -1) && (highPtr == -1)) { // core scope is out of view

                indexesOfItemsToRemoveList = []

            } else if (highPtr == -1) {

                indexesOfItemsToRemoveList = orderedIndexList.slice(lowPtr)

            } else {

                indexesOfItemsToRemoveList = orderedIndexList.slice(lowPtr, highPtr + 1)

            }

            // get itemsToRemoveList
            for (const index of indexesOfItemsToRemoveList) {

                itemsToRemoveList.push(indexToItemIDMap.get(index))

            }

        }

        // ----------- conduct cache operations ----------

        // increment higher from top of list to preserve lower values for subsequent increment
        if (increment == 1) indexesToProcessList.reverse() 

        const indexesModifiedList = []

        // modify index-to-itemid map, and metadata map
        const processIndex = index => {

            const itemID = indexToItemIDMap.get(index)
            const newIndex = index + rangeincrement

            indexToItemIDMap.set(newIndex, itemID)
            metadataMap.get(itemID).index = newIndex
            indexesModifiedList.push(newIndex)

        }

        indexesToProcessList.forEach(processIndex)

        // delete remaining indexes and items now duplicates

        if (increment == 1) {

            for (const index of indexesToReplaceList) {
                
                indexToItemIDMap.delete(index)

            }

        } else {

            for (const index of indexesToRemoveList) {

                indexToItemIDMap.delete(index)

            }

            for (const itemID of itemsToRemoveList) {

                metadataMap.delete(itemID)
                portalHoldList.push(itemID)

            }

        }

        // --------------- returns ---------------

        // return values for caller to send to contenthandler for cradle synchronization
        return [indexesModifiedList, indexesToReplaceList, rangeincrement, portalHoldList]

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    registerRequestedPortal(index) {

        this.cacheProps.requestedSet.add(index)

    }

    removeRequestedPortal(index) {

        this.cacheProps.requestedSet.delete(index)

    }

    getNewItemID() {

        return globalItemID++

    }

    // get new or existing itemID for contentfunctions.createCellFrame
    getNewOrExistingItemID(index) {

        const { indexToItemIDMap } = this.cacheProps

        const itemID = 
            (indexToItemIDMap.has(index))?
                indexToItemIDMap.get(index):
                (this.getNewItemID())

        return itemID

    }

     // create new portal
    createPortal(component, index, itemID, isPreload = false) {

        this.removeRequestedPortal(index)

        const { layout, cellHeight, cellWidth, orientation } = 
            this.cradleParameters.cradleInheritedPropertiesRef.current

        const portalNode = createPortalNode(
                index, itemID, layout, orientation, cellHeight, cellWidth)

        // div wrapper to avoid memory leak
        this.cacheProps.portalMap.set(itemID,
                <div data-type = 'portalwrapper' key = {itemID} data-itemid = {itemID} data-index = {index}>
                    <InPortal key = {itemID} node = {portalNode} > { component } </InPortal>
                </div>)

        this.cacheProps.modified = true

        const portalMetadata = {
            portalNode,
            isReparentingRef:{
                current:false,
            },
            index,
            itemID,
            component,
        }

        this.cacheProps.metadataMap.set(itemID, portalMetadata)
        this.cacheProps.indexToItemIDMap.set(index, itemID)

        if (!isPreload) this.renderPortalList()

        return portalMetadata

    }

    // used for preloading new item
    private async preloadItem(
        index, 
        getItem, 
        scrollerPropertiesRef, 
        itemExceptionCallback,
        maxListsizeInterrupt,
        scrollerID
    ) {

        const itemID = this.getNewItemID()

        let returnvalue, usercontent, error

        try {

            usercontent = await getItem(index, itemID)
            if (usercontent === null) returnvalue = usercontent

        } catch(e) {

            returnvalue = usercontent = undefined
            error = e

        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            if (!React.isValidElement(usercontent)) {
                returnvalue = usercontent
                usercontent = undefined
                error = new Error('invalid React element')
            }

        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            let content 
            const scrollerProperties = {
                isReparentingRef:null,
                scrollerPropertiesRef,
            }
            if (usercontent.props.hasOwnProperty('scrollerProperties')) {
                content = React.cloneElement(usercontent, {scrollerProperties})
            } else {
                content = usercontent
            }

            const portalData = 
                this.createPortal(content, index, itemID, true) // true = isPreload
            // make available to user content
            scrollerProperties.isReparentingRef = portalData.isReparentingRef

        } else {

            if (usercontent === undefined) {

                itemExceptionCallback && 
                    itemExceptionCallback(index, itemID, returnvalue, 'preload', error)

            } else { // usercontent === null; last item in list

                itemExceptionCallback && 
                    itemExceptionCallback(index, itemID, returnvalue, 'preload', new Error('end of list'))

                maxListsizeInterrupt(index)

            }

        }

    }

    // delete a portal list item
    // accepts an array of indexes
    deletePortal(index, deleteListCallback) {

        const indexArray = 
            (!Array.isArray(index))?
                [index]:
                index

        const { 
            metadataMap,
            portalMap,
            indexToItemIDMap 
        } = this.cacheProps

        const deleteList = []
        for (let i of indexArray) {

            const itemID = indexToItemIDMap.get(i)

            deleteList.push({index:i,itemID})
            metadataMap.delete(itemID)
            portalMap.delete(itemID)
            indexToItemIDMap.delete(i)

        }
        
        this.cacheProps.modified = true

        deleteListCallback && deleteListCallback(deleteList)

    }

    // query existence of a portal list item
    hasPortal(itemID) {

        return this.cacheProps.metadataMap.has(itemID)

    }

    getPortal(itemID) {

        if (this.hasPortal(itemID)) {
            return this.cacheProps.metadataMap.get(itemID)
        }

    }

}

// ==========================[ Utility function ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
// see also some styles set in CellFrame

const createPortalNode = (index, itemID, layout, orientation, cellHeight, cellWidth) => {

    let portalNode = createHtmlPortalNode()

    let container = portalNode.element
    container.style.overflow = 'hidden'

    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = itemID

    return portalNode

}     

// ========================[ Utility component ]==============================

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({ cacheProps }) => {

    const [portalListCounter, setPortalListCounter] = useState(0)

    const counterRef = useRef(null)
    counterRef.current = portalListCounter

    const isMountedRef = useRef(true)
    const portalArrayRef = useRef(null)
    // const cachedivRef = useRef(null)

    useEffect(()=>{

        cacheProps.setListState = ()=>{

            portalArrayRef.current = cacheProps.portalList

            isMountedRef.current && setPortalListCounter(++counterRef.current) // force render

        }

        return () => {

            isMountedRef.current = false

        }

    },[]) 

    return portalArrayRef.current

}
