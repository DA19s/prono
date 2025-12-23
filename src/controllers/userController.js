const bcrypt = require("bcryptjs");
const prisma = require("../config/prismaClient");
const tokenService = require("../services/tokenService");
const { sendInvitationEmail } = require("../services/emailService");

const SALT_ROUNDS = 10;


const createAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const { firstName, lastName, email, phone, password } = req.body ?? {};

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ 
        message: "Tous les champs sont obligatoires (prénom, nom, email, téléphone, mot de passe)." 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Le mot de passe doit contenir au moins 6 caractères." 
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: "Un compte avec cet email existe déjà." 
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Créer l'admin directement actif avec mot de passe
    const newAdmin = await prisma.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: hashedPassword,
        role: "ADMIN",
        isActive: true, // Admin actif directement
        emailVerified: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    res.status(201).json({
      message: "Administrateur créé avec succès",
      user: newAdmin
    });
  } catch (error) {
    next(error);
  }
};


const activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { token, password, confirmPassword } = req.body;

    if (!password || password !== confirmPassword) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || user.isActive) {
      return res.status(400).json({ message: "Activation invalide." });
    }

    if (!user.activationToken || user.activationToken !== token) {
      return res.status(400).json({ message: "Token d’activation invalide." });
    }

    if (user.activationExpires && user.activationExpires < new Date()) {
      return res.status(400).json({ message: "Token d’activation expiré." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        isActive: true,
        activationToken: null,
        activationExpires: null,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAdmin,
  activateUser
};
