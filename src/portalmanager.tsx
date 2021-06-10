// contentmanager.tsx

// TODO: this should be an independent hook function for localization

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal'

const scrollerPortalMetaMaps = new Map()

const scrollerPortalBlockMaps = new Map()

const scrollerPortalCallbacks = new Map()

// export let maincachetrigger = true

let cacheSetTrigger

let portalblockstyles:React.CSSProperties = {visibility:'hidden'}

// export const PortalTree = () => {
//     const [cachetoggle, setCachetoggle] = useState(maincachetrigger)
//     console.log('running PORTALTREE', cachetoggle)
//     let portalSets = []
//     let portalKeys = []
//     useEffect(()=>{
//         cacheSetTrigger = setCachetoggle
//     },[])
//     scrollerPortalBlockMaps.forEach((block, key) => {
//         if (block.modified) {
//             block.portalList = Array.from(block.portalMap.values())
//             block.modified = false
//         }
//         portalSets.push(block.portalList)
//         portalKeys.push(key)
//     })
//     let index = 0
//     let portalTreeBlocksList = []
//     for (let key of portalKeys) {
//         portalTreeBlocksList.push(<div key = {key}>{portalSets[index]}</div>)
//         index++
//     }
//     // console.log('portalTreeBlocksList',portalTreeBlocksList)
//     return <div key = 'portalblocks' id = 'portalblocks' style={portalblockstyles}>{portalTreeBlocksList}</div>
// }

const getPortal = (content, container) => {
    // console.log('returning from getPortal')
    let reversePortal = createHtmlPortalNode()
    reversePortal.element = container
    return [<InPortal node = {reversePortal}>
        {content}
    </InPortal>,reversePortal]
}     

let scrollerportalrootrefs = new Map()

class PortalManager {

    // getPortalList = (scrollerID) => {
    //     // console.log('scrollerPortalBlockMaps',scrollerPortalBlockMaps)
    //     let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
    //     if (scrollerportals.modified) {
    //         scrollerportals.portalList = Array.from(scrollerportals.portalMap.values())
    //         scrollerportals.modified = false
    //     }
    //     console.log('portalList',scrollerportals.portalList)
    //     return scrollerportals.portalList
    // }

    resetPortalList = (scrollerID) => {
        // console.log('scrollerPortalBlockMaps',scrollerPortalBlockMaps)
        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        console.log('resetPortalList scrollerportals',scrollerportals)
        if (scrollerportals.modified) {
            scrollerportals.portalList = Array.from(scrollerportals.portalMap.values())
            scrollerportals.modified = false
        }

        // console.log('scrollerPortalCallbacks',scrollerID, scrollerPortalCallbacks)
        let callbackobj = scrollerPortalCallbacks.get(scrollerID)
        // console.log('callbackobj',callbackobj)
        let callback = scrollerPortalCallbacks.get(scrollerID).callback
        // console.log('callback',callback)
        callback()
        // console.log('portalList',scrollerportals.portalList)
        // return scrollerportals.portalList
    }

    setPortalRootRef (scrollerID, ref) {
        scrollerportalrootrefs.set(scrollerID, {rootref:ref})
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

    }

    createPortalListItem (scrollerID, index, usercontent) {
        // console.log('creating portal item ScrollerID, index, content', scrollerID, index, usercontent)
        if (this.hasPortalListItem(scrollerID, index)) {
            return this.getPortalListItem(scrollerID,index).portal
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

        // scrollerportalrootrefs.get(scrollerID).rootref.current.appendChild(container)

        let [portal,reverseportal] = getPortal(usercontent, container)
        // portalList.push(<div key = {index}>{portal}</div>)
        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        scrollerportals.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
        scrollerportals.modified = true
        scrollerPortalMetaMaps.get(scrollerID).set(index, 
            {usercontent, target:null, container, portal, reverseportal, reparenting:false, indexid:index,scrollerid:scrollerID} )
        // maincachetrigger = !maincachetrigger
        // cacheSetTrigger(maincachetrigger)
    }

    deletePortalListItem (scrollerID, index) {
        // let itemdata = portalLists.get(scrollerID).get(index)
        scrollerPortalMetaMaps.get(scrollerID).delete(index)
        let portalitem = scrollerPortalBlockMaps.get(scrollerID)
        portalitem.portalMap.delete(index)
        portalitem.modified = true
        // maincachetrigger = !maincachetrigger
        // cacheSetTrigger(maincachetrigger)
    }

    hasPortalListItem (scrollerID, index) {
        return scrollerPortalMetaMaps.get(scrollerID).has(index)
    }

    getPortalListItem (scrollerID, index) {
        return scrollerPortalMetaMaps.get(scrollerID).get(index)
    }

}

const portalManager = new PortalManager()

export const PortalContext = React.createContext(portalManager)

export const PortalWrapper = ({
    portal, index,
}) => {

    return <div data-type='portalwrapper' key={index}>
        {portal}
    </div>

}

export const PortalList = ({scrollerID}) => {

    useEffect(()=>{
        console.log('setting callback with scrollerID',scrollerID)
        scrollerPortalCallbacks.set(scrollerID,
            {callback:()=>{
                setPortalList(scrollerPortalBlockMaps.get(scrollerID).portalList)
            }})
    },[]) 

    const [portalList, setPortalList] = useState(null)

    return portalList
}
