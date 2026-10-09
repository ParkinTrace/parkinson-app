import 'package:flutter/material.dart';

/// Motion tokens.
///
/// Motion here is functional: it confirms state, directs attention and
/// expresses hierarchy. It never delays a task. UI feedback stays inside the
/// 90-240ms band; only one-shot reveals and the ambient hero bloom run longer.
///
/// Every consumer is expected to honour reduced-motion via [reduced].
class AppMotion {
  /// Instant feedback: hover, focus, press.
  static const Duration instant = Duration(milliseconds: 90);

  /// Small state changes: badges, chips, toggles.
  static const Duration fast = Duration(milliseconds: 160);

  /// Default: buttons, cards, nav selection.
  static const Duration base = Duration(milliseconds: 240);

  /// Larger surfaces: dialogs, sheets, expanding panels.
  static const Duration slow = Duration(milliseconds: 420);

  /// One-shot content reveal, staggered down a column.
  static const Duration reveal = Duration(milliseconds: 620);

  /// Slow ambient drift for the hero mesh gradient.
  static const Duration ambient = Duration(seconds: 24);

  /// Default easing for entering and moving elements.
  static const Curve standard = Curves.easeOutCubic;

  /// Emphasized easing for larger surfaces; fast out, soft settle.
  static const Curve emphasized = Cubic(0.2, 0.0, 0.0, 1.0);

  /// Easing for elements leaving the screen.
  static const Curve exit = Curves.easeInCubic;

  /// Symmetric easing for looping or ambient motion.
  static const Curve gentle = Curves.easeInOut;

  /// True when the platform asks for reduced motion.
  static bool reduced(BuildContext context) =>
      MediaQuery.maybeOf(context)?.disableAnimations ?? false;

  /// Collapses [duration] to zero under reduced motion.
  static Duration effective(BuildContext context, Duration duration) =>
      reduced(context) ? Duration.zero : duration;
}