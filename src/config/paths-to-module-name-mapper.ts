import type { Config } from '@jest/types'
import { LogContexts } from 'bs-logger'
import type { CompilerOptions } from 'typescript'

import { rootLogger } from '../utils'
import { Errors, interpolate } from '../utils/messages'

type TsPathMapping = Exclude<CompilerOptions['paths'], undefined>
type JestPathMapping = Config.InitialOptions['moduleNameMapper']

// we don't need to escape all chars, so commented out is the real one
// const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
const escapeRegex = (str: string) => str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')

const logger = rootLogger.child({ [LogContexts.namespace]: 'path-mapper' })

export const pathsToModuleNameMapper = (
  mapping: TsPathMapping,
  { prefix = '', useESM = false }: { prefix?: string; useESM?: boolean } = {},
): JestPathMapping => {
  const jestMap: JestPathMapping = {}
  for (const fromPath of Object.keys(mapping)) {
    const toPaths = mapping[fromPath]
    // check that we have only one target path
    if (toPaths.length === 0) {
      logger.warn(interpolate(Errors.NotMappingPathWithEmptyMap, { path: fromPath }))

      continue
    }

    // split with '*'
    const segments = fromPath.split(/\*/g)
    if (segments.length === 1) {
      const paths = toPaths.map((target) => {
        const enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? `${prefix}/` : prefix

        return `${enrichedPrefix}${target}`
      })
      const cjsPattern = `^${escapeRegex(fromPath)}$`
      jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths
    } else if (segments.length === 2) {
      let existStarAndNotInTailInToPaths = false
      const paths = toPaths.map((target) => {
        const enrichedTarget =
          target.startsWith('./') && prefix !== '' ? target.substring(target.indexOf('/') + 1) : target
        const enrichedPrefix = prefix !== '' && !prefix.endsWith('/') ? `${prefix}/` : prefix

        const indexOfStart = target.indexOf('*')
        const existStarAndNotInTail = ~indexOfStart && indexOfStart < target.length - 1

        if (existStarAndNotInTail) {
          existStarAndNotInTailInToPaths = true
        }

        return `${enrichedPrefix}${enrichedTarget.replace(/\*/g, '$1')}${existStarAndNotInTail ? '$2' : ''}`
      })

      const additionalRule = existStarAndNotInTailInToPaths ? '(.*?(?=(?:/|$)))' : ''

      if (useESM) {
        const esmPattern = `^${escapeRegex(segments[0])}${additionalRule}(.*)${escapeRegex(segments[1])}\\.js$`
        jestMap[esmPattern] = paths.length === 1 ? paths[0] : paths
      }
      const cjsPattern = `^${escapeRegex(segments[0])}${additionalRule}(.*)${escapeRegex(segments[1])}$`
      jestMap[cjsPattern] = paths.length === 1 ? paths[0] : paths
    } else {
      logger.warn(interpolate(Errors.NotMappingMultiStarPath, { path: fromPath }))
    }
  }

  if (useESM) {
    jestMap['^(\\.{1,2}/.*)\\.js$'] = '$1'
  }

  return jestMap
}
