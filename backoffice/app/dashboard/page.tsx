'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMatches: 0,
    scheduledMatches: 0,
    finishedMatches: 0,
    totalTeams: 0,
    totalUsers: 0,
    totalPredictions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [matchesRes, teamsRes] = await Promise.all([
          api.get('/admin/matches'),
          api.get('/admin/teams'),
        ]);

        const matches = matchesRes.data;
        const teams = teamsRes.data;

        setStats({
          totalMatches: matches.length,
          scheduledMatches: matches.filter((m: any) => m.status === 'SCHEDULED').length,
          finishedMatches: matches.filter((m: any) => m.status === 'FINISHED').length,
          totalTeams: teams.length,
          totalUsers: 0, // À implémenter si nécessaire
          totalPredictions: matches.reduce((sum: number, m: any) => sum + (m._count?.predictions || 0), 0),
        });
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Matchs', value: stats.totalMatches, icon: '⚽', color: 'bg-blue-500' },
    { label: 'Matchs Programmés', value: stats.scheduledMatches, icon: '📅', color: 'bg-green-500' },
    { label: 'Matchs Terminés', value: stats.finishedMatches, icon: '✅', color: 'bg-purple-500' },
    { label: 'Équipes', value: stats.totalTeams, icon: '👥', color: 'bg-orange-500' },
    { label: 'Pronostics', value: stats.totalPredictions, icon: '🎯', color: 'bg-red-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-4 rounded-full text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/bracket"
            className="flex items-center justify-center px-6 py-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            🏆 Gérer le Bracket
          </Link>
          <Link
            href="/dashboard/teams/new"
            className="flex items-center justify-center px-6 py-4 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors font-medium"
          >
            ➕ Créer une équipe
          </Link>
          <Link
            href="/dashboard/admins/new"
            className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            ➕ Créer un admin
          </Link>
        </div>
      </div>
    </div>
  );
}


