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

This utility does not support variable length cells. That wouldn't really make sense for a grid layout. I ***may*** produce an analogous flexbox-based scroller for that one day -- one column, vertical, variable size. Or not.

# Technology

This scroller uses leading edge technologies:
- [css grid layout](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [react hooks](https://reactjs.org/docs/hooks-intro.html)
- [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)

Therefore it is best suited for modern browsers.

# Animated gif

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
      component = { component }
  />
</div>
```
The scroller's highest level component, the viewport, is a `div` with `position:absolute`, and `top`, `right`, `bottom`, `left` set to 0 (zero). Therefore the host container should be a block element with `position:absolute` or `position:relative`.

# Options

# Design

# Licence

MIT &copy; 2020 [Henrik Bechmann](https://twitter.com/HenrikBechmann)
