// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {FC, useState, useEffect, useRef, useCallback} from 'react'

import CacheHandler from './portalcache/cachehandler'

const PortalCache:FC<any> = ({scrollerSessionIDRef, setListsize, listsizeRef, getCacheAPI, CACHE_PARTITION_SIZE }) => {


    const cacheHandlerRef = useRef(null)

    useEffect(() => {

        if (cacheHandlerRef.current) return

        const cacheHandler = new CacheHandler(scrollerSessionIDRef.current, listsizeRef, 
            CACHE_PARTITION_SIZE)

        cacheHandlerRef.current = cacheHandler

        getCacheAPI(cacheHandler)

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

        cacheHandlerRef.current.cacheProps.partitionRepoForceUpdate = partitionRepoForceUpdate

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
