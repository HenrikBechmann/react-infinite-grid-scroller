// cradlemanagement.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManagement {

    constructor(commonPropsRef) {

       let {managersRef, viewportdata, cradlePropsRef, cradleConfigRef} = commonPropsRef.current

       this._managers = managersRef
       this._viewportdata = viewportdata
       this._cradlePropsRef = cradlePropsRef
       this._cradleconfigRef = cradleConfigRef

    }

    protected _managers
    protected _viewportdata
    protected _cradlePropsRef
    protected _cradleconfigRef

}