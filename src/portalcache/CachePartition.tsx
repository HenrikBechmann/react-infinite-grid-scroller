// CachePartition.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

import React, {useState, useEffect, useRef, useCallback} from 'react'

const CachePartition = ({ partitionProps, partitionID, callback }) => {

    const 
        [portalListCounter, setPortalListCounter] = useState(0),

        [partitionState, setPartitionState] = useState('setup'),

        counterRef = useRef(portalListCounter),

        isMountedRef = useRef(true),

        portalArrayRef = useRef(null),

        partitionMetadata = partitionProps.partitionMetadataMap.get(partitionID),

        forceUpdate = useCallback((portalRenderList) => {

            portalArrayRef.current = portalRenderList

            isMountedRef.current && setPortalListCounter(++counterRef.current) // force render

        },[])

    useEffect(()=>{

        isMountedRef.current = true

        partitionMetadata.forceUpdate = forceUpdate

        callback()

        return () => {

            isMountedRef.current = false

        }

    },[]) 

    useEffect(()=>{

        switch (partitionState) {
            case 'setup': {
                setPartitionState('ready')
                break
            }
        }

    },[partitionState])

    return <div key = {partitionID} data-type = 'cachepartition' data-partitionid = {partitionID}>
        {portalArrayRef.current}
    </div>

}

export default CachePartition