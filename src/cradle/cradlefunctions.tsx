// cradlefunctions.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

// support code; process handlers
import ScrollHandler from './scrollhandler'
import StateHandler from './statehandler'
import ContentHandler from './contenthandler'
import LayoutHandler from './layouthandler'
import InterruptHandler from './interrupthandler'
import ServiceHandler from './servicehandler'
import StylesHandler from './styleshandler'

export const restoreScrollPos = ({layoutHandler, viewportElement}) => {

    const 
        { cradlePositionData } = layoutHandler,
        trackingBlockScrollPos = cradlePositionData.trackingBlockScrollPos,
        trackingXBlockScrollPos = cradlePositionData.trackingXBlockScrollPos

    if (trackingBlockScrollPos !== null) {

        let scrollOptions
        if (cradlePositionData.blockScrollProperty == 'scrollTop') {
            scrollOptions = {
                top:trackingBlockScrollPos,
                left:trackingXBlockScrollPos,
                behavior:'instant',
            }
        } else {
            scrollOptions = {
                left:trackingBlockScrollPos,
                top:trackingXBlockScrollPos,
                behavior:'instant',
            }            
        }

        viewportElement.scroll(scrollOptions)

    }

}

export const getCradleHandlers = (cradleParameters) => {

    const 
        createHandler = handler => new handler(cradleParameters),

        { cacheAPI } = cradleParameters.cradleInheritedPropertiesRef.current

    cacheAPI.cradleParameters = cradleParameters

    return {

        cacheAPI,
        interruptHandler:createHandler(InterruptHandler),
        scrollHandler:createHandler(ScrollHandler),
        stateHandler:createHandler(StateHandler),
        contentHandler:createHandler(ContentHandler),
        layoutHandler:createHandler(LayoutHandler),
        serviceHandler:createHandler(ServiceHandler),
        stylesHandler:createHandler(StylesHandler),

    }

}

export const getViewportDimensions = ({viewportElement}) => {
    return {
        width:viewportElement.offsetWidth,
        height:viewportElement.offsetHeight
    }
}

