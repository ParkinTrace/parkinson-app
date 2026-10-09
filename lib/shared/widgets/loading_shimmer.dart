import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radii.dart';

/// Skeleton shimmer for loading states.
///
/// Built from the system's own greys and edged with the hairline, so a loading
/// page and a loaded page share one palette instead of flashing raw greys.
class LoadingShimmer extends StatelessWidget {
  final double height;
  final double? width;
  final BorderRadius borderRadius;
  const LoadingShimmer({
    super.key,
    this.height = 80,
    this.width,
    this.borderRadius = AppRadii.radiusMd,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.surfaceDarkElevated : AppColors.hairlineSoft,
      highlightColor:
          isDark ? AppColors.borderDark : AppColors.canvasElevated,
      child: Container(
        height: height,
        width: width,
        decoration: BoxDecoration(
          color:
              isDark ? AppColors.surfaceDark : AppColors.canvasElevated,
          borderRadius: borderRadius,
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.hairline,
          ),
        ),
      ),
    );
  }
}

class CardShimmer extends StatelessWidget {
  const CardShimmer({super.key});
  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        LoadingShimmer(height: 96),
        SizedBox(height: 12),
        LoadingShimmer(height: 96),
      ],
    );
  }
}
