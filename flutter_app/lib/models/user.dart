class User {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String pseudo;
  final String? phone;
  final int totalPoints;
  final String role;
  final bool isActive;

  User({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.pseudo,
    required this.email,
    this.phone,
    required this.totalPoints,
    required this.role,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      firstName: json['firstName'],
      lastName: json['lastName'],
      email: json['email'],
      pseudo: json['pseudo'],
      phone: json['phone'],
      totalPoints: json['totalPoints'] ?? 0,
      role: json['role'] ?? 'USER',
      isActive: json['isActive'] ?? false,
    );
  }

  String get fullName => '$firstName $lastName';
}




