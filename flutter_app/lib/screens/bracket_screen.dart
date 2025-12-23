import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/match.dart';
import '../models/team.dart';
import '../services/match_service.dart';
import '../widgets/loading_widget.dart';
import 'match_detail_screen.dart';
import '../theme/app_theme.dart';

class BracketScreen extends StatefulWidget {
  const BracketScreen({super.key});

  @override
  State<BracketScreen> createState() => _BracketScreenState();
}

class _BracketScreenState extends State<BracketScreen> {
  final _matchService = MatchService();
  List<Match> _bracketMatches = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadBracketMatches();
  }

  Future<void> _loadBracketMatches() async {
    setState(() => _isLoading = true);
    try {
      final matches = await _matchService.getBracketMatches();
      if (mounted) {
        setState(() {
          _bracketMatches = matches;
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ Erreur lors du chargement du bracket: $e');
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du chargement du bracket: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getTeamLogoUrl(Team? team) {
    if (team == null || team.logo == null || team.logo!.isEmpty) return '';
    final logo = team.logo!;
    if (logo.startsWith('http')) return logo;
    const baseUrl = 'http://localhost:3000';
    return '$baseUrl${logo.startsWith('/') ? logo : '/' + logo}';
  }

  Team? _getWinner(Match match) {
    if (match.status != MatchStatus.finished || 
        match.homeScore == null || 
        match.awayScore == null) {
      return null;
    }
    if (match.homeScore! > match.awayScore!) return match.homeTeam;
    if (match.awayScore! > match.homeScore!) return match.awayTeam;
    return null;
  }

  Widget _buildMatchBox(Match? match, {double? width, double? height}) {
    final boxWidth = width ?? 60;
    final boxHeight = height ?? 45;
    
    if (match == null) {
      return Container(
        width: boxWidth,
        height: boxHeight,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Center(
          child: Text(
            'À venir',
            style: TextStyle(fontSize: 8, color: Colors.grey[600]),
          ),
        ),
      );
    }

    final hasBothTeams = match.homeTeam != null && match.awayTeam != null;
    final isFinished = match.status == MatchStatus.finished;
    final isScheduled = match.status == MatchStatus.scheduled && hasBothTeams && match.date != null;
    final canClick = isScheduled && !isFinished;

    final winner = _getWinner(match);
    final homeLogo = _getTeamLogoUrl(match.homeTeam);
    final awayLogo = _getTeamLogoUrl(match.awayTeam);

    return GestureDetector(
      onTap: canClick
          ? () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => MatchDetailScreen(match: match),
                ),
              );
            }
          : null,
      child: Container(
        width: boxWidth,
        height: boxHeight,
        decoration: BoxDecoration(
          color: isFinished ? Colors.green[50] : Colors.white,
          border: Border.all(
            color: canClick
                ? AppTheme.primaryColor
                : isFinished
                    ? Colors.green[300]!
                    : Colors.grey[300]!,
            width: canClick ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Column(
          children: [
            // Équipe 1 (en haut)
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.grey[300]!, width: 0.5),
                  ),
                  color: winner?.id == match.homeTeam?.id ? Colors.green[100] : null,
                ),
                child: match.homeTeam != null
                    ? (homeLogo.isNotEmpty
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                            child: Transform.scale(
                              scale: 0.85,
                              child: CachedNetworkImage(
                                imageUrl: homeLogo,
                                fit: BoxFit.contain,
                                width: double.infinity,
                                height: double.infinity,
                                placeholder: (context, url) => Container(
                                  color: Colors.grey[200],
                                  child: Center(
                                    child: Text(
                                      match.homeTeam!.name,
                                      style: const TextStyle(fontSize: 6),
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                              errorWidget: (context, url, error) => Container(
                                color: Colors.grey[200],
                                child: Center(
                                  child: Text(
                                    match.homeTeam!.name,
                                    style: const TextStyle(fontSize: 6),
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          )
                        : Container(
                            color: Colors.grey[200],
                            child: Center(
                              child: Text(
                                match.homeTeam!.name,
                                style: const TextStyle(fontSize: 7),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ))
                    : Container(
                        color: Colors.grey[100],
                        child: const Center(
                          child: Text(
                            'À déterminer',
                            style: TextStyle(fontSize: 6, color: Colors.grey),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
              ),
            ),
            // Score si terminé
            if (isFinished && match.homeScore != null && match.awayScore != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 1),
                color: Colors.white.withOpacity(0.9),
                child: Text(
                  '${match.homeScore} - ${match.awayScore}',
                  style: const TextStyle(fontSize: 7, fontWeight: FontWeight.bold),
                ),
              ),
            // Équipe 2 (en bas)
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: winner?.id == match.awayTeam?.id ? Colors.green[100] : null,
                ),
                child: match.awayTeam != null
                    ? (awayLogo.isNotEmpty
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(4)),
                            child: Transform.scale(
                              scale: 0.85,
                              child: CachedNetworkImage(
                                imageUrl: awayLogo,
                                fit: BoxFit.contain,
                                width: double.infinity,
                                height: double.infinity,
                                placeholder: (context, url) => Container(
                                  color: Colors.grey[200],
                                  child: Center(
                                    child: Text(
                                      match.awayTeam!.name,
                                      style: const TextStyle(fontSize: 6),
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  color: Colors.grey[200],
                                  child: Center(
                                    child: Text(
                                      match.awayTeam!.name,
                                      style: const TextStyle(fontSize: 6),
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          )
                        : Container(
                            color: Colors.grey[200],
                            child: Center(
                              child: Text(
                                match.awayTeam!.name,
                                style: const TextStyle(fontSize: 7),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ))
                    : Container(
                        color: Colors.grey[100],
                        child: const Center(
                          child: Text(
                            'À déterminer',
                            style: TextStyle(fontSize: 6, color: Colors.grey),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Bracket CAN'),
          backgroundColor: AppTheme.primaryColor,
        ),
        body: const LoadingWidget(),
      );
    }

    // Organiser les matchs par phase
    final roundOf16 = _bracketMatches
        .where((m) => m.bracketRound == 'ROUND_OF_16')
        .toList()
      ..sort((a, b) => (a.bracketPosition ?? 0).compareTo(b.bracketPosition ?? 0));

    final quarterFinals = _bracketMatches
        .where((m) => m.bracketRound == 'QUARTER_FINAL')
        .toList()
      ..sort((a, b) => (a.bracketPosition ?? 0).compareTo(b.bracketPosition ?? 0));

    final semiFinals = _bracketMatches
        .where((m) => m.bracketRound == 'SEMI_FINAL')
        .toList()
      ..sort((a, b) => (a.bracketPosition ?? 0).compareTo(b.bracketPosition ?? 0));

    final finalMatches = _bracketMatches.where((m) => m.bracketRound == 'FINAL').toList();
    final finalMatch = finalMatches.isNotEmpty ? finalMatches.first : null;

    // Séparer les matchs gauche/droite
    final roundOf16Left = roundOf16.where((m) => (m.bracketPosition ?? 0) <= 4).toList();
    final roundOf16Right = roundOf16.where((m) => (m.bracketPosition ?? 0) > 4).toList();
    final quarterFinalsLeft = quarterFinals.where((m) => (m.bracketPosition ?? 0) <= 2).toList();
    final quarterFinalsRight = quarterFinals.where((m) => (m.bracketPosition ?? 0) > 2).toList();
    final semiFinalLeftMatch = semiFinals.where((m) => m.bracketPosition == 1).toList();
    final semiFinalLeft = semiFinalLeftMatch.isNotEmpty ? semiFinalLeftMatch.first : null;
    final semiFinalRightMatch = semiFinals.where((m) => m.bracketPosition == 2).toList();
    final semiFinalRight = semiFinalRightMatch.isNotEmpty ? semiFinalRightMatch.first : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bracket CAN'),
        backgroundColor: AppTheme.primaryColor,
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final screenWidth = constraints.maxWidth;
          final screenHeight = constraints.maxHeight;
          
          // Calculer les dimensions adaptatives pour utiliser toute la largeur
          // 7 colonnes de matchs + 6 espacements entre eux
          final totalSpacing = 6 * 8.0; // 6 espacements de 8px
          final padding = 8.0; // Padding horizontal total
          final availableWidth = screenWidth - padding - totalSpacing; // Largeur disponible
          final matchBoxWidth = availableWidth / 7; // 7 colonnes de matchs
          final matchBoxHeight = matchBoxWidth * 0.75; // Ratio 4:3 pour mieux afficher les drapeaux
          final matchBoxWidthClamped = matchBoxWidth; // Utiliser toute la largeur disponible
          final matchBoxHeightClamped = matchBoxHeight;
          
          return SingleChildScrollView(
            scrollDirection: Axis.vertical,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 8.0),
              child: SizedBox(
                width: screenWidth - 8,
                height: screenHeight,
                child: Stack(
                  children: [
                    // Lignes de connexion
                    CustomPaint(
                      size: Size(screenWidth - 8, screenHeight),
                      painter: BracketLinesPainter(
                        matchBoxWidth: matchBoxWidthClamped,
                        matchBoxHeight: matchBoxHeightClamped,
                      ),
                    ),
                    // Contenu du bracket
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // 8èmes de finale (gauche: positions 1-4)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '8èmes',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            ...List.generate(4, (index) {
                              final targetPos = index + 1;
                              final matches = roundOf16Left.where((m) => m.bracketPosition == targetPos).toList();
                              final actualMatch = matches.isNotEmpty ? matches.first : null;
                              return Padding(
                                padding: EdgeInsets.only(bottom: index == 3 ? 30 : 4),
                                child: _buildMatchBox(actualMatch, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                              );
                            }),
                          ],
                        ),
                        const SizedBox(width: 8),
                        // Quarts de finale (gauche: positions 1-2)
                        Padding(
                          padding: const EdgeInsets.only(top: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Quarts',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              ...List.generate(2, (index) {
                                final targetPos = index + 1;
                                final matches = quarterFinalsLeft.where((m) => m.bracketPosition == targetPos).toList();
                                final actualMatch = matches.isNotEmpty ? matches.first : null;
                                return Padding(
                                  padding: EdgeInsets.only(bottom: index == 1 ? 50 : 25),
                                  child: _buildMatchBox(actualMatch, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                                );
                              }),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Demi-finale (gauche: position 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 45),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Demi',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              _buildMatchBox(semiFinalLeft, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Finale
                        Padding(
                          padding: const EdgeInsets.only(top: 95),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Finale',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              _buildMatchBox(finalMatch, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Demi-finale (droite: position 2)
                        Padding(
                          padding: const EdgeInsets.only(top: 45),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Demi',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              _buildMatchBox(semiFinalRight, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Quarts de finale (droite: positions 3-4)
                        Padding(
                          padding: const EdgeInsets.only(top: 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Quarts',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              ...List.generate(2, (index) {
                                final targetPos = index + 3;
                                final matches = quarterFinalsRight.where((m) => m.bracketPosition == targetPos).toList();
                                final actualMatch = matches.isNotEmpty ? matches.first : null;
                                return Padding(
                                  padding: EdgeInsets.only(bottom: index == 1 ? 50 : 25),
                                  child: _buildMatchBox(actualMatch, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                                );
                              }),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // 8èmes de finale (droite: positions 5-8)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '8èmes',
                              style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            ...List.generate(4, (index) {
                              final targetPos = index + 5;
                              final matches = roundOf16Right.where((m) => m.bracketPosition == targetPos).toList();
                              final actualMatch = matches.isNotEmpty ? matches.first : null;
                              return Padding(
                                padding: EdgeInsets.only(bottom: index == 3 ? 30 : 4),
                                child: _buildMatchBox(actualMatch, width: matchBoxWidthClamped, height: matchBoxHeightClamped),
                              );
                            }),
                          ],
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
        },
      ),
    );
  }
}

// CustomPainter pour dessiner les lignes de connexion
class BracketLinesPainter extends CustomPainter {
  final double matchBoxWidth;
  final double matchBoxHeight;

  BracketLinesPainter({
    required this.matchBoxWidth,
    required this.matchBoxHeight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey[400]!
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    // Calculer les positions dynamiquement basées sur la largeur de l'écran
    final spacing = 8.0;
    final padding = 4.0;
    final round16LeftX = padding;
    final round16RightX = size.width - matchBoxWidth - padding;
    final quarterLeftX = round16LeftX + matchBoxWidth + spacing;
    final quarterRightX = round16RightX - matchBoxWidth - spacing;
    final semiLeftX = quarterLeftX + matchBoxWidth + spacing;
    final semiRightX = quarterRightX - matchBoxWidth - spacing;
    final finalX = (semiLeftX + semiRightX + matchBoxWidth) / 2 - matchBoxWidth / 2;

    final matchHeight = matchBoxHeight + 4.0; // hauteur + espacement
    final startY = 20.0;

    // Lignes des 8èmes gauche vers quarts gauche
    for (int i = 0; i < 4; i++) {
      final y = startY + (i * matchHeight) + (matchBoxHeight / 2);
      final targetQuarter = i ~/ 2;
      final quarterSpacing = matchBoxHeight + 30.0;
      final targetY = startY + 20 + (targetQuarter * quarterSpacing) + (matchBoxHeight / 2);
      
      canvas.drawLine(Offset(round16LeftX + matchBoxWidth, y), Offset(quarterLeftX - spacing / 2, y), paint);
      canvas.drawLine(Offset(quarterLeftX - spacing / 2, y), Offset(quarterLeftX - spacing / 2, targetY), paint);
      canvas.drawLine(Offset(quarterLeftX - spacing / 2, targetY), Offset(quarterLeftX, targetY), paint);
    }

    // Lignes des 8èmes droite vers quarts droite
    for (int i = 0; i < 4; i++) {
      final y = startY + (i * matchHeight) + (matchBoxHeight / 2);
      final targetQuarter = i ~/ 2;
      final quarterSpacing = matchBoxHeight + 30.0;
      final targetY = startY + 20 + (targetQuarter * quarterSpacing) + (matchBoxHeight / 2);
      
      canvas.drawLine(Offset(round16RightX, y), Offset(quarterRightX + matchBoxWidth + spacing / 2, y), paint);
      canvas.drawLine(Offset(quarterRightX + matchBoxWidth + spacing / 2, y), Offset(quarterRightX + matchBoxWidth + spacing / 2, targetY), paint);
      canvas.drawLine(Offset(quarterRightX + matchBoxWidth + spacing / 2, targetY), Offset(quarterRightX + matchBoxWidth, targetY), paint);
    }

    // Lignes des quarts gauche vers demi gauche
    for (int i = 0; i < 2; i++) {
      final quarterSpacing = matchBoxHeight + 30.0;
      final y = startY + 20 + (i * quarterSpacing) + (matchBoxHeight / 2);
      final targetY = startY + 50 + (matchBoxHeight / 2);
      
      canvas.drawLine(Offset(quarterLeftX + matchBoxWidth, y), Offset(semiLeftX - spacing / 2, y), paint);
      canvas.drawLine(Offset(semiLeftX - spacing / 2, y), Offset(semiLeftX - spacing / 2, targetY), paint);
      canvas.drawLine(Offset(semiLeftX - spacing / 2, targetY), Offset(semiLeftX, targetY), paint);
    }

    // Lignes des quarts droite vers demi droite
    for (int i = 0; i < 2; i++) {
      final quarterSpacing = matchBoxHeight + 30.0;
      final y = startY + 20 + (i * quarterSpacing) + (matchBoxHeight / 2);
      final targetY = startY + 50 + (matchBoxHeight / 2);
      
      canvas.drawLine(Offset(quarterRightX, y), Offset(semiRightX + matchBoxWidth + spacing / 2, y), paint);
      canvas.drawLine(Offset(semiRightX + matchBoxWidth + spacing / 2, y), Offset(semiRightX + matchBoxWidth + spacing / 2, targetY), paint);
      canvas.drawLine(Offset(semiRightX + matchBoxWidth + spacing / 2, targetY), Offset(semiRightX + matchBoxWidth, targetY), paint);
    }

    // Ligne demi gauche vers finale
    final semiLeftY = startY + 50 + (matchBoxHeight / 2);
    final finalY = startY + 110 + (matchBoxHeight / 2);
    
    canvas.drawLine(Offset(semiLeftX + matchBoxWidth, semiLeftY), Offset(finalX - spacing / 2, semiLeftY), paint);
    canvas.drawLine(Offset(finalX - spacing / 2, semiLeftY), Offset(finalX - spacing / 2, finalY), paint);
    canvas.drawLine(Offset(finalX - spacing / 2, finalY), Offset(finalX, finalY), paint);

    // Ligne demi droite vers finale
    final semiRightY = startY + 50 + (matchBoxHeight / 2);
    
    canvas.drawLine(Offset(semiRightX, semiRightY), Offset(finalX + matchBoxWidth + spacing / 2, semiRightY), paint);
    canvas.drawLine(Offset(finalX + matchBoxWidth + spacing / 2, semiRightY), Offset(finalX + matchBoxWidth + spacing / 2, finalY), paint);
    canvas.drawLine(Offset(finalX + matchBoxWidth + spacing / 2, finalY), Offset(finalX + matchBoxWidth, finalY), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
