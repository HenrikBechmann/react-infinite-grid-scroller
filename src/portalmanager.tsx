// portalmanager.tsx

/*
    The infinite list scroller stores user cell data in a hidden portal cache, from whence
    the data is pulled into the relevant ItemShell for display
*/

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
const scrollerPortalMetaMaps = new Map()
const scrollerPortalBlockMaps = new Map()
const scrollerPortalCallbacks = new Map()

class PortalManagerClass {

    // initialize scroller repository
    createScrollerPortalRepository (scrollerID) {

        if (!scrollerPortalMetaMaps.has(scrollerID)) {
            scrollerPortalMetaMaps.set(scrollerID, new Map())
        }
        if (!scrollerPortalBlockMaps.has(scrollerID)) {
            scrollerPortalBlockMaps.set(scrollerID, {modified:false,portalMap:new Map(),portalList:[]})
        }

    }

    // clear scroller repository for list recreation (like re-positioning in list)
    clearScrollerPortalRepository (scrollerID) {

        if (scrollerPortalMetaMaps.has(scrollerID)) {
            scrollerPortalMetaMaps.get(scrollerID).clear()
        }
        if (scrollerPortalBlockMaps.has(scrollerID)) {
            scrollerPortalBlockMaps.delete(scrollerID)
        }

    }

    // start again
    resetScrollerPortalRepository(scrollerID) {

        this.deleteScrollerPortalRepository(scrollerID)
        this.createScrollerPortalRepository(scrollerID)

    }

    // delete scroller repository for reset or unmount
    deleteScrollerPortalRepository (scrollerID) {

        scrollerPortalMetaMaps.delete(scrollerID)
        scrollerPortalBlockMaps.delete(scrollerID)
        scrollerPortalCallbacks.delete(scrollerID)

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = (scrollerID) => {

        let scrollerblockmap = scrollerPortalBlockMaps.get(scrollerID)
        if (scrollerblockmap.modified) {
            scrollerblockmap.portalList = Array.from(scrollerblockmap.portalMap.values())
            scrollerblockmap.modified = false
        }

        scrollerPortalCallbacks.get(scrollerID).setState() // trigger display update

    }

    // add a portal list item. The index is the scroller dataset index
    createPortalListItem (scrollerID, index, usercontent, placeholder) {

        if (this.hasPortalListItem(scrollerID, index)) {
            return
        }

        let container = document.createElement('div')
        // container.style.inset = '0px' // not recognized by React
        container.style.top = '0px'
        container.style.right = '0px'
        container.style.left = '0px'
        container.style.bottom = '0px'
        container.style.position = 'absolute'
        container.dataset.type = 'portalcontainer'
        container.dataset.index = index
        container.dataset.scrollerid = scrollerID
        container.setAttribute('key',index)

        let [portal,reverseportal] = getInPortal(usercontent || placeholder, container)

        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        scrollerPortalMetaMaps.get(scrollerID).set(index, 
            {usercontent, placeholder, target:null, container, portal, reverseportal, reparenting:false, indexid:index,scrollerid:scrollerID} )

        this.renderPortalList(scrollerID)

    }

    // update the content of a portal list item
    updatePortalListItem (scrollerID, index, usercontent) {
        let portalItem = this.getPortalListItem(scrollerID,index)

        let portal = updateInPortal(usercontent, portalItem.reverseportal )

        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true

        scrollerPortalMetaMaps.get(scrollerID).get(index).usercontent = usercontent

        this.renderPortalList(scrollerID)
    }

    // delete a portal list item
    deletePortalListItem (scrollerID, index) {

        scrollerPortalMetaMaps.get(scrollerID).delete(index)
        let portalitem = scrollerPortalBlockMaps.get(scrollerID)
        portalitem.portalMap.delete(index)
        portalitem.modified = true

    }

    // query existence of a portal list item
    hasPortalListItem (scrollerID, index) {

        return scrollerPortalMetaMaps.get(scrollerID).has(index)

    }

    // query existence of content for a portal list item
    hasPortalUserContent (scrollerID, index) {

        let portalItem = this.getPortalListItem(scrollerID, index)
        return  portalItem && portalItem.usercontent

    }

    // get a portal list item's meta data
    getPortalListItem (scrollerID, index) {

        return scrollerPortalMetaMaps.get(scrollerID).get(index)

    }

}

// export the portal manager
export const PortalManager = React.createContext(new PortalManagerClass())

// Utility functions

// get a react-reverse-portal InPortal component, with its metadata
// from user content and container
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

// hidden portal wrapper for clarity and usage of conentional react relisting services
export const PortalWrapper = ({
    portal, index,
}) => {

    return <div data-type='portalwrapper' data-index = {index} style = {wrapperstyle} key={index}>
        {portal}
    </div>

}

// portal list component for rapid relisting for updates, using external callback for set state
export const PortalList = ({scrollerID}) => {

    const [portalList, setPortalList] = useState(null)

    useEffect(()=>{

        scrollerPortalCallbacks.set(scrollerID,
            {setState:()=>{
                setPortalList(scrollerPortalBlockMaps.get(scrollerID).portalList)
            }})

    },[]) 

    return portalList
}
