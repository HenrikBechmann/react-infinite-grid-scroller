// portalmanager.tsx

// TODO: this should be an independent hook function for localization

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal'

const scrollerPortalMetaMaps = new Map()

const scrollerPortalBlockMaps = new Map()

const scrollerPortalCallbacks = new Map()

let cacheSetTrigger

let portalblockstyles:React.CSSProperties = {visibility:'hidden'}

const getInPortal = (content, container) => {

    let reversePortal = createHtmlPortalNode()
    reversePortal.element = container
    return [<InPortal node = {reversePortal}>
        {content}
    </InPortal>,reversePortal]

}     

const updatePortal = (content, reversePortal) => {
    // console.log('content, reversePortal in updatePortal',content, reversePortal)
    return <InPortal node = {reversePortal} >
        {content}
    </InPortal>
}

class PortalManagerClass {

    resetPortalList = (scrollerID) => {

        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        if (scrollerportals.modified) {
            scrollerportals.portalList = Array.from(scrollerportals.portalMap.values())
            scrollerportals.modified = false
        }

        scrollerPortalCallbacks.get(scrollerID).callback()

    }

    createScrollerPortalRepository (scrollerID) {

        if (!scrollerPortalMetaMaps.has(scrollerID)) {
            scrollerPortalMetaMaps.set(scrollerID, new Map())
        }
        if (!scrollerPortalBlockMaps.has(scrollerID)) {
            scrollerPortalBlockMaps.set(scrollerID, {modified:false,portalMap:new Map(),portalList:[]})
        }

    }

    clearScrollerPortalRepository (scrollerID) {

        if (scrollerPortalMetaMaps.has(scrollerID)) {
            scrollerPortalMetaMaps.get(scrollerID).clear()
        }
        if (scrollerPortalBlockMaps.has(scrollerID)) {
            scrollerPortalBlockMaps.delete(scrollerID)
        }

    }

    resetScrollerPortalRepository(scrollerID) {

        this.clearScrollerPortalRepository(scrollerID)
        this.createScrollerPortalRepository(scrollerID)

    }

    deleteScrollerPortalRepository (scrollerID) {

        scrollerPortalMetaMaps.delete(scrollerID)
        scrollerPortalBlockMaps.delete(scrollerID)
        scrollerPortalCallbacks.delete(scrollerID)

    }

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
        portalManager.resetPortalList(scrollerID)

    }

    updatePortalListItem (scrollerID, index, usercontent) {
        let portalItem = this.getPortalListItem(scrollerID,index)
        // console.log('portalItem, reverseportal in updatePortalListItem',portalItem, portalItem.reverseportal)
        let portal = updatePortal(usercontent, portalItem.reverseportal )

        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true
        let portalmap = scrollerPortalMetaMaps.get(scrollerID).get(index) 
        
        portalmap.usercontent = usercontent

        portalManager.resetPortalList(scrollerID)
    }

    deletePortalListItem (scrollerID, index) {

        scrollerPortalMetaMaps.get(scrollerID).delete(index)
        let portalitem = scrollerPortalBlockMaps.get(scrollerID)
        portalitem.portalMap.delete(index)
        portalitem.modified = true

    }

    hasPortalListItem (scrollerID, index) {

        return scrollerPortalMetaMaps.get(scrollerID).has(index)

    }

    hasPortalUserContent (scrollerID, index) {

        let portalItem = this.getPortalListItem(scrollerID, index)
        return  portalItem && portalItem.usercontent

    }

    getPortalListItem (scrollerID, index) {

        return scrollerPortalMetaMaps.get(scrollerID).get(index)

    }

}

const portalManager = new PortalManagerClass()

export const PortalManager = React.createContext(portalManager)

const wrapperstyle = {display:'none'}

export const PortalWrapper = ({
    portal, index,
}) => {

    return <div data-type='portalwrapper' data-index = {index} style = {wrapperstyle} key={index}>
        {portal}
    </div>

}

export const PortalList = ({scrollerID}) => {

    useEffect(()=>{

        scrollerPortalCallbacks.set(scrollerID,
            {callback:()=>{
                setPortalList(scrollerPortalBlockMaps.get(scrollerID).portalList)
            }})

    },[]) 

    const [portalList, setPortalList] = useState(null)

    return portalList
}
