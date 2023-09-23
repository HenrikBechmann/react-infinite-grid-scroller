// servicesnapshots.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

export default class Snapshots {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    cradleParameters

    public getCacheIndexMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        return cacheAPI.getCacheIndexMap()

    }

    public getCacheItemMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        return cacheAPI.getCacheItemMap()

    }

    public getCradleIndexMap = () => {

        const { cacheAPI, contentHandler } = this.cradleParameters.handlersRef.current

        const modelIndexList = contentHandler.getModelIndexList()
        return cacheAPI.getCradleIndexMap(modelIndexList)
    }

    public getPropertiesSnapshot = () => {

        const props = {...this.cradleParameters.scrollerPropertiesRef.current}
        
        props.virtualListProps = {...props.virtualListProps}
        props.cradleContentProps = {...props.cradleContentProps}

        return props

    }


}