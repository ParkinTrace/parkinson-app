import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_motion.dart';
import 'sidebar.dart';

/// Adaptive shell: sidebar on wide viewports, bottom nav on narrow ones.
///
/// Tab switches cross-fade rather than cutting. The fade animates only the
/// shell's opacity - it never re-instantiates the navigation shell, so branch
/// state and the router's internal navigator keys stay intact.
class AppShell extends StatefulWidget {
  final StatefulNavigationShell navigationShell;
  const AppShell({super.key, required this.navigationShell});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fade;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(
      vsync: this,
      duration: AppMotion.fast,
      value: 1,
    );
  }

  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    final changed = oldWidget.navigationShell.currentIndex !=
        widget.navigationShell.currentIndex;
    if (changed && !AppMotion.reduced(context)) {
      _fade.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.of(context).size.width >= 900;
    // Settles from 0.86 to 1: enough to register as a change, never a flash.
    final opacity = Tween<double>(begin: 0.86, end: 1)
        .animate(CurvedAnimation(parent: _fade, curve: AppMotion.standard));

    if (wide) {
      return Scaffold(
        body: Row(
          children: <Widget>[
            AppSidebar(navigationShell: widget.navigationShell),
            Expanded(
              child: FadeTransition(
                opacity: opacity,
                child: widget.navigationShell,
              ),
            ),
          ],
        ),
      );
    }
    return Scaffold(
      body: FadeTransition(opacity: opacity, child: widget.navigationShell),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: Theme.of(context).dividerColor),
          ),
        ),
        child: NavigationBar(
          selectedIndex: widget.navigationShell.currentIndex,
          onDestinationSelected: (i) => widget.navigationShell.goBranch(
            i,
            initialLocation: i == widget.navigationShell.currentIndex,
          ),
          destinations: const <NavigationDestination>[
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.keyboard_outlined),
              selectedIcon: Icon(Icons.keyboard),
              label: 'Typing',
            ),
            NavigationDestination(
              icon: Icon(Icons.insights_outlined),
              selectedIcon: Icon(Icons.insights),
              label: 'Insights',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
