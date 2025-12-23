'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import BracketVisualization from '@/components/BracketVisualization';

interface Team {
  id: string;
  name: string;
  code: string | null;
  logo: string | null;
}

interface BracketMatch {
  id: string;
  date: string;
  status: string;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeScore: number | null;
  awayScore: number | null;
  bracketRound: 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL' | null;
  bracketPosition: number | null;
  parentMatch1Id: string | null;
  parentMatch2Id: string | null;
}

export default function BracketPage() {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchBracketMatches();
  }, []);

  const fetchBracketMatches = async () => {
    try {
      const response = await api.get('/admin/bracket/matches');
      setMatches(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des matchs de bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = (match: BracketMatch | null, position: number) => {
    if (match) {
      // Ne pas permettre de modifier un match terminé
      if (match.status === 'FINISHED') {
        return; // Ne rien faire si le match est terminé
      }
      
      // Si c'est un match de 8ème de finale, on peut modifier les équipes et la date
      // Si c'est un autre match bracket avec les deux équipes, on peut modifier la date
      if (match.bracketRound === 'ROUND_OF_16' || 
          (match.homeTeam && match.awayTeam && match.bracketRound)) {
        setSelectedMatch(match);
        setShowModal(true);
      }
    } else {
      // Créer un nouveau match de 8ème de finale uniquement
      setSelectedMatch({
        id: '',
        date: '',
        status: 'SCHEDULED',
        homeTeam: { id: '', name: '', code: null, logo: null },
        awayTeam: { id: '', name: '', code: null, logo: null },
        homeScore: null,
        awayScore: null,
        bracketRound: 'ROUND_OF_16',
        bracketPosition: position,
        parentMatch1Id: null,
        parentMatch2Id: null,
      } as BracketMatch);
      setShowModal(true);
    }
  };

  const handleMatchUpdated = () => {
    fetchBracketMatches();
    setShowModal(false);
    setSelectedMatch(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du bracket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bracket d'Élimination Directe</h1>
          <p className="mt-1 text-sm text-gray-600">Gérez les matchs à élimination directe de la CAN</p>
        </div>
      </div>

      <BracketVisualization
        matches={matches}
        onMatchClick={handleMatchClick}
        onMatchUpdated={handleMatchUpdated}
      />

      {showModal && selectedMatch && (
        <MatchEditModal
          match={selectedMatch}
          onClose={() => {
            setShowModal(false);
            setSelectedMatch(null);
          }}
          onUpdated={handleMatchUpdated}
        />
      )}
    </div>
  );
}

interface MatchEditModalProps {
  match: BracketMatch;
  onClose: () => void;
  onUpdated: () => void;
}

function MatchEditModal({ match, onClose, onUpdated }: MatchEditModalProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [homeTeamId, setHomeTeamId] = useState(match.homeTeam?.id || '');
  const [awayTeamId, setAwayTeamId] = useState(match.awayTeam?.id || '');
  const [date, setDate] = useState(
    match.date && match.date !== '2099-12-31T00:00:00.000Z'
      ? new Date(match.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState(
    match.date && match.date !== '2099-12-31T00:00:00.000Z'
      ? new Date(match.date).toTimeString().slice(0, 5)
      : '20:00'
  );
  const [loading, setLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
    fetchBracketMatches();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/admin/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchBracketMatches = async () => {
    try {
      const response = await api.get('/admin/bracket/matches');
      setBracketMatches(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des matchs de bracket:', error);
    }
  };

  // Récupérer les équipes déjà utilisées dans les 8èmes de finale (sauf le match actuel)
  const getUsedTeamIds = (): string[] => {
    return bracketMatches
      .filter((m) => 
        m.bracketRound === 'ROUND_OF_16' && 
        m.id !== match.id // Exclure le match actuel si on le modifie
      )
      .flatMap((m) => {
        const ids: string[] = [];
        if (m.homeTeam?.id) ids.push(m.homeTeam.id);
        if (m.awayTeam?.id) ids.push(m.awayTeam.id);
        return ids;
      });
  };

  // Filtrer les équipes disponibles pour l'équipe 1
  const getAvailableTeamsForTeam1 = (): Team[] => {
    const usedTeamIds = getUsedTeamIds();
    return teams.filter((team) => {
      // Exclure les équipes déjà utilisées
      if (usedTeamIds.includes(team.id)) return false;
      // Exclure l'équipe 2 si elle est sélectionnée
      if (awayTeamId && team.id === awayTeamId) return false;
      // Permettre l'équipe actuelle si on modifie un match
      if (match.id && match.homeTeam?.id === team.id) return true;
      return true;
    });
  };

  // Filtrer les équipes disponibles pour l'équipe 2
  const getAvailableTeamsForTeam2 = (): Team[] => {
    const usedTeamIds = getUsedTeamIds();
    return teams.filter((team) => {
      // Exclure les équipes déjà utilisées
      if (usedTeamIds.includes(team.id)) return false;
      // Exclure l'équipe 1 si elle est sélectionnée
      if (homeTeamId && team.id === homeTeamId) return false;
      // Permettre l'équipe actuelle si on modifie un match
      if (match.id && match.awayTeam?.id === team.id) return true;
      return true;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pour les 8èmes de finale, les deux équipes sont requises
    // Pour les autres phases, on peut juste mettre à jour la date si les équipes sont déjà présentes
    if (match.bracketRound === 'ROUND_OF_16') {
      if (!homeTeamId || !awayTeamId) {
        alert('Veuillez sélectionner les deux équipes');
        return;
      }

      if (homeTeamId === awayTeamId) {
        alert('Les deux équipes doivent être différentes');
        return;
      }
    } else {
      // Pour les autres phases, vérifier que les deux équipes sont présentes
      if (!match.homeTeam || !match.awayTeam) {
        alert('Les deux équipes doivent être présentes pour programmer le match');
        return;
      }
    }

    setLoading(true);

    try {
      // Combiner date et heure
      const dateTime = new Date(`${date}T${time}`);
      
      if (match.id) {
        // Mettre à jour le match existant
        const updateData: any = {
          date: dateTime.toISOString()
        };
        
        // Pour les 8èmes de finale, on peut aussi modifier les équipes
        if (match.bracketRound === 'ROUND_OF_16') {
          updateData.homeTeamId = homeTeamId;
          updateData.awayTeamId = awayTeamId;
        }
        
        await api.put(`/admin/bracket/matches/${match.id}`, updateData);
      } else {
        // Créer un nouveau match (uniquement pour les 8èmes de finale)
        await api.post('/admin/bracket/matches', {
          homeTeamId,
          awayTeamId,
          date: dateTime.toISOString(),
          bracketPosition: match.bracketPosition
        });
      }

      onUpdated();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {match.id 
                ? match.bracketRound === 'ROUND_OF_16' 
                  ? 'Modifier Match de 8ème de Finale'
                  : `Modifier la date - ${match.bracketRound === 'QUARTER_FINAL' ? 'Quart de Finale' : match.bracketRound === 'SEMI_FINAL' ? 'Demi-Finale' : 'Final'}`
                : 'Créer Match de 8ème de Finale'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Afficher les équipes si elles sont déjà définies (pour les phases autres que 8èmes) */}
            {match.bracketRound !== 'ROUND_OF_16' && match.homeTeam && match.awayTeam && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Équipe 1:</strong> {match.homeTeam.name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Équipe 2:</strong> {match.awayTeam.name}
                </p>
              </div>
            )}

            {/* Sélecteurs d'équipes uniquement pour les 8èmes de finale */}
            {match.bracketRound === 'ROUND_OF_16' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Équipe 1
                  </label>
                  {teamsLoading ? (
                    <div className="text-sm text-gray-500">Chargement...</div>
                  ) : (
                    <select
                      value={homeTeamId}
                      onChange={(e) => {
                        setHomeTeamId(e.target.value);
                        // Si l'équipe 2 est la même, la réinitialiser
                        if (e.target.value === awayTeamId) {
                          setAwayTeamId('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Sélectionner une équipe</option>
                      {getAvailableTeamsForTeam1().map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {getAvailableTeamsForTeam1().length === 0 && !teamsLoading && (
                    <p className="text-xs text-red-500 mt-1">
                      Toutes les équipes disponibles sont déjà utilisées dans les 8èmes de finale
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Équipe 2
                  </label>
                  {teamsLoading ? (
                    <div className="text-sm text-gray-500">Chargement...</div>
                  ) : (
                    <select
                      value={awayTeamId}
                      onChange={(e) => {
                        setAwayTeamId(e.target.value);
                        // Si l'équipe 1 est la même, la réinitialiser
                        if (e.target.value === homeTeamId) {
                          setHomeTeamId('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="">Sélectionner une équipe</option>
                      {getAvailableTeamsForTeam2().map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {getAvailableTeamsForTeam2().length === 0 && !teamsLoading && (
                    <p className="text-xs text-red-500 mt-1">
                      Toutes les équipes disponibles sont déjà utilisées dans les 8èmes de finale
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

