// itemdata.tsx

import React from 'react'

export default class ItemData {

    private globalItemID = 0
    private itemMetadataMap = new Map()

    private partitionData
    private scrollerData

    private linkSupport = ({partitionData, scrollerData}) => {

        this.partitionData = partitionData
        this.scrollerData = scrollerData
                
    }

}