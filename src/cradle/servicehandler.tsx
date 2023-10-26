// servicehandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module fields service requests from the host. There are two forms
    - streaming from the scroller to the host
    - function calls from the user to the scroller

    For the list of data streams, see the constructor.

    The function calls avaiable to the host are:

        scrollToIndex, 
        scrollToPixel,
        scrollByPixel,
        reload, 
        // setListSize,
        setListRange,
        prependIndexCount,
        appendIndexCount,
        clearCache, 

        getCacheIndexMap, 
        getCacheItemMap,
        getCradleIndexMap,
        getPropertiesSnapshot,

        insertIndex,
        removeIndex,
        moveIndex,
    
    The functions listed are defined in this module.

    There are important supporting functions for these in cacheAPI and contentHandler. stateHandler is
    often invoked by service functions to change Cradle state upon servicing requests.
*/

import Snapshots from './servicehandler/servicesnapshots'
import ServiceCache from './servicehandler/servicecache'
import ServiceGeneral from './servicehandler/servicegeneral'

export const isBlank = (value:any) => {
    const testvalue = value ?? ''
    return testvalue === ''
}

export const isNumber = (value:any) => {

    return ( 
        (!isNaN(Number(value))) && 
        (!isNaN(parseInt(value))) 
    )

}

export const isInteger = (value:any) => {

    const test = +value

    return (Number.isInteger(test))

}

export const isValueGreaterThanOrEqualToMinValue = (compareValue:any, minValue:any) => {

    if (!isInteger(compareValue) || !isInteger(minValue)) return false

    const 
        testvalue = +compareValue,
        testMinValue = +minValue

    return testvalue >= testMinValue

}

export const isValueLessThanToOrEqualToMaxValue = (compareValue:any, maxValue:any) => {

    if (!isInteger(compareValue) || !isInteger(maxValue)) return false

    const testvalue = +compareValue
    const testMaxValue = +maxValue

    return testvalue <= testMaxValue

}

