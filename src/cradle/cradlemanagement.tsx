// cradlemanagement.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManagement {

    constructor(props) {

       let {managersRef,viewportdata,cradleprops} = props.current

       this._managers = managersRef
       this._viewportdata = viewportdata
       this._cradleprops = cradleprops

    }

    protected _managers
    protected _viewportdata
    protected _cradleprops

}