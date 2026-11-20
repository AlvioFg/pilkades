/**
 * Tulis android/local.properties dengan escaping yang benar untuk Windows.
 *
 * Windows butuh dua backslash di dalam file .properties:
 *   sdk.dir=C\:\\Users\\AlvioFg\\AppData\\Local\\Android\\Sdk
 * Satu backslash saja membuat AGP gagal dengan
 * "The filename, directory name, or volume label syntax is incorrect".
 *
 * Jalankan: node scripts/write-local-properties.mjs
 */
import { writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const sdkDir =
  process.env.ANDROID_HOME ||
  path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk')

// Escape untuk format .properties: ':' dan '\' didahului backslash.
const escapeProp = (value) => value.replace(/\\/g, '\\\\').replace(/:/g, '\\:')

const target = path.join('android', 'local.properties')
writeFileSync(target, `sdk.dir=${escapeProp(sdkDir)}\n`, 'utf8')

console.log('local.properties ditulis:')
console.log(`  sdk.dir=${escapeProp(sdkDir)}`)
console.log(`  SDK ada? ${existsSync(sdkDir) ? 'ya' : 'TIDAK - periksa ANDROID_HOME'}`)
