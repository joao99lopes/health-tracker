/**
 * English catalogue - the reference dictionary.
 *
 * Its shape defines the `Dictionary` type, so every other language must
 * provide exactly the same keys or the build fails. Entries that need a value
 * interpolated are functions rather than templates with placeholders, which
 * keeps them type-checked and free of a formatting library.
 */
export const en = {
  common: {
    appName: "Health Tracker",
    /** Suffix of a change between two percentages (percentage points). */
    percentagePoints: "pp",
    save: "Save",
    saving: "Saving…",
    signOut: "Sign out",
    choose: "Select…",
    optional: "optional",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    deleting: "Deleting…",
    notRecorded: "Not recorded",
    version: (version: string) => `Version ${version}`,
    versionUnknown: "development build",
  },

  nav: {
    dashboard: "Dashboard",
    measurements: "Measurements",
    profile: "Profile",
    primary: "Main",
    skipToContent: "Skip to content",
  },

  theme: {
    current: (name: string) => `Theme: ${name}`,
    switchTo: (name: string) => `Switch to the ${name} theme`,
    names: {
      system: "system",
      light: "light",
      dark: "dark",
    },
  },

  states: {
    loading: "Loading…",
    errorTitle: "Something went wrong.",
    errorDescription:
      "This page could not be shown. Your data has not been changed.",
    retry: "Try again",
    notFoundTitle: "Page not found.",
    notFoundDescription: "That address does not lead anywhere in this app.",
    backToDashboard: "Back to the dashboard",
  },

  dashboard: {
    title: "Dashboard",
    description:
      "Your most recent measurement, and how it compares with earlier ones.",
    empty: "No measurements yet.",
    emptyDescription: "Once you record a measurement, it appears here.",
    latest: "Latest measurement",
    latestValues: "Current values",
    fromEarlier: (when: string) => `From ${when}`,
    vsFirst: "Latest vs first",
    vsPeriod: "Over a period",
    perMetricHint: "Each metric between its own readings.",
    notEnoughData: "Not enough data yet.",
    viewAll: "All measurements",
    showInChart: (metric: string) => `Show ${metric} in the chart`,
  },

  periods: {
    "3d": "3 days",
    "1w": "1 week",
    "2w": "2 weeks",
    "1m": "1 month",
    "3m": "3 months",
    "6m": "6 months",
    "1y": "1 year",
    "2y": "2 years",
    all: "All time",
  },

  charts: {
    title: "Evolution",
    description: "One metric over time. Only recorded values are plotted.",
    metric: "Metric",
    period: "Period",
    noData: "Not enough data yet.",
    noDataDescription:
      "This metric has no recorded value in the selected period.",
    singlePoint:
      "One recorded value in this period. A second one is needed to show a change.",
    current: "Current",
    previous: "Previous",
    first: "First",
    movingAverage: "Moving average",
    movingAverageOff: "Off",
    movingAverageWindow: (days: number) => `${days} days`,
    movingAverageLegend: (days: number) => `${days}-day average`,
    compareWith: "Compare with",
    compareNone: "None",
    compareNoData: (metric: string) =>
      `${metric} has no recorded value in this period.`,
    summary: {
      title: "In this period",
      count: "Readings",
      min: "Lowest",
      max: "Highest",
      mean: "Mean",
      trend: "Trend",
      perWeek: (change: string) => `${change} / week`,
      trendHint:
        "Trend: the slope of a straight line through the readings of this period. It describes the past, not what comes next.",
    },
  },

  auth: {
    email: "Email",
    password: "Password",
    login: {
      title: "Sign in",
      description: "Your measurements, on your own server.",
      submit: "Sign in",
      forgot: "Forgot your password?",
      unverified:
        "Confirm your email address first: open the link in the email we sent when you registered.",
      resend: "Send the email again",
      verificationSent: "Sent. Check your inbox (and the spam folder).",
      alternatePrompt: "No account yet?",
      alternateLabel: "Create one",
    },
    register: {
      title: "Create an account",
      description: "Email and password. You will confirm the address by email.",
      submit: "Create account",
      verificationSent: (email: string) =>
        `Almost there. We sent a link to ${email} - open it to confirm the address, then sign in.`,
      alternatePrompt: "Already registered?",
      alternateLabel: "Sign in",
    },
    alternatives: {
      or: "or",
      google: "Continue with Google",
      emailLink: "Email me a sign-in link",
    },
    emailLink: {
      title: "Sign in with a link",
      description: "No password: we email you a link that signs you in once.",
      submit: "Send the link",
      sent: (email: string) =>
        `Sent to ${email}. Open it on this device to sign in; it works once and expires.`,
      completing: "Signing you in…",
      confirmTitle: "Confirm your email",
      needsEmail:
        "The link was opened somewhere other than where it was requested. Enter the address it was sent to.",
      confirmSubmit: "Sign in",
      alternatePrompt: "Prefer a password?",
      alternateLabel: "Sign in",
    },
    forgot: {
      title: "Reset your password",
      description: "We will email you a link to choose a new password.",
      submit: "Send the link",
      sent: "If an account uses that address, the link is on its way. Check your inbox (and the spam folder).",
      alternatePrompt: "Remembered it?",
      alternateLabel: "Sign in",
    },
    // Deliberately vague where it matters: distinguishing "no such account"
    // from "wrong password" tells an attacker which addresses are registered.
    errors: {
      invalidCredentials: "Incorrect email or password.",
      emailInUse: "An account with that email already exists.",
      emailTaken:
        "That email is already linked to another account. Sign in with that account instead.",
      weakPassword: "That password is not accepted. Choose a longer one.",
      tooManyRequests: "Too many attempts. Wait a few minutes and try again.",
      network: "Could not reach the sign-in service. Check the connection and try again.",
      cancelled: "",
      popupBlocked: "The browser blocked the Google window. Allow pop-ups for this site and try again.",
      unauthorizedDomain:
        "This address is not allowed to sign in with Google or email links yet. Add it to the Firebase authorized domains.",
      invalidLink: "This sign-in link is invalid or has expired. Ask for a new one.",
      otherMethod: "That email already signs in another way. Use that method instead.",
      failed: "Something went wrong. Please try again.",
    },
    issues: {
      EMAIL_REQUIRED: "Enter your email address.",
      EMAIL_INVALID: "That does not look like an email address.",
      PASSWORD_REQUIRED: "Enter your password.",
      PASSWORD_TOO_SHORT: (min: number) => `Use at least ${min} characters.`,
      PASSWORD_TOO_LONG: "That password is too long.",
    },
  },

  account: {
    title: "Account",
    signedInAs: (email: string) => `Signed in as ${email}.`,
    changePassword: "Change password",
    changePasswordDescription:
      "You will stay signed in here; every other device is signed out.",
    currentPassword: "Current password",
    newPassword: "New password",
    changePasswordSubmit: "Change password",
    passwordChanged: "Password changed. Other devices have been signed out.",
    deleteTitle: "Delete account",
    deleteDescription:
      "Permanently deletes your account, your profile and every measurement. Download your data first if you want to keep it.",
    deleteButton: "Delete account…",
    deleteConfirmTitle: "Delete your account?",
    deleteConfirmDescription:
      "Everything you recorded is deleted and cannot be recovered.",
    deleteNeedsRecentSignIn:
      "For safety, deleting needs a sign-in from the last few minutes. Sign in again (any way you like), come back here and delete.",
    signInAgain: "Sign in again",
    noPassword:
      "This account signs in with Google and has no password. To add one, use \"Forgot your password?\" on the sign-in page.",
    emailLinkHint:
      "Sign in with email links and never set a password? Use \"Forgot your password?\" on the sign-in page to create one.",
    deleteConfirm: "Delete everything",
    deleting: "Deleting…",
  },

  data: {
    title: "Your data",
    description:
      "Download everything you have recorded. The CSV holds your measurements and can be imported again; the JSON also includes your profile.",
    exportCsv: "Download CSV",
    exportJson: "Download JSON",
    importTitle: "Import measurements",
    importDescription:
      "A CSV in the same format as the download. Measurements already recorded at the same instant are skipped; if any row has a problem, nothing is imported.",
    importChoose: "Choose a CSV file",
    importReady: (count: number) =>
      count === 1
        ? "1 measurement is ready to import."
        : `${count} measurements are ready to import.`,
    importConfirm: "Import",
    importing: "Importing…",
    importCancel: "Choose another file",
    imported: (count: number, skipped: number) =>
      `${count === 1 ? "1 measurement" : `${count} measurements`} imported` +
      (skipped > 0 ? `, ${skipped} already recorded and skipped.` : "."),
    importFailed: "Could not import the file. Please try again.",
    importProblems: (shown: number, total: number) =>
      total > shown
        ? `Nothing was imported. The first ${shown} of ${total} problems:`
        : "Nothing was imported. Fix these problems and try again:",
    importIssues: {
      line: (line: number) => `Line ${line}:`,
      FILE_EMPTY: "The file has no measurements.",
      FILE_TOO_LARGE: "The file is too large.",
      TOO_MANY_ROWS: "The file has too many rows.",
      MALFORMED: "The file could not be read as CSV (a quote is never closed).",
      MISSING_MEASURED_AT_COLUMN: "The header has no measuredAt column.",
      UNKNOWN_COLUMN: (name: string) => `Unknown column "${name}".`,
      DUPLICATE_COLUMN: (name: string) => `Column "${name}" appears twice.`,
      WRONG_CELL_COUNT: "This row does not have one cell per column.",
      HEIGHT_INVALID: "The height is not a plausible value in centimetres.",
      HEIGHT_REQUIRED:
        "No height in this row and no profile height to use. Complete your profile first.",
      DUPLICATE_IN_FILE: "Another row in the file has the same date and time.",
    },
  },

  profile: {
    title: "Profile",
    description:
      "Used to derive BMI and to present your data. Height is kept with each measurement, so editing it here never changes past results.",
    name: "Name",
    namePlaceholder: "How you would like to be addressed",
    birthDate: "Date of birth",
    birthDateHint: "Stored as a date, not as an age.",
    sex: "Sex",
    heightCm: "Height (cm)",
    heightHint: "Applies to new measurements only.",
    language: "Language",
    directions: {
      title: "Direction preferences",
      hint: "Only affects how changes are displayed. No goals, no targets.",
      legend: (metric: string) => `Preferred direction for ${metric}`,
      values: {
        decrease: "Down",
        indifferent: "No preference",
        increase: "Up",
      },
    },
    saved: "Profile saved.",
    failed: "Could not save the profile. Please try again.",
    sexes: {
      FEMALE: "Female",
      MALE: "Male",
      OTHER: "Other",
    },
    issues: {
      NAME_TOO_LONG: (max: number) => `Use at most ${max} characters.`,
      BIRTH_DATE_REQUIRED: "Enter your date of birth.",
      BIRTH_DATE_INVALID: "That is not a valid date.",
      BIRTH_DATE_IN_FUTURE: "The date of birth cannot be in the future.",
      BIRTH_DATE_TOO_OLD: "That date of birth is not plausible.",
      SEX_REQUIRED: "Select an option.",
      SEX_INVALID: "Select an option.",
      HEIGHT_REQUIRED: "Enter your height.",
      HEIGHT_INVALID: "Enter the height as a number, in centimetres.",
      HEIGHT_OUT_OF_RANGE: (min: number, max: number) =>
        `Enter a height between ${min} and ${max} cm.`,
      LANGUAGE_INVALID: "Select a language.",
      DIRECTION_INVALID: "Select one of the available directions.",
    },
  },

  measurements: {
    title: "Measurements",
    description: "Everything you have recorded, most recent first.",
    empty: "No measurements yet.",
    emptyPeriod: "No measurements in this period.",
    showMore: "Show more",
    hasNote: "Has a note",
    emptyDescription:
      "Recorded measurements are listed here, most recent first.",
    add: "Add measurement",
    addTitle: "New measurement",
    addDescription:
      "Enter whatever your scale reported. Every value is optional, but at least one is required.",
    editTitle: "Edit measurement",
    editDescription:
      "The height recorded with this measurement is kept as it was, so its BMI does not change.",
    detailTitle: "Measurement",
    measuredAt: "Date and time",
    measuredAtHint: "A past date and time; defaults to now.",
    heightAtMeasurement: "Height at this measurement",
    heightFromProfile: (height: string) =>
      `Your current height, ${height}, will be recorded with this measurement.`,
    heightKept: "Kept as recorded. Edit your height in your profile.",
    noHeightTitle: "Add your height first",
    noHeight:
      "A measurement is recorded together with your height, so BMI stays correct as your height changes. Complete your profile to start recording.",
    goToProfile: "Go to profile",
    values: "Values",
    /** Placeholder: the previous reading of a field, never a pre-filled value. */
    lastValue: (value: string) => `Last: ${value}`,
    moreValues: (count: number) =>
      count === 1 ? "1 more value" : `${count} more values`,
    note: "Note",
    noteHint: (max: number) =>
      `Anything worth remembering about this reading. Up to ${max} characters.`,
    bmi: "BMI",
    waistToHeightRatio: "Waist-to-height ratio",
    derivedHint:
      "Derived from the values and the height recorded with this measurement.",
    howToMeasure: "How to measure",
    abdominalCircumferenceHelp:
      "Measure with a tape measure while standing relaxed, at the end of a normal exhalation. Keep the tape horizontal and snug without compressing the skin. Measure at the same location each time so values remain comparable.",
    actions: "Actions",
    created: "Measurement added.",
    updated: "Measurement saved.",
    notFound: "That measurement no longer exists.",
    saveFailed: "Could not save the measurement. Please try again.",
    deleteFailed: "Could not delete the measurement. Please try again.",
    deleteTitle: "Delete this measurement?",
    deleteDescription: (when: string) =>
      `The measurement of ${when} will be permanently deleted. This cannot be undone.`,
    /** Field names without units, where the value beside them has one. */
    fieldsShort: {
      weightKg: "Weight",
      bodyFatPercent: "Body fat",
      hydrationPercent: "Hydration",
      musclePercent: "Muscle",
      boneMassKg: "Bone mass",
      visceralFat: "Visceral fat",
      abdominalCircumferenceCm: "Waist",
    },
    fields: {
      weightKg: "Weight (kg)",
      bodyFatPercent: "Body fat (%)",
      hydrationPercent: "Hydration (%)",
      musclePercent: "Muscle (%)",
      boneMassKg: "Bone mass (kg)",
      visceralFat: "Visceral fat",
      abdominalCircumferenceCm: "Waist circumference (cm)",
    },
    bmiCategories: {
      UNDERWEIGHT: "Underweight",
      NORMAL: "Normal range",
      PRE_OBESE: "Pre-obese",
      OBESE_I: "Obese class I",
      OBESE_II: "Obese class II",
      OBESE_III: "Obese class III",
    },
    waistToHeightCategories: {
      LOW: "Low",
      HEALTHY: "Generally healthy range",
      INCREASED: "Increased",
      HIGH: "High",
    },
    issues: {
      MEASURED_AT_REQUIRED: "Enter the date and time of the measurement.",
      MEASURED_AT_INVALID: "That is not a valid date and time.",
      MEASURED_AT_IN_FUTURE: "A measurement cannot be dated in the future.",
      MEASURED_AT_TOO_OLD: "That date is not plausible.",
      VALUE_INVALID: "Enter this value as a number.",
      VALUE_OUT_OF_RANGE: (min: number, max: number) =>
        `Enter a value between ${min} and ${max}.`,
      NOTE_TOO_LONG: "That note is too long.",
      NO_VALUES: "Enter at least one measurement value.",
    },
  },
};
