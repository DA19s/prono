// Script pour hasher un mot de passe
const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10).then(hash => {
  console.log('\n✅ Hash généré :');
  console.log(hash);
  console.log('\n📋 Requête SQL complète :\n');
  console.log(`INSERT INTO "User" (
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
  gen_random_uuid(),
  'Ibrahim',
  'Dan Azoumi',
  'admin@pronocan.com',
  true,
  '${hash}',
  '+221762796367',
  true,
  'ADMIN',
  0,
  NOW(),
  NOW()
);\n`);
});


