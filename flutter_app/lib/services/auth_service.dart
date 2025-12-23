import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();
  User? _currentUser;

  User? get currentUser => _currentUser;

  Future<bool> login(String email, String password) async {
    try {
      // Note: Vous devrez créer cet endpoint dans votre backend
      final response = await _api.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final token = response.data['token'];
        final userData = response.data['user'];

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', token);
        await prefs.setString('user_data', userData.toString());

        _currentUser = User.fromJson(userData);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_data');
    _currentUser = null;
  }

  Future<bool> checkAuth() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    if (token == null) return false;

    try {
      // Vérifier si le token est valide en récupérant les infos utilisateur
      final response = await _api.get('/api/auth/me');
      if (response.statusCode == 200) {
        _currentUser = User.fromJson(response.data);
        return true;
      }
      return false;
    } catch (e) {
      await logout();
      return false;
    }
  }
}


