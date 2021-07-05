// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollManager extends CradleManagement{

    constructor(commonPropsRef) {

        super(commonPropsRef)

    }

    blockScrollPos:number

    blockScrollProperty:string

    private _scrollpositions = {current:0,previous:0}

    private _scrolltimerid = null

    onScroll = () => {

        let signals = this._managers.signalsRef.current.signals
        if (signals.pauseScrollingEffects) {

            return

        }

        let viewportElement = this._viewportdata.current.elementref.current
        // let scrollPositions = scrollPositionsRef.current

        let scrollPositionCurrent = 
            (this._cradleprops.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        this._scrollpositions.previous = this._scrollpositions.current
        this._scrollpositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let stateManager = this._managers.current.stateRef.current
        let cradleState = stateManager.cradleStateRef.current

        let contentManager = this._managers.current.contentRef.current
        let cradleManager = this._managers.current.cradleRef.current


        if (!this._viewportdata.current.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
        //             let itemindex = cradleContent.tailModel[0]?.props.index 
                    let itemindex = cradleManager.readyReferenceIndex
                    let spineVisiblePosOffset
                    let cradleElements = cradleManager.elements

                    if (this._cradleprops.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
                            this._viewportdata.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
                            this._viewportdata.elementref.current.scrollLeft

                    }
                    cradleManager.scrollReferenceIndex = itemindex
                    cradleManager.scrollSpineOffset = spineVisiblePosOffset

                } else {

                    this.setScrollReferenceIndexData()
                    stateManager.setCradleState('updatereposition')
                }

        //         referenceIndexCallbackRef.current && 
        //             referenceIndexCallbackRef.current(scrollReferenceDataRef.current.index,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this.doEndOfScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    }


    doEndOfScroll = () => {

        let stateManager = this._managers.current.stateRef.current
        let cradleManager = this._managers.current.cradleRef.current
        let cradleProps = this._cradleprops
        let viewportData = this._viewportdata

        if (!stateManager.isMounted()) return

        let spineVisiblePosOffset
        let cradleElements = cradleManager.elements

        let viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
                viewportElement.scrollLeft

        }
                    // cradleManager.scrollReferenceIndex = itemindex
        cradleManager.scrollSpineOffset = spineVisiblePosOffset

        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
                viewportElement.scrollTop
                    
        } else {

            spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleManager.scrollSpineOffset = spineVisiblePosOffset

        let cradleState = stateManager.cradleStateRef.current
        if (!viewportData.isResizing) {

        //         let localrefdata = {...scrollReferenceDataRef.current}

        //         cradleReferenceDataRef.current = localrefdata

            if (cradleProps.orientation == 'vertical') {

                this.blockScrollProperty = 'scrollTop'
                this.blockScrollPos = viewportElement.scrollTop

            } else {
                this.blockScrollProperty = 'scrollLeft'
                this.blockScrollPos = viewportElement.scrollLeft
            }

        }
        switch (cradleState) {

            case 'repositioning': {

        //             nextReferenceDataRef.current = {...cradleReferenceDataRef.current}

                stateManager.setCradleState('reposition')

                break
            }

            default: {

        //             updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

            }

        }
        
    }

    setScrollReferenceIndexData = () => {

        let viewportData = this._viewportdata
        let cradleProps = this._cradleprops
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

        let cradleManager = this._managers.current.cradleRef.current
        cradleManager.scrollReferenceIndex = spineReferenceIndex
        cradleManager.scrollSpineOffset = referencescrolloffset

    }

}
