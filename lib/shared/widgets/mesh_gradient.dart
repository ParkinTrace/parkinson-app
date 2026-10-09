import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_motion.dart';

/// The hero mesh gradient: the system's single decorative flourish.
///
/// A soft multi-stop bloom of cyan, blue, violet, magenta, amber and the brand
/// teal, drifting slowly against the canvas. Painted as blurred radial shaders
/// so the stops melt together instead of banding, then feathered into the page
/// with a vertical fade so the bloom stays a hero-band flourish.
///
/// Light mode tints the near-white canvas (src-over); dark mode glows
/// additively on black. Reduced-motion freezes the drift but keeps the bloom.
/// Paints the mesh into the bounds it is given, plus a slow ambient drift.
///
/// Give it a bounded height: pass [height] directly, or place it in a
/// Positioned/Expanded parent and leave [height] null.
class MeshGradient extends StatefulWidget {
  const MeshGradient({
    super.key,
    this.intensity = 1,
    this.height,
  });

  /// 0 = no bloom, 1 = full strength.
  final double intensity;

  /// Explicit height, or null to fill the parent's bounded height.
  final double? height;

  @override
  State<MeshGradient> createState() => _MeshGradientState();
}

class _MeshGradientState extends State<MeshGradient>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: AppMotion.ambient,
      value: 0.3,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (AppMotion.reduced(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: IgnorePointer(
        child: RepaintBoundary(
          child: CustomPaint(
            painter: MeshGradientPainter(
              progress: _controller,
              isDark: isDark,
              intensity: widget.intensity,
            ),
          ),
        ),
      ),
    );
  }
}

/// One mesh stop: fractional home position, radius, and drift phase.
class _Blob {
  const _Blob(this.color, this.x, this.y, this.radius, this.phase);

  final Color color;
  final double x;
  final double y;

  /// Radius as a fraction of the shortest side.
  final double radius;

  /// 0-1 offset into the drift orbit.
  final double phase;
}

const List<_Blob> _blobs = <_Blob>[
  _Blob(AppColors.cyan, 0.20, 0.16, 0.48, 0.00),
  _Blob(AppColors.gradientDevelopStart, 0.40, 0.04, 0.42, 0.14),
  _Blob(AppColors.violet, 0.62, 0.12, 0.44, 0.28),
  _Blob(AppColors.magenta, 0.84, 0.22, 0.46, 0.42),
  _Blob(AppColors.gradientShipEnd, 0.62, 0.34, 0.40, 0.58),
  _Blob(AppColors.brand, 0.24, 0.30, 0.40, 0.74),
];

/// Paints the mesh. Exposed so it can be unit-tested directly.
class MeshGradientPainter extends CustomPainter {
  MeshGradientPainter({
    required this.progress,
    required this.isDark,
    required this.intensity,
  }) : super(repaint: progress);

  final Animation<double> progress;
  final bool isDark;
  final double intensity;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty || intensity <= 0) return;
    final t = progress.value * 2 * math.pi;
    final canvasColor = isDark ? AppColors.backgroundDark : AppColors.canvas;
    // Deliberately low. The spec allows exactly one flourish and defines the
    // system by restraint; at 0.34 the bloom read as page-wide pastel
    // wallpaper and competed with the form instead of sitting behind it.
    final peak = (isDark ? 0.22 : 0.20) * intensity;

    for (final blob in _blobs) {
      final drift = Offset(
        math.cos(t + blob.phase * 2 * math.pi) * size.width * 0.03,
        math.sin(t * 0.8 + blob.phase * 2 * math.pi) * size.height * 0.025,
      );
      final center = Offset(blob.x * size.width, blob.y * size.height) + drift;
      final radius = blob.radius * size.shortestSide;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..blendMode = isDark ? BlendMode.plus : BlendMode.srcOver
          ..shader = ui.Gradient.radial(
            center,
            radius,
            <Color>[
              blob.color.withValues(alpha: peak),
              blob.color.withValues(alpha: 0),
            ],
            const <double>[0.0, 1.0],
          )
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 26),
      );
    }

    // Feather the bloom into the page below so it never reads as a band.
    // Fading to a fully opaque canvas guarantees content sitting in the lower
    // half lands on clean near-white, which is where the ink ladder needs its
    // contrast to hold.
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = ui.Gradient.linear(
          Offset(0, size.height * 0.34),
          Offset(0, size.height * 0.96),
          <Color>[canvasColor.withValues(alpha: 0), canvasColor],
        ),
    );
  }

  @override
  bool shouldRepaint(covariant MeshGradientPainter oldDelegate) =>
      oldDelegate.isDark != isDark || oldDelegate.intensity != intensity;
}