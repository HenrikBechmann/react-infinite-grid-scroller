// portalhandler.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
export class CacheHandler {

    constructor(scrollerID) {
        this.scrollerProps.scrollerID = scrollerID
    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    scrollerProps = {
        setListState:null,
        modified:false,
        portalMetadataMap:new Map(),
        portalMap:new Map(),
        portalList:null,
        scrollerID:null
    }

    // initialize scroller repository

    clearCache = () => {

        // keep the setListState callback
        this.scrollerProps.portalMap.clear() 
        this.scrollerProps.portalMetadataMap.clear()
        this.scrollerProps.portalList = null
        this.scrollerProps.modified = false

        this.scrollerProps.setListState() // trigger display update

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = () => {

        if (this.scrollerProps.modified) {
            this.scrollerProps.portalList = Array.from(this.scrollerProps.portalMap.values())
            this.scrollerProps.modified = false
        }

        this.scrollerProps.setListState() // trigger display update

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    createPortal(index, content) { // create new portal

        const portalNode = createPortalNode(index)

            // <div data-type = 'portalwrapper' data-index = { index } key = { index }>
            //     <InPortal node = {portalNode} > { content } </InPortal>
            // </div>)
        this.scrollerProps.portalMap.set(index,
                <InPortal key = {index} node = {portalNode} > { content } </InPortal>)
        this.scrollerProps.modified = true

        const portalMetadata = {
            portalNode,
            isReparentingRef:{
                current:false,
            }
        }

        this.scrollerProps.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList()

        return portalMetadata

    }

    // delete a portal list item
    // TODO accept an array of indexes
    deletePortal(index) {

        this.scrollerProps.portalMetadataMap.delete(index)
        this.scrollerProps.portalMap.delete(index)
        this.scrollerProps.modified = true

    }

    // query existence of a portal list item
    hasPortal(index) {

        return this.scrollerProps.portalMetadataMap.has(index)

    }

    getPortal(index) {

        if (this.hasPortal(index)) {
            return this.scrollerProps.portalMetadataMap.get(index)
        }

    }

}

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const createPortalNode = (index) => {

    let portalNode = createHtmlPortalNode()

    let container = portalNode.element
    // container.style.inset = '0px' 
    container.style.position = 'absolute'
    container.style.height = '100%'
    container.style.width = '100%'
    container.dataset.type = 'contentenvelope'
    container.dataset.index = index

    return portalNode

}     

// ========================[ Utility components ]==============================

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({ scrollerProps }) => {

    // console.log('running PORTALLIST', '-'+scrollerProps.scrollerID+'-')

    const [portalList, setPortalList] = useState(null)
    const isMountedRef = useRef(true)

    useEffect(()=>{

        scrollerProps.setListState = ()=>{
            // console.log('running setListState in PORTALLIST', '-'+scrollerProps.scrollerID+'-')
            isMountedRef.current && setPortalList(scrollerProps.portalList)
        }

        return () => {isMountedRef.current = false}

    },[]) 

    return portalList
}
