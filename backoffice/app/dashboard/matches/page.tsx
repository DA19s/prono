'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Match {
  id: string;
  date: string;
  status: string;
  homeTeam: { name: string; id: string } | null;
  awayTeam: { name: string; id: string } | null;
  homeScore: number | null;
  awayScore: number | null;
  round: string | null;
  bracketRound: 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL' | null;
  _count: { predictions: number };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [homePenalties, setHomePenalties] = useState('');
  const [awayPenalties, setAwayPenalties] = useState('');
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await api.get('/admin/matches');
      setMatches(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des matchs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = (match: Match) => {
    setSelectedMatch(match);
    setHomeScore(match.homeScore?.toString() || '');
    setAwayScore(match.awayScore?.toString() || '');
    setHomePenalties(match.homePenalties?.toString() || '');
    setAwayPenalties(match.awayPenalties?.toString() || '');
    setFinishModalOpen(true);
  };

  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    const homeScoreNum = parseInt(homeScore);
    const awayScoreNum = parseInt(awayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum) || homeScoreNum < 0 || awayScoreNum < 0) {
      alert('Veuillez entrer des scores valides (nombres positifs)');
      return;
    }

    // Si match nul, vérifier les tirs au but
    const isDraw = homeScoreNum === awayScoreNum;
    if (isDraw) {
      const homePenaltiesNum = parseInt(homePenalties);
      const awayPenaltiesNum = parseInt(awayPenalties);

      if (isNaN(homePenaltiesNum) || isNaN(awayPenaltiesNum) || homePenaltiesNum < 0 || awayPenaltiesNum < 0) {
        alert('En cas de match nul, veuillez entrer les scores des tirs au but');
        return;
      }

      if (homePenaltiesNum === awayPenaltiesNum) {
        alert('Les scores des tirs au but ne peuvent pas être égaux');
        return;
      }

      setFinishing(true);
      try {
        await api.put(`/admin/matches/${selectedMatch.id}`, {
          homeScore: homeScoreNum,
          awayScore: awayScoreNum,
          homePenalties: homePenaltiesNum,
          awayPenalties: awayPenaltiesNum,
          status: 'FINISHED'
        });
        alert('Match terminé avec succès');
        setFinishModalOpen(false);
        setSelectedMatch(null);
        setHomeScore('');
        setAwayScore('');
        setHomePenalties('');
        setAwayPenalties('');
        fetchMatches(); // Recharger la liste
      } catch (error: any) {
        alert(error.response?.data?.message || 'Erreur lors de la finalisation du match');
      } finally {
        setFinishing(false);
      }
    } else {
      setFinishing(true);
      try {
        await api.put(`/admin/matches/${selectedMatch.id}`, {
          homeScore: homeScoreNum,
          awayScore: awayScoreNum,
          status: 'FINISHED'
        });
        alert('Match terminé avec succès');
        setFinishModalOpen(false);
        setSelectedMatch(null);
        setHomeScore('');
        setAwayScore('');
        setHomePenalties('');
        setAwayPenalties('');
        fetchMatches(); // Recharger la liste
      } catch (error: any) {
        alert(error.response?.data?.message || 'Erreur lors de la finalisation du match');
      } finally {
        setFinishing(false);
      }
    }
  };

  const handleDelete = async (matchId: string, homeTeam: string | null, awayTeam: string | null) => {
    const homeTeamName = homeTeam || 'À déterminer';
    const awayTeamName = awayTeam || 'À déterminer';
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le match ${homeTeamName} vs ${awayTeamName} ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/matches/${matchId}`);
      alert('Match supprimé avec succès');
      fetchMatches(); // Recharger la liste
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la suppression du match');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      LIVE: 'bg-red-100 text-red-800',
      FINISHED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      POSTPONED: 'bg-yellow-100 text-yellow-800',
      PENDING: 'bg-orange-100 text-orange-800',  // En attente de programmation
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestion des Matchs</h1>
        <p className="text-sm text-gray-600">
          Les matchs sont créés depuis le <Link href="/dashboard/bracket" className="text-primary hover:underline">Bracket</Link>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pronostics
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Aucun match trouvé
                </td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(match.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {match.homeTeam?.name || 'À déterminer'} vs {match.awayTeam?.name || 'À déterminer'}
                    </div>
                    {match.round && (
                      <div className="text-sm text-gray-500">{match.round}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.homeScore !== null && match.awayScore !== null ? (
                      <span className="font-semibold">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        match.status
                      )}`}
                    >
                      {match.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match._count.predictions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-4">
                      {match.status !== 'FINISHED' && match.homeTeam && match.awayTeam && match.date && (
                        <button
                          onClick={() => handleFinish(match)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Terminer
                        </button>
                      )}
                      {(!match.bracketRound || match.bracketRound === 'ROUND_OF_16') && (
                        <button
                          onClick={() => handleDelete(match.id, match.homeTeam?.name || null, match.awayTeam?.name || null)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal pour terminer un match */}
      {finishModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Terminer le match
            </h2>
            <p className="text-gray-600 mb-6">
              {selectedMatch.homeTeam?.name || 'À déterminer'} vs {selectedMatch.awayTeam?.name || 'À déterminer'}
            </p>
            <form onSubmit={handleFinishSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score - {selectedMatch.homeTeam?.name || 'Équipe domicile'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score - {selectedMatch.awayTeam?.name || 'Équipe extérieure'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                {homeScore && awayScore && !isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore)) && parseInt(homeScore) === parseInt(awayScore) && (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-sm text-yellow-800 font-medium mb-3">
                        ⚠️ Match nul détecté. Veuillez entrer les scores des tirs au but :
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tirs au but - {selectedMatch.homeTeam.name}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={homePenalties}
                            onChange={(e) => setHomePenalties(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tirs au but - {selectedMatch.awayTeam.name}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={awayPenalties}
                            onChange={(e) => setAwayPenalties(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        {homePenalties && awayPenalties && !isNaN(parseInt(homePenalties)) && !isNaN(parseInt(awayPenalties)) && (
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-sm text-gray-600">
                              Vainqueur: {
                                parseInt(homePenalties) > parseInt(awayPenalties)
                                  ? selectedMatch.homeTeam.name
                                  : selectedMatch.awayTeam.name
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {homeScore && awayScore && !isNaN(parseInt(homeScore)) && !isNaN(parseInt(awayScore)) && parseInt(homeScore) !== parseInt(awayScore) && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Vainqueur: {
                        parseInt(homeScore) > parseInt(awayScore)
                          ? selectedMatch.homeTeam.name
                          : selectedMatch.awayTeam.name
                      }
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setFinishModalOpen(false);
                    setSelectedMatch(null);
                    setHomeScore('');
                    setAwayScore('');
                    setHomePenalties('');
                    setAwayPenalties('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={finishing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {finishing ? 'En cours...' : 'Terminer le match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


