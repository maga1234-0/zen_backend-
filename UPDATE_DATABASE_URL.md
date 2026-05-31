# 🔄 MISE À JOUR URL BASE DE DONNÉES

## 📊 NOUVELLE URL SUPABASE

Vous avez une nouvelle URL de base de données Supabase:

```
postgresql://postgres.vzzznyrlbhftixgkqcca:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**⚠️ IMPORTANT**: Remplacez `[YOUR-PASSWORD]` par votre vrai mot de passe Supabase!

---

## 🎯 OÙ METTRE À JOUR L'URL

### 1️⃣ Sur Render (PRODUCTION) ⭐ PRIORITAIRE

**C'est ici que vous devez mettre à jour en premier!**

#### Étapes:
1. Aller sur https://dashboard.render.com
2. Sélectionner votre service backend
3. Cliquer sur **"Environment"** dans le menu de gauche
4. Chercher la variable **`DATABASE_URL`**
5. Cliquer sur **"Edit"** (icône crayon)
6. Remplacer l'ancienne URL par la nouvelle:
   ```
   postgresql://postgres.vzzznyrlbhftixgkqcca:VOTRE_MOT_DE_PASSE@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   **⚠️ Remplacez `VOTRE_MOT_DE_PASSE` par votre vrai mot de passe!**
7. Cliquer **"Save Changes"**
8. Le service va automatiquement redémarrer (1-2 minutes)

---

### 2️⃣ Localement (DÉVELOPPEMENT)

Si vous développez en local, créez un fichier `.env` dans `zen_backend/`:

```bash
# zen_backend/.env
PORT=5000
NODE_ENV=development

DATABASE_URL="postgresql://postgres.vzzznyrlbhftixgkqcca:VOTRE_MOT_DE_PASSE@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173

GEMINI_API_KEY=AIzaSyB66Kz8X6oBTZQK0uD0SbduVrQjUvHl4Nk
```

**⚠️ Remplacez `VOTRE_MOT_DE_PASSE` par votre vrai mot de passe!**

---

## 🔍 COMMENT TROUVER VOTRE MOT DE PASSE SUPABASE

### Option 1: Vous l'avez déjà
Si vous avez noté votre mot de passe lors de la création du projet Supabase, utilisez-le.

### Option 2: Réinitialiser le mot de passe
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. **Settings** → **Database**
4. Section **"Database Password"**
5. Cliquer **"Reset Database Password"**
6. Copier le nouveau mot de passe
7. Mettre à jour sur Render

---

## ✅ VÉRIFICATION

### Test 1: Vérifier que Render a bien redémarré
1. Aller sur https://dashboard.render.com
2. Sélectionner votre service
3. Onglet **"Logs"**
4. Vérifier qu'il n'y a pas d'erreur de connexion à la base de données
5. Chercher un message comme: `✓ Database connected successfully`

### Test 2: Tester l'API
Ouvrir dans le navigateur:
```
https://votre-backend.onrender.com/api/health
```

**Résultat attendu**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Test 3: Tester une route spa
```
https://votre-backend.onrender.com/api/spa/services
```

**Résultat attendu**: `[]` (tableau vide, pas d'erreur)

---

## 🚨 SI ERREUR DE CONNEXION

### Erreur: "password authentication failed"
**Cause**: Mot de passe incorrect  
**Solution**: Vérifier que vous avez bien remplacé `[YOUR-PASSWORD]` par le vrai mot de passe

### Erreur: "could not connect to server"
**Cause**: URL incorrecte ou serveur Supabase inaccessible  
**Solution**: Vérifier que l'URL est exactement:
```
postgresql://postgres.vzzznyrlbhftixgkqcca:MOT_DE_PASSE@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### Erreur: "database does not exist"
**Cause**: Nom de base de données incorrect  
**Solution**: L'URL doit se terminer par `/postgres` (pas `/hotel_pms` ou autre)

---

## 📋 CHECKLIST COMPLÈTE

- [ ] Trouver le mot de passe Supabase
- [ ] Aller sur Render Dashboard
- [ ] Ouvrir Environment Variables
- [ ] Modifier DATABASE_URL
- [ ] Remplacer `[YOUR-PASSWORD]` par le vrai mot de passe
- [ ] Sauvegarder
- [ ] Attendre le redémarrage (1-2 min)
- [ ] Vérifier les logs (pas d'erreur)
- [ ] Tester l'API `/api/health`
- [ ] Tester l'API `/api/spa/services`

---

## 🎯 APRÈS LA MISE À JOUR

Une fois l'URL mise à jour sur Render:

1. **Le backend se connectera à la nouvelle base de données**
2. **Toutes les tables doivent être créées** (si pas déjà fait)
3. **Exécuter les scripts SQL** dans Supabase:
   - `database/schema.sql` (tables principales)
   - `database/spa-module.sql` (tables spa)
   - `database/restaurant-module.sql` (tables restaurant)
   - `database/online-booking-module.sql` (tables réservation en ligne)

---

## 📞 LIENS UTILES

- **Render Dashboard**: https://dashboard.render.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Guide Render**: `RENDER_DEPLOY_GUIDE.md`
- **Guide Supabase**: `SUPABASE_TABLES_GUIDE.md`

---

## ⏱️ TEMPS ESTIMÉ

| Action | Temps |
|--------|-------|
| Trouver mot de passe | 1 min |
| Mettre à jour sur Render | 2 min |
| Redémarrage automatique | 1-2 min |
| Vérification | 1 min |
| **TOTAL** | **5-6 min** |

---

**👉 PROCHAINE ACTION: Aller sur Render et mettre à jour DATABASE_URL!**

**C'est rapide et facile!** 🚀
