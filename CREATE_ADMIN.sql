-- Requête SQL pour créer un administrateur
-- Remplacez les valeurs suivantes :
-- - 'VotrePrénom' : votre prénom
-- - 'VotreNom' : votre nom
-- - 'admin@example.com' : votre email
-- - 'HASHED_PASSWORD' : le hash bcrypt de votre mot de passe (voir ci-dessous)
-- - '+221771234567' : votre numéro de téléphone

-- Pour obtenir le hash du mot de passe, exécutez dans Node.js :
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('VotreMotDePasse', 10).then(hash => console.log(hash));

INSERT INTO "User" (
  "id",
  "firstName",
  "lastName",
  "email",
  "emailVerified",
  "password",
  "phone",
  "isActive",
  "role",
  "totalPoints",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(), -- Génère un UUID automatiquement
  'VotrePrénom',
  'VotreNom',
  'admin@example.com',
  true,
  'HASHED_PASSWORD', -- Remplacez par le hash bcrypt de votre mot de passe
  '+221771234567',
  true,
  'ADMIN',
  0,
  NOW(),
  NOW()
);


