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

export function t(key: string, defaultValue: string = ''): string {
  const parts = key.split('.');
  let value: unknown = he;

  for (const part of parts) {
    value = (value as Record<string, unknown> | undefined)?.[part];
  }

  return typeof value === 'string' ? value : defaultValue;
}
