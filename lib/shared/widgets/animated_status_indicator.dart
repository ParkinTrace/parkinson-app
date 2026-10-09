import 'package:flutter/material.dart';

/// Pulsing status indicator: the icon wrapped in an expanding, fading halo.
///
/// The halo is what makes a live state read as live, without any colour flash
/// or alarm. Reduced-motion renders the plain icon.
class AnimatedStatusIndicator extends StatefulWidget {
  final Color color;
  final IconData icon;

  /// Box footprint of the indicator.
  final double size;
  const AnimatedStatusIndicator({
    super.key,
    required this.color,
    required this.icon,
    this.size = 24,
  });

  @override
  State<AnimatedStatusIndicator> createState() =>
      _AnimatedStatusIndicatorState();
}

class _AnimatedStatusIndicatorState extends State<AnimatedStatusIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1800))
      ..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (reduced) {
      return Icon(widget.icon, color: widget.color, size: widget.size);
    }
    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, child) {
          final t = _c.value;
          final halo = widget.size * (0.5 + t * 0.5);
          return Stack(
            alignment: Alignment.center,
            children: <Widget>[
              Opacity(
                opacity: (1 - t) * 0.4,
                child: Container(
                  width: halo,
                  height: halo,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.color.withValues(alpha: 0.4),
                  ),
                ),
              ),
              Icon(
                widget.icon,
                color: widget.color,
                size: widget.size * 0.62,
              ),
            ],
          );
        },
      ),
    );
  }
}