export const errorMessages = {
    scrollToIndex:'integer: required, greater than or equal to low index',
    // setListSize:'integer: required, greater than or equal to 0',
    setListRange:'array[lowindex,highindex]: required, both integers, highindex greater than or equal to lowindex',
    insertFrom:'insertFrom - integer: required',
    insertRange:'insertRange - blank, or integer greater than or equal to the "from" index',
    removeFrom:'removeFrom - integer: required, greater than or equal to list lowindex',
    removeRange:'removeRange - blank, or integer greater than or equal to the "from" index; equal to or lower than list highindex',
    moveFrom:'moveFrom - integer: required, greater than or equal to low index',
    moveRange:'moveRange - blank, or integer greater than or equal to the "from" index',
    moveTo:'moveTo - integer: required, greater than or equal to low index',
}

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const 

       {
           referenceIndexCallback, // (index, callback)
           preloadIndexCallback, // (index, context)
           deleteListCallback, // (deleteList, context)
           changeListRangeCallback, // (listrange, context) two part array lowindex, highindex 
           itemExceptionCallback, // (index, context)
           repositioningFlagCallback, // (flag, context) - notification of start (true) or end (false) of rapid repositioning
           repositioningIndexCallback, // (index, context) - current virtual index number during rapid repositioning
           boundaryCallback, // (position, index, context) - position is "SOL" or "EOL", index is the corresponding boundary index
           dragDropTransferCallback, // (sourceScrollerID, sourceIndex, targetScrollerID, targetIndex, context)
           
       } = cradleParameters.externalCallbacksRef.current,

       callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListRangeCallback,
           itemExceptionCallback,
           repositioningFlagCallback,
           repositioningIndexCallback,
           boundaryCallback,
           dragDropTransferCallback,
       }

       this.callbacks = callbacks

       this.snapshots = new Snapshots(cradleParameters)

       this.servicegeneral = new ServiceGeneral(cradleParameters, this.callbacks)

       this.servicecache = new ServiceCache(cradleParameters, this.setListRange)

    }

    private cradleParameters

    // see above for list
    public callbacks

    private snapshots
    private servicecache
    private servicegeneral

    // =======================[ BOUNDARY TRIGGERS ]===================

    // called by Cradle 'triggerboundarynotications' state
    public triggerBoundaryCallbacks = (scrollerID) => {

        const 
            { 

                cradleParameters,
                callbacks

            } = this,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            { layoutHandler, serviceHandler } = cradleParameters.handlersRef.current,
            { virtualListProps } = cradleInternalProperties,
            { getExpansionCount } = cradleInheritedProperties

        if (layoutHandler.boundaryNotificationsRequired()) {

            if (callbacks.boundaryCallback) {

                if (layoutHandler.SOLSignal) {
                    callbacks.boundaryCallback('SOL', virtualListProps.lowindex, {
                        contextType:'boundary',
                        scrollerID,
                    })
                }
                if (layoutHandler.EOLSignal) {
                    callbacks.boundaryCallback('EOL', virtualListProps.highindex, {
                        contextType:'boundary',
                        scrollerID,
                    })
                }

            }

            if (getExpansionCount) {
                if (layoutHandler.SOLSignal) {
                    let prepend = getExpansionCount('SOL', virtualListProps.lowindex)
                    prepend = +prepend
                    if (!isNaN(prepend) 
                        && prepend > 0 
                        && Number.isInteger(prepend)) {
                        serviceHandler.prependIndexCount(prepend)
                    }
                }
                if (layoutHandler.EOLSignal) {
                    let append = getExpansionCount('EOL', virtualListProps.highindex)
                    append = +append
                    if (!isNaN(append) && append > 0 
                        && Number.isInteger(append)) {
                        serviceHandler.appendIndexCount(append)
                    }
                }
            }

            layoutHandler.cancelBoundaryNotifications()

        }

    }

    // ========================[ GENERAL ]============================

    public reload = () => {

        this.servicegeneral.reload()

    }

    public scrollToIndex = (index) => {

        this.servicegeneral.scrollToIndex(index)

    }

    public scrollToPixel = (pixel, behavior = 'smooth') => {

        this.servicegeneral.scrollToPixel(pixel, behavior)

    }

    public scrollByPixel = (pixel, behavior = 'smooth') => {

        this.servicegeneral.scrollByPixel(pixel, behavior)

    }

    // public setListSize = (newlistsize) => {

    //     this.servicegeneral.setListSize(newlistsize)

    // }

    public setListRange = (newlistrange) => {

        this.servicegeneral.setListRange(newlistrange)

    }

    public prependIndexCount = (prependCount) => {

        this.servicegeneral.prependIndexCount(prependCount)

    }

    public appendIndexCount = (appendCount) => {

        this.servicegeneral.appendIndexCount(appendCount)

    }

    // ======================[ GET SNAPSHOTS ]========================

    public getCacheIndexMap = () => {

        return this.snapshots.getCacheIndexMap()

    }

    public getCacheItemMap = () => {

        return this.snapshots.getCacheItemMap()

    }

    public getCradleIndexMap = () => {

        return this.snapshots.getCradleIndexMap()

    }

    public getPropertiesSnapshot = () => {

        return this.snapshots.getPropertiesSnapshot()

    }

    // =================[ CACHE MANAGEMENT REQUESTS ]==================

    public clearCache = () => {

        this.servicecache.clearCache()

    }

    // // move must be entirely within list bounds
    // // returns list of processed indexes
    public moveIndex = (tolowindex, fromlowindex, fromhighindex = null) => {

        return this.servicecache.moveIndex(tolowindex, fromlowindex, fromhighindex)

    }

    public insertIndex = (index, rangehighindex = null) => {

        return this.servicecache.insertIndex(index, rangehighindex)

    }

    public removeIndex = (index, rangehighindex = null) => {

        return this.servicecache.removeIndex(index, rangehighindex)
        
    }

    // public newListSize // accessed by changelistsizeafterinsertremove event from Cradle
    public newListRange

}
