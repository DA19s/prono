import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/match.dart';
import '../theme/app_theme.dart';
import '../utils/logo_url.dart';

class MatchCard extends StatelessWidget {
  final Match match;
  final VoidCallback? onTap;
  final int? predictionsCount;
  final int? pointsEarned; // Points gagnés pour ce match (si terminé)

  const MatchCard({
    super.key,
    required this.match,
    this.onTap,
    this.predictionsCount,
    this.pointsEarned,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('dd MMM yyyy', 'fr_FR');
    final timeFormat = DateFormat('HH:mm', 'fr_FR');

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // En-tête avec date et statut
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: 16,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        match.date != null ? dateFormat.format(match.date!) : 'Date à définir',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (match.date != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          timeFormat.format(match.date!),
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ],
                  ),
                  _buildStatusChip(context),
                ],
              ),
              const SizedBox(height: 16),
              // Équipes et scores
              Row(
                children: [
                  Expanded(
                    child: _buildTeamSection(
                      context,
                      match.homeTeam,
                      match.homeScore,
                      true,
                    ),
                  ),
                  const SizedBox(width: 16),
                  _buildScoreSection(context),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTeamSection(
                      context,
                      match.awayTeam,
                      match.awayScore,
                      false,
                    ),
                  ),
                ],
              ),
              if (match.venue != null || match.city != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.location_on,
                      size: 16,
                      color: theme.colorScheme.secondary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${match.venue ?? ''}${match.city != null ? ', ${match.city}' : ''}',
                        style: theme.textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
              if (predictionsCount != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.people,
                      size: 16,
                      color: theme.colorScheme.secondary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$predictionsCount pronostic${predictionsCount! > 1 ? 's' : ''}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
              if (match.isFinished && pointsEarned != null && pointsEarned! > 0) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.star,
                        size: 16,
                        color: AppTheme.secondaryColor,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '$pointsEarned point${pointsEarned! > 1 ? 's' : ''} gagné${pointsEarned! > 1 ? 's' : ''}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppTheme.secondaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (match.canPredict) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.edit,
                        size: 14,
                        color: AppTheme.primaryColor,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Pronostics ouverts',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(BuildContext context) {
    Color color;
    String text;
    IconData icon;

    switch (match.status) {
      case MatchStatus.live:
        color = AppTheme.liveColor;
        text = 'EN DIRECT';
        icon = Icons.radio_button_checked;
        break;
      case MatchStatus.finished:
        color = AppTheme.finishedColor;
        text = 'TERMINÉ';
        icon = Icons.check_circle;
        break;
      default:
        color = AppTheme.scheduledColor;
        text = 'PROGRAMMÉ';
        icon = Icons.schedule;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamSection(
    BuildContext context,
    team,
    int? score,
    bool isHome,
  ) {
    if (team == null) {
      return Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid),
            ),
            child: const Icon(Icons.help_outline, color: Colors.grey),
          ),
          const SizedBox(height: 8),
          Text(
            'À déterminer',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      );
    }

    return Column(
      children: [
        // Normalize logo path to full URL (handles relative paths like /uploads/flags/...)
        if (team.logo != null)
          Builder(builder: (context) {
            final logoUrl = getFullLogoUrl(team.logo);
            if (logoUrl.isNotEmpty) {
              return CachedNetworkImage(
                imageUrl: logoUrl,
                width: 48,
                height: 48,
                placeholder: (context, url) => Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.sports_soccer),
                ),
                errorWidget: (context, url, error) => Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.sports_soccer),
                ),
              );
            } else {
              return Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.sports_soccer),
              );
            }
          })
        else
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.sports_soccer),
          ),
        const SizedBox(height: 8),
        Text(
          team.name,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildScoreSection(BuildContext context) {
    if (match.isFinished && match.homeScore != null && match.awayScore != null) {
      return Column(
        children: [
          Text(
            '${match.homeScore} - ${match.awayScore}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
          ),
          if (match.homeScoreHalfTime != null && match.awayScoreHalfTime != null)
            Text(
              '(${match.homeScoreHalfTime} - ${match.awayScoreHalfTime})',
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      );
    } else if (match.isLive && match.homeScore != null && match.awayScore != null) {
      return Column(
        children: [
          Text(
            '${match.homeScore} - ${match.awayScore}',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.liveColor,
                ),
          ),
        ],
      );
    } else {
      return Text(
        'VS',
        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
      );
    }
  }
}


