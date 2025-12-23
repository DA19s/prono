import 'package:flutter/material.dart';
import '../models/match.dart';
import '../services/match_service.dart';
import '../services/prediction_service.dart';
import '../services/auth_service.dart';
import '../widgets/match_card.dart';
import '../widgets/loading_widget.dart';
import '../widgets/empty_state.dart';
import 'match_detail_screen.dart';
import 'leaderboard_screen.dart';
import 'profile_screen.dart';
import 'bracket_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _matchService = MatchService();
  final _predictionService = PredictionService();
  final _authService = AuthService();
  List<Match> _upcomingMatches = [];
  List<Match> _finishedMatches = [];
  Map<String, int> _matchPoints = {}; // Map matchId -> pointsEarned
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadMatches();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadMatches() async {
    setState(() => _isLoading = true);
    try {
      print('🔄 Chargement des matchs...');
      
      // Recharger les données utilisateur pour avoir les points à jour
      await _authService.checkAuth();
      
      final upcoming = await _matchService.getUpcomingMatches();
      final finished = await _matchService.getFinishedMatches();
      print('✅ Matchs chargés: ${upcoming.length} à venir, ${finished.length} terminés');
      
      // Charger les points pour les matchs terminés
      final matchPoints = <String, int>{};
      for (final match in finished) {
        try {
          final prediction = await _predictionService.getMyMatchPrediction(match.id);
          if (prediction != null && prediction.pointsEarned > 0) {
            matchPoints[match.id] = prediction.pointsEarned;
          }
        } catch (e) {
          // Ignorer silencieusement - pas de pronostic ou erreur
          // Le 404 est géré dans le service
        }
      }
      
      if (mounted) {
        setState(() {
          _upcomingMatches = upcoming;
          _finishedMatches = finished;
          _matchPoints = matchPoints;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ Erreur lors du chargement des matchs: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du chargement des matchs: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = _authService.currentUser;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Pronocan',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.25),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.star,
                    size: 16,
                    color: Colors.white,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${user?.totalPoints ?? 0}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMatches,
          ),
          IconButton(
            icon: const Icon(Icons.sports_soccer),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BracketScreen()),
              );
            },
            tooltip: 'Bracket',
          ),
          IconButton(
            icon: const Icon(Icons.leaderboard),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          labelStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
          tabs: const [
            Tab(text: 'À venir'),
            Tab(text: 'Terminés'),
          ],
        ),
      ),
      body: _isLoading
          ? const LoadingWidget()
          : Column(
              children: [
                // Bouton pour accéder au classement
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.all(16),
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
                      );
                    },
                    icon: const Icon(Icons.leaderboard),
                    label: const Text('Voir le classement'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _loadMatches,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildMatchesList(_upcomingMatches, 'Aucun match à venir'),
                        _buildMatchesList(_finishedMatches, 'Aucun match terminé'),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildMatchesList(List<Match> matches, String emptyMessage) {
    if (matches.isEmpty) {
      return EmptyState(
        icon: Icons.sports_soccer,
        title: 'Aucun match',
        message: emptyMessage,
        action: ElevatedButton(
          onPressed: _loadMatches,
          child: const Text('Actualiser'),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: matches.length,
      itemBuilder: (context, index) {
        final match = matches[index];
        return MatchCard(
          match: match,
          predictionsCount: match.predictionsCount,
          pointsEarned: _matchPoints[match.id],
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => MatchDetailScreen(match: match),
              ),
            );
          },
        );
      },
    );
  }
}

