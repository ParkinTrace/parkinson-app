import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/animated_status_indicator.dart';
import '../../../shared/widgets/hairline_card.dart';

/// Layer 1 / Layer 2 result card — calm, separate, never merged (Stage 5.5, 7.1).
/// Building state shows hourglass; otherwise a soft pulsing dot.
class LayerResultCard extends StatelessWidget {
  final String title;
  final String status;
  final String message;
  final bool building;
  final bool emphasized;
  const LayerResultCard({
    super.key,
    required this.title,
    required this.status,
    required this.message,
    this.building = false,
    this.emphasized = false,
  });

  Color get _color {
    switch (status) {
      case 'attention':
        return AppColors.statusAttention;
      case 'watch':
      case 'device_mismatch':
        return AppColors.statusWatch;
      default:
        return AppColors.statusNormal;
    }
  }

  /// Uppercase mono label, so the card reads like a spec-sheet entry.
  String get _statusLabel {
    if (building) return 'Learning baseline';
    switch (status) {
      case 'attention':
        return 'Attention';
      case 'watch':
      case 'device_mismatch':
        return 'Watch';
      default:
        return 'In typical range';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color;
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    return HairlineCard(
      tint: color,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          AnimatedStatusIndicator(
            color: color,
            icon: building ? Icons.hourglass_empty_outlined : Icons.circle,
            size: emphasized ? 28 : 20,
          ),
          const SizedBox(width: AppSpacing.smMd),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  _statusLabel.toUpperCase(),
                  style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  title,
                  style: emphasized
                      ? Theme.of(context).textTheme.titleMedium
                      : Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(message, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
