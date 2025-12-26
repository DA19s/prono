const bcrypt = require('bcryptjs');
const prisma = require('../config/prismaClient');
const tokenService = require('../services/tokenService');
const { sendVerificationCodeWhatsApp, sendAccountActivatedWhatsApp } = require('../services/twilioService');

const SALT_ROUNDS = 10;

/**
 * Inscription d'un nouvel utilisateur
 */
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, pseudo, email, password, phone } = req.body;

    console.log('📝 Données reçues:', { firstName, lastName, pseudo, email, phone: phone ? 'présent' : 'absent', password: password ? 'présent' : 'absent' });

    // validation
    if (!firstName?.trim() || !lastName?.trim() || !pseudo?.trim() || !email?.trim() || !password || !phone?.trim()) {
      const missingFields = [];
      if (!firstName?.trim()) missingFields.push('prénom');
      if (!lastName?.trim()) missingFields.push('nom');
      if (!pseudo?.trim()) missingFields.push('pseudo');
      if (!email?.trim()) missingFields.push('email');
      if (!password) missingFields.push('mot de passe');
      if (!phone?.trim()) missingFields.push('téléphone');
      
      return res.status(400).json({ 
        message: `Champs manquants: ${missingFields.join(', ')}` 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'Un compte avec cet email existe déjà' 
      });
    }

    // Nettoyer le numéro de téléphone (enlever les espaces)
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // Vérifier si le numéro de téléphone existe déjà
    const existingPhone = await prisma.user.findFirst({
      where: { phone: cleanPhone }
    });

    if (existingPhone) {
      return res.status(400).json({ 
        message: 'Un compte avec ce numéro de téléphone existe déjà' 
      });
    }

    const existingPseudo = await prisma.user.findFirst({
      where: { pseudo: pseudo.trim() }
    });

    if (existingPseudo) {
      return res.status(400).json({ 
        message: 'Un compte avec ce pseudo existe déjà' 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Générer un code de vérification (6 chiffres)
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Créer l'utilisateur (non actif en attendant la vérification)
    let user;
    try {
      user = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          pseudo: pseudo.trim(),
          password: hashedPassword,
          phone: cleanPhone,
          role: 'USER',
          isActive: false, // Compte inactif jusqu'à vérification
          emailVerificationCode: verificationCode,
          emailVerificationExpiry: verificationExpiry,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          pseudo: true,
          phone: true,
          role: true,
          totalPoints: true,
          isActive: true,
          createdAt: true,
        }
      });
    } catch (dbError) {
      console.error('Erreur création utilisateur:', dbError);
      return res.status(500).json({ 
        message: 'Erreur lors de la création du compte',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Envoyer le code de vérification par WhatsApp
    let whatsappSent = false;
    try {
      console.log(`📱 Tentative d'envoi WhatsApp à ${user.phone} avec le code ${verificationCode}`);
      const whatsappResult = await sendVerificationCodeWhatsApp(
        user.phone,
        user.firstName,
        verificationCode
      );
      
      console.log('📱 Résultat WhatsApp:', whatsappResult);
      
      if (whatsappResult && whatsappResult.success) {
        console.log(`✅ Code de vérification envoyé à ${user.phone}`);
        whatsappSent = true;
      } else {
        console.warn(`⚠️ WhatsApp non envoyé: ${whatsappResult?.error || 'Erreur inconnue'}`);
        // En développement, afficher le code pour faciliter les tests
        console.log(`📱 Code de vérification (dev - WhatsApp non configuré): ${verificationCode}`);
      }
    } catch (whatsappError) {
      console.error('⚠️ Erreur envoi WhatsApp:', whatsappError);
      // En développement, afficher le code pour faciliter les tests
      console.log(`📱 Code de vérification (dev - erreur WhatsApp): ${verificationCode}`);
    }

    // Toujours envoyer la réponse, même si WhatsApp échoue
    console.log('📤 Envoi de la réponse au client...');
    const responseMessage = whatsappSent 
      ? 'Inscription réussie. Un code de vérification a été envoyé sur WhatsApp.'
      : 'Inscription réussie. Vérifiez votre WhatsApp pour le code de vérification.';

    const responseData = {
      message: responseMessage,
      user: {
        ...user,
        isActive: false, // Indiquer que le compte n'est pas encore actif
      },
      requiresVerification: true,
      // Toujours inclure le code en développement pour faciliter les tests
      // En production, le code sera uniquement envoyé par WhatsApp
      ...(process.env.NODE_ENV !== 'production' && { 
        verificationCode: verificationCode 
      }),
    };

    console.log('✅ Réponse préparée:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
    console.log('✅ Réponse envoyée avec succès');
  } catch (error) {
    console.error('❌ Erreur dans register:', error);
    console.error('Stack:', error.stack);
    
    // Si c'est une erreur Prisma de contrainte unique
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return res.status(400).json({ 
        message: `Un compte avec ce ${field === 'email' ? 'email' : field === 'phone' ? 'numéro de téléphone' : 'champ'} existe déjà` 
      });
    }
    
    // Erreur de validation Prisma
    if (error.code && error.code.startsWith('P')) {
      return res.status(400).json({ 
        message: 'Erreur de validation des données',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    next(error);
  }
};

/**
 * Connexion d'un utilisateur
 */
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Validation
    if (!password) {
      return res.status(400).json({ 
        message: 'Mot de passe requis' 
      });
    }

    if (!email && !phone) {
      return res.status(400).json({ 
        message: 'Email ou numéro de téléphone requis' 
      });
    }

    let user = null;

    // Si email est fourni, chercher par email (pour backoffice/admin)
    if (email) {
      user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase() }
      });
    } 
    // Sinon, chercher par téléphone (pour mobile)
    else if (phone) {
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      user = await prisma.user.findFirst({
        where: { phone: cleanPhone }
      });
    }

    if (!user) {
      return res.status(401).json({ 
        message: email ? 'Email ou mot de passe incorrect' : 'Numéro de téléphone ou mot de passe incorrect' 
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Votre compte n\'est pas actif. Veuillez vérifier votre code WhatsApp pour activer votre compte.',
        requiresVerification: true,
        email: user.email,
        phone: user.phone
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: email ? 'Email ou mot de passe incorrect' : 'Numéro de téléphone ou mot de passe incorrect' 
      });
    }

    // Générer les tokens
    const accessToken = tokenService.signAccessToken({ userId: user.id });
    const refreshToken = tokenService.signRefreshToken({ userId: user.id });

    // Retourner les données utilisateur (sans le mot de passe)
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      pseudo: user.pseudo,
      email: user.email,
      phone: user.phone,
      role: user.role,
      totalPoints: user.totalPoints,
      isActive: user.isActive,
    };

    res.json({
      message: 'Connexion réussie',
      user: userData,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rafraîchir le token d'accès
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        message: 'Refresh token requis' 
      });
    }

    try {
      // Vérifier le refresh token
      const decoded = tokenService.verifyRefreshToken(token);

      // Vérifier que l'utilisateur existe toujours et est actif
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          isActive: true,
        }
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ 
          message: 'Utilisateur non trouvé ou inactif' 
        });
      }

      // Générer un nouveau token d'accès
      const accessToken = tokenService.signAccessToken({ userId: user.id });

      res.json({
        token: accessToken,
      });
    } catch (error) {
      return res.status(401).json({ 
        message: 'Refresh token invalide ou expiré' 
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les informations de l'utilisateur connecté
 */
const getMe = async (req, res, next) => {
  try {
    // L'utilisateur est déjà dans req.user grâce au middleware authenticate
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        totalPoints: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur non trouvé' 
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Vérifier le code WhatsApp et activer le compte
 */
const verifyCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    console.log('🔐 Vérification du code pour:', email);

    if (!email || !code) {
      return res.status(400).json({
        message: 'Email et code de vérification requis',
        error: 'MISSING_FIELDS'
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier si le compte est déjà actif
    if (user.isActive) {
      return res.status(400).json({
        message: 'Ce compte est déjà activé',
        error: 'ACCOUNT_ALREADY_ACTIVE'
      });
    }

    // Vérifier le code
    if (!user.emailVerificationCode || user.emailVerificationCode !== code.trim()) {
      console.log(`❌ Code incorrect. Attendu: ${user.emailVerificationCode}, Reçu: ${code.trim()}`);
      return res.status(400).json({
        message: 'Code de vérification incorrect',
        error: 'INVALID_CODE'
      });
    }

    // Vérifier si le code n'est pas expiré
    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      return res.status(400).json({
        message: 'Code de vérification expiré. Veuillez demander un nouveau code.',
        error: 'CODE_EXPIRED'
      });
    }

    // Activer le compte
    const activatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerificationCode: null,
        emailVerificationExpiry: null,
        emailVerified: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        pseudo: true,
        phone: true,
        role: true,
        totalPoints: true,
        isActive: true,
        createdAt: true,
      }
    });

    // Envoyer une notification WhatsApp de confirmation
    try {
      await sendAccountActivatedWhatsApp(
        activatedUser.phone,
        activatedUser.firstName
      );
    } catch (whatsappError) {
      console.error('Erreur envoi WhatsApp:', whatsappError);
      // Ne pas bloquer l'activation si WhatsApp échoue
    }

    // Générer les tokens
    const accessToken = tokenService.signAccessToken({ userId: activatedUser.id });
    const refreshToken = tokenService.signRefreshToken({ userId: activatedUser.id });

    res.json({
      message: 'Compte activé avec succès',
      user: activatedUser,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renvoyer un nouveau code de vérification
 */
const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email requis' 
      });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier si le compte est déjà actif
    if (user.isActive) {
      return res.status(400).json({ 
        message: 'Ce compte est déjà activé' 
      });
    }

    // Générer un nouveau code de vérification
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Mettre à jour le code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationExpiry: verificationExpiry,
      }
    });

    // Envoyer le nouveau code par WhatsApp
    let whatsappSent = false;
    try {
      const whatsappResult = await sendVerificationCodeWhatsApp(
        user.phone,
        user.firstName,
        verificationCode
      );

      if (whatsappResult && whatsappResult.success) {
        console.log(`✅ Nouveau code de vérification envoyé à ${user.phone}`);
        whatsappSent = true;
      } else {
        console.warn(`⚠️ WhatsApp non envoyé: ${whatsappResult?.error || 'Erreur inconnue'}`);
        // Le code est toujours affiché dans les logs pour le débogage
        console.log(`📱 Nouveau code généré (logs uniquement): ${verificationCode}`);
      }
    } catch (whatsappError) {
      console.error('⚠️ Erreur envoi nouveau code WhatsApp:', whatsappError);
      // Le code est toujours affiché dans les logs pour le débogage
      console.log(`📱 Nouveau code généré (logs uniquement): ${verificationCode}`);
    }

    const responseMessage = whatsappSent
      ? 'Un nouveau code de vérification a été envoyé sur WhatsApp.'
      : 'Un nouveau code de vérification a été généré. Vérifiez votre WhatsApp.';

    // Ne pas inclure le code dans la réponse du resend (seulement dans les logs)
    // Le code initial de l'inscription est déjà affiché dans l'interface
    res.json({
      message: responseMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le mot de passe
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Tous les champs sont requis' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Les nouveaux mots de passe ne correspondent pas' 
      });
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        message: 'Mot de passe actuel incorrect' 
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({ 
      message: 'Mot de passe modifié avec succès' 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  verifyCode,
  resendVerificationCode,
  changePassword,
};

