import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/app_mode_provider.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/design_system.dart';
import '../../../shared/widgets/gradient_background.dart';
import '../../../shared/widgets/motion.dart';
import '../../../shared/widgets/parkin_trace_logo.dart';

/// Entry hero: the single place the system allows colour.
///
/// The mesh bloom sits behind a tightly-tracked display headline; every other
/// element is ink on canvas. Content reveals in a short stagger so the page
/// reads as being laid down rather than snapped in.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final wide = MediaQuery.of(context).size.width >= 640;
    return Scaffold(
      body: GradientBackground(
        mesh: true,
        meshHeight: 560,
        child: SafeArea(
          // Centres the hero in the viewport when it fits, and falls back to
          // scrolling when it does not. A mainAxisAlignment alone cannot do
          // this: a SingleChildScrollView shrink-wraps its child, so the column
          // has no spare height to distribute and the hero ends up pinned to
          // the top of tall windows.
          child: LayoutBuilder(
            builder: (BuildContext context, BoxConstraints constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.xxl,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: <Widget>[
                            FadeSlideIn(
                              child: Column(
                                children: <Widget>[
                                  const ParkinTraceLogo(size: 56),
                                  const SizedBox(height: AppSpacing.md),
                                  Text(
                                    'ParkinTrace',
                                    style: AppTextStyles.headingMd,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    "Typing patterns for Parkinson's monitoring",
                                    textAlign: TextAlign.center,
                                    style: theme.textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),
                            FadeSlideIn(
                              delay: const Duration(milliseconds: 60),
                              child: const MonoEyebrow('Research preview'),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            FadeSlideIn(
                              delay: const Duration(milliseconds: 90),
                              child: Text(
                                'Understand your typing patterns over time.',
                                textAlign: TextAlign.center,
                                style: AppTextStyles.displayXl.copyWith(
                                  fontSize: wide ? 48 : 34,
                                  letterSpacing: wide ? -2.4 : -1.4,
                                  height: 1.08,
                                ),
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            FadeSlideIn(
                              delay: const Duration(milliseconds: 140),
                              child: Text(
                                'This app studies typing timing and movement patterns '
                                'to support research-oriented monitoring. It does not '
                                "diagnose Parkinson's disease.",
                                textAlign: TextAlign.center,
                                style: theme.textTheme.bodyMedium,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),
                            FadeSlideIn(
                              delay: const Duration(milliseconds: 200),
                              child: Column(
                                children: <Widget>[
                                  PrimaryButton(
                                    label: 'Get Started',
                                    icon: Icons.arrow_forward,
                                    onPressed: () =>
                                        context.go('/onboarding/how-it-works'),
                                  ),
                                  const SizedBox(height: AppSpacing.smMd),
                                  SecondaryButton(
                                    label: 'Continue as Guest — Demo',
                                    onPressed: () async {
                                      await ref
                                          .read(appModeProvider.notifier)
                                          .enterDemo();
                                      if (context.mounted) {
                                        context.go('/onboarding/how-it-works');
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            FadeSlideIn(
                              delay: const Duration(milliseconds: 260),
                              child: Column(
                                children: <Widget>[
                                  TextButton(
                                    onPressed: () =>
                                        context.go('/onboarding/how-it-works'),
                                    child: const Text('How it works →'),
                                  ),
                                  TextButton(
                                    onPressed: () => context.go('/login'),
                                    child: const Text(
                                      'Already have an account? Sign in',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              'Demo includes sample data so Insights never looks '
                              'empty. Clearly labeled "Sample / Demo Data".',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
