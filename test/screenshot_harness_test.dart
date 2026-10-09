// Screenshot harness: renders real screens to PNGs so the design can actually
// be looked at, since a GUI cannot be opened here.
//
// Output goes to build/screenshots/ (gitignored build output, not a repo source
// artifact). Run with: flutter test test/screenshot_harness_test.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:parkinson_app/core/theme/app_colors.dart';
import 'package:parkinson_app/core/theme/app_spacing.dart';
import 'package:parkinson_app/core/theme/app_text_styles.dart';
import 'package:parkinson_app/core/theme/app_theme.dart';
import 'package:parkinson_app/features/auth/screens/login_screen.dart';
import 'package:parkinson_app/features/onboarding/screens/welcome_screen.dart';
import 'package:parkinson_app/features/splash/screens/splash_screen.dart';
import 'package:parkinson_app/shared/widgets/design_system.dart';
import 'package:parkinson_app/shared/widgets/empty_state.dart';
import 'package:parkinson_app/shared/widgets/hairline_card.dart';
import 'package:parkinson_app/shared/widgets/loading_shimmer.dart';
import 'package:parkinson_app/shared/widgets/motion.dart';

const String _outDir = 'build/screenshots';

void _viewport(WidgetTester tester, double width, double height) {
  tester.view.physicalSize = Size(width, height);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

Future<void> _shoot(WidgetTester tester, GlobalKey key, String name) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(find.byKey(key));

  // toImage()/toByteData() complete on the real event loop, so they have to run
  // outside the fake-async zone that testWidgets installs. Awaiting them
  // directly makes the future never resolve: the run hangs rather than fails.
  await tester.runAsync(() async {
    final ui.Image image = await boundary.toImage(pixelRatio: 1.0);
    final ByteData? data = await image.toByteData(
      format: ui.ImageByteFormat.png,
    );
    image.dispose();
    final file = File('$_outDir/$name.png');
    file.parent.createSync(recursive: true);
    file.writeAsBytesSync(data!.buffer.asUint8List());
  });
}

Widget _frame(Widget child, {bool dark = false}) => MaterialApp(
  debugShowCheckedModeBanner: false,
  theme: dark ? AppTheme.darkTheme : AppTheme.lightTheme,
  home: child,
);

/// Renders and exports one screen.
///
/// Never uses pumpAndSettle: the mesh gradient and shimmer loop forever.
Future<void> _capture(
  WidgetTester tester, {
  required GlobalKey key,
  required String name,
  required Widget app,
}) async {
  await tester.pumpWidget(RepaintBoundary(key: key, child: app));
  await tester.pump();
  // Long enough to complete the longest stagger (FadeSlideIn delay + reveal),
  // so the shots show the settled state rather than a mid-reveal frame.
  await tester.pump(const Duration(milliseconds: 1400));
  await _shoot(tester, key, name);
}

