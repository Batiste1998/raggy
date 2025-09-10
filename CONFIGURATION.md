# Configuration Multi-Domaines pour Raggy

## Vue d'ensemble

Raggy est maintenant un système RAG complètement générique qui peut être adapté à différents domaines simplement en modifiant les variables d'environnement. Plus besoin de modifier le code source pour changer de domaine d'activité.

## Variables d'Environnement

### Variables Obligatoires

```bash
# Configuration de base
SYSTEM_PROMPT="Description du rôle de l'assistant"
ASSISTANT_NAME="Nom de l'assistant"
ASSISTANT_ROLE="Rôle détaillé de l'assistant"
DOMAIN_SPECIFIC_RULES="Règles spécifiques au domaine"
```

### Variables Optionnelles

```bash
# Configuration avancée (si nécessaire)
MAX_FILE_SIZE_B=10485760
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=gemma3:latest
```

## Exemples de Configurations

### 1. Assistant Nutrition (Configuration par défaut)

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé en nutrition et bien-être. Répondez de manière professionnelle et bienveillante."
ASSISTANT_NAME="Oto"
ASSISTANT_ROLE="assistant virtuel spécialisé en nutrition et bien-être"
DOMAIN_SPECIFIC_RULES="NE FAIS AUCUNE RÉFÉRENCE aux cas spécifiques des documents. NE PRÉSENTE PAS les problèmes médicaux des documents comme étant ceux de l'utilisateur actuel. NE MENTIONNE PAS d'habitudes alimentaires des documents comme étant celles de l'utilisateur. BASE TA RÉPONSE UNIQUEMENT sur ce que l'utilisateur a réellement dit dans cette conversation. Si l'utilisateur n'a pas mentionné un problème de santé spécifique, ne l'invente pas. Utilise les documents SEULEMENT pour donner des conseils nutritionnels généraux."
```

### 2. Assistant Assurance

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé en assurances et services financiers. Répondez de manière professionnelle et sécurisante."
ASSISTANT_NAME="AssurBot"
ASSISTANT_ROLE="assistant virtuel spécialisé en assurances"
DOMAIN_SPECIFIC_RULES="Utilise les documents pour fournir des informations sur les contrats d'assurance, les garanties et les démarches administratives. NE DONNE PAS de conseils juridiques. REDIRIGE vers un conseiller pour les situations complexes."
```

### 3. Support Technique

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé dans le support technique et la résolution de problèmes informatiques."
ASSISTANT_NAME="TechHelper"
ASSISTANT_ROLE="assistant virtuel spécialisé en support technique"
DOMAIN_SPECIFIC_RULES="Utilise les documents pour diagnostiquer les problèmes techniques et proposer des solutions. GUIDE l'utilisateur étape par étape. RECOMMANDE de contacter le support si le problème persiste."
```

### 4. Commercial/Ventes

```bash
SYSTEM_PROMPT="Vous êtes un assistant virtuel spécialisé dans les ventes et le conseil commercial."
ASSISTANT_NAME="SalesBot"
ASSISTANT_ROLE="assistant virtuel commercial"
DOMAIN_SPECIFIC_RULES="Utilise les documents pour présenter les produits et services. METS en avant les avantages et bénéfices. GUIDE vers la conclusion de vente de manière naturelle."
```

## Comment Changer de Domaine

### Modification simple du fichier .env

1. Ouvrez votre fichier `.env`
2. Modifiez les variables suivantes selon votre domaine :
   - `SYSTEM_PROMPT` : Description du rôle de l'assistant
   - `ASSISTANT_NAME` : Nom de l'assistant
   - `ASSISTANT_ROLE` : Rôle détaillé de l'assistant
   - `DOMAIN_SPECIFIC_RULES` : Règles spécifiques au domaine
3. Redémarrez l'application avec `npm run start:dev`

## Structure des Règles de Domaine

Les `DOMAIN_SPECIFIC_RULES` doivent inclure :

1. **Instructions générales** : Comment utiliser les documents
2. **Limitations** : Ce qu'il ne faut PAS faire
3. **Comportements spécifiques** : Comment répondre dans ce domaine
4. **Actions recommandées** : Quand rediriger ou contacter un humain

## Bonnes Pratiques

### 1. Cohérence du Ton

- Adaptez le `SYSTEM_PROMPT` au domaine
- Maintenez un ton professionnel approprié
- Utilisez un langage adapté à votre public cible

### 2. Sécurité et Conformité

- Évitez les conseils dans les domaines réglementés
- Incluez des disclaimers appropriés
- Redirigez vers des experts quand nécessaire

### 3. Personnalisation

- Choisissez un nom d'assistant mémorable
- Adaptez le rôle à votre domaine
- Personnalisez les règles selon vos besoins

## Test de Configuration

Après avoir changé de configuration, testez :

1. **Message de bienvenue** : Vérifiez qu'il présente correctement l'assistant
2. **Réponses RAG** : Assurez-vous qu'elles respectent les règles du domaine
3. **Cohérence** : Vérifiez que le ton et le style sont appropriés

## Déploiement Multi-Domaines

Pour déployer plusieurs instances :

1. Créez un répertoire par domaine
2. Copiez le code source dans chaque répertoire
3. Utilisez des fichiers `.env` différents
4. Configurez des ports différents si nécessaire
5. Utilisez des bases de données séparées si requis

Cette approche permet de maintenir un seul codebase tout en servant différents domaines avec des configurations spécifiques.</content>
</xai:function_call">  
<xai:function_call name="bash">
<parameter name="command">npm run lint
