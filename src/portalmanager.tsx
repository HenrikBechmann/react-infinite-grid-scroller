// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a hidden portal cache, from whence
    the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import useIsMounted from 'react-is-mounted-hook'

// global scroller data, organized by session scrollerID
const scrollerPortalMetaData = new Map()
const scrollerPortalListData = new Map()
const scrollerPortalCallbacks = new Map()

class PortalAgentClass {

    // initialize scroller repository
    createScrollerPortalRepository (scrollerID) {

        if (!scrollerPortalMetaData.has(scrollerID)) {
            scrollerPortalMetaData.set(scrollerID, new Map())
        }
        if (!scrollerPortalListData.has(scrollerID)) {
            scrollerPortalListData.set(scrollerID, {modified:false,portalMap:new Map(),portalList:null})
        }

    }

    // clear scroller repository for list recreation (like re-positioning in list)
    clearScrollerPortalRepository (scrollerID) {

        if (scrollerPortalMetaData.has(scrollerID)) {
            scrollerPortalMetaData.get(scrollerID).clear()
        }
        if (scrollerPortalListData.has(scrollerID)) {
            scrollerPortalListData.delete(scrollerID)
        }

    }

    // start again
    resetScrollerPortalRepository(scrollerID) { // TODO: confirm no memory leak

        this.clearScrollerPortalRepository(scrollerID)
        this.createScrollerPortalRepository(scrollerID)

    }

    // delete scroller repository for reset or unmount
    deleteScrollerPortalRepository (scrollerID) {

        scrollerPortalMetaData.delete(scrollerID)
        scrollerPortalListData.delete(scrollerID)
        scrollerPortalCallbacks.delete(scrollerID)

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = (scrollerID) => {

        let scrollerlistmap = scrollerPortalListData.get(scrollerID)
        if (scrollerlistmap.modified) {
            scrollerlistmap.portalList = Array.from(scrollerlistmap.portalMap.values())
            scrollerlistmap.modified = false
        }

        scrollerPortalCallbacks.get(scrollerID).setListState() // trigger display update

    }

    // add a portal list item. The index is the scroller dataset index
    createPortalListItem (scrollerID, index, usercontent, placeholder) {

        if (this.hasPortalListItem(scrollerID, index)) {
            return this.getPortalListItem(scrollerID, index)
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

        let [portal,reverseportal] = getInPortal(usercontent || placeholder, container)

        let scrollerportals = scrollerPortalListData.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetaItem = {usercontent, placeholder, target:null, container, portal, reverseportal, reparenting:false, indexid: index,scrollerid:scrollerID}

        scrollerPortalMetaData.get(scrollerID).set(index, portalMetaItem)

        this.renderPortalList(scrollerID)

        return portalMetaItem

    }

    // update the content of a portal list item
    updatePortalListItem (scrollerID, index, usercontent) {
        let portalItem = this.getPortalListItem(scrollerID,index)

        let portal = updateInPortal(usercontent, portalItem.reverseportal )

        let scrollerportals = scrollerPortalListData.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        let portalMetaItem = scrollerPortalMetaData.get(scrollerID).get(index)
        portalMetaItem.usercontent = usercontent

        this.renderPortalList(scrollerID)

        return portalMetaItem
    }

    // delete a portal list item
    deletePortalListItem (scrollerID, index) {

        scrollerPortalMetaData.get(scrollerID).delete(index)
        let portalMetaItem = scrollerPortalListData.get(scrollerID)
        portalMetaItem.portalMap.delete(index)
        portalMetaItem.modified = true
        return portalMetaItem

    }

    // query existence of a portal list item
    hasPortalListItem (scrollerID, index) {

        return scrollerPortalMetaData.get(scrollerID).has(index)

    }

    // query existence of content for a portal list item
    hasPortalUserContent (scrollerID, index) {

        let portalItem = this.getPortalListItem(scrollerID, index)
        return  !!(portalItem && portalItem.usercontent)

    }

    // get a portal list item's meta data
    getPortalListItem (scrollerID, index) {

        return scrollerPortalMetaData.get(scrollerID).get(index)

    }

}

// export the portal manager
export const portalManager = new PortalAgentClass()
// export const PortalAgent = React.createContext(portalManager)

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

const wrapperstyle = {display:'none'} // static

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
    const isMounted = useIsMounted()

    useEffect(()=>{

        scrollerPortalCallbacks.set(scrollerID,
            {setListState:()=>{
                isMounted() && setPortalList(scrollerPortalListData.get(scrollerID).portalList)
            }})

    },[]) 

    return portalList
}
