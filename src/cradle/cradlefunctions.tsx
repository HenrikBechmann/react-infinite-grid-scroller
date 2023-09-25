// cradlefunctions.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

export const restoreScrollPos = (layoutHandler, viewportContext) => {

    const 
        { cradlePositionData } = layoutHandler,
        trackingBlockScrollPos = cradlePositionData.trackingBlockScrollPos,
        trackingXBlockScrollPos = cradlePositionData.trackingXBlockScrollPos

    if (trackingBlockScrollPos !== null) {

        const viewportElement = viewportContext.current.elementRef.current

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
