import 'team.dart';

enum MatchStatus {
  scheduled,
  live,
  finished,
  cancelled,
  postponed,
  pending;  // En attente de programmation

  static MatchStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'SCHEDULED':
        return MatchStatus.scheduled;
      case 'LIVE':
        return MatchStatus.live;
      case 'FINISHED':
        return MatchStatus.finished;
      case 'CANCELLED':
        return MatchStatus.cancelled;
      case 'POSTPONED':
        return MatchStatus.postponed;
      case 'PENDING':
        return MatchStatus.pending;
      default:
        return MatchStatus.scheduled;
    }
  }
}

class Match {
  final String id;
  final int apiId;
  final DateTime? date;  // Optionnel pour les matchs bracket non encore programmés
  final MatchStatus status;
  final Team? homeTeam;
  final Team? awayTeam;
  final int? homeScore;
  final int? awayScore;
  final int? homeScoreHalfTime;
  final int? awayScoreHalfTime;
  final String? round;
  final String? stage;
  final String? venue;
  final String? city;
  final bool isPronosticOpen;
  final DateTime pronosticDeadline;
  final int predictionsCount;
  final String? bracketRound;  // 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'
  final int? bracketPosition;

  Match({
    required this.id,
    required this.apiId,
    required this.date,
    required this.status,
    this.homeTeam,
    this.awayTeam,
    this.homeScore,
    this.awayScore,
    this.homeScoreHalfTime,
    this.awayScoreHalfTime,
    this.round,
    this.stage,
    this.venue,
    this.city,
    required this.isPronosticOpen,
    required this.pronosticDeadline,
    this.predictionsCount = 0,
    this.bracketRound,
    this.bracketPosition,
  });

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      id: json['id'],
      apiId: json['apiId'],
      date: json['date'] != null ? DateTime.parse(json['date']) : null,
      status: MatchStatus.fromString(json['status']),
      homeTeam: json['homeTeam'] != null ? Team.fromJson(json['homeTeam']) : null,
      awayTeam: json['awayTeam'] != null ? Team.fromJson(json['awayTeam']) : null,
      homeScore: json['homeScore'],
      awayScore: json['awayScore'],
      homeScoreHalfTime: json['homeScoreHalfTime'],
      awayScoreHalfTime: json['awayScoreHalfTime'],
      round: json['round'],
      stage: json['stage'],
      venue: json['venue'],
      city: json['city'],
      isPronosticOpen: json['isPronosticOpen'] ?? false,
      pronosticDeadline: DateTime.parse(json['pronosticDeadline']),
      predictionsCount: (json['_count'] as Map<String, dynamic>?)?['predictions'] ?? 0,
      bracketRound: json['bracketRound'],
      bracketPosition: json['bracketPosition'],
    );
  }

  bool get isFinished => status == MatchStatus.finished;
  bool get isLive => status == MatchStatus.live;
  
  bool get canPredict {
    if (!isPronosticOpen) {
      print('⚠️ canPredict: isPronosticOpen = false');
      return false;
    }
    
    // Si la date n'est pas définie, on ne peut pas pronostiquer
    if (date == null) {
      print('⚠️ canPredict: date is null');
      return false;
    }
    
    final now = DateTime.now();
    final matchDateTime = date!;
    
    // Vérifier si on est dans les 72h avant le match
    final hours72BeforeMatch = matchDateTime.subtract(const Duration(hours: 72));
    final canPredictIn72h = now.isAfter(hours72BeforeMatch) && now.isBefore(matchDateTime);
    
    // Permettre si avant la deadline OU dans les 72h avant le match
    final beforeDeadline = now.isBefore(pronosticDeadline);
    final result = beforeDeadline || canPredictIn72h;
    
    print('🔍 canPredict check:');
    print('   Match date: ${matchDateTime.toIso8601String()}');
    print('   Now: ${now.toIso8601String()}');
    print('   72h avant: ${hours72BeforeMatch.toIso8601String()}');
    print('   Deadline: ${pronosticDeadline.toIso8601String()}');
    print('   canPredictIn72h: $canPredictIn72h');
    print('   beforeDeadline: $beforeDeadline');
    print('   Result: $result');
    
    return result;
  }
}

