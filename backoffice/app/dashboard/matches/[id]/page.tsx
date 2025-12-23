'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [formData, setFormData] = useState({
    homeScore: '',
    awayScore: '',
    homeScoreHalfTime: '',
    awayScoreHalfTime: '',
    status: 'SCHEDULED',
  });

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const response = await api.get(`/admin/matches`);
      const foundMatch = response.data.find((m: any) => m.id === matchId);
      if (foundMatch) {
        setMatch(foundMatch);
        setFormData({
          homeScore: foundMatch.homeScore?.toString() || '',
          awayScore: foundMatch.awayScore?.toString() || '',
          homeScoreHalfTime: foundMatch.homeScoreHalfTime?.toString() || '',
          awayScoreHalfTime: foundMatch.awayScoreHalfTime?.toString() || '',
          status: foundMatch.status,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du match:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {
        status: formData.status,
      };

      if (formData.homeScore && formData.awayScore) {
        updateData.homeScore = parseInt(formData.homeScore);
        updateData.awayScore = parseInt(formData.awayScore);
      }

      if (formData.homeScoreHalfTime) {
        updateData.homeScoreHalfTime = parseInt(formData.homeScoreHalfTime);
      }

      if (formData.awayScoreHalfTime) {
        updateData.awayScoreHalfTime = parseInt(formData.awayScoreHalfTime);
      }

      await api.put(`/admin/matches/${matchId}`, updateData);
      router.push('/dashboard/matches');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour du match');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishMatch = async () => {
    if (!formData.homeScore || !formData.awayScore) {
      alert('Veuillez entrer les scores finaux');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/admin/matches/${matchId}`, {
        homeScore: parseInt(formData.homeScore),
        awayScore: parseInt(formData.awayScore),
        homeScoreHalfTime: formData.homeScoreHalfTime ? parseInt(formData.homeScoreHalfTime) : undefined,
        awayScoreHalfTime: formData.awayScoreHalfTime ? parseInt(formData.awayScoreHalfTime) : undefined,
        status: 'FINISHED',
      });
      router.push('/dashboard/matches');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la finalisation du match');
    } finally {
      setLoading(false);
    }
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Modifier le match: {match.homeTeam.name} vs {match.awayTeam.name}
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Date:</strong> {new Date(match.date).toLocaleString('fr-FR')}
          </p>
          {match.round && (
            <p className="text-sm text-gray-600 mt-1">
              <strong>Phase:</strong> {match.round}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="SCHEDULED">Programmé</option>
              <option value="LIVE">En direct</option>
              <option value="FINISHED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
              <option value="POSTPONED">Reporté</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score domicile (mi-temps)
              </label>
              <input
                type="number"
                min="0"
                value={formData.homeScoreHalfTime}
                onChange={(e) => setFormData({ ...formData, homeScoreHalfTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score extérieur (mi-temps)
              </label>
              <input
                type="number"
                min="0"
                value={formData.awayScoreHalfTime}
                onChange={(e) => setFormData({ ...formData, awayScoreHalfTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score domicile (final) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.homeScore}
                onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score extérieur (final) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.awayScore}
                onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleFinishMatch}
              disabled={loading || !formData.homeScore || !formData.awayScore}
              className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Finalisation...' : 'Terminer le match'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


