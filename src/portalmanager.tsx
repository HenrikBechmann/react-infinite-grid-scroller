// contentmanager.tsx

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

const scrollerPortalMetaMaps = new Map()

const scrollerPortalBlockMaps = new Map()

export let maincachetrigger = true

let cacheSetTrigger

export const PortalTreeBlocks = () => {
    // const trigger = useContext(CacheContext)
    const [cachetoggle, setCachetoggle] = useState(maincachetrigger)
    console.log('running PORTALCACHE', cachetoggle)
    let portalSets = []
    let portalKeys = []
    useEffect(()=>{
        cacheSetTrigger = setCachetoggle
    },[])
    scrollerPortalBlockMaps.forEach((block, key) => {
        if (block.modified) {
            block.portalList = Array.from(block.portalMap.values())
            block.modified = false
        }
        portalSets.push(block.portalList)
        portalKeys.push(key)
    })
    let index = 0
    let portalTreeBlocksList = []
    for (let key of portalKeys) {
        portalTreeBlocksList.push(<div key = {key}>{portalSets[index]}</div>)
        index++
    }
    let portalblockstyles:React.CSSProperties = {visibility:'hidden'}
    return <div key = 'portalblocks' id = 'portalblocks' style={portalblockstyles}>{portalTreeBlocksList}</div>
}

const getPortal = (content, container, index) => {
    // console.log('returning from getPortal')
    return ReactDOM.createPortal(content, container, index)
    // return <ItemPortal content = {content} container = {container}/>
} 
class PortalManager {

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
    }

    createPortalListItem (scrollerID, index, content) {
        // console.log('setting item ScrollerID, index, content', scrollerID, index, content)
        if (this.hasPortalListItem(scrollerID, index)) {
            return this.getPortalListItem(scrollerID,index).portal
        }
        let container = document.createElement('div')
        container.style.top = '0px'
        container.style.right = '0px'
        container.style.left = '0px'
        container.style.bottom = '0px'
        container.style.position = 'absolute'
        container.dataset.type = 'portalcontainer'
        container.dataset.index = index
        container.dataset.scrollerid = scrollerID
        let portal = getPortal(content, container, index)
        // portalList.push(<div key = {index}>{portal}</div>)
        let scrollerportals = scrollerPortalBlockMaps.get(scrollerID)
        scrollerportals.portalMap.set(index,portal)
        scrollerportals.modified = true
        scrollerPortalMetaMaps.get(scrollerID).set(index, 
            {content, target:null, container, portal, reparenting:false, indexid:index,scrollerid:scrollerID} )
        maincachetrigger = !maincachetrigger
        cacheSetTrigger(maincachetrigger)
    }

    deletePortalListItem (scrollerID, index) {
        // let itemdata = portalLists.get(scrollerID).get(index)
        scrollerPortalMetaMaps.get(scrollerID).delete(index)
        let portalitem = scrollerPortalBlockMaps.get(scrollerID)
        portalitem.portalMap.delete(index)
        portalitem.modified = true
        maincachetrigger = !maincachetrigger
        cacheSetTrigger(maincachetrigger)
    }

    attachPortalListItem (scrollerID, index, target) {
        let item = scrollerPortalMetaMaps.get(scrollerID).get(index)
        // console.log('item to be attached; scrollerID, index',item, scrollerID, index)
        if (!item) return
        // console.log('setting reparenting to true: scrollerID, index', scrollerID, index)
        item.reparenting = true
        // this.detachContentlistItem(scrollerID, index)
        target.appendChild(item.container)
        // console.log('scrollerID, index, getBoundingClientRect',scrollerID, index, item.container.getBoundingClientRect())
        item.target = target
        setTimeout(()=>{
            item.reparenting = false
            // console.log('setting reparenting to false', scrollerID, index)
        })
    }

    detachPortalListItem (scrollerID, index) {
        let item = scrollerPortalMetaMaps.get(scrollerID).get(index)
        if (item) {
            // console.log('detach child item scrollerID, index',item, scrollerID, index)
            if (item.target && item.container) {
                try {
                    item.target.removeChild(item.container)
                } catch(e) {
                    // noop
                }
            }
        }
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
