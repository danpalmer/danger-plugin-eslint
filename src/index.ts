// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import { DangerDSLType } from "../node_modules/danger/distribution/dsl/DangerDSL"
declare var danger: DangerDSLType
export declare function message(message: string): void
export declare function warn(message: string): void
export declare function fail(message: string): void
export declare function markdown(message: string): void

import { CLIEngine } from "eslint"

interface Options {
  baseConfig?: any
  extensions?: string[]
}

/**
 * Eslint your code with Danger
 */
export default async function eslint(config: any, extensions: string[] = [".js"]) {
  const allFiles = danger.git.created_files.concat(danger.git.modified_files)
  const options: Options = { baseConfig: config }
  if (extensions) {
    options.extensions = extensions
  }
  const cli = new CLIEngine(options)
  // let eslint filter down to non-ignored, matching the extensions expected
  const filesToLint = allFiles.filter(f => {
    return !cli.isPathIgnored(f) && options.extensions.some(ext => f.endsWith(ext))
  })
  return Promise.all(filesToLint.map(f => lintFile(cli, config, f)))
}

async function lintFile(linter, config, path) {
  const contents = await danger.github.utils.fileContents(path)
  const report = linter.executeOnText(contents, path)

  if (report.results.length !== 0) {
    report.results[0].messages.map(msg => {
      if (msg.fatal) {
        fail(`Fatal error linting ${path} with eslint.`)
        return
      }

      const fn = { 1: warn, 2: fail }[msg.severity]

      fn(`${path} line ${msg.line} – ${msg.message} (${msg.ruleId})`, path, msg.line)
    })
  }
}
