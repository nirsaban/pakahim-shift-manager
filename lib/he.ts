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
};

export function coverageErrorMessage(code: string): string {
  return (he.coverage.errors as Record<string, string>)[code] ?? he.error.serverError;
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
