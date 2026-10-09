import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:parkinson_app/app.dart';

void main() {
  testWidgets('App boots to ParkinTrace BEGIN when signed out',
      (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ParkinsonApp()));

    // The launch screen hosts the ambient mesh gradient, which repeats forever,
    // so pumpAndSettle would never settle. Pump fixed frames instead.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('ParkinTrace'), findsWidgets);
    expect(find.text('BEGIN'), findsOneWidget);
  });
}
