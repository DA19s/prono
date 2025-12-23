import 'match.dart';
import 'user.dart';

enum PredictionResult {
  homeWin,
  awayWin,
  draw;

  static PredictionResult fromString(String result) {
    switch (result.toUpperCase()) {
      case 'HOME_WIN':
        return PredictionResult.homeWin;
      case 'AWAY_WIN':
        return PredictionResult.awayWin;
      case 'DRAW':
        return PredictionResult.draw;
      default:
        return PredictionResult.draw;
    }
  }

  String toApiString() {
    switch (this) {
      case PredictionResult.homeWin:
        return 'HOME_WIN';
      case PredictionResult.awayWin:
        return 'AWAY_WIN';
      case PredictionResult.draw:
        return 'DRAW';
    }
  }
}

class Prediction {
  final String id;
  final String userId;
  final String matchId;
  final int predictedHomeScore;
  final int predictedAwayScore;
  final int? predictedHomePenalties;
  final int? predictedAwayPenalties;
  final PredictionResult predictedResult;
  final int pointsEarned;
  final bool isScoreCorrect;
  final bool isResultCorrect;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Match? match;
  final User? user;

  Prediction({
    required this.id,
    required this.userId,
    required this.matchId,
    required this.predictedHomeScore,
    required this.predictedAwayScore,
    this.predictedHomePenalties,
    this.predictedAwayPenalties,
    required this.predictedResult,
    this.pointsEarned = 0,
    this.isScoreCorrect = false,
    this.isResultCorrect = false,
    required this.createdAt,
    required this.updatedAt,
    this.match,
    this.user,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      id: json['id'],
      userId: json['userId'],
      matchId: json['matchId'],
      predictedHomeScore: json['predictedHomeScore'],
      predictedAwayScore: json['predictedAwayScore'],
      predictedHomePenalties: json['predictedHomePenalties'],
      predictedAwayPenalties: json['predictedAwayPenalties'],
      predictedResult: PredictionResult.fromString(json['predictedResult']),
      pointsEarned: json['pointsEarned'] ?? 0,
      isScoreCorrect: json['isScoreCorrect'] ?? false,
      isResultCorrect: json['isResultCorrect'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      match: json['match'] != null ? Match.fromJson(json['match']) : null,
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'matchId': matchId,
      'predictedHomeScore': predictedHomeScore,
      'predictedAwayScore': predictedAwayScore,
      'predictedResult': predictedResult.toApiString(),
    };
  }
}


