// servicemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'
import { 
    setCradleGridStyles, 
    getUIContentList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    getVisibleItemsList, 
    getContentListRequirements,
    isolateRelevantIntersections,
    allocateContentList,
    deleteAndResetPortals,

} from '../cradlefunctions'

export default class ServiceManager extends CradleManagement{

    constructor(commonPropsRef, serviceCallsRef) {

       super(commonPropsRef)

       this.serviceCalls = serviceCallsRef.current

    }

    serviceCalls

    getVisibleList = () => {

        let contentManager = this._managers.current.content        
        // let cradleElements = cradleElementsRef.current

        let cradleContent = contentManager.content
        let viewportData = this._viewportdata
        let cradleManager = this._managers.current.cradle
        let cradleElements = cradleManager.elements

        return getVisibleItemsList({
            itemElementMap:contentManager.itemElements,
            viewportElement:viewportData.elementref.current,
            cradleElements, 
            // tailElement:cradlePropsRef.current.orientation,
            // spineElement:cradleElements.spine.current,
            cradleProps:this._cradlePropsRef.current,
            // orientation:cradlePropsRef.current.orientation,
            cradleContent,
            // headlist:cradleContent.headView,
        })

    }

    getContentList = () => {
        let contentManager = this._managers.current.content        
        let contentlist = Array.from(contentManager.itemElements)

        contentlist.sort((a,b)=>{
            return (a[0] < b[0])?-1:1
        })

        return contentlist
    }

    reload = () => {

        let cradleManager = this._managers.current.cradle
        let signalsManager = this._managers.current.signals
        let stateManager = this._managers.current.state
        let signals = signalsManager.signals
        // let viewportData = this._viewportdata

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        let spineVisiblePosOffset
        let cradleElements = cradleManager.elements

        cradleManager.cellReferenceData.nextSpineOffset = cradleManager.cellReferenceData.readySpineOffset
        cradleManager.cellReferenceData.nextReferenceIndex = cradleManager.cellReferenceData.readyReferenceIndex        

        stateManager.setCradleState('reload')

    }

    scrollToItem = (index) => {

        let signalsManager = this._managers.current.signals
        let cradleManager = this._managers.current.cradle
        let stateManager = this._managers.current.state

        let signals = signalsManager.signals
        // let cradleManager = cradleManagerRef.current

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        cradleManager.cellReferenceData.nextSpineOffset = 
            cradleManager.cellReferenceData.readySpineOffset
        cradleManager.cellReferenceData.nextReferenceIndex = 
            cradleManager.cellReferenceData.readyReferenceIndex = index

        stateManager.setCradleState('reposition')

    }

}