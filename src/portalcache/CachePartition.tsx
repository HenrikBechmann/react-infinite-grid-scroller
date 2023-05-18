// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useState, useEffect, useRef, useCallback} from 'react'

const CachePartition = ({ partitionProps, partitionID, callback }) => {

    const [portalListCounter, setPortalListCounter] = useState(0)

    const [partitionState, setPartitionState] = useState('setup')

    const counterRef = useRef(portalListCounter)

    const isMountedRef = useRef(true)

    const portalArrayRef = useRef(null)

    const partitionMetadata = partitionProps.partitionMetadataMap.get(partitionID)

    const forceUpdate = useCallback((portalRenderList) => {

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