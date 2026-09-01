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
    tooManyAttempts: 'יותר מדי נסיונות, נסה שוב מאוחר יותר',
    otpSentWhatsapp: 'קוד נשלח אליך בוואטסאפ',
    otpSentEmail: 'קוד נשלח לדוא"ל שלך',
    registerOtpNotice: 'שלחנו קוד אימות כדי לוודא שהפרטים שהזנת שלך',
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
    uploadHistory: 'קבצים ותאריכים',
    uploadHistorySubtitle: 'כל קובץ סידור שהועלה, ואילו תאריכים הוא כתב',
    noUploadsYet: 'עדיין לא הועלו קבצים',
    uploadedBy: 'הועלה על ידי',
    datesWritten: 'תאריכים שנכתבו',
    shiftsOnDate: (count: number) => `${count} משמרות`,
    replacedByLater: 'הוחלף בהעלאה מאוחרת יותר',
    currentForDate: 'הקובץ הפעיל לתאריך',
    noDatesRecorded: 'לא נרשמו תאריכים (העלאה מלפני המעקב)',
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
    // Multi-day import
    importNoValidRows: 'לא נמצאו שורות תקינות לייבוא בקובץ',
    importSkippedRows: (imported: number, skipped: number) =>
      `יובאו ${imported} משמרות, ${skipped} שורות דולגו`,
    importDuplicateDuties: (count: number) =>
      `${count} שורות עם מס״ד כפול באותו אזור לא נשמרו בשכבת התורנות - יש לבדוק את הקובץ`,
    importUndatedRows: (count: number) =>
      `${count} שורות ללא תאריך מזוהה לא יובאו - יש לוודא ששם הגיליון או כותרת הטבלה כוללים תאריך`,
    importedDaysTitle: 'ימים שיובאו',
    importedDaysCount: (count: number) => (count === 1 ? 'יום אחד' : `${count} ימים`),
    uploadMultiDayHint:
      'ניתן להעלות קובץ של יום אחד או של מספר ימים - גיליון נפרד לכל יום, או מספר טבלאות מתוארכות באותו גיליון. המערכת מזהה את התאריכים מתוך הקובץ.',
    reuploadCoverageOnDate: (date: string, count: number) => `${date}: ${count} שיבוצי כיסוי`,
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
  whatsapp: {
    title: 'חיבור וואטסאפ',
    subtitle: 'סרוק את הקוד כדי לחבר את המספר ששולח קודי אימות',
    statusLabel: 'סטטוס',
    statusPending: 'ממתין לחיבור',
    statusQr: 'ממתין לסריקה',
    statusConnected: 'מחובר',
    statusDisconnected: 'מנותק, מתחבר מחדש',
    statusLoggedOut: 'לא מחובר',
    connectedAs: 'מחובר כמספר',
    connect: 'התחל חיבור',
    reconnect: 'חבר מחדש',
    disconnect: 'נתק',
    refreshingQr: 'מרענן קוד...',
    scanInstructions: 'וואטסאפ ← הגדרות ← מכשירים מקושרים ← קישור מכשיר',
    qrExpired: 'הקוד פג תוקף, לחץ לרענון',
    disconnectConfirm: 'לנתק את חיבור הוואטסאפ? יהיה צורך לסרוק קוד מחדש.',
    otpFallbackNotice: 'כשאין חיבור, קודי האימות נשלחים בדוא"ל בלבד.',
  },

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

  // Personal area: own details + pre-shift reminder settings. Every role has
  // one - a team lead has a phone number and a shift to be reminded of too.
  settings: {
    title: 'האזור האישי',
    subtitle: 'הפרטים שלך והתראות לפני משמרת',
    open: 'האזור האישי',

    profileTitle: 'הפרטים שלי',
    profileSubtitle: 'הפרטים שאחרים רואים כשהם צריכים ליצור איתך קשר',
    firstName: 'שם פרטי',
    lastName: 'שם משפחה',
    phone: 'טלפון נייד',
    phoneHint: 'מספר נייד ישראלי - משמש גם לקבלת קוד כניסה בוואטסאפ',
    city: 'עיר מגורים',
    cityHint: 'משמש לשיוך תחנת מוצא ולחישוב נסיעות',
    workerNumber: 'מספר עובד',
    workerNumberLocked: 'מגיע מקובץ הסידור - לא ניתן לעריכה',
    email: 'דוא״ל',
    emailNone: 'לא הוגדרה כתובת',
    changeEmail: 'שינוי כתובת',
    emailStepIntro:
      'נשלח קוד אישור לכתובת החדשה. הכתובת תתעדכן רק לאחר הזנת הקוד - כך אנחנו מוודאים שהתיבה בשליטתך.',
    newEmail: 'כתובת דוא״ל חדשה',
    sendCode: 'שלח קוד אישור',
    codeSentTo: (email: string) => `נשלח קוד אישור אל ${email}. הקוד תקף ל-5 דקות.`,
    confirmationCode: 'קוד אישור',
    confirmEmail: 'אישור הכתובת החדשה',
    emailChanged: 'כתובת הדוא״ל עודכנה',
    emailWhyItMatters: 'לכתובת זו נשלחים קודי הכניסה שלך',
    resend: 'שליחה חוזרת',
    cancelEmailChange: 'ביטול',
    save: 'שמירה',
    saved: 'הפרטים נשמרו',

    remindersTitle: 'תזכורת לפני משמרת',
    remindersSubtitle: 'התראה שנשלחת אליך לפני תחילת המשמרת',
    reminderEnabled: 'שלח לי תזכורת לפני משמרת',
    reminderDisabledNote: 'התזכורות כבויות - לא תישלח התראה לפני המשמרת',
    leadTime: 'כמה זמן לפני',
    leadMinutes: (minutes: number) => (minutes >= 60 ? `שעה${minutes > 60 ? ` ו-${minutes - 60} דק׳` : ''} לפני` : `${minutes} דקות לפני`),
    sound: 'צליל ההתראה',
    preview: 'נגן',
    soundOption: {
      CHIME: 'צלצול עדין',
      BELL: 'פעמון',
      ALARM: 'אזעקה',
      SILENT: 'שקט (ללא צליל ורטט)',
    },
    // Said plainly rather than left to be discovered: a phone that is locked
    // plays the system's notification sound, not ours, and no PWA can change
    // that. The vibration pattern and the in-app tone are what we do control.
    soundLimitation:
      'לתשומת לבך: כשהמכשיר נעול, צליל ההתראה נקבע על ידי מערכת ההפעלה ולא על ידי האפליקציה. הבחירה כאן קובעת את דפוס הרטט, ואת הצליל שמתנגן כשהאפליקציה פתוחה.',
    remindersSaved: 'הגדרות ההתראה נשמרו',

    errors: {
      invalid_phone: 'מספר נייד ישראלי לא תקין (לדוגמה 052-1234567)',
      invalid_email: 'כתובת דוא״ל לא תקינה',
      invalid_code: 'קוד האישור שגוי או פג תוקפו',
      email_taken: 'כתובת הדוא״ל כבר משויכת לעובד אחר',
      same_email: 'זו כבר הכתובת הרשומה בחשבון',
      cooldown: 'נשלח קוד לאחרונה - יש להמתין דקה לפני שליחה חוזרת',
      send_failed: 'לא הצלחנו לשלוח את הקוד לכתובת זו - יש לבדוק שהיא נכונה',
      email_change_rate_limited: 'יותר מדי ניסיונות - יש לנסות שוב מאוחר יותר',
    },
  },

  // Push notification copy. Kept terse - these land on a lock screen.
  push: {
    /** One upload can move several days at once - said in one push, not one per day. */
    multipleDays: (count: number, first: string, last: string) => `${count} ימים (${first} - ${last})`,
    shiftReminder: {
      title: 'המשמרת שלך מתחילה בקרוב',
      body: (minutes: number) =>
        minutes >= 60
          ? `המשמרת מתחילה בעוד שעה${minutes > 60 ? ` ו-${minutes - 60} דק׳` : ''}`
          : `המשמרת מתחילה בעוד ${minutes} דקות`,
    },
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
    companions: {
      title: 'מי איתי ברכבת',
      subtitle: 'פקחים שנוסעים ברכבת שאתם מפעילים, בדרך למשמרת שלהם',
      pickTrain: 'בחירת רכבת',
      onTheirWay: 'בדרך למשמרת',
      headingHome: 'בדרך הביתה',
      repositioning: 'מעבר בין רכבות',
      boardsAt: 'עולה ב',
      alightsAt: 'יורד ב',
      shiftWindow: 'משמרת',
      nobodyAboard: 'אף פקח לא נוסע ברכבת זו',
      noTrains: 'אין רכבות בתפקיד במשמרת זו',
      riders: (count: number) => (count === 1 ? 'פקח אחד' : `${count} פקחים`),
    },
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
    myShift: {
      previous: 'המשמרת הקודמת',
      current: 'המשמרת הנוכחית',
      next: 'המשמרת הבאה',
      inProgress: 'מתבצעת עכשיו',
      details: 'פרטי המשמרת',
      route: 'מסלול',
      departFrom: 'יציאה מ',
      dutyStarts: 'תחילת תפקיד',
      dutyEnds: 'סיום תפקיד',
      returnTo: 'חזרה ל',
      serial: 'מס״ד',
      trains: 'רכבות בתפקיד',
      transitTrains: 'נסיעות סרק',
      operations: 'פעולות',
      noneScheduled: 'אין משמרת',
      takesOverFrom: 'מקבל את הרכבת מ',
      handsOverTo: 'מוסר את הרכבת ל',
      onTrain: 'רכבת',
      atStation: 'בתחנת',
      atTime: 'בשעה',
      unknownStation: 'תחנה לא ידועה',
      noHandoff: 'לא נמצאה חפיפה',
      viewFullCode: 'קוד הסידור המלא',
      op: {
        ptihat_set: 'פתיחת סט',
        neilat_set: 'נעילת סט',
        blima: 'בדיקת בלימה',
        ituk: 'ניתוק',
        nikayon: 'ניקיון',
        kibui: 'כיבוי',
        nikayon_kibui: 'ניקיון וכיבוי',
        otem: 'אוטם',
        bdika: 'בדיקת סט',
      },
      standby: 'כוננות',
      taxiAt: 'מונית',
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

  // A worker's full schedule - every shift they hold, not just the next one.
  // Timezone repair (/admin/timezone)
  timezone: {
    title: 'שעות המשמרות ואזור הזמן',
    subtitle: 'בדיקה ותיקון של משמרות שיובאו לפני שהשעות חושבו לפי שעון ישראל',
    statusTitle: 'מצב נוכחי',
    healthy: 'תקין',
    needsRepair: 'נדרש תיקון',
    serverClock: 'השעה לפי השרת',
    israelClock: 'השעה בישראל',
    shiftsNeedingRepair: 'משמרות שדורשות תיקון',
    shiftsCorrect: 'משמרות תקינות',
    dutiesNeedingRepair: 'סידורים שדורשים תיקון',
    processZoneWarning:
      'השרת אינו מציג שעון ישראל. הנתונים עצמם אינם תלויים בכך, אבל כדאי לוודא שמשתנה TZ מוגדר.',
    samplesTitle: 'דוגמאות',
    samplesSubtitle: 'כך המשמרות מוצגות היום, וכך הן יוצגו אחרי התיקון',
    repairTitle: 'תיקון',
    repairExplainer:
      'התיקון שומר על השעה כפי שהיא כתובה בקובץ הסידור ומעגן אותה לשעון ישראל. הוא רץ אוטומטית בכל הפעלה של השרת, ואפשר להריץ אותו גם מכאן. בטוח להריץ שוב — הוא נוגע רק בשורות שנכתבו לפני התיקון.',
    repairAction: (count: number) => (count === 0 ? 'אין מה לתקן' : `תקן ${count} רשומות`),
    repairing: 'מתקן...',
    repairDone: 'התיקון הושלם',
    repairedShifts: (n: number) => `${n} משמרות תוקנו`,
    repairedDuties: (n: number) => `${n} סידורים תוקנו`,
    clearedReminders: (n: number) => `${n} התראות אופסו כדי שיישלחו מחדש בזמן הנכון`,
    remaining: (n: number) => `נותרו ${n} רשומות לתיקון`,
  },

  // Commander view: where every inspector and train is, right now
  commander: {
    title: 'תמונת מצב מבצעית',
    subtitle: 'איפה כל פקח נמצא ברגע זה, לפי קובץ הסידור',
    now: 'עכשיו',
    backToNow: 'חזרה לעכשיו',
    atTime: 'בשעה',
    byTrain: 'לפי רכבת',
    byStation: 'לפי תחנה',
    onDuty: 'בתפקיד',
    deadhead: 'בנסיעת סרק',
    standby: 'במוכנות',
    operation: 'בפעולה',
    taxi: 'במונית',
    unknownSegment: 'מיקום לא ידוע',
    handsOverTo: 'מוסר ל',
    activeNow: (count: number) => (count === 1 ? 'פקח אחד בתפקיד' : `${count} פקחים בתפקיד`),
    noneActive: 'אין פקחים בתפקיד בשעה זו',
    noRoster: 'לא יובא סידור לתאריך זה',
    date: 'תאריך',
    // Said plainly and kept on screen: the source file has no timetable, so the
    // position between two stations is derived, not reported.
    estimateNotice:
      'המיקום מחושב מזמני המשמרת וממרחקי התחנות — בקובץ הסידור אין לוח זמנים, ולכן זו הערכה ולא דיווח בזמן אמת.',
    trainsRunning: (count: number) => `${count} רכבות`,
    inspectorsAt: (count: number) => `${count} פקחים`,
  },

  schedule: {
    title: 'כל המשמרות שלי',
    subtitle: 'השיבוצים הקרובים כפי שיובאו מקובץ הסידור',
    empty: 'אין שיבוצים קרובים',
    today: 'היום',
    tomorrow: 'מחר',
    coveredBy: 'מכוסה על ידי',
    covering: 'משמרת כיסוי',
    fullDetails: 'פרטים מלאים',
    past: 'משמרות שהיו',
    shiftsOnDay: (count: number) => (count === 1 ? 'משמרת אחת' : `${count} משמרות`),
    countInRange: (shifts: number, days: number) =>
      `${shifts} משמרות ב-${days} ימים`,
  },

  // Per-worker workload metrics. Same vocabulary for the worker's own card and
  // the team lead's balance table, so the two never disagree.
  workload: {
    title: 'עומס המשמרות שלי',
    teamTitle: 'עומס עבודה בצוות',
    teamSubtitle: 'לפי סך שעות בטווח - הכבד ביותר למעלה',
    range: (from: string, to: string) => `${from} - ${to}`,
    rangeLabel: 'טווח זמן',
    ranges: {
      week: 'שבוע',
      month: 'חודש',
      year: 'שנה',
    },
    empty: 'אין נתוני שיבוץ בטווח זה',
    noShifts: 'ללא שיבוצים',
    shifts: 'משמרות',
    totalHours: 'סך שעות',
    average: 'ממוצע למשמרת',
    longest: 'המשמרת הארוכה',
    nights: 'משמרות לילה',
    weekends: 'שישי-שבת',
    daysWorked: 'ימי עבודה',
    streak: 'רצף ימים ברציפות',
    absences: 'מחלה/חופשה',
    teamAverage: 'ממוצע הצוות',
    aboveAverage: (hours: string) => `${hours} שעות מעל ממוצע הצוות`,
    belowAverage: (hours: string) => `${hours} שעות מתחת לממוצע הצוות`,
    onAverage: 'בהתאם לממוצע הצוות',
    restTitle: 'מנוחה קצרה מהנדרש',
    restHint: 'לפי חוק שעות עבודה ומנוחה נדרשות 8 שעות מנוחה בין משמרת למשמרת',
    restRow: (endLabel: string, startLabel: string, gap: string) =>
      `סיום ${endLabel} · תחילה ${startLabel} · ${gap} שעות מנוחה`,
    restOverlap: (endLabel: string, startLabel: string) =>
      `סיום ${endLabel} · תחילה ${startLabel} · המשמרות חופפות`,
    restCount: (count: number) => (count === 1 ? 'אזהרה אחת' : `${count} אזהרות`),
  },

  // Public marketing page at /about - the only route meant for people who are
  // not yet users. Copy claims must trace to shipped features only.
  landing: {
    metaTitle: 'אודות המערכת',
    nav: { login: 'כניסה למערכת' },
    hero: {
      badge: 'מערכת המשמרות של פקחי רכבת ישראל',
      title: 'די לחפש את עצמכם באקסל.',
      subtitle:
        'נכנסים עם מספר עובד ורואים מיד: מתי המשמרת הבאה, מי מחליף אתכם ומה קורה בצוות. בלי קבצים, בלי גלילות, בלי טלפונים.',
      ctaPrimary: 'כניסה למערכת',
      ctaSecondary: 'איך זה עובד?',
    },
    problem: {
      title: 'כולנו מכירים את זה',
      body:
        'כל יום נוחת במייל אקסל של השיבוץ, וכל אחד גולל עד שהוא מוצא את השם שלו. מתי מתחילים? מתי מסיימים? מי מחליף אותי? בשביל שלוש תשובות קטנות לא צריך לפתוח קובץ. מהיום נכנסים לאפליקציה ורואים הכול.',
    },
    how: {
      title: 'איך זה עובד',
      steps: [
        {
          title: 'מזינים מספר עובד',
          body: 'בלי סיסמה ובלי לזכור כלום. המספר שאתם כבר יודעים בעל פה.',
        },
        {
          title: 'מקבלים קוד בוואטסאפ',
          body: 'קוד חד-פעמי ישר לוואטסאפ. נוח יותר במייל? גם זה עובד.',
        },
        {
          title: 'זהו, אתם בפנים',
          body: 'המשמרת הבאה, השעות, מי מחליף את מי. הכול במסך אחד.',
        },
      ],
    },
    features: {
      title: 'מה יש בפנים',
      subtitle: 'בלי פיצ׳רים מיותרים. רק מה שבאמת צריך במשמרת.',
      items: [
        {
          title: 'המשמרת שלי',
          body: 'מתי מתחילים, מתי מסיימים, מספר סידור ומי מכסה את מי.',
        },
        {
          title: 'מה קורה בצוות',
          body: 'מי במשמרת עכשיו, מי בחופש ומי חולה. בלי לשאול בקבוצה.',
        },
        {
          title: 'דיווח אירועים',
          body: 'קרה משהו בשטח? מדווחים מהנייד, וראש הצוות מקבל התראה באותה שנייה.',
        },
        {
          title: 'האקסל נקלט לבד',
          body: 'אותו קובץ שיבוץ שכולם מכירים, כולל קבצי סוף שבוע. המערכת כבר יודעת לקרוא אותו.',
        },
        {
          title: 'שעות ומנוחה',
          body: 'כמה שעות יצאו, כמה לילות, והתראה כשהמנוחה בין משמרות קצרה ממה שמגיע לכם בחוק.',
        },
        {
          title: 'עובד כמו אפליקציה',
          body: 'מוסיפים למסך הבית פעם אחת ומקבלים התראות לנייד. בלי חנות אפליקציות.',
        },
      ],
    },
    faq: {
      title: 'שאלות נפוצות',
      items: [
        {
          q: 'מי יכול להשתמש במערכת?',
          a: 'כרגע המערכת בנויה לפקחים (מנהלי נסיעה), לראשי הצוותים ולמשבצים.',
        },
        {
          q: 'צריך להוריד משהו מהחנות?',
          a: 'לא. נכנסים מהדפדפן, מוסיפים למסך הבית, וזה מתנהג כמו אפליקציה לכל דבר.',
        },
        {
          q: 'מה עושים בפעם הראשונה?',
          a: 'מזינים מספר עובד, ממלאים פרטים פעם אחת ומאשרים עם קוד שמגיע בוואטסאפ או במייל. שתי דקות וגמרתם.',
        },
      ],
    },
    cta: {
      title: 'רוצים מערכת כזאת אצלכם בארגון?',
      body: 'את המערכת הזאת בנינו ב-GeniriFlow. אם גם אצלכם יש אקסל שכולם סובלים ממנו, בואו נדבר.',
      button: 'דברו איתנו',
      workers: 'עובדי רכבת? היכנסו כאן',
    },
    footer: {
      builtBy: 'נבנה על ידי GeniriFlow',
    },
  },
};

/** Durations are read as h:mm, never as a decimal - "8:30", not "8.5". */
export function hoursLabel(minutes: number | null): string {
  if (minutes === null) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

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

export function opLabel(code: string | null): string {
  if (!code) return '';
  return (he.roster.myShift.op as Record<string, string>)[code] ?? code;
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
