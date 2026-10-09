import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers/analysis_mode_provider.dart';
import '../../core/providers/app_mode_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_motion.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import '../../shared/widgets/parkin_trace_logo.dart';

class AppSidebar extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;
  const AppSidebar({super.key, required this.navigationShell});

  static const _items = [
    (Icons.home_outlined, Icons.home, 'Home'),
    (Icons.keyboard_outlined, Icons.keyboard, 'Typing Session'),
    (Icons.insights_outlined, Icons.insights, 'Insights'),
    (Icons.person_outline, Icons.person, 'Profile'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDemo = ref.watch(appModeProvider).isDemo;
    final analysisMode = ref.watch(analysisModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hairline = Theme.of(context).dividerColor;
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    final chipSurface =
        isDark ? AppColors.surfaceDarkElevated : AppColors.canvasElevated;
    return Container(
      width: 260,
      decoration: BoxDecoration(
        // Canvas, not white: hairline structure separates nav from content.
        color: isDark ? AppColors.backgroundDark : AppColors.canvas,
        border: Border(right: BorderSide(color: hairline)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.smMd,
            ),
            child: const ParkinTraceLogo(size: 34, showWordmark: true),
          ),
          if (analysisMode != null)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.smMd),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: chipSurface,
                borderRadius: AppRadii.radiusSm,
                border: Border.all(color: hairline),
              ),
              child: Text(
                analysisMode == AnalysisMode.layer1
                    ? 'LAYER 1 · QUICK ANALYSIS'
                    : 'LAYER 2 · PERSONAL MONITORING',
                style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
                textAlign: TextAlign.center,
              ),
            ),
          const SizedBox(height: 8),
          if (isDemo)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.smMd),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 6,
              ),
              decoration: BoxDecoration(
                color: chipSurface,
                borderRadius: AppRadii.radiusSm,
                border: Border.all(color: hairline),
              ),
              child: Row(
                children: <Widget>[
                  Icon(Icons.science_outlined, size: 12, color: quiet),
                  const SizedBox(width: 6),
                  Text(
                    'DEMO',
                    style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
                  ),
                  const Spacer(),
                  Text(
                    'Sample data',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 8),
          // Nav — fixed order Home, Typing Session, Insights, Profile
          for (var i = 0; i < _items.length; i++)
            _NavItem(
              icon: _items[i].$1,
              activeIcon: _items[i].$2,
              label: _items[i].$3,
              selected: navigationShell.currentIndex == i,
              onTap: () {
                // Insights is mode-aware: go to correct layer's insights
                if (i == 2) {
                  final mode = ref.read(analysisModeProvider);
                  if (mode == AnalysisMode.layer1) {
                    context.go('/insights/layer1');
                    return;
                  } else if (mode == AnalysisMode.layer2) {
                    context.go('/insights/layer2');
                    return;
                  }
                }
                navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex);
              },
            ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              'ANALYSIS MODES',
              style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
            ),
          ),
          const SizedBox(height: 8),
          _LayerModeButton(
            icon: Icons.science_outlined,
            label: 'Layer 1',
            subtitle: 'Quick Analysis',
            selected: analysisMode == AnalysisMode.layer1,
            onTap: () async {
              await ref.read(analysisModeProvider.notifier).setMode(AnalysisMode.layer1);
              if (context.mounted) context.go('/home');
            },
          ),
          const SizedBox(height: 6),
          _LayerModeButton(
            icon: Icons.timeline_outlined,
            label: 'Layer 2',
            subtitle: 'Personal Monitoring',
            selected: analysisMode == AnalysisMode.layer2,
            onTap: () async {
              await ref.read(analysisModeProvider.notifier).setMode(AnalysisMode.layer2);
              if (context.mounted) context.go('/home');
            },
          ),
          const Spacer(),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                if (isDemo) ...[
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () =>
                          ref.read(appModeProvider.notifier).resetDemo(),
                      child: const Text('Reset demo'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () {
                        ref.read(appModeProvider.notifier).exitDemo();
                        context.go('/login');
                      },
                      child: const Text('Exit demo'),
                    ),
                  ),
                ] else
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => context.go('/profile/settings'),
                      child: const Text('Settings'),
                    ),
                  ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'v1.0 · Research preview',
                  style: AppTextStyles.monoEyebrow.copyWith(color: quiet),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ink = isDark ? AppColors.textLight : AppColors.ink;
    final quiet = isDark ? AppColors.mute : AppColors.body;
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      // AnimatedContainer, not Material: selection slides in rather than
      // snapping, which is what makes the nav feel responsive.
      child: AnimatedContainer(
        duration: AppMotion.effective(context, AppMotion.fast),
        curve: AppMotion.standard,
        decoration: BoxDecoration(
          color: selected
              ? Theme.of(context).dividerColor.withValues(alpha: 0.5)
              : Colors.transparent,
          borderRadius: AppRadii.radiusSm,
          border: Border.all(
            color: selected
                ? Theme.of(context).dividerColor
                : Colors.transparent,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: AppRadii.radiusSm,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadii.radiusSm,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.smMd,
                vertical: 10,
              ),
              child: Row(
                children: <Widget>[
                  Icon(
                    selected ? activeIcon : icon,
                    size: 18,
                    color: selected ? ink : quiet,
                  ),
                  const SizedBox(width: AppSpacing.smMd),
                  Text(
                    label,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight:
                              selected ? FontWeight.w500 : FontWeight.w400,
                          color: selected ? ink : quiet,
                        ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LayerModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;
  const _LayerModeButton({required this.icon, required this.label, required this.subtitle, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ink = isDark ? AppColors.textLight : AppColors.ink;
    final quiet = isDark ? AppColors.mute : AppColors.body;
    // Brand teal is the single accent here; the emerald stays reserved for
    // health status, so a selected mode never reads as a clinical signal.
    final accent = isDark ? AppColors.brandLight : AppColors.brand;
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      child: AnimatedContainer(
        duration: AppMotion.effective(context, AppMotion.fast),
        curve: AppMotion.standard,
        decoration: BoxDecoration(
          color: selected ? accent.withValues(alpha: 0.06) : Colors.transparent,
          borderRadius: AppRadii.radiusSm,
          border: Border.all(
            color:
                selected ? accent.withValues(alpha: 0.35) : Colors.transparent,
          ),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: AppRadii.radiusSm,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadii.radiusSm,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.smMd,
                vertical: 10,
              ),
              child: Row(
                children: <Widget>[
                  Icon(icon, size: 16, color: selected ? accent : quiet),
                  const SizedBox(width: AppSpacing.smMd),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          label,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(
                                fontWeight: selected
                                    ? FontWeight.w500
                                    : FontWeight.w400,
                                color: selected ? ink : quiet,
                                fontSize: 13,
                              ),
                        ),
                        Text(
                          subtitle,
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(fontSize: 11, color: quiet),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
