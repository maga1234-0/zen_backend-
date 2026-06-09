"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const rbacController_1 = require("../controllers/rbacController");
const router = (0, express_1.Router)();
// Toutes les routes nécessitent une authentification
router.use(auth_1.authenticate);
// ============================================
// ROUTES - RÔLES
// ============================================
// Récupérer tous les rôles
router.get('/roles', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getRoles);
// Récupérer un rôle par ID
router.get('/roles/:id', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getRoleById);
// Créer un nouveau rôle
router.post('/roles', (0, rbac_1.checkPermission)('user.role.manage'), rbacController_1.createRole);
// Mettre à jour un rôle
router.put('/roles/:id', (0, rbac_1.checkPermission)('user.role.manage'), rbacController_1.updateRole);
// ============================================
// ROUTES - PERMISSIONS
// ============================================
// Récupérer toutes les permissions
router.get('/permissions', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getPermissions);
// Récupérer les permissions par module
router.get('/permissions/by-module', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getPermissionsByModule);
// ============================================
// ROUTES - PERMISSIONS DE RÔLE
// ============================================
// Récupérer les permissions d'un rôle
router.get('/roles/:roleId/permissions', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getRolePermissions);
// Assigner des permissions à un rôle
router.post('/roles/:roleId/permissions', (0, rbac_1.checkPermission)('user.role.manage'), rbacController_1.assignPermissionsToRole);
// ============================================
// ROUTES - RÔLES UTILISATEURS
// ============================================
// Récupérer les rôles d'un utilisateur
router.get('/users/:userId/roles', (0, rbac_1.checkPermission)('user.read'), rbacController_1.getUserRoles);
// Assigner un rôle à un utilisateur
router.post('/users/roles', (0, rbac_1.checkPermission)('user.role.manage'), rbacController_1.assignRoleToUser);
// Retirer un rôle à un utilisateur
router.delete('/users/:userId/roles/:roleId', (0, rbac_1.checkPermission)('user.role.manage'), rbacController_1.removeRoleFromUser);
// Récupérer les permissions de l'utilisateur connecté
router.get('/me/permissions', rbacController_1.getUserPermissionsEndpoint);
// Vérifier si l'utilisateur a une permission
router.get('/me/permissions/:permission', rbacController_1.checkUserPermission);
// ============================================
// ROUTES - LOGS D'ACCÈS
// ============================================
// Récupérer les logs d'accès (admin uniquement)
router.get('/access-logs', (0, rbac_1.checkRole)(['super_admin', 'hotel_manager']), rbacController_1.getAccessLogs);
exports.default = router;
