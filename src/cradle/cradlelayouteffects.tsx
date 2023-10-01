// cradlestate.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useLayoutEffect, useContext } from 'react'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

export const useCradleStateLayoutEffects = ({

    cradleState,
    cradleParameters, 
    isCachedRef, 
    wasCachedRef,
    hasBeenRenderedRef,
    scrollerID,

}) => {
    const masterDndContext = useContext(MasterDndContext)
    const scrollerDndContext = useContext(ScrollerDndContext)
    useLayoutEffect(()=>{

        const 
            { 
                cradleInheritedPropertiesRef, 
                handlersRef, 
                cradleInternalPropertiesRef, 
                viewportContextRef 
            } = cradleParameters,

            { 
                stateHandler, 
                contentHandler, 
                serviceHandler, 
                cacheAPI, 
                interruptHandler, 
                scrollHandler, 
                layoutHandler 
            } = handlersRef.current,

            { setCradleState } = stateHandler,
            cradleContent = contentHandler.content

        switch (cradleState) {

            // --------------[ precursors to setCradleContent ]---------------
            // these are all workflow related, but
            // resize could be asynchronous when rotating phone during scroll intertia

            case 'setup': { // cycle to allow for ref assignments

                if (cradleInheritedPropertiesRef.current.cache != 'preload') {
                    if (isCachedRef.current) {
                        setCradleState('cached')
                    } else {
                        setCradleState('firstrender') // load grid
                    }
                }
                break

            }

            case 'viewportresizing': {

                // no-op, wait for resizing to end
                break
            }

            case 'startpreload': {

                const finalCallback = () => {

                    const modelIndexList = contentHandler.getModelIndexList()

                    const { deleteListCallback } = serviceHandler.callbacks

                    let deleteListCallbackWrapper
                    if (deleteListCallback) {
                        deleteListCallbackWrapper = (deleteList) => {

                            deleteListCallback(deleteList,
                                {
                                    contextType:'deleteList',
                                    scrollerID,
                                    message:'pare cache to cacheMax',
                                }
                            )

                        }

                    }

                    const {cacheMax} = cradleInheritedPropertiesRef.current
                    if (cacheAPI.pareCacheToMax(cacheMax, modelIndexList, deleteListCallbackWrapper)) {

                        cacheAPI.renderPortalLists()

                    }

                    if (!isCachedRef.current) {

                        setCradleState('finishpreload')

                    } else {

                        setCradleState('cached')

                    }

                }

                const accept = 
                    masterDndContext.installed?
                        scrollerDndContext.dndOptions.accept:
                        null

                cacheAPI.preload(finalCallback, accept)

                break
            }

            case 'cached': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    if (hasBeenRenderedRef.current) {

                        setCradleState('rerenderfromcache')

                    } else {

                        setCradleState('firstrenderfromcache')

                    }

                } // else wait for reparenting

                break
            }

            case 'startreposition': {

                const { signals } = interruptHandler

                signals.pauseTriggerlinesObserver = true

                // avoid recursive cradle intersection interrupts
                signals.pauseCradleIntersectionObserver = true
                signals.repositioningRequired = false // because now underway

                if (scrollHandler.isScrolling) {

                    const {lowindex, size:listsize } = cradleInternalPropertiesRef.current.virtualListProps

                    viewportContextRef.current.scrollTrackerAPIRef.current.startReposition(
                        layoutHandler.cradlePositionData.targetAxisReferencePosition, 
                        lowindex, listsize
                    )

                    setCradleState('repositioningRender')

                } else {

                    setCradleState('finishreposition')

                }

                break

            }

            // -------------------[ setCradleContent ]------------------

            /*
                the following 12 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'restoreinterrupts', with a detour for variable layout 
                to reconfigure the scrollblock
            */
            case 'firstrender':
            case 'firstrenderfromcache':
            case 'rerenderfromcache':
            case 'scrollto':
            case 'changecaching':
            case 'finishpreload':
            case 'finishreposition':
            case 'finishviewportresize':
            case 'pivot':
            case 'reconfigure':
            case 'reconfigureforlistrange':
            case 'reload': {

                if (!stateHandler.isMountedRef.current) return // possible async latency with nested scrollers

                if (isCachedRef.current) {
                    setCradleState('cached')
                    break
                }

                // const cradleContent = contentHandler.content

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []

                const { layout } = cradleInheritedPropertiesRef.current

                interruptHandler.triggerlinesIntersect.disconnect()
                interruptHandler.cradleIntersect.disconnect()

                if (layout == 'variable') { // restore base config to scrollblock

                    // already done for reposition
                    (cradleState != 'finishreposition') && layoutHandler.restoreBaseScrollblockConfig()

                }

                if (cradleState == 'reload') {
                    cacheAPI.clearCache()
                }

                if (cradleState == 'finishreposition') {

                    viewportContextRef.current.scrollTrackerAPIRef.current.finishReposition()
                    scrollHandler.calcImpliedRepositioningData('finishreposition')
                    
                }

                const listsize = cradleInternalPropertiesRef.current.virtualListProps.size
                // set data
                if (listsize) contentHandler.setCradleContent( cradleState )

                if (cradleState != 'finishpreload') {

                    hasBeenRenderedRef.current = true
                    
                }

                // synchronize cache if necessary
                const { cache } = cradleInheritedPropertiesRef.current
                if (cache == 'cradle') {

                    const modelIndexList = contentHandler.getModelIndexList()

                    const { deleteListCallback } = serviceHandler.callbacks

                    let deleteListCallbackWrapper
                    if (deleteListCallback) {
                        deleteListCallbackWrapper = (deleteList) => {

                            deleteListCallback(deleteList,
                                {
                                    contextType:'deleteList',
                                    scrollerID,
                                    message:'match cache to cradle',
                                }
                            )

                        }

                    }

                    if (cacheAPI.matchCacheToCradle(modelIndexList, deleteListCallbackWrapper)) {
                        
                        cacheAPI.renderPortalLists()

                    }
                }

                // prepare the cycle for preparerender
                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                // update virtual DOM
                if (layout == 'uniform') {

                    setCradleState('preparerender')

                } else {

                    setCradleState('refreshDOMsetforvariability')

                }

                break
            }

            case 'preparerender': { // cycle for DOM update

                // triggerlines will have been assigned to a new triggerCell by now.
                // connectElements was delayed for a cycle to render triggercell triggerlines
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.cradleIntersect.connectElements()

                setCradleState('restoreinterrupts')

                break
            }

            case 'restoreinterrupts': { // normalize

                interruptHandler.restoreInterrupts()

                setCradleState('ready')

                break 

            }

            case 'triggerboundarynotications': {

                serviceHandler.triggerBoundaryCallbacks(scrollerID)

                setCradleState('ready')

                break

            }

            // ----------------------[ followup from axisTriggerlinesObserverCallback ]------------
            // scroll effects

            // renderupdatedcontent is called from interruptHandler.axisTriggerlinesObserverCallback. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': { // cycle for DOM update

                // if (isCachedRef.current) return // DEBUG!!

                contentHandler.updateCradleContent()

                setCradleState('finishupdatedcontent')

                break

            }

            case 'finishupdatedcontent': { // cycle for DOM update

                // synchronize cache
                const { cache } = cradleInternalPropertiesRef.current
                if (cache == 'keepload') {

                    contentHandler.guardAgainstRunawayCaching()

                }

                // cacheAPI.measureMemory('finish update')

                const { layout } = cradleInheritedPropertiesRef.current
                if (layout == 'uniform') {

                    interruptHandler.triggerlinesIntersect.connectElements()

                    setCradleState('ready')

                } else { // 'variable' content requiring reconfiguration

                    setCradleState('refreshDOMupdateforvariability')

                }

                break
            }

            // ---------------------[ adjust scrollblock for set variable content ]--------------

            case 'refreshDOMsetforvariability': {

                setCradleState('preparesetforvariability')

                break

            }

            case 'preparesetforvariability': {

                if (stateHandler.isMountedRef.current) {

                    contentHandler.adjustScrollblockForVariability('setcradle')

                    setCradleState('finishsetforvariability')
                    
                }
                
                break

            }

            case 'finishsetforvariability': {

                setCradleState('preparerender')
                
                break
            }

            // ------------------------[ adjust scrollblock for update variable content ]--------------

            case 'refreshDOMupdateforvariability': {

                // extra cycle to allow for DOM synchronizion with grid changes

                setCradleState('adjustupdateforvariability')

                break

            }

            case 'adjustupdateforvariability': {

                setTimeout(()=> { // allow more DOM update

                    contentHandler.adjustScrollblockForVariability('updatecradle')

                    setCradleState('finishupdateforvariability')

                },0)

                break

            }

            case 'finishupdateforvariability': {

                // re-activate triggers; triggerlines will have been assigned to a new triggerCell by now.
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.signals.pauseCradleIntersectionObserver = false

                setCradleState('ready')

                break

            }

            // ----------------[ user requests ]-------------

            case 'channelcradleresetafterinsertremove': {

                cacheAPI.applyPortalPartitionItemsForDeleteList()

                setCradleState('changelistsizeafterinsertremove')

                break
            }

            // support for various host service requests; syncs cradle content with cache changes
            case 'applyinsertremovechanges':
            // case 'applyremapchanges':
            case 'applymovechanges': {

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                cacheAPI.applyPortalPartitionItemsForDeleteList()

                if (cradleState == 'applyinsertremovechanges') {

                    setCradleState('changelistsizeafterinsertremove')

                } else {

                    setCradleState('ready')

                }

                break
            }

            case 'changelistsizeafterinsertremove': {

                const newlistsize = serviceHandler.newListSize
                serviceHandler.newListSize = null

                // console.log('changelistsizeafterinsertremove:newlistsize',newlistsize)

                setCradleState('ready') // TODO: why befiore setlistsize?

                // service handler called because this is a followon of a user intervention
                serviceHandler.setListSize(newlistsize)

                break
            }

            case 'clearcache': {

                contentHandler.clearCradle()
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []
                cacheAPI.clearCache()
                setCradleState('ready')

                break
            }

        }
    },[cradleState])
}