class _Gallery extends StatelessWidget {
  const _Gallery();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quiet = theme.textTheme.bodySmall?.color;
    final ink = theme.textTheme.titleSmall?.color;
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            MonoEyebrow('Component gallery', color: quiet),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Typing patterns over time',
              style: AppTextStyles.displayXl.copyWith(
                fontSize: 40,
                letterSpacing: -2.0,
                color: ink,
              ),
            ),
            const SizedBox(height: AppSpacing.smMd),
            Text(
              'Body copy sits on the stepped grey ladder; headings carry tight '
              'negative tracking. Cards are a 1px hairline before any shadow.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: <Widget>[
                Expanded(
                  child: PrimaryButton(
                    label: 'Start Deploying',
                    onPressed: () {},
                  ),
                ),
                const SizedBox(width: AppSpacing.smMd),
                Expanded(
                  child: SecondaryButton(label: 'Get a Demo', onPressed: () {}),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.smMd),
            Row(
              children: <Widget>[
                AppSquareButton(
                  label: 'Sign Up',
                  primary: true,
                  onPressed: () {},
                ),
                const SizedBox(width: AppSpacing.sm),
                AppSquareButton(label: 'Log In', onPressed: () {}),
                const SizedBox(width: AppSpacing.sm),
                AppSquareButton(
                  label: 'Ask AI',
                  icon: Icons.auto_awesome_outlined,
                  onPressed: () {},
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            const SectionHeader(
              eyebrow: 'Monitoring',
              title: 'Layer 2 · Personal Monitoring',
              subtitle: 'Session 12 of 14 collected',
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Expanded(
                  child: ProgressCard(
                    title: 'Baseline progress',
                    progressText: '12 / 14',
                    fraction: 0.86,
                    caption: 'Two more sessions to establish a baseline.',
                  ),
                ),
                const SizedBox(width: AppSpacing.smMd),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: <Widget>[
                          StatusBadge(status: 'normal'),
                          StatusBadge(status: 'watch'),
                          StatusBadge(status: 'attention'),
                          StatusBadge(status: 'building'),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.smMd),
                      const HairlineCard(
                        child: Text(
                          'Flat hairline card: 1px edge, whisper shadow, '
                          'no heavy elevation.',
                        ),
                      ),
                      const SizedBox(height: AppSpacing.smMd),
                      const HairlineCard(
                        tint: AppColors.warning,
                        child: Text(
                          'Tinted card: the accent edges the hairline and lays '
                          'a 5% wash. Never a colour fill.',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.smMd),
            EmptyState(
              icon: Icons.insights_outlined,
              title: 'No sessions yet',
              subtitle: 'Your first typing session will appear here.',
              actionLabel: 'Start typing session',
              onAction: () {},
            ),
            const SizedBox(height: AppSpacing.md),
            const LoadingShimmer(height: 56),
            const SizedBox(height: AppSpacing.smMd),
            const FadeSlideIn(child: Text('FadeSlideIn settles here.')),
          ],
        ),
      ),
    );
  }
}

void main() {
  GoogleFonts.config.allowRuntimeFetching = false;

  setUpAll(() async {
    // Fonts are bundled in assets/fonts, so google_fonts resolves them from the
    // asset manifest on the real production path and never touches the network.
    //
    // Guarding the manifest here is deliberate. Without it a bundling
    // regression degrades silently: every glyph drops to the test placeholder
    // font and these screenshots become meaningless rather than failing. That
    // is exactly how the first version of this harness misled us.
    GoogleFonts.config.allowRuntimeFetching = false;

    final AssetManifest manifest = await AssetManifest.loadFromAssetBundle(
      rootBundle,
    );
    final List<String> assets = manifest.listAssets();
    for (final String expected in <String>[
      'Inter-Regular.ttf',
      'Inter-Medium.ttf',
      'Inter-SemiBold.ttf',
      'JetBrainsMono-Regular.ttf',
      'JetBrainsMono-Medium.ttf',
      'JetBrainsMono-SemiBold.ttf',
    ]) {
      expect(
        assets.any((String asset) => asset.endsWith(expected)),
        isTrue,
        reason:
            'Missing bundled font $expected. Typography would silently fall '
            'back to a placeholder face and the screenshots below would not '
            'reflect the design.',
      );
    }
  });

  testWidgets('welcome hero, desktop', (tester) async {
    _viewport(tester, 1280, 900);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '01_welcome_desktop',
      app: _frame(ProviderScope(child: const WelcomeScreen())),
    );
  });

  testWidgets('welcome hero, mobile', (tester) async {
    _viewport(tester, 414, 880);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '02_welcome_mobile',
      app: _frame(ProviderScope(child: const WelcomeScreen())),
    );
  });

  testWidgets('launch screen', (tester) async {
    _viewport(tester, 414, 880);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '03_splash',
      app: _frame(ProviderScope(child: const SplashScreen())),
    );
  });

  testWidgets('sign in', (tester) async {
    _viewport(tester, 414, 880);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '04_login',
      app: _frame(ProviderScope(child: const LoginScreen())),
    );
  });

  testWidgets('component gallery, light', (tester) async {
    _viewport(tester, 1180, 1560);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '05_gallery_light',
      app: _frame(const _Gallery()),
    );
  });

  testWidgets('component gallery, dark', (tester) async {
    _viewport(tester, 1180, 1560);
    await _capture(
      tester,
      key: GlobalKey(),
      name: '06_gallery_dark',
      app: _frame(const _Gallery(), dark: true),
    );
  });
}
