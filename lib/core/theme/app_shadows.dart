import 'package:flutter/material.dart';

class AppShadows {
  // Level 0 - flat. Hairline only, no shadow. The system default.
  static const List<BoxShadow> none = <BoxShadow>[];

  // Level 1 - whisper: 0 1 1 rgba(0,0,0,0.04).
  static const BoxShadow whisper = BoxShadow(
    color: Color(0x0A000000),
    blurRadius: 1,
    offset: Offset(0, 1),
  );

  // Level 2 - floating: finely layered, very low alpha.
  static const BoxShadow floatNear = BoxShadow(
    color: Color(0x0F000000),
    blurRadius: 2,
    offset: Offset(0, 2),
  );
  static const BoxShadow floatFar = BoxShadow(
    color: Color(0x14000000),
    blurRadius: 16,
    offset: Offset(0, 8),
    spreadRadius: -4,
  );

  static const List<BoxShadow> flat = <BoxShadow>[whisper];
  static const List<BoxShadow> floating = <BoxShadow>[floatNear, floatFar];

  // Dark surfaces read as light-on-dark lift rather than dark-on-light.
  static const BoxShadow whisperDark = BoxShadow(
    color: Color(0x1FFFFFFF),
    blurRadius: 1,
    offset: Offset(0, 1),
  );
  static const BoxShadow floatNearDark = BoxShadow(
    color: Color(0x14FFFFFF),
    blurRadius: 2,
    offset: Offset(0, 2),
  );

  /// Theme-aware Level 1 elevation.
  static List<BoxShadow> whisperFor(Brightness brightness) =>
      brightness == Brightness.dark
          ? const <BoxShadow>[whisperDark]
          : const <BoxShadow>[whisper];

  /// Theme-aware Level 2 elevation.
  static List<BoxShadow> floatingFor(Brightness brightness) =>
      brightness == Brightness.dark
          ? const <BoxShadow>[floatNearDark, whisperDark]
          : floating;

  // Legacy aliases.
  static const BoxShadow soft = whisper;
  static const BoxShadow medium = floatFar;
  static const List<BoxShadow> card = <BoxShadow>[whisper];
  static const List<BoxShadow> elevated = floating;
}
