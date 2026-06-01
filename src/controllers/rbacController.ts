import { Request, Response } from 'express';
import pool from '../config/database';
import { getUserPermissions } from '../middleware/rbac';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============================================
// GESTION DES RÔLES
// ============================================

// Récupérer tous les rôles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, description, level, is_active
       FROM roles
       WHERE is_active = true
       ORDER BY level, name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer un rôle par ID
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT r.*, 
        (SELECT json_agg(json_build_object('id', p.id, 'code', p.code, 'name', p.name))
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = r.id
        ) as permissions
       FROM roles r
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer un nouveau rôle
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, code, description, level } = req.body;

    const result = await pool.query(
      `INSERT INTO roles (name, code, description, level)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, code, description, level]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create role error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Ce code de rôle existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour un rôle
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, level, is_active } = req.body;

    // Vérifier que ce n'est pas un rôle système
    const checkResult = await pool.query(
      'SELECT is_system_role FROM roles WHERE id = $1',
      [id]
    );

    if (checkResult.rows[0]?.is_system_role) {
      return res.status(403).json({ message: 'Impossible de modifier un rôle système' });
    }

    const result = await pool.query(
      `UPDATE roles
       SET name = $1, description = $2, level = $3, is_active = $4
       WHERE id = $5
       RETURNING *`,
      [name, description, level, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rôle non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES PERMISSIONS
// ============================================

// Récupérer toutes les permissions
export const getPermissions = async (req: Request, res: Response) => {
  try {
    const { module } = req.query;
    
    let query = 'SELECT * FROM permissions WHERE 1=1';
    const params: any[] = [];

    if (module) {
      params.push(module);
      query += ` AND module = $${params.length}`;
    }

    query += ' ORDER BY module, action, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les permissions par module
export const getPermissionsByModule = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT module, json_agg(json_build_object(
        'id', id,
        'code', code,
        'name', name,
        'action', action,
        'description', description
      )) as permissions
       FROM permissions
       GROUP BY module
       ORDER BY module`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get permissions by module error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES PERMISSIONS DE RÔLE
// ============================================

// Assigner des permissions à un rôle
export const assignPermissionsToRole = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    const userId = (req as AuthenticatedRequest).user?.id;

    await client.query('BEGIN');

    // Supprimer les permissions existantes
    await client.query(
      'DELETE FROM role_permissions WHERE role_id = $1',
      [roleId]
    );

    // Ajouter les nouvelles permissions
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map((permId: string, index: number) => 
        `($1, $${index + 2}, $${permissionIds.length + 2})`
      ).join(',');

      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, granted_by)
         VALUES ${values}`,
        [roleId, ...permissionIds, userId]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Permissions mises à jour avec succès' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign permissions error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

// Récupérer les permissions d'un rôle
export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    const result = await pool.query(
      `SELECT p.*
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.module, p.action`,
      [roleId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================
// GESTION DES RÔLES UTILISATEURS
// ============================================

// Assigner un rôle à un utilisateur
export const assignRoleToUser = async (req: Request, res: Response) => {
  try {
    const { userId, roleId, expiresAt } = req.body;
    const assignedBy = (req as AuthenticatedRequest).user?.id;

    const result = await pool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role_id) 
       DO UPDATE SET is_active = true, expires_at = $4
       RETURNING *`,
      [userId, roleId, assignedBy, expiresAt || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Retirer un rôle à un utilisateur
export const removeRoleFromUser = async (req: Request, res: Response) => {
  try {
    const { userId, roleId } = req.params;

    const result = await pool.query(
      `DELETE FROM user_roles
       WHERE user_id = $1 AND role_id = $2
       RETURNING *`,
      [userId, roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attribution non trouvée' });
    }

    res.json({ message: 'Rôle retiré avec succès' });
  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les rôles d'un utilisateur
export const getUserRoles = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT r.*, ur.assigned_at, ur.expires_at, ur.is_active
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       ORDER BY r.level`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer les permissions d'un utilisateur
export const getUserPermissionsEndpoint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const permissions = await getUserPermissions(userId);
    res.json({ permissions });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Vérifier si un utilisateur a une permission
export const checkUserPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { permission } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = $1
        AND p.code = $2
        AND ur.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
      ) as has_permission`,
      [userId, permission]
    );

    res.json({ 
      permission,
      hasPermission: result.rows[0]?.has_permission || false
    });
  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================
// LOGS D'ACCÈS
// ============================================

// Récupérer les logs d'accès
export const getAccessLogs = async (req: Request, res: Response) => {
  try {
    const { userId, status, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT al.*, u.email as user_email
      FROM access_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      params.push(userId);
      query += ` AND al.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND al.status = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND al.created_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND al.created_at <= $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get access logs error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
