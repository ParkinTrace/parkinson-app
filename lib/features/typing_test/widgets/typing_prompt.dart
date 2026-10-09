import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// The typing target, rendered character by character.
///
/// Correct characters step up to ink; a mistyped one takes the error tier; the
/// remainder of the prompt stays in the faint tier so the eye is always drawn
/// to the next character rather than the whole line.
class TypingPrompt extends StatelessWidget {
  final String prompt;
  final String typed;
  const TypingPrompt({super.key, required this.prompt, required this.typed});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final upcoming = isDark ? AppColors.mute : AppColors.faint;
    final correct = theme.textTheme.titleSmall?.color ?? AppColors.ink;
    final caret = theme.colorScheme.primary;

    return RichText(
      text: TextSpan(
        style: theme.textTheme.bodyLarge?.copyWith(height: 1.7),
        children: <InlineSpan>[
          for (var i = 0; i < prompt.length; i++)
            TextSpan(
              text: prompt[i],
              style: TextStyle(
                color: i < typed.length
                    ? (typed[i] == prompt[i] ? correct : AppColors.error)
                    : upcoming,
                backgroundColor: i < typed.length
                    ? (typed[i] == prompt[i]
                        ? caret.withValues(alpha: isDark ? 0.14 : 0.06)
                        : (isDark
                            ? AppColors.error.withValues(alpha: 0.22)
                            : AppColors.errorBackgroundLight))
                    : null,
                decoration: i == typed.length
                    ? TextDecoration.underline
                    : TextDecoration.none,
                decorationColor: caret,
                decorationThickness: 2,
              ),
            ),
          // Caret parks after the prompt once it is fully typed.
          if (typed.length >= prompt.length)
            TextSpan(
              text: ' ',
              style: TextStyle(
                backgroundColor: caret.withValues(alpha: 0.15),
              ),
            ),
        ],
      ),
    );
  }
}
