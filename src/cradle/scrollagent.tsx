// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollAgent extends CradleManagement{

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

        let cradleAgent = this._managersRef.current.cradle

        let scrollPositionCurrent = 
            (this._cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // cradleAgent.blockScrollPosData.blockScrollPos = scrollPositionCurrent // EXPERIMENTAL!!

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let stateAgent = this._managersRef.current.state
        let cradleState = stateAgent.cradleStateRef.current

        let contentAgent = this._managersRef.current.content
        let serviceAgent = this._managersRef.current.service

        if (!viewportData.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    // let itemindex = contentAgent.content.tailModel[0]?.props.index 
                    // console.log('itemindex, readyReferenceItemIndex',itemindex,cradleAgent.cellReferenceData.readyReferenceItemIndex)

                    let itemindex = cradleAgent.cellReferenceData.readyReferenceItemIndex
                    let spineVisiblePosOffset
                    let cradleElements = cradleAgent.elements

                    if (this._cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this._viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this._viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleAgent.cellReferenceData.scrollReferenceItemIndex = itemindex
                    cradleAgent.cellReferenceData.scrollSpinePixelOffset = spineVisiblePosOffset

                } else {

                    this._setScrollReferenceIndexData()
                    stateAgent.setCradleState('updatereposition')
                }

                // TODO: re-instatiate the following
                serviceAgent.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceAgent.serviceCalls.referenceIndexCallbackRef.current(cradleAgent.cellReferenceData.scrollReferenceItemIndex,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private _onAfterScroll = () => {

        let stateAgent = this._managersRef.current.state
        let cradleAgent = this._managersRef.current.cradle
        let cradleProps = this._cradlePropsRef.current
        let viewportData = this._viewportdataRef.current
        // let cradleMaster = this._managersRef.current.cradleMaster
        let contentAgent = this._managersRef.current.content

        if (!stateAgent.isMounted.current) return

        let spineVisiblePosOffset
        let cradleElements = cradleAgent.elements

        let viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleAgent.cellReferenceData.scrollSpinePixelOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            cradleAgent.cellReferenceData.readyReferenceItemIndex = cradleAgent.cellReferenceData.scrollReferenceItemIndex
            cradleAgent.cellReferenceData.readySpinePixelOffset = cradleAgent.cellReferenceData.scrollSpinePixelOffset

            if (cradleProps.orientation == 'vertical') {

                cradleAgent.blockScrollPosData.blockScrollProperty = 'scrollTop'
                cradleAgent.blockScrollPosData.blockScrollPos = viewportElement.scrollTop

            } else {
                cradleAgent.blockScrollPosData.blockScrollProperty = 'scrollLeft'
                cradleAgent.blockScrollPosData.blockScrollPos = viewportElement.scrollLeft
            }

        }

        let cradleState = stateAgent.cradleStateRef.current
        switch (cradleState) {

            case 'repositioning': {

                cradleAgent.nextReferenceItemIndex = cradleAgent.readyReferenceItemIndex
                cradleAgent.nextSpinePixelOffset = cradleAgent.readySpinePixelOffset

                stateAgent.setCradleState('reposition')

                break
            }

            default: {

                contentAgent.updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

            }

        }
        
    }

    private _setScrollReferenceIndexData = () => {

        let viewportData = this._viewportdataRef.current
        let cradleProps = this._cradlePropsRef.current
        let cradleConfig = this._cradleconfigRef.current

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

        let cradleAgent = this._managersRef.current.cradle
        cradleAgent.cellReferenceData.scrollReferenceItemIndex = spineReferenceIndex
        cradleAgent.cellReferenceData.scrollSpinePixelOffset = referencescrolloffset

    }

}
