-- Requête SQL pour mettre à jour le mot de passe d'un administrateur
-- Hash du mot de passe "Ibou1324" : $2b$10$cWC8ONsnmcyv7PYrX3C/rO1hj9bQcO9Pe1uM4KXiqjMsjoPUmwGIa

-- Option 1 : Mettre à jour par email
UPDATE "User"
SET 
  "password" = '$2b$10$cWC8ONsnmcyv7PYrX3C/rO1hj9bQcO9Pe1uM4KXiqjMsjoPUmwGIa',
  "updatedAt" = NOW()
WHERE "email" = 'admin@pronocan.com' AND "role" = 'ADMIN';

-- Option 2 : Mettre à jour tous les admins (si vous voulez le même mot de passe pour tous)
-- UPDATE "User"
-- SET 
--   "password" = '$2b$10$cWC8ONsnmcyv7PYrX3C/rO1hj9bQcO9Pe1uM4KXiqjMsjoPUmwGIa',
--   "updatedAt" = NOW()
-- WHERE "role" = 'ADMIN';

-- Option 3 : Mettre à jour par ID (remplacez 'USER_ID' par l'ID réel)
-- UPDATE "User"
-- SET 
--   "password" = '$2b$10$cWC8ONsnmcyv7PYrX3C/rO1hj9bQcO9Pe1uM4KXiqjMsjoPUmwGIa',
--   "updatedAt" = NOW()
-- WHERE "id" = 'USER_ID';



