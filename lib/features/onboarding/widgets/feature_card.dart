import 'package:flutter/material.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/hairline_card.dart';

/// A single capability in a feature grid: square icon well, tight heading, and
/// body copy stepped down to the quiet tier.
class FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  const FeatureCard({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ink = theme.textTheme.titleSmall?.color;
    return HairlineCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Square inset well, matching the 6px chrome language.
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.06),
              borderRadius: AppRadii.radiusSm,
            ),
            child: Icon(icon, size: 18, color: ink),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: theme.textTheme.titleSmall),
                const SizedBox(height: AppSpacing.xs),
                Text(description, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
