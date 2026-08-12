// Hebrew strings dictionary - all UI copy in one place
// Access: he.button.save, he.page.login.title, etc.

export const he = {
  // Brand
  brand: {
    name: 'רכבת ישראל',
    appName: 'ניהול משמרות פקחים',
  },

  // Common UI
  button: {
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',
    back: 'חזור',
    next: 'הבא',
    submit: 'שלח',
    login: 'התחבר',
    logout: 'התנתק',
    register: 'הרשם',
    close: 'סגור',
  },
  
  // Auth
  auth: {
    login: 'התחברות',
    loginSubtitle: 'הכנס את פרטיך',
    workerNumber: 'מספר עובד',
    workerNumberSubtitle: 'הכנס את מספר העובד שלך כדי להתחבר',
    continueButton: 'המשך',
    registerTitle: 'רישום עובד',
    registerSubtitle: 'זו הפעם הראשונה שלך - השלם את הפרטים כדי להתחבר',
    email: 'כתובת דוא"ל',
    sendCode: 'שלח קוד אימות',
    emailOtp: 'קוד אימות',
    emailOtpSent: 'קוד נשלח לדוא"ל שלך',
    verifyOtp: 'אמת קוד',
    invalidOtp: 'קוד שגוי',
    otpCooldown: 'נשלח קוד לאחרונה, נסה שוב בעוד רגע',
    phone: 'מספר טלפון',
    phoneOtp: 'קוד OTP',
    phoneOtpSent: 'קוד נשלח למספרך',
    resendOtp: 'שלח קוד שוב',
    password: 'סיסמה',
    passwordConfirm: 'אימות סיסמה',
    invalidCredentials: 'פרטים שגויים',
    sessionExpired: 'ההפעלה פקעה, התחבר שוב',
  },

  // Onboarding
  onboarding: {
    title: 'רישום עובד',
    step1Title: 'פרטים אישיים',
    step2Title: 'מיקום',
    step3Title: 'פרטי עבודה',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    city: 'עיר',
    selectCity: 'בחר עיר',
    workerNumber: 'מספר עובד',
    welcomeMessage: 'ברוכים הבאים למערכת ניהול משמרות',
  },

  // Dashboard
  dashboard: {
    myShift: 'המשמרת שלי',
    nextShift: 'המשמרת הבאה',
    shiftStartsAt: 'הקצר מתחיל ב-',
    shiftEndsAt: 'הקצר מסתיים ב-',
    replacement: 'מכסה בזמנך',
    teamStatus: 'סטטוס הצוות',
    onShift: 'בשירות',
    onHoliday: 'בחופשה',
    onSickLeave: 'בהיעדרות מחלה',
    offline: 'לא זמין',
    upcomingRoster: 'מי בתורנות הקרובה',
    nextUp: 'הבא בתור',
    locationUnknown: 'מיקום לא עודכן',
    contactViaWhatsapp: 'צור קשר בוואטסאפ',
    reportIncident: 'דווח על תקרית',
    noUpcomingShifts: 'אין משמרות קרובות',
    requestCoverage: 'אני לא יכול/ה להגיע למשמרת',
    coverageRequestPending: 'ממתין לאישור ראש הצוות',
    cancelCoverageRequest: 'בטל בקשה',
    coveringForTitle: 'אתה מכסה משמרות',
    coveringForSubtitle: 'עבור',
  },

  // Incidents
  incident: {
    reportTitle: 'דווח על תקרית',
    reportDescription: 'תאר את התקרית',
    reportSeverity: 'חומרת הבעיה',
    severityLow: 'נמוכה',
    severityNormal: 'רגילה',
    severityHigh: 'גבוהה',
    severityCritical: 'קריטית',
    incidentSent: 'התקרית נשלחה למנהל הצוות',
    incidentHistory: 'היסטוריית תקריות',
    status: 'סטטוס',
    statusOpen: 'פתוח',
    statusAcknowledged: 'התקבל',
    statusResolved: 'סגור',
    reportRoute: 'סוג התקרית',
    routeTeamLead: 'תקלה רגילה',
    routeMaintenance: 'תקלה ברכבת (למחלקת אחזקה)',
    routeEmergency: 'אירוע חירום',
    routeMaintenanceBadge: 'אחזקה',
    routeEmergencyBadge: 'חירום',
  },

  // Team Lead
  teamLead: {
    teamDashboard: 'לוח בקרה',
    teamMembers: 'חברי הצוות',
    shiftsCoverage: 'כיסוי משמרות',
    incidents: 'תקריות',
    incidentsNew: 'תקריות חדשות',
    viewDetails: 'צפה בפרטים',
    acknowledgeIncident: 'אשר קבלה',
    resolveIncident: 'סגור תקרית',
    contactWorker: 'צור קשר',
    noOpenIncidents: 'אין תקריות פתוחות',
    pendingCoverageRequests: 'בקשות כיסוי ממתינות',
    noPendingCoverageRequests: 'אין בקשות כיסוי ממתינות',
    viewCoverageApprovals: 'לניהול בקשות כיסוי',
  },

  // Coverage requests (worker asks not to work a shift; team lead decides)
  coverage: {
    requestTitle: 'בקשת כיסוי משמרת',
    reason: 'סיבה',
    reasonSick: 'מחלה',
    reasonHoliday: 'חופשה',
    reasonSwap: 'החלפה',
    reasonOther: 'אחר',
    note: 'הערה',
    noteRequired: 'נדרשת הערה עבור סיבה אחר',
    proposeReplacement: 'הצע מי יכסה (אופציונלי)',
    proposeReplacementPlaceholder: 'בחר עמית מהצוות',
    noProposal: 'לא נבחר - ראש הצוות יבחר',
    submitRequest: 'שלח בקשה',
    requestSent: 'הבקשה נשלחה לראש הצוות',
    requestCancelled: 'הבקשה בוטלה',
    shiftTooCloseToRequest: 'לא ניתן לבקש כיסוי למשמרת שכבר התחילה',
    approvalsTitle: 'בקשות כיסוי',
    approve: 'אשר',
    reject: 'דחה',
    approveWithReplacement: 'אשר עם',
    chooseReplacement: 'בחר מי יכסה',
    decisionNote: 'הערה (אופציונלי)',
    requestApproved: 'הבקשה אושרה',
    requestRejected: 'הבקשה נדחתה',
    directAssignTitle: 'שיבוץ כיסוי ישיר',
    directAssignSubtitle: 'בחר משמרת וקבע מי יכסה אותה, ללא צורך בבקשה',
    assign: 'שבץ',
    clearReplacement: 'הסר כיסוי',
    replacementAssigned: 'הכיסוי עודכן',
    requestedBy: 'התבקש על ידי',
    noPendingRequests: 'אין בקשות כיסוי ממתינות',
    errors: {
      shift_not_found: 'המשמרת לא נמצאה',
      not_your_shift: 'ניתן לבקש כיסוי רק למשמרת שלך',
      shift_already_started: 'לא ניתן לבקש כיסוי למשמרת שכבר התחילה',
      request_already_pending: 'כבר קיימת בקשת כיסוי ממתינה למשמרת זו',
      invalid_proposed_replacement: 'העמית שהוצע אינו זמין להצעה זו',
      not_authorized: 'אין הרשאה לבצע פעולה זו',
      request_not_pending: 'הבקשה כבר טופלה',
      not_your_request: 'ניתן לבטל רק בקשה שלך',
      replacement_required: 'יש לבחור מי יכסה את המשמרת',
      invalid_replacement: 'לא ניתן לשבץ את המשתמש שנבחר ככיסוי',
      cannot_replace_self: 'לא ניתן לשבץ עובד לכסות את המשמרת של עצמו',
      replacement_has_overlapping_shift: 'לעובד שנבחר יש כבר משמרת חופפת בזמן זה',
    },
  },

  // Maintenance (מחלקת אחזקה)
  maintenance: {
    dashboardTitle: 'תקלות ציוד',
    noOpenIncidents: 'אין תקלות ציוד פתוחות',
  },

  // Admin
  admin: {
    adminPanel: 'ניהול מערכת',
    uploadSchedule: 'העלה לוח זמנים',
    selectFile: 'בחר קובץ',
    uploadFile: 'העלה קובץ',
    fileUploaded: 'הקובץ הועלה בהצלחה',
    schedulePreview: 'תצוגה מקדימה של לוח הזמנים',
    confirmImport: 'אשר ייבוא',
    importSuccess: 'לוח הזמנים יובא בהצלחה',
    importFailed: 'ייבוא נכשל',
    manageTeams: 'ניהול צוותים',
    manageWorkers: 'ניהול עובדים',
    addTeam: 'הוסף צוות',
    addWorker: 'הוסף עובד',
    teamName: 'שם הצוות',
    teamLead: 'מנהל הצוות',
    uploadHistory: 'היסטוריית העלאות',
    noUploadsYet: 'עדיין לא הועלו קבצים',
    reuploadWillClearCoverage: 'העלאה מחדש לתאריך זה תמחק שיבוצי כיסוי פעילים. להמשיך?',
    editTeam: 'ערוך צוות',
    deleteTeam: 'מחק צוות',
    editWorker: 'ערוך עובד',
    role: 'תפקיד',
    team: 'צוות',
    noEmailYet: 'טרם נרשם',
    searchWorkers: 'חפש עובד לפי שם או מספר עובד',
    filterByRole: 'סנן לפי תפקיד',
    filterByTeam: 'סנן לפי צוות',
    cannotChangeRoleHasTeams: 'לא ניתן לשנות תפקיד - העובד עדיין מוביל צוות/ים. שבץ מוביל אחר קודם',
    analyticsTitle: 'נתונים כלליים',
    coverageRate: 'אחוז כיסוי משמרות',
    coverageRateSubtitle: 'משמרות מחלה/חופשה עם כיסוי משובץ',
    incidentSummary: 'סיכום תקריות',
    registrationCompletion: 'השלמת רישום עובדים',
    registrationCompletionSubtitle: 'עובדים עם פרטי התחברות',
    pendingCoverageRequestsTenantWide: 'בקשות כיסוי ממתינות (כלל הארגון)',
    errors: {
      invalid_team_lead: 'יש לבחור מוביל צוות תקין',
      lead_must_be_team_lead_role: 'רק משתמש עם תפקיד "ראש צוות" יכול להוביל צוות',
      team_not_found: 'הצוות לא נמצא',
      worker_number_taken: 'מספר עובד זה כבר קיים במערכת',
      invalid_team: 'הצוות שנבחר אינו תקין',
      worker_not_found: 'העובד לא נמצא',
      still_leads_teams: 'לא ניתן לשנות תפקיד - העובד עדיין מוביל צוות/ים. שבץ מוביל אחר קודם',
    },
  },

  // Errors
  error: {
    required: 'שדה חובה',
    invalidEmail: 'דוא"ל לא תקין',
    invalidPhone: 'מספר טלפון לא תקין',
    passwordMismatch: 'הסיסמאות לא תואמות',
    passwordTooWeak: 'סיסמה חלשה מדי',
    serverError: 'שגיאת שרת, נסה שוב',
    networkError: 'בעיית חיבור',
    unauthorized: 'לא מורשה',
    forbidden: 'גישה נדחתה',
    notFound: 'לא נמצא',
    workerNumberTaken: 'מספר עובד זה כבר משויך למשתמש אחר - פנה למנהל המערכת',
    workerNumberNotFound: 'מספר עובד לא נמצא - פנה למנהל המערכת',
    emailTaken: 'כתובת הדוא"ל הזו כבר בשימוש - פנה למנהל המערכת',
  },

  // Success
  success: {
    saved: 'נשמר בהצלחה',
    deleted: 'נמחק בהצלחה',
    updated: 'עודכן בהצלחה',
    loggedOut: 'התנתקת בהצלחה',
  },

  // PWA install + push notifications
  pwa: {
    installTitle: 'התקנת האפליקציה',
    installSubtitle: 'התקינו את המערכת למסך הבית כדי לקבל התראות על שינויים במשמרת',
    whyTitle: 'למה כדאי להתקין?',
    whyPoints: [
      'התראה מיידית כשמשובצת לכם משמרת או כשהיא משתנה',
      'פתיחה מהירה ממסך הבית, בלי לחפש כתובת בדפדפן',
      'תצוגה מלאה במסך, בלי סרגלי הדפדפן',
    ],
    iosTitle: 'אייפון / אייפד (Safari)',
    iosSteps: [
      'פתחו את המערכת בדפדפן Safari (לא Chrome)',
      'הקישו על כפתור השיתוף בתחתית המסך',
      'גללו ובחרו "הוספה למסך הבית"',
      'הקישו "הוסף" ופתחו את האפליקציה מהאייקון החדש',
    ],
    iosNote:
      'באייפון אפשר לקבל התראות רק אחרי התקנה למסך הבית. זו מגבלה של Apple, לא של המערכת.',
    androidTitle: 'אנדרואיד (Chrome)',
    androidSteps: [
      'פתחו את המערכת בדפדפן Chrome',
      'הקישו על תפריט שלוש הנקודות בפינה',
      'בחרו "התקנת אפליקציה" או "הוספה למסך הבית"',
      'אשרו את ההתקנה ופתחו מהאייקון החדש',
    ],
    desktopTitle: 'מחשב (Chrome / Edge)',
    desktopSteps: [
      'פתחו את המערכת בדפדפן',
      'לחצו על אייקון ההתקנה שבשורת הכתובת',
      'אשרו "התקן"',
    ],
    installNow: 'התקן עכשיו',
    installed: 'האפליקציה מותקנת',
    notificationsTitle: 'הפעלת התראות',
    notificationsSubtitle: 'נשלח התראה רק על דברים שדורשים את תשומת ליבכם',
    required: 'חובה',
    requiredTitle: 'הפעלת התראות היא חובה',
    requiredBody:
      'שינויים בסידור מתפרסמים במהלך היום. בלי התראות לא תדעו על שינוי במשמרת, על החלפה שאושרה או על תקלה שדווחה — ותגיעו לפי מידע לא מעודכן.',
    requiredCta: 'הפעילו התראות כדי להמשיך לקבל עדכוני משמרת',
    enable: 'הפעל התראות',
    disable: 'כבה התראות',
    enabled: 'ההתראות פעילות',
    disabled: 'ההתראות כבויות',
    checking: 'בודק...',
    whatYouGetTitle: 'על מה תקבלו התראה',
    whatYouGet: [
      'שיבוץ למשמרת חדשה או שינוי במשמרת קיימת',
      'אישור או דחייה של בקשת החלפה שהגשתם',
      'כשמישהו משובץ להחליף אתכם',
      'לראשי צוות: דיווח תקלה חדש מפקח בצוות',
      'לראשי צוות: בקשת החלפה חדשה הממתינה להחלטה',
    ],
    installFirst: 'כדי לקבל התראות באייפון, יש להתקין קודם את האפליקציה למסך הבית',
    unsupported: 'הדפדפן הזה לא תומך בהתראות. נסו Chrome או Safari מעודכן',
    permissionDenied:
      'ההתראות נחסמו בהגדרות הדפדפן. יש לאפשר אותן ידנית בהגדרות האתר ולנסות שוב',
    notConfigured: 'שירות ההתראות אינו מוגדר בשרת. פנו למנהל המערכת',
    signInFirst: 'יש להתחבר למערכת לפני הפעלת התראות',
    openInstallGuide: 'מדריך התקנה והתראות',
    serverStatusTitle: 'מצב שירות ההתראות',
    serverConfigured: 'שירות ההתראות מוגדר ופעיל',
    serverNotConfigured: 'שירות ההתראות אינו מוגדר — לא יישלחו התראות לאף משתמש',
    serverNotConfiguredHint:
      'יש להגדיר VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ו-VAPID_SUBJECT בקובץ .env.prod בשרת ולהפעיל מחדש את הקונטיינר',
    subscribedDevices: 'מכשירים רשומים',
  },

  // Push notification copy. Kept terse - these land on a lock screen.
  push: {
    shiftAssigned: {
      title: 'שובצת למשמרת',
      body: (when: string) => `משמרת חדשה ${when}`,
    },
    shiftChanged: {
      title: 'המשמרת שלך עודכנה',
      body: (when: string) => `חלו שינויים במשמרת ${when}. כדאי לבדוק`,
    },
    shiftRemoved: {
      title: 'המשמרת שלך בוטלה',
      body: (when: string) => `אינך משובץ יותר למשמרת ${when}`,
    },
    incidentReported: {
      title: 'דיווח תקלה חדש',
      body: (reporter: string, title: string) => `${reporter}: ${title}`,
    },
    incidentEmergency: {
      title: 'אירוע חירום',
      body: (reporter: string, title: string) => `${reporter}: ${title}`,
    },
    coverageRequested: {
      title: 'בקשת החלפה חדשה',
      body: (requester: string, when: string) => `${requester} ביקש/ה החלפה למשמרת ${when}`,
    },
    coverageApproved: {
      title: 'בקשת ההחלפה אושרה',
      body: (when: string) => `הבקשה שלך למשמרת ${when} אושרה`,
    },
    coverageRejected: {
      title: 'בקשת ההחלפה נדחתה',
      body: (when: string) => `הבקשה שלך למשמרת ${when} נדחתה`,
    },
    assignedAsReplacement: {
      title: 'שובצת כמחליף',
      body: (worker: string, when: string) => `אתה מחליף את ${worker} במשמרת ${when}`,
    },
  },

  // Data-accuracy disclaimer
  disclaimer: {
    title: 'המידע במערכת הוא עזר בלבד',
    body: 'הנתונים כאן נקראים אוטומטית מקובץ הסידור ומפוענחים על ידי המערכת, כולל חפיפות, החלפות והצעות. ייתכנו טעויות בפענוח.',
    action: 'לפני כל משמרת יש לוודא את הפרטים מול קובץ הסידור המקורי שנשלח ממחלקת השיבוץ.',
    acknowledge: 'הבנתי',
    short: 'מידע לעזר בלבד — יש לוודא מול קובץ הסידור המקורי',
  },

  // Roster engine: parsed duties, handoffs, swap suggestions
  roster: {
    handoffs: {
      title: 'חפיפות משמרת',
      subtitle: 'מי מחליף את מי, באיזו רכבת ובאיזו תחנה',
      empty: 'לא נמצאו חפיפות ליום זה',
      train: 'רכבת',
      at: 'בתחנת',
      gap: 'הפרש',
      minutes: 'דק׳',
      from: 'מוסר',
      to: 'מקבל',
      crossing: 'הצלבת נסיעות סרק',
    },
    swaps: {
      title: 'הצעות להחלפת משמרות',
      subtitle: 'החלפות שחוסכות נסיעות סרק לשני הפקחים',
      empty: 'אין הצעות החלפה ליום זה',
      saved: 'חיסכון מוערך',
      minutes: 'דק׳ נסיעה',
      savedRail: 'חיסכון בנסיעת סרק של הפקח',
      savedTaxi: 'חיסכון בהסעות (מוניות)',
      transport: {
        TAXI: 'הסעה במונית',
        RAIL: 'נסיעת סרק ברכבת',
        NONE: 'ללא ציון',
      },
      arrivesBy: 'הגעה למשמרת',
      leavesBy: 'חזרה מהמשמרת',
      home: 'מתגורר ב',
      homeUnknown: 'מקום מגורים לא ידוע',
      startsAt: 'מתחיל ב',
      endsAt: 'מסיים ב',
      dismiss: 'התעלם',
      convert: 'פתח בקשת החלפה',
      converted: 'נפתחה בקשת החלפה',
      dismissed: 'ההצעה הוסרה',
      needsHomeStations:
        'ההצעה מבוססת על מבנה המשמרת בלבד - השלימו מקום מגורים לפקחים כדי לדרג לפי זמן נסיעה',
      kind: {
        ABSORB_HANDOFF: 'הצלבת נסיעות סרק',
        SWAP_DUTIES: 'החלפת משמרות',
        FILL_OPEN_DUTY: 'איוש משמרת פנויה',
      },
      rationale: {
        DEADHEAD_CROSSING: 'שני הפקחים נוסעים כנוסעים בכיוונים הפוכים דרך אותה תחנה',
        DEADHEAD_CROSSING_UNVERIFIED:
          'שני הפקחים נוסעים כנוסעים בכיוונים הפוכים דרך אותה תחנה (טרם אומת מול מקום מגורים)',
        HOME_STATION_EXCHANGE: 'החלפה מקצרת את נסיעות הסרק של שני הפקחים',
        NEAREST_TO_OPEN_DUTY: 'הפקח הקרוב ביותר למשמרת הפנויה',
      },
      note: {
        crossing: 'הצעת חילופין אוטומטית: הצלבת נסיעות סרק',
        savings: 'הצעת חילופין אוטומטית: חיסכון מוערך של',
        minutesTravel: 'דקות נסיעה',
      },
      errors: {
        swap_not_found: 'ההצעה לא נמצאה',
        swap_already_decided: 'כבר טופלה הצעה זו',
        duty_has_no_shift: 'למשמרת זו אין שיבוץ במערכת',
        duty_has_no_worker: 'למשמרת זו לא משויך פקח',
      },
    },
    duty: {
      openDuty: 'משמרת ללא שיבוץ',
      reinforcement: 'פקח מתגבר (משני)',
      parsePartial: 'פוענח חלקית',
      parseFailed: 'לא ניתן לפענח',
      legs: 'מקטעי נסיעה',
      transit: 'נסיעת סרק',
      duty: 'נסיעה בתפקיד',
    },
  },
};

export function coverageErrorMessage(code: string): string {
  return (he.coverage.errors as Record<string, string>)[code] ?? he.error.serverError;
}

export function swapErrorMessage(code: string): string {
  return (
    (he.roster.swaps.errors as Record<string, string>)[code] ??
    (he.coverage.errors as Record<string, string>)[code] ??
    he.error.serverError
  );
}

export function swapRationaleMessage(code: string): string {
  return (he.roster.swaps.rationale as Record<string, string>)[code] ?? '';
}

export function swapKindLabel(kind: string): string {
  return (he.roster.swaps.kind as Record<string, string>)[kind] ?? kind;
}

export function transportLabel(mode: string): string {
  return (he.roster.swaps.transport as Record<string, string>)[mode] ?? mode;
}

export function adminErrorMessage(code: string): string {
  return (he.admin.errors as Record<string, string>)[code] ?? he.error.serverError;
}

export function t(key: string, defaultValue: string = ''): string {
  const parts = key.split('.');
  let value: unknown = he;

  for (const part of parts) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }

  return typeof value === 'string' ? value : defaultValue;
}
