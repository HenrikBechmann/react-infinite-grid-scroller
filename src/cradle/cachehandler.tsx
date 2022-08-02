// portalhandler.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellFrame for display
*/

import React, {useState, useEffect, useRef} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

const MAX_CACHE_OVER_RUN = 1.5

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

        metadataMap:new Map(),
        requestedMap: new Map(), // some portals may have been requested by requestidlecallback, not yet created
        portalMap:new Map(),
        indexToItemIDMap:new Map(),

        portalList:null,

        scrollerID:null
    }

    listsizeRef

    setListsize // setListsize(listsize) generates infinitescroller useState update listsize throughout

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    changeListsize = (newlistsize, deleteListCallback) => {
        // console.log('cacheHandler changelistsize called with newlistsize',newlistsize)
        this.setListsize(newlistsize)
        // match cache to newlistsize
        const portalIndexList = this.cacheProps.indexToItemIDMap
        const mapkeys = Array.from(portalIndexList.keys())
        mapkeys.sort((a,b) => a - b)
        const highestindex = mapkeys.at(-1)
        if (highestindex > (newlistsize -1)) { // pare the cache
            const parelist = mapkeys.filter((item)=>{
                return item > (newlistsize -1)
            })
            this.deletePortal(parelist, deleteListCallback)
        }
    }

    clearCache = () => {

        // keep the setListState callback
        this.cacheProps.portalMap.clear() 
        this.cacheProps.metadataMap.clear()
        this.cacheProps.indexToItemIDMap.clear()
        this.cacheProps.requestedMap.clear()
        this.cacheProps.portalList = null
        this.cacheProps.modified = true

        // this.cacheProps.setListState() // trigger display update
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

    matchCacheToCradle = (modelIndexList, deleteListCallback) => {

        // console.log('matchCacheToCradle modelIndexList',modelIndexList)

        const mapkeys = Array.from(this.cacheProps.indexToItemIDMap.keys())

        const delkeys = mapkeys.filter(key => !modelIndexList.includes(key))

        return this.deletePortal(delkeys, deleteListCallback)

    }

    pareCacheToMax = (cacheMax, modelIndexList, deleteListCallback) => {

        const modelLength = modelIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const max = Math.max(modelLength, cacheMax)

        const portalIndexList = this.cacheProps.indexToItemIDMap
        const requestedMap = this.cacheProps.requestedMap

        // if ((portalMapList.size + requestedMap.size) <= max) return false
        if ((portalIndexList.size + requestedMap.size) <= max) return false

        // sort the map keys
        const mapkeyslist = Array.from(portalIndexList.keys())
        const requestedkeys = Array.from(requestedMap.keys())

        const mapkeys = mapkeyslist.concat(requestedkeys)

        mapkeys.sort((a,b) => a - b)

        // get number to pare
        const mapLength = mapkeys.length
        const parecount = mapLength - max

        // distribute paring proportionally at front and back
        const headindex = modelIndexList[0]
        const tailindex = modelIndexList[modelLength - 1]
        const headpos = mapkeys.indexOf(headindex)
        const tailpos = mapkeys.indexOf(tailindex)

        const headroom = headpos
        const tailroom = mapLength - (tailpos + 1)
        const pareroom = headroom + tailroom

        const headparecount = Math.floor((headroom/pareroom)*parecount)
        const tailparecount = parecount - headparecount

        // collect indexes to pare
        const headlist = mapkeys.slice(0,headparecount)
        const taillist = mapkeys.slice(mapLength - tailparecount)

        const delList = headlist.concat(taillist)

        this.deletePortal(delList, deleteListCallback)

        return true

    }

    guardAgainstRunawayCaching = (cacheMax, modelLength) => {

        if (!cacheMax) return false

        const portalMap = this.cacheProps.portalMap
        const requestedMap = this.cacheProps.requestedMap

        const max = Math.max(modelLength, cacheMax)

        if ((portalMap.size + requestedMap.size) <= ((max) * MAX_CACHE_OVER_RUN)) {
            return false
        } else {
            return true
        }

    }

    preload(cradleParameters, callback, setMaxListsize, scrollerID) {

        const { cradlePassthroughPropertiesRef } = cradleParameters
        const { stateHandler, serviceHandler } = cradleParameters.handlersRef.current

        const cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current
        const { getItem, cacheMax } = cradleInheritedProperties
        const { listsize } = cradleInternalProperties

        const promises = []

        console.log('cacheMax', cacheMax)

        let cacheSize = cacheMax ?? 0

        cacheSize = Math.min(cacheSize, listsize)

        const preloadsize = 
            cacheMax?
                cacheMax:
                listsize

        let breakloop = {
            current:false
        }

        const maxListsizeInterrupt = (index) => {
            breakloop.current = true
            setMaxListsize(index)
        }

        if (stateHandler.isMountedRef.current) {

            
            const indexToItemIDMap = this.cacheProps.indexToItemIDMap

            for (let i = 0; i < preloadsize; i++) {

                if (!indexToItemIDMap.has(i)) {

                    const promise = this.preloadItem(
                        i, 
                        getItem, 
                        cradlePassthroughPropertiesRef,
                        serviceHandler.callbacks.preloadIndexCallback,
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
                this.renderPortalList()
                // console.log("finished preloading",'-'+scrollerID+'-',+this.cacheProps.portalMap.size)
                callback()
            }
        )

    }

    // =========================[ SNAPSHOTS ]=========================

    getCacheIndexMap() {

        return new Map(this.cacheProps.indexToItemIDMap)

    }

    getCradleIndexMap(modelIndexList) {

        const cradleMap = new Map()
        const { indexToItemIDMap } = this.cacheProps
        for (const index of modelIndexList) {

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

    // TODO orphan
    changeIndexMap( ) {
        
    }
    
    // move is coerced by servicehandler to be within current list bounds
    moveIndex(toindex, fromindex, fromhighindex ) {

        const {indexToItemIDMap,metadataMap} = this.cacheProps

        // ----------- define parameters ---------------

        const rangeabsoluteincrement = fromhighindex - fromindex + 1
        const movedirectionalincrement = toindex - fromindex

        const tohighindex = toindex + (rangeabsoluteincrement - 1)

        const shiftdirection = 
            (movedirectionalincrement > 0)? // move up in list
                -1: // shift down, make room for shiftingindex above
                1   // shift up, make room for shiftingindex below

        const orderedindexlist = Array.from(indexToItemIDMap.keys())
        orderedindexlist.sort((a,b)=>a-b)

        const toindexptr = orderedindexlist.findIndex(value => value >= toindex)
        const tohighindexptr = orderedindexlist.findIndex(value => value >= tohighindex)
        const fromindexptr = orderedindexlist.findIndex(value => value >= fromindex)
        const fromhighindexptr = orderedindexlist.findIndex(value => value >= fromhighindex)

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

        const processedIndexes = processedshiftList.concat(processedmoveList)

        return processedIndexes

    }

    // much of this deals with the fact that the cache is sparse.
    insertRemoveIndex(index, highrange, increment, listsize) { // increment is +1 or -1

        // console.log('==> cacheHandler.insertRemoveIndex: index, highrange, increment, listsize',
        //     index, highrange, increment, listsize)

        const { indexToItemIDMap, metadataMap } = this.cacheProps

        // ---------- define range parameters ---------------

        // high range is the highest index number of the insert/remove operation
        let highrangeindex = highrange ?? 0

        highrangeindex = 
            (highrangeindex > index)?
                highrangeindex:
                index

        // rangecount is the absolute number in the insert/remove range - contiguous
        const rangecount = highrangeindex - index + 1

        // range increment adds sign to rangecount to indicate add/remove
        const rangeincrement = rangecount * increment

        // shrinktorange is the index at the bottom of the indexes to be removed from the top of the list
        // for the remove operation.
        const shrinktorangeindex = 
            (increment == -1)?
                listsize + rangeincrement:
                null

        // ---------- define boundaries within ordered cache index list ------------
        // Ptr = index to array, as opposed to index of virtual list

        // highPtr, lowPtr, shrinkPtr within orderedIndexList.
        const orderedIndexList = Array.from(indexToItemIDMap.keys())
        orderedIndexList.sort((a,b)=>a-b)

        // low and high pointers provide values for slices above the range
        const lowPtr = orderedIndexList.findIndex(value => value >= index)

        const highPtr = orderedIndexList.findIndex(value=> value >= highrangeindex)

        // shrinkptr is the location of the bottom of the shrink range for removals
        const shrinktoPtr = 
            (increment == -1)?
                orderedIndexList.findIndex(value => value >= shrinktorangeindex):
                -1

        // console.log('highrangeindex, rangecount, rangeincrement, shrinktorangeindex\n',
        //     'lowPtr, highPtr, shrinktoPtr, orderedIndexList\n',
        //     highrangeindex, rangecount, rangeincrement, shrinktorangeindex,'\n',
        //     lowPtr, highPtr, shrinktoPtr, orderedIndexList)

        // ----------- define indexesToProcess, indexesToRemove and itemsToRemove lists --------

        let indexesToProcessList, indexesToReplaceList, indexesToRemoveList, itemsToRemoveList

        // first, indexesToProcessList and indexesToRemoveList
        if ((lowPtr == -1) && (highPtr == -1)) { // core scope is out of view

            indexesToProcessList = []

        } else { // core scope is partially or fully in view

            if (shrinktoPtr == -1) {
                indexesToProcessList = orderedIndexList.slice(lowPtr)
            } else {
                indexesToProcessList = orderedIndexList.slice(lowPtr, shrinktoPtr)
            }

        }

        indexesToRemoveList = 
            (shrinktoPtr != -1 )?
                orderedIndexList.slice(shrinktoPtr):
                []

        // now, itemsToRemoveList
        if (increment == -1) { // list shrinks with removals

            itemsToRemoveList = indexesToRemoveList.map((index)=>{
                return indexToItemIDMap.get(index)
            })

        } else {

            itemsToRemoveList = []

        }

        // console.log('indexesToProcessList, indexesToRemoveList, itemsToRemoveList',
        //     indexesToProcessList, indexesToRemoveList, itemsToRemoveList)

        // ----------- conduct cache operations ----------

        // increment higher from top of list to preserve lower values for subsequent increment
        if (increment == 1) indexesToProcessList.reverse() 

        const indexesModifiedList = []

        // modify index-to-itemid map, and metadata map
        const processindex = index => {

            const itemID = indexToItemIDMap.get(index)
            const newIndex = index + rangeincrement

            indexToItemIDMap.set(newIndex, itemID)
            metadataMap.get(itemID).index = newIndex
            indexesModifiedList.push(newIndex)

        }

        indexesToProcessList.forEach(processindex)

        // delete remaining indexes and items now duplicates
        for (const index of indexesToRemoveList) {

            indexToItemIDMap.delete(index)

        }
        for (const item of itemsToRemoveList) {

            metadataMap.delete(item)

        }

        // get indexesToReplaceList
        let shiftBoundaryIndex, shiftBoundaryPtr
        shiftBoundaryIndex = indexesModifiedList.at(-1)
        if (increment == -1) {
            shiftBoundaryPtr = indexesToProcessList.findIndex(value =>value > shiftBoundaryIndex)
        } else {
            shiftBoundaryPtr = indexesToProcessList.findIndex(value =>value < shiftBoundaryIndex)
        }

        indexesToReplaceList = indexesToProcessList.slice(shiftBoundaryPtr)

        for (const index of indexesToReplaceList) {
            
            indexToItemIDMap.delete(index)

        }

        // console.log('increment, shiftBoundaryIndex, shiftBoundaryPtr, indexesModifiedList, indexesToProcessList, indexesToReplaceList',
        //     increment, shiftBoundaryIndex, shiftBoundaryPtr, indexesModifiedList, indexesToProcessList, indexesToReplaceList)

        // --------------- returns ---------------


        // return values for caller to send to contenthandler for cradle synchronization
        return [indexesModifiedList, indexesToReplaceList, rangeincrement]

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    registerRequestedPortal(index) {

        this.cacheProps.requestedMap.set(index, null)

    }

    removeRequestedPortal(index) {

        this.cacheProps.requestedMap.delete(index)

    }

    getNewItemID() {
        return globalItemID++
    }

    getItemID(index) {

        const indexMap = this.cacheProps.indexToItemIDMap 
        const knownID = indexMap.get(index)
        const knownHasValue = knownID??false // deal with falsey 0
        const newID = (knownHasValue === false)?(this.getNewItemID()):null

        if (knownHasValue === false) indexMap.set(index, newID)

        return knownID??newID

    }

    createPortal(component, index, itemID, isPreload = false) { // create new portal

        this.removeRequestedPortal(index)

        const portalNode = createPortalNode(index, itemID)

        this.cacheProps.portalMap.set(itemID,//index,
                <InPortal key = {itemID} node = {portalNode} > { component } </InPortal>)
                // <InPortal key = {index} node = {portalNode} > { content } </InPortal>)
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

    private async preloadItem(index, 
        getItem, 
        cradlePassthroughPropertiesRef, 
        preloadIndexCallback,
        maxListsizeInterrupt,
        scrollerID
    ) {

        const itemID = this.getItemID(index)

        let usercontent
        let error
        try {
            usercontent = await getItem(index, itemID)
        } catch(e) {
            usercontent = undefined
            error = e
        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            if (!React.isValidElement(usercontent)) {
                usercontent = undefined
                error = new Error('invalid React element')
            }

        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            preloadIndexCallback && preloadIndexCallback(index, itemID)

            // console.log('preloading index','-'+scrollerID+'-' ,index )

            let content 
            const scrollerData = {
                isReparentingRef:null,
                cradlePassthroughPropertiesRef,
            }
            if (usercontent.props.hasOwnProperty('scrollerData')) {
                content = React.cloneElement(usercontent, {scrollerData})
            } else {
                content = usercontent
            }

            const portalData = 
                this.createPortal(content, index, itemID, true) // true = isPreload
            // make available to user content
            scrollerData.isReparentingRef = portalData.isReparentingRef

        } else {

            if (usercontent === undefined) {

                preloadIndexCallback && preloadIndexCallback(index, itemID, error)
                console.log('ERROR','no content item for preload index, itemID',index, itemID)

            } else { // usercontent === null; last item in list
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
            deleteList.push(itemID)
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
const createPortalNode = (index, itemID) => {

    let portalNode = createHtmlPortalNode()

    let container = portalNode.element
    container.style.inset = '0px' 
    container.style.position = 'absolute'
    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = itemID

    return portalNode

}     

// ========================[ Utility component ]==============================

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({ cacheProps }) => {

    // console.log('running PORTALLIST', '-'+cacheProps.scrollerID+'-')

    const [portalList, setPortalList] = useState(null)
    const isMountedRef = useRef(true)

    useEffect(()=>{

        cacheProps.setListState = ()=>{

            isMountedRef.current && setPortalList(cacheProps.portalList)

        }

        return () => {isMountedRef.current = false}

    },[]) 

    return portalList
}
