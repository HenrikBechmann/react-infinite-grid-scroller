// servicemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'

export default class ServiceManager extends CradleManagement{

    constructor(commonPropsRef, serviceCallsRef) {

       super(commonPropsRef)

       this.serviceCalls = serviceCallsRef.current

    }

    serviceCalls

    getVisibleList = () => {

        let contentManager = this._managersRef.current.content        

        let cradleContent = contentManager.content
        let viewportData = this._viewportdataRef.current
        let cradleManager = this._managersRef.current.cradle
        let cradleElements = cradleManager.elements

        return getVisibleItemsList({
            itemElementMap:contentManager.itemElements,
            viewportElement:viewportData.elementref.current,
            cradleElements, 
            cradleProps:this._cradlePropsRef.current,
            cradleContent,
        })

    }

    getContentList = () => {
        let contentManager = this._managersRef.current.content        
        let contentlist = Array.from(contentManager.itemElements)

        contentlist.sort((a,b)=>{
            return (a[0] < b[0])?-1:1
        })

        return contentlist
    }

    reload = () => {

        let cradleManager = this._managersRef.current.cradle
        let signalsManager = this._managersRef.current.signals
        let stateManager = this._managersRef.current.state
        let signals = signalsManager.signals
        // let viewportData = this._viewportdata

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        let spineVisiblePosOffset
        let cradleElements = cradleManager.elements

        cradleManager.cradleReferenceData.nextSpinePixelOffset = cradleManager.cradleReferenceData.readySpinePixelOffset
        cradleManager.cradleReferenceData.nextItemIndexReference = cradleManager.cradleReferenceData.readyItemIndexReference        

        stateManager.setCradleState('reload')

    }

    scrollToItem = (index) => {

        let signalsManager = this._managersRef.current.signals
        let cradleManager = this._managersRef.current.cradle
        let stateManager = this._managersRef.current.state

        let signals = signalsManager.signals
        // let cradleManager = cradleAgentRef.current

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        cradleManager.cradleReferenceData.nextSpinePixelOffset = 
            cradleManager.cradleReferenceData.readySpinePixelOffset
        cradleManager.cradleReferenceData.nextItemIndexReference = 
            cradleManager.cradleReferenceData.readyItemIndexReference = index

        stateManager.setCradleState('reposition')

    }

}

const getVisibleItemsList = ({   

        itemElementMap, 
        viewportElement, 
        cradleElements, 
        cradleProps, 
        cradleContent

    }) => {

    let headElement = cradleElements.headRef.current
    let spineElement = cradleElements.spineRef.current
    let {orientation} = cradleProps
    let headlist = cradleContent.headView

    let itemlistindexes = Array.from(itemElementMap.keys())
    itemlistindexes.sort((a,b)=>{
        return (a < b)?-1:1
    })
    let headlistindexes = []
    for (let item of headlist) {
        headlistindexes.push(parseInt(item.props.index))
    }

    let list = []
    let cradleTop = headElement.offsetTop + spineElement.offsetTop, 
        cradleLeft = headElement.offsetLeft + spineElement.offsetLeft
    let scrollblockTopOffset = -viewportElement.scrollTop, 
        scrollblockLeftOffset = -viewportElement.scrollLeft,
        viewportHeight = viewportElement.offsetHeight,
        viewportWidth = viewportElement.offsetWidth,
        viewportTopOffset = -scrollblockTopOffset,
        viewportBottomOffset = -scrollblockTopOffset + viewportHeight

    for (let index of itemlistindexes) {

        let element = itemElementMap.get(index).current
        let inheadlist = headlistindexes.includes(index)
        let top = inheadlist?(element.offsetTop):(((orientation == 'vertical')?headElement.offsetHeight:0) + element.offsetTop), 
            left = inheadlist?(element.offsetLeft):(((orientation == 'horizontal')?headElement.offsetWidth:0) + element.offsetLeft), 
            width = element.offsetWidth, 
            height = element.offsetHeight,
            right = left + width,
            bottom = top + height

        let itemTopOffset = scrollblockTopOffset + cradleTop + top, // offset from top of viewport
            itemBottomOffset = scrollblockTopOffset + cradleTop + bottom, // offset from top of viewport
            itemLeftOffset = scrollblockLeftOffset + cradleLeft + left, 
            itemRightOffset = scrollblockLeftOffset + cradleLeft + right 


        let isVisible = false // default

        let topPortion,
            bottomPortion,
            leftPortion,
            rightPortion

        if ((itemTopOffset < 0) && (itemBottomOffset > 0)) {

            (orientation == 'vertical') && (isVisible = true)
            bottomPortion = itemBottomOffset
            topPortion = bottomPortion - height

        } else if ((itemTopOffset >= 0) && (itemBottomOffset < viewportHeight)) {

            (orientation == 'vertical') && (isVisible = true)
            topPortion = height
            bottomPortion = 0

        } else if ((itemTopOffset > 0) && ((itemTopOffset - viewportHeight) < 0)) {

            (orientation == 'vertical') && (isVisible = true)
            topPortion = viewportHeight - itemTopOffset
            bottomPortion = topPortion - height

        } else {

            if (orientation == 'vertical') continue

        }

        if (itemLeftOffset < 0 && itemRightOffset > 0) {

            (orientation == 'horizontal') && (isVisible = true)
            rightPortion = itemRightOffset
            leftPortion = rightPortion - width

        } else if (itemLeftOffset >= 0 && itemRightOffset < viewportWidth) {

            (orientation == 'horizontal') && (isVisible = true)
            leftPortion = width
            rightPortion = 0

        } else if (itemLeftOffset > 0 && (itemLeftOffset - viewportWidth) < 0) {

            (orientation == 'horizontal') && (isVisible = true)
            leftPortion = viewportWidth - itemLeftOffset
            rightPortion = leftPortion - width

        } else {

            if (orientation == 'horizontal') continue

        }

        let verticalRatio = (topPortion > 0)?topPortion/height:bottomPortion/height,
            horizontalRatio = (leftPortion > 0)?leftPortion/width:rightPortion/height

        let itemData = {

            index,
            isVisible,

            top,
            right,
            bottom,
            left,
            width,
            height,

            itemTopOffset,
            itemBottomOffset,
            topPortion,
            bottomPortion,

            itemLeftOffset,
            itemRightOffset,
            leftPortion,
            rightPortion,

            verticalRatio,
            horizontalRatio,
            
        }

        list.push(itemData)

    }

    return list
}

