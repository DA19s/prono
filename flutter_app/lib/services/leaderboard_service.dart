import '../models/leaderboard_entry.dart';
import 'api_service.dart';

class LeaderboardService {
  final ApiService _api = ApiService();

  Future<List<LeaderboardEntry>> getLeaderboard({int limit = 100}) async {
    try {
      final response = await _api.get('/api/leaderboard', queryParameters: {
        'limit': limit,
      });
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => LeaderboardEntry.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<LeaderboardEntry?> getMyRank() async {
    try {
      final response = await _api.get('/api/leaderboard/my-rank');
      if (response.statusCode == 200) {
        return LeaderboardEntry.fromJson(response.data);
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}




