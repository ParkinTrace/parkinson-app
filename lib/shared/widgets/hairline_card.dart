import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_spacing.dart';
import 'motion.dart';

/// The system's workhorse surface.
///
/// A white card on the near-white canvas, defined by a 1px hairline first and
/// at most a whisper-soft shadow. Colour is never used as a fill: [tint] only
/// edges the border and lays down a 5% wash, which is how status cards stay
/// legible without breaking the ink-on-white rule.
class HairlineCard extends StatelessWidget {
  const HairlineCard({
    super.key,
    required this.child,
    this.tint,
    this.padding = AppSpacing.cardPadding,
    this.onTap,
    this.elevated = false,
    this.hoverLift = true,
  });

  final Widget child;

  /// Status colour, used as a hairline edge and a 5% wash. Never a fill.
  final Color? tint;

  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Swaps the Level 1 whisper shadow for the Level 2 floating stack.
  final bool elevated;

  /// Lifts 2px on pointer hover. Only applied when the card is tappable.
  final bool hoverLift;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    final surface = isDark ? AppColors.surfaceDark : AppColors.canvasElevated;
    // Only blend when there is a tint: Colors.transparent is black at zero
    // alpha, so fading it to 5% would wash every untinted card grey.
    final fill = tint == null
        ? surface
        : Color.alphaBlend(tint!.withValues(alpha: 0.05), surface);
    final edge = tint?.withValues(alpha: 0.35) ??
        (isDark ? AppColors.borderDark : AppColors.hairline);

    final card = Container(
      decoration: BoxDecoration(
        color: fill,
        borderRadius: AppRadii.radiusMd,
        border: Border.all(color: edge),
        boxShadow: elevated
            ? AppShadows.floatingFor(brightness)
            : AppShadows.whisperFor(brightness),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: AppRadii.radiusMd,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );

    // Only interactive cards respond to the pointer; a static card that lifts
    // would imply affordance it does not have.
    return hoverLift && onTap != null ? HoverLift(child: card) : card;
  }
}