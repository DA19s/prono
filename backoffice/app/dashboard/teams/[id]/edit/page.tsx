'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { africanCountries } from '@/lib/countries';

interface Team {
  id: string;
  name: string;
  code: string | null;
  country: string | null;
  logo: string | null;
}

export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    country: '',
    countryCode: '', // Code ISO du pays pour le drapeau
  });

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      const response = await api.get(`/admin/teams/${teamId}`);
      const team: Team = response.data;
      
      // Extraire le code pays du logo si c'est un drapeau
      let countryCode = '';
      if (team.logo && team.logo.includes('/uploads/flags/')) {
        const match = team.logo.match(/\/uploads\/flags\/([a-z]{2})\.png/);
        if (match) {
          countryCode = match[1];
        }
      }
      
      setFormData({
        name: team.name,
        code: team.code || '',
        country: team.country || '',
        countryCode: countryCode,
      });
    } catch (error) {
      console.error('Erreur lors du chargement de l\'équipe:', error);
      alert('Erreur lors du chargement de l\'équipe');
      router.push('/dashboard/teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const selectedCountry = africanCountries.find(c => c.code === countryCode);
    
    setFormData({
      ...formData,
      countryCode: countryCode,
      country: selectedCountry?.name || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/admin/teams/${teamId}`, {
        name: formData.name,
        code: formData.code,
        country: formData.country,
        countryCode: formData.countryCode, // Envoyer le code pays pour le drapeau
      });

      router.push('/dashboard/teams');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour de l\'équipe');
    } finally {
      setSaving(false);
    }
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Modifier l'équipe</h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'équipe *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Sénégal"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="SEN"
                maxLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Sénégal"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pays (pour le drapeau) *
            </label>
            <select
              required
              value={formData.countryCode}
              onChange={handleCountryCodeChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Sélectionner un pays</option>
              {africanCountries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {formData.countryCode && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Aperçu du drapeau :</p>
                <div className="w-40 h-48 border border-gray-300 rounded-lg bg-gray-100 overflow-hidden relative">
                  <img
                    src={`http://localhost:3000/uploads/flags/${formData.countryCode}.png`}
                    alt={`Drapeau ${formData.country}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
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
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
