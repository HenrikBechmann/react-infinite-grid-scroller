// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleParent from './cradleparent'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollManager extends CradleParent{

    constructor(commonPropsRef) {

        super(commonPropsRef)

    }

    scrollPositions = {current:0,previous:0}

    private _scrolltimerid = null

    onScroll = (e) => {

        // e.preventDefault()
        // e.stopPropagation()

        let signals = this._managersRef.current.signals.signals

        if (signals.pauseScrollingEffects) {

            return

        }

        let viewportData = this._viewportdataRef.current
        let viewportElement = viewportData.elementref.current

        let cradleManager = this._managersRef.current.cradle

        let scrollPositionCurrent = 
            (this._cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // cradleManager.cradleReferenceData.blockScrollPos = scrollPositionCurrent // EXPERIMENTAL!!

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let stateManager = this._managersRef.current.state
        let cradleState = stateManager.cradleStateRef.current

        let contentManager = this._managersRef.current.content
        let serviceManager = this._managersRef.current.service

        if (!viewportData.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    // let itemindex = contentManager.content.tailModel[0]?.props.index 
                    // console.log('itemindex, readyItemIndexReference',itemindex,cradleManager.cradleReferenceData.readyItemIndexReference)

                    let itemindex = cradleManager.cradleReferenceData.readyItemIndexReference
                    let spineVisiblePosOffset
                    let cradleElements = cradleManager.elements

                    if (this._cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this._viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this._viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleManager.cradleReferenceData.scrollItemIndexReference = itemindex
                    cradleManager.cradleReferenceData.scrollSpinePixelOffset = spineVisiblePosOffset

                } else {

                    this._setScrollReferenceIndexData()
                    stateManager.setCradleState('updatereposition')
                }

                // TODO: re-instatiate the following
                serviceManager.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceManager.serviceCalls.referenceIndexCallbackRef.current(cradleManager.cradleReferenceData.scrollItemIndexReference,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private _onAfterScroll = () => {

        let stateManager = this._managersRef.current.state
        let cradleManager = this._managersRef.current.cradle
        let cradleProps = this._cradlePropsRef.current
        let viewportData = this._viewportdataRef.current
        // let cradleMaster = this._managersRef.current.cradleMaster
        let contentManager = this._managersRef.current.content

        if (!stateManager.isMounted.current) return

        let spineVisiblePosOffset
        let cradleElements = cradleManager.elements

        let viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleManager.cradleReferenceData.scrollSpinePixelOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            cradleManager.cradleReferenceData.readyItemIndexReference = cradleManager.cradleReferenceData.scrollItemIndexReference
            cradleManager.cradleReferenceData.readySpinePixelOffset = cradleManager.cradleReferenceData.scrollSpinePixelOffset

            if (cradleProps.orientation == 'vertical') {

                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

            } else {
                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
            }

        }

        let cradleState = stateManager.cradleStateRef.current
        switch (cradleState) {

            case 'repositioning': {

                cradleManager.nextItemIndexReference = cradleManager.readyItemIndexReference
                cradleManager.nextSpinePixelOffset = cradleManager.readySpinePixelOffset

                stateManager.setCradleState('reposition')

                break
            }

            default: {

                contentManager.updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

            }

        }
        
    }

    private _setScrollReferenceIndexData = () => {

        let viewportData = this._viewportdataRef.current
        let cradleProps = this._cradlePropsRef.current
        let cradleConfig = this._cradleConfigRef.current

        let {crosscount} = cradleConfig
        let viewportElement = viewportData.elementref.current
        let {orientation, listsize} = cradleProps
        let scrollPos, cellLength
        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleProps.cellHeight + cradleProps.gap

        } else {

            scrollPos = viewportElement.scrollLeft
            cellLength = cradleProps.cellWidth + cradleProps.gap

        }

        let referencescrolloffset = cellLength - (scrollPos % cellLength)
        if (referencescrolloffset == (cellLength + cradleProps.padding)) {
            referencescrolloffset = 0
        }

        let referencerowindex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
        let spineReferenceIndex = referencerowindex * crosscount
        spineReferenceIndex = Math.min(spineReferenceIndex,listsize - 1)
        let diff = spineReferenceIndex % crosscount
        spineReferenceIndex -= diff

        let referenceIndexData = {
            index:spineReferenceIndex,
            spineVisiblePosOffset:referencescrolloffset
        }

        if (spineReferenceIndex == 0) referencescrolloffset = 0 // defensive

        let cradleManager = this._managersRef.current.cradle
        cradleManager.cradleReferenceData.scrollItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.scrollSpinePixelOffset = referencescrolloffset

    }

}
