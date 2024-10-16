import type { Contact, Packument } from '@npm/types'

export function modifyPackument(packument: Packument, host: string) {
  for (const version of Object.values(packument.versions)) {
    version.dist.tarball = modifyHost(version.dist.tarball, host)
    if (version._npmUser) {
      version._npmUser = modifyUser(version._npmUser)
    }
    if (version.contributors) {
      version.contributors = version.contributors.map(modifyUser)
    }
    if (version.maintainers) {
      version.maintainers = version.maintainers.map(modifyUser)
    }
  }
  return packument
}

function modifyHost(url: string | URL, host: string): string {
  url = new URL(url)
  url.host = host
  return url.toString()
}

function modifyUser(contact: Contact) {
  if (!contact || !contact.name) return contact
  const name = contact.name.toUpperCase()
  contact.email = process.env[`${name}_EMAIL`]
  contact.url = process.env[`${name}_URL`]
  return contact
}
