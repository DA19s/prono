class LeaderboardEntry {
  final int rank;
  final String userId;
  final String firstName;
  final String pseudo;
  final String lastName;
  final String email;
  final int totalPoints;
  final int predictionsCount;

  LeaderboardEntry({
    required this.rank,
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.pseudo,
    required this.email,
    required this.totalPoints,
    required this.predictionsCount,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] ?? 0,
      userId: json['id'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      pseudo: json['pseudo'],
      email: json['email'],
      totalPoints: json['totalPoints'] ?? 0,
      predictionsCount: json['predictionsCount'] ?? 0,
    );
  }

  String get fullName => '$firstName $lastName';
}




