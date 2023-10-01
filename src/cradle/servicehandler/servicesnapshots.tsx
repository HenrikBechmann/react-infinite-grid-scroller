// servicesnapshots.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

export default class Snapshots {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    cradleParameters

    public getCacheIndexMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current
        const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        return [cacheAPI.getCacheIndexMap(),{
            contextType:'cacheIndexMap',
            scrollerID,
        }]

    }

    public getCacheItemMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current
        const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        return [cacheAPI.getCacheItemMap(),{
            contextType:'cacheItemMap',
            scrollerID,
        }]

    }

    public getCradleIndexMap = () => {

        const { cacheAPI, contentHandler } = this.cradleParameters.handlersRef.current
        const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const modelIndexList = contentHandler.getModelIndexList()

        return [cacheAPI.getCradleIndexMap(modelIndexList),{
            contextType:'cradleIndexMap',
            scrollerID,
        }]
    }

    public getPropertiesSnapshot = () => {

        const props = {...this.cradleParameters.scrollerPropertiesRef.current}
        const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current
        
        props.virtualListProps = {...props.virtualListProps}
        props.cradleContentProps = {...props.cradleContentProps}
        props.gapProps = {...props.gapProps}
        props.paddingProps = {...props.paddingProps}

        return [props,{
            contextType:'propertiesSnapshot',
            scrollerID,
        }]

    }


}