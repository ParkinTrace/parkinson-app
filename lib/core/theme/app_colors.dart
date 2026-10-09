import 'package:flutter/material.dart';

/// Geist system palette, adapted: ink on a near-white canvas with hairline
/// structure. Colour is confined to the hero mesh gradient and small
/// illustration accents; the app's teal identity survives as a brand accent
/// and mesh stop rather than as chrome.
class AppColors {
  // ---------------------------------------------------------------------------
  // Geist core. The ink/canvas/hairline trio is the whole system.
  // ---------------------------------------------------------------------------

  /// Near-black ink: headings, primary CTA fill, borders, logo.
  static const Color ink = Color(0xFF171717);

  /// Near-white sheet everything sits on.
  static const Color canvas = Color(0xFFFAFAFA);

  /// Pure white for cards, buttons, inputs and code blocks.
  static const Color canvasElevated = Color(0xFFFFFFFF);

  /// The 1px border on every card, input and divider.
  static const Color hairline = Color(0xFFEBEBEB);

  /// Faintest grey fill for inset wells and alternating panels.
  static const Color hairlineSoft = Color(0xFFF2F2F2);

  /// Text drawn on ink.
  static const Color onPrimary = Color(0xFFFFFFFF);

  /// Stepped grey text ladder: ink -> body -> mute -> faint.
  static const Color body = Color(0xFF4D4D4D);
  static const Color mute = Color(0xFF8F8F8F);
  static const Color faint = Color(0xFFA1A1A1);

  /// Readable variant of mute for captions that actually carry meaning
  /// (4.7:1 on canvas, meets WCAG AA for small text).
  static const Color muteAccessible = Color(0xFF6E6E6E);

  // ---------------------------------------------------------------------------
  // Accent family. Illustration and mesh-gradient stops only, never chrome.
  // ---------------------------------------------------------------------------
  static const Color link = Color(0xFF0070F3);
  static const Color linkDeep = Color(0xFF0761D1);
  static const Color linkSoft = Color(0xFFD3E5FF);
  static const Color violet = Color(0xFF7928CA);
  static const Color cyan = Color(0xFF50E3C2);
  static const Color pink = Color(0xFFFF0080);
  static const Color magenta = Color(0xFFEB367F);
  static const Color amber = Color(0xFFF5A623);

  /// Retained brand identity, used as a mesh stop and small accent.
  static const Color brand = Color(0xFF0F766E);
  static const Color brandDeep = Color(0xFF115E59);
  static const Color brandLight = Color(0xFF14B8A6);
  static const Color coral = Color(0xFFF97364);
  static const Color gold = Color(0xFFFACC15);

  // ---------------------------------------------------------------------------
  // Light and dark surface ladders.
  // ---------------------------------------------------------------------------
  static const Color backgroundLight = canvas;
  static const Color surfaceLight = canvasElevated;
  static const Color surfaceLightElevated = hairlineSoft;
  static const Color backgroundDark = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF0A0A0A);
  static const Color surfaceDarkElevated = Color(0xFF171717);

  // ---------------------------------------------------------------------------
  // Text and borders.
  // ---------------------------------------------------------------------------
  static const Color textDark = ink;
  static const Color textLight = Color(0xFFEDEDED);
  static const Color textMutedDark = muteAccessible;
  static const Color textMutedLight = body;
  static const Color borderDark = Color(0xFF262626);
  static const Color borderLight = hairline;

  // Legacy aliases: primary is ink now, not teal.
  static const Color primary = ink;
  static const Color primaryDark = Color(0xFF000000);
  static const Color primaryLight = brandLight;
  static const Color secondary = coral;
  static const Color accent = gold;

  /// Dark counterpart of the elevated canvas.
  static const Color backgroundDarkAlt = Color(0xFF0A0A0A);

  // ---------------------------------------------------------------------------
  // Health status semantics preserved (green / amber / red).
  // ---------------------------------------------------------------------------
  static const Color statusNormal = Color(0xFF10B981);
  static const Color statusWatch = Color(0xFFF59E0B);
  static const Color statusAttention = Color(0xFFEF4444);

  // ---------------------------------------------------------------------------
  // Semantic.
  // ---------------------------------------------------------------------------
  static const Color error = Color(0xFFEE0000);
  static const Color errorDeep = Color(0xFFC50000);
  static const Color warning = amber;
  static const Color warningSoft = Color(0xFFFFF4E5);
  static const Color warningDeep = Color(0xFF9A6700);

  /// Success maps to the link blue - the system's positive/active signal.
  static const Color success = link;

  // Banner tiers, softened so health messaging never reads as alarming.
  static const Color errorText = errorDeep;
  static const Color errorBackgroundLight = Color(0xFFFFE8E8);
  static const Color errorBannerBackground = Color(0xFFFFEFEF);
  static const Color errorBannerText = errorDeep;
  static const Color warningBannerBackgroundLight = Color(0xFFFFF7EC);
  static const Color warningBannerBackgroundWatch = Color(0xFFF2F6F8);

  // ---------------------------------------------------------------------------
  // Brand gradient trio. The legacy gradient identity, surviving as
  // illustration and accent washes; blended, they form the hero mesh.
  // ---------------------------------------------------------------------------
  static const Color gradientDevelopStart = Color(0xFF007CF0);
  static const Color gradientDevelopEnd = Color(0xFF00DFD8);
  static const Color gradientPreviewStart = Color(0xFF7928CA);
  static const Color gradientPreviewEnd = Color(0xFFFF0080);
  static const Color gradientShipStart = Color(0xFFFF4D4D);
  static const Color gradientShipEnd = Color(0xFFF9CB28);

  /// Mesh-gradient stops, in bloom order.
  static const List<Color> meshStops = <Color>[
    cyan,
    gradientDevelopStart,
    violet,
    magenta,
    gradientShipEnd,
    brand,
  ];

  // Legacy alias.
  static const Color backgroundLightAlias = backgroundLight;

  static Color statusFor(String status) {
    switch (status) {
      case 'watch':
        return statusWatch;
      case 'attention':
        return statusAttention;
      case 'normal':
      default:
        return statusNormal;
    }
  }
}
