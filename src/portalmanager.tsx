// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
const scrollerPortals = new Map()

class PortalManager {

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // initialize scroller repository
    createScrollerPortalRepository(scrollerID) {

        if (!scrollerPortals.has(scrollerID)) {
            scrollerPortals.set(scrollerID, 
                {
                    setListState:null,
                    modified:false,
                    portalMetadataMap:new Map(),
                    portalMap:new Map(),
                    portalList:null
                }
            )
        }

    }

    resetScrollerPortalRepository(scrollerID) { // TODO: confirm no memory leak

        // keep the setListState callback
        if (scrollerPortals.has(scrollerID)) {
            let scrollerdata = scrollerPortals.get(scrollerID)
            scrollerdata.portalMap.clear() 
            scrollerdata.portalMetadataMap.clear()
            scrollerdata.portalList = null
            scrollerdata.modified = false
        }

    }

    // delete scroller repository for reset or unmount
    deleteScrollerPortalRepository (scrollerID) {

        scrollerPortals.delete(scrollerID)

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = (scrollerID) => {

        const scrollerportaldata = scrollerPortals.get(scrollerID)
        if (scrollerportaldata.modified) {
            scrollerportaldata.portalList = Array.from(scrollerportaldata.portalMap.values())
            scrollerportaldata.modified = false
        }

        scrollerportaldata.setListState() // trigger display update

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // add a portal list item. The index is the scroller's portal dataset index
    fetchOrCreatePortal(scrollerID, index, content) {

        if (this.hasPortal(scrollerID, index)) {
            return this.getPortal(scrollerID, index)
        }

        // if not found, create new portal

        const [inportal,reverseportal] = getInPortal(content, index, scrollerID)

        const scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper inportal = {inportal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        const portalMetadata = {
            reverseportal, 
            initialized:false,
            hasusercontent:false 
        }

        scrollerportals.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList(scrollerID)

        return portalMetadata

    }

    // update the content of a portal list item
    updatePortal(scrollerID, index, content) {
        const portalMetadata = this.getPortal(scrollerID,index)

        const portalComponent = updateInPortal(content, portalMetadata.reverseportal )

        const scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper inportal = {portalComponent} key = {index} index = {index}/>)
        scrollerportals.modified = true

        this.renderPortalList(scrollerID)

        return portalMetadata
    }

    // delete a portal list item
    deletePortal(scrollerID, index) {

        let scrollerdata = scrollerPortals.get(scrollerID)
        scrollerdata.portalMetadataMap.delete(index)
        scrollerdata.portalMap.delete(index)
        scrollerdata.modified = true

    }

    // query existence of a portal list item
    hasPortal(scrollerID, index) {

        return scrollerPortals.get(scrollerID).portalMetadataMap.has(index)

    }

    // get a portal list item's meta data
    getPortal(scrollerID, index) {

        return scrollerPortals.get(scrollerID).portalMetadataMap.get(index)

    }

}

export const portalManager = new PortalManager()

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const getInPortal = (content, index, scrollerID) => {

    console.log('creating inportal index, scrollerID',index,scrollerID)
    let reversePortal = createHtmlPortalNode()
    // reversePortal.element = container
    let container = reversePortal.element
    container.style.inset = '0px' 
    container.style.position = 'absolute'
    container.dataset.type = 'portalcontainer'
    container.dataset.index = index
    container.dataset.scrollerid = scrollerID
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
export const PortalList = ({scrollerID}) => {

    const [portalList, setPortalList] = useState(null)
    const isMounted = useRef(true)

    useEffect(()=>{

        let scrollersessionportals = scrollerPortals.get(scrollerID)

        scrollersessionportals.setListState = ()=>{
            isMounted.current && setPortalList(scrollersessionportals.portalList)
        }

        return () => {isMounted.current = false}

    },[]) 

    return portalList
}
