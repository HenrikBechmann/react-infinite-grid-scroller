// servicesnapshots.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

export default class Snapshots {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    cradleParameters

    public getCacheIndexMap = () => {

        const 
            { cacheAPI } = this.cradleParameters.handlersRef.current,
            { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        return [cacheAPI.getCacheIndexMap(),{
            contextType:'cacheIndexMap',
            scrollerID,
        }]

    }

    public getCacheItemMap = () => {

        const 
            { cacheAPI } = this.cradleParameters.handlersRef.current,
            { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        return [cacheAPI.getCacheItemMap(),{
            contextType:'cacheItemMap',
            scrollerID,
        }]

    }

    public getCradleIndexMap = () => {

        const 
            { cacheAPI, contentHandler } = this.cradleParameters.handlersRef.current,
            { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current,

            modelIndexList = contentHandler.getModelIndexList()

        return [cacheAPI.getCradleIndexMap(modelIndexList),{
            contextType:'cradleIndexMap',
            scrollerID,
        }]
    }

    public getPropertiesSnapshot = () => {

        const 
            snapshot = {...this.cradleParameters.scrollerPropertiesRef.current},
            { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current
        
        snapshot.virtualListProps = {...snapshot.virtualListProps}
        snapshot.cradleContentProps = {...snapshot.cradleContentProps}
        snapshot.gapProps = {...snapshot.gapProps}
        snapshot.paddingProps = {...snapshot.paddingProps}

        return  [snapshot,{
            contextType:'propertiesSnapshot',
            scrollerID,
        }]

    }

}