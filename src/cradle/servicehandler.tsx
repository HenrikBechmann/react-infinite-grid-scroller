// servicehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       this.serviceCalls = cradleParameters.externalCallbacksRef.current

    }

    private cradleParameters

    public serviceCalls

    // public getVisibleList = () => {

    //     const {contentHandler} = this.cradleParameters.handlersRef.current        

    //     const cradleContent = contentHandler.content
    //     const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
    //     const {scaffoldHandler} = this.cradleParameters.handlersRef.current
    //     const cradleElements = scaffoldHandler.elements

    //     return getVisibleItemsList({
    //         itemElementMap:contentHandler.itemElements,
    //         viewportElement:viewportInterruptProperties.elementRef.current,
    //         cradleElements, 
    //         cradleProps:this.cradleParameters.cradleInheritedPropertiesRef.current,
    //         cradleContent,
    //     })

    // }

    // public getContentList = () => {
    //     const { contentHandler } = this.cradleParameters.handlersRef.current
    //     const contentlist = Array.from(contentHandler.itemElements)

    //     contentlist.sort((a,b)=>{
    //         return (a[0] < b[0])?
    //             -1:
    //             1
    //     })

    //     return contentlist
    // }

    // TODO: adjust axisPixelOffset to match new data
    public reload = () => {

        // console.log('calling reload state from serviceHandler')

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { stateHandler } = this.cradleParameters.handlersRef.current

        signals.pauseCradleIntersectionObserver = true
        signals.pauseTriggerlinesObserver = true
        signals.pauseScrollingEffects = true
        stateHandler.setCradleState('reload')

    }


    public clearCache = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        stateHandler.setCradleState('clearcache')

    }

    public scrollToItem = (index) => {

        // console.log('calling scrollToItem: index', index)

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { scaffoldHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        scaffoldHandler.cradlePositionData.targetAxisReferenceIndex = index

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

    const headElement = cradleElements.headRef.current
    const axisElement = cradleElements.axisRef.current
    const {orientation} = cradleProps
    const headlist = cradleContent.headModelComponents

    const itemlistindexes = Array.from(itemElementMap.keys())
    itemlistindexes.sort((a,b)=>{
        return (a < b)?
            -1:
            1
    })
    const headlistindexes = []
    for (let item of headlist) {
        headlistindexes.push(parseInt(item.props.index))
    }

    const list = []
    const cradleTop = headElement.offsetTop + axisElement.offsetTop, 
        cradleLeft = headElement.offsetLeft + axisElement.offsetLeft
    const scrollblockTopOffset = -viewportElement.scrollTop, 
        scrollblockLeftOffset = -viewportElement.scrollLeft,
        viewportHeight = viewportElement.offsetHeight,
        viewportWidth = viewportElement.offsetWidth,
        viewportTopOffset = -scrollblockTopOffset,
        viewportBottomOffset = -scrollblockTopOffset + viewportHeight

    for (let index of itemlistindexes) {

        const element = itemElementMap.get(index).current
        const inheadlist = headlistindexes.includes(index)
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

        const itemTopOffset = scrollblockTopOffset + cradleTop + top, // offset from top of viewport
            itemBottomOffset = scrollblockTopOffset + cradleTop + bottom, // offset from top of viewport
            itemLeftOffset = scrollblockLeftOffset + cradleLeft + left, 
            itemRightOffset = scrollblockLeftOffset + cradleLeft + right 


        let isVisible = false // default

        let topPortion,
            bottomPortion,
            leftPortion,
            rightPortion

        if ((itemTopOffset < 0) && (itemBottomOffset > 0)) {

            if (orientation == 'vertical') isVisible = true
            bottomPortion = itemBottomOffset
            topPortion = bottomPortion - height

        } else if ((itemTopOffset >= 0) && (itemBottomOffset < viewportHeight)) {

            if (orientation == 'vertical') isVisible = true
            topPortion = height
            bottomPortion = 0

        } else if ((itemTopOffset > 0) && ((itemTopOffset - viewportHeight) < 0)) {

            if (orientation == 'vertical') isVisible = true
            topPortion = viewportHeight - itemTopOffset
            bottomPortion = topPortion - height

        } else {

            if (orientation == 'vertical') continue

        }

        if (itemLeftOffset < 0 && itemRightOffset > 0) {

            if (orientation == 'horizontal') isVisible = true
            rightPortion = itemRightOffset
            leftPortion = rightPortion - width

        } else if (itemLeftOffset >= 0 && itemRightOffset < viewportWidth) {

            if (orientation == 'horizontal') isVisible = true
            leftPortion = width
            rightPortion = 0

        } else if (itemLeftOffset > 0 && (itemLeftOffset - viewportWidth) < 0) {

            if (orientation == 'horizontal') isVisible = true
            leftPortion = viewportWidth - itemLeftOffset
            rightPortion = leftPortion - width

        } else {

            if (orientation == 'horizontal') continue

        }

        const verticalRatio = 
                (topPortion > 0)?
                    topPortion/height:
                    bottomPortion/height,
            horizontalRatio = 
                (leftPortion > 0)?
                    leftPortion/width:
                    rightPortion/height

        const itemData = {

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

