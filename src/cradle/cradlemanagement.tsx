// cradlemanagement.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManagement {

    constructor(commonPropsRef) {

       let {managersRef, viewportdata, cradleprops, cradleConfigRef} = commonPropsRef.current

       this._managers = managersRef
       this._viewportdata = viewportdata
       this._cradleprops = cradleprops
       this._cradleconfigRef = cradleConfigRef

    }

    protected _managers
    protected _viewportdata
    protected _cradleprops
    protected _cradleconfigRef

}