import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:parkinson_app/core/theme/app_colors.dart';
import 'package:parkinson_app/core/theme/app_radii.dart';
import 'package:parkinson_app/core/theme/app_text_styles.dart';
import 'package:parkinson_app/core/theme/app_theme.dart';

void main() {
  // Tests run offline, so GoogleFonts must not attempt a fetch. It also needs
  // the widget binding and an asset bundle to resolve a family, which is why
  // these token assertions run as testWidgets rather than plain test().
  GoogleFonts.config.allowRuntimeFetching = false;

  group('Geist colour tokens', () {
    testWidgets('canvas is near-white and ink is near-black', (tester) async {
      expect(AppColors.canvas, const Color(0xFFFAFAFA));
      expect(AppColors.ink, const Color(0xFF171717));
      expect(AppColors.hairline, const Color(0xFFEBEBEB));
    });

    testWidgets('body copy steps off pure black', (tester) async {
      expect(AppColors.body, const Color(0xFF4D4D4D));
      expect(AppColors.body, isNot(AppColors.ink));
    });

    testWidgets('legacy aliases resolve so existing call sites stay valid',
        (tester) async {
      expect(AppColors.primary, AppColors.ink);
      expect(AppColors.borderLight, AppColors.hairline);
      expect(AppColors.backgroundLight, AppColors.canvas);
      expect(AppColors.surfaceLight, AppColors.canvasElevated);
      expect(AppColors.textDark, AppColors.ink);
    });

    testWidgets('the mesh bloom draws only from the accent family',
        (tester) async {
      expect(AppColors.meshStops, contains(AppColors.cyan));
      expect(AppColors.meshStops, contains(AppColors.gradientDevelopStart));
      expect(AppColors.meshStops, contains(AppColors.violet));
      expect(AppColors.meshStops, contains(AppColors.magenta));
      expect(AppColors.meshStops, contains(AppColors.gradientShipEnd));
      expect(AppColors.meshStops, contains(AppColors.brand));
    });

    testWidgets('status semantics are preserved for health messaging',
        (tester) async {
      expect(AppColors.statusFor('attention'), AppColors.statusAttention);
      expect(AppColors.statusFor('watch'), AppColors.statusWatch);
      expect(AppColors.statusFor('normal'), AppColors.statusNormal);
      expect(AppColors.statusFor('anything-else'), AppColors.statusNormal);
    });
  });

  group('radius scale', () {
    testWidgets('is bimodal: tight 6px squares and full pills',
        (tester) async {
      expect(AppRadii.sm, 6);
      expect(AppRadii.md, 12);
      expect(AppRadii.lg, 16);
      expect(AppRadii.pillCategory, 64);
      expect(AppRadii.pill, 100);
      expect(AppRadii.full, 9999);
    });
  });

  group('typography', () {
    testWidgets('display is weight 600 with tight negative tracking',
        (tester) async {
      final display = AppTextStyles.displayXl;
      expect(display.fontSize, 48);
      expect(display.fontWeight, FontWeight.w600);
      expect(display.letterSpacing, -2.4);
    });

    testWidgets('heading tracking scales down with size', (tester) async {
      expect(AppTextStyles.headingLg.letterSpacing, -1.28);
      expect(AppTextStyles.headingMd.letterSpacing, -0.4);
      expect(AppTextStyles.headingLg.fontWeight, FontWeight.w600);
      expect(AppTextStyles.headingMd.fontWeight, FontWeight.w600);
    });

    testWidgets('body type sits at neutral tracking and weight 400',
        (tester) async {
      expect(AppTextStyles.bodyMd.fontWeight, FontWeight.w400);
      expect(AppTextStyles.bodyMd.letterSpacing ?? 0, 0);
      expect(AppTextStyles.bodyLg.fontWeight, FontWeight.w400);
    });

    testWidgets('buttons and labels settle at weight 500', (tester) async {
      expect(AppTextStyles.buttonLg.fontWeight, FontWeight.w500);
      expect(AppTextStyles.buttonMd.fontWeight, FontWeight.w500);
      expect(AppTextStyles.labelSm.fontWeight, FontWeight.w500);
    });

    testWidgets('mono eyebrow is small, never display-sized', (tester) async {
      expect(AppTextStyles.monoEyebrow.fontSize, 12);
      expect(AppTextStyles.monoEyebrow.fontWeight, FontWeight.w500);
      expect(AppTextStyles.code.fontSize, 14);
    });

    testWidgets('there is no light or black weight anywhere', (tester) async {
      final weights = <FontWeight>[
        AppTextStyles.displayXl.fontWeight!,
        AppTextStyles.headingLg.fontWeight!,
        AppTextStyles.bodyMd.fontWeight!,
        AppTextStyles.buttonMd.fontWeight!,
      ];
      for (final w in weights) {
        expect(w.index, lessThanOrEqualTo(FontWeight.w600.index));
        expect(w.index, greaterThanOrEqualTo(FontWeight.w400.index));
      }
    });
  });

  group('themes', () {
    testWidgets('light theme sits on the near-white canvas', (tester) async {
      final theme = AppTheme.lightTheme;
      expect(theme.scaffoldBackgroundColor, AppColors.canvas);
      expect(theme.colorScheme.primary, AppColors.ink);
      expect(theme.colorScheme.outline, AppColors.hairline);
      expect(theme.dividerColor, AppColors.hairline);
    });

    testWidgets('dark theme inverts the duet onto true black', (tester) async {
      final theme = AppTheme.darkTheme;
      expect(theme.scaffoldBackgroundColor, AppColors.backgroundDark);
      expect(theme.colorScheme.primary, const Color(0xFFEDEDED));
      expect(theme.colorScheme.outline, AppColors.borderDark);
    });

    testWidgets('cards are flat: 1px hairline side, zero elevation',
        (tester) async {
      final shape =
          AppTheme.lightTheme.cardTheme.shape! as RoundedRectangleBorder;
      expect(AppTheme.lightTheme.cardTheme.elevation, 0);
      expect(AppTheme.lightTheme.cardTheme.color, AppColors.canvasElevated);
      expect(shape.side.width, 1);
      expect(shape.side.color, AppColors.hairline);
      expect(shape.borderRadius, AppRadii.radiusMd);
    });

    testWidgets('marketing CTAs are pills and inputs are 6px squares',
        (tester) async {
      final button =
          AppTheme.lightTheme.elevatedButtonTheme.style!.shape!.resolve(
        <WidgetState>{},
      ) as RoundedRectangleBorder;
      expect(button.borderRadius, AppRadii.radiusPill);

      final input = AppTheme.lightTheme.inputDecorationTheme.enabledBorder
          as OutlineInputBorder;
      expect(input.borderRadius, AppRadii.radiusSm);
    });
  });
}