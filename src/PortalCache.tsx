// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {FC, useState, useEffect, useRef, useCallback} from 'react'

import CacheAPI from './portalcache/cacheAPI'

const PortalCache:FC<any> = ({CACHE_PARTITION_SIZE, getCacheAPI, getUpdateFunction }) => {

    const cacheAPIRef = useRef(null)

    const partitionArrayRef = useRef(null)

    const partitionRepoForceUpdate = useCallback((partitionRenderList:any) => {

        partitionArrayRef.current = partitionRenderList

        isMountedRef.current && setPortalCacheCounter(++counterRef.current) // force render

    },[])

    useEffect(() => {

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
