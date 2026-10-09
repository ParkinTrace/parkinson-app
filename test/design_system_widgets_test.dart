import 'dart:ui' show PictureRecorder;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:parkinson_app/core/theme/app_colors.dart';
import 'package:parkinson_app/core/theme/app_radii.dart';
import 'package:parkinson_app/core/theme/app_theme.dart';
import 'package:parkinson_app/shared/widgets/design_system.dart';
import 'package:parkinson_app/shared/widgets/hairline_card.dart';
import 'package:parkinson_app/shared/widgets/mesh_gradient.dart';
import 'package:parkinson_app/shared/widgets/motion.dart';

/// MediaQuery must sit *below* MaterialApp, which installs its own from the
/// view and would otherwise override any override placed above it.
Widget _host(Widget child, {bool dark = false, bool reduceMotion = false}) {
  final body = Scaffold(body: Center(child: child));
  return MaterialApp(
    theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
    home: reduceMotion
        ? MediaQuery(
            data: const MediaQueryData(
              size: Size(800, 600),
              disableAnimations: true,
            ),
            child: body,
          )
        : body,
  );
}

/// The lowest opacity applied to [text] by any ancestor.
///
/// Taking the minimum rather than the nearest ancestor keeps the assertion
/// independent of ancestor-traversal order.
double _minOpacityOver(WidgetTester tester, String text) {
  final values = tester
      .widgetList<Opacity>(
        find.ancestor(of: find.text(text), matching: find.byType(Opacity)),
      )
      .map((o) => o.opacity)
      .toList();
  expect(values, isNotEmpty, reason: 'expected an Opacity above "$text"');
  return values.reduce((a, b) => a < b ? a : b);
}

RoundedRectangleBorder _themeElevatedShape() =>
    AppTheme.lightTheme.elevatedButtonTheme.style!.shape!.resolve(
      <WidgetState>{},
    ) as RoundedRectangleBorder;

RoundedRectangleBorder _widgetOutlinedShape(WidgetTester tester) {
  final button = tester.widget<OutlinedButton>(find.byType(OutlinedButton));
  return button.style!.shape!.resolve(<WidgetState>{})
      as RoundedRectangleBorder;
}

BoxDecoration _cardDecorationOver(WidgetTester tester, String text) =>
    tester
        .widget<Container>(
          find.ancestor(of: find.text(text), matching: find.byType(Container)),
        )
        .decoration! as BoxDecoration;

