// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
export class PortalManager {

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    scrollerData = {
        setListState:null,
        modified:false,
        portalMetadataMap:new Map(),
        portalMap:new Map(),
        portalList:null
    }

    // initialize scroller repository

    resetScrollerPortalRepository() {

        // keep the setListState callback
        this.scrollerData.portalMap.clear() 
        this.scrollerData.portalMetadataMap.clear()
        this.scrollerData.portalList = null
        this.scrollerData.modified = false

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = () => {

        if (this.scrollerData.modified) {
            this.scrollerData.portalList = Array.from(this.scrollerData.portalMap.values())
            this.scrollerData.modified = false
        }

        this.scrollerData.setListState() // trigger display update

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // add a portal list item. The index is the scroller's portal dataset index
    fetchOrCreatePortal(index, content) { // content is used for new portal only

        if (this.hasPortal(index)) {
            return this.getPortal(index)
        }

        // if not found, create new portal

        const [inportal,reverseportal] = createInPortal(content, index)

        this.scrollerData.portalMap.set(index,<PortalWrapper inportal = {inportal} key = {index} index = {index}/>)
        this.scrollerData.modified = true

        const portalMetadata = {
            reverseportal, 
            initialized:false,
            hasusercontent:false 
        }

        this.scrollerData.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList()

        return portalMetadata

    }

    // update the content of a portal list item
    updatePortal(index, content) {
        const portalMetadata = this.getPortal(index)

        const portalComponent = updateInPortal(content, portalMetadata.reverseportal )

        this.scrollerData.portalMap.set(index,<PortalWrapper inportal = {portalComponent} key = {index} index = {index}/>)
        this.scrollerData.modified = true

        this.renderPortalList()

        return portalMetadata
    }

    // delete a portal list item
    deletePortal(index) {

        this.scrollerData.portalMetadataMap.delete(index)
        this.scrollerData.portalMap.delete(index)
        this.scrollerData.modified = true

    }

    // query existence of a portal list item
    hasPortal(index) {

        return this.scrollerData.portalMetadataMap.has(index)

    }

    // get a portal list item's meta data
    getPortal(index) {

        return this.scrollerData.portalMetadataMap.get(index)

    }

}

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const createInPortal = (content, index) => {

    // console.log('creating inportal index, scrollerID',index,scrollerID)
    let reversePortal = createHtmlPortalNode()
    // reversePortal.element = container
    let container = reversePortal.element
    container.style.inset = '0px' 
    container.style.position = 'absolute'
    container.dataset.type = 'portalcontainer'
    container.dataset.index = index
    // container.dataset.scrollerid = scrollerID
    container.setAttribute('key',index)


    return [<InPortal node = {reversePortal}>
        {content}
    </InPortal>,reversePortal]

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
export const PortalList = ({ scrollerData }) => {

    const [portalList, setPortalList] = useState(null)
    const isMounted = useRef(true)

    useEffect(()=>{

        scrollerData.setListState = ()=>{
            isMounted.current && setPortalList(scrollerData.portalList)
        }

        return () => {isMounted.current = false}

    },[]) 

    return portalList
}
