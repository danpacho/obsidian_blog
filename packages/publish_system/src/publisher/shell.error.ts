// export class ShellError extends Error {
//     stdoutLog: string[]
//     stderrLog: string[]
//     command: string

//     constructor(
//         message: string,
//         command: string,
//         stdoutLog: string[],
//         stderrLog: string[]
//     ) {
//         super(message)
//         this.name = 'ShellError'
//         this.command = command
//         this.stdoutLog = stdoutLog
//         this.stderrLog = stderrLog
//     }

//     formatErrorMessage() {
//         const formattedMessage = `
//         Shell Error Occurred:
//         Command: ${this.command}
//         Error Message: ${this.message}
//         Recent Stdout: ${this.stdoutLog.join('\n').trim() || 'None'}
//         Recent Stderr: ${this.stderrLog.join('\n').trim() || 'None'}
//       `
//         return formattedMessage
//     }
// }
