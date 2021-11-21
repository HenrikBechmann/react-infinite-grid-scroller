// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useLayoutEffect, useRef} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
const scrollerPortalComponentMetaData = new Map()
const scrollerPortalComponentData = new Map()
const scrollerPortalBlockComponentCallbacks = new Map()

class PortalManager {

    // initialize scroller repository
    createScrollerPortalRepository (scrollerID) {

        if (!scrollerPortalComponentMetaData.has(scrollerID)) {
            scrollerPortalComponentMetaData.set(scrollerID, new Map())
        }
        if (!scrollerPortalComponentData.has(scrollerID)) {
            scrollerPortalComponentData.set(scrollerID, {modified:false,portalMap:new Map(),portalList:null})
        }

    }

    // clear scroller repository for list recreation (like re-positioning in list)
    clearScrollerPortalRepository (scrollerID) {

        if (scrollerPortalComponentMetaData.has(scrollerID)) {
            scrollerPortalComponentMetaData.get(scrollerID).clear()
        }
        if (scrollerPortalComponentData.has(scrollerID)) {
            scrollerPortalComponentData.delete(scrollerID)
        }

    }

    // start again
    resetScrollerPortalRepository(scrollerID) { // TODO: confirm no memory leak

        this.clearScrollerPortalRepository(scrollerID)
        this.createScrollerPortalRepository(scrollerID)

    }

    // delete scroller repository for reset or unmount
    deleteScrollerPortalRepository (scrollerID) {

        scrollerPortalComponentMetaData.delete(scrollerID)
        scrollerPortalComponentData.delete(scrollerID)
        scrollerPortalBlockComponentCallbacks.delete(scrollerID)

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = (scrollerID) => {

        let scrollerlistmap = scrollerPortalComponentData.get(scrollerID)
        if (scrollerlistmap.modified) {
            scrollerlistmap.portalList = Array.from(scrollerlistmap.portalMap.values())
            scrollerlistmap.modified = false
        }

        scrollerPortalBlockComponentCallbacks.get(scrollerID).setListState() // trigger display update

    }

    // add a portal list item. The index is the scroller dataset index
    fetchPortalMetaData(scrollerID, index, placeholder) {

        if (this.hasPortalListItem(scrollerID, index)) {
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

        let scrollerportals = scrollerPortalComponentData.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetaItem = {usercontent:null, placeholder, target:null, container, portal, reverseportal, reparenting:false, indexid: index,scrollerid:scrollerID}

        scrollerPortalComponentMetaData.get(scrollerID).set(index, portalMetaItem)

        this.renderPortalList(scrollerID)

        return portalMetaItem

    }

    // update the content of a portal list item
    updatePortalListItem (scrollerID, index, usercontent) {
        let portalMetaData = this.getPortalMetaData(scrollerID,index)

        let portalcomponent = updateInPortal(usercontent, portalMetaData.reverseportal )

        let scrollerportals = scrollerPortalComponentData.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portalcomponent} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetaItem = scrollerPortalComponentMetaData.get(scrollerID).get(index)
        portalMetaItem.usercontent = usercontent

        this.renderPortalList(scrollerID)

        return portalMetaItem
    }

    // delete a portal list item
    deletePortalListItem (scrollerID, index) {

        scrollerPortalComponentMetaData.get(scrollerID).delete(index)
        let portalMetaItem = scrollerPortalComponentData.get(scrollerID)
        portalMetaItem.portalMap.delete(index)
        portalMetaItem.modified = true
        return portalMetaItem

    }

    // query existence of a portal list item
    hasPortalListItem (scrollerID, index) {

        return scrollerPortalComponentMetaData.get(scrollerID).has(index)

    }

    // query existence of content for a portal list item
    hasPortalUserContent (scrollerID, index) {

        let portalItem = this.getPortalMetaData(scrollerID, index)
        return  !!(portalItem && portalItem.usercontent)

    }

    // get a portal list item's meta data
    getPortalMetaData (scrollerID, index) {

        return scrollerPortalComponentMetaData.get(scrollerID).get(index)

    }

}

// export the portal manager
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
export const PortalWrapper = ({
    portal, index,
}) => {

    return <div data-type='portalwrapper' data-index = {index} style = {wrapperstyle} key={index}>
        {portal}
    </div>

}

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({scrollerID}) => {

    const [portalList, setPortalList] = useState(null)
    const isMounted = useRef(true)

    useLayoutEffect(()=>{

        scrollerPortalBlockComponentCallbacks.set(scrollerID,
            {setListState:()=>{
                isMounted.current && setPortalList(scrollerPortalComponentData.get(scrollerID).portalList)
            }})
        return () => {isMounted.current = false}

    },[]) 

    return portalList
}
