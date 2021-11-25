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

        let scrollerportaldata = scrollerPortals.get(scrollerID)
        if (scrollerportaldata.modified) {
            scrollerportaldata.portalList = Array.from(scrollerportaldata.portalMap.values())
            scrollerportaldata.modified = false
        }

        scrollerportaldata.setListState() // trigger display update

    }

    // add a portal list item. The index is the scroller's portal dataset index
    fetchPortal(scrollerID, index, placeholder) {

        if (this.hasPortal(scrollerID, index)) {
            return this.getPortal(scrollerID, index)
        }

        // if not found, create new portal

        let container = document.createElement('div')
        container.style.inset = '0px' 
        container.style.position = 'absolute'
        container.dataset.type = 'portalcontainer'
        container.dataset.index = index
        container.dataset.scrollerid = scrollerID
        container.setAttribute('key',index)

        let [portal,reverseportal] = getInPortal(placeholder, container)

        let scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetadata = {usercontent:null, placeholder, container, portal, reverseportal, reparenting:false, initialized:false, indexid: index,scrollerid:scrollerID}

        scrollerportals.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList(scrollerID)

        return portalMetadata

    }

    // update the content of a portal list item
    updatePortal(scrollerID, index, content) {
        let portalMetadata = this.getPortal(scrollerID,index)

        let portalComponent = updateInPortal(content, portalMetadata.reverseportal )

        let scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portalComponent} key = {index} index = {index}/>)
        scrollerportals.modified = true

        portalMetadata = scrollerPortals.get(scrollerID).portalMetadataMap.get(index)
        portalMetadata.usercontent = content

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

    // query existence of content for a portal list item
    hasPortalUserContent (scrollerID, index) {

        let portalMetadata = this.getPortal(scrollerID, index)
        return  !!(portalMetadata && portalMetadata.usercontent)

    }

    // get a portal list item's meta data
    getPortal(scrollerID, index) {

        return scrollerPortals.get(scrollerID).portalMetadataMap.get(index)

    }

}

export const portalManager = new PortalManager()

// Utility functions

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
const getInPortal = (content, container) => {

    let reversePortal = createHtmlPortalNode()
    reversePortal.element = container

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

// Utility components

const wrapperstyle = {display:'none'} // static; should take same dimensions as container CellShell

// hidden portal wrapper for clarity and usage of conventional react relisting services
export const PortalWrapper = ({ portal, index }) => {

    return <div data-type = 'portalwrapper' data-index = { index } style = { wrapperstyle } key = { index }>
        { portal }
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
