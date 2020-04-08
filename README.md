# react-infinite-grid-scroller
Vertical or horizontal infinite scroll using css grid layout

![version](https://img.shields.io/badge/version-1.0.0--Beta--1-blue) [![licence](https://img.shields.io/badge/licence-MIT-green)](https://github.com/HenrikBechmann/react-infinite-grid-scroller/blob/master/LICENSE.md)

# Features

- Rapid scroll, horizontal or vertical
- single or multiple rows or columns
- rapid repositioning in large lists (through scroll thumb or programmatically)
- dynamic pivot (horizontal/vertical back and forth) while maintaining position in list
- automatic reconfiguration with page resize

This utility does not support variable length cells. That wouldn't really make sense for a grid layout. I ***may*** produce a flexbox-based scroller for that -- one column, vertical, variable size. Or not.

# Technology

This scroller uses leading edge technologies:
- [css grid layout](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [react hooks](https://reactjs.org/docs/hooks-intro.html)
- [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)

Therefore it is best suited for modern browsers.

# Animated gif

# Usage

# Options