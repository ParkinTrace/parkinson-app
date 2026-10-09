import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/app_mode_provider.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import '../../shared/widgets/parkin_trace_logo.dart';

class AppTopBar extends ConsumerWidget implements PreferredSizeWidget {
  final String title;
  final String? subtitle;
  const AppTopBar({super.key, required this.title, this.subtitle});

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDemo = ref.watch(appModeProvider).isDemo;
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    return AppBar(
      titleSpacing: AppSpacing.md,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(title),
          if (subtitle != null)
            Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
      actions: <Widget>[
        if (isDemo) ...<Widget>[
          // A square, hairline-edged mono flag: reads as a spec-sheet note
          // rather than a coloured badge competing with the page.
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
              vertical: 4,
            ),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: AppRadii.radiusSm,
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(Icons.science_outlined, size: 12, color: quiet),
                const SizedBox(width: 4),
                Text(
                  'DEMO',
                  style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
        const ParkinTraceLogo(size: 26),
        const SizedBox(width: AppSpacing.xs),
        IconButton(
          tooltip: 'Settings',
          onPressed: () => context.go('/profile/settings'),
          icon: const Icon(Icons.settings_outlined, size: 20),
        ),
        const SizedBox(width: AppSpacing.sm),
      ],
    );
  }
}
