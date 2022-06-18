// portalhandler.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
export class CacheHandler {

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    scrollerProps = {
        setListState:null,
        modified:false,
        portalMetadataMap:new Map(),
        portalMap:new Map(),
        portalList:null
    }

    // initialize scroller repository

    clearCache = () => {

        // keep the setListState callback
        this.scrollerProps.portalMap.clear() 
        this.scrollerProps.portalMetadataMap.clear()
        this.scrollerProps.portalList = null
        this.scrollerProps.modified = false

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

    // add a portal list item. The index is the scroller's portal dataset index
    fetchPortal(index, content) { // content is used for new portal only

        if (this.hasPortal(index)) {
            return this.getPortal(index)
        }

        // if not found, create new portal

        const [inportal,reverseportal] = createInPortal(content, index)

        this.scrollerProps.portalMap.set(index,<PortalWrapper inportal = {inportal} key = {index} index = {index}/>)
        this.scrollerProps.modified = true

        const portalMetadata = {
            reverseportal, 
            isReparenting:false,
            hasusercontent:false 
        }

        this.scrollerProps.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList()

        return portalMetadata

    }

    // update the content of a portal list item
    // updatePortal(index, content) {
    //     const portalMetadata = this.getPortal(index)

    //     const portalComponent = updateInPortal(content, portalMetadata.reverseportal )

    //     this.scrollerProps.portalMap.set(index,<PortalWrapper inportal = {portalComponent} key = {index} index = {index}/>)
    //     this.scrollerProps.modified = true

    //     this.renderPortalList()

    //     return portalMetadata
    // }

    // delete a portal list item
    deletePortal(index) {

        this.scrollerProps.portalMetadataMap.delete(index)
        this.scrollerProps.portalMap.delete(index)
        this.scrollerProps.modified = true

    }

    // query existence of a portal list item
    hasPortal(index) {

        return this.scrollerProps.portalMetadataMap.has(index)

    }

    // get a portal list item's meta data
    getPortal(index) {

        return this.scrollerProps.portalMetadataMap.get(index)

    }

}

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const createInPortal = (content, index) => {

    let reversePortal = createHtmlPortalNode()

    let container = reversePortal.element
    // container.style.inset = '0px' 
    // container.style.position = 'absolute'
    container.style.height = '100%'
    container.style.width = '100%'
    container.dataset.type = 'portalcontainer'
    container.dataset.index = index

    container.setAttribute('key',index)


    return [
        <InPortal node = {reversePortal}>{content}</InPortal>,
        reversePortal
    ]

}     

// update an InPortal component's user content
const updateInPortal = (content, reversePortal) => {

    return <InPortal node = {reversePortal} >
        { content }
    </InPortal>

}

// ========================[ Utility components ]==============================

const wrapperstyle = {display:'none'} // static; should take same dimensions as container CellShell

// hidden portal wrapper for clarity and usage of conventional react relisting services
export const PortalWrapper = ({ inportal, index }) => {

    return <div data-type = 'portalwrapper' data-index = { index } style = { wrapperstyle } key = { index }>
        { inportal }
    </div>

}

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({ scrollerProps }) => {

    const [portalList, setPortalList] = useState(null)
    const isMountedRef = useRef(true)

    useEffect(()=>{

        scrollerProps.setListState = ()=>{
            isMountedRef.current && setPortalList(scrollerProps.portalList)
        }

        return () => {isMountedRef.current = false}

    },[]) 

    return portalList
}
