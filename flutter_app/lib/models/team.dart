class Team {
  final String id;
  final int apiId;
  final String name;
  final String? code;
  final String? logo;
  final String? country;

  Team({
    required this.id,
    required this.apiId,
    required this.name,
    this.code,
    this.logo,
    this.country,
  });

  factory Team.fromJson(Map<String, dynamic> json) {
    return Team(
      id: json['id'],
      apiId: json['apiId'],
      name: json['name'],
      code: json['code'],
      logo: json['logo'],
      country: json['country'],
    );
  }
}


