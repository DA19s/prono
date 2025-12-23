'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Team {
  id: string;
  name: string;
  code: string | null;
  logo: string | null;
}

interface BracketMatch {
  id: string;
  date: string | null;  // Optionnel pour les matchs non encore programmés
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

interface BracketVisualizationProps {
  matches: BracketMatch[];
  onMatchClick: (match: BracketMatch | null, position: number) => void;
  onMatchUpdated: () => void;
}

export default function BracketVisualization({
  matches,
  onMatchClick,
  onMatchUpdated,
}: BracketVisualizationProps) {
  // Organiser les matchs par phase
  const roundOf16 = matches.filter((m) => m.bracketRound === 'ROUND_OF_16').sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
  const quarterFinals = matches.filter((m) => m.bracketRound === 'QUARTER_FINAL').sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
  const semiFinals = matches.filter((m) => m.bracketRound === 'SEMI_FINAL').sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
  const final = matches.find((m) => m.bracketRound === 'FINAL');

  const getTeamLogo = (team: Team | null) => {
    if (!team || !team.logo) return null;
    if (team.logo.startsWith('http')) return team.logo;
    return `http://localhost:3000${team.logo.startsWith('/') ? team.logo : '/' + team.logo}`;
  };

  const getWinner = (match: BracketMatch): Team | null => {
    if (match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
      return null;
    }
    if (!match.homeTeam || !match.awayTeam) return null;
    if (match.homeScore > match.awayScore) return match.homeTeam;
    if (match.awayScore > match.homeScore) return match.awayTeam;
    return null;
  };

  const MatchBox = ({ match, position, isClickable = false }: { match: BracketMatch | null; position?: number; isClickable?: boolean }) => {
    if (!match) {
      return (
        <div
          onClick={() => isClickable && position && onMatchClick(null, position)}
          className={`w-28 h-32 bg-gray-100 border border-dashed rounded flex items-center justify-center ${
            isClickable
              ? 'cursor-pointer hover:border-green-500 hover:bg-gray-200 border-gray-300'
              : 'border-gray-300'
          }`}
        >
          <span className="text-gray-400 text-xs">{isClickable ? 'Créer' : 'À venir'}</span>
        </div>
      );
    }

    // Vérifier si le match a les deux équipes et peut être cliqué pour programmer/modifier la date
    const hasBothTeams = match.homeTeam && match.awayTeam;
    const isFinished = match.status === 'FINISHED';
    
    // Un match peut être cliqué pour définir/modifier la date si :
    // - Il n'est PAS terminé ET
    // - Il a les deux équipes ET
    // - (C'est un match de 8ème de finale) OU (C'est un match des phases suivantes)
    // On permet la modification de la date même si elle est déjà définie (match SCHEDULED)
    const canClickForDate = !isFinished && hasBothTeams && match.bracketRound;

    const winner = getWinner(match);
    const homeLogo = getTeamLogo(match.homeTeam);
    const awayLogo = getTeamLogo(match.awayTeam);

    return (
      <div
        onClick={() => (isClickable || canClickForDate) && onMatchClick(match, position || 0)}
        className={`w-28 h-32 bg-white border rounded overflow-hidden shadow-sm transition-all relative ${
          (isClickable || canClickForDate)
            ? 'cursor-pointer hover:border-green-500 hover:shadow-md border-gray-300'
            : 'border-gray-300'
        } ${isFinished ? 'bg-green-50' : ''} ${canClickForDate && !isFinished ? 'ring-2 ring-yellow-400' : ''}`}
      >
        {/* Conteneur pour les drapeaux divisés verticalement */}
        <div className="absolute inset-0 flex flex-col">
          {/* Drapeau Équipe 1 (en haut) */}
          <div className={`flex-1 overflow-hidden border-b border-gray-300 relative ${match.homeTeam && winner && winner.id === match.homeTeam.id ? 'ring-2 ring-green-600' : ''}`}>
            {match.homeTeam ? (
              homeLogo ? (
                <img
                  src={homeLogo}
                  alt={match.homeTeam.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[8px] text-gray-500 text-center px-1">{match.homeTeam.name}</span>
                </div>
              )
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center border-dashed border-gray-300">
                <span className="text-[8px] text-gray-400 text-center px-1">À déterminer</span>
              </div>
            )}
          </div>

          {/* Drapeau Équipe 2 (en bas) */}
          <div className={`flex-1 overflow-hidden relative ${match.awayTeam && winner && winner.id === match.awayTeam.id ? 'ring-2 ring-green-600' : ''}`}>
            {match.awayTeam ? (
              awayLogo ? (
                <img
                  src={awayLogo}
                  alt={match.awayTeam.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-[8px] text-gray-500 text-center px-1">{match.awayTeam.name}</span>
                </div>
              )
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center border-dashed border-gray-300">
                <span className="text-[8px] text-gray-400 text-center px-1">À déterminer</span>
              </div>
            )}
          </div>
        </div>

        {/* Score au centre si le match est terminé */}
        {isFinished && match.homeScore !== null && match.awayScore !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white bg-opacity-90 px-2 py-1 rounded shadow">
              <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                {match.homeScore} - {match.awayScore}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Séparer les 8èmes de finale en gauche (1-4) et droite (5-8)
  const roundOf16Left = roundOf16.filter((m) => (m.bracketPosition || 0) <= 4);
  const roundOf16Right = roundOf16.filter((m) => (m.bracketPosition || 0) > 4);
  
  // Séparer les quarts en gauche (1-2) et droite (3-4)
  const quarterFinalsLeft = quarterFinals.filter((m) => (m.bracketPosition || 0) <= 2);
  const quarterFinalsRight = quarterFinals.filter((m) => (m.bracketPosition || 0) > 2);
  
  // Séparer les demis en gauche (1) et droite (2)
  const semiFinalLeft = semiFinals.find((m) => m.bracketPosition === 1);
  const semiFinalRight = semiFinals.find((m) => m.bracketPosition === 2);

  return (
    <div className="bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 p-4 rounded-lg">
      {/* Header avec le thème CAN */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-green-800 mb-1">CAN 2024</h2>
        <p className="text-sm text-gray-700">Huitièmes de Finale</p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex space-x-2 min-w-max pb-4 justify-center">
          {/* Colonne gauche : 8èmes de Finale (1-4) */}
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-xs font-bold text-green-700 mb-2 text-center">8èmes</h3>
            <div className="space-y-1.5">
              {[1, 2, 3, 4].map((pos) => {
                const match = roundOf16Left.find((m) => m.bracketPosition === pos);
                return (
                  <div key={pos}>
                    <MatchBox match={match || null} position={pos} isClickable={true} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flèches vers les Quarts (gauche) */}
          <div className="flex flex-col justify-center space-y-8">
            {[1, 2, 3, 4].map((pos) => (
              <div key={pos} className="flex items-center">
                <div className="w-3 h-0.5 bg-green-600"></div>
                <div className="w-0 h-4 border-l border-green-600"></div>
              </div>
            ))}
          </div>

          {/* Quarts de Finale (gauche: 1-2) */}
          <div className="flex flex-col space-y-8">
            <h3 className="text-xs font-bold text-yellow-700 mb-2 text-center">1/4</h3>
            <div className="space-y-8">
              {[1, 2].map((pos) => {
                const match = quarterFinalsLeft.find((m) => m.bracketPosition === pos);
                return (
                  <div key={pos}>
                    <MatchBox match={match || null} isClickable={false} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flèches vers les Demis (gauche) */}
          <div className="flex flex-col justify-center space-y-16">
            {[1, 2].map((pos) => (
              <div key={pos} className="flex items-center">
                <div className="w-3 h-0.5 bg-yellow-600"></div>
                <div className="w-0 h-8 border-l border-yellow-600"></div>
              </div>
            ))}
          </div>

          {/* Demi-Finale (gauche: 1) */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xs font-bold text-orange-600 mb-2 text-center">1/2</h3>
            <div className="pt-17">
              <MatchBox match={semiFinalLeft || null} isClickable={false} />
            </div>
          </div>

          {/* Flèche vers la Finale (gauche) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-orange-600"></div>
              <div className="w-0 h-12 border-l border-orange-600"></div>
            </div>
          </div>

          {/* Finale */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xs font-bold text-red-700 mb-2 text-center">Finale</h3>
            <div className="relative">
              <MatchBox match={final || null} isClickable={false} />
              {/* Trophée au centre */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl">
                🏆
              </div>
            </div>
          </div>

          {/* Flèche vers la Finale (droite) */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-orange-600"></div>
              <div className="w-0 h-12 border-l border-orange-600"></div>
            </div>
          </div>

          {/* Demi-Finale (droite: 2) */}
          <div className="flex flex-col justify-center">
            <h3 className="text-xs font-bold text-orange-600 mb-2 text-center">1/2</h3>
            <div className="pt-17">
              <MatchBox match={semiFinalRight || null} isClickable={false} />
            </div>
          </div>

          {/* Flèches vers les Demis (droite) */}
          <div className="flex flex-col justify-center space-y-16">
            {[3, 4].map((pos) => (
              <div key={pos} className="flex items-center">
                <div className="w-3 h-0.5 bg-yellow-600"></div>
                <div className="w-0 h-8 border-l border-yellow-600"></div>
              </div>
            ))}
          </div>

          {/* Quarts de Finale (droite: 3-4) */}
          <div className="flex flex-col space-y-8">
            <h3 className="text-xs font-bold text-yellow-700 mb-2 text-center">1/4</h3>
            <div className="space-y-8">
              {[3, 4].map((pos) => {
                const match = quarterFinalsRight.find((m) => m.bracketPosition === pos);
                return (
                  <div key={pos}>
                    <MatchBox match={match || null} isClickable={false} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flèches vers les Quarts (droite) */}
          <div className="flex flex-col justify-center space-y-8">
            {[5, 6, 7, 8].map((pos) => (
              <div key={pos} className="flex items-center">
                <div className="w-3 h-0.5 bg-green-600"></div>
                <div className="w-0 h-4 border-l border-green-600"></div>
              </div>
            ))}
          </div>

          {/* Colonne droite : 8èmes de Finale (5-8) */}
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-xs font-bold text-green-700 mb-2 text-center">8èmes</h3>
            <div className="space-y-1.5">
              {[5, 6, 7, 8].map((pos) => {
                const match = roundOf16Right.find((m) => m.bracketPosition === pos);
                return (
                  <div key={pos}>
                    <MatchBox match={match || null} position={pos} isClickable={true} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

