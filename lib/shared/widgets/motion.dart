import 'package:flutter/material.dart';

import '../../core/theme/app_motion.dart';

/// Fades and lifts its child into place once, on first build.
///
/// Intended for hero copy, section bands and staggered card grids: it gives the
/// page a sense of being laid down rather than snapped in. Honours reduced
/// motion by rendering the child immediately and statically.
class FadeSlideIn extends StatefulWidget {
  const FadeSlideIn({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.duration = AppMotion.reveal,
    this.offset = 12,
    this.axis = Axis.vertical,
  });

  final Widget child;

  /// Stagger offset; keep steps between 40ms and 80ms.
  final Duration delay;
  final Duration duration;

  /// Travel distance in logical pixels.
  final double offset;
  final Axis axis;

  @override
  State<FadeSlideIn> createState() => _FadeSlideInState();
}

class _FadeSlideInState extends State<FadeSlideIn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final CurvedAnimation _curved;

  @override
  void initState() {
    super.initState();

    // The stagger delay is folded into the controller's own timeline via
    // Interval rather than held outside it as a wall-clock Future.delayed.
    //
    // Waiting on a real timer only works in a continuously-repainting app. When
    // the animation is driven in a single large frame - tests, screenshots, a
    // cold start that is frame-budget limited - the timer fires during that
    // frame and forward() only begins from zero, so the child is left at
    // opacity 0 forever. That is exactly how this rendered a blank hero.
    // Interval makes one pump(delay + duration) land the child fully in place.
    _controller = AnimationController(
      vsync: this,
      duration: widget.delay + widget.duration,
    );

    final int total = _controller.duration!.inMicroseconds;
    final double begin = total == 0 ? 0 : widget.delay.inMicroseconds / total;
    _curved = CurvedAnimation(
      parent: _controller,
      curve: Interval(begin, 1, curve: AppMotion.emphasized),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (AppMotion.reduced(context)) {
      _controller.value = 1;
      return;
    }
    if (_controller.status == AnimationStatus.dismissed) {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _curved.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curved,
      child: widget.child,
      builder: (context, child) {
        final t = _curved.value;
        final remaining = (1 - t) * widget.offset;
        return Opacity(
          opacity: t.clamp(0, 1),
          child: Transform.translate(
            offset: Offset(
              widget.axis == Axis.horizontal ? remaining : 0,
              widget.axis == Axis.vertical ? remaining : 0,
            ),
            child: child,
          ),
        );
      },
    );
  }
}

/// Reveals [children] top-to-bottom, [step] apart.
class StaggeredReveal extends StatelessWidget {
  const StaggeredReveal({
    super.key,
    required this.children,
    this.step = const Duration(milliseconds: 60),
    this.offset = 12,
  });

  final List<Widget> children;
  final Duration step;
  final double offset;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (var i = 0; i < children.length; i++)
          FadeSlideIn(delay: step * i, offset: offset, child: children[i]),
      ],
    );
  }
}

/// Lifts its child slightly while the pointer hovers it.
///
/// Only meaningful on pointer devices; on touch the child simply never enters
/// the hover state, so this is safe everywhere. No-op under reduced motion.
class HoverLift extends StatefulWidget {
  const HoverLift({super.key, required this.child, this.translate = 2});

  final Widget child;

  /// Upward travel in logical pixels.
  final double translate;

  @override
  State<HoverLift> createState() => _HoverLiftState();
}

class _HoverLiftState extends State<HoverLift> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    if (AppMotion.reduced(context)) return widget.child;
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: AppMotion.fast,
        curve: AppMotion.standard,
        transform: Matrix4.translationValues(
          0,
          _hovered ? -widget.translate : 0,
          0,
        ),
        child: widget.child,
      ),
    );
  }
}

/// Scales its child down slightly while pressed.
///
/// Uses [Listener] rather than a gesture detector so it never competes for the
/// gesture arena - the wrapped button still receives the tap.
class PressableScale extends StatefulWidget {
  const PressableScale({super.key, required this.child, this.scale = 0.98});

  final Widget child;
  final double scale;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    if (AppMotion.reduced(context)) return widget.child;
    return Listener(
      onPointerDown: (_) => setState(() => _down = true),
      onPointerUp: (_) => setState(() => _down = false),
      onPointerCancel: (_) => setState(() => _down = false),
      child: AnimatedScale(
        scale: _down ? widget.scale : 1,
        duration: AppMotion.fast,
        curve: AppMotion.standard,
        child: widget.child,
      ),
    );
  }
}
