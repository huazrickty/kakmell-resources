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

  it('nav section: en and ms differ where expected', () => {
    expect(t('en', 'nav.dashboard')).toBe('Dashboard')
    expect(t('ms', 'nav.dashboard')).toBe('Papan Pemuka')
    expect(t('en', 'nav.events')).toBe('Events')
    expect(t('ms', 'nav.events')).toBe('Acara')
    expect(t('en', 'nav.invoices')).toBe('Invoices')
    expect(t('ms', 'nav.invoices')).toBe('Invois')
  })

  it('common section translates correctly', () => {
    expect(t('en', 'common.save')).toBe('Save')
    expect(t('ms', 'common.save')).toBe('Simpan')
    expect(t('en', 'common.cancel')).toBe('Cancel')
    expect(t('ms', 'common.cancel')).toBe('Batal')
  })

  it('BM-only keys are identical in en and ms', () => {
    expect(t('en', 'events.sessionMorning')).toBe('Siang')
    expect(t('ms', 'events.sessionMorning')).toBe('Siang')
    expect(t('en', 'events.sessionEvening')).toBe('Malam')
    expect(t('ms', 'events.sessionEvening')).toBe('Malam')
    expect(t('en', 'events.rice')).toBe('Nasi')
    expect(t('ms', 'events.rice')).toBe('Nasi')
    expect(t('en', 'ingredients.daging')).toBe('Daging')
    expect(t('ms', 'ingredients.daging')).toBe('Daging')
  })

  it('invoice section translates correctly', () => {
    expect(t('en', 'invoice.gajiPerkerja')).toBe('Staff Wages')
    expect(t('ms', 'invoice.gajiPerkerja')).toBe('Gaji Pekerja')
    expect(t('en', 'invoice.statusDraft')).toBe('Draft')
    expect(t('ms', 'invoice.statusDraft')).toBe('Draf')
  })

  it('settings section translates correctly', () => {
    expect(t('en', 'settings.approve')).toBe('Approve')
    expect(t('ms', 'settings.approve')).toBe('Lulus')
    expect(t('en', 'settings.roleKitchen')).toBe('Kitchen Staff')
    expect(t('ms', 'settings.roleKitchen')).toBe('Kakitangan Dapur')
  })
})
