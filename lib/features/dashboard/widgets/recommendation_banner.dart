import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/hairline_card.dart';

/// Non-alarming recommendation band (Stage 9.4) — appears only for
/// watch/attention results, calm language, no red for a "watch".
///
/// Status is carried by the hairline edge and a 5% wash, not a filled block:
/// a health screen should never shout.
class RecommendationBanner extends StatelessWidget {
  final String status;
  const RecommendationBanner({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    if (status == 'normal' || status == 'building') {
      return const SizedBox.shrink();
    }
    final isAttention = status == 'attention';
    final ink = Theme.of(context).textTheme.titleSmall?.color;
    final quiet = Theme.of(context).textTheme.bodySmall?.color;
    return HairlineCard(
      tint: isAttention ? AppColors.warning : AppColors.link,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(
            isAttention
                ? Icons.medical_information_outlined
                : Icons.info_outline,
            size: 18,
            color: isAttention ? AppColors.warning : AppColors.link,
          ),
          const SizedBox(width: AppSpacing.smMd),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  isAttention
                      ? 'Consider discussing this with a clinician'
                      : 'Keep typing regularly — we are tracking changes',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'This is not a diagnosis. Results are for information only.',
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: quiet ?? ink),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
