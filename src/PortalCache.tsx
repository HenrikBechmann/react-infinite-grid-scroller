// PortalCache.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of PortalCache is to hold the React portals in a cache.
    The portals are actually held in an extendible series of CachePartition components, as controlled by cacheAPI.
    Portals only exist in the React virtual DOM.
    The cache can be shared among InfiniteGridScroller components.
*/

import React, {FC, useState, useEffect, useRef, useCallback} from 'react'

import CacheAPI from './portalcache/cacheAPI'

const PortalCache:FC<any> = ({CACHE_PARTITION_SIZE, getCacheAPI, getUpdateFunction }) => {

    // console.log('running PortalCache')

    const cacheAPIRef = useRef(null)

    const partitionArrayRef = useRef(null)

    const partitionRepoForceUpdate = useCallback((partitionRenderList:any) => {

        partitionArrayRef.current = partitionRenderList

        isMountedRef.current && setPortalCacheCounter(++counterRef.current) // force render

    },[])

    useEffect(() => {

        // console.log('PortalCache running useEffect for cacheAPI')

        if (cacheAPIRef.current) return

        const cacheAPI = new CacheAPI(CACHE_PARTITION_SIZE)

        cacheAPIRef.current = cacheAPI

        getCacheAPI(cacheAPI)
        getUpdateFunction(partitionRepoForceUpdate)

    },[])

    const [portalCacheCounter, setPortalCacheCounter] = useState(0)
    const counterRef = useRef(portalCacheCounter)

    const [masterState, setMasterState] = useState('setup')

    const isMountedRef = useRef(true)

    useEffect(()=>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }

    },[]) 

    useEffect(()=>{

        switch (masterState) {
            case 'setup': {
                setMasterState('ready')
            }
        }

    },[masterState])

    return <div data-type = 'portal-master'>{partitionArrayRef.current}</div>

}

export default PortalCache
