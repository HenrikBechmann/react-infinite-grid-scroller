// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {FC, useState, useEffect, useRef, useCallback} from 'react'

import CacheAPI from './portalcache/cacheAPI'

const PortalCache:FC<any> = ({scrollerSessionIDRef, setListsize, listsizeRef, getCacheAPI, CACHE_PARTITION_SIZE }) => {


    const cacheAPIRef = useRef(null)

    useEffect(() => {

        if (cacheAPIRef.current) return

        const cacheAPI = new CacheAPI(scrollerSessionIDRef.current, listsizeRef, 
            CACHE_PARTITION_SIZE)

        cacheAPIRef.current = cacheAPI

        getCacheAPI(cacheAPI)

    },[])

    const [portalCacheCounter, setPortalCacheCounter] = useState(0)
    const counterRef = useRef(portalCacheCounter)

    const [masterState, setMasterState] = useState('setup')

    const isMountedRef = useRef(true)

    const partitionArrayRef = useRef(null)

    const partitionRepoForceUpdate = useCallback((partitionRenderList:any) => {

        partitionArrayRef.current = partitionRenderList

        isMountedRef.current && setPortalCacheCounter(++counterRef.current) // force render

    },[])

    useEffect(()=>{

        isMountedRef.current = true

        cacheAPIRef.current.cacheProps.partitionRepoForceUpdate = partitionRepoForceUpdate

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
