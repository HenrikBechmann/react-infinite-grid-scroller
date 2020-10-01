// contentmanager.tsx

import React from 'react'
import ReactDOM from 'react-dom'

const contentlists = new Map()

const ItemPortal = ({content, container}) => {
    return ReactDOM.createPortal(content, container)
}
class ContentManager {
    // constructor() {}
    setContentlist (scrollerID) {
        if (!contentlists.has(scrollerID)) {
            contentlists.set(scrollerID, new Map())
        }
    }
    deleteContentlist (scrollerID) {
        contentlists.delete(scrollerID)
    }
    setContentlistItem (scrollerID, index, content) {
        if (this.hasContentlistItem(scrollerID, index)) {
            return
        }
        let container = document.createElement('div')
        container.style.top = '0px'
        container.style.right = '0px'
        container.style.left = '0px'
        container.style.bottom = '0px'
        container.style.position = 'absolute'
        let component = <ItemPortal content = {content} container = {container}/>
        contentlists.get(scrollerID).set(index, {content, target:null, container, component} )
    }
    deleteContentlistItem (scrollerID, index) {
        contentlists.get(scrollerID).delete(index)
    }
    attachContentlistItem (scrollerID, index, target) {
        this.detachContentlistItem(scrollerID, index)
        let item = contentlists.get(scrollerID).get(index)
        if (!item) return
        target.appendChild(item.container)
        item.target = target
    }
    detachContentlistItem (scrollerID, index) {
        let item = contentlists.get(scrollerID).get(index)
        if (item) {
            if (item.target && item.container) {
                item.target.removeChild(item.container)
            }
        }
    }
    hasContentlistItem (scrollerID, index) {
        return contentlists.get(scrollerID).has(index)
    }
}

export const contentManager = new ContentManager()

export const ContentContext = React.createContext(null)