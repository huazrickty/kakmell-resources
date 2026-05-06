import { describe, it, expect } from 'vitest'
import { t, strings } from './i18n'

describe('t()', () => {
  it('returns English strings for en lang', () => {
    expect(t('en', 'auth.login.title')).toBe('Sign In')
    expect(t('en', 'auth.register.title')).toBe('Create Account')
    expect(t('en', 'auth.pending.title')).toBe('Account Pending Approval')
  })

  it('returns Malay strings for ms lang', () => {
    expect(t('ms', 'auth.login.title')).toBe('Log Masuk')
    expect(t('ms', 'auth.register.title')).toBe('Buat Akaun')
    expect(t('ms', 'auth.pending.title')).toBe('Akaun Menunggu Kelulusan')
  })

  it('lang toggle label is opposite language name', () => {
    expect(t('en', 'lang.toggle')).toBe('BM')
    expect(t('ms', 'lang.toggle')).toBe('EN')
  })

  it('en and ms have identical key sets', () => {
    const enKeys = Object.keys(strings.en).sort()
    const msKeys = Object.keys(strings.ms).sort()
    expect(enKeys).toEqual(msKeys)
  })
})
