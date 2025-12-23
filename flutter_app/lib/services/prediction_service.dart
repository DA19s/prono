import '../models/prediction.dart';
import 'api_service.dart';
import 'package:dio/dio.dart';

class PredictionService {
  final ApiService _api = ApiService();

  Future<Prediction?> createOrUpdatePrediction({
    required String matchId,
    required int predictedHomeScore,
    required int predictedAwayScore,
    int? predictedHomePenalties,
    int? predictedAwayPenalties,
  }) async {
    try {
      final data = {
        'matchId': matchId,
        'predictedHomeScore': predictedHomeScore,
        'predictedAwayScore': predictedAwayScore,
      };
      
      // Ajouter les tirs au but si fournis
      if (predictedHomePenalties != null && predictedAwayPenalties != null) {
        data['predictedHomePenalties'] = predictedHomePenalties;
        data['predictedAwayPenalties'] = predictedAwayPenalties;
      }
      
      final response = await _api.post('/api/predictions', data: data);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return Prediction.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> deletePrediction(String matchId) async {
    try {
      final response = await _api.delete('/api/predictions/match/$matchId');
      return response.statusCode == 204;
    } catch (e) {
      return false;
    }
  }

  Future<List<Prediction>> getMyPredictions() async {
    try {
      final response = await _api.get('/api/predictions/my-predictions');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => Prediction.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Prediction>> getMatchPredictions(String matchId) async {
    try {
      final response = await _api.get('/api/predictions/match/$matchId');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => Prediction.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Prediction?> getMyMatchPrediction(String matchId) async {
    try {
      final response = await _api.get('/api/predictions/match/$matchId/my-prediction');
      if (response.statusCode == 200) {
        // Le backend peut retourner null si pas de pronostic
        final data = response.data;
        if (data == null || data.toString() == 'null') {
          return null;
        }
        // Vérifier que c'est bien un Map avant de parser
        if (data is! Map<String, dynamic>) {
          return null;
        }
        return Prediction.fromJson(data);
      }
      return null;
    } catch (e) {
      // 404 est normal si l'utilisateur n'a pas encore fait de pronostic
      if (e is DioException) {
        if (e.response?.statusCode == 404) {
          return null;
        }
        // Si le backend retourne null, Dio peut lever une exception
        if (e.response?.statusCode == 200 && e.response?.data == null) {
          return null;
        }
      }
      // Pour les autres erreurs, on log mais on retourne null
      print('⚠️ Erreur lors de la récupération du pronostic: $e');
      return null;
    }
  }
}


