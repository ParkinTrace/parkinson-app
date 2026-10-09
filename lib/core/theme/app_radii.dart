import 'package:flutter/material.dart';

class AppRadii {
  // Geist radius scale. Bimodal by design: tight 6px squares for functional
  // chrome, full pills for marketing CTAs and category tabs.
  static const double none = 0;
  static const double sm = 6; // nav / app buttons, inputs
  static const double md = 12; // feature cards, code blocks
  static const double lg = 16; // larger panels
  static const double xl = 20; // legacy tier
  static const double pillCategory = 64; // category-tab pills
  static const double pill = 100; // marketing CTA pills
  static const double full = 9999; // circular icon buttons, avatars

  static const BorderRadius radiusNone = BorderRadius.zero;
  static const BorderRadius radiusSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius radiusMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius radiusLg = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius radiusXl = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius radiusPillCategory =
      BorderRadius.all(Radius.circular(pillCategory));
  static const BorderRadius radiusPill =
      BorderRadius.all(Radius.circular(pill));
  static const BorderRadius radiusFull =
      BorderRadius.all(Radius.circular(full));

  static const RoundedRectangleBorder cardShape =
      RoundedRectangleBorder(borderRadius: radiusMd);
  // Functional chrome stays a tight 6px square.
  static const RoundedRectangleBorder buttonShape =
      RoundedRectangleBorder(borderRadius: radiusSm);
  // Marketing CTA becomes a full pill.
  static const RoundedRectangleBorder pillShape =
      RoundedRectangleBorder(borderRadius: radiusPill);
}
