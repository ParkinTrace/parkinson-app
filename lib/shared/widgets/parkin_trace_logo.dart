import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

/// Professional ParkinTrace logo — circular emblem with P + keyboard/waveform.
/// Minimal, geometric, scalable at 24px to 128px.
class ParkinTraceLogo extends StatelessWidget {
  final double size;
  final bool showWordmark;
  const ParkinTraceLogo({super.key, this.size = 48, this.showWordmark = false});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final ink = isDark ? AppColors.textLight : AppColors.ink;
    final quiet = isDark ? AppColors.mute : AppColors.body;

    final emblem = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[AppColors.brand, AppColors.brandDeep],
        ),
        // Hairline rim instead of a glow: the system allows no glows.
        border: Border.all(color: AppColors.onPrimary.withValues(alpha: 0.14)),
      ),
      child: CustomPaint(
        painter: _LogoPainter(),
        child: Center(
          child: Text(
            'P',
            style: TextStyle(
              color: AppColors.onPrimary,
              fontSize: size * 0.44,
              fontWeight: FontWeight.w600,
              height: 1,
              letterSpacing: -0.5,
            ),
          ),
        ),
      ),
    );

    if (!showWordmark) return emblem;

    // Flexible so a long tagline wraps inside the sidebar rather than
    // overflowing it.
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        emblem,
        SizedBox(width: size * 0.24),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(
                'ParkinTrace',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.headingSm.copyWith(
                  fontSize: (size * 0.34).clamp(14.0, 22.0),
                  color: ink,
                  letterSpacing: -0.6,
                ),
              ),
              Text(
                "Typing patterns for Parkinson's monitoring",
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.bodySm.copyWith(
                  fontSize: (size * 0.16).clamp(9.5, 13.0),
                  color: quiet,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Subtle Parkinson-related trace: a clean, low-amplitude waveform integrated with the P stem
    // Minimal, geometric, not cartoonish — hints at motor monitoring, not diagnosis
    final tracePaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final center = Offset(size.width / 2, size.height / 2);
    // Delicate horizontal trace at lower third — 3 gentle oscillations (tremor-inspired but abstract)
    final y = center.dy + size.height * 0.18;
    final path = Path();
    final startX = center.dx - size.width * 0.28;
    final endX = center.dx + size.width * 0.28;
    path.moveTo(startX, y);
    // 3 smooth waves, low amplitude, research-grade restraint
    final w = (endX - startX) / 3;
    for (var i = 0; i < 3; i++) {
      final x1 = startX + w * i + w * 0.25;
      final x2 = startX + w * i + w * 0.5;
      final x3 = startX + w * i + w * 0.75;
      final x4 = startX + w * (i + 1);
      // subtle amplitude variation to feel organic, not mechanical
      final amp = (i == 1) ? size.height * 0.028 : size.height * 0.018;
      path.cubicTo(x1, y - amp, x2, y + amp, x3, y - amp * 0.5);
      path.lineTo(x4, y);
    }
    canvas.drawPath(path, tracePaint);

    // Tiny keyboard hint: two minimal dots at baseline, very subtle
    final dotPaint = Paint()..color = Colors.white.withValues(alpha: 0.55);
    for (var i = -1; i <= 1; i += 2) {
      canvas.drawCircle(Offset(center.dx + i * size.width * 0.09, y + size.height * 0.09), size.width * 0.012, dotPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
