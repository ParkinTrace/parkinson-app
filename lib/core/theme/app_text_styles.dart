import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Outfit for headings, Inter for body — calm, legible, accessible.
class AppTextStyles {
  // Geist Sans -> Inter substitute. Weight is binary: 600 headings, 500 for
  // labels/buttons, 400 for everything else. No light, no black, no italic.
  static const List<String> _sansFallback = <String>[
    'Arial',
    'Roboto',
    'Helvetica Neue',
    'sans-serif',
  ];

  // Geist Mono -> JetBrains Mono. Reserved for code and technical eyebrows.
  static const List<String> _monoFallback = <String>[
    'Courier New',
    'Roboto Mono',
    'monospace',
  ];

  static TextStyle _sans({
    required double size,
    required FontWeight weight,
    double? height,
    double? letterSpacing,
  }) =>
      GoogleFonts.inter(
        fontSize: size,
        fontWeight: weight,
        height: height,
        letterSpacing: letterSpacing,
      ).copyWith(fontFamilyFallback: _sansFallback);

  static TextStyle _mono({
    required double size,
    required FontWeight weight,
    double? height,
    double? letterSpacing,
  }) =>
      GoogleFonts.jetBrainsMono(
        fontSize: size,
        fontWeight: weight,
        height: height,
        letterSpacing: letterSpacing,
      ).copyWith(fontFamilyFallback: _monoFallback);

  // --- Display ---------------------------------------------------------------
  // Tight negative tracking scales with size: -2.4px at hero scale.
  static TextStyle get displayXl =>
      _sans(size: 48, weight: FontWeight.w600, height: 1, letterSpacing: -2.4);
  static TextStyle get display => displayXl;

  // --- Headings --------------------------------------------------------------
  // -1.28px at section scale.
  static TextStyle get headingLg => _sans(
      size: 32, weight: FontWeight.w600, height: 1.25, letterSpacing: -1.28);
  static TextStyle get headingLarge => headingLg;
  static TextStyle get headingMd => _sans(
      size: 20, weight: FontWeight.w600, height: 1.4, letterSpacing: -0.4);
  static TextStyle get headingMedium => headingMd;
  static TextStyle get headingSm => _sans(
      size: 16, weight: FontWeight.w600, height: 1.4, letterSpacing: -0.32);
  static TextStyle get headingSmall => headingSm;

  // Card / section titles.
  static TextStyle get titleSmall => headingSm;
  static TextStyle get labelSm => _sans(
      size: 14, weight: FontWeight.w500, height: 20 / 14, letterSpacing: -0.28);

  // --- Mono eyebrow ----------------------------------------------------------
  // Uppercase Geist Mono, spec-sheet section labels.
  static TextStyle get monoEyebrow =>
      _mono(size: 12, weight: FontWeight.w500, height: 16 / 12);
  static TextStyle get caption =>
      _mono(size: 11, weight: FontWeight.w500, letterSpacing: 0.4);

  // --- Body ------------------------------------------------------------------
  static TextStyle get bodyLg =>
      _sans(size: 16, weight: FontWeight.w400, height: 1.5);
  static TextStyle get bodyLarge => bodyLg;
  static TextStyle get bodyMd =>
      _sans(size: 14, weight: FontWeight.w400, height: 20 / 14);
  static TextStyle get bodyMedium => bodyMd;
  static TextStyle get bodySm =>
      _sans(size: 12, weight: FontWeight.w400, height: 16 / 12);
  static TextStyle get bodySmall => bodySm;

  // --- Buttons ---------------------------------------------------------------
  static TextStyle get buttonLg =>
      _sans(size: 16, weight: FontWeight.w500, height: 20 / 16);
  static TextStyle get buttonMd =>
      _sans(size: 14, weight: FontWeight.w500, height: 20 / 14);
  static TextStyle get labelButton => buttonMd;

  // --- Code ------------------------------------------------------------------
  static TextStyle get code =>
      _mono(size: 14, weight: FontWeight.w400, height: 20 / 14);
  static TextStyle get monoSmall =>
      _mono(size: 12, weight: FontWeight.w400, height: 16 / 12);
}
