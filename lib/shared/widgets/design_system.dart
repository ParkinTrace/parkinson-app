import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_motion.dart';
import '../../core/theme/app_radii.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_styles.dart';
import 'hairline_card.dart';
import 'motion.dart';

/// The marketing CTA: a fully rounded ink pill.
///
/// Kept deliberately distinct from [AppSquareButton]'s 6px square: the shape
/// tells you which surface you are on.
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.busy = false,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PressableScale(
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          // Deliberately not disabled while busy: disabling would flash the
          // button to the grey disabled tier mid-submit. The no-op handler
          // blocks re-entry without changing the paint.
          onPressed: busy ? () {} : onPressed,
          child: AnimatedSwitcher(
            duration: AppMotion.fast,
            child: busy
                ? SizedBox(
                    key: const ValueKey<String>('busy'),
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: scheme.onPrimary,
                    ),
                  )
                : Row(
                    key: const ValueKey<String>('idle'),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      if (icon != null) ...<Widget>[
                        Icon(icon, size: 18),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                      Text(label),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// The secondary marketing CTA: a white pill with a hairline edge.
class SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  const SecondaryButton({super.key, required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return PressableScale(
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton(onPressed: onPressed, child: Text(label)),
      ),
    );
  }
}

/// The compact square control used for nav and in-app chrome.
///
/// A tight 6px radius at [AppTextStyles.buttonMd], height-driven rather than
/// padded vertically, so it clears the 44px touch target in a nav row.
class AppSquareButton extends StatelessWidget {
  const AppSquareButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.primary = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  /// Ink-filled when true, white-with-hairline when false.
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final surface =
        isDark ? AppColors.surfaceDarkElevated : AppColors.canvasElevated;
    final ink = isDark ? AppColors.textLight : AppColors.ink;
    final style = ButtonStyle(
      backgroundColor: WidgetStatePropertyAll<Color>(
        primary ? scheme.primary : surface,
      ),
      foregroundColor: WidgetStatePropertyAll<Color>(
        primary ? scheme.onPrimary : ink,
      ),
      side: primary
          ? null
          : WidgetStatePropertyAll<BorderSide>(
              BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.hairline,
              ),
            ),
      minimumSize: const WidgetStatePropertyAll<Size>(Size(0, 36)),
      padding: const WidgetStatePropertyAll<EdgeInsetsGeometry>(
        EdgeInsets.symmetric(horizontal: AppSpacing.smMd),
      ),
      shape: const WidgetStatePropertyAll<OutlinedBorder>(
        RoundedRectangleBorder(borderRadius: AppRadii.radiusSm),
      ),
      textStyle: WidgetStatePropertyAll<TextStyle>(AppTextStyles.buttonMd),
      elevation: const WidgetStatePropertyAll<double>(0),
      animationDuration: AppMotion.base,
    );
    return PressableScale(
      child: OutlinedButton(
        onPressed: onPressed,
        style: style,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            if (icon != null) ...<Widget>[
              Icon(icon, size: 16),
              const SizedBox(width: 6),
            ],
            Text(label),
          ],
        ),
      ),
    );
  }
}

/// Uppercase Geist Mono label, introducing a section like a spec-sheet header.
class MonoEyebrow extends StatelessWidget {
  const MonoEyebrow(this.text, {super.key, this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    return Text(
      text.toUpperCase(),
      style: AppTextStyles.monoEyebrow.copyWith(color: color ?? quiet),
    );
  }
}

/// Status as a capsule: a coloured dot plus an uppercase mono label, edged in
/// the status colour at low alpha. Never a filled colour block.
class StatusBadge extends StatelessWidget {
  final String status; // normal/watch/attention/building
  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color c;
    String label;
    switch (status) {
      case 'attention':
        c = AppColors.statusAttention;
        label = 'Attention';
        break;
      case 'watch':
        c = AppColors.statusWatch;
        label = 'Watch';
        break;
      case 'building':
        c = AppColors.textMutedDark;
        label = 'Building';
        break;
      default:
        c = AppColors.statusNormal;
        label = 'Normal';
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.canvasElevated,
        borderRadius: AppRadii.radiusPill,
        border: Border.all(color: c.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(shape: BoxShape.circle, color: c),
          ),
          const SizedBox(width: 6),
          Text(
            label.toUpperCase(),
            style: AppTextStyles.caption
                .copyWith(color: c, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// Section introduction: optional mono eyebrow, title, subtitle, trailing
/// action, closed by a 1px hairline.
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? action;

  /// Optional uppercase mono label rendered above the title.
  final String? eyebrow;

  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.eyebrow,
  });

  @override
  Widget build(BuildContext context) {
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    return Container(
      padding: const EdgeInsets.only(
        top: AppSpacing.md,
        bottom: AppSpacing.smMd,
      ),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                if (eyebrow != null) ...<Widget>[
                  MonoEyebrow(eyebrow!, color: quiet),
                  const SizedBox(height: AppSpacing.xs),
                ],
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                if (subtitle != null) ...<Widget>[
                  const SizedBox(height: 2),
                  Text(subtitle!, style: Theme.of(context).textTheme.bodySmall),
                ],
              ],
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

class ProgressCard extends StatelessWidget {
  final String title;
  final String progressText;
  final double fraction; // 0-1
  final String caption;
  const ProgressCard({
    super.key,
    required this.title,
    required this.progressText,
    required this.fraction,
    required this.caption,
  });

  @override
  Widget build(BuildContext context) {
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    final target = fraction.clamp(0.0, 1.0);
    return HairlineCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Expanded(
                child:
                    Text(title, style: Theme.of(context).textTheme.titleSmall),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                progressText,
                style: AppTextStyles.monoSmall.copyWith(color: quiet),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.smMd),
          // Eases in on first build so a returning user sees progress move.
          TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0, end: target),
            duration: AppMotion.effective(context, AppMotion.slow),
            curve: AppMotion.standard,
            builder: (context, value, _) => ClipRRect(
              borderRadius: AppRadii.radiusFull,
              child: LinearProgressIndicator(value: value, minHeight: 4),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(caption, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
