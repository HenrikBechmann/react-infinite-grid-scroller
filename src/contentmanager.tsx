// contentmanager.tsx

import React from 'react'
import ReactDOM from 'react-dom'

const contentlists = new Map()

// const ItemPortal = ({content, container}) => {
//     console.log('returning from ItemPortal')
//     return ReactDOM.createPortal(content, container)
// }

export let portalList = []

const getPortal = (content, container, index) => {
    // console.log('returning from getPortal')
    return ReactDOM.createPortal(content, container)
    // return <ItemPortal content = {content} container = {container}/>
} 
class ContentManager {
    // constructor() {}
    setScrollerContentlist (scrollerID) {
        if (!contentlists.has(scrollerID)) {
            contentlists.set(scrollerID, new Map())
        }
    }
    clearScrollerContentlist (scrollerID) {
        if (contentlists.has(scrollerID)) {
            contentlists.get(scrollerID).clear()
        }
    }
    deleteScrollerContentlist (scrollerID) {
        contentlists.delete(scrollerID)
    }
    setContentlistItem (scrollerID, index, content) {
        if (this.hasContentlistItem(scrollerID, index)) {
            return this.getContentlistItem(scrollerID,index).portal
        }
        let container = document.createElement('div')
        container.style.top = '0px'
        container.style.right = '0px'
        container.style.left = '0px'
        container.style.bottom = '0px'
        container.style.position = 'absolute'
        container.dataset.index = index
        container.dataset.scrollerid = scrollerID
        let portal = getPortal(content, container, index)
        // portalList.push(<div key = {index}>{portal}</div>)
        portalList.push(portal)
        contentlists.get(scrollerID).set(index, {content, target:null, container, portal} )
        return portal
    }
    deleteContentlistItem (scrollerID, index) {
        contentlists.get(scrollerID).delete(index)
    }
    attachContentlistItem (scrollerID, index, target) {
        this.detachContentlistItem(scrollerID, index)
        let item = contentlists.get(scrollerID).get(index)
        // console.log('item to be attached; scrollerID, index',item, scrollerID, index)
        if (!item) return
        target.appendChild(item.container)
        item.target = target
    }
    detachContentlistItem (scrollerID, index) {
        let item = contentlists.get(scrollerID).get(index)
        if (item) {
            // console.log('detach child item scrollerID, index',item, scrollerID, index)
            if (item.target && item.container) {
                try {
                    item.target.removeChild(item.container)
                } catch(e) {
                    // noops
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

export const contentManager = new ContentManager()

export const ContentContext = React.createContext(null)