void main() {
  // Tests run offline; without this, GoogleFonts throws during font lookup.
  GoogleFonts.config.allowRuntimeFetching = false;

  group('button shape signals which surface you are on', () {
    testWidgets('marketing CTA inherits the pill theme', (tester) async {
      await tester.pumpWidget(_host(
        PrimaryButton(label: 'Start Deploying', onPressed: () {}),
      ));
      expect(find.text('Start Deploying'), findsOneWidget);
      // No local style: it takes the themed pill untouched.
      expect(
        tester.widget<ElevatedButton>(find.byType(ElevatedButton)).style,
        isNull,
      );
      expect(_themeElevatedShape().borderRadius, AppRadii.radiusPill);
    });

    testWidgets('nav control overrides that theme back to a 6px square',
        (tester) async {
      await tester.pumpWidget(_host(
        AppSquareButton(label: 'Log In', onPressed: () {}),
      ));
      expect(_widgetOutlinedShape(tester).borderRadius, AppRadii.radiusSm);
    });

    testWidgets('a busy primary stays ink-filled rather than flashing grey',
        (tester) async {
      await tester.pumpWidget(_host(
        PrimaryButton(label: 'Deploy', busy: true, onPressed: () {}),
      ));
      // A no-op handler blocks re-entry without dropping to the disabled tier.
      expect(
        tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
        isNotNull,
      );
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });
  });

  group('HairlineCard', () {
    testWidgets('is white behind a 1px hairline, with only a whisper shadow',
        (tester) async {
      await tester.pumpWidget(_host(const HairlineCard(child: Text('body'))));
      final decoration = _cardDecorationOver(tester, 'body');
      expect(decoration.color, AppColors.canvasElevated);
      expect(decoration.border!.top.width, 1);
      expect(decoration.border!.top.color, AppColors.hairline);
      expect(decoration.borderRadius, AppRadii.radiusMd);
      expect(decoration.boxShadow!.length, 1);
      expect(decoration.boxShadow!.first.blurRadius, 1);
    });

    testWidgets('a status tint edges the card instead of filling it',
        (tester) async {
      await tester.pumpWidget(_host(
        const HairlineCard(tint: AppColors.warning, child: Text('watch')),
      ));
      final decoration = _cardDecorationOver(tester, 'watch');
      // Colour never floods a surface: 5% wash, tinted hairline.
      expect(decoration.color, isNot(AppColors.warning));
      expect(
        decoration.border!.top.color,
        AppColors.warning.withValues(alpha: 0.35),
      );
    });

    testWidgets('only an interactive card advertises the hover lift',
        (tester) async {
      await tester.pumpWidget(_host(const HairlineCard(child: Text('static'))));
      expect(find.byType(HoverLift), findsNothing);

      await tester.pumpWidget(_host(
        HairlineCard(onTap: () {}, child: const Text('tappable')),
      ));
      expect(find.byType(HoverLift), findsOneWidget);
    });
  });

  group('motion', () {
    testWidgets('FadeSlideIn starts transparent and settles fully opaque',
        (tester) async {
      await tester.pumpWidget(_host(const FadeSlideIn(child: Text('reveal'))));
      expect(_minOpacityOver(tester, 'reveal'), lessThan(1.0));
      await tester.pump(const Duration(milliseconds: 700));
      expect(_minOpacityOver(tester, 'reveal'), 1.0);
    });

    testWidgets('FadeSlideIn is instantaneous under reduced motion',
        (tester) async {
      await tester.pumpWidget(_host(
        const FadeSlideIn(child: Text('still')),
        reduceMotion: true,
      ));
      await tester.pump();
      expect(_minOpacityOver(tester, 'still'), 1.0);
    });

    testWidgets('PressableScale drops out entirely under reduced motion',
        (tester) async {
      await tester.pumpWidget(_host(
        PressableScale(child: const Text('press')),
        reduceMotion: true,
      ));
      expect(
        find.ancestor(
          of: find.text('press'),
          matching: find.byType(AnimatedScale),
        ),
        findsNothing,
      );
    });

    testWidgets('StaggeredReveal lays children down in order', (tester) async {
      await tester.pumpWidget(_host(const StaggeredReveal(
        children: <Widget>[Text('first'), Text('second')],
      )));
      // 40ms in: the first has begun, the second is still waiting its turn.
      await tester.pump(const Duration(milliseconds: 40));
      expect(
        _minOpacityOver(tester, 'first'),
        greaterThan(_minOpacityOver(tester, 'second')),
      );
      // The delayed start only fires here; its first tick lands on the next
      // frame, so the reveal needs one more pump to actually complete.
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 700));
      expect(_minOpacityOver(tester, 'second'), 1.0);
    });
  });

  group('mesh gradient', () {
    test('painter survives zero intensity and an empty canvas', () {
      final painter = MeshGradientPainter(
        progress: const AlwaysStoppedAnimation<double>(0.3),
        isDark: false,
        intensity: 0,
      );
      final recorder = PictureRecorder();
      final canvas = Canvas(recorder);
      // Neither of these should throw.
      painter.paint(canvas, const Size(240, 160));
      painter.paint(canvas, Size.zero);
    });

    test('painter repaints only when its inputs change', () {
      const animation = AlwaysStoppedAnimation<double>(0.3);
      final painter = MeshGradientPainter(
        progress: animation,
        isDark: false,
        intensity: 1,
      );
      expect(painter.shouldRepaint(painter), isFalse);
      expect(
        painter.shouldRepaint(
          MeshGradientPainter(
            progress: animation,
            isDark: true,
            intensity: 1,
          ),
        ),
        isTrue,
      );
    });

    testWidgets('MeshGradient renders into a bounded band', (tester) async {
      await tester.pumpWidget(_host(const SizedBox(
        width: 320,
        height: 180,
        child: MeshGradient(),
      )));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(CustomPaint), findsWidgets);
    });
  });
  group('FadeSlideIn settles within its own timeline', () {
    // Regression guard. The stagger delay used to be a wall-clock
    // Future.delayed that called forward() from inside the frame already being
    // advanced, so the controller restarted at zero and the child stayed fully
    // transparent. A running app repaints continuously and hid this, but any
    // single-frame advance rendered a blank hero - which is exactly what the
    // welcome screen did. Folding the delay into the timeline via Interval
    // makes one pump(delay + duration) land the child at full opacity.
    testWidgets('is fully visible after one pump covering delay + duration', (
      tester,
    ) async {
      await tester.pumpWidget(
        _host(
          const FadeSlideIn(
            delay: Duration(milliseconds: 260),
            child: Text('revealed'),
          ),
        ),
      );
      expect(
        _minOpacityOver(tester, 'revealed'),
        0,
        reason: 'should start hidden',
      );

      await tester.pump(const Duration(milliseconds: 900));
      expect(
        _minOpacityOver(tester, 'revealed'),
        1,
        reason: 'a single frame advance must complete the reveal',
      );
    });

    testWidgets('renders immediately under reduced motion', (tester) async {
      await tester.pumpWidget(
        _host(
          const FadeSlideIn(
            delay: Duration(milliseconds: 260),
            child: Text('revealed'),
          ),
          reduceMotion: true,
        ),
      );
      expect(_minOpacityOver(tester, 'revealed'), 1);
    });
  });

  group('button icons are wired', () {
    testWidgets('primary button renders its leading icon', (tester) async {
      await tester.pumpWidget(
        _host(
          PrimaryButton(
            label: 'Get Started',
            icon: Icons.arrow_forward,
            onPressed: () {},
          ),
        ),
      );
      // flutter_test does not load MaterialIcons, so the glyph paints as an
      // empty box in the screenshot harness. Asserting on the tree is the
      // portable way to prove the icon is genuinely attached to the button.
      expect(find.byIcon(Icons.arrow_forward), findsOneWidget);
      expect(find.text('Get Started'), findsOneWidget);
    });
  });
}

}