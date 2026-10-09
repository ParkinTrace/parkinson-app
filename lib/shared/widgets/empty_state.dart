import 'package:flutter/material.dart';

import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';
import 'design_system.dart';
import 'hairline_card.dart';

class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    final ink = Theme.of(context).textTheme.titleSmall?.color;
    return HairlineCard(
      padding: AppSpacing.screenPadding,
      child: Column(
        children: <Widget>[
          // Square inset well, not a coloured circle: colour stays an accent.
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .primary
                  .withValues(alpha: 0.06),
              borderRadius: AppRadii.radiusSm,
            ),
            child: Icon(icon, size: 22, color: ink),
          ),
          const SizedBox(height: AppSpacing.smMd),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: quiet),
          ),
          if (actionLabel != null) ...<Widget>[
            const SizedBox(height: AppSpacing.md),
            PrimaryButton(label: actionLabel!, onPressed: onAction),
          ],
        ],
      ),
    );
  }
}
