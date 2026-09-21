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
    save: "Save",
    saving: "Saving…",
    signOut: "Sign out",
    choose: "Select…",
    optional: "optional",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    deleting: "Deleting…",
    back: "Back",
    notRecorded: "Not recorded",
  },

  nav: {
    dashboard: "Dashboard",
    measurements: "Measurements",
    profile: "Profile",
    primary: "Main",
    account: "Account",
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
    comparedWith: (when: string) => `Compared with ${when}`,
    notEnoughData: "Not enough data yet.",
    viewAll: "All measurements",
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
  },

  auth: {
    email: "Email",
    password: "Password",
    login: {
      title: "Sign in",
      description: "Your measurements, on your own server.",
      submit: "Sign in",
      // Deliberately vague: distinguishing "no such account" from "wrong
      // password" tells an attacker which addresses are registered.
      failed: "Incorrect email or password.",
      alternatePrompt: "No account yet?",
      alternateLabel: "Create one",
    },
    register: {
      title: "Create an account",
      description: "Email and password. Nothing else is required.",
      submit: "Create account",
      duplicate: "An account with that email already exists.",
      failed: "Could not create the account. Please try again.",
      alternatePrompt: "Already registered?",
      alternateLabel: "Sign in",
    },
    issues: {
      EMAIL_REQUIRED: "Enter your email address.",
      EMAIL_INVALID: "That does not look like an email address.",
      PASSWORD_TOO_SHORT: (min: number) => `Use at least ${min} characters.`,
      PASSWORD_TOO_LONG: "That password is too long.",
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
    bmi: "BMI",
    bmiDerived: "Derived from the weight and the height above.",
    view: "View",
    actions: "Actions",
    created: "Measurement added.",
    updated: "Measurement saved.",
    notFound: "That measurement no longer exists.",
    saveFailed: "Could not save the measurement. Please try again.",
    deleteFailed: "Could not delete the measurement. Please try again.",
    deleteTitle: "Delete this measurement?",
    deleteDescription: (when: string) =>
      `The measurement of ${when} will be permanently deleted. This cannot be undone.`,
    fields: {
      weightKg: "Weight (kg)",
      bodyFatPercent: "Body fat (%)",
      hydrationPercent: "Hydration (%)",
      musclePercent: "Muscle (%)",
      boneMassKg: "Bone mass (kg)",
      visceralFat: "Visceral fat",
    },
    bmiCategories: {
      UNDERWEIGHT: "Underweight",
      NORMAL: "Normal range",
      PRE_OBESE: "Pre-obese",
      OBESE_I: "Obese class I",
      OBESE_II: "Obese class II",
      OBESE_III: "Obese class III",
    },
    issues: {
      MEASURED_AT_REQUIRED: "Enter the date and time of the measurement.",
      MEASURED_AT_INVALID: "That is not a valid date and time.",
      MEASURED_AT_IN_FUTURE: "A measurement cannot be dated in the future.",
      MEASURED_AT_TOO_OLD: "That date is not plausible.",
      VALUE_INVALID: "Enter this value as a number.",
      VALUE_OUT_OF_RANGE: (min: number, max: number) =>
        `Enter a value between ${min} and ${max}.`,
      NO_VALUES: "Enter at least one measurement value.",
    },
  },
};
