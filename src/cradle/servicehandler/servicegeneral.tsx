// servicegeneral.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import {

    isBlank,
    isNumber,
    isInteger,
    isValueGreaterThanOrEqualToMinValue,
    isValueLessThanToOrEqualToMaxValue,
    errorMessages,

} from '../servicehandler'

export default class ServiceGeneral {

    constructor(cradleParameters, callbacks) {

        this.cradleParameters = cradleParameters
        this.callbacks = callbacks
    }

    cradleParameters
    callbacks

    public reload = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        const { interruptHandler } = this.cradleParameters.handlersRef.current

        interruptHandler.pauseInterrupts()

        stateHandler.setCradleState('reload')

    }

    public scrollToIndex = (index) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex, size } = virtualListProps

        if (!size) return

        const isInvalid = (!isInteger(index)) //|| 

        if (!isInvalid) {

            if (!isValueGreaterThanOrEqualToMinValue(index, lowindex)) {
                index = lowindex
            }

        }

        index = +index

        if (isInvalid) {

            console.log('RIGS ERROR scrollToIndex(index)):', index, errorMessages.scrollToIndex)
            return

        }

        const

            handlers = cradleParameters.handlersRef.current,

            {

                interruptHandler,
                layoutHandler,
                stateHandler

            } = handlers,

            { signals } = interruptHandler

        signals.pauseScrollingEffects = true

        layoutHandler.cradlePositionData.targetAxisReferencePosition = index - lowindex

        stateHandler.setCradleState('scrollto')

    }

    public scrollToPixel = (pixel, behavior = 'smooth') => {

        if (!['smooth','instant','auto'].includes(behavior)) {
            behavior = 'smooth'
        }

        if (!(isInteger(pixel) && isValueGreaterThanOrEqualToMinValue(pixel,0))) {

            return

        }

        pixel = +pixel

        const

            { cradleParameters } = this,

            viewportElement = cradleParameters.viewportContextRef.current.elementRef.current,

            scrollblockElement = viewportElement.firstChild,

            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,

            { orientation } = cradleInheritedProperties,

            scrollblockLength = 
                orientation == 'vertical'
                    ?scrollblockElement.offsetHeight
                    :scrollblockElement.offsetWidth,

            viewportLength = 
                orientation == 'vertical'
                    ?viewportElement.offsetHeight
                    :viewportElement.offsetWidth,

            pixeltarget = Math.max(Math.min(pixel, scrollblockLength - viewportLength),0)

        let top, left

        if (orientation == 'vertical') {

            top = pixeltarget
            left = viewportElement.scrollLeft

        } else {

            left = pixeltarget
            top = viewportElement.scrollTop
        }

        const options = {
            top:top,
            left:left,
            behavior:behavior,
        }

        viewportElement.scroll(options)

    }

    public scrollByPixel = (pixel, behavior = 'smooth') => {

        if (!['smooth','instant','auto'].includes(behavior)) {
            behavior = 'smooth'
        }

        if (!isInteger(pixel)) {

            return

        }

        pixel = +pixel

        if (pixel == 0) return // nothing to do

        const

            { cradleParameters } = this,

            viewportElement = cradleParameters.viewportContextRef.current.elementRef.current,

            scrollblockElement = viewportElement.firstChild,

            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,

            { orientation } = cradleInheritedProperties,

            scrollblockLength = 
                orientation == 'vertical'
                    ?scrollblockElement.offsetHeight
                    :scrollblockElement.offsetWidth,

            viewportLength = 
                orientation == 'vertical'
                    ?viewportElement.offsetHeight
                    :viewportElement.offsetWidth,

            scrollOffset = 
                orientation == 'vertical'
                    ?viewportElement.scrollTop
                    :viewportElement.scrollLeft

        let pixelmovement, 
            pixelmax, pixelovershoot, 
            pixelundershoot

        if (pixel > 0) { // scroll down (increase scrollOffset)

            pixelmax = scrollblockLength - viewportLength
            pixelovershoot = Math.max((pixel + scrollOffset) - pixelmax,0)
            pixelmovement = pixel - pixelovershoot

        } else { // scroll up (decrease scrollOffset)

            pixelundershoot = Math.min(pixel + scrollOffset,0)
            pixelmovement = pixel - pixelundershoot

        }

        let top, left

        if (orientation == 'vertical') {

            top = pixelmovement
            left = 0

        } else {

            left = pixelmovement
            top = 0
        }

        const options = {
            top,
            left,
            behavior,
        }

        viewportElement.scrollBy(options)
        
    }

    // TODO delete public setListSize = (newlistsize) => {

    //     newlistsize = +newlistsize

    //     const isInvalid = (!isInteger(newlistsize) || !isValueGreaterThanOrEqualToMinValue(newlistsize, 0))

    //     if (isInvalid) {

    //         console.log('RIGS ERROR setListSize(newlistsize)', newlistsize, errorMessages.setListSize)
    //         return

    //     }

    //     const 
    //         { 

    //             cacheAPI, 
    //             contentHandler, 
    //             stateHandler 

    //         } = this.cradleParameters.handlersRef.current,

    //         { 

    //             deleteListCallback, 

    //         } = this.callbacks,

    //         currentlistsize = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.size,
    //         {scrollerID} = this.cradleParameters.cradleInternalPropertiesRef.current,

    //         { cache } = this.cradleParameters.cradleInheritedPropertiesRef.current

    //     let deleteListCallbackWrapper
    //     if (deleteListCallback) {
    //         deleteListCallbackWrapper = (deleteList) => {

    //             deleteListCallback(deleteList,
    //                 {
    //                     contextType:'deleteList',
    //                     scrollerID,
    //                     message:'change list size intervention',
    //                 }
    //             )

    //         }

    //     }

    //     contentHandler.updateVirtualListSize(newlistsize)
    //     cacheAPI.changeCacheListSize(newlistsize, deleteListCallbackWrapper)

    //     cacheAPI.renderPortalLists()

    //     if ((cache == 'preload') && (newlistsize > currentlistsize)) {

    //         stateHandler.setCradleState('startpreload')

    //     }

    // }

    public setListRange = (newlistrange) => {

        let isInvalid = !Array.isArray(newlistrange)

        if (!isInvalid) {

            isInvalid = !(newlistrange.length == 0 || newlistrange.length == 2)

            if (!isInvalid && (newlistrange.length == 2)) {

                let [lowindex,highindex] = newlistrange

                lowindex = +lowindex
                highindex = +highindex

                isInvalid = ((!isInteger(lowindex)) || (!isInteger(highindex)) || (!isValueGreaterThanOrEqualToMinValue(highindex, lowindex)))

                if (!isInvalid) newlistrange = [lowindex,highindex]

            }

        }

        if (isInvalid) {

            console.log('RIGS ERROR setListRange(newlistrange)', newlistrange, errorMessages.setListRange)
            return

        }

        const 
            { 

                cacheAPI, 
                contentHandler, 
                stateHandler 

            } = this.cradleParameters.handlersRef.current,

            { 

                deleteListCallback, 

            } = this.callbacks,

            currentlistrange = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.range,
            { scrollerID } = this.cradleParameters.cradleInternalPropertiesRef.current,

            { cache } = this.cradleParameters.cradleInheritedPropertiesRef.current

        let deleteListCallbackWrapper
        if (deleteListCallback) {
            deleteListCallbackWrapper = (deleteList) => {

                deleteListCallback(deleteList,
                    {
                        contextType:'deleteList',
                        scrollerID,
                        message:'change list range intervention',
                    }
                )

            }

        }

        contentHandler.updateVirtualListRange(newlistrange)
        cacheAPI.changeCacheListRange(newlistrange, deleteListCallbackWrapper)

        cacheAPI.renderPortalLists()


        if ((cache == 'preload') 
            && (newlistrange.length == 2) 
            && (newlistrange[0] < currentlistrange[0] 
                || newlistrange[1] > currentlistrange[1])) {

            stateHandler.setCradleState('startpreload')

        }

    }

    public prependIndexCount = (prependCount) => {
        prependCount = +prependCount
        const isInvalid = ((!isInteger(prependCount)) || (!isValueGreaterThanOrEqualToMinValue(prependCount, 0)))
        if (isInvalid) {
            console.log('RIGS ERROR, prependIndexCount must be an integer >= 0')
            return
        }
        
        const 
            { virtualListProps } = this.cradleParameters.cradleInternalPropertiesRef.current,
            [lowindex, highindex] = virtualListProps.range,
            { size } = virtualListProps

        let newlistrange
        if (size) {

            newlistrange = [lowindex - prependCount,highindex]

        } else {

            newlistrange = [-prependCount + 1,0]

        }

        this.setListRange(newlistrange)
    }

    public appendIndexCount = (appendCount) => {
        appendCount = +appendCount
        const isInvalid = ((!isInteger(appendCount)) || (!isValueGreaterThanOrEqualToMinValue(appendCount, 0)))
        if (isInvalid) {
            console.log('RIGS ERROR, appendIndexCount must be an integer >= 0')
            return
        }

        const 
            { virtualListProps } = this.cradleParameters.cradleInternalPropertiesRef.current,
            [lowindex, highindex] = virtualListProps.range,
            { size } = virtualListProps

        let newlistrange
        if (size) {

            newlistrange = [lowindex,highindex + appendCount] 

        } else {

            newlistrange = [0,appendCount - 1]

        }

        this.setListRange(newlistrange)

    }

}