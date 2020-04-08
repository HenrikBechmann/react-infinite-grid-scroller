# react-infinite-grid-scroller
Vertical or horizontal infinite scroll using css grid layout

![version](https://img.shields.io/badge/version-1.0.0--Beta--1-blue) [![licence](https://img.shields.io/badge/licence-MIT-green)](https://github.com/HenrikBechmann/react-infinite-grid-scroller/blob/master/LICENSE.md)

# Features

- rapid infinite scroll, horizontal or vertical
- single or multiple rows or columns
- rapid repositioning in large lists (through scroll thumb or programmatically)
- dynamic pivot (horizontal/vertical back and forth) while maintaining position in list
- automatic reconfiguration with page resize
- nested lists

This utility does not support variable length cells. That wouldn't really make sense for a grid layout.

# Technology

This scroller uses leading edge technologies:
- [css grid layout](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [react hooks](https://reactjs.org/docs/hooks-intro.html)
- [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)

Therefore it is best suited for modern browsers.

# Animated gif

![demo](demo/scroller.gif)

# Usage

```JSX
import Scroller from 'react-infinite-grid-scroller'

// ...

<div style = {containerstyle}>
  <Scroller 
      orientation = { orientation } 
      gap = { gap }
      padding = { padding }
      cellHeight = { cellHeight }
      cellWidth = { cellWidth }
      runway = { runway }
      offset = { offset }
      listsize = { listsize }
      getItem = { getItem }
      placeholder = { placeholder }
      styles = { styles }
      functions = { functions }
  />
</div>
```
The scroller's highest level component, the viewport, is a `div` with `position:absolute`, and `top`, `right`, `bottom`, `left` set to 0 (zero). Therefore the host container should be a block element with `position:absolute` or `position:relative`.

# Options
| property | options | notes |
|---|---|---|
|orientation|string:"vertical" (default) or "horizontal"||
|gap|integer: number of pixels between cells|there is no gap at either end of a row or column; default = 0|
|padding|integer:number of pixels padding the "cradle"|the "cradle" holds the rolling content; default = 0|
|cellHeight|integer: number of pixels for cell height|required. literal for "vertical"; approximate for "horizontal"|
|cellWidth|integer: number of pixels for cell width|required. literal for "horizontal"; approximate for "vertical"|
|runway|integer: number of cells just out of view at head and tail of list|default = 0 (not recommended)|
|offset|integer: starting index when the scroller loads|default = 0|
|listsize|integer: number of items in list|required|
|getItem|host-provided function: parameter = index number (0 based)|must return a component or promise of a component for the calling grid item|
|placeholder|sparse component for the cell to load while waiting for the intended cell component|optional. parameters are index, listsize, error string|
|styles|simple object:collection of styles for scroller components|these should be "passive" styles like backgroundColor|
|functions|simple object: collection of functions for interactions with scroller components|functions for which properties are not included in the object are ignored|

### `styles` details

Create a style object for each of the components you want to modify. Be careful to only include passive styles (like color, backgroundColor) so as not to confuse the scroller. Do not add structural items like borders, padding etc.

~~~javascript
styles = {
  viewport:{}, 
  scrollblock:{}, 
  cradle:{},
  scrolltracker:{}
}
~~~
The scrolltracker is the small rectangular component that appears at the top left of the viewport when the list is being rapidly repositioned. The scrolltracker gives the user the current index and total listsize during the repositioning process.
### `functions` details
Functions provide utility interactions with the scroller (specifically with the `cradle`). The following are available:
~~~javascript
functions: {
    scrollToItem:null, // provided by scroller
    getContentList:null, // provided by scroller
    getVisibleList:null, // provided by scroller
    reload:null, // provided by scroller
    reportReferenceIndex:null // provided by host
}
~~~
To get access to the first four functions, include the property for each in the functions object, set to null. The scroller will instantiate these properties with the appropriate functions on initialization. If the properties are absent the functions are not set.

For reportReferenceIndex, the host must provide the function, like so:
~~~
const reportReferenceIndex = (index,reason) => {

    console.log('reporting reference index', index, reason)

}
~~~
Then assign your function to `functions.reportReferenceIndex`.

The reference index is the calculated item index (0-based) at the top left of the viewport. The reason can be 'scrolling' or 'setCradleContent:\<cradlestate\>', where \<cradlestate\> is the triggered state that causes a reset of the cradle's contents. The triggering state can be 'setup', 'resize', 'pivot', 'reload' or 'reposition'. Note that `reportReferenceIndex` returns a *firehose* of data, particularly with scrolling.

Here are details about the functions:

|function|usage|notes|
|---|---|---|
|scrollToItem|functions.scrollToItem(index)||
|getContentList|functions.getContentList()||
|getVisibleList|functions.getVisibleList()||
|reload|functions.reload()||
|reportReferenceIndex||called by scroller (with `index`, `reason` parameters) whenever the reference item index changes|

### Notes
# Design

# Licence

MIT &copy; 2020 [Henrik Bechmann](https://twitter.com/HenrikBechmann)
