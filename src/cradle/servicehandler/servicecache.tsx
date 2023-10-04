// servicecache.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    This module contains clearCache, moveIndex, insertIndex, removeIndex

*/

import {
    isBlank,
    isNumber,
    isInteger,
    isValueGreaterThanOrEqualToMinValue,
    isValueLessThanToOrEqualToMaxValue,
    errorMessages,
} from '../servicehandler'

export default class ServiceCache {

    constructor(cradleParameters, setListRange) {

        this.cradleParameters = cradleParameters
        this.setListRange = setListRange

    }

    cradleParameters
    setListRange
    // serviceHandler

    public clearCache = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        stateHandler.setCradleState('clearcache')

    }

    // move must be entirely within list bounds
    // returns list of processed indexes
    public moveIndex = (tolowindex, fromlowindex, fromhighindex = null) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { scrollerID } = cradleParameters.cradleInheritedPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        if (!size) return

        // ------------ confirm validity of arguments -------------

        const 
            isToindexInvalid = (!isInteger(tolowindex) || !isValueGreaterThanOrEqualToMinValue(tolowindex, listlowindex)),
            isFromindexInvalid = (!isInteger(fromlowindex) || !isValueGreaterThanOrEqualToMinValue(fromlowindex, listlowindex))

        let isHighrangeInvalid = false

        if ((!isFromindexInvalid)) {
            if (!isBlank(fromhighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(fromhighindex, fromlowindex)
            } else {
                fromhighindex = fromlowindex
            }
        }


        tolowindex = +tolowindex
        fromlowindex = +fromlowindex
        fromhighindex = +fromhighindex

        // TODO return error array instead
        if (isToindexInvalid || isFromindexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(toindex, fromindex, fromhighrange)')
            isToindexInvalid && console.log(tolowindex, errorMessages.moveTo)
            isFromindexInvalid && console.log(fromlowindex, errorMessages.moveFrom)
            isHighrangeInvalid && console.log(fromhighindex, errorMessages.moveRange)
            return []
        }

        tolowindex = Math.max(listlowindex,tolowindex)
        fromlowindex = Math.max(listlowindex,fromlowindex)
        fromhighindex = Math.max(listlowindex,fromhighindex)

        const fromspan = fromhighindex - fromlowindex + 1

        let tohighindex = tolowindex + fromspan - 1

        // ------------- coerce parameters to list bounds ---------------

        const listsize = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.size

        // keep within current list size
        const listhighindex = listsize - 1

        if (tohighindex > listhighindex) {

            const diff = tohighindex - listhighindex
            tohighindex = Math.max(listlowindex,tohighindex - diff)
            tolowindex = Math.max(listlowindex,tolowindex - diff)

        }

        if (fromhighindex > listhighindex) {

            const diff = fromhighindex - listhighindex
            fromhighindex = Math.max(listlowindex,fromhighindex - diff)
            fromlowindex = Math.max(listlowindex,fromlowindex - diff)

        }

        // ---------- constrain parameters --------------

        // nothing to do; no displacement
        if (fromlowindex == tolowindex) return [] 

        // ----------- perform cache and cradle operations -----------

        const 
            { cacheAPI, contentHandler, stateHandler } = 
                this.cradleParameters.handlersRef.current,

            [processedIndexList, movedDataList, displacedDataList] = // both displaced and moved indexes
                cacheAPI.moveIndex(tolowindex, fromlowindex, fromhighindex)

        if (processedIndexList.length) {

            contentHandler.synchronizeCradleItemIDsToCache(processedIndexList)

            const { content } = contentHandler

            content.headModelComponents = content.cradleModelComponents.slice(0,content.headModelComponents.length)
            content.tailModelComponents = content.cradleModelComponents.slice(content.headModelComponents.length)

            stateHandler.setCradleState('applymovechanges')
            
        }

        return [ processedIndexList, movedDataList, displacedDataList ,{
            contextType:'moveIndex',
            scrollerID,
        }]

    }

    public insertIndex = (index, rangehighindex = null) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { scrollerID } = cradleParameters.cradleInheritedPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        let isIndexInvalid = !isInteger(index)

        if (!isIndexInvalid) {

            if (size) {
                isIndexInvalid = !isValueGreaterThanOrEqualToMinValue(index, listlowindex)
            } else {
                isIndexInvalid = false
            }

        }

        let isHighrangeInvalid = false

        if ((!isIndexInvalid)) {
            if (!isBlank(rangehighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(rangehighindex, index)
            } else {
                rangehighindex = index
            }
        }

        index = +index

        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR insertIndex(index, rangehighindex)')
            isIndexInvalid && console.log(index, errorMessages.insertFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.insertRange)
            return null
        }

        const changes = this.insertRemoveIndex(index, rangehighindex, +1)

        return [changes, {
            contextType:'insertIndex',
            scrollerID
        }]

    }

    public removeIndex = (index, rangehighindex = null) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { scrollerID } = cradleParameters.cradleInheritedPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        if (!size) return

        const isIndexInvalid = (!isInteger(index) || !isValueGreaterThanOrEqualToMinValue(index, listlowindex))
        let isHighrangeInvalid = false

        if ((!isIndexInvalid)) {
            if (!isBlank(rangehighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(rangehighindex, index)
            } else {
                rangehighindex = index
            }
        }

        index = +index
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(index, rangehighindex)')
            isIndexInvalid && console.log(index, errorMessages.removeFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.removeRange)
            return null
        }

        const changes = this.insertRemoveIndex(index, rangehighindex, -1)

        return [changes, {
            contextType:'removeIndex',
            scrollerID,
        }]

    }

    // public newListSize // accessed by changelistsizeafterinsertremove event from Cradle

    // shared logic for insert and remove. Returns lists of indexes shifted, replaced, and removed
    // this operation changes the listsize
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        const 

            { cradleParameters } = this,

            { 
                
                cacheAPI, 
                contentHandler, 
                stateHandler, 
                serviceHandler,
            
            } = this.cradleParameters.handlersRef.current,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { 
            
                cradleContentProps, 
                virtualListProps,

            } = cradleInternalProperties,

            { 
            
                lowindex:listlowindex, 
                crosscount, 
                size:listsize,

            } = virtualListProps,

            { 
            
                lowindex:lowCradleIndex, 
                highindex:highCradleIndex, 
                size:cradleSize, 
                runwayRowcount:runwaySize,
                viewportRowcount,
            
            } = cradleContentProps

        // basic assertions
        if (listsize) index = Math.max(listlowindex,index)

        // if (!rangehighindex) rangehighindex = index
        // rangehighindex = Math.max(rangehighindex, index)

        // ------------------- process cache ----------------

        if (listsize == 0) {
            
            if (increment > 0) {

                this.setListRange([index,rangehighindex])

                const replaceList = []

                for (let i = index; i<=rangehighindex; i++) {
                    replaceList.push(i)
                }

                return [[],replaceList,[]]

            } else {
    
                return [[],[],[]]
            }
        }

        const [
            startChangeIndex, 
            rangeincrement, 
            shiftedList, 
            removedList, 
            replaceList, 
            portalPartitionItemsForDeleteList,
            cacheIndexesDeletedList,
        ] = cacheAPI.insertRemoveIndex(index, rangehighindex, increment, listsize)

        if (rangeincrement === null) return [[],[],[]] // no action

        // partitionItems to delete with followup state changes - must happen after cradle update
        cacheAPI.portalPartitionItemsForDeleteList = portalPartitionItemsForDeleteList

        const { deleteListCallback } = serviceHandler.callbacks

        deleteListCallback && cacheIndexesDeletedList.length && 
            deleteListCallback(cacheIndexesDeletedList,{
                contextType:'deleteList',
                message:"delete items from cache by index",
                scrollerID:cradleParameters.cradleInheritedPropertiesRef.current.scrollerID,
            })

        // ------------- synchronize cradle to cache changes -------------

        // determine if cradle must be reset or simply adjusted
        const 
            changecount = rangeincrement, // semantics
            newlistsize = serviceHandler.newListSize = listsize + changecount,

            calculatedCradleRowcount = viewportRowcount + (runwaySize * 2),
            calculatedCradleItemcount = calculatedCradleRowcount * crosscount,

            measuredCradleItemCount = (cradleSize == 0)?0:highCradleIndex - lowCradleIndex + 1,

            resetCradle = ((measuredCradleItemCount < calculatedCradleItemcount) || 
                (highCradleIndex >= (newlistsize - 1)))

        if (!resetCradle) { // synchronize cradle contents to changes

            contentHandler.synchronizeCradleItemIDsToCache(shiftedList, increment, startChangeIndex) // non-zero communications isInsertRemove

            const 
                { content } = contentHandler,

                requestedSet = cacheAPI.requestedSet

            const timeout = setInterval(() => { // wait until changed cache entries update the cradle

                if(!requestedSet.size) { // finished collecting new cache entries

                    clearInterval(timeout); 

                    content.headModelComponents = content.cradleModelComponents.slice(0,content.headModelComponents.length)
                    content.tailModelComponents = content.cradleModelComponents.slice(content.headModelComponents.length)

                    stateHandler.setCradleState('applyinsertremovechanges')

                }
            }, 100)

        } else { // cradle to be completely reset if listsize change encroaches on cradle

            stateHandler.setCradleState('channelcradleresetafterinsertremove')

        }

        const replacedList = replaceList // semantics
        const deletedList = cacheIndexesDeletedList

        return [shiftedList, replacedList, removedList, deletedList] // inform caller

    }
}