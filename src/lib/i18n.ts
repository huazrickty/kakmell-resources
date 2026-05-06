type Lang = 'en' | 'ms'

const strings = {
  en: {
    'auth.login.title': 'Sign In',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Sign In',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.register': 'Register',
    'auth.login.error.invalidCredentials': 'Invalid email or password.',
    'auth.login.error.generic': 'Sign in failed. Please try again.',
    'auth.register.title': 'Create Account',
    'auth.register.fullName': 'Full Name',
    'auth.register.email': 'Email',
    'auth.register.password': 'Password',
    'auth.register.submit': 'Register',
    'auth.register.hasAccount': 'Already have an account?',
    'auth.register.login': 'Sign In',
    'auth.register.error.emailInUse': 'This email is already registered.',
    'auth.register.error.weakPassword': 'Password must be at least 6 characters.',
    'auth.register.error.generic': 'Registration failed. Please try again.',
    'auth.pending.title': 'Account Pending Approval',
    'auth.pending.message': 'Your account is awaiting approval from the admin. You will be notified once access is granted.',
    'auth.pending.contact': 'Contact NORMILA at +6018-397 0769 for assistance.',
    'auth.pending.signOut': 'Sign Out',
    'lang.toggle': 'BM',
  },
  ms: {
    'auth.login.title': 'Log Masuk',
    'auth.login.email': 'E-mel',
    'auth.login.password': 'Kata Laluan',
    'auth.login.submit': 'Log Masuk',
    'auth.login.noAccount': 'Tiada akaun?',
    'auth.login.register': 'Daftar',
    'auth.login.error.invalidCredentials': 'E-mel atau kata laluan tidak sah.',
    'auth.login.error.generic': 'Log masuk gagal. Sila cuba lagi.',
    'auth.register.title': 'Buat Akaun',
    'auth.register.fullName': 'Nama Penuh',
    'auth.register.email': 'E-mel',
    'auth.register.password': 'Kata Laluan',
    'auth.register.submit': 'Daftar',
    'auth.register.hasAccount': 'Sudah ada akaun?',
    'auth.register.login': 'Log Masuk',
    'auth.register.error.emailInUse': 'E-mel ini sudah didaftarkan.',
    'auth.register.error.weakPassword': 'Kata laluan mestilah sekurang-kurangnya 6 aksara.',
    'auth.register.error.generic': 'Pendaftaran gagal. Sila cuba lagi.',
    'auth.pending.title': 'Akaun Menunggu Kelulusan',
    'auth.pending.message': 'Akaun anda sedang menunggu kelulusan daripada pentadbir. Anda akan diberitahu setelah akses diberikan.',
    'auth.pending.contact': 'Hubungi NORMILA di +6018-397 0769 untuk bantuan.',
    'auth.pending.signOut': 'Log Keluar',
    'lang.toggle': 'EN',
  },
} as const

type StringKey = keyof typeof strings.en

export type { Lang, StringKey }
export { strings }

export function t(lang: Lang, key: StringKey): string {
  return strings[lang][key]
}
