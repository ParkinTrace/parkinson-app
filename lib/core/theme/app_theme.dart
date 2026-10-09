import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_motion.dart';
import 'app_page_transitions.dart';
import 'app_radii.dart';
import 'app_spacing.dart';
import 'app_text_styles.dart';

/// Calm premium theme — ink on canvas, hairline structure, one mesh flourish.
class AppTheme {
  // Explicit schemes rather than fromSeed: the system's colours are precise,
  // and a seeded scheme would tint every surface off the neutral ladder.
  static const ColorScheme _lightScheme = ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.ink,
    onPrimary: AppColors.onPrimary,
    primaryContainer: AppColors.hairlineSoft,
    onPrimaryContainer: AppColors.ink,
    secondary: AppColors.body,
    onSecondary: AppColors.onPrimary,
    tertiary: AppColors.brand,
    onTertiary: AppColors.onPrimary,
    error: AppColors.error,
    onError: AppColors.onPrimary,
    surface: AppColors.canvasElevated,
    onSurface: AppColors.ink,
    surfaceContainerHighest: AppColors.hairlineSoft,
    onSurfaceVariant: AppColors.body,
    outline: AppColors.hairline,
    outlineVariant: AppColors.hairlineSoft,
    inverseSurface: AppColors.ink,
    onInverseSurface: AppColors.onPrimary,
  );

  // Dark inverts the duet: light "ink" on a true-black canvas.
  static const ColorScheme _darkScheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xFFEDEDED),
    onPrimary: Color(0xFF000000),
    primaryContainer: AppColors.surfaceDarkElevated,
    onPrimaryContainer: AppColors.textLight,
    secondary: AppColors.mute,
    onSecondary: Color(0xFF000000),
    tertiary: AppColors.brandLight,
    onTertiary: Color(0xFF000000),
    error: Color(0xFFFF6369),
    onError: Color(0xFF000000),
    surface: AppColors.surfaceDark,
    onSurface: AppColors.textLight,
    surfaceContainerHighest: AppColors.surfaceDarkElevated,
    onSurfaceVariant: AppColors.mute,
    outline: AppColors.borderDark,
    outlineVariant: Color(0xFF1F1F1F),
    inverseSurface: AppColors.textLight,
    onInverseSurface: Color(0xFF000000),
  );

  static ThemeData get lightTheme => _build(_lightScheme, Brightness.light);

  static ThemeData get darkTheme => _build(_darkScheme, Brightness.dark);

  static ThemeData _build(ColorScheme scheme, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final canvas = isDark ? AppColors.backgroundDark : AppColors.canvas;
    final elevated = isDark ? AppColors.surfaceDark : AppColors.canvasElevated;
    final hairline = isDark ? AppColors.borderDark : AppColors.hairline;
    final ink = isDark ? AppColors.textLight : AppColors.ink;
    final quiet = isDark ? AppColors.mute : AppColors.body;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      canvasColor: canvas,
      dividerColor: hairline,
      // Type carries the system: Geist substitute with the grey ladder applied.
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayXl.copyWith(color: ink),
        displayMedium: AppTextStyles.headingLg.copyWith(color: ink),
        displaySmall: AppTextStyles.headingMd.copyWith(color: ink),
        headlineLarge: AppTextStyles.headingLg.copyWith(color: ink),
        headlineMedium: AppTextStyles.headingMd.copyWith(color: ink),
        headlineSmall: AppTextStyles.headingSm.copyWith(color: ink),
        titleLarge: AppTextStyles.headingMd.copyWith(color: ink),
        titleMedium: AppTextStyles.headingSm.copyWith(color: ink),
        titleSmall: AppTextStyles.titleSmall.copyWith(color: ink),
        bodyLarge: AppTextStyles.bodyLg.copyWith(color: quiet),
        bodyMedium: AppTextStyles.bodyMd.copyWith(color: quiet),
        bodySmall: AppTextStyles.bodySm.copyWith(color: quiet),
        labelLarge: AppTextStyles.buttonMd.copyWith(color: ink),
        labelMedium: AppTextStyles.labelSm.copyWith(color: quiet),
        labelSmall: AppTextStyles.monoEyebrow.copyWith(color: quiet),
      ),
      // Cards are flat by default: a 1px hairline, no shadow.
      cardTheme: CardThemeData(
        elevation: 0,
        color: elevated,
        shadowColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadii.radiusMd,
          side: BorderSide(color: hairline),
        ),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: canvas,
        surfaceTintColor: Colors.transparent,
        foregroundColor: ink,
        shape: Border(bottom: BorderSide(color: hairline)),
        titleTextStyle: AppTextStyles.headingSm.copyWith(color: ink),
      ),
      // Marketing CTAs are full pills.
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          disabledBackgroundColor:
              isDark ? AppColors.surfaceDarkElevated : AppColors.hairline,
          disabledForegroundColor: AppColors.faint,
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          shape:
              const RoundedRectangleBorder(borderRadius: AppRadii.radiusPill),
          textStyle: AppTextStyles.buttonLg,
          elevation: 0,
          shadowColor: Colors.transparent,
          animationDuration: AppMotion.base,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: elevated,
          foregroundColor: ink,
          minimumSize: const Size(0, 44),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          shape:
              const RoundedRectangleBorder(borderRadius: AppRadii.radiusPill),
          side: BorderSide(color: hairline),
          textStyle: AppTextStyles.buttonLg,
          animationDuration: AppMotion.base,
        ),
      ),
      // Nav and in-app controls stay tight 6px squares.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: ink,
          textStyle: AppTextStyles.buttonMd,
          shape: const RoundedRectangleBorder(borderRadius: AppRadii.radiusSm),
          animationDuration: AppMotion.base,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: quiet,
          shape: const RoundedRectangleBorder(borderRadius: AppRadii.radiusSm),
          animationDuration: AppMotion.fast,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: elevated,
        hintStyle: AppTextStyles.bodyMd.copyWith(color: AppColors.faint),
        labelStyle: AppTextStyles.bodyMd.copyWith(color: quiet),
        border: OutlineInputBorder(
            borderRadius: AppRadii.radiusSm,
            borderSide: BorderSide(color: hairline)),
        enabledBorder: OutlineInputBorder(
            borderRadius: AppRadii.radiusSm,
            borderSide: BorderSide(color: hairline)),
        focusedBorder: OutlineInputBorder(
            borderRadius: AppRadii.radiusSm,
            borderSide: BorderSide(color: scheme.primary, width: 1.5)),
        errorBorder: OutlineInputBorder(
            borderRadius: AppRadii.radiusSm,
            borderSide: const BorderSide(color: AppColors.error)),
        contentPadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.smMd, vertical: AppSpacing.smMd),
      ),
      dividerTheme: DividerThemeData(color: hairline, space: 1, thickness: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: ink,
        linearTrackColor: hairline,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: canvas,
        surfaceTintColor: Colors.transparent,
        indicatorColor: ink.withValues(alpha: 0.06),
        elevation: 0,
        height: 64,
        labelTextStyle: WidgetStatePropertyAll<TextStyle>(
          AppTextStyles.bodySm.copyWith(color: quiet),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: elevated,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadii.radiusLg,
          side: BorderSide(color: hairline),
        ),
        titleTextStyle: AppTextStyles.headingSm.copyWith(color: ink),
        contentTextStyle: AppTextStyles.bodyMd.copyWith(color: quiet),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: ink,
        contentTextStyle: AppTextStyles.bodyMd.copyWith(color: canvas),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: AppRadii.radiusSm),
      ),
      listTileTheme: ListTileThemeData(
        titleTextStyle: AppTextStyles.bodyMd.copyWith(color: ink),
        subtitleTextStyle: AppTextStyles.bodySm.copyWith(color: quiet),
        iconColor: quiet,
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: ink,
          borderRadius: AppRadii.radiusSm,
        ),
        textStyle: AppTextStyles.bodySm.copyWith(color: canvas),
      ),
      // Fade plus a short upward slide, instead of the default platform zoom.
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.windows: FadeThroughPageTransitionsBuilder(),
          TargetPlatform.macOS: FadeThroughPageTransitionsBuilder(),
          TargetPlatform.linux: FadeThroughPageTransitionsBuilder(),
          TargetPlatform.android: FadeThroughPageTransitionsBuilder(),
          TargetPlatform.iOS: FadeThroughPageTransitionsBuilder(),
        },
      ),
    );
  }
}
