// src/utils/translations.js
// French-only translations for the UI.
// All keys used anywhere in the app are defined here to avoid undefined fallbacks.

export const translations = {
  fr: {
    // Onboarding
    onboarding_title: "Quel examen vas-tu conquérir ?",
    onboarding_subtitle: "Choisis ton parcours. On s'occupe du reste.",
    track_9af: "9ème AF",
    track_ns4: "Nouveau Secondaire IV",

    // Home
    daily_mission: "Missions du jour",
    leaderboard: "Classement",
    countdown_prefix: "Le compte à rebours est lancé.",
    countdown_question: "Tu es prêt à donner le meilleur de toi ?",
    master_formulas: "Maîtrise 2 formules",

    // Scan
    scan_capture: "Cadrer l'exercice",
    scan_solving: "Résolution en cours...",
    scan_understand_question: "Je comprends pas, explique-moi",
    scan_new_problem: "Nouveau",

    // Classroom
    classroom_title: "Salle de classe",
    classroom_subtitle: "Pose tes questions au prof",
    classroom_empty_title: "Ta salle de classe est vide",
    classroom_empty_subtitle: "Scanne un exercice ou démarre une conversation",
    classroom_understand: "Oui, je comprends",
    classroom_not_understand: "Non, explique encore",
    classroom_listen: "Écouter",
    classroom_stop: "Arrêter",

    // Quiz
    quiz_title: "Quiz d'examen",
    quiz_choose_subject: "Choisis une matière",
    quiz_no_questions: "Pas encore généré",
    quiz_validate: "Valider",
    quiz_next: "Question suivante",
    quiz_see_results: "Voir les résultats",
    quiz_redo: "Refaire le quiz",
    quiz_other_subject: "Choisir une autre matière",
    quiz_excellent: "Excellent !",
    quiz_not_bad: "Pas mal",
    quiz_keep_working: "Continue à travailler",
    quiz_explanation: "Explication",
    quiz_trap: "Piège typique",

    // Profile
    profile_personality: "Personnalité du prof",
    profile_language: "Langue de discussion",
    profile_plan: "Plan d'abonnement",
    profile_settings: "Paramètres",
    profile_theme_dark: "Thème sombre",
    profile_theme_light: "Thème clair",
    profile_toggle_theme: "Toucher pour basculer",
    profile_reset: "Réinitialiser tout",
    profile_reset_subtitle: "Recommencer depuis zéro",
    profile_upgrade: "Passer en Premium",
    profile_upgrade_subtitle: "Scans, chats, voix HD illimités",

    // Reviser
    reviser_title: "Réviser",
    reviser_subtitle: "Choisis une matière, le prof t'aide à réviser",
    reviser_start: "Commencer",
    reviser_tip_title: "💡 Astuce",
    reviser_tip_body:
      "Pose des questions précises comme \"Explique-moi le théorème de Pythagore\" ou \"Fais-moi un schéma du système solaire\".",

    // Paywall
    paywall_title: "Débloque tout le potentiel",
    paywall_subtitle: "Le MENFP arrive vite. Prépare-toi sans limites.",
    paywall_plan_basic: "Basic",
    paywall_plan_premium: "Premium",
    paywall_per_month: "HTG / mois",
    paywall_pay_title: "Paiement",
    paywall_send_to: "Envoie",
    paywall_to_one_number: "à l'un de ces numéros",
    paywall_copy: "Copier",
    paywall_tx_id_label: "ID de transaction",
    paywall_tx_id_placeholder: "Ex: 12345678 ou ABC123XYZ",
    paywall_activate: "Activer mon plan",
    paywall_important: "Important",
    paywall_important_body:
      "Après avoir payé, tu recevras un SMS avec un ID de transaction. Colle cet ID ci-dessous pour activer ton plan.",

    // Errors / common
    error_no_internet: "Pas de connexion internet. Réessaye.",
    error_unclear_image: "L'image n'est pas assez claire. Reprends la photo.",
    error_server: "Erreur. Réessaye dans un moment.",
    button_retry: "Réessayer",
    button_back: "Retour",
    button_continue: "Continuer",
    button_cancel: "Annuler",
    button_save: "Enregistrer",
    button_delete: "Supprimer",
    loading: "Chargement...",

    // Tutor greetings (used as fallbacks)
    tutor_greeting_with_name: "Bonjou {name} ! Ki sa ou vle nou travay ansanm jodi a ?",
    tutor_greeting: "Bonjou ! M se pwofesè ou a. Ki pwoblèm ou vle nou travay ?",
  },
};
