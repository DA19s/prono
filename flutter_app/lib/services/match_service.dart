import '../models/match.dart';
import 'api_service.dart';
import 'package:dio/dio.dart';

class MatchService {
  final ApiService _api = ApiService();

  Future<List<Match>> getUpcomingMatches() async {
    try {
      print('📡 Récupération des matchs à venir...');
      final response = await _api.get('/api/matches');
      print('✅ Réponse reçue: Status ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        print('📋 Nombre de matchs: ${data.length}');
        return data.map((json) => Match.fromJson(json)).toList();
      }
      print('⚠️ Status code non 200: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ Erreur lors de la récupération des matchs à venir: $e');
      if (e is DioException) {
        print('   Type: ${e.type}');
        print('   Message: ${e.message}');
        if (e.response != null) {
          print('   Status: ${e.response?.statusCode}');
          print('   Data: ${e.response?.data}');
        }
      }
      return [];
    }
  }

  Future<List<Match>> getFinishedMatches() async {
    try {
      print('📡 Récupération des matchs terminés...');
      final response = await _api.get('/api/matches/finished');
      print('✅ Réponse reçue: Status ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        print('📋 Nombre de matchs terminés: ${data.length}');
        return data.map((json) => Match.fromJson(json)).toList();
      }
      print('⚠️ Status code non 200: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ Erreur lors de la récupération des matchs terminés: $e');
      if (e is DioException) {
        print('   Type: ${e.type}');
        print('   Message: ${e.message}');
        if (e.response != null) {
          print('   Status: ${e.response?.statusCode}');
          print('   Data: ${e.response?.data}');
        }
      }
      return [];
    }
  }

  Future<Match?> getMatchById(String id) async {
    try {
      final response = await _api.get('/api/matches/$id');
      if (response.statusCode == 200) {
        return Match.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> syncMatches() async {
    try {
      final response = await _api.post('/api/matches/sync');
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  Future<List<Match>> getBracketMatches() async {
    try {
      print('📡 Récupération des matchs de bracket...');
      final response = await _api.get('/api/matches/bracket');
      print('✅ Réponse reçue: Status ${response.statusCode}');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        print('📋 Nombre de matchs bracket: ${data.length}');
        return data.map((json) => Match.fromJson(json)).toList();
      }
      print('⚠️ Status code non 200: ${response.statusCode}');
      return [];
    } catch (e) {
      print('❌ Erreur lors de la récupération des matchs bracket: $e');
      if (e is DioException) {
        print('   Type: ${e.type}');
        print('   Message: ${e.message}');
        if (e.response != null) {
          print('   Status: ${e.response?.statusCode}');
          print('   Data: ${e.response?.data}');
        }
      }
      return [];
    }
  }
}

