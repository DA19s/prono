import 'package:flutter/material.dart';
import '../models/leaderboard_entry.dart';
import '../services/leaderboard_service.dart';
import '../widgets/loading_widget.dart';
import '../widgets/empty_state.dart';
import '../theme/app_theme.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final _leaderboardService = LeaderboardService();
  List<LeaderboardEntry> _leaderboard = [];
  LeaderboardEntry? _myRank;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLeaderboard();
  }

  Future<void> _loadLeaderboard() async {
    setState(() => _isLoading = true);
    try {
      final leaderboard = await _leaderboardService.getLeaderboard();
      final myRank = await _leaderboardService.getMyRank();
      if (mounted) {
        setState(() {
          _leaderboard = leaderboard;
          _myRank = myRank;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Color _getRankColor(int rank) {
    if (rank == 1) return Colors.amber;
    if (rank == 2) return Colors.grey.shade400;
    if (rank == 3) return Colors.brown.shade300;
    return AppTheme.primaryColor;
  }

  IconData _getRankIcon(int rank) {
    if (rank == 1) return Icons.emoji_events;
    if (rank == 2) return Icons.military_tech;
    if (rank == 3) return Icons.workspace_premium;
    return Icons.person;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Classement'),
      ),
      body: _isLoading
          ? const LoadingWidget()
          : RefreshIndicator(
              onRefresh: _loadLeaderboard,
              child: Column(
                children: [
                  if (_myRank != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        border: Border(
                          bottom: BorderSide(color: Colors.grey.shade300),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: _getRankColor(_myRank!.rank),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _getRankIcon(_myRank!.rank),
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Votre position',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                                Text(
                                  '#${_myRank!.rank} - ${_myRank!.fullName}',
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '${_myRank!.totalPoints}',
                                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                      color: AppTheme.primaryColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                              Text(
                                'points',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  Expanded(
                    child: _leaderboard.isEmpty
                        ? EmptyState(
                            icon: Icons.leaderboard,
                            title: 'Aucun classement',
                            message: 'Le classement sera disponible une fois que les matchs commenceront',
                            action: ElevatedButton(
                              onPressed: _loadLeaderboard,
                              child: const Text('Actualiser'),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: _leaderboard.length,
                            itemBuilder: (context, index) {
                              final entry = _leaderboard[index];
                              final isMyRank = _myRank?.userId == entry.userId;

                              return Card(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 4,
                                ),
                                color: isMyRank
                                    ? AppTheme.primaryColor.withOpacity(0.05)
                                    : null,
                                child: ListTile(
                                  leading: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: _getRankColor(entry.rank),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: entry.rank <= 3
                                          ? Icon(
                                              _getRankIcon(entry.rank),
                                              color: Colors.white,
                                              size: 20,
                                            )
                                          : Text(
                                              '${entry.rank}',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                    ),
                                  ),
                                  title: Text(
                                    entry.fullName,
                                    style: TextStyle(
                                      fontWeight: isMyRank
                                          ? FontWeight.bold
                                          : FontWeight.normal,
                                    ),
                                  ),
                                  subtitle: Text(
                                    '${entry.predictionsCount} pronostic${entry.predictionsCount > 1 ? 's' : ''}',
                                  ),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        '${entry.totalPoints}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyLarge
                                            ?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryColor,
                                            ),
                                      ),
                                      Text(
                                        'pts',
                                        style: Theme.of(context).textTheme.bodySmall,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }
}

