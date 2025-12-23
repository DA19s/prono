'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { africanCountries } from '@/lib/countries';

interface Team {
  id: string;
  name: string;
  code: string | null;
  country: string | null;
  logo: string | null;
}

export default function NewTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingTeams, setExistingTeams] = useState<Team[]>([]);
  const [creatingTeamId, setCreatingTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingTeams();
  }, []);

  const fetchExistingTeams = async () => {
    try {
      const response = await api.get('/admin/teams');
      setExistingTeams(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
    }
  };

  // Fonction pour normaliser une chaîne (enlever accents, mettre en minuscule)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Enlever les accents
  };

  // Filtrer les pays selon la recherche
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return africanCountries;
    }
    const normalizedQuery = normalizeString(searchQuery);
    return africanCountries.filter(
      (country) =>
        normalizeString(country.name).includes(normalizedQuery) ||
        normalizeString(country.code).includes(normalizedQuery) ||
        normalizeString(country.iso).includes(normalizedQuery)
    );
  }, [searchQuery]);

  // Vérifier si une équipe existe déjà pour un pays
  const isTeamExists = (countryCode: string) => {
    return existingTeams.some((team) => {
      if (team.logo && team.logo.includes(`/uploads/flags/${countryCode}.png`)) {
        return true;
      }
      // Vérifier aussi par nom de pays
      const country = africanCountries.find((c) => c.code === countryCode);
      return country && team.country === country.name;
    });
  };

  const handleCreateTeam = async (country: typeof africanCountries[0]) => {
    if (isTeamExists(country.code)) {
      alert(`L'équipe ${country.name} existe déjà`);
      return;
    }

    if (!confirm(`Créer l'équipe ${country.name} ?`)) {
      return;
    }

    setCreatingTeamId(country.code);
    setLoading(true);

    try {
      // Générer un code à 3 lettres à partir du nom ou utiliser l'ISO
      const code = country.iso.substring(0, 3).toUpperCase();

      await api.post('/admin/teams', {
        name: country.name,
        code: code,
        country: country.name,
        countryCode: country.code,
      });

      alert(`Équipe ${country.name} créée avec succès !`);
      router.push('/dashboard/teams');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la création de l\'équipe');
    } finally {
      setLoading(false);
      setCreatingTeamId(null);
    }
  };

  const getFlagUrl = (countryCode: string) => {
    return `http://localhost:3000/uploads/flags/${countryCode}.png`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Créer une nouvelle équipe</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un pays (nom, code ISO)..."
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {filteredCountries.length} pays trouvé(s)
        </p>
      </div>

      {/* Grille des pays */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {filteredCountries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun pays trouvé pour "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredCountries.map((country) => {
              const exists = isTeamExists(country.code);
              const isCreating = creatingTeamId === country.code;

              return (
                <div
                  key={country.code}
                  onClick={() => !exists && !isCreating && handleCreateTeam(country)}
                  className={`
                    relative p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${
                      exists
                        ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                        : isCreating
                        ? 'border-blue-300 bg-blue-50 cursor-wait'
                        : 'border-gray-300 bg-white hover:border-green-500 hover:shadow-lg'
                    }
                  `}
                >
                  {/* Badge "Déjà créé" */}
                  {exists && (
                    <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      ✓ Créé
                    </div>
                  )}

                  {/* Drapeau */}
                  <div className="flex justify-center mb-3">
                    <div className="w-24 h-28 bg-gray-100 rounded border border-gray-200 overflow-hidden relative">
                      <img
                        src={getFlagUrl(country.code)}
                        alt={`Drapeau ${country.name}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Nom du pays */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 text-sm">{country.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{country.iso}</p>
                  </div>

                  {/* Indicateur de chargement */}
                  {isCreating && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
