import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';

/**
 * Middleware pour vérifier les permissions RBAC
 * Utilise le système de permissions JSONB dans la table roles
 */

interface Permission {
  [key: string]: string[] | Permission;
}

/**
 * Vérifie si l'utilisateur a la permission requise
 * @param userPermissions - Objet permissions de l'utilisateur (JSONB)
 * @param resource - Resource (ex: "restaurant.orders")
 * @param action - Action (ex: "create", "read", "update", "delete")
 */
function hasPermission(
  userPermissions: Permission | undefined,
  resource: string,
  action: string
): boolean {
  if (!userPermissions) return false;

  // Split resource path (ex: "restaurant.orders" => ["restaurant", "orders"])
  const parts = resource.split('.');
  let current: Permission | string[] = userPermissions;

  // Navigate through the permission object
  for (const part of parts) {
    if (Array.isArray(current)) {
      return false; // We reached an array before the end
    }
    if (!current[part]) {
      return false; // Path doesn't exist
    }
    current = current[part];
  }

  // At the end, current should be an array of actions
  if (!Array.isArray(current)) {
    return false;
  }

  // Check if the action is in the array
  return current.includes(action);
}

/**
 * Middleware factory pour vérifier une permission spécifique
 * Usage: router.post('/orders', checkPermission('restaurant.orders', 'create'), createOrder)
 */
export const checkPermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Récupérer le rôle de l'utilisateur directement depuis la colonne role
      const result = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Utilisateur non trouvé' });
      }

      const roleName = result.rows[0].role;

      // Admin et manager ont tous les droits
      if (roleName === 'admin' || roleName === 'manager') {
        return next();
      }

      // Définir les permissions en dur pour les rôles restaurant
      const restaurantPermissions: Record<string, Record<string, string[]>> = {
        restaurant_server: {
          'restaurant.orders': ['read', 'create'],
          'restaurant.menu': ['read'],
          'restaurant.tables': ['read'],
          'restaurant.print': ['tickets']
        },
        restaurant_cashier: {
          'restaurant.orders': ['read', 'update_payment'],
          'restaurant.menu': ['read'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.print': ['invoices']
        },
        restaurant_manager: {
          'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment'],
          'restaurant.menu': ['read', 'create', 'update', 'delete'],
          'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
          'restaurant.reservations': ['read', 'create', 'update', 'delete'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.stats': ['read'],
          'restaurant.print': ['tickets', 'invoices']
        },
        restaurant_chef: {
          'restaurant.orders': ['read', 'update_status'],
          'restaurant.menu': ['read'],
          'restaurant.stats': ['read_production'],
          'restaurant.print': ['tickets']
        }
      };

      // Vérifier si le rôle a la permission
      const rolePerms = restaurantPermissions[roleName];
      if (!rolePerms) {
        return res.status(403).json({ 
          message: 'Rôle non autorisé',
          role: roleName
        });
      }

      const resourcePerms = rolePerms[resource];
      if (!resourcePerms || !resourcePerms.includes(action)) {
        return res.status(403).json({ 
          message: 'Permission refusée',
          required: `${resource}.${action}`,
          role: roleName
        });
      }

      // Permission accordée
      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
    }
  };
};

/**
 * Middleware pour vérifier si l'utilisateur a AU MOINS UNE des permissions requises
 * Usage: router.get('/orders', checkAnyPermission([
 *   ['restaurant.orders', 'read'],
 *   ['restaurant.orders', 'update']
 * ]), getOrders)
 */
