// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollManager extends CradleManagement{

    constructor(commonPropsRef) {

        super(commonPropsRef)

    }

    scrollPositions = {current:0,previous:0}

    private _scrolltimerid = null

    onScroll = () => {

        let signals = this._managers.current.signals.signals

        if (signals.pauseScrollingEffects) {

            return

        }

        let viewportData = this._viewportdataRef.current
        let viewportElement = viewportData.elementref.current

        let scrollPositionCurrent = 
            (this._cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let stateManager = this._managers.current.state
        let cradleState = stateManager.cradleStateRef.current

        let contentManager = this._managers.current.content
        let cradleManager = this._managers.current.cradle
        let serviceManager = this._managers.current.service

        if (!viewportData.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    // let itemindex = contentManager.content.tailModel[0]?.props.index 
                    // console.log('itemindex, readyReferenceIndex',itemindex,cradleManager.cellReferenceData.readyReferenceIndex)

                    let itemindex = cradleManager.cellReferenceData.readyReferenceIndex
                    let spineVisiblePosOffset
                    let cradleElements = cradleManager.elements

                    if (this._cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this._viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this._viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleManager.cellReferenceData.scrollReferenceIndex = itemindex
                    cradleManager.cellReferenceData.scrollSpineOffset = spineVisiblePosOffset

                } else {

                    this._setScrollReferenceIndexData()
                    stateManager.setCradleState('updatereposition')
                }

                // TODO: re-instatiate the following
                serviceManager.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceManager.serviceCalls.referenceIndexCallbackRef.current(cradleManager.cellReferenceData.scrollReferenceIndex,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    }


    private _onAfterScroll = () => {

        let stateManager = this._managers.current.state
        let cradleManager = this._managers.current.cradle
        let cradleProps = this._cradlePropsRef.current
        let viewportData = this._viewportdataRef.current
        // let cradleMaster = this._managers.current.cradleMaster
        let contentManager = this._managers.current.content

        if (!stateManager.isMounted()) return

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

        cradleManager.cellReferenceData.scrollSpineOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            cradleManager.cellReferenceData.readyReferenceIndex = cradleManager.cellReferenceData.scrollReferenceIndex
            cradleManager.cellReferenceData.readySpineOffset = cradleManager.cellReferenceData.scrollSpineOffset

            if (cradleProps.orientation == 'vertical') {

                cradleManager.blockScrollProperty = 'scrollTop'
                cradleManager.blockScrollPos = viewportElement.scrollTop

            } else {
                cradleManager.blockScrollProperty = 'scrollLeft'
                cradleManager.blockScrollPos = viewportElement.scrollLeft
            }

        }

        let cradleState = stateManager.cradleStateRef.current
        switch (cradleState) {

            case 'repositioning': {

                cradleManager.nextReferenceIndex = cradleManager.readyReferenceIndex
                cradleManager.nextSpineOffset = cradleManager.readySpineOffset

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

        let cradleManager = this._managers.current.cradle
        cradleManager.cellReferenceData.scrollReferenceIndex = spineReferenceIndex
        cradleManager.cellReferenceData.scrollSpineOffset = referencescrolloffset

    }

}
