// servicemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'

export default class ServiceAgent extends CradleManagement{

    constructor(commonPropsRef, serviceCallsRef) {

       super(commonPropsRef)

       this.serviceCalls = serviceCallsRef.current

    }

    serviceCalls

    getVisibleList = () => {

        let contentAgent = this._managersRef.current.content        

        let cradleContent = contentAgent.content
        let viewportData = this._viewportdataRef.current
        let cradleAgent = this._managersRef.current.cradle
        let cradleElements = cradleAgent.elements

        return getVisibleItemsList({
            itemElementMap:contentAgent.itemElements,
            viewportElement:viewportData.elementref.current,
            cradleElements, 
            cradleProps:this._cradlePropsRef.current,
            cradleContent,
        })

    }

    getContentList = () => {
        let contentAgent = this._managersRef.current.content        
        let contentlist = Array.from(contentAgent.itemElements)

        contentlist.sort((a,b)=>{
            return (a[0] < b[0])?-1:1
        })

        return contentlist
    }

    reload = () => {

        let cradleAgent = this._managersRef.current.cradle
        let signalsAgent = this._managersRef.current.signals
        let stateAgent = this._managersRef.current.state
        let signals = signalsAgent.signals
        // let viewportData = this._viewportdata

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        let spineVisiblePosOffset
        let cradleElements = cradleAgent.elements

        cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset
        cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex        

        stateAgent.setCradleState('reload')

    }

    scrollToItem = (index) => {

        let signalsAgent = this._managersRef.current.signals
        let cradleAgent = this._managersRef.current.cradle
        let stateAgent = this._managersRef.current.state

        let signals = signalsAgent.signals
        // let cradleAgent = cradleAgentRef.current

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        cradleAgent.cellReferenceData.nextSpineOffset = 
            cradleAgent.cellReferenceData.readySpineOffset
        cradleAgent.cellReferenceData.nextReferenceIndex = 
            cradleAgent.cellReferenceData.readyReferenceIndex = index

        stateAgent.setCradleState('reposition')

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

