import 'package:flutter/material.dart';
import '../../../core/theme/app_motion.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../shared/widgets/design_system.dart';

class OnboardingScaffold extends StatelessWidget {
  final int step;
  final int totalSteps;
  final String title;
  final String? subtitle;
  final Widget child;
  final VoidCallback? onBack;
  final VoidCallback? onContinue;
  final String continueLabel;
  final bool canContinue;

  const OnboardingScaffold({
    super.key,
    required this.step,
    required this.totalSteps,
    required this.title,
    this.subtitle,
    required this.child,
    this.onBack,
    this.onContinue,
    this.continueLabel = 'Continue',
    this.canContinue = true,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: onBack != null
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: onBack)
            : null,
        // A step counter is technical metadata, so it is set as a mono eyebrow.
        title: Text(
          'STEP $step / $totalSteps',
          style: AppTextStyles.monoEyebrow,
        ),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Padding(
              padding: AppSpacing.screenPadding,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  // Eases in rather than snapping, so progress reads as motion.
                  ClipRRect(
                    borderRadius: AppRadii.radiusFull,
                    child: TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0, end: step / totalSteps),
                      duration: AppMotion.effective(context, AppMotion.slow),
                      curve: AppMotion.standard,
                      builder: (context, value, _) => LinearProgressIndicator(
                        value: value,
                        minHeight: 4,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text(title, style: Theme.of(context).textTheme.headlineSmall),
                  if (subtitle != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  const SizedBox(height: 24),
                  Expanded(child: SingleChildScrollView(child: child)),
                  const SizedBox(height: 16),
                  if (onContinue != null)
                    PrimaryButton(
                      label: continueLabel,
                      onPressed: canContinue ? onContinue : null,
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
