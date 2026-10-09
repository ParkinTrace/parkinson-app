import 'package:flutter/material.dart';

/// 8px spacing system — health-tech calm, spacious.
class AppSpacing {
  // 4px base unit: 4 -> 8 -> 12 -> 16 -> 24 -> 32 -> 40 -> 64 -> 96 -> 128.
  static const double xs = 4;
  static const double sm = 8;
  static const double smMd = 12; // spec step 12, between sm and md
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xl2 = 40; // spec 2xl
  static const double xxl = 48;
  static const double xxxl = 64; // spec 3xl
  static const double xl4 = 96; // spec 4xl
  static const double section = 128; // section band rhythm

  // Insets
  static const EdgeInsets pagePadding = EdgeInsets.all(lg);
  static const EdgeInsets cardPadding = EdgeInsets.all(lg);
  static const EdgeInsets screenPadding = EdgeInsets.all(lg);
  static const EdgeInsets sectionPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: md,
  );
  // Section bands run 96-128px of vertical rhythm.
  static const EdgeInsets bandPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: xl4,
  );

  // Gaps
  static const SizedBox gapXs = SizedBox(height: xs, width: xs);
  static const SizedBox gapSm = SizedBox(height: sm, width: sm);
  static const SizedBox gapSmMd = SizedBox(height: smMd, width: smMd);
  static const SizedBox gapMd = SizedBox(height: md, width: md);
  static const SizedBox gapLg = SizedBox(height: lg, width: lg);
  static const SizedBox gapXl = SizedBox(height: xl, width: xl);
  static const SizedBox gapXl2 = SizedBox(height: xl2, width: xl2);
  static const SizedBox gapXl4 = SizedBox(height: xl4, width: xl4);
  static const SizedBox gapSection = SizedBox(height: section, width: section);
}
