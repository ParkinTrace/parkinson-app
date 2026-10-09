import 'dart:math' as math;

import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import 'mesh_gradient.dart';

class GradientBackground extends StatelessWidget {
  final Widget child;

  /// Opt-in mesh bloom. Kept off by default so colour stays confined to hero
  /// surfaces, per the system's "one flourish" rule.
  final bool mesh;

  /// 0 = no bloom, 1 = full strength.
  final double meshIntensity;

  /// Height of the bloom band, measured from the top of the page.
  final double meshHeight;

  const GradientBackground({
    super.key,
    required this.child,
    this.mesh = false,
    this.meshIntensity = 1,
    this.meshHeight = 440,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canvas = isDark ? AppColors.backgroundDark : AppColors.canvas;
    if (!mesh) {
      return ColoredBox(color: canvas, child: child);
    }
    return ColoredBox(
      color: canvas,
      child: LayoutBuilder(
        builder: (BuildContext context, BoxConstraints constraints) {
          // Never let the bloom own the whole page. A fixed band height is fine
          // on a tall window but swallows a short one, so cap it to a fraction
          // of the available height and keep the mesh a hero flourish.
          final double band = constraints.maxHeight.isFinite
              ? math.min(meshHeight, constraints.maxHeight * 0.62)
              : meshHeight;
          return Stack(
            fit: StackFit.expand,
            children: <Widget>[
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: band,
                child: MeshGradient(intensity: meshIntensity),
              ),
              child,
            ],
          );
        },
      ),
    );
  }
}
