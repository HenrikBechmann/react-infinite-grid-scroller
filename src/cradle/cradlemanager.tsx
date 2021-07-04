// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManager {

    constructor({managers,viewportdata,cradleprops}) {

       this._managers = managers
       this._viewportdata = viewportdata
       this._cradleprops = cradleprops

       let {signals, content, cradle, wings, observers, state} = managers

       this._scrollmanager = scroll
       this._signalsmanager = signals
       this._contentmanager = content
       // this._cradlemanager = cradle
       this._wingsmanager = wings
       this._observersmanager = observers
       this._statemanager = state
    }
    
    scrollReferenceIndex
    scrollReferenceSpineOffset
    spineReferenceIndex
    spineReferenceSpineOffset
    nextReferenceIndex
    nextReferenceSpineOffset

    private _managers
    private _viewportdata
    private _cradleprops

    private _scrollmanager
    private _signalsmanager
    private _contentmanager
    // private _cradlemanager
    private _wingsmanager
    private _observersmanager
    private _statemanager

}