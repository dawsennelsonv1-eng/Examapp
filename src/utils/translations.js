// src/utils/translations.js
// Central dictionary. Every UI string flows through useTranslation(key).

export const translations = {
  fr: {
    // Onboarding
    onboarding_title: "Quel examen vas-tu conquérir ?",
    onboarding_subtitle: "Choisis ton parcours. On s'occupe du reste.",
    track_9af: "9ème AF",
    track_ns4: "Nouveau Secondaire IV",

    // Tabs
    tab_home: "Accueil",
    tab_scan: "Scanner",
    tab_quiz: "Quiz",
    tab_vault: "Archives",
    tab_social: "Sc. Sociales",

    // Home
    countdown_prefix: "Tu es à l'examen du 17 juillet.",
    countdown_question: "Que répondrais-tu ?",
    countdown_asked: "Voici ce qu'ils ont demandé en",
    daily_mission: "Mission du jour",
    master_formulas: "Maîtrise ces formules aujourd'hui",
    leaderboard: "Classement anonyme",

    // Scan & Solve
    scan_title: "Scanner un problème",
    scan_placeholder: "Pointe la caméra sur ton exercice",
    scan_capture: "Capturer",
    scan_upload: "Importer une photo",
    solution_heading: "Solution pas à pas",
    unblur_next: "Débloquer l'étape suivante",
    see_all: "Voir toute la solution",
    explain_differently: "Explique-moi autrement",
    hypothese: "Hypothèse",
    formule: "Formule",
    resolution: "Résolution",
    audio_listen: "Écouter l'explication",
    audio_stop: "Arrêter",

    // Quiz
    quiz_submit: "Valider",
    quiz_next: "Suivant",
    tested_in: "Cette question a été testée à l'examen de",
    view_original: "Voir l'original",
    cheat_sheet: "Révision de dernière minute",

    // Vault
    past_exams: "Anciens examens",
    trap_detector: "Détecteur de pièges",
    mind_body: "Corps & Esprit",

    // Common
    loading: "Chargement...",
    error_generic: "Une erreur est survenue. Réessaie.",
    offline_mode: "Mode hors ligne",
  },
  ht: {
    // Onboarding
    onboarding_title: "Ki egzamen w ap kraze ?",
    onboarding_subtitle: "Chwazi wout ou. Nou okipe rès la.",
    track_9af: "9èm AF",
    track_ns4: "Nouvo Segondè IV",

    // Tabs
    tab_home: "Akèy",
    tab_scan: "Skane",
    tab_quiz: "Kwiz",
    tab_vault: "Achiv",
    tab_social: "Sy. Sosyal",

    // Home
    countdown_prefix: "Ou nan egzamen 17 jiyè a.",
    countdown_question: "Kisa w t ap reponn ?",
    countdown_asked: "Men sa yo te mande nan",
    daily_mission: "Misyon jou a",
    master_formulas: "Metrize fòmil sa yo jodi a",
    leaderboard: "Klasman anonim",

    // Scan & Solve
    scan_title: "Skane yon pwoblèm",
    scan_placeholder: "Pwente kamera a sou egzèsis ou",
    scan_capture: "Pran foto",
    scan_upload: "Chaje yon foto",
    solution_heading: "Solisyon etap pa etap",
    unblur_next: "Dekouvri pwochèn etap",
    see_all: "Wè tout solisyon an",
    explain_differently: "Eksplike m sa yon lòt jan",
    hypothese: "Ipotèz",
    formule: "Fòmil",
    resolution: "Rezolisyon",
    audio_listen: "Eksplike m sa",
    audio_stop: "Rete",

    // Quiz
    quiz_submit: "Valide",
    quiz_next: "Pwochen",
    tested_in: "Kesyon sa a te parèt nan egzamen",
    view_original: "Wè orijinal la",
    cheat_sheet: "Revizyon dènye minit",

    // Vault
    past_exams: "Ansyen egzamen",
    trap_detector: "Detektè pyèj",
    mind_body: "Kò & Lespri",

    // Common
    loading: "K ap chaje...",
    error_generic: "Gen yon pwoblèm. Eseye ankò.",
    offline_mode: "San entènèt",
  },
};

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "ht", label: "Kreyòl" },
];
