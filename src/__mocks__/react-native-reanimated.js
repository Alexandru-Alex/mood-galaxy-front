'use strict';

const React = require('react');
const { View, Text, Image, ScrollView } = require('react-native');

const NOOP = () => {};
const ID = (x) => x;

function useSharedValue(init) {
  const ref = { value: init };
  return ref;
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
  return animations[animations.length - 1];
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
};

const AnimatedText = React.forwardRef((props, ref) =>
  React.createElement(Text, { ...props, ref })
);
AnimatedText.displayName = 'Animated.Text';

const AnimatedView = React.forwardRef((props, ref) =>
  React.createElement(View, { ...props, ref })
);
AnimatedView.displayName = 'Animated.View';

const AnimatedImage = React.forwardRef((props, ref) =>
  React.createElement(Image, { ...props, ref })
);
AnimatedImage.displayName = 'Animated.Image';

const AnimatedScrollView = React.forwardRef((props, ref) =>
  React.createElement(ScrollView, { ...props, ref })
);
AnimatedScrollView.displayName = 'Animated.ScrollView';

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
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  useAnimatedScrollHandler: () => NOOP,
  useAnimatedRef: () => ({ current: null }),
  useAnimatedGestureHandler: () => NOOP,
  useDerivedValue: (fn) => ({ value: fn() }),
  useAnimatedReaction: NOOP,
  makeMutable: ID,
  ...Animated,
};
