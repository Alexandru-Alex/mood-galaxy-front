'use strict';

const React = require('react');
const { View, Text, Image, ScrollView } = require('react-native');

const NOOP = () => {};
const ID = (x) => x;

function useSharedValue(init) {
  return { value: init };
}

function useAnimatedStyle(fn) {
  return fn();
}

function withTiming(toValue) {
  return toValue;
}

function withDelay(_delay, animation) {
  return animation;
}

function withSpring(toValue) {
  return toValue;
}

function withRepeat(animation) {
  return animation;
}

function withSequence(...animations) {
  return animations[animations.length - 1] ?? 0;
}

const Easing = {
  out: () => NOOP,
  in: () => NOOP,
  inOut: () => NOOP,
  quad: NOOP,
  back: () => NOOP,
  bounce: NOOP,
  ease: NOOP,
  linear: NOOP,
  bezier: () => NOOP,
  circle: NOOP,
  cubic: NOOP,
  elastic: () => NOOP,
  exp: NOOP,
  poly: () => NOOP,
  sin: NOOP,
  step0: NOOP,
  step1: NOOP,
};

const AnimatedView = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref })
);
const AnimatedText = React.forwardRef((props, ref) =>
  React.createElement(Text, { ...props, ref })
);
const AnimatedImage = React.forwardRef((props, ref) =>
  React.createElement(Image, { ...props, ref })
);
const AnimatedScrollView = React.forwardRef((props, ref) =>
  React.createElement(ScrollView, { ...props, ref })
);

const Animated = {
  Text: AnimatedText,
  View: AnimatedView,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView,
  createAnimatedComponent: (Component) => Component,
  call: NOOP,
};

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps: useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS: ID,
  runOnUI: (fn) => fn,
  cancelAnimation: NOOP,
  interpolate: (val) => val,
  Extrapolation: { CLAMP: 'clamp' },
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedReaction: NOOP,
  makeMutable: ID,
  ...Animated,
};
