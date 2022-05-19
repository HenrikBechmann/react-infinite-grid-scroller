// servicehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       this.serviceCalls = cradleParameters.externalCallbacksRef.current

    }

    cradleParameters

    serviceCalls

    getVisibleList = () => {

        const contentHandler = this.cradleParameters.handlersRef.current.content        

        const cradleContent = contentHandler.content
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        const cradleElements = scaffoldHandler.elements

        return getVisibleItemsList({
            itemElementMap:contentHandler.itemElements,
            viewportElement:viewportInterruptProperties.elementref.current,
            cradleElements, 
            cradleProps:this.cradleParameters.cradleInheritedPropertiesRef.current,
            cradleContent,
        })

    }

    getContentList = () => {
        let contentHandler = this.cradleParameters.handlersRef.current.content        
        let contentlist = Array.from(contentHandler.itemElements)

        contentlist.sort((a,b)=>{
            return (a[0] < b[0])?
                -1:
                1
        })

        return contentlist
    }

    reload = () => {

        const signals = this.cradleParameters.handlersRef.current.interrupts.signals
        const stateHandler = this.cradleParameters.handlersRef.current.state

        // signals.pauseCellObserver = true
        signals.pauseBreaklinesObserver = true
        signals.pauseScrollingEffects = true

        stateHandler.setCradleState('reload')

    }

    scrollToItem = (index) => {

        const signals = this.cradleParameters.handlersRef.current.interrupts.signals
        let scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        let stateHandler = this.cradleParameters.handlersRef.current.state

        // signals.pauseCellObserver = true
        signals.pauseBreaklinesObserver = true
        signals.pauseScrollingEffects = true

        scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex = index

        stateHandler.setCradleState('doreposition')

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
    let axisElement = cradleElements.axisRef.current
    let {orientation} = cradleProps
    let headlist = cradleContent.headViewComponents

    let itemlistindexes = Array.from(itemElementMap.keys())
    itemlistindexes.sort((a,b)=>{
        return (a < b)?
            -1:
            1
    })
    let headlistindexes = []
    for (let item of headlist) {
        headlistindexes.push(parseInt(item.props.index))
    }

    let list = []
    let cradleTop = headElement.offsetTop + axisElement.offsetTop, 
        cradleLeft = headElement.offsetLeft + axisElement.offsetLeft
    let scrollblockTopOffset = -viewportElement.scrollTop, 
        scrollblockLeftOffset = -viewportElement.scrollLeft,
        viewportHeight = viewportElement.offsetHeight,
        viewportWidth = viewportElement.offsetWidth,
        viewportTopOffset = -scrollblockTopOffset,
        viewportBottomOffset = -scrollblockTopOffset + viewportHeight

    for (let index of itemlistindexes) {

        let element = itemElementMap.get(index).current
        let inheadlist = headlistindexes.includes(index)
        const 
            top = 
                inheadlist?
                    element.offsetTop:
                    (
                        (orientation == 'vertical')?
                            headElement.offsetHeight:
                            0
                    ) 
                    + element.offsetTop, 
            left = 
                inheadlist?
                    element.offsetLeft:
                    (
                        (orientation == 'horizontal')?
                            headElement.offsetWidth:
                            0
                    ) 
                    + element.offsetLeft,
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

        let verticalRatio = 
                (topPortion > 0)?
                    topPortion/height:
                    bottomPortion/height,
            horizontalRatio = 
                (leftPortion > 0)?
                    leftPortion/width:
                    rightPortion/height

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

