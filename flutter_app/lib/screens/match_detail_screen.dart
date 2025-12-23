import 'package:flutter/material.dart';
import '../models/match.dart';
import '../models/prediction.dart';
import '../services/prediction_service.dart';
import '../widgets/match_card.dart';
import '../theme/app_theme.dart';

class MatchDetailScreen extends StatefulWidget {
  final Match match;

  const MatchDetailScreen({super.key, required this.match});

  @override
  State<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends State<MatchDetailScreen> {
  final _predictionService = PredictionService();
  Prediction? _myPrediction;
  bool _isLoading = false;
  bool _isSubmitting = false;

  final _homeScoreController = TextEditingController();
  final _awayScoreController = TextEditingController();
  final _homePenaltiesController = TextEditingController();
  final _awayPenaltiesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadMyPrediction();
  }

  @override
  void dispose() {
    _homeScoreController.dispose();
    _awayScoreController.dispose();
    _homePenaltiesController.dispose();
    _awayPenaltiesController.dispose();
    super.dispose();
  }

  Future<void> _loadMyPrediction() async {
    setState(() => _isLoading = true);
    try {
      final prediction = await _predictionService.getMyMatchPrediction(widget.match.id);
      if (mounted) {
        setState(() {
          _myPrediction = prediction;
          if (prediction != null) {
            _homeScoreController.text = prediction.predictedHomeScore.toString();
            _awayScoreController.text = prediction.predictedAwayScore.toString();
            if (prediction.predictedHomePenalties != null) {
              _homePenaltiesController.text = prediction.predictedHomePenalties.toString();
            }
            if (prediction.predictedAwayPenalties != null) {
              _awayPenaltiesController.text = prediction.predictedAwayPenalties.toString();
            }
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _submitPrediction() async {
    final homeScore = int.tryParse(_homeScoreController.text);
    final awayScore = int.tryParse(_awayScoreController.text);

    if (homeScore == null || awayScore == null || homeScore < 0 || awayScore < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez entrer des scores valides'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    // Si match nul, vérifier les tirs au but
    final isDraw = homeScore == awayScore;
    int? homePenalties;
    int? awayPenalties;
    
    if (isDraw) {
      homePenalties = int.tryParse(_homePenaltiesController.text);
      awayPenalties = int.tryParse(_awayPenaltiesController.text);

      if (homePenalties == null || awayPenalties == null || homePenalties < 0 || awayPenalties < 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('En cas de match nul, veuillez entrer les scores des tirs au but'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      if (homePenalties == awayPenalties) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Les scores des tirs au but ne peuvent pas être égaux'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }
    }

    if (!widget.match.canPredict) {
      final now = DateTime.now();
      final matchDate = widget.match.date;
      
      String message = 'Les pronostics sont fermés pour ce match.\n';
      if (matchDate != null) {
        final hours72Before = matchDate.subtract(const Duration(hours: 72));
        message += 'Match: ${matchDate.toString()}\n';
        message += 'Maintenant: ${now.toString()}\n';
        message += '72h avant: ${hours72Before.toString()}\n';
      } else {
        message += 'Le match n\'a pas encore de date programmée.\n';
      }
      message += 'isPronosticOpen: ${widget.match.isPronosticOpen}';
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: AppTheme.errorColor,
          duration: const Duration(seconds: 5),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final prediction = await _predictionService.createOrUpdatePrediction(
        matchId: widget.match.id,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        predictedHomePenalties: homePenalties,
        predictedAwayPenalties: awayPenalties,
      );

      if (prediction != null && mounted) {
        setState(() {
          _myPrediction = prediction;
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pronostic enregistré avec succès'),
            backgroundColor: AppTheme.secondaryColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString()}'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _deletePrediction() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le pronostic'),
        content: const Text('Êtes-vous sûr de vouloir supprimer votre pronostic ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer', style: TextStyle(color: AppTheme.errorColor)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isSubmitting = true);
      try {
        final success = await _predictionService.deletePrediction(widget.match.id);
        if (success && mounted) {
          setState(() {
            _myPrediction = null;
            _homeScoreController.clear();
            _awayScoreController.clear();
            _isSubmitting = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Pronostic supprimé'),
              backgroundColor: AppTheme.secondaryColor,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isSubmitting = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails du match'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  MatchCard(match: widget.match),
                  const SizedBox(height: 16),
                  // Afficher un message si les pronostics ne sont pas disponibles
                  if (!widget.match.canPredict && !widget.match.isFinished) ...[
                    Card(
                      margin: const EdgeInsets.all(16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          children: [
                            Icon(
                              Icons.lock_outline,
                              size: 48,
                              color: Colors.grey,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Les pronostics ne sont pas encore disponibles',
                              style: Theme.of(context).textTheme.bodyLarge,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Vous pourrez pronostiquer dans les 72h avant le match',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: Colors.grey,
                                  ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  if (widget.match.canPredict) ...[
                    Card(
                      margin: const EdgeInsets.all(16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Mon pronostic',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _homeScoreController,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      labelText: widget.match.homeTeam?.name ?? 'Équipe domicile',
                                      border: const OutlineInputBorder(),
                                    ),
                                    onChanged: (value) {
                                      // Rafraîchir l'interface si le score change
                                      setState(() {});
                                    },
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Text(
                                    '-',
                                    style: TextStyle(fontSize: 24),
                                  ),
                                ),
                                Expanded(
                                  child: TextField(
                                    controller: _awayScoreController,
                                    keyboardType: TextInputType.number,
                                    decoration: InputDecoration(
                                      labelText: widget.match.awayTeam?.name ?? 'Équipe extérieure',
                                      border: const OutlineInputBorder(),
                                    ),
                                    onChanged: (value) {
                                      // Rafraîchir l'interface si le score change
                                      setState(() {});
                                    },
                                  ),
                                ),
                              ],
                            ),
                            // Afficher les champs de tirs au but si le score est nul
                            if (_homeScoreController.text.isNotEmpty && 
                                _awayScoreController.text.isNotEmpty) ...[
                              Builder(
                                builder: (context) {
                                  final homeScore = int.tryParse(_homeScoreController.text) ?? 0;
                                  final awayScore = int.tryParse(_awayScoreController.text) ?? 0;
                                  if (homeScore == awayScore) {
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 16),
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Colors.orange.shade50,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.orange.shade200),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(Icons.info_outline, color: Colors.orange.shade700, size: 20),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  'Match nul détecté. Entrez les scores des tirs au but :',
                                                  style: TextStyle(
                                                    color: Colors.orange.shade900,
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: TextField(
                                                controller: _homePenaltiesController,
                                                keyboardType: TextInputType.number,
                                                decoration: InputDecoration(
                                                  labelText: 'Tirs au but - ${widget.match.homeTeam?.name ?? 'Équipe domicile'}',
                                                  border: const OutlineInputBorder(),
                                                ),
                                              ),
                                            ),
                                            const Padding(
                                              padding: EdgeInsets.all(16),
                                              child: Text(
                                                '-',
                                                style: TextStyle(fontSize: 24),
                                              ),
                                            ),
                                            Expanded(
                                              child: TextField(
                                                controller: _awayPenaltiesController,
                                                keyboardType: TextInputType.number,
                                                decoration: InputDecoration(
                                                  labelText: 'Tirs au but - ${widget.match.awayTeam?.name ?? 'Équipe extérieure'}',
                                                  border: const OutlineInputBorder(),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if (_homePenaltiesController.text.isNotEmpty && 
                                            _awayPenaltiesController.text.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          Builder(
                                            builder: (context) {
                                              final homePen = int.tryParse(_homePenaltiesController.text) ?? 0;
                                              final awayPen = int.tryParse(_awayPenaltiesController.text) ?? 0;
                                              String winner = '';
                                              if (homePen > awayPen) {
                                                winner = widget.match.homeTeam?.name ?? 'Équipe domicile';
                                              } else if (awayPen > homePen) {
                                                winner = widget.match.awayTeam?.name ?? 'Équipe extérieure';
                                              }
                                              if (winner.isNotEmpty) {
                                                return Container(
                                                  padding: const EdgeInsets.all(8),
                                                  decoration: BoxDecoration(
                                                    color: Colors.grey.shade100,
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: Text(
                                                    'Vainqueur: $winner',
                                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                                  ),
                                                );
                                              }
                                              return const SizedBox.shrink();
                                            },
                                          ),
                                        ],
                                      ],
                                    );
                                  }
                                  return const SizedBox.shrink();
                                },
                              ),
                            ],
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: _isSubmitting ? null : _submitPrediction,
                                    child: _isSubmitting
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                            ),
                                          )
                                        : Text(_myPrediction == null ? 'Enregistrer' : 'Modifier'),
                                  ),
                                ),
                                if (_myPrediction != null) ...[
                                  const SizedBox(width: 8),
                                  IconButton(
                                    onPressed: _isSubmitting ? null : _deletePrediction,
                                    icon: const Icon(Icons.delete),
                                    color: AppTheme.errorColor,
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ] else if (_myPrediction != null) ...[
                    Card(
                      margin: const EdgeInsets.all(16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Mon pronostic',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  '${_myPrediction!.predictedHomeScore} - ${_myPrediction!.predictedAwayScore}',
                                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                            if (widget.match.isFinished && _myPrediction!.pointsEarned > 0) ...[
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppTheme.secondaryColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.star,
                                      color: AppTheme.secondaryColor,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '${_myPrediction!.pointsEarned} point${_myPrediction!.pointsEarned > 1 ? 's' : ''} gagné${_myPrediction!.pointsEarned > 1 ? 's' : ''}',
                                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                            color: AppTheme.secondaryColor,
                                            fontWeight: FontWeight.bold,
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
                  ],
                ],
              ),
            ),
    );
  }
}


