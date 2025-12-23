import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  String? _baseUrl;

  void init({required String baseUrl}) {
    _baseUrl = baseUrl;
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
      // Accepter les codes de statut 200-299 comme succès
      validateStatus: (status) {
        return status != null && status >= 200 && status < 300;
      },
    ));

    // Interceptor pour ajouter le token d'authentification et gérer les erreurs
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // Logger toutes les erreurs pour le débogage
        if (error.response != null) {
          print('❌ Erreur API: ${error.requestOptions.path}');
          print('   Status: ${error.response?.statusCode}');
          print('   Data: ${error.response?.data}');
        } else {
          print('❌ Erreur réseau: ${error.message}');
        }

        if (error.response?.statusCode == 401) {
          // Token expiré ou invalide
          _clearAuth();
        }
        return handler.next(error);
      },
    ));
  }

  Future<void> _clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      print('📤 GET $path');
      final response = await _dio.get(path, queryParameters: queryParameters);
      print('✅ Réponse GET $path: Status ${response.statusCode}');
      return response;
    } catch (e) {
      print('❌ Erreur GET $path: $e');
      rethrow;
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      print('📤 POST $path avec données: $data');
      final response = await _dio.post(path, data: data);
      print('✅ Réponse reçue: Status ${response.statusCode}');
      print('   Data: ${response.data}');
      return response;
    } catch (e) {
      // Logger l'erreur pour le débogage
      if (e is DioException) {
        print('❌ Erreur API POST $path:');
        print('   Status: ${e.response?.statusCode}');
        print('   Data: ${e.response?.data}');
        print('   Message: ${e.message}');
        print('   Type: ${e.type}');
        
        // Extraire le message d'erreur de la réponse
        if (e.response?.data is Map) {
          final errorData = e.response!.data as Map;
          if (errorData.containsKey('message')) {
            print('   Message serveur: ${errorData['message']}');
          }
        }
      } else {
        print('❌ Erreur inconnue: $e');
      }
      rethrow;
    }
  }

  // Méthode helper pour extraire le message d'erreur
  static String getErrorMessage(dynamic error) {
    if (error is DioException) {
      if (error.response?.data is Map) {
        final errorData = error.response!.data as Map;
        if (errorData.containsKey('message')) {
          return errorData['message'] as String;
        }
      }
      if (error.message != null) {
        return error.message!;
      }
      return 'Erreur de connexion';
    }
    return error.toString();
  }

  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } catch (e) {
      rethrow;
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } catch (e) {
      rethrow;
    }
  }
}

