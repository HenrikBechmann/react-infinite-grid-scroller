// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
// const scrollerPortalMetaData = new Map()
const scrollerPortals = new Map()
// const scrollerPortalBlockCallbacks = new Map()

class PortalManager {

    // initialize scroller repository
    createScrollerPortalContentRepository (scrollerID) {

        if (!scrollerPortals.has(scrollerID)) {
            scrollerPortals.set(scrollerID, 
                {
                    setListState:null,
                    modified:false,
                    portalMetaDataMap:new Map(),
                    portalMap:new Map(),
                    portalList:null
                }
            )
        }

    }

    // start again
    resetScrollerPortals(scrollerID) { // TODO: confirm no memory leak

        if (scrollerPortals.has(scrollerID)) {
            let scrollerdata = scrollerPortals.get(scrollerID)
            scrollerdata.portalMap.clear() 
            scrollerdata.portalMetaDataMap.clear()
            scrollerdata.portalList = null
            scrollerdata.modified = false
        }

    }

    // delete scroller repository for reset or unmount
    deleteScrollerPortals (scrollerID) {

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

    // add a portal list item. The index is the scroller dataset index
    fetchPortalMetaData(scrollerID, index, placeholder) {

        if (this.hasPortal(scrollerID, index)) {
            return this.getPortalMetaData(scrollerID, index)
        }

        let container = document.createElement('div')
        // container.style.inset = '0px' // not recognized by React
        container.style.top = '0px'
        container.style.right = '0px'
        container.style.left = '0px'
        container.style.bottom = '0px'
        container.style.position = 'absolute'
        // container.style.willChange = 'transform'
        // container.style.display = 'none'
        container.dataset.type = 'portalcontainer'
        container.dataset.index = index
        container.dataset.scrollerid = scrollerID
        container.setAttribute('key',index)

        let [portal,reverseportal] = getInPortal(placeholder, container)

        let scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetaData = {usercontent:null, placeholder, target:null, container, portal, reverseportal, reparenting:false, indexid: index,scrollerid:scrollerID}

        scrollerPortals.get(scrollerID).portalMetaDataMap.set(index, portalMetaData)

        this.renderPortalList(scrollerID)

        return portalMetaData

    }

    // update the content of a portal list item
    updatePortalMetaData (scrollerID, index, usercontent) {
        let portalMetaData = this.getPortalMetaData(scrollerID,index)

        let portalComponent = updateInPortal(usercontent, portalMetaData.reverseportal )

        let scrollerportals = scrollerPortals.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portalComponent} key = {index} index = {index}/>)
        scrollerportals.modified = true

        portalMetaData = scrollerPortals.get(scrollerID).portalMetaDataMap.get(index)
        portalMetaData.usercontent = usercontent

        this.renderPortalList(scrollerID)

        return portalMetaData
    }

    // delete a portal list item
    deletePortal(scrollerID, index) {

        let scrollerdata = scrollerPortals.get(scrollerID)
        scrollerdata.portalMetaDataMap.delete(index)
        scrollerdata.portalMap.delete(index)
        scrollerdata.modified = true
        // return portalMetaItem

    }

    // query existence of a portal list item
    hasPortal(scrollerID, index) {

        return scrollerPortals.get(scrollerID).portalMetaDataMap.has(index)

    }

    // query existence of content for a portal list item
    hasPortalUserContent (scrollerID, index) {

        let portalMetaData = this.getPortalMetaData(scrollerID, index)
        return  !!(portalMetaData && portalMetaData.usercontent)

    }

    // get a portal list item's meta data
    getPortalMetaData (scrollerID, index) {

        return scrollerPortals.get(scrollerID).portalMetaDataMap.get(index)

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

        let scrollerportals = scrollerPortals.get(scrollerID)

        scrollerportals.setListState = ()=>{
            isMounted.current && setPortalList(scrollerportals.portalList)
        }

        return () => {isMounted.current = false}

    },[]) 

    return portalList
}
