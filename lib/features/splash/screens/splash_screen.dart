import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/design_system.dart';
import '../../../shared/widgets/gradient_background.dart';
import '../../../shared/widgets/motion.dart';
import '../../../shared/widgets/parkin_trace_logo.dart';
import '../../auth/providers/auth_provider.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  void _onBegin(BuildContext context, WidgetRef ref) {
    final signedIn = ref.read(isSignedInProvider);
    final onboarded = ref.read(hasOnboardedProvider);
    if (!signedIn) {
      // Not signed in → go to Login first, then setup (once) after login
      context.go('/login');
    } else if (!onboarded) {
      context.go('/onboarding');
    } else {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Scaffold(
      body: GradientBackground(
        mesh: true,
        meshHeight: 520,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                FadeSlideIn(child: const ParkinTraceLogo(size: 88)),
                const SizedBox(height: AppSpacing.lg),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 90),
                  child: Column(
                    children: <Widget>[
                      const MonoEyebrow('Research preview'),
                      const SizedBox(height: AppSpacing.sm),
                      Text('ParkinTrace', style: AppTextStyles.headingLg),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 150),
                  child: Text(
                    "Typing patterns for Parkinson's monitoring",
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl2),
                FadeSlideIn(
                  delay: const Duration(milliseconds: 210),
                  child: SizedBox(
                    width: 220,
                    child: PrimaryButton(
                      label: 'BEGIN',
                      onPressed: () => _onBegin(context, ref),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
