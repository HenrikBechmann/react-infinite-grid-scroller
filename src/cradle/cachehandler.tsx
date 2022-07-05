// portalhandler.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellFrame for display
*/

import React, {useState, useEffect, useRef} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

const MAX_CACHE_OVER_RUN = 1.5

let globalCacheItemID = 0


// global scroller data, organized by session scrollerID
export class CacheHandler {

    constructor(scrollerID) {
        this.cacheProps.scrollerID = scrollerID
    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    cacheProps = {
        setListState:null,
        modified:false,

        portalMetadataMap:new Map(),
        portalRequestedMap: new Map(), // some portals may have been requested by requestidlecallback, not yet created
        portalMap:new Map(),
        cacheIndexToItemIDMap:new Map(),

        portalList:null,

        scrollerID:null
    }

    // initialize scroller repository

    clearCache = () => {

        // keep the setListState callback
        this.cacheProps.portalMap.clear() 
        this.cacheProps.portalMetadataMap.clear()
        this.cacheProps.cacheIndexToItemIDMap.clear()
        this.cacheProps.portalRequestedMap.clear()
        this.cacheProps.portalList = null
        this.cacheProps.modified = false

        this.cacheProps.setListState() // trigger display update

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = () => {

        if (this.cacheProps.modified) {
            this.cacheProps.portalList = Array.from(this.cacheProps.portalMap.values())
            this.cacheProps.modified = false
        }

        this.cacheProps.setListState() // trigger display update

    }

    matchCacheToCradle = (modelIndexList, cacheDeleteListCallback) => {
        // console.log('running matchCacheToCradle', '-'+this.cacheProps.scrollerID+'-')
        // const portalMetadataMap = this.cacheProps.portalMetadataMap
        // const mapsessionitemidkeys = Array.from(this.cacheProps.portalMap.keys())
        // const mapkeys = mapsessionitemidkeys.map(cacheItemID =>{
        //     return portalMetadataMap.get(cacheItemID).index
        // })
        const mapkeys = Array.from(this.cacheProps.cacheIndexToItemIDMap.keys())
        mapkeys.filter(key => !modelIndexList.includes(key))
        // console.log('filtered mapkeys, modelIndexList', mapkeys, modelIndexList)
        this.deletePortal(mapkeys, cacheDeleteListCallback)
    }

    pareCacheToMax = (cacheMax, modelIndexList, cacheDeleteListCallback) => {

        const modelLength = modelIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const max = Math.max(modelLength, cacheMax)

        // const portalMapList = this.cacheProps.portalMap
        const portalIndexList = this.cacheProps.cacheIndexToItemIDMap
        const requestedMap = this.cacheProps.portalRequestedMap
        // const { portalMetadataMap } = this.cacheProps

        // if ((portalMapList.size + requestedMap.size) <= max) return false
        if ((portalIndexList.size + requestedMap.size) <= max) return false

        // sort the map keys
        // const mapsessionitemidkeyslist = Array.from(portalMapList.keys())
        // const mapkeyslist = mapsessionitemidkeyslist.map(cacheItemID =>{
        //     return portalMetadataMap.get(cacheItemID).index
        // })
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

        this.deletePortal(delList, cacheDeleteListCallback)

        return true

    }

    guardAgainstRunawayCaching = (cacheMax, modelLength) => {

        if (!cacheMax) return false

        const portalMap = this.cacheProps.portalMap
        const portalRequestedMap = this.cacheProps.portalRequestedMap

        const max = Math.max(modelLength, cacheMax)

        if ((portalMap.size + portalRequestedMap.size) <= ((max) * MAX_CACHE_OVER_RUN)) {
            return false
        } else {
            return true
        }

    }

    async preloadItem(index, 
        getItem, 
        cradlePassthroughPropertiesRef, 
        preloadIndexCallback,
        scrollerID
    ) {

        const cacheItemID = this.getCacheItemID(index)

        const usercontent = await getItem(index, cacheItemID)

        if (usercontent) {

            preloadIndexCallback && preloadIndexCallback(index, cacheItemID)

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
                this.createPortal(content, index, cacheItemID)
            // make available to user content
            scrollerData.isReparentingRef = portalData.isReparentingRef

        } else {

            preloadIndexCallback && preloadIndexCallback(index, cacheItemID, 'error')
            console.log('ERROR','no content item for preload index, cacheItemID',index, cacheItemID)

        }

    }

    preload(cradleParameters, callback, scrollerID) {

        const { cradlePassthroughPropertiesRef } = cradleParameters
        const { stateHandler, serviceHandler } = cradleParameters.handlersRef.current

        const cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current
        const { getItem, listsize } = cradleInheritedProperties

        const promises = []

        if (stateHandler.isMountedRef.current) {

            for (let i = 0; i < listsize; i++) {
                // console.log('preloading',i)
                const promise = this.preloadItem(
                    i, 
                    getItem, 
                    cradlePassthroughPropertiesRef,
                    serviceHandler.callbacks.preloadIndexCallback,
                    scrollerID
                )
                promises.push(promise)
            }
        }

        Promise.all(promises).then(
            ()=>{
                // console.log("finished preloading",'-'+scrollerID+'-',+this.cacheProps.portalMap.size)
                callback()
            }
        )

    }

    getCacheList() {
        return this.cacheProps.cacheIndexToItemIDMap.entries()
    }
    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    registerRequestedPortal(index) {
        this.cacheProps.portalRequestedMap.set(index, null)
    }

    getCacheItemID(index) {
        const indexMap = this.cacheProps.cacheIndexToItemIDMap 
        const knownID = indexMap.get(index)
        const knownHasValue = knownID??false // deal with falsey 0
        const newID = (knownHasValue === false)?(globalCacheItemID++):null
        if (knownHasValue === false) indexMap.set(index, newID)
        return knownID??newID
    }

    removeRequestedPortal(index) {
        this.cacheProps.portalRequestedMap.delete(index)
    }

    createPortal(content, index, cacheItemID) { // create new portal

        this.removeRequestedPortal(index)

        // console.log('creating portal for index','-'+this.cacheProps.scrollerID+'-', index)
        const portalNode = createPortalNode(index, cacheItemID)

        // console.log('creating InPortal node', '-'+this.cacheProps.scrollerID+'-', cacheItemID)

        this.cacheProps.portalMap.set(cacheItemID,//index,
                <InPortal key = {cacheItemID} node = {portalNode} > { content } </InPortal>)
                // <InPortal key = {index} node = {portalNode} > { content } </InPortal>)
        this.cacheProps.modified = true

        const portalMetadata = {
            portalNode,
            isReparentingRef:{
                current:false,
            },
            index,
            cacheItemID,
        }

        this.cacheProps.portalMetadataMap.set(cacheItemID, portalMetadata)
        this.cacheProps.cacheIndexToItemIDMap.set(index, cacheItemID)

        this.renderPortalList()

        return portalMetadata

    }

    // delete a portal list item
    // accepts an array of indexes
    deletePortal(index, cacheDeleteListCallback) {

        let indexArray
        if (!Array.isArray(index)) {
            indexArray = [index]
        } else {
            indexArray = index
        }

        const { 
            portalMetadataMap,
            portalMap,
            cacheIndexToItemIDMap 
        } = this.cacheProps
        const deleteList = []
        for (let i of indexArray) {
            const cacheItemID = cacheIndexToItemIDMap.get(i)
            deleteList.push(cacheItemID)
            portalMetadataMap.delete(cacheItemID)
            portalMap.delete(cacheItemID)
            cacheIndexToItemIDMap.delete(i)
        }
        this.cacheProps.modified = true

        cacheDeleteListCallback && cacheDeleteListCallback(deleteList)

    }

    // query existence of a portal list item
    hasPortal(cacheItemID) {

        return this.cacheProps.portalMetadataMap.has(cacheItemID)

    }

    getPortal(cacheItemID) {

        if (this.hasPortal(cacheItemID)) {
            return this.cacheProps.portalMetadataMap.get(cacheItemID)
        }

    }

}

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const createPortalNode = (index, cacheItemID) => {

    let portalNode = createHtmlPortalNode()

    let container = portalNode.element
    container.style.inset = '0px' 
    container.style.position = 'absolute'
    // container.style.height = '100%'
    // container.style.width = '100%'
    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = cacheItemID

    return portalNode

}     

// ========================[ Utility components ]==============================

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