export const checkAnyPermission = (permissionPairs: [string, string][]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Récupérer le rôle de l'utilisateur directement depuis la colonne role
      const result = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Utilisateur non trouvé' });
      }

      const roleName = result.rows[0].role;

      // Admin et manager ont tous les droits
      if (roleName === 'admin' || roleName === 'manager') {
        return next();
      }

      // Définir les permissions en dur pour les rôles restaurant
      const restaurantPermissions: Record<string, Record<string, string[]>> = {
        restaurant_server: {
          'restaurant.orders': ['read', 'create'],
          'restaurant.menu': ['read'],
          'restaurant.tables': ['read'],
          'restaurant.print': ['tickets']
        },
        restaurant_cashier: {
          'restaurant.orders': ['read', 'update_payment'],
          'restaurant.menu': ['read'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.print': ['invoices']
        },
        restaurant_manager: {
          'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment'],
          'restaurant.menu': ['read', 'create', 'update', 'delete'],
          'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
          'restaurant.reservations': ['read', 'create', 'update', 'delete'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.stats': ['read'],
          'restaurant.print': ['tickets', 'invoices']
        },
        restaurant_chef: {
          'restaurant.orders': ['read', 'update_status'],
          'restaurant.menu': ['read'],
          'restaurant.stats': ['read_production'],
          'restaurant.print': ['tickets']
        }
      };

      // Vérifier si le rôle a au moins une des permissions
      const rolePerms = restaurantPermissions[roleName];
      if (!rolePerms) {
        return res.status(403).json({ 
          message: 'Rôle non autorisé',
          role: roleName
        });
      }

      const hasAnyPermission = permissionPairs.some(([resource, action]) => {
        const resourcePerms = rolePerms[resource];
        return resourcePerms && resourcePerms.includes(action);
      });

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          message: 'Permission refusée',
          required_any: permissionPairs.map(([r, a]) => `${r}.${a}`),
          role: roleName
        });
      }

      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification des permissions' });
    }
  };
};

/**
 * Middleware pour vérifier l'ownership d'une ressource
 * Usage: Pour permettre à un serveur de modifier seulement SES commandes
 */
export const checkOwnership = (
  resource: string,
  action: string,
  ownershipCheck: (req: AuthRequest) => Promise<boolean>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      // Récupérer le rôle de l'utilisateur directement depuis la colonne role
      const result = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Utilisateur non trouvé' });
      }

      const roleName = result.rows[0].role;

      // Admin et manager ont tous les droits
      if (roleName === 'admin' || roleName === 'manager') {
        return next();
      }

      // Définir les permissions en dur pour les rôles restaurant
      const restaurantPermissions: Record<string, Record<string, string[]>> = {
        restaurant_server: {
          'restaurant.orders': ['read', 'create', 'update_own'],
          'restaurant.menu': ['read'],
          'restaurant.tables': ['read'],
          'restaurant.print': ['tickets']
        },
        restaurant_cashier: {
          'restaurant.orders': ['read', 'update_payment'],
          'restaurant.menu': ['read'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.print': ['invoices']
        },
        restaurant_manager: {
          'restaurant.orders': ['read', 'create', 'update', 'update_status', 'update_payment', 'update_own'],
          'restaurant.menu': ['read', 'create', 'update', 'delete'],
          'restaurant.tables': ['read', 'create', 'update', 'delete', 'update_status'],
          'restaurant.reservations': ['read', 'create', 'update', 'delete'],
          'restaurant.payments': ['create', 'refund'],
          'restaurant.stats': ['read'],
          'restaurant.print': ['tickets', 'invoices']
        },
        restaurant_chef: {
          'restaurant.orders': ['read', 'update_status'],
          'restaurant.menu': ['read'],
          'restaurant.stats': ['read_production'],
          'restaurant.print': ['tickets']
        }
      };

      // Vérifier la permission de base
      const actionToCheck = action === 'update_own' ? 'update_own' : action;
      
      const rolePerms = restaurantPermissions[roleName];
      if (!rolePerms) {
        return res.status(403).json({ 
          message: 'Rôle non autorisé',
          role: roleName
        });
      }

      const resourcePerms = rolePerms[resource];
      if (!resourcePerms || !resourcePerms.includes(actionToCheck)) {
        return res.status(403).json({ 
          message: 'Permission refusée',
          required: `${resource}.${actionToCheck}`,
          role: roleName
        });
      }

      // Si action est "update_own", vérifier l'ownership
      if (action === 'update_own') {
        const isOwner = await ownershipCheck(req);
        if (!isOwner) {
          return res.status(403).json({ 
            message: 'Vous ne pouvez modifier que vos propres ressources',
            role: roleName
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error checking ownership:', error);
      return res.status(500).json({ message: 'Erreur serveur lors de la vérification de l\'ownership' });
    }
  };
};
