# Vinea — Gestion d'église

Application de gestion d'église construite avec React + Vite, déployée sur **Vercel** et utilisant **Supabase** comme base de données.

## Stack technique

- **Frontend** : React 18 + TypeScript + Tailwind CSS
- **IA** : Google Gemini (via `@google/genai`)
- **Base de données** : Supabase (PostgreSQL)
- **Déploiement** : Vercel

## Installation locale

```bash
npm install
```

Créez un fichier `.env.local` à la racine :

```env
VITE_GEMINI_API_KEY=votre_cle_gemini
VITE_SUPABASE_URL=https://votre_projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

```bash
npm run dev
```

## Déploiement sur Vercel

1. Connectez votre repo GitHub à Vercel
2. Ajoutez les variables d'environnement dans **Settings → Environment Variables** :
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel détecte automatiquement Vite — aucune configuration supplémentaire

## Base de données Supabase

Le schéma SQL de l'application se trouve dans `schema.sql`. Exécutez-le dans l'éditeur SQL de votre projet Supabase pour initialiser les tables.

## Utiliser le client Supabase

```ts
import { supabase } from './lib/supabase';

const { data, error } = await supabase.from('members').select('*');
```
