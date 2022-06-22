// portalhandler.tsx

/*
    The infinite list scroller stores user cell data in a central hidden portal cache for each
    infinitegridscroller root, from whence the data is pulled into the relevant CellShell for display
*/

import React, {useState, useEffect, useRef} from 'react'
import ReactDOM from 'react-dom'

// import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// global scroller data, organized by session scrollerID
export class CacheHandler {

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    scrollerProps = {
        setListState:null,
        modified:false,
        portalMetadataMap:new Map(),
        portalMap:new Map(),
        portalList:null
    }

    // initialize scroller repository

    clearCache = () => {

        // keep the setListState callback
        this.scrollerProps.portalMap.clear() 
        this.scrollerProps.portalMetadataMap.clear()
        this.scrollerProps.portalList = null
        this.scrollerProps.modified = false

    }

    // set state of the PortalList component of the scroller to trigger render
    renderPortalList = () => {

        if (this.scrollerProps.modified) {
            this.scrollerProps.portalList = Array.from(this.scrollerProps.portalMap.values())
            this.scrollerProps.modified = false
        }

        // console.log('rendering portal list', this.scrollerProps.portalList, this.scrollerProps.portalMap)
        this.scrollerProps.setListState() // trigger display update

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // add a portal list item. The index is the scroller's portal dataset index
    // fetchPortal(index, content) { // content is used for new portal only

    //     if (this.hasPortal(index)) {
    //         return this.getPortal(index)
    //     }

    //     // if not found, create new portal
    //     const [portal,portalRecord] = createPortal(content, index)

    //     this.scrollerProps.portalMap.set(index,<PortalWrapper portal = {portal} key = {index} index = {index}/>)
    //     this.scrollerProps.modified = true

    //     const portalMetadata = {
    //         portalRecord, 
    //         isReparenting:false,
    //         hasusercontent:false 
    //     }

    //     this.scrollerProps.portalMetadataMap.set(index, portalMetadata)

    //     this.renderPortalList()

    //     return portalMetadata

    // }

    getPortal(index) {

        if (this.hasPortal(index)) {
            return this._getPortal(index)
        }

    }

    fetchPortal(index, content, cellWidth, cellHeight) { // content is used for new portal only

        // if not found, create new portal
        const [portal, contentenvelope] = createPortal({index, content})

        // const portalholder = <div

        const holderRef = {
            current:null
        }

        this.scrollerProps.portalMap.set(index,<PortalWrapper key = {index} portal = {portal} index = {index}>
            <div ref = {holderRef}></div>
        </PortalWrapper>)
        this.scrollerProps.modified = true

        const portalMetadata = {
            portalRecord:portal, 
            isReparenting:false,
            hasusercontent:false,
            contentenvelope,
            holderRef,
        }

        this.scrollerProps.portalMetadataMap.set(index, portalMetadata)

        this.renderPortalList()

        return portalMetadata

    }
    // update the content of a portal list item
    // updatePortal(index, content) {
    //     const portalMetadata = this.getPortal(index)

    //     const portalComponent = updateInPortal(content, portalMetadata.portalRecord )

    //     this.scrollerProps.portalMap.set(index,<PortalWrapper portal = {portalComponent} key = {index} index = {index}/>)
    //     this.scrollerProps.modified = true

    //     this.renderPortalList()

    //     return portalMetadata
    // }

    // delete a portal list item
    deletePortal(index) {

        this.scrollerProps.portalMetadataMap.delete(index)
        this.scrollerProps.portalMap.delete(index)
        this.scrollerProps.modified = true

    }

    // query existence of a portal list item
    hasPortal(index) {

        return this.scrollerProps.portalMetadataMap.has(index)

    }

    // get a portal list item's meta data
    private _getPortal(index) {

        return this.scrollerProps.portalMetadataMap.get(index)

    }

}

// ==========================[ Utility functions ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
// const createPortal = (content, index) => {

//     let portalRecord = createHtmlPortalNode()

//     let container = portalRecord.element
//     // container.style.inset = '0px' 
//     container.style.position = 'absolute'
//     container.style.height = '100px'
//     container.style.width = '100px'
//     container.dataset.type = 'contentenvelope'
//     container.dataset.index = index

//     container.setAttribute('key',index)


//     return [
//         <InPortal node = {portalRecord}>{content}</InPortal>,
//         portalRecord
//     ]

// }     

const createPortal = ({index, content}) => {

    // TODO: assign width and height to wrapper not container
    // const portalRecord = createHtmlPortalNode()

    const contentenvelope = document.createElement('div') //portalRecord.element
    // container.style.inset = '0px' 
    contentenvelope.style.position = 'absolute'
    contentenvelope.style.height = '100%'
    contentenvelope.style.width = '100%'
    contentenvelope.dataset.type = 'contentenvelope'
    contentenvelope.dataset.index = index

    contentenvelope.setAttribute('key',index)


    return [
        // <InPortal node = {portalRecord}>{content}</InPortal>,
        ReactDOM.createPortal(content, contentenvelope),
        // portalRecord,
        contentenvelope,
    ]

}     
// update an InPortal component's user content
// const updateInPortal = (content, portalRecord) => {

//     return <InPortal node = {portalRecord} >
//         { content }
//     </InPortal>

// }

// ========================[ Utility components ]==============================

const wrapperstyle = {display:'block'} // static; should take same dimensions as container CellShell

// hidden portal wrapper for clarity and usage of conventional react relisting services
export const PortalWrapper = ({ portal, index, children }) => {

    // console.log('PortalWrapper children',children)
    return  <div data-type = 'portalwrapper' data-index = { index } style = { wrapperstyle } key = { index }>
        { [portal, children] }
    </div>
    
}

// portal list component for rapid relisting of updates, using external callback for set state
export const PortalList = ({ scrollerProps }) => {

    const [portalList, setPortalList] = useState(null)
    const isMountedRef = useRef(true)

    useEffect(()=>{

        scrollerProps.setListState = ()=>{
            isMountedRef.current && setPortalList(scrollerProps.portalList)
        }

        return () => {isMountedRef.current = false}

    },[]) 

    // console.log('portalList',portalList)

    return portalList
}
