// contentmanager.tsx

import React, {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

const contentlists = new Map()

let portalCacheMap = new Map()

export let maincachetrigger = true

// let contextTriggerFn = () => cacheGenerationCounter++

let cacheSetTrigger

export const PortalCache = () => {
    // const trigger = useContext(CacheContext)
    const [cachetoggle, setCachetoggle] = useState(maincachetrigger)
    // console.log('running PORTALCACHE', cachetoggle)
    // trigger.contextTrigger()
    let portalLists = []
    let portalkeys = []
    useEffect(()=>{
        cacheSetTrigger = setCachetoggle
    },[])
    portalCacheMap.forEach((value, key) => {
        if (value.modified) {
            value.portalList = Array.from(value.portals.values())
            value.modified = false
            // ++cacheGenerationCounter
        }
        portalLists.push(value.portalList)
        portalkeys.push(key)
    })
    let index = 0
    let portalblocks = []
    for (let key of portalkeys) {
        portalblocks.push(<div key = {key}>{portalLists[index]}</div>)
        index++
    }
    return <div>{portalblocks}</div>
}

const getPortal = (content, container, index) => {
    // console.log('returning from getPortal')
    return ReactDOM.createPortal(content, container, index)
    // return <ItemPortal content = {content} container = {container}/>
} 
class ContentManager {
    // constructor() {}
    setScrollerContentlist (scrollerID) {
        if (!contentlists.has(scrollerID)) {
            contentlists.set(scrollerID, new Map())
        }
        if (!portalCacheMap.has(scrollerID)) {
            portalCacheMap.set(scrollerID, {modified:false,portals:new Map(),portalList:[]})
        }
    }
    clearScrollerContentlist (scrollerID) {
        if (contentlists.has(scrollerID)) {
            contentlists.get(scrollerID).clear()
        }
        if (portalCacheMap.has(scrollerID)) {
            portalCacheMap.delete(scrollerID)
        }
    }
    resetScrollerContentList(scrollerID) {
        this.clearScrollerContentlist(scrollerID)
        this.setScrollerContentlist(scrollerID)
    }
    deleteScrollerContentlist (scrollerID) {
        contentlists.delete(scrollerID)
    }
    setContentlistItem (scrollerID, index, content) {
        // console.log('setting item ScrollerID, index, content', scrollerID, index, content)
        if (this.hasContentlistItem(scrollerID, index)) {
            return this.getContentlistItem(scrollerID,index).portal
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
        let portalitem = portalCacheMap.get(scrollerID)
        portalitem.portals.set(index,portal)
        portalitem.modified = true
        contentlists.get(scrollerID).set(index, 
            {content, target:null, container, portal, reparenting:false, indexid:index,scrollerid:scrollerID} )
        maincachetrigger = !maincachetrigger
        cacheSetTrigger(maincachetrigger)
    }
    deleteContentlistItem (scrollerID, index) {
        let itemdata = contentlists.get(scrollerID).get(index)
        contentlists.get(scrollerID).delete(index)
        let portalitem = portalCacheMap.get(scrollerID)
        portalitem.portals.delete(index)
        portalitem.modified = true
        maincachetrigger = !maincachetrigger
        cacheSetTrigger(maincachetrigger)
    }
    attachContentlistItem (scrollerID, index, target) {
        let item = contentlists.get(scrollerID).get(index)
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
    detachContentlistItem (scrollerID, index) {
        let item = contentlists.get(scrollerID).get(index)
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
    hasContentlistItem (scrollerID, index) {
        return contentlists.get(scrollerID).has(index)
    }
    getContentlistItem (scrollerID, index) {
        return contentlists.get(scrollerID).get(index)
    }
}

const contentManager = new ContentManager()

// export const cacheContextData = {contextTrigger:() => ++cacheGenerationCounter}
// export const CacheContext = React.createContext(null)

export const ContentContext = React.createContext(contentManager)