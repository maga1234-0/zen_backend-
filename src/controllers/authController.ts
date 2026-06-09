import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateResetCode, sendPasswordResetCode } from '../services/emailService';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt for:', email);

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email, '- Role:', user.role, '- Active:', user.is_active);

    if (!user.is_active) {
      console.log('❌ Account deactivated:', email);
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const responseData = {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    };

    console.log('✅ Login successful for:', email, '- Sending response');
    res.json(responseData);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, phone, role FROM users WHERE id = $1',
      [req.user?.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all available roles from the database
 */
export const getRoles = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_active 
       FROM roles 
       WHERE is_active = true 
       ORDER BY 
         CASE name
           WHEN 'admin' THEN 1
           WHEN 'manager' THEN 2
           WHEN 'receptionist' THEN 3
           WHEN 'housekeeping' THEN 4
           WHEN 'maintenance' THEN 5
           WHEN 'accountant' THEN 6
           ELSE 99
         END,
         name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Request password reset - Send verification code by email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email est requis' });
    }

    console.log('🔐 Password reset requested for:', email);

    // Vérifier si l'utilisateur existe
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Pour la sécurité, on ne dit pas si l'email existe ou non
      console.log('⚠️ Email not found, but sending success response for security');
      return res.json({ 
        message: 'Si cet email existe, un code de vérification a été envoyé.',
        success: true 
      });
    }

    const user = userResult.rows[0];

    // Générer un code à 6 chiffres
    const code = generateResetCode();

    // Calculer l'expiration (15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Stocker le code dans la base de données
    await pool.query(
      `INSERT INTO password_reset_codes (user_id, email, code, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, email, code, expiresAt]
    );

    // Envoyer l'email
    const emailSent = await sendPasswordResetCode(
      email,
      code,
      `${user.first_name} ${user.last_name}`
    );

    if (!emailSent) {
      console.error('❌ Failed to send reset email');
      return res.status(500).json({ 
        message: 'Erreur lors de l\'envoi de l\'email',
        success: false 
      });
    }

    console.log('✅ Reset code sent to:', email);
    res.json({ 
      message: 'Un code de vérification a été envoyé à votre email.',
      success: true 
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Verify reset code
 */
export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email et code requis' });
    }

    console.log('🔍 Verifying reset code for:', email);

    // Chercher un code valide (non utilisé et non expiré)
    const result = await pool.query(
      `SELECT id, user_id, code, expires_at, used_at 
       FROM password_reset_codes 
       WHERE email = $1 AND code = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, code]
    );

    if (result.rows.length === 0) {
      console.log('❌ Invalid code for:', email);
      return res.status(400).json({ 
        message: 'Code invalide',
        valid: false 
      });
    }

    const resetCode = result.rows[0];

    // Vérifier si déjà utilisé
    if (resetCode.used_at) {
      console.log('❌ Code already used');
      return res.status(400).json({ 
        message: 'Ce code a déjà été utilisé',
        valid: false 
      });
    }

    // Vérifier si expiré
    const now = new Date();
    const expiresAt = new Date(resetCode.expires_at);
    if (now > expiresAt) {
      console.log('❌ Code expired');
      return res.status(400).json({ 
        message: 'Ce code a expiré. Demandez un nouveau code.',
        valid: false 
      });
    }

    console.log('✅ Code verified successfully');
    res.json({ 
      message: 'Code valide',
      valid: true,
      userId: resetCode.user_id 
    });

  } catch (error) {
    console.error('❌ Verify code error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Reset password with verified code
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }

    console.log('🔄 Resetting password for:', email);

    // Vérifier le code une dernière fois
    const codeResult = await pool.query(
      `SELECT id, user_id, expires_at, used_at 
       FROM password_reset_codes 
       WHERE email = $1 AND code = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ message: 'Code invalide' });
    }

    const resetCode = codeResult.rows[0];

    if (resetCode.used_at) {
      return res.status(400).json({ message: 'Ce code a déjà été utilisé' });
    }

    const now = new Date();
    const expiresAt = new Date(resetCode.expires_at);
    if (now > expiresAt) {
      return res.status(400).json({ message: 'Ce code a expiré' });
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetCode.user_id]
    );

    // Marquer le code comme utilisé
    await pool.query(
      'UPDATE password_reset_codes SET used_at = NOW() WHERE id = $1',
      [resetCode.id]
    );

    console.log('✅ Password reset successful for:', email);
    res.json({ 
      message: 'Mot de passe réinitialisé avec succès',
      success: true 
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
